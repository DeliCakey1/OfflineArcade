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
  const [botChoice, setBotChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [scores, setScores] = useState({ player: 0, bot: 0, draws: 0 })
  const [animating, setAnimating] = useState(false)

  function play(choice) {
    if (animating) return
    setAnimating(true)
    setPlayerChoice(null)
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
        const res = getResult(choice.name, botPick.name)
        setResult(res)
        setScores(prev => ({
          ...prev,
          [res === 'win' ? 'player' : res === 'lose' ? 'bot' : 'draws']:
            prev[res === 'win' ? 'player' : res === 'lose' ? 'bot' : 'draws'] + 1,
        }))
        setAnimating(false)
      }
    }, 80)

    setPlayerChoice(choice)
  }

  function reset() {
    setPlayerChoice(null)
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
            className={`choice-btn ${c.class}`}
            onClick={() => play(c)}
            disabled={animating}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

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
                <button className="play-again-btn" onClick={() => { setPlayerChoice(null); setBotChoice(null); setResult(null) }}>
                  Play Again
                </button>
              </>
            )}
          </>
        )}
        {!playerChoice && !animating && (
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
