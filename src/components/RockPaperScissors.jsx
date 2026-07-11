import { useState, useEffect } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

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

const MODES = [
  { id: 'firstTo', label: 'First to...', desc: 'First to reach X wins', icon: '🏆' },
  { id: 'rounds', label: 'Rounds', desc: 'Play exactly X rounds', icon: '🔄' },
]

export default function RockPaperScissors({ onPlayingChange }) {
  const [gameMode, setGameMode] = useState(null)
  const [target, setTarget] = useState(null)
  const [playerChoice, setPlayerChoice] = useState(null)
  const [pendingChoice, setPendingChoice] = useState(null)
  const [botChoice, setBotChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [scores, setScores] = useState({ player: 0, bot: 0, draws: 0 })
  const [round, setRound] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [history, setHistory] = useState([])
  const [gameOver, setGameOver] = useState(null)
  const [shake, setShake] = useState(false)
  const [reveal, setReveal] = useState(false)
  const sound = useSound()
  const { recordGame } = useStats('rps')

  useEffect(() => {
    const playing = Boolean(gameMode && target)
    onPlayingChange?.(playing)
    return () => onPlayingChange?.(false)
  }, [gameMode, target, onPlayingChange])

  const progress = gameMode === 'firstTo'
    ? { player: scores.player / target, bot: scores.bot / target }
    : null

  function checkGameOver(newScores, newRound) {
    if (gameMode === 'firstTo') {
      if (newScores.player >= target) return 'player'
      if (newScores.bot >= target) return 'bot'
    } else if (gameMode === 'rounds') {
      if (newRound >= target) {
        if (newScores.player > newScores.bot) return 'player'
        if (newScores.bot > newScores.player) return 'bot'
        return 'tie'
      }
    }
    return null
  }

  function selectChoice(choice) {
    if (animating || gameOver) return
    sound('click')
    setPendingChoice(choice)
  }

  function confirmChoice() {
    if (!pendingChoice || animating) return
    sound('confirm')
    setAnimating(true)
    setPlayerChoice(pendingChoice)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setReveal(false)

    const botPick = CHOICES[Math.floor(Math.random() * 3)]

    setShake(true)
    let step = 0
    const interval = setInterval(() => {
      setBotChoice(CHOICES[step % 3])
      step++
      if (step > 8) {
        clearInterval(interval)
        setShake(false)
        setReveal(true)
        setBotChoice(botPick)
        const res = getResult(pendingChoice.name, botPick.name)

        setTimeout(() => {
          setResult(res)
          sound(res === 'win' ? 'win' : res === 'lose' ? 'lose' : 'draw')

          const newScores = {
            ...scores,
            [res === 'win' ? 'player' : res === 'lose' ? 'bot' : 'draws']:
              scores[res === 'win' ? 'player' : res === 'lose' ? 'bot' : 'draws'] + 1,
          }
          const newRound = round + 1
          setScores(newScores)
          setRound(newRound)
          setHistory(prev => [...prev.slice(-19), { player: pendingChoice, bot: botPick, result: res, round: newRound }])

          const winner = checkGameOver(newScores, newRound)
          if (winner) {
            setGameOver(winner)
            recordGame(winner === 'player', streakCount)
            setTimeout(() => sound(winner === 'player' ? 'victory' : 'defeat'), 300)
          }
          setAnimating(false)
        }, 300)
      }
    }, 70)
  }

  function nextRound() {
    setPlayerChoice(null)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setReveal(false)
  }

  const [copied, setCopied] = useState(false)

  function shareResult() {
    const modeLabel = gameMode === 'firstTo' ? `First to ${target}` : `${target} Rounds`
    const lines = [
      `✊ Beat the bot at Rock Paper Scissors (${modeLabel})!`,
      `📊 ${scores.player}-${scores.bot}-${scores.draws} (${round} rounds)`,
      ``,
      `Round history:`,
      ...history.map(h => `  #${h.round}: ${h.player.emoji} vs ${h.bot.emoji} → ${h.result}`),
      ``,
      `🎮 Offline Arcade`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function reset() {
    setGameMode(null)
    setTarget(null)
    setPlayerChoice(null)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setScores({ player: 0, bot: 0, draws: 0 })
    setRound(0)
    setHistory([])
    setGameOver(null)
    setShake(false)
    setReveal(false)
  }

  if (!gameMode) {
    return (
      <div className="game-card slide-in">
        <h2>Rock Paper Scissors</h2>
        <p className="description">Choose your game mode!</p>
        <div className="rps-mode-grid">
          {MODES.map(m => (
            <button key={m.id} className="rps-mode-card" onClick={() => { sound('click'); setGameMode(m.id) }}>
              <div className="rps-mode-icon">{m.icon}</div>
              <div className="rps-mode-label">{m.label}</div>
              <div className="rps-mode-desc">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!target) {
    const presets = gameMode === 'firstTo' ? [3, 5, 7, 10] : [5, 10, 15, 25]
    return (
      <div className="game-card slide-in">
        <h2>Rock Paper Scissors</h2>
        <p className="description">{gameMode === 'firstTo' ? 'First to how many wins?' : 'How many rounds?'}</p>
        <div className="round-picker">
          <div className="round-picker-options">
            {presets.map(n => (
              <button key={n} className="round-picker-btn" onClick={() => { sound('click'); setTarget(n) }}>{n}</button>
            ))}
          </div>
          <div className="custom-target-row">
            <span className="custom-target-label">or type a number (max 100):</span>
            <input type="number" min="1" max="100" className="custom-target-input" placeholder="1-100"
              onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseInt(e.target.value); if (v >= 1 && v <= 100) { sound('click'); setTarget(v) } } }} />
            <button className="custom-target-go"
              onClick={(e) => { const v = parseInt(e.target.closest('.custom-target-row').querySelector('input').value); if (v >= 1 && v <= 100) { sound('click'); setTarget(v) } }}>
              Go
            </button>
          </div>
        </div>
      </div>
    )
  }

  const streakType = history.length >= 2 ? history[history.length - 1].result : null
  const streakCount = history.length >= 2
    ? (() => { let c = 0; for (let i = history.length - 1; i >= 0; i--) { if (history[i].result === streakType) c++; else break } return c })()
    : 0

  return (
    <div className="game-card slide-in">
      <h2>Rock Paper Scissors</h2>
      <p className="description">
        {gameMode === 'firstTo' ? `First to ${target} wins — Round ${round}` : `Round ${round} of ${target}`}
      </p>

      <div className="rps-scoreboard">
        <div className="rps-score-side">
          <div className="rps-score-label">You</div>
          <div className="rps-score-num player">{scores.player}</div>
          {gameMode === 'firstTo' && (
            <div className="rps-progress-bar">
              <div className="rps-progress-fill player" style={{ width: `${Math.min(progress.player * 100, 100)}%` }} />
            </div>
          )}
        </div>
        <div className="rps-score-center">
          <div className="rps-draws-label">Draws</div>
          <div className="rps-draws-num">{scores.draws}</div>
          {streakCount >= 2 && (
            <div className={`rps-streak ${streakType}`}>
              {streakCount}x {streakType === 'win' ? 'Win Streak!' : streakType === 'lose' ? 'Lose Streak!' : 'Draws'}
            </div>
          )}
        </div>
        <div className="rps-score-side">
          <div className="rps-score-label">Bot</div>
          <div className="rps-score-num bot">{scores.bot}</div>
          {gameMode === 'firstTo' && (
            <div className="rps-progress-bar">
              <div className="rps-progress-fill bot" style={{ width: `${Math.min(progress.bot * 100, 100)}%` }} />
            </div>
          )}
        </div>
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{gameOver === 'player' ? '🏆' : gameOver === 'bot' ? '💀' : '🤝'}</div>
          <div className={`result-text ${gameOver === 'player' ? 'win' : gameOver === 'bot' ? 'lose' : 'draw'}`}>
            {gameOver === 'player' ? 'You Win!' : gameOver === 'bot' ? 'Bot Wins!' : "It's a Tie!"}
          </div>
          <div className="rps-final-score">
            <span className="player">{scores.player}</span>
            <span className="sep">-</span>
            <span className="bot">{scores.bot}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={reset}>Play Again</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rps-battle-area">
            <div className={`rps-fighter ${reveal && result === 'win' ? 'winner-glow' : ''} ${reveal && result === 'lose' ? 'loser-dim' : ''}`}>
              <div className="rps-fighter-label">You</div>
              {playerChoice ? (
                <div className={`rps-fighter-emoji ${reveal ? 'revealed' : ''}`}>{playerChoice.emoji}</div>
              ) : (
                <div className="rps-fighter-emoji placeholder">❓</div>
              )}
              {playerChoice && <div className="rps-fighter-name">{playerChoice.name}</div>}
            </div>

            <div className="rps-vs">
              {animating && shake ? (
                <div className="rps-vs-shake">⚔️</div>
              ) : reveal && result ? (
                <div className={`rps-vs-result ${result}`}>{result === 'win' ? '→' : result === 'lose' ? '←' : '='}</div>
              ) : (
                <div className="rps-vs-text">VS</div>
              )}
            </div>

            <div className={`rps-fighter ${reveal && result === 'lose' ? 'winner-glow' : ''} ${reveal && result === 'win' ? 'loser-dim' : ''}`}>
              <div className="rps-fighter-label">Bot</div>
              {botChoice ? (
                <div className={`rps-fighter-emoji ${shake ? 'shaking' : ''} ${reveal ? 'revealed' : ''}`}>{botChoice.emoji}</div>
              ) : (
                <div className="rps-fighter-emoji placeholder">❓</div>
              )}
              {botChoice && reveal && <div className="rps-fighter-name">{botChoice.name}</div>}
            </div>
          </div>

          {result && (
            <div className="result-area-inner">
              <div className={`result-text ${result}`} style={{ fontSize: 20 }}>
                {result === 'win' ? 'You Win!' : result === 'lose' ? 'Bot Wins!' : "Draw!"}
              </div>
              <button className="play-again-btn" onClick={nextRound}>Next Round</button>
            </div>
          )}

          {!result && !animating && (
            <>
              <div className="rps-choices-row">
                {CHOICES.map(c => (
                  <button key={c.name}
                    className={`choice-btn ${c.class} ${pendingChoice?.name === c.name ? 'selected' : ''}`}
                    onClick={() => selectChoice(c)} disabled={animating}>
                    <span className="choice-emoji">{c.emoji}</span>
                    <span className="choice-name">{c.name}</span>
                  </button>
                ))}
              </div>

              {pendingChoice && (
                <div className="confirm-area">
                  <div className="confirm-text">You picked <strong>{pendingChoice.emoji} {pendingChoice.name}</strong></div>
                  <div className="confirm-buttons">
                    <button className="confirm-btn yes" onClick={confirmChoice}>Let's Go!</button>
                    <button className="confirm-btn no" onClick={() => { sound('click'); setPendingChoice(null) }}>Change</button>
                  </div>
                </div>
              )}

              {!pendingChoice && (
                <div className="result-message">Choose your weapon!</div>
              )}
            </>
          )}

          {animating && (
            <div className="result-message">Deciding...</div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="rps-history">
          <div className="rps-history-label">Recent Rounds</div>
          <div className="rps-history-list">
            {history.slice(-8).map((h, i) => (
              <div key={i} className={`rps-history-item ${h.result}`}>
                <span className="history-round">#{h.round}</span>
                <span className="history-pick">{h.player.emoji}</span>
                <span className="history-vs">vs</span>
                <span className="history-pick">{h.bot.emoji}</span>
                <span className={`history-result ${h.result}`}>
                  {h.result === 'win' ? 'W' : h.result === 'lose' ? 'L' : 'D'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <QuitConfirmButton onQuit={reset} gameOver={gameOver} className="quit-btn" />
      </div>
    </div>
  )
}
