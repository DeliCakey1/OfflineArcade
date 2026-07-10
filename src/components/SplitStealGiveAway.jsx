import { useState } from 'react'

const CHOICES = [
  { name: 'Split', emoji: '✂️', desc: 'Share fairly', class: 'split' },
  { name: 'Steal', emoji: '🦹', desc: 'Take it all', class: 'steal' },
  { name: 'Give Away', emoji: '🎁', desc: 'Be generous', class: 'giveaway' },
]

const ROUND_OPTIONS = [5, 10, 15]
const PRIZE = 1000

function getPayoffs(player, bot) {
  const same = player === bot
  if (same) {
    if (player === 'Split') return { player: PRIZE / 2, bot: PRIZE / 2 }
    if (player === 'Steal') return { player: 0, bot: 0 }
    return { player: PRIZE, bot: PRIZE }
  }

  if (player === 'Split' && bot === 'Steal') return { player: 0, bot: PRIZE }
  if (player === 'Split' && bot === 'Give Away') return { player: PRIZE, bot: 0 }
  if (player === 'Steal' && bot === 'Split') return { player: PRIZE, bot: 0 }
  if (player === 'Steal' && bot === 'Give Away') return { player: PRIZE / 2, bot: PRIZE }
  if (player === 'Give Away' && bot === 'Split') return { player: 0, bot: PRIZE }
  if (player === 'Give Away' && bot === 'Steal') return { player: PRIZE, bot: PRIZE / 2 }
}

function getResultMessage(playerWin, botWin) {
  if (playerWin > botWin) return 'win'
  if (botWin > playerWin) return 'lose'
  return 'draw'
}

function getMessage(result, playerChoice, botChoice) {
  if (result === 'draw' && playerChoice === 'Give Away') return "Both generous! You both get the full prize!"
  if (result === 'draw' && playerChoice === 'Split') return "Fair split! You both get half."
  if (result === 'draw' && playerChoice === 'Steal') return "Both tried to steal! Nobody gets anything."
  if (result === 'win' && playerChoice === 'Give Away') return "Your generosity paid off!"
  if (result === 'win') return "You got the better deal!"
  if (result === 'lose' && botChoice === 'Give Away') return "The bot's generosity cost them!"
  if (result === 'lose') return "The bot outplayed you!"
  return "It's a draw!"
}

