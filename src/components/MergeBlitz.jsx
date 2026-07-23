import { useState, useCallback, useEffect, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'
import useEffects from '../useEffects.jsx'

const GRID = 4
const CELL = 64
const GAP = 4

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: '120 seconds, slow timer', time: 120, speedMult: 1 },
  { name: 'Normal', emoji: '🟡', desc: '90 seconds, standard pace', time: 90, speedMult: 1 },
  { name: 'Hard', emoji: '🟠', desc: '60 seconds, fast spawn', time: 60, speedMult: 1.5 },
  { name: 'Insane', emoji: '💀', desc: '45 seconds, double speed', time: 45, speedMult: 2 },
]

const TILE_COLORS = {
  2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
  32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
  512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
}

function createGrid() { return Array.from({ length: GRID }, () => Array(GRID).fill(0)) }

function addRandomTile(grid) {
  const empty = []
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (grid[r][c] === 0) empty.push({ r, c })
  if (empty.length === 0) return grid
  const { r, c } = empty[Math.floor(Math.random() * empty.length)]
  grid[r][c] = Math.random() < 0.9 ? 2 : 4
  return grid
}

function slideRow(row) {
  let filtered = row.filter(v => v !== 0)
  let merged = 0, score = 0
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2
      score += filtered[i]
      filtered.splice(i + 1, 1)
      merged++
    }
  }
  while (filtered.length < GRID) filtered.push(0)
  return { row: filtered, merged, score }
}

function rotateCW(grid) {
  const n = grid.length
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => grid[n - 1 - c][r]))
}

function move(grid, dir) {
  let g = grid.map(r => [...r])
  let score = 0, moved = false, merges = 0
  for (let i = 0; i < dir; i++) g = rotateCW(g)
  for (let r = 0; r < GRID; r++) {
    const { row, merged, score: s } = slideRow(g[r])
    if (JSON.stringify(row) !== JSON.stringify(g[r])) moved = true
    g[r] = row
    score += s
    merges += merged
  }
  for (let i = 0; i < (4 - dir) % 4; i++) g = rotateCW(g)
  return { grid: g, moved, score, merges }
}

function canMove(grid) {
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c] === 0) return true
      if (c < GRID - 1 && grid[r][c] === grid[r][c + 1]) return true
      if (r < GRID - 1 && grid[r][c] === grid[r + 1][c]) return true
    }
  return false
}

function highestTile(grid) {
  return Math.max(...grid.flat())
}

