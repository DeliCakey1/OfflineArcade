import { useState, useCallback, useEffect, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'
import useEffects from '../useEffects.jsx'

const ROWS = 6, COLS = 7
const CELL = 48
const GAP = 4

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Random moves', depth: 0 },
  { name: 'Normal', emoji: '🟡', desc: 'Basic strategy', depth: 2 },
  { name: 'Hard', emoji: '🟠', desc: 'Smart opponent', depth: 4 },
  { name: 'Insane', emoji: '💀', desc: 'Nearly perfect', depth: 6 },
]

const COLORS = { 1: '#ff2d7b', 2: '#00d4ff' }

function createBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)) }

function dropPiece(board, col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = player
      return r
    }
  }
  return -1
}

function checkWin(board, player) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if (board[r][c] === player && board[r][c+1] === player && board[r][c+2] === player && board[r][c+3] === player) return true
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      if (board[r][c] === player && board[r+1][c] === player && board[r+2][c] === player && board[r+3][c] === player) return true
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if (board[r][c] === player && board[r+1][c+1] === player && board[r+2][c+2] === player && board[r+3][c+3] === player) return true
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 3; c < COLS; c++)
      if (board[r][c] === player && board[r+1][c-1] === player && board[r+2][c-2] === player && board[r+3][c-3] === player) return true
  return false
}

function isFull(board) { return board[0].every(c => c !== 0) }

function getValidCols(board) {
  const cols = []
  for (let c = 0; c < COLS; c++) if (board[0][c] === 0) cols.push(c)
  return cols
}

function evaluateWindow(window, player) {
  const opp = player === 1 ? 2 : 1
  let score = 0
  const pCount = window.filter(c => c === player).length
  const oCount = window.filter(c => c === opp).length
  const empty = window.filter(c => c === 0).length
  if (pCount === 4) score += 100
  else if (pCount === 3 && empty === 1) score += 5
  else if (pCount === 2 && empty === 2) score += 2
  if (oCount === 3 && empty === 1) score -= 4
  return score
}

function scorePosition(board, player) {
  let score = 0
  const center = board.map(r => r[3])
  score += center.filter(c => c === player).length * 3
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += evaluateWindow(board[r].slice(c, c + 4), player)
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += evaluateWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], player)
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += evaluateWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], player)
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 3; c < COLS; c++)
      score += evaluateWindow([board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3]], player)
  return score
}

function minimax(board, depth, alpha, beta, maximizing, aiPlayer) {
  const validCols = getValidCols(board)
  if (depth === 0 || validCols.length === 0) return { col: validCols[0] || 3, score: scorePosition(board, aiPlayer) }
  const humanPlayer = aiPlayer === 1 ? 2 : 1
  if (maximizing) {
    let bestScore = -Infinity, bestCol = validCols[Math.floor(Math.random() * validCols.length)]
    for (const col of validCols) {
      const b = board.map(r => [...r])
      dropPiece(b, col, aiPlayer)
      if (checkWin(b, aiPlayer)) return { col, score: 100000 }
      const { score } = minimax(b, depth - 1, alpha, beta, false, aiPlayer)
      if (score > bestScore) { bestScore = score; bestCol = col }
      alpha = Math.max(alpha, score)
      if (alpha >= beta) break
    }
    return { col: bestCol, score: bestScore }
  } else {
    let bestScore = Infinity, bestCol = validCols[Math.floor(Math.random() * validCols.length)]
    for (const col of validCols) {
      const b = board.map(r => [...r])
      dropPiece(b, col, humanPlayer)
      if (checkWin(b, humanPlayer)) return { col, score: -100000 }
      const { score } = minimax(b, depth - 1, alpha, beta, true, aiPlayer)
      if (score < bestScore) { bestScore = score; bestCol = col }
      beta = Math.min(beta, score)
      if (alpha >= beta) break
    }
    return { col: bestCol, score: bestScore }
  }
}

