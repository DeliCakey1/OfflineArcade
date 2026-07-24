import { useState, useEffect, useRef } from 'react'
import { VolumeSlider } from './VolumeSlider'
import ThemePicker from './ThemePicker'
import {
  verifyPassword,
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin,
  canAttemptLogin,
  setLoginCooldown,
  getRemainingCooldown,
} from '../adminAuth'

export default function SettingsPage({ onBack, muted, onMuteToggle, theme, onThemeChange, animations, onAnimToggle, glass, onGlassToggle, bg, onBgToggle, waveBar, onWaveBarToggle, volume, onVolumeChange, onCloak, user, playerName, userUsername, onNameChange, onUsernameChange, onSignIn, onSignOut, onAdminLogin, onAdminLogout, onRedoTutorial }) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameCooldown, setUsernameCooldown] = useState(0)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminCooldown, setAdminCooldown] = useState(0)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminActive, setAdminActive] = useState(isAdminLoggedIn())
  const adminInputRef = useRef(null)

  useEffect(() => {
    if (showAdminModal && adminInputRef.current) {
      adminInputRef.current.focus()
    }
  }, [showAdminModal])

  useEffect(() => {
    if (adminCooldown <= 0) return
    const timer = setTimeout(() => setAdminCooldown(c => Math.max(0, c - 100)), 100)
    return () => clearTimeout(timer)
  }, [adminCooldown])

  useEffect(() => {
    if (usernameCooldown <= 0) return
    const timer = setTimeout(() => setUsernameCooldown(c => Math.max(0, c - 1000)), 1000)
    return () => clearTimeout(timer)
  }, [usernameCooldown])

  function startEditName() {
    setNameInput(playerName || '')
    setEditingName(true)
  }

  function saveName() {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== playerName) {
      onNameChange(trimmed)
    }
    setEditingName(false)
  }

  function handleNameKeyDown(e) {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') setEditingName(false)
  }

  function startEditUsername() {
    setUsernameInput(userUsername || '')
    setUsernameError('')
    setEditingUsername(true)
  }

  async function saveUsername() {
    const trimmed = usernameInput.trim()
    if (!trimmed || trimmed === userUsername) { setEditingUsername(false); return }
    setUsernameLoading(true)
    setUsernameError('')
    try {
      const { updateUsername } = await import('../leagueService')
      await updateUsername(user.uid, trimmed)
      if (onUsernameChange) onUsernameChange(trimmed)
      setEditingUsername(false)
    } catch (e) {
      setUsernameError(e.message || 'Failed to update username')
      const remaining = e.message?.match(/(\d+)h (\d+)m/)
      if (remaining) {
        const ms = (parseInt(remaining[1]) * 3600 + parseInt(remaining[2]) * 60) * 1000
        setUsernameCooldown(ms)
      }
    }
    setUsernameLoading(false)
  }

  function handleUsernameKeyDown(e) {
    if (e.key === 'Enter') saveUsername()
    if (e.key === 'Escape') setEditingUsername(false)
  }

  function formatCooldown(ms) {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  async function handleAdminLogin(e) {
    e.preventDefault()
    if (!canAttemptLogin()) {
      const remaining = getRemainingCooldown()
      setAdminCooldown(remaining)
      setAdminError(`Too many attempts. Wait ${Math.ceil(remaining / 1000)}s.`)
      return
    }

    setAdminLoading(true)
    setAdminError('')

    const valid = await verifyPassword(adminPassword)
    if (valid) {
      if (onAdminLogin) await onAdminLogin()
      loginAdmin()
      setAdminActive(true)
      setShowAdminModal(false)
      setAdminPassword('')
    } else {
      setLoginCooldown()
      setAdminCooldown(getRemainingCooldown())
      setAdminError('Incorrect password.')
      setAdminPassword('')
    }
    setAdminLoading(false)
  }

  function handleAdminLogout() {
    logoutAdmin()
    setAdminActive(false)
    if (onAdminLogout) onAdminLogout()
  }

  const displayName = playerName || user?.displayName || user?.email || 'Signed In'
  const isGuest = user?.isAnonymous

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <h2>⚙️ Settings</h2>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">👤 Account</h3>
        {user && !user.isAnonymous ? (
          <>
            <div className="settings-row">
              <div className="settings-card-btn active" style={{ cursor: 'default' }}>
                <span className="user-avatar" style={{ width: 28, height: 28, fontSize: 13 }}>{((userUsername || displayName)[0] || 'U').toUpperCase()}</span>
                <span className="settings-card-label">{displayName}</span>
              </div>
              <button className="settings-card-btn" onClick={onSignOut}>
                <span className="settings-card-icon">🚪</span>
                <span className="settings-card-label">Sign Out</span>
              </button>
            </div>
            <div className="settings-row">
              {editingUsername ? (
                <div className="settings-card-btn active" style={{ cursor: 'default', flex: 1 }}>
                  <span className="settings-card-icon">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => { setUsernameInput(e.target.value); setUsernameError('') }}
                    onKeyDown={handleUsernameKeyDown}
                    onBlur={saveUsername}
                    maxLength={20}
                    autoFocus
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', fontFamily: 'inherit', fontSize: 14, width: '100%', outline: 'none' }}
                    placeholder="Enter a username..."
                  />
                </div>
              ) : (
                <button className="settings-card-btn" onClick={startEditUsername} style={{ flex: 1 }} disabled={usernameCooldown > 0}>
                  <span className="settings-card-icon">🏷️</span>
                  <span className="settings-card-label">
                    {userUsername ? `@${userUsername}` : 'Set Username'}
                    {usernameCooldown > 0 && <span className="username-cooldown"> ({formatCooldown(usernameCooldown)})</span>}
                  </span>
                </button>
              )}
            </div>
            {usernameError && <div className="username-settings-error">{usernameError}</div>}
            <div className="settings-row">
              {editingName ? (
                <div className="settings-card-btn active" style={{ cursor: 'default', flex: 1 }}>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    onBlur={saveName}
                    maxLength={20}
                    autoFocus
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', fontFamily: 'inherit', fontSize: 14, width: '100%', outline: 'none' }}
                    placeholder="Enter a name..."
                  />
                </div>
              ) : (
                <button className="settings-card-btn" onClick={startEditName} style={{ flex: 1 }}>
                  <span className="settings-card-icon">✏️</span>
                  <span className="settings-card-label">Edit Display Name</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {isGuest && userUsername && (
              <div className="settings-row">
                <div className="settings-card-btn active" style={{ cursor: 'default', flex: 1 }}>
                  <span className="settings-card-icon">🏷️</span>
                  <span className="settings-card-label guest-username">@{userUsername}</span>
                </div>
              </div>
            )}
            <button className="settings-card-btn full-width" onClick={onSignIn}>
              <span className="settings-card-icon">☁️</span>
              <span className="settings-card-label">Sign In to Save Data Across Devices</span>
            </button>
          </>
        )}
      </div>

      {adminActive && (
        <div className="settings-section admin-active-section">
          <h3 className="settings-section-title">👑 Admin Mode</h3>
          <div className="settings-row">
            <div className="settings-card-btn active" style={{ cursor: 'default' }}>
              <span className="settings-card-icon">👑</span>
              <span className="settings-card-label">Admin Mode Active</span>
            </div>
            <button className="settings-card-btn" onClick={handleAdminLogout}>
              <span className="settings-card-icon">🔒</span>
              <span className="settings-card-label">Lock</span>
            </button>
          </div>
        </div>
      )}

      <div className="settings-section">
        <h3 className="settings-section-title">🔊 Audio</h3>
        <div className="settings-row">
          <button className="settings-card-btn" onClick={onMuteToggle} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
            <span className="settings-card-icon">{muted ? '🔇' : '🔊'}</span>
            <span className="settings-card-label">{muted ? 'Muted' : 'Unmuted'}</span>
          </button>
          <div className="settings-slider-card">
            <span className="settings-card-icon">🔉</span>
            <VolumeSlider volume={volume} onChange={onVolumeChange} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">🎨 Appearance</h3>
        <div className="settings-row">
          <button className={`settings-card-btn ${animations ? 'active' : ''}`} onClick={onAnimToggle} aria-label={animations ? 'Disable animations' : 'Enable animations'}>
            <span className="settings-card-icon">{animations ? '✨' : '🚫'}</span>
            <span className="settings-card-label">Animations {animations ? 'On' : 'Off'}</span>
          </button>
          <button className={`settings-card-btn ${glass ? 'active' : ''}`} onClick={onGlassToggle} aria-label={glass ? 'Disable glassmorphism' : 'Enable glassmorphism'}>
            <span className="settings-card-icon">{glass ? '💎' : '🪟'}</span>
            <span className="settings-card-label">Glass {glass ? 'On' : 'Off'}</span>
          </button>
        </div>
        <div className="settings-row">
          <button className={`settings-card-btn ${bg ? 'active' : ''}`} onClick={onBgToggle} aria-label={bg ? 'Disable background' : 'Enable background'}>
            <span className="settings-card-icon">{bg ? '🖼️' : '⬛'}</span>
            <span className="settings-card-label">Background {bg ? 'On' : 'Off'}</span>
          </button>
          <button className={`settings-card-btn ${waveBar ? 'active' : ''}`} onClick={onWaveBarToggle} aria-label={waveBar ? 'Disable wave bar' : 'Enable wave bar'}>
            <span className="settings-card-icon">{waveBar ? '🌊' : '🫧'}</span>
            <span className="settings-card-label">Wave Bar {waveBar ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">🎨 Theme</h3>
        <ThemePicker current={theme} onChange={onThemeChange} />
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">❓ Help</h3>
        <button className="settings-card-btn full-width" onClick={onRedoTutorial} aria-label="Redo tutorial">
          <span className="settings-card-icon">📖</span>
          <span className="settings-card-label">Redo Tutorial</span>
        </button>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">🎭 Privacy</h3>
        <button className="settings-card-btn full-width" onClick={onCloak} aria-label="Tab Cloaking">
          <span className="settings-card-icon">🎭</span>
          <span className="settings-card-label">Tab Cloaking</span>
        </button>
        <button className="settings-card-btn full-width compact-admin-btn" onClick={() => setShowAdminModal(true)} aria-label="Admin panel">
            <span className="settings-card-icon">🔒</span>
            <span className="settings-card-label">Admin</span>
          </button>
      </div>

      {showAdminModal && (
        <div className="stats-overlay" onClick={() => { setShowAdminModal(false); setAdminPassword(''); setAdminError('') }}>
          <div className="stats-modal admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-icon">🔐</span>
              <h3>Admin Access</h3>
            </div>
            <form onSubmit={handleAdminLogin}>
              <input
                ref={adminInputRef}
                type="password"
                className="admin-password-input"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Enter admin key..."
                disabled={adminLoading || adminCooldown > 0}
                autoComplete="off"
              />
              {adminError && (
                <div className="admin-error">{adminError}</div>
              )}
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-cancel-btn"
                  onClick={() => { setShowAdminModal(false); setAdminPassword(''); setAdminError('') }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-login-btn"
                  disabled={adminLoading || adminCooldown > 0 || !adminPassword}
                >
                  {adminLoading ? 'Verifying...' : adminCooldown > 0 ? `Wait ${Math.ceil(adminCooldown / 1000)}s...` : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
