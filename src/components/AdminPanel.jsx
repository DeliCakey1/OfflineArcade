import { useState, useEffect, useRef } from 'react'
import useSound from '../useSound'
import {
  verifyPassword,
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin,
  canAttemptLogin,
  setLoginCooldown,
  getRemainingCooldown,
} from '../adminAuth'
import { resetAllScores } from '../leagueService'

export default function AdminPanel({ onBack, userId }) {
  const [authenticated, setAuthenticated] = useState(isAdminLoggedIn())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState('')
  const inputRef = useRef(null)
  const sound = useSound()

  useEffect(() => {
    if (!authenticated && inputRef.current) {
      inputRef.current.focus()
    }
  }, [authenticated])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => Math.max(0, c - 100)), 100)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleLogin(e) {
    e.preventDefault()
    if (!canAttemptLogin()) {
      const remaining = getRemainingCooldown()
      setCooldown(remaining)
      setError(`Too many attempts. Wait ${Math.ceil(remaining / 1000)}s.`)
      return
    }

    setLoading(true)
    setError('')

    const valid = await verifyPassword(password)
    if (valid) {
      loginAdmin()
      setAuthenticated(true)
      setPassword('')
      sound('cash')
    } else {
      setLoginCooldown()
      setCooldown(getRemainingCooldown())
      setError('Incorrect password.')
      setPassword('')
      sound('lose')
    }
    setLoading(false)
  }

  function handleLogout() {
    logoutAdmin()
    setAuthenticated(false)
    setPassword('')
    sound('click')
  }

  async function handleResetAllScores() {
    if (resetting) return
    setResetting(true)
    setResetError('')
    setResetDone(false)
    try {
      await resetAllScores(userId)
      setResetDone(true)
      sound('cash')
    } catch (e) {
      setResetError(e.message || 'Reset failed')
      sound('lose')
    }
    setResetting(false)
  }

  if (!authenticated) {
    return (
      <div className="full-page">
        <div className="full-page-header">
          <button className="quit-btn" onClick={onBack}>&larr; Back</button>
          <h2 className="full-page-title">🔒 Admin Panel</h2>
        </div>
        <div className="admin-login-container">
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="admin-lock-icon">🔐</div>
            <h3 className="admin-login-title">Admin Access</h3>
            <p className="admin-login-subtitle">Enter the admin key to continue.</p>
            <input
              ref={inputRef}
              type="password"
              className="admin-password-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin key..."
              disabled={loading || cooldown > 0}
              autoComplete="off"
            />
            {error && (
              <div className="admin-error">{error}</div>
            )}
            <button
              type="submit"
              className="admin-login-btn"
              disabled={loading || cooldown > 0 || !password}
            >
              {loading ? 'Verifying...' : cooldown > 0 ? `Wait ${Math.ceil(cooldown / 1000)}s...` : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="full-page">
      <div className="full-page-header">
        <button className="quit-btn" onClick={onBack}>&larr; Back</button>
        <h2 className="full-page-title">🔒 Admin Panel</h2>
      </div>
      <div className="admin-dashboard">
        <div className="admin-welcome">
          <span className="admin-badge-large">👑</span>
          <h3>Welcome, Admin</h3>
          <p>You have full admin access. Use the hidden lock in Settings to unlock admin cosmetics on your profile.</p>
        </div>
        <div className="admin-sections">
          <div className="admin-section-card">
            <span className="admin-section-emoji">🛡️</span>
            <h4>Admin Cosmetics</h4>
            <p>Go to Settings and click the lock icon to unlock free cosmetics.</p>
          </div>
          <div className="admin-section-card admin-coming-soon">
            <span className="admin-section-emoji">📊</span>
            <h4>User Management</h4>
            <p>Coming soon...</p>
          </div>
          <div className="admin-section-card admin-coming-soon">
            <span className="admin-section-emoji">🎮</span>
            <h4>Game Controls</h4>
            <p>Coming soon...</p>
          </div>
          <div className="admin-section-card admin-coming-soon">
            <span className="admin-section-emoji">📈</span>
            <h4>Analytics</h4>
            <p>Coming soon...</p>
          </div>
          <div className="admin-section-card admin-danger">
            <span className="admin-section-emoji">💥</span>
            <h4>Reset All Scores</h4>
            <p>Wipe all player stats, XP, coins, leagues, and tournaments. Your admin account is preserved.</p>
            {resetDone && <p className="admin-reset-success">All scores have been reset.</p>}
            {resetError && <p className="admin-reset-error">{resetError}</p>}
            <button
              className="admin-reset-btn"
              onClick={handleResetAllScores}
              disabled={resetting}
            >
              {resetting ? 'Resetting...' : '💥 Nuclear Reset'}
            </button>
          </div>
        </div>
        <button className="admin-logout-btn" onClick={handleLogout}>
          🚪 Lock Admin Panel
        </button>
      </div>
    </div>
  )
}