export default function ConnectFour({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [board, setBoard] = useState(createBoard)
  const [turn, setTurn] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState(null)
  const [winLine, setWinLine] = useState([])
  const [lastMove, setLastMove] = useState(null)
  const [copied, setCopied] = useState(false)
  const [playerFirst, setPlayerFirst] = useState(true)
  const boardRef = useRef(createBoard())
  const turnRef = useRef(1)
  const gameOverRef = useRef(false)
  const aiThinking = useRef(false)
  const sound = useSound()
  const { recordGame } = useStats('connect4')
  const { spawnParticles, floatText, shakeScreen, renderParticles, shakeStyle } = useEffects()
  const isPlaying = difficulty && !gameOver

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])

  const aiMove = useCallback(() => {
    if (gameOverRef.current || aiThinking.current) return
    aiThinking.current = true
    const d = DIFFICULTIES.find(x => x.name === difficulty) || DIFFICULTIES[1]
    const b = boardRef.current
    const validCols = getValidCols(b)
    if (validCols.length === 0) { aiThinking.current = false; return }
    let col
    if (d.depth === 0) {
      col = validCols[Math.floor(Math.random() * validCols.length)]
    } else {
      const result = minimax(b, d.depth, -Infinity, Infinity, true, 2)
      col = result.col
    }
    const row = dropPiece(b, col, 2)
    if (row === -1) { aiThinking.current = false; return }
    setBoard(b.map(r => [...r]))
    setLastMove({ r: row, c: col })
    if (checkWin(b, 2)) {
      setGameOver(true)
      setWinner(2)
      sound('death')
      recordGame(false, 0)
    } else if (isFull(b)) {
      setGameOver(true)
      sound('death')
      recordGame(false, 0)
    } else {
      turnRef.current = 1
      setTurn(1)
      sound('click')
    }
    aiThinking.current = false
  }, [difficulty, sound, recordGame])

  const playerMove = useCallback((col) => {
    if (gameOverRef.current || turnRef.current !== 1 || aiThinking.current) return
    const b = boardRef.current
    const row = dropPiece(b, col, 1)
    if (row === -1) return
    setBoard(b.map(r => [...r]))
    setLastMove({ r: row, c: col })
    sound('click')
    if (checkWin(b, 1)) {
      setGameOver(true)
      setWinner(1)
      sound('victory')
      recordGame(true, 0)
      return
    }
    if (isFull(b)) {
      setGameOver(true)
      sound('death')
      recordGame(false, 0)
      return
    }
    turnRef.current = 2
    setTurn(2)
    setTimeout(aiMove, 300)
  }, [aiMove, sound, recordGame])

  function startGame(diffName, playerGoesFirst = true) {
    setDifficulty(diffName)
    const b = createBoard()
    boardRef.current = b
    setBoard(b.map(r => [...r]))
    gameOverRef.current = false
    aiThinking.current = false
    setPlayerFirst(playerGoesFirst)
    setTurn(playerGoesFirst ? 1 : 2)
    turnRef.current = playerGoesFirst ? 1 : 2
    setGameOver(false)
    setWinner(null)
    setWinLine([])
    setLastMove(null)
    setCopied(false)
    if (!playerGoesFirst) {
      setTimeout(() => {
        aiThinking.current = true
        const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
        const validCols = getValidCols(b)
        const col = d.depth === 0 ? validCols[Math.floor(Math.random() * validCols.length)] : minimax(b, d.depth, -Infinity, Infinity, true, 2).col
        const row = dropPiece(b, col, 2)
        if (row !== -1) {
          boardRef.current = b
          setBoard(b.map(r => [...r]))
          setLastMove({ r: row, c: col })
          turnRef.current = 1
          setTurn(1)
          sound('click')
        }
        aiThinking.current = false
      }, 400)
    }
  }

  function handleShare() {
    const d = DIFFICULTIES.find(x => x.name === difficulty) || DIFFICULTIES[1]
    const result = winner === 1 ? 'Win' : winner === 2 ? 'Loss' : 'Draw'
    const text = `🔴 Connect Four — ${result} | ${d.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🔴 Connect Four</h2>
        <p className="description">Drop discs to get four in a row! Play against the AI.</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Click a column to drop your disc</span>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => setDifficulty(null)} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: COLORS[1] }} />
            <span style={{ color: turn === 1 && !gameOver ? '#fff' : 'var(--text-dim)', fontWeight: turn === 1 && !gameOver ? 'bold' : 'normal' }}>You</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: COLORS[2] }} />
            <span style={{ color: turn === 2 && !gameOver ? '#fff' : 'var(--text-dim)', fontWeight: turn === 2 && !gameOver ? 'bold' : 'normal' }}>AI</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', ...shakeStyle }}>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gap: GAP,
            background: '#1a47b8', borderRadius: 8, padding: 8,
            border: '2px solid var(--border-glass)',
          }}>
            {board.map((row, r) => row.map((cell, c) => (
              <div key={`${r}-${c}`} onClick={() => !gameOver && playerMove(c)}
                style={{
                  width: CELL, height: CELL, borderRadius: '50%',
                  background: cell ? COLORS[cell] : 'rgba(0,0,0,0.4)',
                  border: !cell && !gameOver ? '2px solid rgba(255,255,255,0.1)' : '2px solid transparent',
                  cursor: !cell && !gameOver && turn === 1 ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  boxShadow: cell ? `0 0 10px ${COLORS[cell]}66` : 'none',
                  transform: lastMove && lastMove.r === r && lastMove.c === c ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            )))}
          </div>
          {renderParticles({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 })}
        </div>
      </div>

      {!gameOver && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: turn === 1 ? 'var(--neon-pink)' : 'var(--neon-cyan)' }}>
          {turn === 1 ? 'Your turn — click a column' : 'AI is thinking...'}
        </div>
      )}

      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: winner === 1 ? 'var(--win-color)' : winner === 2 ? 'var(--lose-color)' : 'var(--text-dim)', marginBottom: 8 }}>
            {winner === 1 ? 'YOU WIN!' : winner === 2 ? 'AI WINS!' : 'DRAW!'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <button className="share-btn confirm-btn" onClick={handleShare}>{copied ? '✓ Copied!' : '📋 Share'}</button>
            <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
            <button className="confirm-btn no" onClick={() => setDifficulty(null)}>Change Difficulty</button>
          </div>
        </div>
      )}
    </div>
  )
}
