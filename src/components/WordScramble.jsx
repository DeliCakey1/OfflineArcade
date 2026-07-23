import { useState, useEffect } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const WORDS = {
  Easy: ['cat','dog','sun','hat','pen','box','red','top','fun','run','cup','jam','map','sky','bee','pie','fox','owl','bus','rug'],
  Normal: ['brave','cloud','dance','earth','flame','ghost','honey','jolly','lemon','ocean','piano','queen','river','snake','tiger','ultra','wagon','yacht','zebra','coral'],
  Hard: ['abrupt','breeze','cipher','donkey','emerald','fossil','galaxy','hazard','island','jungle','kernel','legend','mystic','orchid','photon','quartz','riddle','shadow','throne','voyage'],
  Expert: ['alchemy','buffalo','chapter','dolphin','example','fortune','harvest','imagine','journey','kitchen','leather','million','network','passion','quality','routine','sandwich','terrible','umbrella','warrior'],
}

const MODES = [
  { name: 'Easy', emoji: '🟢', color: '#39ff14', hint: true },
  { name: 'Normal', emoji: '🟡', color: '#ffe600', hint: true },
  { name: 'Hard', emoji: '🟠', color: '#ff6b2b', hint: false },
  { name: 'Expert', emoji: '💀', color: '#ff2d7b', hint: false },
]

const ROUNDS = [5, 10, 15]

function scrambleWord(word) {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const s = arr.join('')
  return s === word && arr.length > 1 ? scrambleWord(word) : s
}

function getHint(word) {
  return word[0] + '_'.repeat(word.length - 1)
}

