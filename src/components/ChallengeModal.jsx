import { useState } from 'react'
import { sendChallenge, CHALLENGE_GAMES } from '../challengeService'
import { GAMES as GAME_LIST } from '../games'
import useSound from '../useSound'

const BET_OPTIONS = [0, 100, 250, 500, 1000]

export default function ChallengeModal({ userId, username, targetUser, onClose }) {
  const [selectedGame, setSelectedGame] = useState(null)
  const [betAmount, setBetAmount] = useState(0)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const sound = useSound()

  const pvpGames = GAME_LIST.filter(g => CHALLENGE_GAMES.includes(g.id))

  async function handleSend() {
    if (!selectedGame || !targetUser) return
    sound('confirm')
    setSending(true)
    setError('')
    try {
      const result = await sendChallenge(userId, username, targetUser.id || targetUser.userId, targetUser.username, selectedGame, betAmount)
      if (result.error) { setError(result.error); setSending(false); return }
      setSent(true)
      setTimeout(() => onClose?.(), 2000)
    } catch { setError('Failed to send challenge') }
    setSending(false)
  }

  if (sent) {
    return (
      <div className="challenge-modal-overlay" onClick={onClose}>
        <div className="challenge-modal" onClick={e => e.stopPropagation()}>
          <div className="challenge-sent-icon">⚔️</div>
          <h2>Challenge Sent!</h2>
          <p>Waiting for {targetUser?.username || 'player'} to respond...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="challenge-modal-overlay" onClick={onClose}>
      <div className="challenge-modal" onClick={e => e.stopPropagation()}>
        <div className="challenge-modal-header">
          <h2>⚔️ Challenge {targetUser?.username || 'Player'}</h2>
          <button className="challenge-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="challenge-error">{error}</div>}

        <div className="challenge-section">
          <label>Choose Game</label>
          <div className="challenge-game-grid">
            {pvpGames.map(game => (
              <button key={game.id}
                className={`challenge-game-card ${selectedGame === game.id ? 'selected' : ''}`}
                onClick={() => setSelectedGame(game.id)}
              >
                <span className="challenge-game-icon">{game.icon}</span>
                <span className="challenge-game-name">{game.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="challenge-section">
          <label>Coin Bet</label>
          <div className="challenge-bet-row">
            {BET_OPTIONS.map(amount => (
              <button key={amount}
                className={`challenge-bet-btn ${betAmount === amount ? 'selected' : ''}`}
                onClick={() => setBetAmount(amount)}
              >
                {amount === 0 ? 'None' : `${amount} 🪙`}
              </button>
            ))}
          </div>
          {betAmount > 0 && (
            <p className="challenge-bet-note">Winner takes {betAmount * 2} coins (2x pot)</p>
          )}
        </div>

        <button
          className="clan-btn primary full-width"
          onClick={handleSend}
          disabled={!selectedGame || sending}
        >
          {sending ? 'Sending...' : 'Send Challenge'}
        </button>
      </div>
    </div>
  )
}
