import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import pg from 'pg'

const { Pool } = pg
const port = Number(process.env.PORT || process.env.API_PORT || 3000)
const password = process.env.APP_PASSWORD
const sessionSecret = process.env.SESSION_SECRET
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .map((origin) => (/^https?:\/\//i.test(origin) ? origin : `https://${origin}`))
  .filter(Boolean)

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
if (!password || password.length < 12) {
  throw new Error('APP_PASSWORD must be set to at least 12 characters')
}
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be set to at least 32 characters')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
})

const app = express()
app.set('trust proxy', 1)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('Origin is not allowed'))
    },
  }),
)
app.use(express.json({ limit: '16kb' }))

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

function signToken(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', sessionSecret).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
}

function isAuthorized(req, res, next) {
  const token = req.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  const [encodedPayload, suppliedSignature] = token.split('.')
  if (!encodedPayload || !suppliedSignature) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  const expectedSignature = createHmac('sha256', sessionSecret)
    .update(encodedPayload)
    .digest('base64url')
  const expected = Buffer.from(expectedSignature)
  const supplied = Buffer.from(suppliedSignature)
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())
    if (payload.exp <= Date.now()) return res.status(401).json({ error: 'Session expired' })
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }

  next()
}

function normalizePayment(input) {
  const name = typeof input.Name === 'string' ? input.Name.trim() : ''
  const amount = Number(input.Amount)
  const paymentType = input.PaymentType
  const date = input.Date
  const validTypes = ['Electric', 'Water', 'Miscellaneous']
  const parsedDate = typeof date === 'string' ? new Date(`${date}T00:00:00.000Z`) : null
  const validDate =
    parsedDate &&
    !Number.isNaN(parsedDate.valueOf()) &&
    parsedDate.toISOString().slice(0, 10) === date

  if (!name || name.length > 120) return { error: 'Name is required (up to 120 characters)' }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
    return { error: 'Amount must be a positive number' }
  }
  if (!validTypes.includes(paymentType)) return { error: 'Choose a valid payment type' }
  if (!validDate) return { error: 'Date must be a valid YYYY-MM-DD date' }

  return { value: { Name: name, Amount: amount, PaymentType: paymentType, Date: date } }
}

function presentPayment(row) {
  return {
    id: row.id,
    Name: row.name,
    Amount: Number(row.amount),
    PaymentType: row.payment_type,
    Date: row.payment_date,
  }
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      payment_type TEXT NOT NULL CHECK (payment_type IN ('Electric', 'Water', 'Miscellaneous')),
      payment_date DATE NOT NULL
    )
  `)
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch {
    res.status(503).json({ status: 'unavailable' })
  }
})

app.post('/auth/login', loginLimit, (req, res) => {
  const submittedPassword = createHash('sha256').update(String(req.body?.password || '')).digest()
  const expectedPassword = createHash('sha256').update(password).digest()
  if (!timingSafeEqual(submittedPassword, expectedPassword)) {
    return res.status(401).json({ error: 'Incorrect password' })
  }

  res.json({ token: signToken({ exp: Date.now() + 12 * 60 * 60 * 1000 }) })
})

app.use('/payments', isAuthorized)

app.get('/payments', async (_req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, amount, payment_type, payment_date::text FROM payments ORDER BY payment_date DESC, id',
    )
    res.json(result.rows.map(presentPayment))
  } catch (error) {
    next(error)
  }
})

app.post('/payments', async (req, res, next) => {
  const payment = normalizePayment(req.body || {})
  if (payment.error) return res.status(400).json({ error: payment.error })

  try {
    const { Name, Amount, PaymentType, Date } = payment.value
    const result = await pool.query(
      `INSERT INTO payments (id, name, amount, payment_type, payment_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, amount, payment_type, payment_date::text`,
      [randomUUID(), Name, Amount, PaymentType, Date],
    )
    res.status(201).json(presentPayment(result.rows[0]))
  } catch (error) {
    next(error)
  }
})

app.put('/payments/:id', async (req, res, next) => {
  const payment = normalizePayment(req.body || {})
  if (payment.error) return res.status(400).json({ error: payment.error })

  try {
    const { Name, Amount, PaymentType, Date } = payment.value
    const result = await pool.query(
      `UPDATE payments
       SET name = $2, amount = $3, payment_type = $4, payment_date = $5
       WHERE id = $1
       RETURNING id, name, amount, payment_type, payment_date::text`,
      [req.params.id, Name, Amount, PaymentType, Date],
    )
    if (!result.rowCount) return res.status(404).json({ error: 'Payment not found' })
    res.json(presentPayment(result.rows[0]))
  } catch (error) {
    next(error)
  }
})

app.delete('/payments/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM payments WHERE id = $1', [req.params.id])
    if (!result.rowCount) return res.status(404).json({ error: 'Payment not found' })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error)
  console.error(error)
  res.status(500).json({ error: 'The request could not be completed' })
})

await initializeDatabase()
app.listen(port, '0.0.0.0', () => console.log(`Billing API listening on port ${port}`))

process.on('SIGTERM', async () => {
  await pool.end()
  process.exit(0)
})