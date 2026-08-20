import { useState, useEffect } from 'react'
import { getChallengeHistory } from '../challengeService'
import { GAMES as GAME_LIST } from '../games'

export default function ChallengeHistory({ userId }) {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    getChallengeHistory(userId).then(setChallenges).finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="loading-text">Loading...</div>
  if (challenges.length === 0) return <p className="clan-empty">No challenges yet.</p>

  function getResult(c) {
    if (c.status === 'pending') return '⏳ Pending'
    if (c.status === 'declined') return '❌ Declined'
    if (c.status === 'expired') return '⏰ Expired'
    if (c.status === 'completed' && c.result) {
      if (c.result.winnerId === userId) return '✅ Won'
      return '❌ Lost'
    }
    return c.status
  }

  function getResultClass(c) {
    if (c.status === 'completed' && c.result?.winnerId === userId) return 'won'
    if (c.status === 'completed') return 'lost'
    return 'pending'
  }

  function getOpponent(c) {
    if (c.side === 'sent') return c.challenged?.username || 'Unknown'
    return c.challenger?.username || 'Unknown'
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="challenge-history">
      <h3>Challenge History</h3>
      <div className="challenge-history-list">
        {challenges.map(c => {
          const game = GAME_LIST.find(g => g.id === c.gameId)
          return (
            <div key={c.id} className={`challenge-history-row ${getResultClass(c)}`}>
              <span className="challenge-hist-result">{getResult(c)}</span>
              <span className="challenge-hist-game">{game?.icon || '🎮'} {game?.name || c.gameId}</span>
              <span className="challenge-hist-opponent">vs {getOpponent(c)}</span>
              {c.betAmount > 0 && <span className="challenge-hist-bet">🪙 {c.betAmount}</span>}
              <span className="challenge-hist-time">{formatTime(c.createdAt)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