function pickWordFromPool(modeName) {
  const pool = WORDS[modeName] || WORDS.Normal
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function WordScramble({ onPlayingChange }) {
  const [mode, setMode] = useState(null)
  const [selectedRounds, setSelectedRounds] = useState(null)
  const [totalRounds, setTotalRounds] = useState(0)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [guess, setGuess] = useState('')
  const [currentWord, setCurrentWord] = useState('')
  const [scrambled, setScrambled] = useState('')
  const [result, setResult] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const sound = useSound()
  const { recordGame } = useStats('word')
  const isPlaying = mode && totalRounds > 0 && !gameOver

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  function startGame(modeObj, rounds) {
    const w = pickWordFromPool(modeObj.name)
    setMode(modeObj)
    setTotalRounds(rounds)
    setRound(1)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setHintsUsed(0)
    setShowHint(false)
    setGameOver(false)
    setCopied(false)
    setCurrentWord(w)
    setScrambled(scrambleWord(w))
    setGuess('')
    setResult(null)
  }

  function nextWord() {
    setShowHint(false)
    const w = pickWordFromPool(mode.name)
    setCurrentWord(w)
    setScrambled(scrambleWord(w))
    setGuess('')
    setResult(null)
  }

  function submitGuess() {
    const g = guess.trim().toLowerCase()
    if (!g || result !== null) return
    sound('click')
    if (g === currentWord) {
      const pts = showHint ? 5 : 10
      const streakBonus = streak >= 2 ? streak * 2 : 0
      setScore(s => s + pts + streakBonus)
      setStreak(s => s + 1)
      setBestStreak(b => Math.max(b, streak + 1))
      setResult('win')
      sound('win')
    } else {
      setStreak(0)
      setResult('lose')
      sound('lose')
    }
  }

  function handleNext() {
    if (round >= totalRounds) {
      setGameOver(true)
      recordGame(score >= totalRounds * 5, score)
      sound(score >= totalRounds * 5 ? 'victory' : 'lose')
    } else {
      setRound(r => r + 1)
      nextWord()
    }
  }

  function handleHint() {
    setShowHint(true)
    setHintsUsed(h => h + 1)
    sound('click')
  }

  function handleSkip() {
    sound('lose')
    setStreak(0)
    setResult('skip')
  }

  function shareResult() {
    const lines = [
      `📚 Beat the bot at Word Scramble (${mode.name})!`,
      `📊 ${score} pts | ${totalRounds} rounds | 🔥 Best streak: ${bestStreak}`,
      hintsUsed > 0 ? `💡 Hints used: ${hintsUsed}` : '',
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
        <h2>Word Scramble</h2>
        <p className="description">Unscramble the letters to guess the word!</p>
        <div className="ssg-prize-picker">
          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 600 }}>ROUNDS</div>
          <div className="ssg-prize-options">
            {ROUNDS.map(r => (
              <button key={r}
                className={`ssg-prize-btn ${selectedRounds === r ? 'selected' : ''}`}
                onClick={() => { sound('click'); setSelectedRounds(r) }}>
                {r}
              </button>
            ))}
          </div>
          {!selectedRounds && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--neon-yellow)', marginTop: 8 }}>
              Select rounds first
            </div>
          )}
        </div>
        <div className="gtn-mode-grid">
          {MODES.map(m => (
            <button key={m.name} className="gtn-mode-card" style={{ '--mode-color': m.color }}
              onClick={() => { sound('click'); if (selectedRounds) startGame(m, selectedRounds) }}>
              <div className="gtn-mode-emoji">{m.emoji}</div>
              <div className="gtn-mode-name">{m.name}</div>
              <div className="gtn-mode-attempts">{m.hint ? 'Hints available' : 'No hints'}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Word Scramble</h2>
      <p className="description">Unscramble the letters!</p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Score</div>
          <div className="hol-stat-num player">{score}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Round</div>
          <div className="hol-stat-num">{round}/{totalRounds}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Streak</div>
          <div className="hol-stat-num">{streak > 0 ? `🔥${streak}` : '—'}</div>
        </div>
      </div>

      <div className="memory-progress">
        <div className="memory-progress-fill" style={{ width: `${(round / totalRounds) * 100}%` }} />
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">📚</div>
          <div className={`result-text ${score >= totalRounds * 5 ? 'win' : 'lose'}`}>
            {score >= totalRounds * 5 ? 'Great Vocabulary!' : 'Better Luck Next Time!'}
          </div>
          <div className="rps-final-score">
            <span className="player">{score}</span>
            <span className="sep">points</span>
            <span className="bot">🔥 {bestStreak} best streak</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={() => { sound('click'); startGame(mode, totalRounds) }}>Play Again</button>
            <button className="play-again-btn" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}
              onClick={() => { sound('click'); setMode(null); setTotalRounds(0); setSelectedRounds(null) }}>New Game</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      ) : (
        <div className="word-scramble-area">
          <div className="word-scramble-letters">
            {scrambled.split('').map((ch, i) => (
              <div key={i} className="word-scramble-tile">{ch.toUpperCase()}</div>
            ))}
          </div>

          {showHint && (
            <div className="word-scramble-hint">
              Hint: {getHint(currentWord)}
            </div>
          )}

          {result !== null ? (
            <div className="word-scramble-result">
              {result === 'win' ? (
                <div className="result-message">
                  ✅ Correct! {streak >= 2 ? `🔥 +${10 + streak * 2} pts (+${streak * 2} streak bonus)` : '+10 pts'}
                </div>
              ) : (
                <div className="result-message" style={{ color: 'var(--neon-red)' }}>
                  {result === 'skip' ? '⏭ Skipped' : '❌ Wrong!'} The word was: <strong>{currentWord}</strong>
                </div>
              )}
              <button className="play-again-btn" onClick={handleNext}>
                {round >= totalRounds ? 'See Results' : 'Next Word →'}
              </button>
            </div>
          ) : (
            <div className="word-scramble-input-area">
              <input
                className="word-scramble-input"
                aria-label="Type your guess"
                type="text"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitGuess()}
                placeholder="Type your guess..."
                autoFocus
              />
              <div className="word-scramble-actions">
                <button className="play-again-btn" onClick={submitGuess} disabled={!guess.trim()}>
                  Guess
                </button>
                {mode.hint && !showHint && (
                  <button className="play-again-btn" onClick={handleHint} style={{ background: 'linear-gradient(135deg, var(--neon-yellow), var(--neon-orange))' }}>
                    💡 Hint
                  </button>
                )}
                <button className="play-again-btn" onClick={handleSkip} style={{ background: 'linear-gradient(135deg, #666, #888)' }}>
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <QuitConfirmButton onQuit={() => { setMode(null); setTotalRounds(0); setSelectedRounds(null); onPlayingChange?.(false) }} gameOver={gameOver} className="quit-btn" />
      </div>
    </div>
  )
}
