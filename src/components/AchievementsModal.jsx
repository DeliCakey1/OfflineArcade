import { useEffect, useRef } from 'react'
import { ACHIEVEMENTS } from '../useStats'

export default function AchievementsModal({ earnedIds, onClose }) {
  const closeRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    previousFocus.current = document.activeElement
    closeRef.current?.focus()
    function handleKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previousFocus.current?.focus() }
  }, [onClose])

  const earned = new Set(earnedIds)

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal" role="dialog" aria-modal="true" aria-labelledby="ach-title" onClick={e => e.stopPropagation()}>
        <h2 className="stats-title" id="ach-title">🏅 Achievements</h2>
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
        <div className="stats-footer">
          <button className="stats-close" ref={closeRef} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
