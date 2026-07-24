import { useState, useEffect } from 'react'

const REACTIONS = ['🎉', '🔥', '💀', '😱', '👏', '😤', '🤡', '💎']

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, dbMod] = await Promise.all([import('firebase/firestore'), import('../firebase').then(m => m.getDb())])
  _f = { ...firestore, db: dbMod }
  return _f
}

export function useReactions(gameId, userId) {
  const [reactions, setReactions] = useState([])

  useEffect(() => {
    if (!gameId) return
    let unsub = null
    let cancelled = false

    async function subscribe() {
      const { collection, query, where, orderBy, limit, onSnapshot } = await f()
      const { db } = await f()
      const q = query(collection(db, 'gameReactions'), where('gameId', '==', gameId), orderBy('createdAt', 'desc'), limit(20))
      unsub = onSnapshot(q, snap => {
        if (cancelled) return
        setReactions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      })
    }
    subscribe()
    return () => { cancelled = true; unsub?.() }
  }, [gameId])

  async function react(emoji) {
    if (!gameId || !userId) return
    try {
      const { collection, addDoc } = await f()
      const { db } = await f()
      await addDoc(collection(db, 'gameReactions'), {
        gameId, userId, emoji, createdAt: Date.now(),
      })
    } catch {}
  }

  return { reactions, react }
}

export function ReactionBar({ gameId, userId }) {
  const { reactions, react } = useReactions(gameId, userId)
  const [showPicker, setShowPicker] = useState(false)

  const counts = {}
  reactions.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1 })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([emoji, count]) => (
        <button key={emoji} onClick={() => react(emoji)} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '4px 10px', fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text, #e8e0ff)',
          fontFamily: 'Fredoka, sans-serif',
        }}>
          {emoji} <span style={{ fontSize: 11, opacity: 0.6 }}>{count}</span>
        </button>
      ))}

      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowPicker(!showPicker)} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '4px 10px', fontSize: 13, cursor: 'pointer',
          color: 'var(--text-dim, #9b8ec4)', fontFamily: 'Fredoka, sans-serif',
        }}>+ 😊</button>

        {showPicker && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
            background: 'var(--card, #241845)', border: '1px solid var(--border, rgba(255,255,255,0.1))',
            borderRadius: 12, padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap',
            width: 200, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => { react(emoji); setShowPicker(false) }} style={{
                background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8,
                padding: '6px 8px', fontSize: 18, cursor: 'pointer', transition: 'transform 0.1s',
              }} onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              >{emoji}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
