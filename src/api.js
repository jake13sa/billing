import axios from 'axios'

const sessionKey = 'billing-session-token'
const configuredApiUrl = import.meta.env.VITE_API_URL || ''
const baseURL = configuredApiUrl && !/^https?:\/\//i.test(configuredApiUrl)
  ? `https://${configuredApiUrl}`
  : configuredApiUrl

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(sessionKey)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
      sessionStorage.removeItem(sessionKey)
      window.dispatchEvent(new Event('billing:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export function getSessionToken() {
  return sessionStorage.getItem(sessionKey)
}

export function setSessionToken(token) {
  sessionStorage.setItem(sessionKey, token)
}

export function clearSessionToken() {
  sessionStorage.removeItem(sessionKey)
}