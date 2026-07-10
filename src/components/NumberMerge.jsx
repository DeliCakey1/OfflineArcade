import { useState, useEffect, useCallback, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'

const MODES = [
  { name: 'Easy', emoji: '🟢', color: '#39ff14', size: 4, goal: 256, desc: 'Reach 256' },
  { name: 'Normal', emoji: '🟡', color: '#ffe600', size: 5, goal: 512, desc: 'Reach 512' },
  { name: 'Hard', emoji: '🟠', color: '#ff6b2b', size: 5, goal: 1024, desc: 'Reach 1024' },
  { name: 'Expert', emoji: '💀', color: '#ff2d7b', size: 6, goal: 2048, desc: 'Reach 2048' },
]

let tileIdCounter = 0
function nextId() { return ++tileIdCounter }

function createTile(value, row, col) {
  return { id: nextId(), value, row, col, isNew: true, mergedFrom: null }
}

function tilesToGrid(tiles, size) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0))
  for (const t of tiles) grid[t.row][t.col] = t.value
  return grid
}

function gridHasGoal(grid, goal) {
  for (const row of grid)
    for (const v of row)
      if (v >= goal) return true
  return false
}

function canMoveGrid(grid) {
  const size = grid.length
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) return true
      if (c + 1 < size && grid[r][c] === grid[r][c + 1]) return true
      if (r + 1 < size && grid[r][c] === grid[r + 1][c]) return true
    }
  return false
}

function addRandomTileToTiles(tiles, size) {
  const occupied = new Set(tiles.map(t => `${t.row},${t.col}`))
  const empty = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!occupied.has(`${r},${c}`)) empty.push([r, c])
  if (empty.length === 0) return tiles
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  const val = Math.random() < 0.9 ? 2 : 4
  return [...tiles, createTile(val, r, c)]
}

function slideTiles(tiles, dir, size) {
  const dirs = {
    left:  { dr: 0, dc: -1, sortA: 'row', sortB: 'col' },
    right: { dr: 0, dc: 1,  sortA: 'row', sortB: 'col', reverse: true },
    up:    { dr: -1, dc: 0, sortA: 'col', sortB: 'row' },
    down:  { dr: 1, dc: 0, sortA: 'col', sortB: 'row', reverse: true },
  }
  const d = dirs[dir]
  const sorted = [...tiles].sort((a, b) => {
    const a1 = a[d.sortA], b1 = b[d.sortA]
    if (a1 !== b1) return a1 - b1
    const a2 = a[d.sortB], b2 = b[d.sortB]
    return d.reverse ? b2 - a2 : a2 - b2
  })

  const occupied = new Set()
  const newTiles = []
  const mergeTargets = []

  for (const tile of sorted) {
    let r = tile.row, c = tile.col
    while (true) {
      const nr = r + d.dr, nc = c + d.dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) break
      if (occupied.has(`${nr},${nc}`)) break
      r = nr; c = nc
    }
    const key = `${r},${c}`
    const existing = newTiles.find(t => t.row === r && t.col === c)
    if (existing && existing.value === tile.value && !existing.mergedFrom) {
      existing.value *= 2
      existing.mergedFrom = [existing.id, tile.id]
      existing.isNew = false
      occupied.add(key)
      mergeTargets.push(key)
    } else {
      occupied.add(key)
      newTiles.push({ ...tile, row: r, col: c, isNew: false, mergedFrom: null })
    }
  }

  return { tiles: newTiles, mergeTargets }
}

function tileColor(v) {
  const colors = {
    0: 'transparent', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
    32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
    512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
  }
  return colors[v] || '#3c3a32'
}

function textColor(v) {
  return v <= 4 ? '#776e65' : '#f9f6f2'
}

const DIRS = [
  { key: 'ArrowUp', label: '↑', dir: 'up' },
  { key: 'ArrowLeft', label: '←', dir: 'left' },
  { key: 'ArrowRight', label: '→', dir: 'right' },
  { key: 'ArrowDown', label: '↓', dir: 'down' },
]

const SLIDE_MS = 120

