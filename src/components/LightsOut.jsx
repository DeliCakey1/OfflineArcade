import { useState, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const GRID_SIZES = [
  { name: 'Easy', emoji: '🟢', desc: '3x3 grid', rows: 3, cols: 3, moves: 12 },
  { name: 'Normal', emoji: '🟡', desc: '4x4 grid', rows: 4, cols: 4, moves: 15 },
  { name: 'Hard', emoji: '🟠', desc: '5x5 grid', rows: 5, cols: 5, moves: 20 },
  { name: 'Insane', emoji: '💀', desc: '6x6 grid', rows: 6, cols: 6, moves: 25 },
]

function createGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(false))
}

function randomizeGrid(rows, cols, presses) {
  const grid = createGrid(rows, cols)
  for (let i = 0; i < presses; i++) {
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)
    toggle(grid, r, c, rows, cols)
  }
  if (grid.every(row => row.every(cell => !cell))) {
    grid[0][0] = true
    grid[0][1] = true
    grid[1][0] = true
  }
  return grid
}

function toggle(grid, r, c, rows, cols) {
  const dirs = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) grid[nr][nc] = !grid[nr][nc]
  }
}

function isSolved(grid) {
  return grid.every(row => row.every(cell => !cell))
}

export default function LightsOut({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [grid, setGrid] = useState(null)
  const [moves, setMoves] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [copied, setCopied] = useState(false)
  const sound = useSound()
  const { recordGame } = useStats('lightsout')
  const isPlaying = difficulty && !gameOver

  const startGame = useCallback((diffName) => {
    const d = GRID_SIZES.find(x => x.name === diffName) || GRID_SIZES[1]
    setDifficulty(diffName)
    const newGrid = randomizeGrid(d.rows, d.cols, d.moves)
    setGrid(newGrid.map(r => [...r]))
    setMoves(0)
    setGameOver(false)
    setWon(false)
    setCopied(false)
    sound('click')
  }, [sound])

  const handlePress = useCallback((r, c) => {
    if (gameOver) return
    const d = GRID_SIZES.find(x => x.name === difficulty) || GRID_SIZES[1]
    const newGrid = grid.map(row => [...row])
    toggle(newGrid, r, c, d.rows, d.cols)
    const newMoves = moves + 1
    setGrid(newGrid)
    setMoves(newMoves)
    if (isSolved(newGrid)) {
      setGameOver(true)
      setWon(true)
      recordGame(true, 0)
      sound('victory')
    } else if (newMoves >= d.moves) {
      setGameOver(true)
      setWon(false)
      recordGame(false, 0)
      sound('death')
    } else {
      sound('click')
    }
  }, [grid, moves, gameOver, difficulty, sound, recordGame])

  function handleShare() {
    const d = GRID_SIZES.find(x => x.name === difficulty) || GRID_SIZES[1]
    const text = `💡 Lights Out — ${d.name} | ${moves}/${d.moves} moves`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>💡 Lights Out</h2>
        <p className="description">Toggle lights to turn them all off. Each press flips adjacent lights too!</p>
        <div className="rps-mode-grid">
          {GRID_SIZES.map(d => (
            <button key={d.name} className="rps-mode-card" onClick={() => startGame(d.name)}>
              <div className="rps-mode-icon">{d.emoji}</div>
              <div className="rps-mode-label">{d.name}</div>
              <div className="rps-mode-desc">{d.desc}</div>
            </button>
          ))}
        </div>
        <div className="rps-history-item" style={{ marginTop: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Click/tap a light to toggle it and its neighbors</span>
        </div>
      </div>
    )
  }

  const d = GRID_SIZES.find(x => x.name === difficulty) || GRID_SIZES[1]
  const remaining = d.moves - moves
  const lightsOn = grid ? grid.flat().filter(Boolean).length : 0
  const totalLights = d.rows * d.cols

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => setDifficulty(null)} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Moves</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: remaining <= 3 ? 'var(--lose-color)' : 'var(--neon-yellow)' }}>{moves}/{d.moves}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Lights</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: lightsOn === 0 ? 'var(--win-color)' : 'var(--neon-cyan)' }}>{lightsOn}/{totalLights}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${d.cols}, 1fr)`, gap: 4, maxWidth: 300, width: '100%' }}>
          {grid && grid.map((row, r) => row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handlePress(r, c)}
              disabled={gameOver}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                border: '2px solid',
                borderColor: cell ? 'var(--neon-yellow)' : 'var(--border-glass)',
                background: cell ? 'var(--neon-yellow)' : 'rgba(255,255,255,0.05)',
                boxShadow: cell ? '0 0 12px rgba(255,230,0,0.4)' : 'none',
                cursor: gameOver ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                opacity: gameOver && !cell ? 0.4 : 1,
              }}
            />
          )))}
        </div>
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: won ? 'var(--win-color)' : 'var(--lose-color)', marginBottom: 8 }}>
            {won ? 'ALL OUT!' : 'OUT OF MOVES'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{moves} moves used</div>
          <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
