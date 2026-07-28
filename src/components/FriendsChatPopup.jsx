import { useState, useEffect, useRef } from 'react'
import { getFriendCode, getFriends } from '../socialService'
import { getNameplateStyle, getNameplateBorderStyle, getNameplateEffectClass, getNameplateNeonColor } from '../nameplateUtils'
import { LEAGUE_RANKS } from '../leagues'
import ChatPanel from './ChatPanel'

export default function FriendsChatPopup({ userId, user }) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!open || !userId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const list = await getFriends()
        if (!cancelled) setFriends(list)
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [open, userId])

  useEffect(() => {
    if (!open) setSelected(null)
  }, [open])

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'transparent',
          }}
        />
      )}
      <div style={{ position: 'fixed', bottom: 20, right: 16, zIndex: 100 }}>
        {open && (
          <div style={{
            position: 'absolute', bottom: 56, right: 0,
            width: 360, maxHeight: 500,
            background: 'var(--card, #1a1033)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: 16, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 600,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{selected ? `💬 @${selected.username || 'friend'}` : '👥 Friends'}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {selected && (
                  <button onClick={(e) => { e.stopPropagation(); setSelected(null) }} style={{
                    background: 'transparent', border: 'none', color: 'var(--text-dim)',
                    cursor: 'pointer', fontSize: 12, padding: '2px 6px',
                  }}>← Back</button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setOpen(false) }} style={{
                  background: 'transparent', border: 'none', color: 'var(--text-dim)',
                  cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
                }}>×</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }} onClick={(e) => e.stopPropagation()}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 24, fontSize: 12, opacity: 0.4 }}>Loading...</div>
              ) : !selected ? (
                friends.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, fontSize: 12, opacity: 0.4 }}>No friends yet</div>
                ) : (
                  <div style={{ padding: 6 }}>
                    {friends.map(f => {
                      const ri = LEAGUE_RANKS.find(r => r.rank === f.league)
                      return (
                        <button key={f.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                          borderRadius: 8, background: 'transparent', border: 'none',
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          color: 'var(--text)', fontFamily: 'Fredoka, sans-serif',
                        }} onClick={(e) => { e.stopPropagation(); setSelected(f) }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'var(--accent)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>{(f.username || f.name || 'U')[0].toUpperCase()}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              @{f.username || f.name || 'Anonymous'}
                            </span>
                            <span style={{ fontSize: 10, opacity: 0.4 }}>
                              {ri?.emoji || '🦠'} {ri?.name || 'Microbe'} · {(f.xp || 0).toLocaleString()} XP
                            </span>
                          </div>
                          <span style={{ fontSize: 10, opacity: 0.3 }}>💬</span>
                        </button>
                      )
                    })}
                  </div>
                )
              ) : (
                <div onClick={(e) => e.stopPropagation()}>
                  <ChatPanel roomId={[userId, selected.id].sort().join('_')} user={user} />
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
          style={{
            width: 48, height: 48, borderRadius: 12,
            background: open ? 'var(--accent, #8b5cf6)' : 'var(--card, #241845)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'all 0.2s', color: '#fff',
          }}
          title="Friends Chat"
        >
          {open ? '×' : '👥'}
        </button>
      </div>
    </>
  )
}
