import { useState, useEffect } from 'react'
import { getDailyLeaderboard } from '../socialService'
import { getNameplateStyle, getNameplateBorderStyle, getNameplateEffectClass, getNameplateNeonColor } from '../nameplateUtils'

export default function DailyLeaderboard({ gameId, onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const scores = await getDailyLeaderboard(gameId, 20)
        if (!cancelled) setEntries(scores)
      } catch { if (!cancelled) setEntries([]) }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [gameId])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="game-card slide-in" style={{ maxWidth: 400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: 'var(--neon-yellow)' }}>📋 Daily Leaderboard</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)' }}>Loading...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <div>No scores yet today. Be the first!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map((entry, i) => (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 8, background: i < 3 ? 'rgba(255,230,0,0.08)' : 'rgba(255,255,255,0.03)',
              border: i < 3 ? '1px solid rgba(255,230,0,0.2)' : '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 18 : 14, color: i < 3 ? '#ffe600' : 'var(--text-dim)' }}>
                {i < 3 ? medals[i] : `${i + 1}`}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  className={getNameplateEffectClass(entry.nameplateEffect)}
                  style={{ ...getNameplateStyle(entry.nameplate), ...getNameplateBorderStyle(entry.nameplateEffect), '--np-neon-color': getNameplateNeonColor(entry.nameplateEffect) || undefined, fontSize: 13, fontWeight: i < 3 ? 'bold' : 'normal' }}
                >
                  {entry.username || 'Anonymous'}
                </div>
              </div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: i === 0 ? '#ffe600' : i < 3 ? '#c0c0c0' : 'var(--neon-cyan)' }}>
                {entry.score}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
