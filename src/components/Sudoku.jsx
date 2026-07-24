import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: '30 givens', givens: 30 },
  { name: 'Normal', emoji: '🟡', desc: '25 givens', givens: 25 },
  { name: 'Hard', emoji: '🟠', desc: '22 givens', givens: 22 },
  { name: 'Insane', emoji: '💀', desc: '18 givens', givens: 18 },
]

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function isValid(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (i !== col && board[row][i] === num) return false
    if (i !== row && board[i][col] === num) return false
  }
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (r !== row || c !== col) {
        if (board[r][c] === num) return false
      }
    }
  }
  return true
}

function solve(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9])
        for (const num of nums) {
          if (isValid(board, r, c, num)) {
            board[r][c] = num
            if (solve(board)) return true
            board[r][c] = 0
          }
        }
        return false
      }
    }
  }
  return true
}

function generateSolvedBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0))
  for (let box = 0; box < 3; box++) {
    const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9])
    let idx = 0
    for (let r = box * 3; r < box * 3 + 3; r++) {
      for (let c = box * 3; c < box * 3 + 3; c++) {
        board[r][c] = nums[idx++]
      }
    }
  }
  solve(board)
  return board
}

function generatePuzzle(givens) {
  const solved = generateSolvedBoard()
  const board = solved.map(r => [...r])
  const positions = []
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c])
    }
  }
  shuffleArray(positions)
  let removed = 0
  const toRemove = 81 - givens
  for (const [r, c] of positions) {
    if (removed >= toRemove) break
    board[r][c] = 0
    removed++
  }
  return { board, solved }
}

function findConflicts(board) {
  const conflicts = Array.from({ length: 9 }, () => Array(9).fill(false))
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) continue
      const num = board[r][c]
      for (let i = 0; i < 9; i++) {
        if (i !== c && board[r][i] === num) { conflicts[r][c] = true; conflicts[r][i] = true }
        if (i !== r && board[i][c] === num) { conflicts[r][c] = true; conflicts[i][c] = true }
      }
      const boxRow = Math.floor(r / 3) * 3
      const boxCol = Math.floor(c / 3) * 3
      for (let rr = boxRow; rr < boxRow + 3; rr++) {
        for (let cc = boxCol; cc < boxCol + 3; cc++) {
          if ((rr !== r || cc !== c) && board[rr][cc] === num) {
            conflicts[r][c] = true
            conflicts[rr][cc] = true
          }
        }
      }
    }
  }
  return conflicts
}

