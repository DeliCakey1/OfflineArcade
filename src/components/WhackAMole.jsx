import { useState, useEffect, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', color: '#39ff14', time: 30, moleStay: 1500, spawnInterval: 1200, desc: '30s — Relaxed pace' },
  { name: 'Normal', emoji: '🟡', color: '#ffe600', time: 20, moleStay: 1200, spawnInterval: 900, desc: '20s — Standard speed' },
  { name: 'Hard', emoji: '🟠', color: '#ff6b2b', time: 15, moleStay: 900, spawnInterval: 600, desc: '15s — Quick reflexes' },
  { name: 'Insane', emoji: '💀', color: '#ff2d7b', time: 10, moleStay: 600, spawnInterval: 400, desc: '10s — Blink and miss it' },
]

const HOLES = [0, 1, 2, 3, 4, 5, 6, 7, 8]

export default function WhackAMole({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [moles, setMoles] = useState({})
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bestScores, setBestScores] = useState(() => {
    try { return JSON.parse(localStorage.getItem('whack-best') || '{}') } catch { return {} }
  })
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [hitEffects, setHitEffects] = useState({})
  const spawnTimerRef = useRef(null)
  const gameTimerRef = useRef(null)
  const moleTimersRef = useRef({})
  const moleIdRef = useRef(0)
  const activeMolesRef = useRef({})
  const gameOverRef = useRef(false)
  const difficultyRef = useRef(null)
  const sound = useSound()
  const { recordGame, gameStats } = useStats('whack')
  const isPlaying = difficulty && !gameOver

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    gameOverRef.current = gameOver
  }, [gameOver])

  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [])

  function clearAllTimers() {
    if (spawnTimerRef.current) { clearInterval(spawnTimerRef.current); spawnTimerRef.current = null }
    if (gameTimerRef.current) { clearInterval(gameTimerRef.current); gameTimerRef.current = null }
    Object.values(moleTimersRef.current).forEach(t => clearTimeout(t))
    moleTimersRef.current = {}
  }

  function spawnMole() {
    if (gameOverRef.current) return

    const occupied = Object.keys(activeMolesRef.current).map(Number)
    if (occupied.length >= 3) return

    const available = HOLES.filter(h => !occupied.includes(h))
    if (available.length === 0) return

    const hole = available[Math.floor(Math.random() * available.length)]
    const id = ++moleIdRef.current
    activeMolesRef.current[hole] = id

    setMoles(prev => ({ ...prev, [hole]: id }))

    moleTimersRef.current[id] = setTimeout(() => {
      delete activeMolesRef.current[hole]
      delete moleTimersRef.current[id]

      setMoles(prev => {
        if (prev[hole] !== id) return prev
        const next = { ...prev }
        delete next[hole]
        return next
      })
      setStreak(0)
      sound('lose')
    }, difficultyRef.current.moleStay)
  }

  function startGame(d) {
    clearAllTimers()
    activeMolesRef.current = {}
    moleIdRef.current = 0
    gameOverRef.current = false
    difficultyRef.current = d

    setDifficulty(d)
    setMoles({})
    setScore(0)
    setTimeLeft(d.time)
    setGameOver(false)
    setCopied(false)
    setStreak(0)
    setMaxStreak(0)
    setHitEffects({})

    gameTimerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearAllTimers()
          return 0
        }
        return t - 1
      })
    }, 1000)

    setTimeout(() => spawnMole(), 300)
    spawnTimerRef.current = setInterval(() => spawnMole(), d.spawnInterval)
  }

  useEffect(() => {
    if (timeLeft === 0 && difficulty && !gameOver) {
      clearAllTimers()
      setGameOver(true)
      gameOverRef.current = true
      const isNewBest = !bestScores[difficulty.name] || score > bestScores[difficulty.name]
      if (isNewBest && score > 0) {
        const updated = { ...bestScores, [difficulty.name]: score }
        setBestScores(updated)
        try { localStorage.setItem('whack-best', JSON.stringify(updated)) } catch {}
      }
      recordGame(score > 10, maxStreak)
      sound(score > 15 ? 'victory' : score > 8 ? 'win' : 'lose')
    }
  }, [timeLeft, difficulty, gameOver, bestScores, score, maxStreak, recordGame, sound])

  function whackMole(hole) {
    if (gameOverRef.current || !difficulty) return

    const moleId = activeMolesRef.current[hole]
    if (!moleId) return

    if (moleTimersRef.current[moleId]) {
      clearTimeout(moleTimersRef.current[moleId])
      delete moleTimersRef.current[moleId]
    }
    delete activeMolesRef.current[hole]

    setMoles(prev => {
      if (prev[hole] !== moleId) return prev
      const next = { ...prev }
      delete next[hole]
      return next
    })

    setHitEffects(prev => ({ ...prev, [hole]: true }))
    setTimeout(() => {
      setHitEffects(prev => {
        const next = { ...prev }
        delete next[hole]
        return next
      })
    }, 250)

    setScore(s => s + 1)
    setStreak(s => {
      const next = s + 1
      setMaxStreak(m => Math.max(m, next))
      return next
    })
    sound('click')
  }

  function shareResult() {
    const lines = [
      `🔨 Whack-a-Mole (${difficulty.name})!`,
      `📊 Score: ${score} | Best Streak: ${maxStreak}`,
      `⏱ ${difficulty.time}s — ${score > 15 ? '🏆 Incredible!' : score > 10 ? '⚡ Fast hands!' : '🎯 Nice effort!'}`,
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
        <h2>Whack-a-Mole</h2>
        <p className="description">Click the moles as they pop up! Don't let them escape!</p>
        <div className="gtn-mode-grid">
          {DIFFICULTIES.map(d => (
            <button key={d.name} className="gtn-mode-card" style={{ '--mode-color': d.color }}
              onClick={() => { sound('click'); startGame(d) }}>
              <div className="gtn-mode-emoji">{d.emoji}</div>
              <div className="gtn-mode-name">{d.name}</div>
              <div className="gtn-mode-attempts">{d.desc}</div>
              {bestScores[d.name] !== undefined && (
                <div className="gtn-mode-attempts" style={{ color: d.color }}>🏆 {bestScores[d.name]}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Whack-a-Mole</h2>
      <p className="description">Click the moles before they escape!</p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Time</div>
          <div className="hol-stat-num" style={timeLeft <= 5 ? { color: 'var(--neon-orange)' } : {}}>{timeLeft}s</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Score</div>
          <div className="hol-stat-num player">{score}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Streak</div>
          <div className="hol-stat-num" style={streak >= 5 ? { color: 'var(--neon-orange)' } : {}}>{streak}</div>
        </div>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', marginBottom: 20, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3, transition: 'width 1s linear',
          width: `${(timeLeft / difficulty.time) * 100}%`,
          background: timeLeft > 5 ? 'linear-gradient(90deg, var(--neon-green), var(--neon-yellow))' : 'linear-gradient(90deg, var(--neon-orange), var(--neon-pink))'
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 360, margin: '0 auto' }}>
        {HOLES.map(hole => {
          const isUp = moles[hole] !== undefined
          const isHit = hitEffects[hole]
          return (
            <div key={hole} style={{ position: 'relative', aspectRatio: '1', cursor: isUp ? 'pointer' : 'default', userSelect: 'none' }}
              onClick={() => whackMole(hole)}>
              <div style={{
                position: 'absolute', bottom: 0, left: '5%', width: '90%', height: '35%',
                borderRadius: '50% 50% 12px 12px',
                background: 'linear-gradient(180deg, #8B6914, #6B4F10)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.1)',
                zIndex: 2
              }} />
              <div style={{
                position: 'absolute', bottom: '15%', left: '10%', width: '80%', height: '30%',
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, #3a2a08, #2a1a04)',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
                zIndex: 1
              }} />
              <div style={{
                position: 'absolute',
                bottom: isUp ? '8%' : '-50%',
                left: '50%',
                transform: `translateX(-50%) ${isHit ? 'scale(0.8)' : 'scale(1)'}`,
                fontSize: 'clamp(28px, 8vw, 48px)',
                transition: isUp ? 'bottom 0.12s ease-out, transform 0.1s ease' : 'bottom 0.2s ease-in, transform 0.1s ease',
                zIndex: 3,
                filter: isHit ? 'brightness(2)' : 'none',
                pointerEvents: 'none'
              }}>
                {isHit ? '💥' : '🐹'}
              </div>
            </div>
          )
        })}
      </div>

      {streak >= 3 && !gameOver && (
        <div style={{
          textAlign: 'center', marginTop: 12,
          fontFamily: "'Press Start 2P', monospace", fontSize: 12,
          color: 'var(--neon-orange)',
          animation: 'streakPulse 0.6s ease infinite alternate'
        }}>
          🔥 {streak}x Streak!
        </div>
      )}

      {gameOver && (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">🔨</div>
          <div className="result-text" style={{ color: score > 15 ? 'var(--neon-green)' : score > 8 ? 'var(--neon-yellow)' : 'var(--neon-pink)' }}>
            {score > 15 ? 'Incredible!' : score > 10 ? 'Great job!' : score > 5 ? 'Nice try!' : "Time's up!"}
          </div>
          <div className="rps-final-score">
            <span className="player">{score}</span>
            <span className="sep">points</span>
            <span className="bot">{maxStreak} best streak</span>
          </div>
          {bestScores[difficulty.name] !== undefined && (
            <div className="result-message">🏆 Best: {bestScores[difficulty.name]} points</div>
          )}
          {gameStats.bestStreak > 0 && (
            <div className="result-message">🔥 All-time best streak: {gameStats.bestStreak}</div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => startGame(difficulty)}>Play Again</button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => setDifficulty(null)}>Change Difficulty</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={() => { clearAllTimers(); setDifficulty(null); onPlayingChange?.(false) }} className="quit-btn">
          {gameOver ? 'New Game' : 'Quit Game'}
        </button>
      </div>
    </div>
  )
}