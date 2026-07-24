import { useState, useEffect } from 'react'

const DAILY_REWARDS = [
  { day: 1, coins: 50, label: 'Day 1' },
  { day: 2, coins: 75, label: 'Day 2' },
  { day: 3, coins: 100, label: 'Day 3' },
  { day: 4, coins: 150, label: 'Day 4' },
  { day: 5, coins: 200, label: 'Day 5' },
  { day: 6, coins: 300, label: 'Day 6' },
  { day: 7, coins: 500, label: 'Day 7' },
]

function getStreakKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLoginData() {
  try {
    return JSON.parse(localStorage.getItem('arcade-daily-login') || '{}')
  } catch { return {} }
}

function saveLoginData(data) {
  localStorage.setItem('arcade-daily-login', JSON.stringify(data))
}

export function checkAndClaimDailyLogin(onCoins) {
  const today = getStreakKey()
  const data = getLoginData()

  if (data.lastClaimed === today) return null

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  let streak = 1
  if (data.lastClaimed === yKey) {
    streak = (data.streak || 0) + 1
  }
  if (streak > 7) streak = 1

  const reward = DAILY_REWARDS[streak - 1] || DAILY_REWARDS[0]
  data.streak = streak
  data.lastClaimed = today
  saveLoginData(data)

  onCoins?.(reward.coins)
  return { streak, coins: reward.coins }
}

export default function DailyLoginModal({ onClaim, onClose }) {
  const [visible, setVisible] = useState(false)
  const data = getLoginData()
  const currentStreak = data.streak || 0

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function claim() {
    onClaim?.()
    setVisible(false)
    setTimeout(() => onClose?.(), 300)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(0,0,0,0.7)', opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s', pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card, #241845)', border: '2px solid var(--accent, #8b5cf6)',
        borderRadius: 20, padding: 28, maxWidth: 420, width: 'calc(100vw - 32px)',
        transform: visible ? 'scale(1)' : 'scale(0.9)', transition: 'transform 0.3s',
        fontFamily: 'Fredoka, sans-serif', color: 'var(--text, #e8e0ff)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>🎁</div>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Daily Login Reward!</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.7 }}>Day {currentStreak + 1} streak — keep it up!</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 20 }}>
          {DAILY_REWARDS.map((r, i) => {
            const claimed = i < currentStreak
            const isToday = i === currentStreak
            return (
              <div key={i} style={{
                background: isToday ? 'rgba(139,92,246,0.3)' : claimed ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                border: isToday ? '2px solid var(--accent, #8b5cf6)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 4px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Day {i + 1}</div>
                <div style={{ fontSize: 16 }}>🪙</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--accent, #8b5cf6)' : '#fff' }}>
                  {r.coins}
                </div>
                {claimed && <div style={{ fontSize: 14, marginTop: 2 }}>✅</div>}
              </div>
            )
          })}
        </div>

        <button onClick={claim} style={{
          width: '100%', padding: '12px 0', border: 'none', borderRadius: 12,
          background: 'linear-gradient(135deg, var(--accent, #8b5cf6), var(--accent2, #3b82f6))',
          color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'Fredoka, sans-serif',
        }}>Claim {DAILY_REWARDS[currentStreak % 7]?.coins || 50} Coins</button>
      </div>
    </div>
  )
}
