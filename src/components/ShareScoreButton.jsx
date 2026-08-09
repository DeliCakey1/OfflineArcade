import { useState, useCallback } from 'react'

function buildScorecard(game, result) {
  const origin = window.location.origin
  const lines = []
  lines.push('🕹️ Offline Arcade')
  lines.push(`${game.emoji} ${game.label} — ${result.won ? 'WIN! 🏆' : 'Played'}`)
  if (result.won && result.score > 0) lines.push(`Score: ${result.score}`)
  lines.push('Daily challenges, leagues & 29 games.')
  lines.push(`Play free: ${origin}/play/${game.id}`)
  return lines.join('\n')
}

export default function ShareScoreButton({ game, result }) {
  const [copied, setCopied] = useState(false)

  const share = useCallback(async () => {
    const text = buildScorecard(game, result)
    try {
      if (navigator.share) {
        await navigator.share({ title: `Play ${game.label}`, text })
        return
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [game, result])

  if (!result) return null

  return (
    <button
      className="share-score-btn"
      onClick={share}
      title="Share your result"
      aria-label={`Share your ${game.label} result`}
    >
      {copied ? 'Copied! ✅' : `Share Score ${game.emoji}`}
    </button>
  )
}
