import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const COLS = 10
const ROWS = 20
const CELL = 28

const SHAPES = {
  I: { shape: [[1,1,1,1]], color: '#00d4ff' },
  O: { shape: [[1,1],[1,1]], color: '#ffe600' },
  T: { shape: [[0,1,0],[1,1,1]], color: '#b946ff' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#39ff14' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#ff2d7b' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#3b82f6' },
  L: { shape: [[0,0,1],[1,1,1]], color: '#f97316' },
}

const PIECE_NAMES = Object.keys(SHAPES)

const SPEEDS = [
  { name: 'Easy', emoji: '🟢', desc: 'Starts slow, gradual increase', baseInterval: 800, speedUp: 30 },
  { name: 'Normal', emoji: '🟡', desc: 'Standard Tetris pace', baseInterval: 500, speedUp: 40 },
  { name: 'Hard', emoji: '🟠', desc: 'Fast from the start', baseInterval: 300, speedUp: 50 },
  { name: 'Insane', emoji: '💀', desc: 'Ruthless speed', baseInterval: 150, speedUp: 60 },
]

function createGrid() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)) }

function rotate(shape) {
  const rows = shape.length, cols = shape[0].length
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0))
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      rotated[c][rows - 1 - r] = shape[r][c]
  return rotated
}

function randomPiece() {
  const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)]
  const { shape, color } = SHAPES[name]
  return { shape: shape.map(r => [...r]), color, name, x: Math.floor((COLS - shape[0].length) / 2), y: 0 }
}

function collides(grid, shape, px, py) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        const nx = px + c, ny = py + r
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true
        if (ny >= 0 && grid[ny][nx]) return true
      }
  return false
}

function merge(grid, piece) {
  const newGrid = grid.map(r => [...r])
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c]) {
        const ny = piece.y + r
        if (ny >= 0) newGrid[ny][piece.x + c] = piece.color
      }
  return newGrid
}

function clearLines(grid) {
  const newGrid = grid.filter(r => r.some(c => !c))
  const cleared = ROWS - newGrid.length
  while (newGrid.length < ROWS) newGrid.unshift(Array(COLS).fill(null))
  return { grid: newGrid, cleared }
}

function calcScore(lines, level) {
  const pts = [0, 100, 300, 500, 800]
  return (pts[lines] || 0) * (level + 1)
}

