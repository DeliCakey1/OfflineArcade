import { useState, useEffect, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'

const MODES = [
  { name: 'Classic', emoji: '⚡', color: '#39ff14', rounds: 5, desc: '5 rounds - average speed' },
  { name: 'Sprint', emoji: '🏃', color: '#ffe600', rounds: 10, desc: '10 rounds - endurance' },
  { name: 'Marathon', emoji: '🏅', color: '#ff6b2b', rounds: 20, desc: '20 rounds - true test' },
  { name: 'Blitz', emoji: '💀', color: '#ff2d7b', rounds: 5, desc: '5 rounds - tight windows' },
]

export default function ReactionTime({ onPlayingChange }) {
  const [mode, setMode] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [times, setTimes] = useState([])
  const [currentStart, setCurrentStart] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [earlyFoul, setEarlyFoul] = useState(false)
  const timeoutRef = useRef(null)
  const sound = useSound()
  const { recordGame } = useStats('reaction')
  const isPlaying = mode && !gameOver

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  function startGame(m) {
    setMode(m)
    setTimes([])
    setGameOver(false)
    setCopied(false)
    setEarlyFoul(false)
    startRound()
  }

  function startRound() {
    setPhase('waiting')
    setEarlyFoul(false)
    const delay = mode.name === 'Blitz'
      ? 1000 + Math.random() * 3000
      : 1500 + Math.random() * 4500
    timeoutRef.current = setTimeout(() => {
      setPhase('ready')
      setCurrentStart(Date.now())
      sound('click')
    }, delay)
  }

  function handleClick() {
    if (phase === 'idle' && !gameOver) {
      startRound()
      return
    }
    if (phase === 'waiting') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setEarlyFoul(true)
      setPhase('idle')
      sound('lose')
      return
    }
    if (phase === 'ready') {
      const time = Date.now() - currentStart
      sound('win')
      const newTimes = [...times, time]
      setTimes(newTimes)
      setPhase('idle')
      if (newTimes.length >= mode.rounds) {
        setGameOver(true)
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length)
        recordGame(avg < 400, avg)
        sound(avg < 400 ? 'victory' : 'lose')
      }
    }
  }

  function getRating(ms) {
    if (ms < 200) return { text: 'Inhuman', color: '#ff2d7b' }
    if (ms < 250) return { text: 'Lightning', color: '#ff6b2b' }
    if (ms < 350) return { text: 'Fast', color: '#ffe600' }
    if (ms < 500) return { text: 'Average', color: '#39ff14' }
    return { text: 'Slow', color: '#888' }
  }

  function shareResult() {
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    const best = Math.min(...times)
    const lines = [
      `⚡ Beat the bot at Reaction Time (${mode.name})!`,
      `📊 Avg: ${avg}ms | Best: ${best}ms | ${mode.rounds} rounds`,
      `📈 Rating: ${getRating(avg).text}`,
      ``,
      `🎮 Offline Arcade`,
    ].filter(Boolean)
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!mode) {
    return (
      <div className="game-card slide-in">
        <h2>Reaction Time</h2>
        <p className="description">Click as fast as you can when the screen turns green!</p>
        <div className="gtn-mode-grid">
          {MODES.map(m => (
            <button key={m.name} className="gtn-mode-card" style={{ '--mode-color': m.color }}
              onClick={() => { sound('click'); startGame(m) }}>
              <div className="gtn-mode-emoji">{m.emoji}</div>
              <div className="gtn-mode-name">{m.name}</div>
              <div className="gtn-mode-attempts">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  const best = times.length > 0 ? Math.min(...times) : 0

  return (
    <div className="game-card slide-in">
      <h2>Reaction Time</h2>
      <p className="description">Click when the screen turns green!</p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Round</div>
          <div className="hol-stat-num">{Math.min(times.length + 1, mode.rounds)}/{mode.rounds}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Avg</div>
          <div className="hol-stat-num player">{avg > 0 ? `${avg}ms` : '—'}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Best</div>
          <div className="hol-stat-num">{best > 0 ? `${best}ms` : '—'}</div>
        </div>
      </div>

      <div className="reaction-zone"
        onClick={handleClick}
        style={{
          background: phase === 'ready' ? 'linear-gradient(135deg, #00c853, #39ff14)' :
            phase === 'waiting' ? 'linear-gradient(135deg, var(--neon-red), #ff4444)' :
            'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
          cursor: phase === 'idle' ? 'default' : 'pointer',
        }}
      >
        <div className="reaction-zone-text" style={{ color: phase === 'ready' ? '#000' : '#fff' }}>
          {phase === 'idle' && !gameOver && (times.length === 0 ? 'Click to start' : 'Click for next round')}
          {phase === 'waiting' && 'Wait for green...'}
          {phase === 'ready' && 'CLICK NOW!'}
          {gameOver && 'Game Over!'}
        </div>
        {phase === 'ready' && (
          <div className="reaction-zone-ms" style={{ color: '#000' }}>
            {Date.now() - currentStart}ms
          </div>
        )}
      </div>

      {earlyFoul && (
        <div className="result-message" style={{ color: 'var(--neon-red)' }}>
          Too early! Wait for green.
        </div>
      )}

      {times.length > 0 && !gameOver && (
        <div className="reaction-history">
          {times.map((t, i) => (
            <span key={i} className="reaction-history-item" style={{ color: getRating(t).color }}>
              {t}ms
            </span>
          ))}
        </div>
      )}

      {gameOver && (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">⚡</div>
          <div className="result-text" style={{ color: getRating(avg).color }}>
            {getRating(avg).text}!
          </div>
          <div className="rps-final-score">
            <span className="player">{avg}ms</span>
            <span className="sep">avg</span>
            <span className="bot">{best}ms best</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => startGame(mode)}>Play Again</button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => setMode(null)}>Change Mode</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setMode(null); onPlayingChange?.(false) }} className="quit-btn">
          {gameOver ? 'New Game' : 'Quit Game'}
        </button>
      </div>
    </div>
  )
}
