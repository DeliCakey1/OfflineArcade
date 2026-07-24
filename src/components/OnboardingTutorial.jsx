import { useState, useEffect } from 'react'

const TUTORIAL_STEPS = [
  {
    emoji: '🎮',
    title: 'Welcome to Offline Arcade!',
    desc: '29 free browser games you can play anywhere — even offline!',
    highlight: null,
  },
  {
    emoji: '🕹️',
    title: 'Pick a Game',
    desc: 'Browse all games or filter by category. Tap any card to start playing.',
    highlight: '.game-select-grid',
  },
  {
    emoji: '📅',
    title: 'Daily Challenge',
    desc: 'A new game every day! Complete it for bonus XP and climb the daily leaderboard.',
    highlight: '.daily-challenge',
  },
  {
    emoji: '⚔️',
    title: 'Leagues & Tournaments',
    desc: 'Win games to earn XP, climb ranks, and compete in weekly tournaments against other players.',
    highlight: null,
  },
  {
    emoji: '⭐',
    title: 'Earn & Spend',
    desc: 'Win games to earn coins and XP. Spend coins in the Shop for nameplates, titles, and effects.',
    highlight: null,
  },
  {
    emoji: '🏅',
    title: 'Achievements',
    desc: 'Unlock 80+ achievements across all games. Each one earns you bonus coins!',
    highlight: null,
  },
  {
    emoji: '🚀',
    title: 'Ready to Play!',
    desc: 'Swipe from the left edge to go back. Have fun!',
    highlight: null,
  },
]

export default function OnboardingTutorial({ onClose }) {
  const [step, setStep] = useState(0)
  const current = TUTORIAL_STEPS[step]
  const isLast = step === TUTORIAL_STEPS.length - 1

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (isLast) onClose()
        else setStep(s => s + 1)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isLast, onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'linear-gradient(135deg, #2a1f4e, #1a1033)',
        border: '2px solid rgba(185, 70, 255, 0.3)',
        borderRadius: 16, padding: '32px 24px', maxWidth: 400, width: '100%',
        textAlign: 'center', position: 'relative',
        boxShadow: '0 0 40px rgba(185, 70, 255, 0.2)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{current.emoji}</div>
        <h2 style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 16,
          color: '#fff', marginBottom: 12, lineHeight: 1.4,
        }}>{current.title}</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {current.desc}
        </p>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? 'var(--neon-purple)' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >Skip</button>
          <button
            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            style={{
              flex: 2, padding: '10px 16px', borderRadius: 8,
              background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >{isLast ? "Let's Go!" : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
