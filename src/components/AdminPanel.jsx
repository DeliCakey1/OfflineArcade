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
import { resetAllScores, searchPlayersByName, getPlayer, updatePlayer } from '../leagueService'

export default function AdminPanel({ userId }) {
  const [authenticated, setAuthenticated] = useState(isAdminLoggedIn())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirming, setResetConfirming] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState('')
  const [myCoins, setMyCoins] = useState(null)
  const [myCoinsLoading, setMyCoinsLoading] = useState(false)
  const [myCoinAmount, setMyCoinAmount] = useState('')
  const [myCoinDone, setMyCoinDone] = useState('')
  const [myCoinError, setMyCoinError] = useState('')
  const [coinSearch, setCoinSearch] = useState('')
  const [coinSearchResults, setCoinSearchResults] = useState([])
  const [coinSearchLoading, setCoinSearchLoading] = useState(false)
  const [coinSearchError, setCoinSearchError] = useState('')
  const [coinAmount, setCoinAmount] = useState('')
  const [coinActionLoading, setCoinActionLoading] = useState('')
  const [coinActionDone, setCoinActionDone] = useState('')
  const inputRef = useRef(null)
  const sound = useSound()

  useEffect(() => {
    if (!authenticated && inputRef.current) {
      inputRef.current.focus()
    }
  }, [authenticated])

  useEffect(() => {
    if (authenticated && userId) {
      setMyCoinsLoading(true)
      getPlayer(userId).then(p => {
        setMyCoins(p?.coins || 0)
        setMyCoinsLoading(false)
      }).catch(() => setMyCoinsLoading(false))
    }
  }, [authenticated, userId])

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
    setMyCoins(null)
    sound('click')
  }

  async function handleMyCoinAction(action) {
    const amount = parseInt(myCoinAmount)
    if (!amount || amount <= 0 || !userId) return
    setMyCoinDone('')
    setMyCoinError('')
    try {
      const player = await getPlayer(userId)
      const current = player?.coins || 0
      const newCoins = action === 'add' ? current + amount : Math.max(0, current - amount)
      await updatePlayer(userId, { coins: newCoins })
      setMyCoins(newCoins)
      setMyCoinDone(`${action === 'add' ? 'Added' : 'Removed'} ${amount} coins`)
      setMyCoinAmount('')
      sound('cash')
    } catch (err) {
      setMyCoinError(err.message || 'Failed')
      sound('lose')
    }
  }

  async function handleResetAllScores() {
    if (resetting) return
    setResetting(true)
    setResetError('')
    setResetDone(false)
    try {
      await resetAllScores(userId)
      setResetDone(true)
      setResetConfirming(false)
      sound('cash')
    } catch (e) {
      setResetError(e.message || 'Reset failed')
      sound('lose')
    }
    setResetting(false)
  }

  async function handleCoinSearch(e) {
    e.preventDefault()
    if (!coinSearch.trim()) return
    setCoinSearchLoading(true)
    setCoinSearchError('')
    setCoinSearchResults([])
    try {
      const results = await searchPlayersByName(coinSearch.trim())
      if (results.length === 0) {
        setCoinSearchError('No players found.')
      }
      setCoinSearchResults(results)
    } catch (err) {
      setCoinSearchError(err.message || 'Search failed.')
    }
    setCoinSearchLoading(false)
  }

  async function handleCoinAction(targetUserId, action) {
    const amount = parseInt(coinAmount)
    if (!amount || amount <= 0) return
    setCoinActionLoading(targetUserId + action)
    setCoinActionDone('')
    try {
      const player = await getPlayer(targetUserId)
      const current = player?.coins || 0
      const newCoins = action === 'add' ? current + amount : Math.max(0, current - amount)
      await updatePlayer(targetUserId, { coins: newCoins })
      setCoinSearchResults(prev => prev.map(r => r.id === targetUserId ? { ...r, coins: newCoins } : r))
      setCoinActionDone(`${action === 'add' ? 'Added' : 'Removed'} ${amount} coins`)
      sound('cash')
    } catch (err) {
      setCoinSearchError(err.message || 'Action failed.')
      sound('lose')
    }
    setCoinActionLoading('')
  }

  if (!authenticated) {
    return (
      <div className="full-page">
        <div className="full-page-header">
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
        <h2 className="full-page-title">🔒 Admin Panel</h2>
      </div>
      <div className="admin-dashboard">
        <div className="admin-welcome">
          <span className="admin-badge-large">👑</span>
          <h3>Welcome, Admin</h3>
          <p>You have full admin access. Admin-exclusive items are available in the Shop.</p>
        </div>
        <div className="admin-sections">
          <div className="admin-section-card">
            <span className="admin-section-emoji">🪙</span>
            <h4>Your Coins</h4>
            <div className="admin-my-coins">
              <span className="admin-my-coins-amount">{myCoinsLoading ? '...' : `🪙 ${(myCoins || 0).toLocaleString()}`}</span>
            </div>
            <div className="admin-my-coins-actions">
              <input
                type="number"
                className="admin-coin-amount-input"
                value={myCoinAmount}
                onChange={e => setMyCoinAmount(e.target.value)}
                placeholder="Amount"
                min="1"
              />
              <button
                className="admin-coin-action-btn admin-coin-give"
                onClick={() => handleMyCoinAction('add')}
                disabled={!myCoinAmount}
              >
                + Add
              </button>
              <button
                className="admin-coin-action-btn admin-coin-remove"
                onClick={() => handleMyCoinAction('remove')}
                disabled={!myCoinAmount}
              >
                - Remove
              </button>
            </div>
            {myCoinDone && <p className="admin-reset-success">{myCoinDone}</p>}
            {myCoinError && <p className="admin-reset-error">{myCoinError}</p>}
          </div>
          <div className="admin-section-card">
            <span className="admin-section-emoji">🛡️</span>
            <h4>Admin Cosmetics</h4>
            <p>The "Owner" title is exclusive to admin. All other items are purchased with coins in the Shop.</p>
          </div>
          <div className="admin-section-card">
            <span className="admin-section-emoji">🪙</span>
            <h4>Coin Management</h4>
            <p>Search for a player by username to give or remove coins.</p>
            <form onSubmit={handleCoinSearch} className="admin-coin-search">
              <input
                type="text"
                className="admin-coin-input"
                value={coinSearch}
                onChange={e => setCoinSearch(e.target.value)}
                placeholder="Search by username..."
              />
              <button type="submit" className="admin-coin-search-btn" disabled={coinSearchLoading || !coinSearch.trim()}>
                {coinSearchLoading ? '...' : '🔍'}
              </button>
            </form>
            {coinSearchError && <p className="admin-reset-error">{coinSearchError}</p>}
            {coinActionDone && <p className="admin-reset-success">{coinActionDone}</p>}
            {coinSearchResults.length > 0 && (
              <div className="admin-coin-results">
                <div className="admin-coin-amount-row">
                  <input
                    type="number"
                    className="admin-coin-amount-input"
                    value={coinAmount}
                    onChange={e => setCoinAmount(e.target.value)}
                    placeholder="Amount"
                    min="1"
                  />
                </div>
                {coinSearchResults.map(r => (
                  <div key={r.id} className="admin-coin-result">
                    <div className="admin-coin-result-info">
                      <span className="admin-coin-result-name">@{r.username}</span>
                      <span className="admin-coin-result-coins">🪙 {(r.coins || 0).toLocaleString()}</span>
                    </div>
                    <div className="admin-coin-result-actions">
                      <button
                        className="admin-coin-action-btn admin-coin-give"
                        onClick={() => handleCoinAction(r.id, 'add')}
                        disabled={coinActionLoading === r.id + 'add' || !coinAmount}
                      >
                        {coinActionLoading === r.id + 'add' ? '...' : '+ Give'}
                      </button>
                      <button
                        className="admin-coin-action-btn admin-coin-remove"
                        onClick={() => handleCoinAction(r.id, 'remove')}
                        disabled={coinActionLoading === r.id + 'remove' || !coinAmount}
                      >
                        {coinActionLoading === r.id + 'remove' ? '...' : '- Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            {resetConfirming ? (
              <div className="admin-reset-confirm">
                <p className="admin-reset-confirm-text">Are you sure? This cannot be undone.</p>
                <button
                  className="admin-reset-btn admin-reset-confirm-yes"
                  onClick={handleResetAllScores}
                  disabled={resetting}
                >
                  {resetting ? 'Resetting...' : 'Yes, reset everything'}
                </button>
                <button
                  className="admin-reset-btn admin-reset-confirm-no"
                  onClick={() => setResetConfirming(false)}
                  disabled={resetting}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="admin-reset-btn"
                onClick={() => setResetConfirming(true)}
              >
                💥 Nuclear Reset
              </button>
            )}
          </div>
        </div>
        <button className="admin-logout-btn" onClick={handleLogout}>
          🚪 Lock Admin Panel
        </button>
      </div>
    </div>
  )
}
