import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import useEffects from '../useEffects'
import QuitConfirmButton from './QuitConfirmButton'

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', color: '#39ff14', ops: ['+', '-'], maxNum: 20, time: 30, desc: '30s — Addition & Subtraction' },
  { name: 'Normal', emoji: '🟡', color: '#ffe600', ops: ['+', '-', '×'], maxNum: 50, time: 45, desc: '45s — Add, Subtract & Multiply' },
  { name: 'Hard', emoji: '🟠', color: '#ff6b2b', ops: ['+', '-', '×', '÷'], maxNum: 100, time: 45, desc: '45s — All four operations' },
  { name: 'Insane', emoji: '💀', color: '#ff2d7b', ops: ['+', '-', '×', '÷'], maxNum: 200, time: 60, desc: '60s — Parentheses & chaos' },
]

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateQuestion(diff) {
  const op = diff.ops[randInt(0, diff.ops.length - 1)]
  const max = diff.maxNum
  let a, b, answer, text

  if (op === '+') {
    a = randInt(1, max)
    b = randInt(1, max)
    answer = a + b
    text = `${a} + ${b} = ?`
  } else if (op === '-') {
    a = randInt(2, max)
    b = randInt(1, a - 1 || 1)
    answer = a - b
    text = `${a} − ${b} = ?`
  } else if (op === '×') {
    a = randInt(2, 12)
    b = randInt(2, 12)
    answer = a * b
    text = `${a} × ${b} = ?`
  } else if (op === '÷') {
    b = randInt(2, 12)
    const quotient = randInt(1, 12)
    a = b * quotient
    answer = quotient
    text = `${a} ÷ ${b} = ?`
  }

  if (diff.name === 'Insane' && Math.random() < 0.35 && op !== '÷') {
    let c, d, innerOp
    if (op === '+') {
      a = randInt(1, Math.floor(max / 2))
      c = randInt(1, Math.floor(max / 2))
      innerOp = Math.random() < 0.5 ? '+' : '−'
      if (innerOp === '+') {
        d = randInt(1, Math.floor(max / 2))
        b = c + d
        answer = a + b
        text = `${a} + (${c} + ${d}) = ?`
      } else {
        d = randInt(1, c - 1 || 1)
        b = c - d
        answer = a + b
        text = `${a} + (${c} − ${d}) = ?`
      }
    } else {
      a = randInt(Math.floor(max / 2), max)
      c = randInt(2, 12)
      d = randInt(2, 12)
      innerOp = Math.random() < 0.5 ? '×' : '÷'
      if (innerOp === '×') {
        b = c * d
        answer = a - b
        text = `${a} − (${c} × ${d}) = ?`
      } else {
        const q = randInt(2, 8)
        b = c * q
        answer = a - b
        text = `${a} − (${c * q} ÷ ${c}) = ?`
      }
    }
  }

  const options = [answer]
  const spread = Math.max(3, Math.floor(Math.abs(answer) * 0.4))
  let attempts = 0
  while (options.length < 4 && attempts < 50) {
    let wrong
    if (answer === 0) {
      wrong = randInt(1, Math.max(10, spread * 2)) * (Math.random() < 0.5 ? 1 : -1)
    } else {
      const offset = randInt(1, spread) * (Math.random() < 0.5 ? 1 : -1)
      wrong = answer + offset
    }
    if (wrong !== answer && !options.includes(wrong)) {
      options.push(wrong)
    }
    attempts++
  }
  while (options.length < 4) {
    const filler = answer + options.length * 3
    if (!options.includes(filler)) options.push(filler)
    else options.push(answer - options.length * 3)
  }

  return { text, answer, options: shuffle(options) }
}

