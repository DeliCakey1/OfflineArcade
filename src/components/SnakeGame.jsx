import { useState, useEffect, useCallback, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'
import useEffects from '../useEffects.jsx'
import { getAdaptiveDifficulty, getGameConfig } from '../difficulty'

const GRID_SIZE = 20
const SPEED_DECREASE = 10
const MIN_SPEED = 60
const FOOD_INTERVAL = 5
const FOOD_POINTS = 10
const CELL_SIZE = 18

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Relaxed pace', initialSpeed: 180 },
  { name: 'Normal', emoji: '🟡', desc: 'Standard snake', initialSpeed: 150 },
  { name: 'Hard', emoji: '🟠', desc: 'Fast and tricky', initialSpeed: 110 },
  { name: 'Insane', emoji: '💀', desc: 'Blink and you lose', initialSpeed: 80 },
]

function getInitialSnake() {
  const mid = Math.floor(GRID_SIZE / 2)
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ]
}

function spawnFood(snake) {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`))
  const empty = []
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y })
    }
  }
  return empty[Math.floor(Math.random() * empty.length)]
}

function getSnakeColor(index, length) {
  const t = length > 1 ? index / (length - 1) : 1
  const g = Math.round(200 + (1 - t) * 55)
  const r = Math.round(50 + (1 - t) * 30)
  return `rgb(${r}, ${g}, 50)`
}

export default function SnakeGame({ onPlayingChange }) {
  const [score, setScore] = useState(0)
  const [highScore, setHighScoreState] = useState(() => 0)
  const [gameState, setGameState] = useState('idle')
  const [copied, setCopied] = useState(false)
  const [, setRenderTick] = useState(0)
  const [difficulty, setDifficulty] = useState(null)

  const sound = useSound()
  const { recordGame, getHighScore, setHighScore } = useStats('snake')
  const { spawnParticles, floatText, shakeScreen, renderParticles, shakeStyle } = useEffects()

  const gameRef = useRef({
    snake: getInitialSnake(),
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: null,
    score: 0,
    foodEaten: 0,
    speed: 150,
    running: false,
    paused: false,
    intervalId: null,
  })

  const dirQueueRef = useRef([])
  const gameCardRef = useRef(null)
  const gridContainerRef = useRef(null)
  const speedLevelRef = useRef(1)

  const isPlaying = gameState === 'playing'

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    return () => {
      if (gameRef.current.intervalId) clearInterval(gameRef.current.intervalId)
    }
  }, [])

  const tick = useCallback(() => {
    const g = gameRef.current
    if (!g.running || g.paused) return

    if (dirQueueRef.current.length > 0) {
      const next = dirQueueRef.current.shift()
      if (!(next.x === -g.direction.x && next.y === -g.direction.y)) {
        g.direction = next
      }
    }

    const head = g.snake[0]
    const newHead = { x: head.x + g.direction.x, y: head.y + g.direction.y }

    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      g.running = false
      if (g.intervalId) clearInterval(g.intervalId)
      setGameState('gameover')
      recordGame(false, g.score)
      shakeScreen(6, 300)
      const hx = head.x * CELL_SIZE + CELL_SIZE / 2 + 4
      const hy = head.y * CELL_SIZE + CELL_SIZE / 2 + 4
      spawnParticles(hx, hy, '#ff2d7b', 12, { spread: Math.PI * 2, speed: 2.5, gravity: 0.1, life: 30, sizeMin: 3, sizeMax: 6, angle: Math.random() * Math.PI * 2 })
      sound('death')
      const prev = getHighScore('snake')
      if (g.score > prev) {
        setHighScore('snake', g.score)
        setHighScoreState(g.score)
      }
      return
    }

    for (let i = 0; i < g.snake.length - 1; i++) {
      if (g.snake[i].x === newHead.x && g.snake[i].y === newHead.y) {
        g.running = false
        if (g.intervalId) clearInterval(g.intervalId)
        setGameState('gameover')
        recordGame(false, g.score)
        shakeScreen(6, 300)
        const hx = newHead.x * CELL_SIZE + CELL_SIZE / 2 + 4
        const hy = newHead.y * CELL_SIZE + CELL_SIZE / 2 + 4
        spawnParticles(hx, hy, '#ff2d7b', 12, { spread: Math.PI * 2, speed: 2.5, gravity: 0.1, life: 30, sizeMin: 3, sizeMax: 6, angle: Math.random() * Math.PI * 2 })
        sound('death')
        const prev = getHighScore('snake')
        if (g.score > prev) {
          setHighScore('snake', g.score)
          setHighScoreState(g.score)
        }
        return
      }
    }

    const ateFood = g.food && newHead.x === g.food.x && newHead.y === g.food.y
    const newSnake = [newHead, ...g.snake]
    if (!ateFood) {
      newSnake.pop()
    } else {
      g.score += FOOD_POINTS
      g.foodEaten += 1
      if (g.foodEaten % FOOD_INTERVAL === 0) {
        const oldLevel = Math.floor((150 - g.speed) / SPEED_DECREASE) + 1
        g.speed = Math.max(MIN_SPEED, g.speed - SPEED_DECREASE)
        const newLevel = Math.floor((150 - g.speed) / SPEED_DECREASE) + 1
        if (newLevel > oldLevel) {
          floatText(9 * CELL_SIZE + CELL_SIZE / 2 + 4, 9 * CELL_SIZE + 4, 'SPEED UP!', '#ffe600')
          sound('levelup')
        }
        speedLevelRef.current = newLevel
        if (g.intervalId) clearInterval(g.intervalId)
        g.intervalId = setInterval(tick, g.speed)
      }
      const foodPxX = g.food.x * CELL_SIZE + CELL_SIZE / 2 + 4
      const foodPxY = g.food.y * CELL_SIZE + CELL_SIZE / 2 + 4
      spawnParticles(foodPxX, foodPxY, '#39ff14', 8, { spread: Math.PI * 2, speed: 2.5, gravity: 0.1, life: 30, sizeMin: 3, sizeMax: 6 })
      floatText(foodPxX, foodPxY - 10, `+${FOOD_POINTS}`, '#39ff14')
      g.food = spawnFood(newSnake)
      setScore(g.score)
      sound('score')
    }

    g.snake = newSnake
    setRenderTick(t => t + 1)
  }, [recordGame, sound, spawnParticles, floatText, shakeScreen])

  function startGame(diffName) {
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    const stats = JSON.parse(localStorage.getItem('arcade-stats') || '{}')
    const adaptiveLevel = getAdaptiveDifficulty('snake', stats)
    const config = getGameConfig('snake', adaptiveLevel)
    setDifficulty(diffName)
    const g = gameRef.current
    if (g.intervalId) clearInterval(g.intervalId)
    dirQueueRef.current = []

    g.snake = getInitialSnake()
    g.direction = { x: 1, y: 0 }
    g.nextDirection = { x: 1, y: 0 }
    g.score = 0
    g.foodEaten = 0
    g.speed = config.speed || d.initialSpeed
    g.running = true
    g.paused = false
    g.food = spawnFood(g.snake)
    g.intervalId = setInterval(tick, g.speed)
    speedLevelRef.current = 1

    setScore(0)
    setGameState('playing')
    setRenderTick(t => t + 1)
  }

  function pauseResume() {
    const g = gameRef.current
    if (gameState !== 'playing' && gameState !== 'paused') return
    if (g.paused) {
      g.paused = false
      g.intervalId = setInterval(tick, g.speed)
      setGameState('playing')
    } else {
      g.paused = true
      if (g.intervalId) clearInterval(g.intervalId)
      setGameState('paused')
    }
  }

  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'paused') return
    function handleKey(e) {
      const g = gameRef.current
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        pauseResume()
        return
      }
      if (g.paused) return
      const DIR_MAP = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
        a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
        W: { x: 0, y: -1 }, S: { x: 0, y: 1 },
        A: { x: -1, y: 0 }, D: { x: 1, y: 0 },
      }
      const dir = DIR_MAP[e.key]
      if (dir) {
        e.preventDefault()
        const queue = dirQueueRef.current
        const lastDir = queue.length > 0 ? queue[queue.length - 1] : g.direction
        if (!(dir.x === -lastDir.x && dir.y === -lastDir.y)) {
          if (queue.length < 3) queue.push(dir)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [gameState])

  function changeDirection(dir) {
    const g = gameRef.current
    if (g.paused || !g.running) return
    const queue = dirQueueRef.current
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : g.direction
    if (!(dir.x === -lastDir.x && dir.y === -lastDir.y)) {
      if (queue.length < 3) queue.push(dir)
    }
  }

  function shareResult() {
    const d = DIFFICULTIES.find(x => x.name === difficulty)
    const lines = [
      `🐍 Snake: ${score} points`,
      d ? `${d.emoji} ${difficulty}` : '',
      highScore > 0 ? `🏆 High Score: ${highScore}` : '',
      ``,
      `🎮 Offline Arcade`,
    ].filter(Boolean)
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const g = gameRef.current
  const speedLevel = speedLevelRef.current

  const grid = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`
      const snakeIdx = g.snake.findIndex(s => s.x === x && s.y === y)
      const isHead = snakeIdx === 0
      const isBody = snakeIdx > 0
      const isFood = g.food && g.food.x === x && g.food.y === y
      let cellStyle = {
        width: CELL_SIZE,
        height: CELL_SIZE,
      }
      if (isHead) {
        cellStyle.background = 'rgb(0, 255, 50)'
        cellStyle.borderRadius = '4px'
        cellStyle.boxShadow = '0 0 6px rgba(0, 255, 50, 0.6)'
      } else if (isBody) {
        cellStyle.background = getSnakeColor(snakeIdx, g.snake.length)
        cellStyle.borderRadius = '2px'
      } else if (isFood) {
        cellStyle.background = '#ff2d55'
        cellStyle.borderRadius = '50%'
        cellStyle.boxShadow = '0 0 8px rgba(255, 45, 85, 0.8)'
      } else {
        cellStyle.background = 'rgba(255,255,255,0.03)'
      }
      grid.push(
        <div key={key} style={cellStyle} />
      )
    }
  }

  const btnStyle = {
    width: 52,
    height: 52,
    borderRadius: '50%',
    border: '2px solid rgba(57, 255, 20, 0.4)',
    background: 'rgba(57, 255, 20, 0.1)',
    color: '#39ff14',
    fontSize: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }

  if (gameState === 'idle') {
    return (
      <div className="game-card slide-in">
        <h2>Snake</h2>
        <p className="description">Eat food to grow! Avoid walls and yourself.</p>
        <div className="rps-mode-grid">
          {DIFFICULTIES.map(d => (
            <button key={d.name} className="rps-mode-card" onClick={() => startGame(d.name)}>
              <div className="rps-mode-icon">{d.emoji}</div>
              <div className="rps-mode-label">{d.name}</div>
              <div className="rps-mode-desc">{d.desc}</div>
            </button>
          ))}
        </div>
        {highScore > 0 && (
          <div className="rps-history-item" style={{ marginTop: 16, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>🏆 Best: {highScore}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="game-card slide-in" ref={gameCardRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <QuitConfirmButton onQuit={() => { if (gameRef.current.intervalId) clearInterval(gameRef.current.intervalId); gameRef.current.running = false; setGameState('idle'); setDifficulty(null); onPlayingChange?.(false) }} gameOver={gameState === 'gameover'} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Score</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-yellow)' }}>{score}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Speed</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-green)' }}>{speedLevel}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Best</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-orange)' }}>{highScore}</div></div>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }} ref={gridContainerRef}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gap: 1,
          justifyContent: 'center',
          margin: '0 auto',
          background: 'rgba(0,0,0,0.3)',
          padding: 4,
          borderRadius: 8,
          border: '1px solid rgba(57, 255, 20, 0.15)',
          ...shakeStyle,
        }}>
          {grid}
        </div>
        {renderParticles({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 })}
      </div>

      {(gameState === 'playing' || gameState === 'paused') && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 12 }}>
          <button style={btnStyle} aria-label="Move up" onClick={() => changeDirection({ x: 0, y: -1 })}>&#9650;</button>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={btnStyle} aria-label="Move left" onClick={() => changeDirection({ x: -1, y: 0 })}>&#9664;</button>
            <button
              style={{ ...btnStyle, fontSize: 14, width: 48, height: 48 }}
              aria-label={gameState === 'paused' ? 'Resume game' : 'Pause game'}
              onClick={pauseResume}
            >
              {gameState === 'paused' ? '&#9654;' : '&#9646;&#9646;'}
            </button>
            <button style={btnStyle} aria-label="Move right" onClick={() => changeDirection({ x: 1, y: 0 })}>&#9654;</button>
          </div>
          <button style={btnStyle} aria-label="Move down" onClick={() => changeDirection({ x: 0, y: 1 })}>&#9660;</button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">🐍</div>
          <div className="result-text lose">Game Over!</div>
          <div className="rps-final-score">
            <span className="player">{score}</span>
            <span className="sep">points</span>
            <span className="bot">Level {speedLevel}</span>
          </div>
          {score >= highScore && score > 0 && (
            <div className="result-message">🏆 New High Score!</div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => startGame(difficulty)}>Play Again</button>
            <button
              className="play-again-btn"
              style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => { setGameState('idle'); setDifficulty(null) }}
            >
              New Game
            </button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Share'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'paused' && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button className="play-again-btn" onClick={pauseResume}>Resume</button>
        </div>
      )}
    </div>
  )
}
