import { useState, useEffect, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: '8x8, 10 mines', rows: 8, cols: 8, mines: 10 },
  { name: 'Normal', emoji: '🟡', desc: '12x12, 25 mines', rows: 12, cols: 12, mines: 25 },
  { name: 'Hard', emoji: '🟠', desc: '16x16, 50 mines', rows: 16, cols: 16, mines: 50 },
  { name: 'Insane', emoji: '💀', desc: '20x20, 80 mines', rows: 20, cols: 20, mines: 80 },
]

const NUM_COLORS = ['', '#00d4ff', '#39ff14', '#ff2d7b', '#b946ff', '#f97316', '#06b6d4', '#fff', '#9b8ec4']

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0, revealDelay: 0 }))
  )
}

function placeMines(board, rows, cols, mines, safeR, safeC) {
  const safeCells = new Set()
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeR + dr, nc = safeC + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) safeCells.add(`${nr},${nc}`)
    }
  let placed = 0
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)
    if (!board[r][c].mine && !safeCells.has(`${r},${c}`)) { board[r][c].mine = true; placed++ }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++
        }
      board[r][c].adjacent = count
    }
  return board
}

function cloneBoard(board) { return board.map(r => r.map(c => ({ ...c }))) }

function floodReveal(board, r, c, rows, cols, delay = 0) {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return
  if (board[r][c].revealed || board[r][c].flagged) return
  board[r][c].revealed = true
  board[r][c].revealDelay = delay
  if (board[r][c].adjacent === 0 && !board[r][c].mine) {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const dist = Math.abs(dr) + Math.abs(dc)
        floodReveal(board, r + dr, c + dc, rows, cols, delay + dist * 30)
      }
  }
}

function checkWin(board, rows, cols, mines) {
  let revealed = 0
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (board[r][c].revealed) revealed++
  return revealed === rows * cols - mines
}

function countAdjacentFlags(board, r, c, rows, cols) {
  let count = 0
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].flagged) count++
    }
  return count
}

