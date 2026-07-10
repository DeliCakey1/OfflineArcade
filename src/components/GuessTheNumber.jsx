import { useState, useRef } from 'react'
import useSound from '../useSound'

const MAX_ATTEMPTS = 10

function getInitialRange() {
  return { min: 1, max: 100 }
}

export default function GuessTheNumber() {
  const [secretNumber, setSecretNumber] = useState(() => Math.floor(Math.random() * 100) + 1)
  const [guess, setGuess] = useState('')
  const [guesses, setGuesses] = useState([])
  const [result, setResult] = useState(null) // 'higher' | 'lower' | 'correct' | null
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [shake, setShake] = useState(false)
  const [lastGuess, setLastGuess] = useState(null)
  const inputRef = useRef(null)
  const sound = useSound()

  const attempts = guesses.length

  // Update range based on hints
  const effectiveRange = guesses.reduce(
    (r, g) => {
      if (g.hint === 'lower') return { ...r, max: Math.min(r.max, g.value - 1) }
      if (g.hint === 'higher') return { ...r, min: Math.max(r.min, g.value + 1) }
      return r
    },
    getInitialRange()
  )

  function makeGuess() {
    const num = parseInt(guess)
    if (isNaN(num) || num < 1 || num > 100 || animating || gameOver) return

    sound('confirm')
    setAnimating(true)
    setLastGuess(num)

    // Shake animation
    setShake(true)
    setTimeout(() => {
      setShake(false)

      let hint
      if (num === secretNumber) {
        hint = 'correct'
      } else if (num < secretNumber) {
        hint = 'higher'
      } else {
        hint = 'lower'
      }

      const newGuesses = [...guesses, { value: num, hint }]
      setGuesses(newGuesses)
      setResult(hint)

      if (hint === 'correct') {
        setWon(true)
        setGameOver(true)
        setReveal(true)
        sound('victory')
      } else {
        sound(hint === 'higher' ? 'win' : 'lose')
        if (newGuesses.length >= MAX_ATTEMPTS) {
          setGameOver(true)
          setReveal(true)
          sound('defeat')
        }
      }

      setGuess('')
      setAnimating(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }, 400)
  }

  function reset() {
    setSecretNumber(Math.floor(Math.random() * 100) + 1)
    setGuess('')
    setGuesses([])
    setResult(null)
    setGameOver(false)
    setWon(false)
    setAnimating(false)
    setReveal(false)
    setShake(false)
    setLastGuess(null)
  }

  return (
    <div className="game-card slide-in">
      <h2>Guess The Number</h2>
      <p className="description">I'm thinking of a number between 1 and 100. You have {MAX_ATTEMPTS} attempts!</p>

      <div className="gtn-attempts">
        <div className="gtn-attempts-label">Attempts</div>
        <div className="gtn-attempts-bar">
          {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
            <div key={i} className={`gtn-attempt-dot ${i < attempts ? 'used' : ''} ${i === attempts - 1 && result === 'correct' ? 'correct' : ''}`} />
          ))}
        </div>
        <div className="gtn-attempts-count">
          {attempts} / {MAX_ATTEMPTS}
        </div>
      </div>

      <div className="gtn-range-bar">
        <div className="gtn-range-label">1</div>
        <div className="gtn-range-track">
          <div className="gtn-range-fill" style={{
            left: `${((effectiveRange.min - 1) / 99) * 100}%`,
            width: `${((effectiveRange.max - effectiveRange.min) / 99) * 100}%`
          }} />
          {guesses.map((g, i) => (
            <div key={i} className={`gtn-range-marker ${g.hint === 'correct' ? 'correct' : ''}`}
              style={{ left: `${((g.value - 1) / 99) * 100}%` }}>
              <div className="gtn-range-marker-tooltip">{g.value}</div>
            </div>
          ))}
        </div>
        <div className="gtn-range-label">100</div>
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{won ? '🎉' : '😔'}</div>
          <div className={`result-text ${won ? 'win' : 'lose'}`}>
            {won ? 'You Got It!' : 'Out of Attempts!'}
          </div>
          {!won && (
            <div className="result-message" style={{ fontSize: 20, margin: '8px 0' }}>
              The number was <strong style={{ color: 'var(--neon-yellow)' }}>{secretNumber}</strong>
            </div>
          )}
          {won && (
            <div className="result-message">
              Guessed in {attempts} {attempts === 1 ? 'try' : 'tries'}!
              {attempts <= 3 && ' 🏆 Incredible!'}
              {attempts > 3 && attempts <= 6 && ' 👏 Well done!'}
              {attempts > 6 && ' 😅 Close one!'}
            </div>
          )}
          <div className="gtn-all-guesses">
            {guesses.map((g, i) => (
              <span key={i} className={`gtn-final-guess ${g.hint}`}>
                {g.value}
              </span>
            ))}
          </div>
          <button className="play-again-btn" onClick={reset}>Play Again</button>
        </div>
      ) : (
        <>
          <div className="gtn-battle">
            <div className="gtn-robot">
              <div className="gtn-robot-emoji">{shake ? '🤔' : reveal ? '😏' : '🤖'}</div>
              <div className="gtn-robot-label">Bot</div>
            </div>

            <div className="gtn-feedback">
              {animating ? (
                <div className="gtn-thinking">🤔 Hmm...</div>
              ) : result && lastGuess !== null ? (
                <div className={`gtn-hint ${result}`} key={attempts}>
                  {result === 'correct' && <>🎯 <strong>{lastGuess}</strong> is correct!</>}
                  {result === 'higher' && <>⬆️ <strong>{lastGuess}</strong> is too low! Go higher!</>}
                  {result === 'lower' && <>⬇️ <strong>{lastGuess}</strong> is too high! Go lower!</>}
                </div>
              ) : (
                <div className="gtn-hint prompt">Make your guess!</div>
              )}
            </div>
          </div>

          <div className="gtn-input-area">
            <input
              ref={inputRef}
              type="number"
              min="1"
              max="100"
              className="gtn-input"
              placeholder="1-100"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') makeGuess() }}
              disabled={animating}
              autoFocus
            />
            <button className="gtn-guess-btn" onClick={makeGuess} disabled={animating || !guess}>
              Guess!
            </button>
          </div>

          {guesses.length > 0 && (
            <div className="gtn-history">
              <div className="gtn-history-label">Your Guesses</div>
              <div className="gtn-history-list">
                {guesses.map((g, i) => (
                  <div key={i} className={`gtn-history-item ${g.hint}`}>
                    <span className="gtn-history-num">{g.value}</span>
                    <span className="gtn-history-hint">
                      {g.hint === 'higher' ? '↑' : g.hint === 'lower' ? '↓' : '✓'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={reset} className="quit-btn">
          {gameOver ? 'New Game' : 'Quit Game'}
        </button>
      </div>
    </div>
  )
}
