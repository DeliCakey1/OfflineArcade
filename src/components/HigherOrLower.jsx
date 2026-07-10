import { useState, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'

const MODES = [
  { name: 'Very Easy', rounds: 25, emoji: '🟢', color: '#39ff14' },
  { name: 'Easy', rounds: 15, emoji: '🔵', color: '#3b82f6' },
  { name: 'Normal', rounds: 10, emoji: '🟡', color: '#ffe600' },
  { name: 'Hard', rounds: 8, emoji: '🟠', color: '#ff6b2b' },
]

const SUITS = ['♠', '♥', '♦', '♣']
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const VALUE_RANK = { A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13 }

function makeDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value, rank: VALUE_RANK[value] })
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function isRed(suit) {
  return suit === '♥' || suit === '♦'
}

export default function HigherOrLower() {
  const [maxRounds, setMaxRounds] = useState(null)
  const [deck, setDeck] = useState(() => makeDeck())
  const [currentCard, setCurrentCard] = useState(null)
  const [nextCard, setNextCard] = useState(null)
  const [result, setResult] = useState(null) // 'correct' | 'wrong' | null
  const [round, setRound] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState(false)
  const sound = useSound()
  const { recordGame } = useStats('hol')

  const startGame = useCallback(() => {
    const d = makeDeck()
    setDeck(d)
    setCurrentCard(d[0])
    setNextCard(d[1])
    setRound(0)
    setStreak(0)
    setBestStreak(0)
    setCorrectCount(0)
    setGameOver(false)
    setHistory([])
    setCopied(false)
  }, [])

  function makeGuess(choice) {
    if (animating || gameOver || !nextCard) return
    sound('confirm')
    setAnimating(true)

    setTimeout(() => {
      const isHigher = nextCard.rank > currentCard.rank
      const isLower = nextCard.rank < currentCard.rank
      const isSame = nextCard.rank === currentCard.rank

      let correct
      if (choice === 'higher') correct = isHigher || isSame
      else correct = isLower || isSame

      const newRound = round + 1
      const newStreak = correct ? streak + 1 : 0
      const newBest = Math.max(bestStreak, newStreak)
      const newCorrect = correctCount + (correct ? 1 : 0)

      setResult(correct ? 'correct' : 'wrong')
      setReveal(true)
      setStreak(newStreak)
      setBestStreak(newBest)
      setCorrectCount(newCorrect)
      setRound(newRound)

      setHistory(prev => [...prev.slice(-14), {
        card: currentCard,
        nextCard,
        guess: choice,
        correct,
        round: newRound,
      }])

      if (correct) sound('win')
      else sound('lose')

      if (newRound >= maxRounds) {
        setGameOver(true)
        recordGame(newCorrect > maxRounds / 2, newBest)
        if (newCorrect > maxRounds / 2) setTimeout(() => sound('victory'), 300)
        else setTimeout(() => sound('defeat'), 300)
      }

      setTimeout(() => {
        if (newRound < maxRounds) {
          const newCurrent = nextCard
          const newNext = deck[newRound + 1]
          setCurrentCard(newCurrent)
          setNextCard(newNext)
          setResult(null)
          setReveal(false)
        }
        setAnimating(false)
      }, 800)
    }, 500)
  }

  function reset() {
    startGame()
  }

  function quitToMenu() {
    reset()
    setMaxRounds(null)
    setCurrentCard(null)
    setNextCard(null)
  }

  function shareResult() {
    const lines = [
      `🃏 Beat the bot at Higher or Lower (${MODES.find(m => m.rounds === maxRounds)?.name})!`,
      `📊 ${correctCount}/${maxRounds} correct | 🔥 Best streak: ${bestStreak}`,
      ``,
      `Round history:`,
      ...history.map(h => `  #${h.round}: ${h.card.value}${h.card.suit} → ${h.guess} → ${h.nextCard.value}${h.nextCard.suit} ${h.correct ? '✓' : '✗'}`),
      ``,
      `🎮 Offline Arcade`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!maxRounds) {
    return (
      <div className="game-card slide-in">
        <h2>Higher or Lower</h2>
        <p className="description">Bot draws cards. Guess if the next one is higher or lower!</p>
        <div className="gtn-mode-grid">
          {MODES.map(m => (
            <button key={m.name} className="gtn-mode-card" style={{ '--mode-color': m.color }}
              onClick={() => { sound('click'); setMaxRounds(m.rounds); setTimeout(startGame, 0) }}>
              <div className="gtn-mode-emoji">{m.emoji}</div>
              <div className="gtn-mode-name">{m.name}</div>
              <div className="gtn-mode-attempts">{m.rounds} rounds</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Higher or Lower</h2>
      <p className="description">Round {round} of {maxRounds}</p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Correct</div>
          <div className="hol-stat-num player">{correctCount}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Streak</div>
          <div className={`hol-stat-num ${streak >= 3 ? 'fire' : ''}`}>🔥 {streak}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Best</div>
          <div className="hol-stat-num">{bestStreak}</div>
        </div>
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{correctCount > maxRounds / 2 ? '🃏' : '😔'}</div>
          <div className={`result-text ${correctCount > maxRounds / 2 ? 'win' : 'lose'}`}>
            {correctCount > maxRounds / 2 ? 'Nice Instincts!' : 'Better Luck Next Time!'}
          </div>
          <div className="rps-final-score">
            <span className="player">{correctCount}</span>
            <span className="sep">/</span>
            <span className="bot">{maxRounds}</span>
          </div>
          <div className="result-message">Best streak: 🔥 {bestStreak}</div>
          <div className="gtn-all-guesses">
            {history.map((h, i) => (
              <span key={i} className={`gtn-final-guess ${h.correct ? 'higher' : 'lower'}`}>
                {h.nextCard.value}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={reset}>Play Again</button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }} onClick={quitToMenu}>Change Difficulty</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      ) : currentCard ? (
        <>
          <div className="hol-cards">
            <div className="hol-card-col">
              <div className="hol-card-label">Current</div>
              <div className={`hol-card ${isRed(currentCard.suit) ? 'red' : 'black'}`}>
                <div className="hol-card-top">{currentCard.value}<br/>{currentCard.suit}</div>
                <div className="hol-card-center">{currentCard.suit}</div>
                <div className="hol-card-bottom">{currentCard.value}<br/>{currentCard.suit}</div>
              </div>
            </div>

            <div className="hol-vs">
              {animating ? (
                <div className="gtn-thinking">🤔</div>
              ) : result ? (
                <div className={`hol-result-icon ${result}`}>{result === 'correct' ? '✓' : '✗'}</div>
              ) : (
                <div className="rps-vs-text">VS</div>
              )}
            </div>

            <div className="hol-card-col">
              <div className="hol-card-label">Next</div>
              {reveal && nextCard ? (
                <div className={`hol-card revealed ${isRed(nextCard.suit) ? 'red' : 'black'}`}>
                  <div className="hol-card-top">{nextCard.value}<br/>{nextCard.suit}</div>
                  <div className="hol-card-center">{nextCard.suit}</div>
                  <div className="hol-card-bottom">{nextCard.value}<br/>{nextCard.suit}</div>
                </div>
              ) : (
                <div className="hol-card back">
                  <div className="hol-card-back-pattern">?</div>
                </div>
              )}
            </div>
          </div>

          {!result && !animating && (
            <div className="hol-buttons">
              <button className="hol-btn higher" onClick={() => makeGuess('higher')} disabled={animating}>
                ⬆️ Higher
              </button>
              <button className="hol-btn lower" onClick={() => makeGuess('lower')} disabled={animating}>
                ⬇️ Lower
              </button>
            </div>
          )}
        </>
      ) : null}

      {history.length > 0 && (
        <div className="rps-history">
          <div className="rps-history-label">Round History</div>
          <div className="rps-history-list">
            {history.slice(-10).map((h, i) => (
              <div key={i} className={`rps-history-item ${h.correct ? 'win' : 'lose'}`}>
                <span className="history-round">#{h.round}</span>
                <span className="history-pick">{h.card.value}{h.card.suit}</span>
                <span className="history-vs">{h.guess === 'higher' ? '↑' : '↓'}</span>
                <span className="history-pick">{h.nextCard.value}{h.nextCard.suit}</span>
                <span className={`history-result ${h.correct ? 'win' : 'lose'}`}>
                  {h.correct ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={quitToMenu} className="quit-btn">
          {gameOver ? 'New Game' : 'Quit Game'}
        </button>
      </div>
    </div>
  )
}