export default function MergeBlitz({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [grid, setGrid] = useState(createGrid)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [gameOver, setGameOver] = useState(false)
  const [bestScore, setBestScore] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [copied, setCopied] = useState(false)
  const gridRef = useRef(createGrid())
  const scoreRef = useRef(0)
  const timerRef = useRef(null)
  const gameOverRef = useRef(false)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('mergeblitz')
  const { spawnParticles, floatText, shakeScreen, renderParticles, shakeStyle } = useEffects()
  const isPlaying = difficulty && !gameOver

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])

  useEffect(() => {
    if (!isPlaying || gameOver) return
    const d = DIFFICULTIES.find(x => x.name === difficulty) || DIFFICULTIES[1]
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          gameOverRef.current = true
          setGameOver(true)
          sound('death')
          const finalScore = scoreRef.current
          if (finalScore > bestScore) { setBestScore(finalScore); saveHighScore('mergeblitz', finalScore) }
          recordGame(finalScore, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [isPlaying, difficulty, bestScore, recordGame, saveHighScore, sound])

  const doMove = useCallback((dir) => {
    if (gameOverRef.current) return
    const { grid: newGrid, moved, score: gained, merges } = move(gridRef.current, dir)
    if (!moved) return
    addRandomTile(newGrid)
    gridRef.current = newGrid
    setGrid(newGrid.map(r => [...r]))
    if (gained > 0) {
      const total = gained * multiplier
      scoreRef.current += total
      setScore(scoreRef.current)
      floatText(140, 200, `+${total}`, merges >= 2 ? '#ffe600' : '#00d4ff')
      if (merges >= 2) {
        setMultiplier(prev => Math.min(prev + 1, 8))
        sound('score')
      }
    }
    if (!canMove(newGrid)) {
      clearInterval(timerRef.current)
      gameOverRef.current = true
      setGameOver(true)
      sound('death')
      const finalScore = scoreRef.current
      if (finalScore > bestScore) { setBestScore(finalScore); saveHighScore('mergeblitz', finalScore) }
      recordGame(finalScore, 0)
    }
  }, [multiplier, bestScore, recordGame, saveHighScore, sound, floatText])

  useEffect(() => {
    if (!isPlaying) return
    function handleKey(e) {
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); doMove(0) }
      else if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); doMove(1) }
      else if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); doMove(2) }
      else if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); doMove(3) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isPlaying, doMove])

  let touchStartX = 0, touchStartY = 0
  function handleTouchStart(e) { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY }
  function handleTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 2 : 0)
    else doMove(dy > 0 ? 3 : 1)
  }

  function startGame(diffName) {
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    setDifficulty(diffName)
    const g = createGrid()
    addRandomTile(g)
    addRandomTile(g)
    gridRef.current = g
    setGrid(g.map(r => [...r]))
    scoreRef.current = 0
    gameOverRef.current = false
    setScore(0)
    setTimeLeft(d.time)
    setMultiplier(1)
    setGameOver(false)
    setCopied(false)
  }

  function handleShare() {
    const d = DIFFICULTIES.find(x => x.name === difficulty) || DIFFICULTIES[1]
    const text = `⚡ Merge Blitz — ${score} pts | Tile ${highestTile(grid)} | ${d.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>⚡ Merge Blitz</h2>
        <p className="description">Timed 2048! Merge tiles before time runs out. Chain merges for combo multipliers!</p>
        <div className="rps-mode-grid">
          {DIFFICULTIES.map(d => (
            <button key={d.name} className="rps-mode-card" onClick={() => startGame(d.name)}>
              <div className="rps-mode-icon">{d.emoji}</div>
              <div className="rps-mode-label">{d.name}</div>
              <div className="rps-mode-desc">{d.desc}</div>
            </button>
          ))}
        </div>
        <div className="rps-history-item" style={{ marginTop: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>← → ↑ ↓ or swipe to slide tiles</span>
        </div>
      </div>
    )
  }

  const d = DIFFICULTIES.find(x => x.name === difficulty) || DIFFICULTIES[1]
  const timePercent = (timeLeft / d.time) * 100

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => { setDifficulty(null); clearInterval(timerRef.current) }} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Score</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-yellow)' }}>{score}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Time</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: timeLeft <= 10 ? 'var(--lose-color)' : 'var(--neon-cyan)' }}>{timeLeft}s</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Combo</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: multiplier > 1 ? 'var(--neon-orange)' : 'var(--text-dim)' }}>x{multiplier}</div></div>
        </div>
      </div>

      <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, background: timeLeft <= 10 ? 'var(--lose-color)' : 'var(--neon-cyan)', width: `${timePercent}%`, transition: 'width 1s linear' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div style={{ position: 'relative', ...shakeStyle }}>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${GRID}, ${CELL}px)`, gap: GAP,
            background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 8,
            border: '2px solid var(--border-glass)',
          }}>
            {grid.flat().map((val, i) => (
              <div key={i} style={{
                width: CELL, height: CELL, borderRadius: 6,
                background: val ? (TILE_COLORS[val] || '#3c3a32') : 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: val >= 1024 ? 14 : val >= 128 ? 16 : 20,
                color: val <= 4 ? '#776e65' : '#f9f6f2',
                fontWeight: 'bold',
                transition: 'all 0.1s ease',
                boxShadow: val ? `0 0 8px ${TILE_COLORS[val] || '#3c3a32'}44` : 'none',
              }}>
                {val || ''}
              </div>
            ))}
          </div>
          {renderParticles({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 })}
        </div>
      </div>

      {!gameOver && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button style={touchBtn} onClick={() => doMove(1)}>&#9650;</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={touchBtn} onClick={() => doMove(0)}>&#9664;</button>
            <button style={touchBtn} onClick={() => doMove(3)}>&#9660;</button>
            <button style={touchBtn} onClick={() => doMove(2)}>&#9654;</button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: 'var(--lose-color)', marginBottom: 8 }}>TIME'S UP!</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{score} points — Highest tile: {highestTile(grid)}</div>
          <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}

const touchBtn = {
  width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(255,230,0,0.4)',
  background: 'rgba(255,230,0,0.1)', color: '#ffe600', fontSize: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  userSelect: 'none', WebkitTapHighlightColor: 'transparent',
}