export default function SplitStealGiveAway() {
  const [totalRounds, setTotalRounds] = useState(null)
  const [playerChoice, setPlayerChoice] = useState(null)
  const [pendingChoice, setPendingChoice] = useState(null)
  const [botChoice, setBotChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [payoffs, setPayoffs] = useState(null)
  const [totals, setTotals] = useState({ player: 0, bot: 0 })
  const [round, setRound] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  if (!totalRounds) {
    return (
      <div className="game-card">
        <h2>Split Steal Give Away</h2>
        <p className="description">Your custom game! Outsmart the bot to win the prize money.</p>

        <div className="prize-display">
          <div className="prize-label">Prize Pool Per Round</div>
          <div className="prize-amount">${PRIZE.toLocaleString()}</div>
        </div>

        <div className="round-picker">
          <div className="round-picker-label">How many rounds?</div>
          <div className="round-picker-options">
            {ROUND_OPTIONS.map(n => (
              <button
                key={n}
                className="round-picker-btn"
                onClick={() => setTotalRounds(n)}
              >
                {n} Rounds
              </button>
            ))}
          </div>
        </div>

        <div className="rules-box">
          <h3>Payoff Rules</h3>
          <table>
            <thead>
              <tr>
                <th>You \ Bot</th>
                <th>✂️ Split</th>
                <th>🦹 Steal</th>
                <th>🎁 Give Away</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>✂️ Split</th>
                <td className="even-cell">Both $500</td>
                <td><span className="loser-cell">You $0</span><br/><span className="winner-cell">Bot $1K</span></td>
                <td><span className="winner-cell">You $1K</span><br/><span className="loser-cell">Bot $0</span></td>
              </tr>
              <tr>
                <th>🦹 Steal</th>
                <td><span className="winner-cell">You $1K</span><br/><span className="loser-cell">Bot $0</span></td>
                <td className="loser-cell">Both $0</td>
                <td><span className="even-cell">You $500</span><br/><span className="winner-cell">Bot $1K</span></td>
              </tr>
              <tr>
                <th>🎁 Give Away</th>
                <td><span className="loser-cell">You $0</span><br/><span className="winner-cell">Bot $1K</span></td>
                <td><span className="winner-cell">You $1K</span><br/><span className="even-cell">Bot $500</span></td>
                <td className="both-get">Both $1K</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function selectChoice(choice) {
    if (animating || result || gameOver) return
    setPendingChoice(choice)
  }

  function confirmChoice() {
    if (!pendingChoice || animating) return
    setAnimating(true)
    setPlayerChoice(pendingChoice)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setPayoffs(null)

    const botPick = CHOICES[Math.floor(Math.random() * 3)]

    let step = 0
    const interval = setInterval(() => {
      setBotChoice(CHOICES[step % 3])
      step++
      if (step > 6) {
        clearInterval(interval)
        setBotChoice(botPick)
        const p = getPayoffs(pendingChoice.name, botPick.name)
        const res = getResultMessage(p.player, p.bot)
        setPayoffs(p)
        setResult(res)
        setTotals(prev => ({
          player: prev.player + p.player,
          bot: prev.bot + p.bot,
        }))
        setRound(prev => {
          const next = prev + 1
          if (next >= totalRounds) setGameOver(true)
          return next
        })
        setAnimating(false)
      }
    }, 80)
  }

  function nextRound() {
    setPlayerChoice(null)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setPayoffs(null)
  }

  function reset() {
    setTotalRounds(null)
    setPlayerChoice(null)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setPayoffs(null)
    setTotals({ player: 0, bot: 0 })
    setRound(0)
    setGameOver(false)
  }

  const playerWon = totals.player > totals.bot
  const botWon = totals.bot > totals.player
  const tied = totals.player === totals.bot

  return (
    <div className="game-card">
      <h2>Split Steal Give Away</h2>
      <p className="description">Round {round} of {totalRounds}</p>

      <div className="prize-display">
        <div className="prize-label">Prize Pool</div>
        <div className="prize-amount">${PRIZE.toLocaleString()}</div>
      </div>

      <div className="scoreboard">
        <div className="score-item">
          <div className="score-label">You</div>
          <div className="score-value player">${totals.player.toLocaleString()}</div>
        </div>
        <div className="score-item">
          <div className="score-label">Round</div>
          <div className="score-value draws">{round}/{totalRounds}</div>
        </div>
        <div className="score-item">
          <div className="score-label">Bot</div>
          <div className="score-value bot">${totals.bot.toLocaleString()}</div>
        </div>
      </div>

      {gameOver ? (
        <div className="game-over">
          <div className={`result-text ${playerWon ? 'win' : botWon ? 'lose' : 'draw'}`}>
            {playerWon ? 'You Won the Game!' : botWon ? 'Bot Wins the Game!' : "It's a Tie!"}
          </div>
          <div className="winnings-display">
            <div className="winnings-item">
              <div className="winnings-label">Your Total</div>
              <div className="winnings-amount player">${totals.player.toLocaleString()}</div>
            </div>
            <div className="winnings-item">
              <div className="winnings-label">Bot Total</div>
              <div className="winnings-amount bot">${totals.bot.toLocaleString()}</div>
            </div>
          </div>
          <button className="play-again-btn" onClick={reset}>
            Play Again
          </button>
        </div>
      ) : (
        <>
          <div className="choices">
            {CHOICES.map(c => (
              <button
                key={c.name}
                className={`choice-btn ${c.class} ${pendingChoice?.name === c.name ? 'selected' : ''}`}
                onClick={() => selectChoice(c)}
                disabled={animating}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>

          {pendingChoice && !result && !animating && (
            <div className="confirm-area">
              <div className="confirm-text">
                You picked <strong>{pendingChoice.emoji} {pendingChoice.name}</strong>. Confirm?
              </div>
              <div className="confirm-buttons">
                <button className="confirm-btn yes" onClick={confirmChoice}>
                  Confirm
                </button>
                <button className="confirm-btn no" onClick={() => setPendingChoice(null)}>
                  Change
                </button>
              </div>
            </div>
          )}

          <div className="result-area">
            {playerChoice && botChoice && (
              <>
                <div className="versus-display">
                  <div className="player-choice-display">
                    <div className="label">You</div>
                    <div>{playerChoice.emoji}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>{playerChoice.name}</div>
                  </div>
                  <div className="vs-text">VS</div>
                  <div className="bot-choice-display">
                    <div className="label">Bot</div>
                    <div>{botChoice.emoji}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>{botChoice.name}</div>
                  </div>
                </div>
                {result && payoffs && (
                  <>
                    <div className={`result-text ${result}`}>
                      {getMessage(result, playerChoice.name, botChoice.name)}
                    </div>
                    <div className="winnings-display">
                      <div className="winnings-item">
                        <div className="winnings-label">You got</div>
                        <div className="winnings-amount player">
                          ${payoffs.player.toLocaleString()}
                        </div>
                      </div>
                      <div className="winnings-item">
                        <div className="winnings-label">Bot got</div>
                        <div className="winnings-amount bot">
                          ${payoffs.bot.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <button className="play-again-btn" onClick={nextRound}>
                      {round >= totalRounds ? 'See Results' : 'Next Round'}
                    </button>
                  </>
                )}
              </>
            )}
            {!playerChoice && !pendingChoice && !animating && (
              <div className="result-message">Choose your strategy!</div>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          onClick={reset}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: 13,
            textDecoration: 'underline',
          }}
        >
          Reset Game
        </button>
      </div>
    </div>
  )
}
