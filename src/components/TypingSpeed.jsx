import { useState, useEffect, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const MODES = [
  { name: 'Easy', emoji: '🟢', color: '#39ff14', words: ['the','cat','sun','run','big','red','hat','dog','pen','cup','top','fun','map','box','sky','bee','fox','owl','jam','bus'], rounds: 10 },
  { name: 'Normal', emoji: '🟡', color: '#ffe600', words: ['hello','world','quick','brown','jumps','music','dance','happy','ocean','brave','cloud','earth','flame','ghost','honey','jolly','lemon','piano','queen','river'], rounds: 10 },
  { name: 'Hard', emoji: '🟠', color: '#ff6b2b', words: ['abrupt','breeze','cipher','donkey','emerald','fossil','galaxy','hazard','island','jungle','kernel','legend','mystic','orchid','photon','quartz','riddle','shadow','throne','voyage'], rounds: 10 },
  { name: 'Expert', emoji: '💀', color: '#ff2d7b', words: ['algorithm','beautiful','challenge','dangerous','elaborate','foundation','generously','hamburger','illustrate','jailbreak','kaleidoscope','labyrinth','magnificent','navigation','overwhelmed','phenomenal','revolution','spectacular','temperature','unbelievable'], rounds: 10 },
]

function pickWords(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export default function TypingSpeed({ onPlayingChange }) {
  const [mode, setMode] = useState(null)
  const [words, setWords] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [input, setInput] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [results, setResults] = useState([])
  const [correctCount, setCorrectCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wpm, setWpm] = useState(0)
  const inputRef = useRef(null)
  const sound = useSound()
  const { recordGame } = useStats('typing')
  const isPlaying = mode && !gameOver

  useEffect(() => {
    onPlayingChange?.(isPlaying)
    return () => onPlayingChange?.(false)
  }, [isPlaying, onPlayingChange])

  useEffect(() => {
    if (mode && inputRef.current) inputRef.current.focus()
  }, [mode, currentIdx, gameOver])

  function startGame(m) {
    setMode(m)
    const w = pickWords(m.words, m.rounds)
    setWords(w)
    setCurrentIdx(0)
    setInput('')
    setStartTime(null)
    setResults([])
    setCorrectCount(0)
    setGameOver(false)
    setCopied(false)
    setWpm(0)
  }

  function handleInput(e) {
    const val = e.target.value
    setInput(val)

    if (!startTime) setStartTime(Date.now())

    if (val.endsWith(' ') || val.endsWith('\n')) {
      const typed = val.trim().toLowerCase()
      const correct = typed === words[currentIdx].toLowerCase()
      sound(correct ? 'win' : 'lose')
      const elapsed = (Date.now() - startTime) / 60000
      const charsTyped = results.reduce((sum, r) => sum + r.word.length + 1, 0) + typed.length + 1
      const currentWpm = elapsed > 0 ? Math.round((charsTyped / 5) / elapsed) : 0

      setResults(r => [...r, { word: words[currentIdx], typed, correct, wpm: currentWpm }])
      if (correct) setCorrectCount(c => c + 1)
      setWpm(currentWpm)

      if (currentIdx + 1 >= words.length) {
        setGameOver(true)
        const totalChars = results.reduce((sum, r) => sum + r.word.length + 1, 0) + typed.length + 1
        const finalElapsed = (Date.now() - startTime) / 60000
        const finalWpm = finalElapsed > 0 ? Math.round((totalChars / 5) / finalElapsed) : 0
        setWpm(finalWpm)
        recordGame(finalWpm > 20, finalWpm)
        sound(finalWpm > 20 ? 'victory' : 'lose')
      } else {
        setCurrentIdx(i => i + 1)
      }
      setInput('')
    }
  }

  function shareResult() {
    const totalCorrect = results.filter(r => r.correct).length
    const lines = [
      `⌨️ Beat the bot at Typing Speed (${mode.name})!`,
      `📊 ${wpm} WPM | ${totalCorrect}/${words.length} correct | ${Math.round((totalCorrect / words.length) * 100)}% accuracy`,
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
        <h2>Typing Speed</h2>
        <p className="description">Type each word and press space. How fast can you go?</p>
        <div className="gtn-mode-grid">
          {MODES.map(m => (
            <button key={m.name} className="gtn-mode-card" style={{ '--mode-color': m.color }}
              onClick={() => { sound('click'); startGame(m) }}>
              <div className="gtn-mode-emoji">{m.emoji}</div>
              <div className="gtn-mode-name">{m.name}</div>
              <div className="gtn-mode-attempts">{m.words[0]}...{m.words[1]}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Typing Speed</h2>
      <p className="description">Type each word then press Space</p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">WPM</div>
          <div className="hol-stat-num player">{wpm || '—'}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Progress</div>
          <div className="hol-stat-num">{currentIdx + (gameOver ? 0 : 1)}/{words.length}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Accuracy</div>
          <div className="hol-stat-num">{results.length > 0 ? `${Math.round((correctCount / results.length) * 100)}%` : '—'}</div>
        </div>
      </div>

      <div className="memory-progress">
        <div className="memory-progress-fill" style={{ width: `${((currentIdx + (gameOver ? 0 : 1)) / words.length) * 100}%` }} />
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">⌨️</div>
          <div className="result-text" style={{ color: wpm > 20 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
            {wpm > 40 ? 'Typing Master!' : wpm > 20 ? 'Good Typing!' : 'Keep Practicing!'}
          </div>
          <div className="rps-final-score">
            <span className="player">{wpm}</span>
            <span className="sep">WPM</span>
            <span className="bot">{Math.round((correctCount / words.length) * 100)}% acc</span>
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
      ) : (
        <div className="typing-area">
          <div className="typing-words-display">
            {words.map((w, i) => {
              const isCurrent = i === currentIdx
              const isDone = i < currentIdx
              const result = results[i]
              return (
                <span key={i} className={`typing-word ${isCurrent ? 'current' : ''} ${isDone ? (result?.correct ? 'correct' : 'wrong') : ''}`}>
                  {w}
                </span>
              )
            })}
          </div>
          <div className="typing-current">
            <span className="typing-cursor-label">{words[currentIdx]}</span>
          </div>
          <input
            ref={inputRef}
            className="typing-input"
            aria-label="Type the displayed text"
            type="text"
            value={input}
            onChange={handleInput}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder="Type here..."
          />
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <QuitConfirmButton onQuit={() => { setMode(null); onPlayingChange?.(false) }} gameOver={gameOver} className="quit-btn" />
      </div>
    </div>
  )
}