export default function Sudoku({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [board, setBoard] = useState(null)
  const [solution, setSolution] = useState(null)
  const [givens, setGivens] = useState(null)
  const [selected, setSelected] = useState(null)
  const [mistakes, setMistakes] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [timer, setTimer] = useState(0)
  const [started, setStarted] = useState(false)
  const timerRef = useRef(null)
  const startTimeRef = useRef(0)
  const sound = useSound()
  const { recordGame } = useStats('sudoku')
  const isPlaying = difficulty && !gameOver

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])

  useEffect(() => {
    if (started && !gameOver) {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [started, gameOver])

  const startGame = useCallback((diffName) => {
    const d = DIFFICULTIES.find(x => x.name === diffName)
    const { board: newBoard, solved } = generatePuzzle(d.givens)
    const g = Array.from({ length: 9 }, () => Array(9).fill(false))
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (newBoard[r][c] !== 0) g[r][c] = true
    setDifficulty(diffName)
    setBoard(newBoard)
    setSolution(solved)
    setGivens(g)
    setSelected(null)
    setMistakes(0)
    setGameOver(false)
    setWon(false)
    setTimer(0)
    setStarted(false)
    clearInterval(timerRef.current)
    sound('click')
  }, [sound])

  const handleCellClick = useCallback((r, c) => {
    if (gameOver || !givens || givens[r][c]) return
    if (!started) setStarted(true)
    setSelected([r, c])
    sound('click')
  }, [gameOver, givens, started, sound])

  const handleNumberInput = useCallback((num) => {
    if (!selected || gameOver || !board || !givens) return
    const [r, c] = selected
    if (givens[r][c]) return
    if (!started) setStarted(true)
    const newBoard = board.map(row => [...row])
    newBoard[r][c] = num
    setBoard(newBoard)
    if (num !== 0 && solution && solution[r][c] !== num) {
      setMistakes(m => m + 1)
      sound('hit')
    } else if (num !== 0) {
      sound('score')
    }
    const conflicts = findConflicts(newBoard)
    const filled = newBoard.every(row => row.every(cell => cell !== 0))
    const hasConflicts = conflicts.some(row => row.some(c => c))
    if (filled && !hasConflicts) {
      setGameOver(true)
      setWon(true)
      clearInterval(timerRef.current)
      const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setTimer(finalTime)
      sound('win')
      recordGame(true, 0)
    }
  }, [selected, gameOver, board, givens, started, solution, sound, recordGame])

  useEffect(() => {
    function handleKeyDown(e) {
      if (!selected || gameOver) return
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key))
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        handleNumberInput(0)
      } else if (e.key === 'ArrowUp' && selected[0] > 0) {
        setSelected([selected[0] - 1, selected[1]])
        sound('click')
      } else if (e.key === 'ArrowDown' && selected[0] < 8) {
        setSelected([selected[0] + 1, selected[1]])
        sound('click')
      } else if (e.key === 'ArrowLeft' && selected[1] > 0) {
        setSelected([selected[0], selected[1] - 1])
        sound('click')
      } else if (e.key === 'ArrowRight' && selected[1] < 8) {
        setSelected([selected[0], selected[1] + 1])
        sound('click')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, gameOver, handleNumberInput, sound])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🧩 Sudoku</h2>
        <p className="description">Fill the 9x9 grid so every row, column, and box contains 1-9.</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Arrow keys / click to navigate | 1-9 to fill | Backspace to erase</span>
        </div>
      </div>
    )
  }

  const conflicts = board ? findConflicts(board) : null
  const cellSize = 38

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => { setDifficulty(null); clearInterval(timerRef.current) }} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Mistakes</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: 'var(--neon-red)' }}>✖ {mistakes}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Time</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: 'var(--neon-yellow)' }}>{formatTime(timer)}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          border: '2px solid var(--border-glass)',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.3)',
          width: 'fit-content',
        }}>
          {board && board.map((row, r) => row.map((cell, c) => {
            const isGiven = givens && givens[r][c]
            const isSelected = selected && selected[0] === r && selected[1] === c
            const isConflict = conflicts && conflicts[r][c]
            const sameRow = selected && selected[0] === r
            const sameCol = selected && selected[1] === c
            const sameBox = selected && Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3)
            const isHighlighted = !isGiven && !isConflict && cell !== 0 && selected && (sameRow || sameCol || sameBox) && board[selected[0]][selected[1]] !== 0 && cell === board[selected[0]][selected[1]]
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: isGiven ? 700 : 400,
                  fontFamily: "'Press Start 2P', monospace",
                  border: 'none',
                  borderRight: (c + 1) % 3 === 0 && c < 8 ? '2px solid var(--border-glass)' : '1px solid rgba(255,255,255,0.08)',
                  borderBottom: (r + 1) % 3 === 0 && r < 8 ? '2px solid var(--border-glass)' : '1px solid rgba(255,255,255,0.08)',
                  cursor: isGiven ? 'default' : 'pointer',
                  background: isSelected
                    ? 'rgba(0, 212, 255, 0.25)'
                    : isConflict
                      ? 'rgba(255, 45, 123, 0.2)'
                      : isHighlighted
                        ? 'rgba(0, 212, 255, 0.1)'
                        : sameRow || sameCol || sameBox
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(0,0,0,0.1)',
                  color: isConflict
                    ? 'var(--neon-red)'
                    : isGiven
                      ? '#fff'
                      : 'var(--neon-cyan)',
                  transition: 'all 0.1s ease',
                  outline: isSelected ? '2px solid var(--neon-cyan)' : 'none',
                }}
              >
                {cell !== 0 ? cell : ''}
              </button>
            )
          }))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            style={{
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Press Start 2P', monospace",
              border: '1px solid var(--border-glass)',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--neon-cyan)',
              transition: 'all 0.1s ease',
            }}
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleNumberInput(0)}
          style={{
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Press Start 2P', monospace",
            border: '1px solid var(--border-glass)',
            borderRadius: 6,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--text-dim)',
            transition: 'all 0.1s ease',
          }}
        >
          ✖
        </button>
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: won ? 'var(--neon-green)' : 'var(--neon-red)', marginBottom: 8 }}>
            {won ? 'PUZZLE COMPLETE!' : 'GAME OVER'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>
            {won ? `Solved in ${formatTime(timer)} with ${mistakes} mistake${mistakes !== 1 ? 's' : ''}` : `Too many mistakes!`}
          </div>
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
