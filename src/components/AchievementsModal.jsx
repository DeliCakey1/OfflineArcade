import { useEffect, useRef } from 'react'
import { ACHIEVEMENTS } from '../useStats'

const RARITY_COLORS = {
  common: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.4)', text: '#9ca3af', label: 'Common' },
  uncommon: { bg: 'rgba(57,255,20,0.1)', border: 'rgba(57,255,20,0.35)', text: '#39ff14', label: 'Uncommon' },
  rare: { bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.35)', text: '#00d4ff', label: 'Rare' },
  epic: { bg: 'rgba(185,70,255,0.1)', border: 'rgba(185,70,255,0.35)', text: '#b946ff', label: 'Epic' },
  legendary: { bg: 'rgba(255,215,0,0.1)', border: 'rgba(255,215,0,0.35)', text: '#ffd700', label: 'Legendary' },
}

export default function AchievementsModal({ earnedIds, stats, onClose }) {
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
            const rarity = RARITY_COLORS[a.rarity] || RARITY_COLORS.common
            const prog = stats && a.progress ? a.progress(stats) : null
            const pct = prog ? Math.min(100, Math.round((prog.current / prog.max) * 100)) : 0
            return (
              <div
                key={a.id}
                className={`ach-card ${unlocked ? 'unlocked' : 'locked'}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="ach-emoji">{unlocked ? a.emoji : '🔒'}</div>
                <div className="ach-info">
                  <div className="ach-name">
                    {a.name}
                    <span className="ach-rarity-badge" style={{ background: rarity.bg, color: rarity.text, borderColor: rarity.border }}>
                      {rarity.label}
                    </span>
                  </div>
                  <div className="ach-desc">{a.desc}</div>
                  {!unlocked && prog && prog.max > 1 && (
                    <div className="ach-progress-bar">
                      <div className="ach-progress-fill" style={{ width: `${pct}%`, background: rarity.text }} />
                      <span className="ach-progress-text">{prog.current.toLocaleString()} / {prog.max.toLocaleString()}</span>
                    </div>
                  )}
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
