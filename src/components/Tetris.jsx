import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'
import useEffects from '../useEffects.jsx'
import { getAdaptiveDifficulty, getGameConfig } from '../difficulty'

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
  const [nextQueue, setNextQueue] = useState([])
  const [holdPiece, setHoldPiece] = useState(null)
  const [canHold, setCanHold] = useState(true)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [highScore, setHighScore] = useState(() => 0)
  const [copied, setCopied] = useState(false)
  const dropTimer = useRef(null)
  const gridRef = useRef(createGrid())
  const currentRef = useRef(null)
  const nextQueueRef = useRef([])
  const holdPieceRef = useRef(null)
  const canHoldRef = useRef(true)
  const scoreRef = useRef(0)
  const linesRef = useRef(0)
  const gameOverRef = useRef(false)
  const levelRef = useRef(0)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('tetris')
  const { spawnParticles, floatText, shakeScreen, renderParticles, shakeStyle } = useEffects()
  const isPlaying = difficulty && !gameOver

  const touchBtn = {
    width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(0,212,255,0.4)',
    background: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.1s', userSelect: 'none', WebkitTapHighlightColor: 'transparent',
  }

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])

  const getInterval = useCallback(() => {
    if (!difficulty) return 800
    const spd = SPEEDS.find(s => s.name === difficulty) || SPEEDS[1]
    const stats = JSON.parse(localStorage.getItem('arcade-stats') || '{}')
    const adaptiveLevel = getAdaptiveDifficulty('tetris', stats)
    const config = getGameConfig('tetris', adaptiveLevel)
    return Math.max(50, (config.dropInterval || spd.baseInterval) - linesRef.current * spd.speedUp)
  }, [difficulty])

  const fillNextQueue = useCallback(() => {
    while (nextQueueRef.current.length < 3) {
      nextQueueRef.current.push(randomPiece())
    }
    setNextQueue([...nextQueueRef.current])
  }, [])

  const spawnPiece = useCallback(() => {
    if (nextQueueRef.current.length === 0) fillNextQueue()
    const p = nextQueueRef.current.shift()
    fillNextQueue()
    if (collides(gridRef.current, p.shape, p.x, p.y)) {
      setGameOver(true)
      shakeScreen(6, 400)
      sound('death')
      const finalScore = scoreRef.current
      if (finalScore > highScore) {
        setHighScore(finalScore)
        saveHighScore('tetris', finalScore)
      }
      recordGame(finalScore, 0)
      return
    }
    currentRef.current = p
    setCurrent(p)
    canHoldRef.current = true
    setCanHold(true)
  }, [highScore, recordGame, sound, saveHighScore, fillNextQueue, shakeScreen])

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
        if (newLevel !== levelRef.current) {
          levelRef.current = newLevel
          setLevel(newLevel)
          floatText(150, 300, 'LEVEL UP!', '#b946ff')
          sound('levelup')
        }
        if (cleared >= 4) {
          shakeScreen(5, 350)
          floatText(140, 250, 'TETRIS!', '#ffe600')
          for (let i = 0; i < 25; i++) {
            spawnParticles(140 + (Math.random() - 0.5) * 200, 200 + Math.random() * 200, ['#00d4ff', '#ffe600', '#b946ff', '#39ff14'][i % 4], 1, { spread: Math.PI * 2, speed: 2, gravity: 0.05, life: 45, sizeMin: 3, sizeMax: 6, angle: Math.random() * Math.PI * 2 })
          }
        } else {
          floatText(140, 280, `+${pts}`, '#00d4ff')
          for (let r = 0; r < ROWS; r++) {
            if (newGrid[r].some(c => c) && !gridRef.current[r]) {
              for (let c = 0; c < COLS; c++) {
                spawnParticles(c * CELL + CELL / 2, r * CELL + CELL / 2, '#ffffff', 2, { spread: Math.PI, speed: 1.5, gravity: 0.05, life: 20, sizeMin: 2, sizeMax: 4, angle: -Math.PI / 2 })
              }
            }
          }
        }
        sound(cleared >= 4 ? 'win' : 'score')
      }
      spawnPiece()
    }
  }, [spawnPiece, sound, floatText, shakeScreen, spawnParticles])

  useEffect(() => {
    if (!isPlaying) return
    function startDrop() {
      dropTimer.current = setInterval(tick, getInterval())
    }
    startDrop()
    return () => clearInterval(dropTimer.current)
  }, [isPlaying, tick, getInterval])

  const doHold = useCallback(() => {
    if (!canHoldRef.current || gameOverRef.current) return
    const p = currentRef.current
    if (!p) return
    canHoldRef.current = false
    setCanHold(false)
    const held = holdPieceRef.current
    const resetPiece = { shape: SHAPES[p.name].shape.map(r => [...r]), color: SHAPES[p.name].color, name: p.name, x: Math.floor((COLS - SHAPES[p.name].shape[0].length) / 2), y: 0 }
    holdPieceRef.current = resetPiece
    setHoldPiece(resetPiece)
    if (held) {
      currentRef.current = held
      setCurrent(held)
    } else {
      spawnPiece()
    }
    sound('click')
  }, [spawnPiece, sound])

  const moveLeft = useCallback(() => {
    if (!isPlaying || gameOverRef.current) return
    const p = currentRef.current
    if (!p) return
    if (!collides(gridRef.current, p.shape, p.x - 1, p.y)) { p.x--; setCurrent({ ...p }); currentRef.current = p; sound('click') }
  }, [isPlaying, sound])

  const moveRight = useCallback(() => {
    if (!isPlaying || gameOverRef.current) return
    const p = currentRef.current
    if (!p) return
    if (!collides(gridRef.current, p.shape, p.x + 1, p.y)) { p.x++; setCurrent({ ...p }); currentRef.current = p; sound('click') }
  }, [isPlaying, sound])

  const moveDown = useCallback(() => {
    if (!isPlaying || gameOverRef.current) return
    const p = currentRef.current
    if (!p) return
    if (!collides(gridRef.current, p.shape, p.x, p.y + 1)) { p.y++; setCurrent({ ...p }); currentRef.current = p }
  }, [isPlaying])

  const rotatePiece = useCallback(() => {
    if (!isPlaying || gameOverRef.current) return
    const p = currentRef.current
    if (!p) return
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
  }, [isPlaying, sound])

  const hardDrop = useCallback(() => {
    if (!isPlaying || gameOverRef.current) return
    const p = currentRef.current
    if (!p) return
    let dropY = p.y
    while (!collides(gridRef.current, p.shape, p.x, dropY + 1)) dropY++
    for (let r = 0; r < p.shape.length; r++)
      for (let c = 0; c < p.shape[r].length; c++)
        if (p.shape[r][c]) spawnParticles((p.x + c) * CELL + CELL / 2, (dropY + r) * CELL + CELL / 2, p.color, 3, { spread: Math.PI, speed: 1.5, gravity: 0.08, life: 20, sizeMin: 2, sizeMax: 4, angle: -Math.PI / 2 })
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
      if (newLevel !== levelRef.current) {
        levelRef.current = newLevel
        setLevel(newLevel)
        floatText(150, 300, 'LEVEL UP!', '#b946ff')
        sound('levelup')
      }
      if (cleared >= 4) {
        shakeScreen(5, 350)
        floatText(140, 250, 'TETRIS!', '#ffe600')
        for (let i = 0; i < 25; i++) {
          spawnParticles(140 + (Math.random() - 0.5) * 200, 200 + Math.random() * 200, ['#00d4ff', '#ffe600', '#b946ff', '#39ff14'][i % 4], 1, { spread: Math.PI * 2, speed: 2, gravity: 0.05, life: 45, sizeMin: 3, sizeMax: 6, angle: Math.random() * Math.PI * 2 })
        }
      } else {
        floatText(140, 280, `+${pts}`, '#00d4ff')
      }
      sound(cleared >= 4 ? 'win' : 'score')
    }
    spawnPiece()
  }, [isPlaying, sound, spawnParticles, floatText, shakeScreen, spawnPiece])

  useEffect(() => {
    if (!isPlaying) return
    function handleKey(e) {
      if (gameOverRef.current) return
      const p = currentRef.current
      if (e.key === 'c' || e.key === 'C' || e.key === 'Shift') {
        e.preventDefault()
        doHold()
        return
      }
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
        for (let r = 0; r < p.shape.length; r++)
          for (let c = 0; c < p.shape[r].length; c++)
            if (p.shape[r][c]) spawnParticles((p.x + c) * CELL + CELL / 2, (dropY + r) * CELL + CELL / 2, p.color, 3, { spread: Math.PI, speed: 1.5, gravity: 0.08, life: 20, sizeMin: 2, sizeMax: 4, angle: -Math.PI / 2 })
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
          if (newLevel !== levelRef.current) {
            levelRef.current = newLevel
            setLevel(newLevel)
            floatText(150, 300, 'LEVEL UP!', '#b946ff')
            sound('levelup')
          }
          if (cleared >= 4) {
            shakeScreen(5, 350)
            floatText(140, 250, 'TETRIS!', '#ffe600')
            for (let i = 0; i < 25; i++) {
              spawnParticles(140 + (Math.random() - 0.5) * 200, 200 + Math.random() * 200, ['#00d4ff', '#ffe600', '#b946ff', '#39ff14'][i % 4], 1, { spread: Math.PI * 2, speed: 2, gravity: 0.05, life: 45, sizeMin: 3, sizeMax: 6, angle: Math.random() * Math.PI * 2 })
            }
          } else {
            floatText(140, 280, `+${pts}`, '#00d4ff')
          }
          sound(cleared >= 4 ? 'win' : 'score')
        }
        spawnPiece()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isPlaying, spawnPiece, sound, doHold, floatText, shakeScreen, spawnParticles])

  function startGame(diff) {
    setDifficulty(diff)
    gridRef.current = createGrid()
    setGrid(createGrid())
    scoreRef.current = 0
    linesRef.current = 0
    levelRef.current = 0
    nextQueueRef.current = []
    holdPieceRef.current = null
    canHoldRef.current = true
    setScore(0)
    setLines(0)
    setLevel(0)
    setHoldPiece(null)
    setCanHold(true)
    setNextQueue([])
    setGameOver(false)
    setCopied(false)
    fillNextQueue()
    const p = nextQueueRef.current.shift()
    fillNextQueue()
    currentRef.current = p
    setCurrent(p)
  }

  function handleShare() {
    const text = `🧱 Tetris — ${score} pts | ${lines} lines | Level ${level}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>Tetris</h2>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>← → Move | ↑ Rotate | ↓ Soft Drop | Space Hard Drop | C Hold</span>
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

  const dangerLevel = (() => {
    for (let r = 0; r < 4; r++) {
      if (gridRef.current[r] && gridRef.current[r].some(c => c)) return 1 - r / 4
    }
    return 0
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

  function renderMiniPiece(p, cellSize = 18) {
    if (!p) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {p.shape.map((row, r) => (
          <div key={r} style={{ display: 'flex' }}>
            {row.map((cell, c) => (
              <div key={c} style={{
                width: cellSize, height: cellSize,
                background: cell ? p.color : 'transparent',
                border: cell ? '1px solid rgba(255,255,255,0.15)' : 'none',
                borderRadius: 2,
                boxShadow: cell ? `inset 0 -1px 0 rgba(0,0,0,0.3)` : 'none',
              }} />
            ))}
          </div>
        ))}
      </div>
    )
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
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <div style={{ width: 80 }}>
          <div style={{ fontSize: 11, color: canHold ? 'var(--text-dim)' : 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>Hold</div>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 8, border: `1px solid ${canHold ? 'var(--border-glass)' : 'rgba(255,255,255,0.05)'}`, display: 'flex', justifyContent: 'center', minHeight: 60, opacity: canHold ? 1 : 0.4, transition: 'opacity 0.2s' }}>
            {holdPiece ? renderMiniPiece(holdPiece) : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>C</span>}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ border: `2px solid var(--border-glass)`, borderRadius: 8, overflow: 'hidden', background: 'rgba(0,0,0,0.4)', boxShadow: dangerLevel > 0 ? `inset 0 0 ${dangerLevel * 30}px rgba(255,45,123,${dangerLevel * 0.4}), 0 0 ${dangerLevel * 20}px rgba(255,45,123,${dangerLevel * 0.3})` : 'none', transition: 'box-shadow 0.3s', ...shakeStyle }}>
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
          {renderParticles({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 })}
        </div>
        <div style={{ width: 80 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>Next</div>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 6, border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', minHeight: 180 }}>
            {nextQueue.map((p, i) => (
              <div key={i} style={{ opacity: 1 - i * 0.25, transform: `scale(${1 - i * 0.1})`, transition: 'all 0.15s' }}>
                {renderMiniPiece(p, i === 0 ? 18 : 14)}
              </div>
            ))}
          </div>
          {highScore > 0 && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
              <div style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Best</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: 'var(--neon-orange)' }}>🏆 {highScore}</div>
            </div>
          )}
        </div>
      </div>
      {!gameOver && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={touchBtn} aria-label="Rotate" onClick={rotatePiece}>&#8635;</button>
            <button style={{ ...touchBtn, width: 52, height: 52, fontSize: 14 }} aria-label="Hard drop" onClick={hardDrop}>&#9660;&#9660;</button>
            <button style={{ ...touchBtn, fontSize: 14, opacity: canHold ? 1 : 0.4 }} aria-label="Hold" onClick={doHold}>C</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={touchBtn} aria-label="Move left" onClick={moveLeft}>&#9664;</button>
            <button style={touchBtn} aria-label="Move down" onClick={moveDown}>&#9660;</button>
            <button style={touchBtn} aria-label="Move right" onClick={moveRight}>&#9654;</button>
          </div>
        </div>
      )}
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