export default function Tetris({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [grid, setGrid] = useState(createGrid)
  const [current, setCurrent] = useState(null)
  const [next, setNext] = useState(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('tetris-high') || '0') } catch { return 0 }
  })
  const [copied, setCopied] = useState(false)
  const dropTimer = useRef(null)
  const gridRef = useRef(createGrid())
  const currentRef = useRef(null)
  const nextRef = useRef(null)
  const scoreRef = useRef(0)
  const linesRef = useRef(0)
  const gameOverRef = useRef(false)
  const levelRef = useRef(0)
  const sound = useSound()
  const { recordGame, gameStats } = useStats('tetris')
  const isPlaying = difficulty && !gameOver

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])

  const getInterval = useCallback(() => {
    if (!difficulty) return 800
    const spd = SPEEDS.find(s => s.name === difficulty) || SPEEDS[1]
    return Math.max(50, spd.baseInterval - linesRef.current * spd.speedUp)
  }, [difficulty])

  const spawnPiece = useCallback(() => {
    const p = nextRef.current || randomPiece()
    nextRef.current = randomPiece()
    setNext(nextRef.current)
    if (collides(gridRef.current, p.shape, p.x, p.y)) {
      setGameOver(true)
      sound('lose')
      const finalScore = scoreRef.current
      if (finalScore > highScore) {
        setHighScore(finalScore)
        try { localStorage.setItem('tetris-high', String(finalScore)) } catch {}
      }
      recordGame(finalScore, 0)
      return
    }
    currentRef.current = p
    setCurrent(p)
  }, [highScore, recordGame, sound])

  const tick = useCallback(() => {
    if (gameOverRef.current) return
    const p = currentRef.current
    if (!p) { spawnPiece(); return }
    if (!collides(gridRef.current, p.shape, p.x, p.y + 1)) {
      p.y++
      setCurrent({ ...p })
      currentRef.current = p
    } else {
      gridRef.current = merge(gridRef.current, p)
      const { grid: newGrid, cleared } = clearLines(gridRef.current)
      gridRef.current = newGrid
      setGrid(newGrid.map(r => [...r]))
      if (cleared > 0) {
        const pts = calcScore(cleared, levelRef.current)
        scoreRef.current += pts
        linesRef.current += cleared
        setScore(scoreRef.current)
        setLines(linesRef.current)
        const newLevel = Math.floor(linesRef.current / 10)
        if (newLevel !== levelRef.current) { levelRef.current = newLevel; setLevel(newLevel) }
        sound(cleared >= 4 ? 'win' : 'click')
      }
      spawnPiece()
    }
  }, [spawnPiece, sound])

  useEffect(() => {
    if (!isPlaying) return
    function startDrop() {
      dropTimer.current = setInterval(tick, getInterval())
    }
    startDrop()
    return () => clearInterval(dropTimer.current)
  }, [isPlaying, tick, getInterval])

  useEffect(() => {
    if (!isPlaying) return
    function handleKey(e) {
      if (gameOverRef.current) return
      const p = currentRef.current
      if (!p) return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        if (!collides(gridRef.current, p.shape, p.x - 1, p.y)) { p.x--; setCurrent({ ...p }); currentRef.current = p; sound('click') }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        if (!collides(gridRef.current, p.shape, p.x + 1, p.y)) { p.x++; setCurrent({ ...p }); currentRef.current = p; sound('click') }
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        if (!collides(gridRef.current, p.shape, p.x, p.y + 1)) { p.y++; setCurrent({ ...p }); currentRef.current = p }
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        const rotated = rotate(p.shape)
        let kick = 0
        if (!collides(gridRef.current, rotated, p.x, p.y)) kick = 0
        else if (!collides(gridRef.current, rotated, p.x - 1, p.y)) kick = -1
        else if (!collides(gridRef.current, rotated, p.x + 1, p.y)) kick = 1
        else if (!collides(gridRef.current, rotated, p.x - 2, p.y)) kick = -2
        else if (!collides(gridRef.current, rotated, p.x + 2, p.y)) kick = 2
        else return
        p.shape = rotated; p.x += kick
        setCurrent({ ...p }); currentRef.current = p; sound('click')
      } else if (e.key === ' ') {
        e.preventDefault()
        let dropY = p.y
        while (!collides(gridRef.current, p.shape, p.x, dropY + 1)) dropY++
        p.y = dropY
        gridRef.current = merge(gridRef.current, p)
        const { grid: newGrid, cleared } = clearLines(gridRef.current)
        gridRef.current = newGrid
        setGrid(newGrid.map(r => [...r]))
        if (cleared > 0) {
          const pts = calcScore(cleared, levelRef.current)
          scoreRef.current += pts
          linesRef.current += cleared
          setScore(scoreRef.current)
          setLines(linesRef.current)
          const newLevel = Math.floor(linesRef.current / 10)
          if (newLevel !== levelRef.current) { levelRef.current = newLevel; setLevel(newLevel) }
          sound(cleared >= 4 ? 'win' : 'click')
        }
        spawnPiece()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isPlaying, spawnPiece, sound])

  function startGame(diff) {
    setDifficulty(diff)
    gridRef.current = createGrid()
    setGrid(createGrid())
    scoreRef.current = 0
    linesRef.current = 0
    levelRef.current = 0
    setScore(0)
    setLines(0)
    setLevel(0)
    setGameOver(false)
    setCopied(false)
    const p = randomPiece()
    currentRef.current = p
    setCurrent(p)
    nextRef.current = randomPiece()
    setNext(nextRef.current)
  }

  function handleShare() {
    const text = `🎮 Tetris — ${score} pts | ${lines} lines | Level ${level}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🧱 Tetris</h2>
        <p className="description">Stack blocks, clear lines!</p>
        <div className="rps-mode-grid">
          {SPEEDS.map(s => (
            <button key={s.name} className="rps-mode-card" onClick={() => startGame(s.name)}>
              <div className="rps-mode-icon">{s.emoji}</div>
              <div className="rps-mode-label">{s.name}</div>
              <div className="rps-mode-desc">{s.desc}</div>
            </button>
          ))}
        </div>
        <div className="rps-history-item" style={{ marginTop: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Controls: ← → Move | ↑ Rotate | ↓ Soft Drop | Space Hard Drop</span>
        </div>
      </div>
    )
  }

  const ghostY = (() => {
    if (!current) return 0
    let gy = current.y
    while (!collides(gridRef.current, current.shape, current.x, gy + 1)) gy++
    return gy
  })()

  const renderGrid = grid.map(r => [...r])
  if (current && !gameOver) {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) {
          const ny = current.y + r
          if (ny >= 0 && ny < ROWS) renderGrid[ny][current.x + c] = current.color
        }
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) {
          const gy = ghostY + r
          if (gy >= 0 && gy < ROWS && !renderGrid[gy][current.x + c])
            renderGrid[gy][current.x + c] = 'rgba(255,255,255,0.15)'
        }
  }

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <QuitConfirmButton onQuit={() => { setDifficulty(null); clearInterval(dropTimer.current) }} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Score</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-yellow)' }}>{score}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Lines</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-green)' }}>{lines}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Level</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-purple)' }}>{level}</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <div>
          <div style={{ border: '2px solid var(--border-glass)', borderRadius: 8, overflow: 'hidden', background: 'rgba(0,0,0,0.4)' }}>
            {renderGrid.map((row, r) => (
              <div key={r} style={{ display: 'flex' }}>
                {row.map((cell, c) => (
                  <div key={c} style={{
                    width: CELL, height: CELL,
                    background: cell || 'rgba(255,255,255,0.03)',
                    border: cell ? `1px solid rgba(255,255,255,0.15)` : '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.05s',
                    boxShadow: cell && cell !== 'rgba(255,255,255,0.15)' ? `inset 0 -2px 0 rgba(0,0,0,0.3), 0 0 4px ${cell}33` : 'none',
                  }} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 100 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>Next</div>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 8, border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'center', minHeight: 80 }}>
            {next && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {next.shape.map((row, r) => (
                  <div key={r} style={{ display: 'flex' }}>
                    {row.map((cell, c) => (
                      <div key={c} style={{
                        width: 22, height: 22,
                        background: cell ? next.color : 'transparent',
                        border: cell ? '1px solid rgba(255,255,255,0.15)' : 'none',
                        borderRadius: 2,
                        boxShadow: cell ? `inset 0 -1px 0 rgba(0,0,0,0.3)` : 'none',
                      }} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          {highScore > 0 && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
              <div style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Best</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: 'var(--neon-orange)' }}>🏆 {highScore}</div>
            </div>
          )}
        </div>
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 20 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: 'var(--lose-color)', marginBottom: 8 }}>GAME OVER</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{score} points — {lines} lines — Level {level}</div>
          {score > 0 && <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>}
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
