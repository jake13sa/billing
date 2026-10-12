import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to the deployed PostgreSQL external URL')

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
})

try {
  const database = JSON.parse(await readFile(resolve('db.json'), 'utf8'))
  const payments = database.payments || []

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      payment_type TEXT NOT NULL CHECK (payment_type IN ('Electric', 'Water', 'Miscellaneous')),
      payment_date DATE NOT NULL
    )
  `)

  await pool.query('BEGIN')
  for (const payment of payments) {
    await pool.query(
      `INSERT INTO payments (id, name, amount, payment_type, payment_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [
        String(payment.id || randomUUID()),
        payment.Name,
        payment.Amount,
        payment.PaymentType,
        payment.Date,
      ],
    )
  }
  await pool.query('COMMIT')
  console.log(`Imported ${payments.length} payment record(s); existing IDs were left unchanged.`)
} catch (error) {
  await pool.query('ROLLBACK').catch(() => {})
  throw error
} finally {
  await pool.end()
}