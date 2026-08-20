import { useState, useEffect } from 'react'
import { acceptChallenge, declineChallenge } from '../challengeService'
import { GAMES as GAME_LIST } from '../games'
import useSound from '../useSound'

export default function ChallengeNotification({ challenges, onAccepted, onDeclined }) {
  const [countdowns, setCountdowns] = useState({})
  const sound = useSound()

  useEffect(() => {
    if (!challenges || challenges.length === 0) return
    const timers = challenges.map(c => {
      const remaining = Math.max(0, Math.floor((c.expiresAt - Date.now()) / 1000))
      return { id: c.id, remaining }
    })
    setCountdowns(prev => {
      const next = { ...prev }
      timers.forEach(t => { next[t.id] = t.remaining })
      return next
    })
  }, [challenges])

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const next = { ...prev }
        let changed = false
        for (const id in next) {
          if (next[id] > 0) { next[id]--; changed = true }
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleAccept(challengeId) {
    sound('confirm')
    const result = await acceptChallenge(challengeId)
    if (result.success) onAccepted?.(result)
  }

  async function handleDecline(challengeId) {
    sound('click')
    await declineChallenge(challengeId)
    onDeclined?.(challengeId)
  }

  if (!challenges || challenges.length === 0) return null

  return (
    <div className="challenge-notifications">
      {challenges.map(c => {
        const game = GAME_LIST.find(g => g.id === c.gameId)
        const remaining = countdowns[c.id] ?? 30

        return (
          <div key={c.id} className="challenge-notification">
            <div className="challenge-notif-header">
              <span className="challenge-notif-icon">⚔️</span>
              <div className="challenge-notif-info">
                <span className="challenge-notif-from">{c.challenger?.username || 'Someone'}</span>
                <span className="challenge-notif-action">challenged you!</span>
              </div>
            </div>
            <div className="challenge-notif-details">
              <span className="challenge-notif-game">{game?.icon || '🎮'} {game?.name || c.gameId}</span>
              {c.betAmount > 0 && <span className="challenge-notif-bet">🪙 {c.betAmount * 2} pot</span>}
            </div>
            <div className="challenge-notif-actions">
              <button className="clan-btn primary small" onClick={() => handleAccept(c.id)}>
                Accept
              </button>
              <button className="clan-btn secondary small" onClick={() => handleDecline(c.id)}>
                Decline
              </button>
              <span className="challenge-notif-timer">{remaining}s</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
