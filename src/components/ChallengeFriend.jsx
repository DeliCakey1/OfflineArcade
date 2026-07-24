import { useState, useEffect } from 'react'
import { getFriends } from '../socialService'
import { getOrCreatePlayer } from '../leagueService'
import useSound from '../useSound'

export default function ChallengeFriend({ userId, gameId, onClose, onChallenge }) {
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [sent, setSent] = useState(false)
  const sound = useSound()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const friendList = await getFriends()
        if (cancelled) return
        const enriched = await Promise.all(
          friendList.map(async (f) => {
            try {
              const p = await getOrCreatePlayer(f.id)
              return { ...f, ...p }
            } catch { return f }
          })
        )
        if (!cancelled) setFriends(enriched)
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  function handleChallenge() {
    if (!selected) return
    sound('confirm')
    onChallenge?.(selected)
    setSent(true)
    setTimeout(() => onClose?.(), 1500)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div style={{
        background: 'linear-gradient(135deg, #2a1f4e, #1a1033)',
        border: '1px solid rgba(185, 70, 255, 0.3)',
        borderRadius: 12, padding: 20, maxWidth: 380, width: '100%',
        maxHeight: '80vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>⚔️ Challenge a Friend</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            fontSize: 18, cursor: 'pointer', padding: 4,
          }} data-focus-trap-close>✕</button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📨</div>
            <p style={{ color: 'var(--neon-green)', fontWeight: 600 }}>Challenge sent!</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)' }}>Loading friends...</div>
        ) : friends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <p>No friends yet. Add friends in the Friends panel!</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {friends.map(f => (
                <button key={f.id} onClick={() => { setSelected(f); sound('click') }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, border: 'none',
                  background: selected?.id === f.id
                    ? 'linear-gradient(135deg, rgba(185, 70, 255, 0.3), rgba(0, 212, 255, 0.2))'
                    : 'rgba(255,255,255,0.04)',
                  cursor: 'pointer', textAlign: 'left',
                  outline: selected?.id === f.id ? '2px solid var(--neon-purple)' : '2px solid transparent',
                  fontFamily: "'Fredoka', sans-serif",
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {(f.username || f.name || 'U')[0].toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-light)', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.username ? `@${f.username}` : f.name || 'Unknown'}
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                      ⭐ {(f.xp || 0).toLocaleString()} XP · 🏆 {f.wins || 0}
                    </div>
                  </div>
                  {selected?.id === f.id && <span style={{ color: 'var(--neon-green)', fontSize: 16 }}>✓</span>}
                </button>
              ))}
            </div>
            <button onClick={handleChallenge} disabled={!selected} style={{
              width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none',
              background: selected
                ? 'linear-gradient(135deg, var(--neon-pink), var(--neon-orange))'
                : 'rgba(255,255,255,0.05)',
              color: selected ? '#fff' : 'var(--text-dim)',
              fontSize: 14, fontWeight: 600, cursor: selected ? 'pointer' : 'default',
              fontFamily: "'Fredoka', sans-serif",
            }}>
              {selected ? `Challenge ${selected.username ? '@' + selected.username : selected.name || 'Friend'}` : 'Select a friend'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
