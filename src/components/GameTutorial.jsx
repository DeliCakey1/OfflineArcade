import { useState, useEffect } from 'react'
import TUTORIALS from '../tutorials'

export default function GameTutorial({ gameId, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const tutorial = TUTORIALS[gameId]

  useEffect(() => {
    const shown = localStorage.getItem(`arcade-tutorial-${gameId}`)
    if (shown) {
      onDismiss?.()
      return
    }
    requestAnimationFrame(() => setVisible(true))
  }, [gameId, onDismiss])

  if (!tutorial) return null

  function close() {
    setVisible(false)
    localStorage.setItem(`arcade-tutorial-${gameId}`, '1')
    setTimeout(() => onDismiss?.(), 300)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(0,0,0,0.7)', opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s', pointerEvents: visible ? 'auto' : 'none',
    }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card, #241845)', border: '2px solid var(--border, rgba(255,255,255,0.1))',
        borderRadius: 20, padding: 28, maxWidth: 420, width: 'calc(100vw - 32px)',
        transform: visible ? 'scale(1)' : 'scale(0.9)', transition: 'transform 0.3s',
        fontFamily: 'Fredoka, sans-serif', color: 'var(--text, #e8e0ff)',
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, textAlign: 'center' }}>
          🎮 {tutorial.title}
        </h2>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent, #8b5cf6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>How to Play</div>
          {tutorial.rules.map((rule, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 14, lineHeight: 1.5 }}>
              <span style={{ color: 'var(--accent, #8b5cf6)', fontWeight: 700 }}>•</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>

        {tutorial.tips && tutorial.tips.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent2, #22c55e)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>💡 Tips</div>
            {tutorial.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, lineHeight: 1.5, opacity: 0.85 }}>
                <span>•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={close} style={{
          width: '100%', padding: '12px 0', border: 'none', borderRadius: 12,
          background: 'linear-gradient(135deg, var(--accent, #8b5cf6), var(--accent2, #3b82f6))',
          color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'Fredoka, sans-serif',
        }}>Let&apos;s Play!</button>
      </div>
    </div>
  )
}
