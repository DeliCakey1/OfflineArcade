const SESSION_KEY = 'arcade-admin-session'
const COOLDOWN_KEY = 'arcade-admin-cooldown'
const COOLDOWN_MS = 3000

const PASSWORD_HASH = '6dddd9f75c9ec0223ccb1262faa847d5fb5ffb6016d11713f1b32566ca5fa0d7'
const SALT = 'arcade-admin-salt-v1'

async function hashInput(input) {
  const encoder = new TextEncoder()
  const data = encoder.encode(input + SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(input) {
  const hash = await hashInput(input)
  return hash === PASSWORD_HASH
}

export function isAdminLoggedIn() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const session = JSON.parse(raw)
    return session.authenticated === true
  } catch {
    return false
  }
}

export function getAdminSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loginAdmin() {
  const session = { authenticated: true, timestamp: Date.now() }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function logoutAdmin() {
  localStorage.removeItem(SESSION_KEY)
}

export function canAttemptLogin() {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY)
    if (!raw) return true
    const lastAttempt = parseInt(raw, 10)
    return Date.now() - lastAttempt >= COOLDOWN_MS
  } catch {
    return true
  }
}

export function setLoginCooldown() {
  localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
}

export function getRemainingCooldown() {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY)
    if (!raw) return 0
    const lastAttempt = parseInt(raw, 10)
    const remaining = COOLDOWN_MS - (Date.now() - lastAttempt)
    return remaining > 0 ? remaining : 0
  } catch {
    return 0
  }
}
