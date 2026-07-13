import { useState, useEffect, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const COLORS = [
  { name: 'red', color: '#ff2d55', sound: 'note1' },
  { name: 'blue', color: '#007aff', sound: 'note2' },
  { name: 'green', color: '#39ff14', sound: 'note3' },
  { name: 'yellow', color: '#ffe600', sound: 'note4' },
]

const MODES = [
  { name: 'Normal', emoji: '🟢', color: '#39ff14', speed: 800, desc: 'Standard pace' },
  { name: 'Fast', emoji: '🟡', color: '#ffe600', speed: 500, desc: 'Quick flashes' },
  { name: 'Blitz', emoji: '🟠', color: '#ff6b2b', speed: 350, desc: 'Blink and miss it' },
  { name: 'Insane', emoji: '💀', color: '#ff2d7b', speed: 250, desc: 'Only the elite' },
]

export default function SimonSays({ onPlayingChange }) {
  const [mode, setMode] = useState(null)
  const [sequence, setSequence] = useState([])
  const [playerInput, setPlayerInput] = useState([])
  const [phase, setPhase] = useState('showing')
  const [highlight, setHighlight] = useState(null)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showingIdx, setShowingIdx] = useState(0)
  const timeoutRef = useRef(null)
  const sound = useSound()
  const { recordGame } = useStats('simon')
  const isPlaying = mode && !gameOver

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  useEffect(() => {
    if (!mode || gameOver) return
    const KEY_MAP = { w: 0, e: 1, s: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 }
    function handleKey(e) {
      const idx = KEY_MAP[e.key.toLowerCase()]
      if (idx !== undefined) {
        e.preventDefault()
        handlePress(idx)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mode, gameOver, phase, sequence, playerInput, score, bestScore])

  function startGame(m) {
    setMode(m)
    setScore(0)
    setBestScore(0)
    setGameOver(false)
    setCopied(false)
    const first = Math.floor(Math.random() * 4)
    setSequence([first])
    startPlayback([first], m)
  }

  function startPlayback(seq, m) {
    setPhase('showing')
    setPlayerInput([])
    setShowingIdx(0)
    let i = 0
    function showNext() {
      if (i >= seq.length) {
        setHighlight(null)
        setPhase('input')
        return
      }
      setHighlight(seq[i])
      setShowingIdx(i)
      sound(COLORS[seq[i]].sound)
      timeoutRef.current = setTimeout(() => {
        setHighlight(null)
        timeoutRef.current = setTimeout(() => {
          i++
          showNext()
        }, 150)
      }, m.speed)
    }
    showNext()
  }

  function handlePress(colorIdx) {
    if (phase !== 'input') return
    sound(COLORS[colorIdx].sound)
    setHighlight(colorIdx)
    setTimeout(() => setHighlight(null), 200)

    const newInput = [...playerInput, colorIdx]
    setPlayerInput(newInput)

    if (colorIdx !== sequence[newInput.length - 1]) {
      setGameOver(true)
      recordGame(score > 5, score)
      sound('lose')
      return
    }

    if (newInput.length === sequence.length) {
      const newScore = score + 1
      setScore(newScore)
      if (newScore > bestScore) setBestScore(newScore)
      const nextColor = Math.floor(Math.random() * 4)
      const newSeq = [...sequence, nextColor]
      setSequence(newSeq)
      setTimeout(() => startPlayback(newSeq, mode), 600)
    }
  }

  function shareResult() {
    const lines = [
      `🎵 Beat the bot at Simon Says (${mode.name})!`,
      `📊 Score: ${score} rounds | ${sequence.length} colors in sequence`,
      score > 5 ? '🏆 Impressive memory!' : '',
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
        <h2>Simon Says</h2>
        <p className="description">Watch the sequence, then repeat it!</p>
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

  return (
    <div className="game-card slide-in">
      <h2>Simon Says</h2>
      <p className="description">
        {phase === 'showing' ? `Watch the sequence! (${sequence.length} colors)` : 'Your turn! Repeat the sequence'}
      </p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Score</div>
          <div className="hol-stat-num player">{score}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Sequence</div>
          <div className="hol-stat-num">{sequence.length}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Best</div>
          <div className="hol-stat-num">{bestScore}</div>
        </div>
      </div>

      <div className="simon-grid">
        {COLORS.map((c, i) => (
          <button
            key={i}
            className={`simon-btn ${highlight === i ? 'highlighted' : ''}`}
            style={{
              background: highlight === i ? c.color : `${c.color}33`,
              borderColor: c.color,
              boxShadow: highlight === i ? `0 0 30px ${c.color}, inset 0 0 20px ${c.color}` : 'none',
            }}
            aria-label={`${c.name} button`}
            onClick={() => handlePress(i)}
            disabled={phase !== 'input'}
          >
            <span className="simon-key-hint">{['W','E','S','D'][i]}</span>
          </button>
        ))}
      </div>
      <div className="simon-keys-hint">Press W E S D or 1 2 3 4</div>

      {phase === 'showing' && (
        <div className="simon-progress">
          {sequence.map((_, i) => (
            <span key={i} className={`simon-dot ${i <= showingIdx ? 'active' : ''}`}>
              {COLORS[sequence[i]].name[0].toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {gameOver && (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">🎵</div>
          <div className="result-text lose">Sequence Broken!</div>
          <div className="rps-final-score">
            <span className="player">{score}</span>
            <span className="sep">rounds</span>
            <span className="bot">{sequence.length} colors</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => startGame(mode)}>Play Again</button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => setMode(null)}>Change Speed</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <QuitConfirmButton onQuit={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setMode(null); onPlayingChange?.(false) }} gameOver={gameOver} className="quit-btn" />
      </div>
    </div>
  )
}
