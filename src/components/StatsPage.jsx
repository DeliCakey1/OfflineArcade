import { useMemo } from 'react'
import AnalyticsDashboard from './AnalyticsDashboard'

export default function StatsPage({ games, allStats, onClose, onClear, xp, totalPlayedCount, totalWonCount }) {
  const gameStats = useMemo(() => {
    return games
      .map(g => {
        const s = allStats[g.id]
        if (!s || s.played === 0) return null
        const winRate = s.played > 0 ? Math.round((s.won / s.played) * 100) : 0
        return { ...g, ...s, winRate }
      })
      .filter(Boolean)
      .sort((a, b) => b.played - a.played)
  }, [games, allStats])

  const topGames = gameStats.slice(0, 5)
  const totalStreaks = gameStats.reduce((sum, g) => sum + (g.bestStreak || 0), 0)
  const avgWinRate = totalPlayedCount > 0 ? Math.round((totalWonCount / totalPlayedCount) * 100) : 0
  const totalLosses = totalPlayedCount - totalWonCount
  const favoriteGame = gameStats.length > 0 ? gameStats[0] : null
  const bestStreak = gameStats.reduce((max, g) => Math.max(max, g.bestStreak || 0), 0)
  const highScores = allStats._highScores || {}

  return (
    <div className="full-page">
      <div className="full-page-header">
        <button className="quit-btn" onClick={onClose}>← Back</button>
        <h2 className="full-page-title">📊 Your Stats</h2>
      </div>
      <div className="full-page-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
          <StatCard emoji="🎮" label="Played" value={totalPlayedCount} />
          <StatCard emoji="🏆" label="Won" value={totalWonCount} />
          <StatCard emoji="📈" label="Win Rate" value={`${avgWinRate}%`} color={avgWinRate >= 50 ? 'var(--win-color)' : 'var(--lose-color)'} />
          <StatCard emoji="⭐" label="XP" value={xp.toLocaleString()} color="var(--neon-yellow)" />
          <StatCard emoji="🔥" label="Best Streak" value={bestStreak} color="var(--neon-orange)" />
          <StatCard emoji="🎯" label="Games" value={gameStats.length} color="var(--neon-cyan)" />
        </div>

        {favoriteGame && (
          <div style={{ background: 'rgba(255,230,0,0.08)', border: '1px solid rgba(255,230,0,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Most Played</div>
            <div style={{ fontSize: 24 }}>{favoriteGame.emoji}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: 'var(--neon-yellow)' }}>{favoriteGame.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{favoriteGame.played} games · {favoriteGame.winRate}% win rate</div>
          </div>
        )}

        {Object.keys(highScores).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>🏆 High Scores</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {Object.entries(highScores).map(([key, val]) => {
                const game = games.find(g => g.id === key)
                if (!game || !val) return null
                return (
                  <div key={key} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{game.emoji}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{game.label}</span>
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: 'var(--neon-yellow)', marginTop: 4 }}>{val}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <h3 style={{ fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>📋 Per-Game Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {gameStats.map(g => (
            <div key={g.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{g.emoji}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 'bold' }}>{g.label}</span>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: 'var(--neon-cyan)' }}>{g.won}/{g.played}</span>
                {g.bestStreak > 0 && <span style={{ fontSize: 12, color: 'var(--neon-orange)' }}>🔥 {g.bestStreak}</span>}
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: g.winRate >= 60 ? 'var(--win-color)' : g.winRate >= 40 ? 'var(--neon-yellow)' : 'var(--lose-color)',
                  width: `${g.winRate}%`, transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-dim)' }}>
                <span>{g.winRate}% win rate</span>
                <span>{g.played - g.won} losses</span>
              </div>
            </div>
          ))}
        </div>

        {gameStats.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎮</div>
            <div>No games played yet. Start playing to see your stats!</div>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <AnalyticsDashboard stats={allStats} />
        </div>

        <div className="stats-footer" style={{ marginTop: 24 }}>
          {totalPlayedCount > 0 && (
            <button className="stats-clear-btn" onClick={onClear}>🗑️ Clear All Stats</button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ emoji, label, value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: color || '#fff' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  )
}
