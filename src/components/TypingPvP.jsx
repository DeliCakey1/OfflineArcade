import { useState, useEffect, useRef } from 'react'
import { connectPvP, sendTypingProgress, sendTypingFinish, onEvent, leaveQueue, getSocket } from '../pvpClient'
import PvPMatchmaker from './PvPMatchmaker'
import QuitConfirmButton from './QuitConfirmButton'
import useStats from '../useStats'

export default function TypingPvP({ onPlayingChange }) {
  const [phase, setPhase] = useState('lobby')
  const [matchData, setMatchData] = useState(null)
  const [sentence, setSentence] = useState('')
  const [mySide, setMySide] = useState(null)
  const [opponentName, setOpponentName] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [input, setInput] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalTyped, setTotalTyped] = useState(0)
  const [myWpm, setMyWpm] = useState(0)
  const [oppWpm, setOppWpm] = useState(0)
  const [oppFinished, setOppFinished] = useState(false)
  const [gameOver, setGameOver] = useState(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const progressTimerRef = useRef(null)
  const { recordGame } = useStats('typing')
  const isPlaying = phase === 'playing'

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])

  useEffect(() => {
    const unsubs = []
    unsubs.push(onEvent('game:start', (data) => {
      setSentence(data.sentence)
      setMySide(data.side)
      setOpponentName(data.opponent?.username || 'Opponent')
      setPhase('playing')
      setTimeLeft(Math.round(data.timeLimit / 1000))
      setStartTime(null)
      setInput('')
      setCorrectCount(0)
      setTotalTyped(0)
      setMyWpm(0)
      setOppWpm(0)
      setOppFinished(false)
      setGameOver(null)
    }))
    unsubs.push(onEvent('game:progress', (data) => {
      setOppWpm(data.wpm || 0)
      if (data.finished) setOppFinished(true)
    }))
    unsubs.push(onEvent('game:over', (data) => {
      setGameOver(data)
      setPhase('gameover')
      const won = data.winnerId === getSocket()?.userId
      recordGame(won, myWpm)
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }))
    unsubs.push(onEvent('game:opponent-disconnected', () => {
      setGameOver({ winnerName: 'You', reason: 'opponent_disconnected' })
      setPhase('gameover')
      recordGame(true, myWpm)
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }))
    return () => {
      unsubs.forEach(fn => fn())
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [myWpm])

  useEffect(() => {
    if (phase !== 'playing') return
    if (inputRef.current) inputRef.current.focus()

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          sendTypingFinish()
          return 0
        }
        return t - 1
      })
    }, 1000)

    progressTimerRef.current = setInterval(() => {
      sendTypingProgress(myWpm, sentence.length > 0 ? Math.round((correctCount / Math.max(totalTyped, 1)) * 100) : 0)
    }, 500)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [phase])

  function handleInput(e) {
    const val = e.target.value
    setInput(val)

    if (!startTime) {
      setStartTime(Date.now())
    }

    const elapsed = (Date.now() - (startTime || Date.now())) / 60000
    const words = val.trim().split(/\s+/).filter(Boolean).length
    const wpm = elapsed > 0 ? Math.round(words / elapsed) : 0
    setMyWpm(wpm)

    const wordsArr = sentence.split(' ')
    let correct = 0
    const typedWords = val.trim().split(/\s+/)
    for (let i = 0; i < typedWords.length && i < wordsArr.length; i++) {
      if (typedWords[i] === wordsArr[i]) correct++
    }
    setCorrectCount(correct)
    setTotalTyped(typedWords.length)
  }

  function handleFinishedInput(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      const val = input.trim()
      if (val.length > 0 && val === sentence) {
        sendTypingFinish()
        if (timerRef.current) clearInterval(timerRef.current)
        if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      }
    }
  }

  function handleShare() {
    const won = gameOver?.winnerName === 'You'
    const text = `⌨️ Typing PvP — ${won ? 'Won' : 'Lost'} | ${myWpm} WPM vs ${opponentName}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function reset() {
    setPhase('lobby')
    setMatchData(null)
    setSentence('')
    setMySide(null)
    setOpponentName('')
    setTimeLeft(30)
    setInput('')
    setStartTime(null)
    setCorrectCount(0)
    setTotalTyped(0)
    setMyWpm(0)
    setOppWpm(0)
    setOppFinished(false)
    setGameOver(null)
    setCopied(false)
  }

  const sentenceWords = sentence.split(' ')
  const typedWords = input.trim().split(/\s+/)

  if (phase === 'lobby') {
    return (
      <div className="game-card slide-in">
        <h2>⌨️ Typing PvP</h2>
        <p className="description">Race against a real player! Type the sentence before your time runs out.</p>
        <PvPMatchmaker
          gameId="typing"
          userId={getSocket()?.userId}
          username={getSocket()?.username}
          onMatchFound={(data) => {
            setMatchData(data)
            setMySide(data.side)
            setOpponentName(data.opponent?.username || 'Opponent')
            setPhase('countdown')
            setTimeout(() => setPhase('playing'), 1500)
          }}
          onCancel={() => {}}
        />
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div className="game-card slide-in">
        <h2>⌨️ Typing PvP</h2>
        <div className="pvp-countdown">
          <div className="pvp-countdown-vs">VS</div>
          <div className="pvp-countdown-names">
            <span style={{ color: 'var(--neon-cyan)' }}>You</span>
            <span style={{ color: 'var(--text-dim)', margin: '0 16px' }}>vs</span>
            <span style={{ color: 'var(--neon-pink)' }}>{opponentName}</span>
          </div>
          <div className="pvp-countdown-text">Get Ready...</div>
        </div>
      </div>
    )
  }

  if (phase === 'gameover') {
    const won = gameOver?.winnerName === 'You'
    return (
      <div className="game-card slide-in">
        <h2>⌨️ Typing PvP</h2>
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{won ? '⌨️' : '💀'}</div>
          <div className={`result-text ${won ? 'win' : 'lose'}`}>
            {gameOver?.reason === 'opponent_disconnected' ? 'Opponent Left!' : won ? 'You Win!' : 'You Lose!'}
          </div>
          <div className="rps-final-score">
            <span className="player">{myWpm}</span>
            <span className="sep">WPM</span>
            <span className="bot">{oppWpm} WPM</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={reset}>Play Again</button>
            <button className="play-again-btn share-btn" onClick={handleShare}>
              {copied ? '✓ Copied!' : '📋 Share'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>⌨️ Typing PvP</h2>
      <p className="description">Type the sentence before time runs out!</p>

      <div className="hol-stats-row">
        <div className="hol-stat">
          <div className="hol-stat-label">Your WPM</div>
          <div className="hol-stat-num player">{myWpm}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">Time</div>
          <div className="hol-stat-num" style={{ color: timeLeft <= 10 ? 'var(--neon-red)' : 'var(--neon-green)' }}>{timeLeft}s</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-label">{opponentName}</div>
          <div className="hol-stat-num" style={{ color: 'var(--neon-pink)' }}>{oppWpm} {oppFinished ? '✓' : ''}</div>
        </div>
      </div>

      <div className="memory-progress">
        <div className="memory-progress-fill" style={{ width: `${(timeLeft / 30) * 100}%`, background: timeLeft <= 10 ? 'var(--neon-red)' : undefined }} />
      </div>

      <div className="typing-area">
        <div className="typing-words-display">
          {sentenceWords.map((w, i) => {
            const isCurrent = i === typedWords.length - (input.endsWith(' ') ? 0 : 1)
            const isDone = i < typedWords.length
            const isCorrect = isDone && typedWords[i] === w
            return (
              <span key={i} className={`typing-word ${isCurrent ? 'current' : ''} ${isDone ? (isCorrect ? 'correct' : 'wrong') : ''}`}>
                {w}
              </span>
            )
          })}
        </div>
        <div className="typing-current">
          <span className="typing-cursor-label">{sentenceWords[typedWords.length - (input.endsWith(' ') ? 0 : 1)] || ''}</span>
        </div>
        <input
          ref={inputRef}
          className="typing-input"
          type="text"
          value={input}
          onChange={handleInput}
          onKeyDown={handleFinishedInput}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder="Type here..."
        />
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <QuitConfirmButton onQuit={() => { leaveQueue(); reset() }} gameOver={!!gameOver} className="quit-btn" />
      </div>
    </div>
  )
}
