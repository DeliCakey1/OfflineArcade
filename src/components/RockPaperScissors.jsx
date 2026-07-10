import { useState } from 'react'

const CHOICES = [
  { name: 'Rock', emoji: '🪨', class: 'rock' },
  { name: 'Paper', emoji: '📄', class: 'paper' },
  { name: 'Scissors', emoji: '✂️', class: 'scissors' },
]

function getResult(player, bot) {
  if (player === bot) return 'draw'
  if (
    (player === 'Rock' && bot === 'Scissors') ||
    (player === 'Paper' && bot === 'Rock') ||
    (player === 'Scissors' && bot === 'Paper')
  ) return 'win'
  return 'lose'
}

function getMessage(result) {
  if (result === 'win') return 'You win!'
  if (result === 'lose') return 'Bot wins!'
  return "It's a draw!"
}

export default function RockPaperScissors() {
  const [playerChoice, setPlayerChoice] = useState(null)
  const [pendingChoice, setPendingChoice] = useState(null)
  const [botChoice, setBotChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [scores, setScores] = useState({ player: 0, bot: 0, draws: 0 })
  const [animating, setAnimating] = useState(false)

  function selectChoice(choice) {
    if (animating || result) return
    setPendingChoice(choice)
  }

  function confirmChoice() {
    if (!pendingChoice || animating) return
    setAnimating(true)
    setPlayerChoice(pendingChoice)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)

    const botPick = CHOICES[Math.floor(Math.random() * 3)]

    let step = 0
    const interval = setInterval(() => {
      setBotChoice(CHOICES[step % 3])
      step++
      if (step > 6) {
        clearInterval(interval)
        setBotChoice(botPick)
        const res = getResult(pendingChoice.name, botPick.name)
        setResult(res)
        setScores(prev => ({
          ...prev,
          [res === 'win' ? 'player' : res === 'lose' ? 'bot' : 'draws']:
            prev[res === 'win' ? 'player' : res === 'lose' ? 'bot' : 'draws'] + 1,
        }))
        setAnimating(false)
      }
    }, 80)
  }

  function nextRound() {
    setPlayerChoice(null)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
  }

  function reset() {
    setPlayerChoice(null)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setScores({ player: 0, bot: 0, draws: 0 })
  }

  return (
    <div className="game-card">
      <h2>Rock Paper Scissors</h2>
      <p className="description">Classic showdown against the bot!</p>

      <div className="scoreboard">
        <div className="score-item">
          <div className="score-label">You</div>
          <div className="score-value player">{scores.player}</div>
        </div>
        <div className="score-item">
          <div className="score-label">Draws</div>
          <div className="score-value draws">{scores.draws}</div>
        </div>
        <div className="score-item">
          <div className="score-label">Bot</div>
          <div className="score-value bot">{scores.bot}</div>
        </div>
      </div>

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
              </div>
              <div className="vs-text">VS</div>
              <div className="bot-choice-display">
                <div className="label">Bot</div>
                <div>{botChoice.emoji}</div>
              </div>
            </div>
            {result && (
              <>
                <div className={`result-text ${result}`}>
                  {getMessage(result)}
                </div>
                <button className="play-again-btn" onClick={nextRound}>
                  Play Again
                </button>
              </>
            )}
          </>
        )}
        {!playerChoice && !pendingChoice && !animating && (
          <div className="result-message">Pick your move!</div>
        )}
      </div>

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
          Reset Scores
        </button>
      </div>
    </div>
  )
}
