import { ACHIEVEMENTS } from '../useStats'

const CATEGORIES = [
  { id: 'general', label: 'General', emoji: '🎮' },
  { id: 'streaks', label: 'Streaks', emoji: '🔥' },
  { id: 'xp', label: 'XP', emoji: '⭐' },
  { id: 'league', label: 'League & Tournament', emoji: '⚔️' },
  { id: 'games', label: 'Per-Game', emoji: '🕹️' },
]

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
        {CATEGORIES.map(cat => {
          const items = ACHIEVEMENTS.filter(a => a.category === cat.id)
          if (items.length === 0) return null
          const unlockedInCat = items.filter(a => earned.has(a.id)).length
          return (
            <div key={cat.id} className="ach-category">
              <h3 className="ach-category-title">
                <span className="ach-category-emoji">{cat.emoji}</span>
                {cat.label}
                <span className="ach-category-count">{unlockedInCat}/{items.length}</span>
              </h3>
              <div className="ach-grid">
                {items.map((a, i) => {
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
          )
        })}
      </div>
    </div>
  )
}
