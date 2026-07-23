import { useState, useEffect, useCallback, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const MODES = [
  { name: 'Easy', rows: 3, cols: 4, emoji: '🟢', color: '#39ff14' },
  { name: 'Normal', rows: 4, cols: 4, emoji: '🟡', color: '#ffe600' },
  { name: 'Hard', rows: 4, cols: 6, emoji: '🟠', color: '#ff6b2b' },
  { name: 'Expert', rows: 6, cols: 6, emoji: '💀', color: '#ff2d7b' },
]

const EMOJIS = ['🎮','🎯','🎪','🎨','🎭','🎬','🎤','🎧','🎵','🔮','💎','🏆','⚡','🔥','🌟','💎','🎲','🃏','🗝️','🎁','🕹️','👾','🤖','🐉']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function MemoryMatch({ onPlayingChange }) {
  const [mode, setMode] = useState(null)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState(new Set())
  const [moves, setMoves] = useState(0)
  const [timer, setTimer] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [bestScore, setBestScore] = useState(null)
  const [copied, setCopied] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [sparkles, setSparkles] = useState([])
  const sparkleId = useRef(0)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('memory')
  const isPlaying = mode && !gameOver

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    if (!mode || gameOver) return
    const interval = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [mode, gameOver])

  const startGame = useCallback((m) => {
    setMode(m)
    const pairs = (m.rows * m.cols) / 2
    const chosen = shuffle(EMOJIS).slice(0, pairs)
    const deck = shuffle([...chosen, ...chosen].map((emoji, i) => ({ id: i, emoji })))
    setCards(deck)
    setFlipped([])
    setMatched(new Set())
    setMoves(0)
    setTimer(0)
    setGameOver(false)
    setBestScore(null)
    setCopied(false)
    setSparkles([])
    setPreviewing(true)
    setFlipped(deck.map((_, i) => i))
    setTimeout(() => {
      setFlipped([])
      setPreviewing(false)
    }, 1500)
  }, [])

  useEffect(() => {
    if (mode && matched.size === cards.length && cards.length > 0) {
      setGameOver(true)
      const isWin = true
      recordGame(isWin, moves)
      sound('victory')
      const prev = getHighScore('memory') || 9999
      if (moves < prev) {
        saveHighScore('memory', moves)
        setBestScore(moves)
      }
    }
  }, [matched, cards, moves, mode, recordGame, sound])

  function flipCard(id) {
    if (animating || flipped.includes(id) || matched.has(id) || gameOver || previewing) return
    sound('click')
    const newFlipped = [...flipped, id]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setAnimating(true)
      setMoves(m => m + 1)
      const [a, b] = newFlipped
      if (cards[a].emoji === cards[b].emoji) {
        sound('win')
        const container = document.querySelector('.game-card.slide-in')
        const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 }
        const cardEls = document.querySelectorAll('.memory-card')
        const newSparkles = []
        for (const idx of [a, b]) {
          const el = cardEls[idx]
          if (el) {
            const rect = el.getBoundingClientRect()
            const cx = rect.left - containerRect.left + rect.width / 2
            const cy = rect.top - containerRect.top + rect.height / 2
            for (let i = 0; i < 6; i++) {
              newSparkles.push({
                id: sparkleId.current++,
                x: cx + (Math.random() - 0.5) * 60,
                y: cy + (Math.random() - 0.5) * 60,
                emoji: ['✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 4)],
              })
            }
          }
        }
        setSparkles(prev => [...prev, ...newSparkles])
        setTimeout(() => setSparkles(prev => prev.filter(s => !newSparkles.includes(s))), 600)
        setTimeout(() => {
          setMatched(prev => new Set([...prev, a, b]))
          setFlipped([])
          setAnimating(false)
        }, 400)
      } else {
        sound('lose')
        setTimeout(() => {
          setFlipped([])
          setAnimating(false)
        }, 700)
      }
    }
  }

  function shareResult() {
    const modeName = MODES.find(m => m === mode)?.name || 'Custom'
    const lines = [
      `🧠 Beat the bot at Memory Match (${modeName})!`,
      `📊 ${moves} moves | ⏱ ${timer}s | ${cards.length / 2} pairs`,
      bestScore ? `🏆 New best: ${bestScore} moves` : '',
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
        <h2>Memory Match</h2>
        <p className="description">Find all matching pairs! Fewest moves wins.</p>
        <div className="gtn-mode-grid">
          {MODES.map(m => (
            <button key={m.name} className="gtn-mode-card" style={{ '--mode-color': m.color }}
              onClick={() => { sound('click'); startGame(m) }}>
              <div className="gtn-mode-emoji">{m.emoji}</div>
              <div className="gtn-mode-name">{m.name}</div>
              <div className="gtn-mode-attempts">{m.rows}x{m.cols} grid</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const totalPairs = cards.length / 2
  const foundPairs = matched.size / 2

  return (
    <div className="game-card slide-in" style={{ position: 'relative', overflow: 'hidden' }}>
      <h2>Memory Match</h2>
      <p className="description">{previewing ? 'Memorize the cards!' : `Find all ${totalPairs} pairs!`}</p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Moves</div>
          <div className="hol-stat-num player">{moves}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Pairs</div>
          <div className="hol-stat-num">{foundPairs}/{totalPairs}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Time</div>
          <div className="hol-stat-num">{timer}s</div>
        </div>
      </div>

      <div className="memory-progress" role="progressbar" aria-valuenow={foundPairs} aria-valuemin={0} aria-valuemax={totalPairs}>
        <div className="memory-progress-fill" style={{ width: `${(foundPairs / totalPairs) * 100}%` }} />
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">🧠</div>
          <div className="result-text win">All Pairs Found!</div>
          <div className="rps-final-score">
            <span className="player">{moves}</span>
            <span className="sep">moves</span>
            <span className="bot">{timer}s</span>
          </div>
          {bestScore && <div className="result-message">🏆 New Best: {bestScore} moves!</div>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => startGame(mode)}>Play Again</button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => setMode(null)}>Change Difficulty</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      ) : (
        <div className="memory-grid" style={{ gridTemplateColumns: `repeat(${mode.cols}, 1fr)` }}>
          {cards.map((card, i) => {
            const isFlipped = flipped.includes(i) || matched.has(i)
            const isMatched = matched.has(i)
            return (
              <button key={i}
                className={`memory-card ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched' : ''}`}
                aria-label={isFlipped ? `${card.emoji} card, face up` : `Card ${i + 1}, face down`}
                onClick={() => flipCard(i)}
                disabled={isFlipped || animating || previewing}
              >
                <div className="memory-card-inner">
                  <div className="memory-card-front">?</div>
                  <div className="memory-card-back">{card.emoji}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <QuitConfirmButton onQuit={() => { setMode(null); onPlayingChange?.(false) }} gameOver={gameOver} className="quit-btn" />
      </div>
      {sparkles.map(s => (
        <div key={s.id} className="memory-sparkle" style={{ left: s.x, top: s.y }}>
          {s.emoji}
        </div>
      ))}
    </div>
  )
}
