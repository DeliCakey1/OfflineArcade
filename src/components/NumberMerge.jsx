import { useState, useEffect, useCallback, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'

const BOARD_SIZES = [3, 4, 5, 6, 7, 8]
const GOAL_PRESETS = [128, 256, 512, 1024, 2048, 4096, 8192]

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

  const newTiles = []
  const consumed = new Set()

  for (const tile of sorted) {
    if (consumed.has(tile.id)) continue
    let r = tile.row, c = tile.col
    while (true) {
      const nr = r + d.dr, nc = c + d.dc
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) break
      const occupant = newTiles.find(t => t.row === nr && t.col === nc && !consumed.has(t.id))
      if (occupant) {
        if (occupant.value === tile.value && !occupant.mergedFrom) {
          occupant.value *= 2
          occupant.mergedFrom = [occupant.id, tile.id]
          occupant.isNew = false
          consumed.add(tile.id)
        }
        break
      }
      r = nr; c = nc
    }
    if (!consumed.has(tile.id)) {
      newTiles.push({ ...tile, row: r, col: c, isNew: false, mergedFrom: null })
    }
  }

  return { tiles: newTiles }
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
  const [screen, setScreen] = useState('menu')
  const [boardSize, setBoardSize] = useState(4)
  const [goal, setGoal] = useState(2048)
  const [goalInput, setGoalInput] = useState('2048')
  const [infinite, setInfinite] = useState(false)
  const [tiles, setTiles] = useState([])
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [goalReached, setGoalReached] = useState(false)
  const [copied, setCopied] = useState(false)
  const [scorePop, setScorePop] = useState(false)
  const [slideDir, setSlideDir] = useState(null)
  const [animating, setAnimating] = useState(false)
  const animTimer = useRef(null)
  const sound = useSound()
  const { recordGame } = useStats('merge')
  const isPlaying = screen === 'game' && !gameOver && !won && !goalReached

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    return () => { if (animTimer.current) clearTimeout(animTimer.current) }
  }, [])

  const makeMove = useCallback((dir) => {
    if (gameOver || won || animating) return
    const grid = tilesToGrid(tiles, boardSize)
    const { tiles: slid } = slideTiles(tiles, dir, boardSize)
    const newGrid = tilesToGrid(slid, boardSize)
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
      const finalTiles = addRandomTileToTiles(mergedTiles, boardSize)
      const finalGrid = tilesToGrid(finalTiles, boardSize)
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
      if (!infinite && gridHasGoal(finalGrid, goal) && !goalReached) {
        setGoalReached(true)
        recordGame(true, newScore)
        sound('victory')
      } else if (!canMoveGrid(finalGrid)) {
        setGameOver(true)
        recordGame(false, newScore)
        sound('lose')
      }
    }, SLIDE_MS)
  }, [tiles, score, bestScore, gameOver, won, boardSize, goal, infinite, animating, sound, recordGame])

  useEffect(() => {
    if (screen !== 'game' || gameOver || won || goalReached) return
    function handleKey(e) {
      const d = DIRS.find(d => d.key === e.key)
      if (!d) return
      e.preventDefault()
      makeMove(d.dir)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [screen, gameOver, won, makeMove])

  function startGame(size, goalVal, isInfinite) {
    tileIdCounter = 0
    setBoardSize(size)
    setGoal(goalVal)
    setInfinite(isInfinite)
    setScore(0)
    setBestScore(0)
    setGameOver(false)
    setWon(false)
    setGoalReached(false)
    setCopied(false)
    setSlideDir(null)
    setAnimating(false)
    setScreen('game')
    let t = []
    t = addRandomTileToTiles(t, size)
    t = addRandomTileToTiles(t, size)
    setTiles(t)
  }

  function shareResult() {
    const goalLabel = infinite ? '∞' : goal
    const lines = [
      `🔢 Number Merge (${boardSize}x${boardSize}, Goal: ${goalLabel})`,
      `📊 Score: ${score}`,
      won ? '🏆 Goal reached!' : infinite ? `💀 Board full` : `💀 Game over`,
      ``,
      `🎮 Offline Arcade`,
    ].filter(Boolean)
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (screen === 'menu') {
    return (
      <div className="game-card slide-in">
        <h2>Number Merge</h2>
        <p className="description">Slide tiles to merge same numbers!</p>

        <div className="merge-setup-section">
          <div className="merge-setup-title">Game Mode</div>
          <div className="merge-setup-row">
            <button className="merge-setup-btn" onClick={() => { sound('click'); startGame(4, 2048, false) }}>
              <div className="merge-setup-emoji">🎮</div>
              <div className="merge-setup-label">Classic</div>
              <div className="merge-setup-sub">4×4, Goal 2048</div>
            </button>
            <button className="merge-setup-btn" onClick={() => { sound('click'); setScreen('custom') }}>
              <div className="merge-setup-emoji">🛠️</div>
              <div className="merge-setup-label">Custom</div>
              <div className="merge-setup-sub">Pick size & goal</div>
            </button>
            <button className="merge-setup-btn" onClick={() => { sound('click'); setScreen('infinite') }}>
              <div className="merge-setup-emoji">♾️</div>
              <div className="merge-setup-label">Infinite</div>
              <div className="merge-setup-sub">No goal, play forever</div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'infinite') {
    return (
      <div className="game-card slide-in">
        <h2>Number Merge — Infinite</h2>
        <p className="description">Pick your board size</p>
        <div className="merge-setup-section">
          <div className="merge-setup-title">Board Size</div>
          <div className="merge-setup-row">
            {BOARD_SIZES.map(s => (
              <button key={s} className={`merge-size-btn ${boardSize === s ? 'selected' : ''}`}
                onClick={() => { sound('click'); setBoardSize(s) }}>
                {s}×{s}
              </button>
            ))}
          </div>
        </div>
        <button className="play-again-btn" style={{ marginTop: 16 }}
          onClick={() => { sound('click'); startGame(boardSize, 0, true) }}>
          Start Infinite
        </button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="quit-btn" onClick={() => setScreen('menu')}>← Back</button>
        </div>
      </div>
    )
  }

  if (screen === 'custom') {
    return (
      <div className="game-card slide-in">
        <h2>Number Merge — Custom</h2>
        <p className="description">Set your own board size and goal</p>

        <div className="merge-setup-section">
          <div className="merge-setup-title">Board Size</div>
          <div className="merge-setup-row">
            {BOARD_SIZES.map(s => (
              <button key={s} className={`merge-size-btn ${boardSize === s ? 'selected' : ''}`}
                onClick={() => { sound('click'); setBoardSize(s) }}>
                {s}×{s}
              </button>
            ))}
          </div>
        </div>

        <div className="merge-setup-section">
          <div className="merge-setup-title">Goal</div>
          <div className="merge-setup-row">
            {GOAL_PRESETS.map(g => (
              <button key={g} className={`merge-size-btn ${goal === g && !infinite ? 'selected' : ''}`}
                onClick={() => { sound('click'); setGoal(g); setInfinite(false); setGoalInput(String(g)) }}>
                {g}
              </button>
            ))}
          </div>
          <div className="merge-custom-goal">
            <input
              className="merge-goal-input"
              type="number"
              min="4"
              step="2"
              value={goalInput}
              onChange={e => { setGoalInput(e.target.value); setInfinite(false) }}
              onBlur={() => {
                const v = parseInt(goalInput)
                if (v >= 4 && v % 2 === 0) setGoal(v)
                else setGoalInput(String(goal))
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = parseInt(goalInput)
                  if (v >= 4 && v % 2 === 0) { setGoal(v); setInfinite(false) }
                  else setGoalInput(String(goal))
                }
              }}
              placeholder="Custom..."
            />
          </div>
        </div>

        <button className="play-again-btn" style={{ marginTop: 16 }}
          onClick={() => { sound('click'); startGame(boardSize, goal, false) }}>
          Start Custom Game
        </button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="quit-btn" onClick={() => setScreen('menu')}>← Back</button>
        </div>
      </div>
    )
  }

  const tileSize = 100 / boardSize

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
          <div className="hol-stat-num" style={{ color: 'var(--neon-green)' }}>
            {infinite ? '∞' : goal}
          </div>
        </div>
      </div>

      <div className="merge-board" style={{ aspectRatio: '1' }}>
        <div className="merge-bg-grid" style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}>
          {Array(boardSize * boardSize).fill(0).map((_, i) => (
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
                fontSize: boardSize >= 7 ? 12 : boardSize >= 6 ? 14 : 18,
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

      {goalReached && (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">🎉</div>
          <div className="result-text win">
            You made it! You got to your goal!
          </div>
          <div className="rps-final-score">
            <span className="player">{score}</span>
            <span className="sep">points</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => { sound('click'); setGoalReached(false) }}>
              Keep Going
            </button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => { setWon(true) }}>
              Exit
            </button>
          </div>
        </div>
      )}

      {(gameOver || won) && !goalReached && (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{won ? '🏆' : '💀'}</div>
          <div className={`result-text ${won ? 'win' : 'lose'}`}>
            {won ? `Reached ${goal}!` : 'No Moves Left!'}
          </div>
          <div className="rps-final-score">
            <span className="player">{score}</span>
            <span className="sep">points</span>
            <span className="bot">Best: {bestScore}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => startGame(boardSize, goal, infinite)}>Play Again</button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => setScreen('menu')}>New Game</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={() => { setScreen('menu'); onPlayingChange?.(false) }} className="quit-btn">
          {(gameOver || won) ? 'New Game' : 'Quit Game'}
        </button>
      </div>
    </div>
  )
}