export default function Minesweeper({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [board, setBoard] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [flagCount, setFlagCount] = useState(0)
  const [timer, setTimer] = useState(0)
  const [started, setStarted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bestTime, setBestTime] = useState(() => ({}))
  const timerRef = useRef(null)
  const startTimeRef = useRef(0)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('minesweeper')
  const isPlaying = difficulty && !gameOver

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])

  useEffect(() => {
    if (started && !gameOver) {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [started, gameOver])

  function startGame(diffName) {
    setDifficulty(diffName)
    const d = DIFFICULTIES.find(x => x.name === diffName)
    setBoard(createEmptyBoard(d.rows, d.cols))
    setGameOver(false)
    setWon(false)
    setFlagCount(0)
    setTimer(0)
    setStarted(false)
    setCopied(false)
    clearInterval(timerRef.current)
  }

  function handleReveal(r, c) {
    if (gameOver || !board || board[r][c].revealed || board[r][c].flagged) return
    const d = DIFFICULTIES.find(x => x.name === difficulty)

    if (!started) {
      setStarted(true)
      const newBoard = cloneBoard(board)
      placeMines(newBoard, d.rows, d.cols, d.mines, r, c)
      floodReveal(newBoard, r, c, d.rows, d.cols, 0)
      setBoard(newBoard)
      sound('click')
      if (checkWin(newBoard, d.rows, d.cols, d.mines)) {
        setGameOver(true)
        setWon(true)
        clearInterval(timerRef.current)
        const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setTimer(finalTime)
        sound('win')
        const best = bestTime[difficulty] || Infinity
        if (finalTime < best) {
          const updated = { ...bestTime, [difficulty]: finalTime }
          setBestTime(updated)
          saveHighScore('minesweeper', updated)
        }
        recordGame(finalTime, 1)
      }
      return
    }

    const newBoard = cloneBoard(board)

    if (newBoard[r][c].mine) {
      for (let rr = 0; rr < newBoard.length; rr++)
        for (let cc = 0; cc < newBoard[0].length; cc++)
          if (newBoard[rr][cc].mine) newBoard[rr][cc].revealed = true
      setBoard(newBoard)
      setGameOver(true)
      sound('lose')
      clearInterval(timerRef.current)
      recordGame(0, 0)
      return
    }

    if (newBoard[r][c].revealed && newBoard[r][c].adjacent > 0) {
      const adjFlags = countAdjacentFlags(newBoard, r, c, d.rows, d.cols)
      if (adjFlags === newBoard[r][c].adjacent) {
        let hitMine = false
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc
            if (nr >= 0 && nr < d.rows && nc >= 0 && nc < d.cols && !newBoard[nr][nc].flagged && !newBoard[nr][nc].revealed) {
              if (newBoard[nr][nc].mine) {
                hitMine = true
                for (let rr = 0; rr < newBoard.length; rr++)
                  for (let cc = 0; cc < newBoard[0].length; cc++)
                    if (newBoard[rr][cc].mine) newBoard[rr][cc].revealed = true
              } else {
                floodReveal(newBoard, nr, nc, d.rows, d.cols, 0)
              }
            }
          }
        setBoard(newBoard)
        if (hitMine) {
          setGameOver(true)
          sound('lose')
          clearInterval(timerRef.current)
          recordGame(0, 0)
        } else if (checkWin(newBoard, d.rows, d.cols, d.mines)) {
          setGameOver(true)
          setWon(true)
          clearInterval(timerRef.current)
          const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setTimer(finalTime)
          sound('win')
          const best = bestTime[difficulty] || Infinity
          if (finalTime < best) {
            const updated = { ...bestTime, [difficulty]: finalTime }
            setBestTime(updated)
            saveHighScore('minesweeper', updated)
          }
          recordGame(finalTime, 1)
        }
        return
      }
    }

    floodReveal(newBoard, r, c, d.rows, d.cols, 0)
    setBoard(newBoard)
    sound('click')
    if (checkWin(newBoard, d.rows, d.cols, d.mines)) {
      setGameOver(true)
      setWon(true)
      clearInterval(timerRef.current)
      const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setTimer(finalTime)
      sound('win')
      const best = bestTime[difficulty] || Infinity
      if (finalTime < best) {
        const updated = { ...bestTime, [difficulty]: finalTime }
        setBestTime(updated)
        saveHighScore('minesweeper', updated)
      }
      recordGame(finalTime, 1)
    }
  }

  function handleFlag(e, r, c) {
    e.preventDefault()
    if (gameOver || !board || board[r][c].revealed) return
    if (!started) setStarted(true)
    const newBoard = cloneBoard(board)
    newBoard[r][c].flagged = !newBoard[r][c].flagged
    setBoard(newBoard)
    setFlagCount(newBoard.flat().filter(c => c.flagged).length)
    sound('click')
  }

  function handleShare() {
    const text = `💣 Minesweeper ${difficulty} — ${timer}s | ${won ? 'Won!' : 'Lost'}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>💣 Minesweeper</h2>
        <p className="description">Clear the field without hitting a mine!</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Click to reveal | Right-click to flag | Click revealed number to chord</span>
        </div>
      </div>
    )
  }

  const d = DIFFICULTIES.find(x => x.name === difficulty)
  const cellSize = difficulty === 'Insane' ? 24 : difficulty === 'Hard' ? 28 : 34

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => { setDifficulty(null); clearInterval(timerRef.current) }} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Mines</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: 'var(--neon-pink)' }}>💣 {d.mines - flagCount}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Time</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: 'var(--neon-yellow)' }}>{timer}s</div></div>
        </div>
      </div>
      {bestTime[difficulty] && (
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 12, color: 'var(--text-dim)' }}>🏆 Best: {bestTime[difficulty]}s</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${d.cols}, ${cellSize}px)`, gap: 2, border: '2px solid var(--border-glass)', borderRadius: 8, padding: 4, background: 'rgba(0,0,0,0.3)' }}>
          {board && board.map((row, r) => row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleReveal(r, c)}
              onContextMenu={(e) => handleFlag(e, r, c)}
              className={cell.revealed && !cell.mine && cell.adjacent === 0 ? 'ms-flood-reveal' : ''}
              style={{
                width: cellSize, height: cellSize,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: cellSize < 28 ? 10 : 13,
                fontWeight: 700,
                fontFamily: "'Press Start 2P', monospace",
                border: 'none',
                borderRadius: 4,
                cursor: cell.revealed ? (cell.revealed && cell.adjacent > 0 ? 'pointer' : 'default') : 'pointer',
                transition: 'all 0.1s ease',
                animationDelay: cell.revealDelay ? `${cell.revealDelay}ms` : '0ms',
                background: cell.revealed
                  ? cell.mine ? 'rgba(255, 45, 123, 0.3)' : 'rgba(255,255,255,0.06)'
                  : cell.flagged ? 'rgba(255, 230, 0, 0.15)' : 'rgba(255,255,255,0.1)',
                color: cell.revealed && cell.mine ? '#ff2d7b' : cell.revealed ? NUM_COLORS[cell.adjacent] : cell.flagged ? '#ffe600' : 'transparent',
                boxShadow: cell.revealed ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.2)',
              }}
              aria-label={cell.revealed ? (cell.mine ? 'mine' : `${cell.adjacent} adjacent`) : cell.flagged ? 'flagged' : 'hidden'}
            >
              {cell.revealed ? (cell.mine ? '💣' : cell.adjacent > 0 ? cell.adjacent : '') : cell.flagged ? '🚩' : ''}
            </button>
          )))}
        </div>
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: won ? 'var(--win-color)' : 'var(--lose-color)', marginBottom: 8 }}>
            {won ? 'YOU WIN!' : 'BOOM!'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{timer} seconds{won && bestTime[difficulty] === timer ? ' — New best!' : ''}</div>
          {timer > 0 && <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>}
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
