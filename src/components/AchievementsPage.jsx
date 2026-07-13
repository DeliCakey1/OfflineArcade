import { ACHIEVEMENTS } from '../useStats'

export default function AchievementsPage({ earnedIds, onClose }) {
  const earned = new Set(earnedIds)

  return (
    <div className="full-page">
      <div className="full-page-header">
        <button className="quit-btn" onClick={onClose}>← Back</button>
        <h2 className="full-page-title">🏅 Achievements</h2>
      </div>
      <div className="full-page-content">
        <div className="stats-total">
          <span>{earned.size} / {ACHIEVEMENTS.length} unlocked</span>
        </div>
        <div className="ach-grid">
          {ACHIEVEMENTS.map((a, i) => {
            const unlocked = earned.has(a.id)
            return (
              <div
                key={a.id}
                className={`ach-card ${unlocked ? 'unlocked' : 'locked'}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="ach-emoji">{unlocked ? a.emoji : '🔒'}</div>
                <div className="ach-info">
                  <div className="ach-name">{a.name}</div>
                  <div className="ach-desc">{a.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