export default function MathDash({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [maxTime, setMaxTime] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [question, setQuestion] = useState(null)
  const [answered, setAnswered] = useState(null)
  const [streak, setStreak] = useState(0)
  const [comboMultiplier, setComboMultiplier] = useState(1)
  const [questionKey, setQuestionKey] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const gameTimerRef = useRef(null)
  const gameOverRef = useRef(false)
  const diffRef = useRef(null)
  const sound = useSound()
  const { spawnParticles, floatText, shakeScreen, renderParticles, shakeStyle } = useEffects()
  const { recordGame } = useStats('mathdash')
  const isPlaying = difficulty && !gameOver

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    gameOverRef.current = gameOver
  }, [gameOver])

  useEffect(() => {
    return () => { if (gameTimerRef.current) clearInterval(gameTimerRef.current) }
  }, [])

  useEffect(() => {
    if (timeLeft <= 0 && difficulty && !gameOver) {
      clearTimer()
      setGameOver(true)
      gameOverRef.current = true
      recordGame(score, 0)
      sound('victory')
      shakeScreen(6, 400)
    }
  }, [timeLeft, difficulty, gameOver, score, recordGame, sound, shakeScreen])

  function clearTimer() {
    if (gameTimerRef.current) { clearInterval(gameTimerRef.current); gameTimerRef.current = null }
  }

  function startGame(d) {
    clearTimer()
    diffRef.current = d
    setDifficulty(d)
    setScore(0)
    setTimeLeft(d.time)
    setMaxTime(d.time)
    setGameOver(false)
    setCopied(false)
    setStreak(0)
    setComboMultiplier(1)
    setCorrectCount(0)
    setWrongCount(0)
    setAnswered(null)
    setQuestion(generateQuestion(d))
    setQuestionKey(0)

    gameTimerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearTimer()
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  function handleAnswer(opt) {
    if (answered !== null || gameOverRef.current || !question) return

    setAnswered(opt)
    const isCorrect = opt === question.answer

    if (isCorrect) {
      const newStreak = streak + 1
      setStreak(newStreak)
      setCorrectCount(c => c + 1)

      let newMultiplier = 1
      if (newStreak >= 5) newMultiplier = 3
      else if (newStreak >= 3) newMultiplier = 2

      if (newMultiplier > comboMultiplier) {
        sound('levelup')
      } else {
        sound('score')
      }

      setComboMultiplier(newMultiplier)
      setScore(s => s + 10 * newMultiplier)
      setTimeLeft(t => Math.min(t + 3, maxTime + 10))

      const el = document.getElementById('mathdash-question')
      if (el) {
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        spawnParticles(cx, cy, '#39ff14', 10, { speed: 3, life: 25, sizeMin: 3, sizeMax: 7 })
        floatText(cx, cy - 20, newMultiplier > 1 ? `+${10 * newMultiplier} (${newMultiplier}x)` : '+10', newMultiplier >= 3 ? '#ff2d7b' : newMultiplier >= 2 ? '#ffe600' : '#39ff14')
      }
    } else {
      setStreak(0)
      setComboMultiplier(1)
      setWrongCount(c => c + 1)
      setTimeLeft(t => Math.max(0, t - 2))
      sound('hit')
      shakeScreen(4, 200)

      const el = document.getElementById('mathdash-question')
      if (el) {
        const rect = el.getBoundingClientRect()
        floatText(rect.left + rect.width / 2, rect.top, '−2s', '#ff2d7b')
      }
    }

    setTimeout(() => {
      if (gameOverRef.current) return
      const nextQ = generateQuestion(diffRef.current)
      setQuestion(nextQ)
      setAnswered(null)
      setQuestionKey(k => k + 1)
    }, 500)
  }

  function shareResult() {
    const total = correctCount + wrongCount
    const acc = total > 0 ? Math.round((correctCount / total) * 100) : 0
    const lines = [
      `🧮 Math Dash (${difficulty.name})!`,
      `📊 Score: ${score} | ${correctCount} correct | ${acc}% accuracy`,
      `🔥 Best streak: ${streak}`,
      ``,
      `🎮 Offline Arcade`,
    ].filter(Boolean)
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>Math Dash</h2>
        <p className="description">Solve math problems as fast as you can! Build combos for bonus points.</p>
        <div className="gtn-mode-grid">
          {DIFFICULTIES.map(d => (
            <button key={d.name} className="gtn-mode-card" style={{ '--mode-color': d.color }}
              onClick={() => { sound('click'); startGame(d) }}>
              <div className="gtn-mode-emoji">{d.emoji}</div>
              <div className="gtn-mode-name">{d.name}</div>
              <div className="gtn-mode-attempts">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const timerPct = maxTime > 0 ? (timeLeft / maxTime) * 100 : 0
  const timerColor = timeLeft > 10 ? 'linear-gradient(90deg, var(--neon-green), var(--neon-cyan))' :
    timeLeft > 5 ? 'linear-gradient(90deg, var(--neon-yellow), var(--neon-orange))' :
    'linear-gradient(90deg, var(--neon-red), #ff2d7b)'

  return (
    <div className="game-card slide-in" style={{ position: 'relative', overflow: 'hidden', ...shakeStyle }}>
      {renderParticles()}
      <h2>Math Dash</h2>
      <p className="description">Solve the problem! +3s correct, −2s wrong</p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Time</div>
          <div className="hol-stat-num" style={timeLeft <= 10 ? { color: 'var(--neon-red)' } : {}}>{timeLeft}s</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Score</div>
          <div className="hol-stat-num player">{score}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Streak</div>
          <div className="hol-stat-num" style={streak >= 5 ? { color: 'var(--neon-purple)' } : streak >= 3 ? { color: 'var(--neon-yellow)' } : {}}>{streak}</div>
        </div>
      </div>

      <div style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, transition: 'width 1s linear',
          width: `${timerPct}%`,
          background: timerColor,
        }} />
      </div>

      {comboMultiplier > 1 && !gameOver && (
        <div style={{
          textAlign: 'center', marginBottom: 12,
          fontFamily: "'Press Start 2P', monospace", fontSize: 13,
          color: comboMultiplier >= 3 ? 'var(--neon-purple)' : 'var(--neon-yellow)',
          animation: 'streakPulse 0.6s ease infinite alternate',
        }}>
          🔥 {comboMultiplier}x Combo!
        </div>
      )}

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">🧮</div>
          <div className="result-text" style={{ color: score > 100 ? 'var(--neon-green)' : score > 50 ? 'var(--neon-yellow)' : 'var(--neon-red)' }}>
            {score > 200 ? 'Math Genius!' : score > 100 ? 'Great Math!' : score > 50 ? 'Nice Work!' : 'Keep Practicing!'}
          </div>
          <div className="rps-final-score">
            <span className="player">{score}</span>
            <span className="sep">points</span>
            <span className="bot">{correctCount} correct</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => startGame(difficulty)}>Play Again</button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => setDifficulty(null)}>Change Difficulty</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      ) : question ? (
        <div
          id="mathdash-question"
          key={questionKey}
          style={{
            animation: 'slideInRight 0.25s ease-out',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-glass)',
            borderRadius: 16,
            padding: '24px 16px',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 'clamp(20px, 6vw, 32px)',
            color: 'var(--neon-cyan)',
            marginBottom: 24,
            letterSpacing: 2,
          }}>
            {question.text}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}>
            {question.options.map((opt, i) => {
              const isSelected = answered === opt
              const isCorrectOpt = opt === question.answer
              const showResult = answered !== null
              let bg = 'rgba(255,255,255,0.08)'
              let border = '1px solid var(--border-glass)'
              let color = 'var(--text-dim)'
              if (showResult && isCorrectOpt) {
                bg = 'rgba(57,255,20,0.2)'
                border = '1px solid var(--neon-green)'
                color = 'var(--neon-green)'
              } else if (showResult && isSelected && !isCorrectOpt) {
                bg = 'rgba(255,45,123,0.2)'
                border = '1px solid var(--neon-red)'
                color = 'var(--neon-red)'
              }
              return (
                <button
                  key={`${questionKey}-${i}`}
                  onClick={() => handleAnswer(opt)}
                  disabled={answered !== null}
                  style={{
                    background: bg,
                    border,
                    borderRadius: 12,
                    padding: '14px 8px',
                    fontSize: 'clamp(16px, 4vw, 22px)',
                    fontFamily: "'Press Start 2P', monospace",
                    color,
                    cursor: answered !== null ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: showResult && !isCorrectOpt && !isSelected ? 0.4 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!showResult) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                      e.currentTarget.style.transform = 'scale(1.03)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!showResult) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <QuitConfirmButton onQuit={() => { clearTimer(); setDifficulty(null); onPlayingChange?.(false) }} gameOver={gameOver} className="quit-btn" />
      </div>
    </div>
  )
}
