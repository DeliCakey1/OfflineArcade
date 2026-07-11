import { useState, useEffect, useCallback, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'

const GRID_SIZE = 20
const INITIAL_SPEED = 150
const SPEED_DECREASE = 10
const MIN_SPEED = 60
const FOOD_INTERVAL = 5
const FOOD_POINTS = 10
const CELL_SIZE = 18

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
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snake-high') || '0')
  })
  const [gameState, setGameState] = useState('idle')
  const [copied, setCopied] = useState(false)
  const [renderTick, setRenderTick] = useState(0)

  const sound = useSound()
  const { recordGame } = useStats('snake')

  const gameRef = useRef({
    snake: getInitialSnake(),
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: null,
    score: 0,
    foodEaten: 0,
    speed: INITIAL_SPEED,
    running: false,
    paused: false,
    intervalId: null,
  })

  const dirQueueRef = useRef([])
  const gameCardRef = useRef(null)

  const isPlaying = gameState === 'playing'
  const currentSpeed = gameRef.current.speed

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
      sound('lose')
      const prev = parseInt(localStorage.getItem('snake-high') || '0')
      if (g.score > prev) {
        localStorage.setItem('snake-high', g.score)
        setHighScore(g.score)
      }
      return
    }

    for (let i = 0; i < g.snake.length - 1; i++) {
      if (g.snake[i].x === newHead.x && g.snake[i].y === newHead.y) {
        g.running = false
        if (g.intervalId) clearInterval(g.intervalId)
        setGameState('gameover')
        recordGame(false, g.score)
        sound('lose')
        const prev = parseInt(localStorage.getItem('snake-high') || '0')
        if (g.score > prev) {
          localStorage.setItem('snake-high', g.score)
          setHighScore(g.score)
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
        g.speed = Math.max(MIN_SPEED, g.speed - SPEED_DECREASE)
        if (g.intervalId) clearInterval(g.intervalId)
        g.intervalId = setInterval(tick, g.speed)
      }
      g.food = spawnFood(newSnake)
      setScore(g.score)
      sound('win')
    }

    g.snake = newSnake
    setRenderTick(t => t + 1)
  }, [recordGame, sound])

  function startGame() {
    const g = gameRef.current
    if (g.intervalId) clearInterval(g.intervalId)
    dirQueueRef.current = []

    g.snake = getInitialSnake()
    g.direction = { x: 1, y: 0 }
    g.nextDirection = { x: 1, y: 0 }
    g.score = 0
    g.foodEaten = 0
    g.speed = INITIAL_SPEED
    g.running = true
    g.paused = false
    g.food = spawnFood(g.snake)
    g.intervalId = setInterval(tick, g.speed)

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
    const lines = [
      `🐍 Snake: ${score} points`,
      `⚡ Speed Level: ${Math.floor((INITIAL_SPEED - currentSpeed) / SPEED_DECREASE) + 1}`,
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
  const snakeSet = new Set(g.snake.map(s => `${s.x},${s.y}`))
  const speedLevel = Math.floor((INITIAL_SPEED - currentSpeed) / SPEED_DECREASE) + 1

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

  return (
    <div className="game-card slide-in" ref={gameCardRef}>
      <h2>Snake</h2>
      <p className="description">
        {gameState === 'idle' && 'Eat food to grow! Avoid walls and yourself.'}
        {gameState === 'playing' && 'Use arrow keys or WASD to move'}
        {gameState === 'paused' && 'Paused - Press Space to resume'}
        {gameState === 'gameover' && 'Game Over!'}
      </p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Score</div>
          <div className="hol-stat-num player">{score}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Speed</div>
          <div className="hol-stat-num">{speedLevel}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Best</div>
          <div className="hol-stat-num">{highScore}</div>
        </div>
      </div>

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
      }}>
        {grid}
      </div>

      {(gameState === 'playing' || gameState === 'paused') && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 12 }}>
          <button style={btnStyle} onClick={() => changeDirection({ x: 0, y: -1 })}>&#9650;</button>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={btnStyle} onClick={() => changeDirection({ x: -1, y: 0 })}>&#9664;</button>
            <button
              style={{ ...btnStyle, fontSize: 14, width: 48, height: 48 }}
              onClick={pauseResume}
            >
              {gameState === 'paused' ? '&#9654;' : '&#9646;&#9646;'}
            </button>
            <button style={btnStyle} onClick={() => changeDirection({ x: 1, y: 0 })}>&#9654;</button>
          </div>
          <button style={btnStyle} onClick={() => changeDirection({ x: 0, y: 1 })}>&#9660;</button>
        </div>
      )}

      {gameState === 'idle' && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="play-again-btn" onClick={startGame}>Start Game</button>
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
            <button className="play-again-btn" onClick={startGame}>Play Again</button>
            <button
              className="play-again-btn"
              style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => { setGameState('idle') }}
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

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        {gameState !== 'idle' && gameState !== 'gameover' && (
          <button
            onClick={() => {
              if (gameRef.current.intervalId) clearInterval(gameRef.current.intervalId)
              gameRef.current.running = false
              setGameState('idle')
              onPlayingChange?.(false)
            }}
            className="quit-btn"
          >
            Quit Game
          </button>
        )}
        {gameState === 'gameover' && (
          <button
            onClick={() => { setGameState('idle'); onPlayingChange?.(false) }}
            className="quit-btn"
          >
            New Game
          </button>
        )}
      </div>
    </div>
  )
}
