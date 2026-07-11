import { useState, useEffect } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const MODES = [
  { name: 'Chillax', target: 3, emoji: '😎', color: '#00e5ff' },
  { name: 'Chill', target: 5, emoji: '🟢', color: '#39ff14' },
  { name: 'Normal', target: 10, emoji: '🟡', color: '#ffe600' },
  { name: 'Risky', target: 15, emoji: '🟠', color: '#ff6b2b' },
  { name: 'Insane', target: 20, emoji: '💀', color: '#ff2d7b' },
]

export default function CoinFlipStreak({ onPlayingChange }) {
  const [target, setTarget] = useState(null)
  const [streak, setStreak] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [flipCount, setFlipCount] = useState(0)
  const [call, setCall] = useState(null) // 'heads' | 'tails'
  const [pendingCall, setPendingCall] = useState(null)
  const [coinResult, setCoinResult] = useState(null) // 'heads' | 'tails'
  const [result, setResult] = useState(null) // 'correct' | 'wrong' | null
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [flipAnimation, setFlipAnimation] = useState(false)
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState(false)
  const sound = useSound()
  const { recordGame } = useStats('coin')

  useEffect(() => {
    const playing = Boolean(target)
    onPlayingChange?.(playing)
    return () => onPlayingChange?.(false)
  }, [target, onPlayingChange])

  function flip() {
    if (animating || gameOver || !pendingCall) return
    sound('confirm')
    setAnimating(true)
    setCall(pendingCall)
    setPendingCall(null)
    setFlipAnimation(true)
    setCoinResult(null)
    setResult(null)

    const outcome = Math.random() < 0.5 ? 'heads' : 'tails'

    setTimeout(() => {
      setCoinResult(outcome)
      setFlipAnimation(false)

      const correct = pendingCall === outcome

      setTimeout(() => {
        setResult(correct ? 'correct' : 'wrong')

      const newFlipCount = flipCount + 1
      setFlipCount(newFlipCount)
      let isGameOver = false

      if (correct) {
          const newStreak = streak + 1
          setStreak(newStreak)
          setHighScore(Math.max(highScore, newStreak))
          sound('win')

          if (newStreak >= target) {
            setWon(true)
            setGameOver(true)
            isGameOver = true
            recordGame(true, newStreak)
            setTimeout(() => sound('victory'), 300)
          }
        } else {
          sound('lose')
          setGameOver(true)
          isGameOver = true
          recordGame(false, highScore)
          setTimeout(() => sound('defeat'), 300)
        }

        setHistory(prev => [...prev.slice(-19), {
          call: pendingCall, result: outcome, correct, flip: newFlipCount,
        }])

        if (!isGameOver) {
          setTimeout(() => setResult(null), 600)
        }

        setAnimating(false)
      }, 400)
    }, 800)
  }

  function reset() {
    setTarget(null)
    setStreak(0)
    setHighScore(0)
    setFlipCount(0)
    setCall(null)
    setPendingCall(null)
    setCoinResult(null)
    setResult(null)
    setGameOver(false)
    setWon(false)
    setAnimating(false)
    setFlipAnimation(false)
    setHistory([])
    setCopied(false)
  }

  function shareResult() {
    const modeName = MODES.find(m => m.target === target)?.name || 'Custom'
    const lines = [
      `🪙 Beat the bot at Coin Flip (${modeName})!`,
      `🔥 Best streak: ${highScore}/${target} | 📊 ${flipCount} flips`,
      ``,
      `Flip history:`,
      ...history.map(h => `  #${h.flip}: Called ${h.call} → ${h.result} ${h.correct ? '✓' : '✗'}`),
      ``,
      `🎮 Offline Arcade`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!target) {
    return (
      <div className="game-card slide-in">
        <h2>Coin Flip Streak</h2>
        <p className="description">Call Heads or Tails. Build a streak to beat the target!</p>
        <div className="gtn-mode-grid">
          {MODES.map(m => (
            <button key={m.name} className="gtn-mode-card" style={{ '--mode-color': m.color }}
              onClick={() => { sound('click'); setTarget(m.target) }}>
              <div className="gtn-mode-emoji">{m.emoji}</div>
              <div className="gtn-mode-name">{m.name}</div>
              <div className="gtn-mode-attempts">{m.target} streak to win</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Coin Flip Streak</h2>
      <p className="description">Build a {target} streak to win!</p>

      <div className="coin-scoreboard">
        <div className="coin-score-item">
          <div className="coin-score-label">Streak</div>
          <div className={`coin-score-num ${streak >= 3 ? 'fire' : ''}`}>🔥 {streak}</div>
        </div>
        <div className="coin-score-item">
          <div className="coin-score-label">Target</div>
          <div className="coin-score-num target">{target}</div>
        </div>
        <div className="coin-score-item">
          <div className="coin-score-label">Best</div>
          <div className="coin-score-num">{highScore}</div>
        </div>
      </div>

      <div className="coin-progress">
        <div className="coin-progress-track">
          <div className="coin-progress-fill" style={{ width: `${(streak / target) * 100}%` }} />
          <div className="coin-progress-marker" style={{ left: '100%' }}>
            <span className="coin-progress-marker-label">🎯</span>
          </div>
        </div>
      </div>

      <div className="coin-area">
        <div className={`coin ${flipAnimation ? 'flipping' : ''} ${coinResult || ''}`}>
          {coinResult ? (
            <div className={`coin-face ${coinResult}`}>
              {coinResult === 'heads' ? '👑' : '🦅'}
            </div>
          ) : (
            <div className="coin-face neutral">🪙</div>
          )}
        </div>
        {result && (
          <div className={`coin-result ${result}`}>
            {result === 'correct' ? `✓ ${call === 'heads' ? 'Heads' : 'Tails'}!` : `✗ It was ${coinResult === 'heads' ? 'Heads' : 'Tails'}!`}
          </div>
        )}
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{won ? '🏆' : '💀'}</div>
          <div className={`result-text ${won ? 'win' : 'lose'}`}>
            {won ? `You Did It! ${target} Streak!` : 'Streak Broken!'}
          </div>
          <div className="result-message">Best streak: 🔥 {highScore} | {flipCount} flips</div>
          <div className="gtn-all-guesses">
            {history.map((h, i) => (
              <span key={i} className={`gtn-final-guess ${h.correct ? 'higher' : 'lower'}`}>
                {h.result === 'heads' ? '👑' : '🦅'}
              </span>
            ))}
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
          {!result && !animating && (
            <>
              <div className="coin-buttons">
                <button className={`coin-btn heads ${pendingCall === 'heads' ? 'selected' : ''}`}
                  onClick={() => { sound('click'); setPendingCall('heads') }}>
                  👑 Heads
                </button>
                <button className={`coin-btn tails ${pendingCall === 'tails' ? 'selected' : ''}`}
                  onClick={() => { sound('click'); setPendingCall('tails') }}>
                  🦅 Tails
                </button>
              </div>

              {pendingCall && (
                <div className="confirm-area">
                  <div className="confirm-text">You call <strong>{pendingCall === 'heads' ? '👑 Heads' : '🦅 Tails'}</strong></div>
                  <div className="confirm-buttons">
                    <button className="confirm-btn yes" onClick={flip}>Flip!</button>
                    <button className="confirm-btn no" onClick={() => { sound('click'); setPendingCall(null) }}>Change</button>
                  </div>
                </div>
              )}

              {!pendingCall && (
                <div className="result-message">Make your call!</div>
              )}
            </>
          )}

          {animating && (
            <div className="result-message">Flipping...</div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="rps-history">
          <div className="rps-history-label">Flip History</div>
          <div className="rps-history-list">
            {history.slice(-10).map((h, i) => (
              <div key={i} className={`rps-history-item ${h.correct ? 'win' : 'lose'}`}>
                <span className="history-round">#{h.flip}</span>
                <span className="history-pick">{h.call === 'heads' ? '👑' : '🦅'}</span>
                <span className="history-vs">→</span>
                <span className="history-pick">{h.result === 'heads' ? '👑' : '🦅'}</span>
                <span className={`history-result ${h.correct ? 'win' : 'lose'}`}>
                  {h.correct ? '✓' : '✗'}
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
