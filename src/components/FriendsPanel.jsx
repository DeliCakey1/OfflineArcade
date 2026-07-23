import { useState, useEffect } from 'react'
import { getFriendCode, addFriendByCode, removeFriend, getFriends } from '../socialService'
import { getNameplateStyle, getNameplateBorderStyle, getNameplateEffectClass, getNameplateNeonColor } from '../nameplateUtils'

export default function FriendsPanel({ userId, onClose }) {
  const [friends, setFriends] = useState([])
  const [myCode, setMyCode] = useState('')
  const [addCode, setAddCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    return () => { cancelled = true }
  }, [userId])

  async function handleAdd() {
    if (!addCode.trim()) return
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
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="game-card slide-in" style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: 'var(--neon-cyan)' }}>👥 Friends</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

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

      {loading ? (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-dim)' }}>Loading friends...</div>
      ) : friends.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🤝</div>
          <div style={{ fontSize: 13 }}>No friends yet. Add someone with their code!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {friends.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 8, background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ flex: 1 }}>
                <div
                  className={getNameplateEffectClass(f.nameplateEffect)}
                  style={{ ...getNameplateStyle(f.nameplate), ...getNameplateBorderStyle(f.nameplateEffect), '--np-neon-color': getNameplateNeonColor(f.nameplateEffect) || undefined, fontSize: 13 }}
                >
                  {f.username || f.name || 'Anonymous'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {f.xp || 0} XP · Rank {f.league || 10}
                </div>
              </div>
              <button onClick={() => handleRemove(f.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer', padding: '4px 8px' }} title="Remove friend">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
