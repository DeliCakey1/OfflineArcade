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
  const [targetUsername, setTargetUsername] = useState('')
  const [targetResults, setTargetResults] = useState([])
  const [targetPlayer, setTargetPlayer] = useState(null)
  const [targetLoading, setTargetLoading] = useState(false)
  const [targetError, setTargetError] = useState('')
  const [targetCoinAmount, setTargetCoinAmount] = useState('')
  const [targetActionLoading, setTargetActionLoading] = useState('')
  const [targetDone, setTargetDone] = useState('')
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

  async function handleTargetLookup(e) {
    e.preventDefault()
    const name = targetUsername.trim().toLowerCase()
    if (!name) return
    setTargetLoading(true)
    setTargetError('')
    setTargetResults([])
    setTargetPlayer(null)
    setTargetDone('')
    try {
      const results = await searchPlayersByName(name)
      if (results.length === 0) {
        setTargetError('No players found.')
      } else {
        setTargetResults(results)
      }
    } catch (err) {
      setTargetError(err.message || 'Lookup failed.')
    }
    setTargetLoading(false)
  }

  function handleSelectTarget(player) {
    setTargetPlayer(player)
    setTargetResults([])
    setTargetUsername('')
    setTargetDone('')
  }

  async function handleTargetCoinAction(action) {
    const amount = parseInt(targetCoinAmount)
    if (!amount || amount <= 0 || !targetPlayer) return
    setTargetActionLoading(action)
    setTargetDone('')
    setTargetError('')
    try {
      const player = await getPlayer(targetPlayer.id)
      const current = player?.coins || 0
      const newCoins = action === 'add' ? current + amount : Math.max(0, current - amount)
      await updatePlayer(targetPlayer.id, { coins: newCoins })
      setTargetPlayer(prev => prev ? { ...prev, coins: newCoins } : prev)
      setTargetDone(`${action === 'add' ? 'Added' : 'Removed'} ${amount} coins from @${targetPlayer.username}`)
      setTargetCoinAmount('')
      sound('cash')
    } catch (err) {
      setTargetError(err.message || 'Action failed.')
      sound('lose')
    }
    setTargetActionLoading('')
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
            <h4>Give / Remove Coins</h4>
            <p>Search for a player, select them, then give or remove coins.</p>
            <form onSubmit={handleTargetLookup} className="admin-coin-search">
              <input
                type="text"
                className="admin-coin-input"
                value={targetUsername}
                onChange={e => setTargetUsername(e.target.value)}
                placeholder="Search by username..."
              />
              <button type="submit" className="admin-coin-search-btn" disabled={targetLoading || !targetUsername.trim()}>
                {targetLoading ? '...' : '🔍'}
              </button>
            </form>
            {targetError && <p className="admin-reset-error">{targetError}</p>}
            {targetDone && <p className="admin-reset-success">{targetDone}</p>}
            {targetResults.length > 0 && !targetPlayer && (
              <div className="admin-coin-results">
                {targetResults.map(r => (
                  <div key={r.id} className="admin-coin-result admin-coin-selectable" onClick={() => handleSelectTarget(r)}>
                    <div className="admin-coin-result-info">
                      <span className="admin-coin-result-name">@{r.username || 'unknown'}</span>
                      <span className="admin-coin-result-coins">🪙 {(r.coins || 0).toLocaleString()}</span>
                    </div>
                    <span className="admin-coin-select-hint">→</span>
                  </div>
                ))}
              </div>
            )}
            {targetPlayer && (
              <div className="admin-coin-results">
                <div className="admin-coin-result">
                  <div className="admin-coin-result-info">
                    <span className="admin-coin-result-name">@{targetPlayer.username || 'unknown'}</span>
                    <span className="admin-coin-result-coins">🪙 {(targetPlayer.coins || 0).toLocaleString()}</span>
                  </div>
                  <button className="admin-coin-action-btn admin-coin-back" onClick={() => { setTargetPlayer(null); setTargetResults([]); setTargetDone('') }}>
                    ✕
                  </button>
                </div>
                <div className="admin-coin-amount-row">
                  <input
                    type="number"
                    className="admin-coin-amount-input"
                    value={targetCoinAmount}
                    onChange={e => setTargetCoinAmount(e.target.value)}
                    placeholder="Amount"
                    min="1"
                  />
                  <button
                    className="admin-coin-action-btn admin-coin-give"
                    onClick={() => handleTargetCoinAction('add')}
                    disabled={targetActionLoading === 'add' || !targetCoinAmount}
                  >
                    {targetActionLoading === 'add' ? '...' : '+ Give'}
                  </button>
                  <button
                    className="admin-coin-action-btn admin-coin-remove"
                    onClick={() => handleTargetCoinAction('remove')}
                    disabled={targetActionLoading === 'remove' || !targetCoinAmount}
                  >
                    {targetActionLoading === 'remove' ? '...' : '- Remove'}
                  </button>
                </div>
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
