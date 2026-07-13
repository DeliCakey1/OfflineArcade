export default function StatsPage({ games, allStats, onClose, onClear, xp, totalPlayedCount, totalWonCount }) {
  return (
    <div className="full-page">
      <div className="full-page-header">
        <button className="quit-btn" onClick={onClose}>← Back</button>
        <h2 className="full-page-title">📊 Your Stats</h2>
      </div>
      <div className="full-page-content">
        <div className="stats-total">
          <span>{totalPlayedCount} games played</span>
          <span>{totalWonCount} won</span>
          <span>⭐ {xp.toLocaleString()} XP</span>
          {totalPlayedCount > 0 && <span>{Math.round((totalWonCount / totalPlayedCount) * 100)}% win rate</span>}
        </div>
        <div className="stats-list">
          {games.map(g => {
            const s = allStats[g.id]
            if (!s || s.played === 0) return null
            return (
              <div key={g.id} className="stats-row">
                <span className="stats-row-emoji">{g.emoji}</span>
                <span className="stats-row-name">{g.label}</span>
                <span className="stats-row-detail">{s.won}/{s.played}</span>
                {s.bestStreak > 0 && <span className="stats-row-streak">🔥 {s.bestStreak}</span>}
              </div>
            )
          })}
        </div>
        <div className="stats-footer">
          {totalPlayedCount > 0 && (
            <button className="stats-clear-btn" onClick={onClear}>🗑️ Clear All Stats</button>
          )}
        </div>
      </div>
    </div>
  )
}
