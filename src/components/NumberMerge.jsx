import { useState, useEffect, useCallback, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'

const MODES = [
  { name: 'Easy', emoji: '🟢', color: '#39ff14', size: 4, goal: 256, desc: 'Reach 256' },
  { name: 'Normal', emoji: '🟡', color: '#ffe600', size: 5, goal: 512, desc: 'Reach 512' },
  { name: 'Hard', emoji: '🟠', color: '#ff6b2b', size: 5, goal: 1024, desc: 'Reach 1024' },
  { name: 'Expert', emoji: '💀', color: '#ff2d7b', size: 6, goal: 2048, desc: 'Reach 2048' },
]

function createEmpty(size) {
  return Array(size).fill(null).map(() => Array(size).fill(0))
}

function addRandomTile(grid) {
  const empty = []
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid.length; c++)
      if (grid[r][c] === 0) empty.push([r, c])
  if (empty.length === 0) return { grid, pos: null }
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  const next = grid.map(row => [...row])
  next[r][c] = Math.random() < 0.9 ? 2 : 4
  return { grid: next, pos: `${r}-${c}` }
}

function moveRow(row) {
  const filtered = row.filter(v => v !== 0)
  const merged = []
  const mergedIndices = []
  let score = 0
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2)
      score += filtered[i] * 2
      mergedIndices.push(merged.length - 1)
      i++
    } else {
      merged.push(filtered[i])
    }
  }
  while (merged.length < row.length) merged.push(0)
  return { row: merged, score, mergedIndices }
}

function move(grid, dir) {
  const size = grid.length
  let g = grid.map(r => [...r])
  let score = 0
  const mergedPositions = new Set()
  const rotated = (arr, times) => {
    let a = arr.map(r => [...r])
    for (let t = 0; t < times; t++) {
      const n = a.map(r => [...r])
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          n[c][size - 1 - r] = a[r][c]
      a = n
    }
    return a
  }
  const rots = { left: 0, up: 3, right: 2, down: 1 }
  g = rotated(g, rots[dir])
  for (let r = 0; r < size; r++) {
    const { row: newRow, score: s, mergedIndices } = moveRow(g[r])
    for (const mi of mergedIndices) {
      const origR = dir === 'left' || dir === 'right' ? r : (dir === 'up' ? size - 1 - mi : mi)
      const origC = dir === 'left' || dir === 'right' ? (dir === 'left' ? mi : size - 1 - mi) : r
      mergedPositions.add(`${origR}-${origC}`)
    }
    g[r] = newRow
    score += s
  }
  g = rotated(g, (4 - rots[dir]) % 4)
  return { grid: g, score, mergedPositions }
}

function gridsEqual(a, b) {
  for (let r = 0; r < a.length; r++)
    for (let c = 0; c < a.length; c++)
      if (a[r][c] !== b[r][c]) return false
  return true
}

function canMove(grid) {
  for (const dir of ['left', 'right', 'up', 'down']) {
    const { grid: next } = move(grid, dir)
    if (!gridsEqual(grid, next)) return true
  }
  return false
}

function hasGoal(grid, goal) {
  for (const row of grid)
    for (const v of row)
      if (v >= goal) return true
  return false
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

export default function NumberMerge({ onPlayingChange }) {
  const [mode, setMode] = useState(null)
  const [grid, setGrid] = useState([])
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newTile, setNewTile] = useState(null)
  const [mergedTiles, setMergedTiles] = useState(new Set())
  const [scorePop, setScorePop] = useState(false)
  const gridKey = useRef(0)
  const sound = useSound()
  const { recordGame } = useStats('merge')
  const isPlaying = mode && !gameOver && !won

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  const makeMove = useCallback((dir) => {
    if (gameOver || won) return
    const { grid: next, score: gained, mergedPositions } = move(grid, dir)
    if (gridsEqual(grid, next)) return
    sound('click')
    const { grid: withTile, pos } = addRandomTile(next)
    const newScore = score + gained
    gridKey.current++
    setNewTile(pos)
    setMergedTiles(mergedPositions)
    if (gained > 0) {
      setScorePop(true)
      setTimeout(() => setScorePop(false), 300)
    }
    setGrid(withTile)
    setScore(newScore)
    if (newScore > bestScore) setBestScore(newScore)
    if (hasGoal(withTile, mode.goal)) {
      setWon(true)
      recordGame(true, newScore)
      sound('victory')
    } else if (!canMove(withTile)) {
      setGameOver(true)
      recordGame(false, newScore)
      sound('lose')
    }
  }, [grid, score, bestScore, gameOver, won, mode, sound, recordGame])

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
    setMode(m)
    setScore(0)
    setBestScore(0)
    setGameOver(false)
    setWon(false)
    setCopied(false)
    setNewTile(null)
    setMergedTiles(new Set())
    gridKey.current++
    let g = createEmpty(m.size)
    const t1 = addRandomTile(g)
    const t2 = addRandomTile(t1.grid)
    setGrid(t2.grid)
    setNewTile(t2.pos)
  }

  function shareResult() {
    const lines = [
      `🔢 Beat the bot at Number Merge (${mode.name})!`,
      `📊 Score: ${score} | Goal: ${mode.goal}`,
      won ? '🏆 Goal reached!' : `💀 Game over at ${grid.flat().filter(v => v > 0).length} tiles`,
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

      <div className="merge-grid" style={{ gridTemplateColumns: `repeat(${mode.size}, 1fr)` }}>
        {grid.flat().map((v, i) => {
          const key = `${Math.floor(i / mode.size)}-${i % mode.size}`
          const isNew = newTile === key
          const isMerged = mergedTiles.has(key)
          return (
            <div key={`${gridKey.current}-${i}`}
              className={`merge-tile ${isNew ? 'tile-new' : ''} ${isMerged ? 'tile-merged' : ''} ${v >= 128 ? 'tile-glow' : ''}`}
              style={{ background: tileColor(v), color: textColor(v) }}>
              {v || ''}
            </div>
          )
        })}
      </div>

      <div className="merge-controls">
        {DIRS.map(d => (
          <button key={d.key} className="merge-dir-btn" onClick={() => makeMove(d.dir)}>
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