export default function NumberMerge({ onPlayingChange }) {
  const [mode, setMode] = useState(null)
  const [tiles, setTiles] = useState([])
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [copied, setCopied] = useState(false)
  const [scorePop, setScorePop] = useState(false)
  const [slideDir, setSlideDir] = useState(null)
  const [animating, setAnimating] = useState(false)
  const animTimer = useRef(null)
  const sound = useSound()
  const { recordGame } = useStats('merge')
  const isPlaying = mode && !gameOver && !won

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    return () => { if (animTimer.current) clearTimeout(animTimer.current) }
  }, [])

  const makeMove = useCallback((dir) => {
    if (gameOver || won || animating) return
    const grid = tilesToGrid(tiles, mode.size)
    const { tiles: slid } = slideTiles(tiles, dir, mode.size)
    const newGrid = tilesToGrid(slid, mode.size)
    const gridsEqual = grid.every((row, r) => row.every((v, c) => v === newGrid[r][c]))
    if (gridsEqual) return

    sound('click')
    let gained = 0
    for (const t of slid) {
      if (t.mergedFrom) gained += t.value
    }

    setAnimating(true)
    setSlideDir(dir)
    setTiles(slid)

    animTimer.current = setTimeout(() => {
      const mergedTiles = slid.map(t => {
        if (t.mergedFrom) return { ...t, mergedFrom: null, isNew: false }
        return { ...t, isNew: false }
      })
      const finalTiles = addRandomTileToTiles(mergedTiles, mode.size)
      const finalGrid = tilesToGrid(finalTiles, mode.size)
      const newScore = score + gained
      setTiles(finalTiles)
      setSlideDir(null)
      setAnimating(false)
      if (gained > 0) {
        setScorePop(true)
        setTimeout(() => setScorePop(false), 300)
      }
      setScore(newScore)
      if (newScore > bestScore) setBestScore(newScore)
      if (gridHasGoal(finalGrid, mode.goal)) {
        setWon(true)
        recordGame(true, newScore)
        sound('victory')
      } else if (!canMoveGrid(finalGrid)) {
        setGameOver(true)
        recordGame(false, newScore)
        sound('lose')
      }
    }, SLIDE_MS)
  }, [tiles, score, bestScore, gameOver, won, mode, animating, sound, recordGame])

  useEffect(() => {
    if (!mode || gameOver || won) return
    function handleKey(e) {
      const d = DIRS.find(d => d.key === e.key)
      if (!d) return
      e.preventDefault()
      makeMove(d.dir)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mode, gameOver, won, makeMove])

  function startGame(m) {
    tileIdCounter = 0
    setMode(m)
    setScore(0)
    setBestScore(0)
    setGameOver(false)
    setWon(false)
    setCopied(false)
    setSlideDir(null)
    setAnimating(false)
    let t = []
    t = addRandomTileToTiles(t, m.size)
    t = addRandomTileToTiles(t, m.size)
    setTiles(t)
  }

  function shareResult() {
    const lines = [
      `🔢 Beat the bot at Number Merge (${mode.name})!`,
      `📊 Score: ${score} | Goal: ${mode.goal}`,
      won ? '🏆 Goal reached!' : `💀 Game over at ${tiles.length} tiles`,
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
        <h2>Number Merge</h2>
        <p className="description">Slide tiles to merge same numbers. Reach the goal!</p>
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

  const tileSize = 100 / mode.size

  return (
    <div className="game-card slide-in">
      <h2>Number Merge</h2>
      <p className="description">Use arrow keys or buttons to slide & merge</p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Score</div>
          <div className={`hol-stat-num player ${scorePop ? 'score-pop' : ''}`}>{score}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Best</div>
          <div className="hol-stat-num">{bestScore}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Goal</div>
          <div className="hol-stat-num" style={{ color: 'var(--neon-green)' }}>{mode.goal}</div>
        </div>
      </div>

      <div className="merge-board" style={{ aspectRatio: '1' }}>
        <div className="merge-bg-grid" style={{ gridTemplateColumns: `repeat(${mode.size}, 1fr)` }}>
          {Array(mode.size * mode.size).fill(0).map((_, i) => (
            <div key={i} className="merge-bg-cell" />
          ))}
        </div>
        {tiles.map(t => {
          const left = t.col * tileSize
          const top = t.row * tileSize
          const isNew = t.isNew
          const isMerged = !!t.mergedFrom
          return (
            <div key={t.id}
              className={`merge-tile ${isNew ? 'tile-new' : ''} ${isMerged ? 'tile-merged' : ''} ${t.value >= 128 ? 'tile-glow' : ''}`}
              style={{
                position: 'absolute',
                width: `calc(${tileSize}% - 6px)`,
                height: `calc(${tileSize}% - 6px)`,
                left: `calc(${left}% + 3px)`,
                top: `calc(${top}% + 3px)`,
                transition: slideDir ? `left ${SLIDE_MS}ms ease, top ${SLIDE_MS}ms ease` : 'none',
                background: tileColor(t.value),
                color: textColor(t.value),
                zIndex: isMerged ? 2 : 1,
              }}>
              {t.value}
            </div>
          )
        })}
      </div>

      <div className="merge-controls">
        {DIRS.map(d => (
          <button key={d.key} className="merge-dir-btn" onClick={() => makeMove(d.dir)} disabled={animating}>
            {d.label}
          </button>
        ))}
      </div>

      {(gameOver || won) && (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{won ? '🏆' : '💀'}</div>
          <div className={`result-text ${won ? 'win' : 'lose'}`}>
            {won ? `Reached ${mode.goal}!` : 'No Moves Left!'}
          </div>
          <div className="rps-final-score">
            <span className="player">{score}</span>
            <span className="sep">points</span>
            <span className="bot">Best: {bestScore}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => startGame(mode)}>Play Again</button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => setMode(null)}>Change Difficulty</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={() => { setMode(null); onPlayingChange?.(false) }} className="quit-btn">
          {(gameOver || won) ? 'New Game' : 'Quit Game'}
        </button>
      </div>
    </div>
  )
}
