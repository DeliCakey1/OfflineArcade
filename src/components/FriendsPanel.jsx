import { useState, useEffect } from 'react'
import { getFriendCode, addFriendByCode, removeFriend, getFriends } from '../socialService'
import { getNameplateStyle, getNameplateBorderStyle, getNameplateEffectClass, getNameplateNeonColor } from '../nameplateUtils'
import { LEAGUE_RANKS } from '../leagues'
import ChatPanel from './ChatPanel'

export default function FriendsPanel({ userId, user, onClose }) {
  const [friends, setFriends] = useState([])
  const [myCode, setMyCode] = useState('')
  const [addCode, setAddCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [code, friendList] = await Promise.all([getFriendCode(userId), getFriends()])
        if (!cancelled) { setMyCode(code); setFriends(friendList) }
      } catch {}
      if (!cancelled) setLoading(false)
    }
    if (userId) load()
    else setLoading(false)
    return () => { cancelled = true }
  }, [userId])

  if (!user) {
    return (
      <div className="full-page">
        <div className="full-page-header">
          <button className="quit-btn" onClick={onClose}>← Back</button>
          <h2 className="full-page-title">👥 Friends</h2>
        </div>
        <div className="full-page-content">
          <p className="friends-signin-msg">Sign in to access friends, send friend codes, and chat.</p>
          <button className="settings-btn sign-in-cta" onClick={onClose}>Sign In</button>
        </div>
      </div>
    )
  }

  async function handleAdd() {
    if (!addCode.trim()) return
    if (friends.length >= 25) { setError('Max 25 friends reached. Remove one first.'); return }
    setError('')
    setSuccess('')
    const result = await addFriendByCode(addCode.trim())
    if (result.error) { setError(result.error); return }
    setSuccess(`Added ${result.name}!`)
    setAddCode('')
    const friendList = await getFriends()
    setFriends(friendList)
  }

  async function handleRemove(friendId) {
    await removeFriend(friendId)
    setFriends(prev => prev.filter(f => f.id !== friendId))
    if (selected?.id === friendId) setSelected(null)
  }

  function getTitleName(title) {
    const titles = {
      'newbie': 'Newbie', 'veteran': 'Veteran', 'expert': 'Expert', 'legend': 'Legend',
      'arcade-legend': 'Arcade Legend', 'coin-hoarder': 'Coin Hoarder', 'daily-warrior': 'Daily Warrior',
      'seasoned': 'Seasoned', 'unstoppable': 'Unstoppable', 'mastermind': 'Mastermind',
      'first-win': 'First Win', 'lucky-streak': 'Lucky Streak', 'high-roller': 'High Roller',
      'no-lives': 'No Lives', 'try-hard': 'Try Hard', 'admin': 'admin',
    }
    return titles[title] || null
  }

  return (
    <div className="game-card slide-in" style={{ maxWidth: 400, margin: '0 auto' }}>
      <div className="full-page-header">
        {selected ? (
          <button className="quit-btn" onClick={() => setSelected(null)}>← Back</button>
        ) : (
          <button className="quit-btn" onClick={onClose}>← Back</button>
        )}
        <h2 className="full-page-title">👥 Friends</h2>
      </div>

      {user && !selected && (
        <>
          <div style={{ background: 'rgba(0,212,255,0.08)', borderRadius: 8, padding: 12, marginBottom: 16, border: '1px solid rgba(0,212,255,0.2)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Your Friend Code</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-cyan)', letterSpacing: 3 }}>
              {myCode || 'Loading...'}
            </div>
            {myCode && (
              <button onClick={() => { navigator.clipboard?.writeText(myCode) }} style={{ marginTop: 8, background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 6, padding: '6px 12px', color: 'var(--neon-cyan)', fontSize: 12, cursor: 'pointer' }}>
                📋 Copy Code
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Enter friend code"
              value={addCode}
              onChange={e => { setAddCode(e.target.value.toUpperCase()); setError(''); setSuccess('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              maxLength={8}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: "'Press Start 2P', monospace", letterSpacing: 2 }}
            />
            <button onClick={handleAdd} disabled={!addCode.trim()} style={{ background: addCode.trim() ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${addCode.trim() ? 'rgba(57,255,20,0.3)' : 'var(--border-glass)'}`, borderRadius: 6, padding: '8px 14px', color: addCode.trim() ? '#39ff14' : 'var(--text-dim)', fontSize: 14, cursor: addCode.trim() ? 'pointer' : 'default' }}>
              Add
            </button>
          </div>

          {error && <div style={{ color: 'var(--lose-color)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          {success && <div style={{ color: 'var(--win-color)', fontSize: 12, marginBottom: 8 }}>{success}</div>}
        </>
      )}

      {!user && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
          <h3 style={{ color: 'var(--text-light)', marginBottom: 8 }}>Sign in to add friends</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Friends, friend codes, and chats are only available to signed-in players.</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-dim)' }}>Loading friends...</div>
      ) : !selected ? (
        <>
          {friends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🤝</div>
            <div style={{ fontSize: 13 }}>No friends yet. Add someone with their code!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {friends.map(f => {
              const ri = LEAGUE_RANKS.find(r => r.rank === f.league)
              return (
                <button key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', textAlign: 'left', width: '100%',
                }} onClick={() => setSelected(f)}>
                  <span className="user-search-avatar">{(f.username || f.name || 'U')[0].toUpperCase()}</span>
                  <div style={{ flex: 1 }}>
                    <span
                      className={getNameplateEffectClass(f.nameplateEffect)}
                      style={{ ...getNameplateStyle(f.nameplate), ...getNameplateBorderStyle(f.nameplateEffect), '--np-neon-color': getNameplateNeonColor(f.nameplateEffect) || undefined, fontSize: 13, fontWeight: 'bold', color: '#fff' }}
                    >
                      @{f.username || f.name || 'Anonymous'}
                    </span>
                    {f.name && f.username && f.name !== f.username && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{f.name}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                      {ri?.emoji || '🦠'} {ri?.name || 'Microbe'} · ⭐ {(f.xp || 0).toLocaleString()} pts · 🏆 {(f.wins || 0).toLocaleString()} wins
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          )}
        </>
      ) : (
        <div className="user-profile-card">
          <div className="user-profile-header">
            <div className="user-profile-avatar">{(selected.username || selected.name || 'U')[0].toUpperCase()}</div>
            <div
              className={`user-profile-name ${getNameplateEffectClass(selected.nameplateEffect)}`}
              style={{ ...getNameplateStyle(selected.nameplate), ...getNameplateBorderStyle(selected.nameplateEffect), '--np-neon-color': getNameplateNeonColor(selected.nameplateEffect) || undefined }}
            >
              @{selected.username || 'unknown'}
            </div>
            {selected.name && selected.username && selected.name !== selected.username && (
              <div className="user-profile-display-name">{selected.name}</div>
            )}
            {getTitleName(selected.title) && (
              <div className="user-profile-title">{getTitleName(selected.title)}</div>
            )}
            {(() => {
              const ri = LEAGUE_RANKS.find(r => r.rank === selected.league)
              return ri ? <div className="user-profile-rank" style={{ color: ri.color }}>{ri.emoji} {ri.name}</div> : null
            })()}
          </div>
          <div className="user-profile-stats">
            <div className="user-profile-stat">
              <span className="user-profile-stat-value">{(selected.xp || 0).toLocaleString()}</span>
              <span className="user-profile-stat-label">Total Points</span>
            </div>
            <div className="user-profile-stat">
              <span className="user-profile-stat-value">{(selected.wins || 0).toLocaleString()}</span>
              <span className="user-profile-stat-label">Wins</span>
            </div>
            <div className="user-profile-stat">
              <span className="user-profile-stat-value">{(selected.losses || 0).toLocaleString()}</span>
              <span className="user-profile-stat-label">Losses</span>
            </div>
            <div className="user-profile-stat">
              <span className="user-profile-stat-value">{selected.streak || 0}</span>
              <span className="user-profile-stat-label">Streak</span>
            </div>
            <div className="user-profile-stat">
              <span className="user-profile-stat-value">{(selected.promotions || 0).toLocaleString()}</span>
              <span className="user-profile-stat-label">Promotions</span>
            </div>
            <div className="user-profile-stat">
              <span className="user-profile-stat-value">{(selected.tournamentWins || 0).toLocaleString()}</span>
              <span className="user-profile-stat-label">Tournament Wins</span>
            </div>
          </div>
          {userId && selected && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                💬 Chat with @{selected.username || selected.name || 'friend'}
              </div>
              <ChatPanel roomId={[userId, selected.id].sort().join('_')} user={user} />
            </div>
          )}
          <button className="quit-btn" style={{ marginTop: 8 }} onClick={() => handleRemove(selected.id)}>Remove Friend</button>
        </div>
      )}
    </div>
  )
}
