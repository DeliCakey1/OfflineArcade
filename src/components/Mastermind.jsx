import { useState, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const COLORS = ['#ff2d7b', '#ff6b2b', '#ffe600', '#39ff14', '#00d4ff', '#b946ff']
const COLOR_NAMES = ['Pink', 'Orange', 'Yellow', 'Green', 'Cyan', 'Purple']

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: '4 colors, 6 tries', codeLen: 4, numColors: 4, maxGuesses: 6 },
  { name: 'Normal', emoji: '🟡', desc: '5 colors, 8 tries', codeLen: 4, numColors: 5, maxGuesses: 8 },
  { name: 'Hard', emoji: '🟠', desc: '6 colors, 8 tries', codeLen: 4, numColors: 6, maxGuesses: 8 },
  { name: 'Insane', emoji: '💀', desc: '5 colors, 6 tries', codeLen: 5, numColors: 6, maxGuesses: 6 },
]

function generateCode(len, numColors) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * numColors))
}

function getFeedback(code, guess) {
  let exact = 0, misplaced = 0
  const codeCopy = [...code]
  const guessCopy = [...guess]
  for (let i = 0; i < code.length; i++) {
    if (guessCopy[i] === codeCopy[i]) {
      exact++
      codeCopy[i] = -1
      guessCopy[i] = -2
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (guessCopy[i] === -2) continue
    const idx = codeCopy.indexOf(guessCopy[i])
    if (idx !== -1) {
      misplaced++
      codeCopy[idx] = -1
    }
  }
  return { exact, misplaced }
}

export default function Mastermind({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [code, setCode] = useState(null)
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [copied, setCopied] = useState(false)
  const sound = useSound()
  const { recordGame } = useStats('mastermind')
  const isPlaying = difficulty && !gameOver

  const startGame = useCallback((diffName) => {
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    setDifficulty(diffName)
    const newCode = generateCode(d.codeLen, d.numColors)
    setCode(newCode)
    setGuesses([])
    setCurrentGuess([])
    setGameOver(false)
    setWon(false)
    setCopied(false)
    sound('click')
  }, [sound])

  const selectColor = useCallback((colorIdx) => {
    if (gameOver) return
    const d = DIFFICULTIES.find(x => x.name === difficulty) || DIFFICULTIES[1]
    if (currentGuess.length >= d.codeLen) return
    const newGuess = [...currentGuess, colorIdx]
    setCurrentGuess(newGuess)
    sound('click')
    if (newGuess.length === d.codeLen) {
      const feedback = getFeedback(code, newGuess)
      const newGuesses = [...guesses, { guess: newGuess, feedback }]
      setGuesses(newGuesses)
      setCurrentGuess([])
      if (feedback.exact === d.codeLen) {
        setGameOver(true)
        setWon(true)
        recordGame(true, 0)
        sound('victory')
      } else if (newGuesses.length >= d.maxGuesses) {
        setGameOver(true)
        setWon(false)
        recordGame(false, 0)
        sound('death')
      } else {
        sound('score')
      }
    }
  }, [currentGuess, code, guesses, gameOver, difficulty, sound, recordGame])

  const undoGuess = useCallback(() => {
    if (gameOver || currentGuess.length === 0) return
    setCurrentGuess(prev => prev.slice(0, -1))
    sound('click')
  }, [gameOver, currentGuess, sound])

  function handleShare() {
    const d = DIFFICULTIES.find(x => x.name === difficulty) || DIFFICULTIES[1]
    const text = `🧠 Mastermind — ${d.name} | ${guesses.length}/${d.maxGuesses} guesses`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🧠 Mastermind</h2>
        <p className="description">Crack the code! Get exact matches (black) and misplaced matches (white).</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Black = right color, right spot | White = right color, wrong spot</span>
        </div>
      </div>
    )
  }

  const d = DIFFICULTIES.find(x => x.name === difficulty) || DIFFICULTIES[1]
  const usedColors = COLORS.slice(0, d.numColors)
  const emptySlots = d.codeLen - currentGuess.length

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => setDifficulty(null)} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Guesses</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-yellow)' }}>{guesses.length}/{d.maxGuesses}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {guesses.map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {g.guess.map((c, j) => (
                <div key={j} style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[c], border: '2px solid rgba(255,255,255,0.2)', boxShadow: `0 0 8px ${COLORS[c]}44` }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: g.feedback.exact }).map((_, j) => (
                  <div key={`e${j}`} style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: g.feedback.misplaced }).map((_, j) => (
                  <div key={`m${j}`} style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
            </div>
          </div>
        ))}

        {!gameOver && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {currentGuess.map((c, j) => (
                <div key={j} style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[c], border: '2px solid rgba(255,255,255,0.4)', boxShadow: `0 0 8px ${COLORS[c]}44` }} />
              ))}
              {Array.from({ length: emptySlots }).map((_, j) => (
                <div key={`e${j}`} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.15)' }} />
              ))}
            </div>
            {currentGuess.length > 0 && (
              <button onClick={undoGuess} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>✕</button>
            )}
          </div>
        )}
      </div>

      {!gameOver && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {usedColors.map((color, i) => (
            <button
              key={i}
              onClick={() => selectColor(i)}
              disabled={currentGuess.length >= d.codeLen}
              style={{
                width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)',
                background: color, cursor: currentGuess.length >= d.codeLen ? 'default' : 'pointer',
                boxShadow: `0 0 10px ${color}44`, opacity: currentGuess.length >= d.codeLen ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </div>
      )}

      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: won ? 'var(--win-color)' : 'var(--lose-color)', marginBottom: 8 }}>
            {won ? 'CRACKED!' : 'FAILED'}
          </div>
          {!won && (
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 8 }}>
              {code.map((c, j) => (
                <div key={j} style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[c], border: '2px solid rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          )}
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{guesses.length} guesses used</div>
          <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
