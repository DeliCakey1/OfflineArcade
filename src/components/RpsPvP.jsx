import { useState, useEffect, useRef } from 'react'
import { connectPvP, sendRpsChoice, onEvent, leaveQueue, getSocket } from '../pvpClient'
import PvPMatchmaker from './PvPMatchmaker'
import QuitConfirmButton from './QuitConfirmButton'
import Confetti from './Confetti'
import useStats from '../useStats'

const CHOICES = [
  { name: 'rock', emoji: '🪨', label: 'Rock' },
  { name: 'paper', emoji: '📄', label: 'Paper' },
  { name: 'scissors', emoji: '✂️', label: 'Scissors' },
]

const RESULT_EMOJI = { p1: '👉', p2: '👈', draw: '🤝' }

export default function RpsPvP({ onPlayingChange }) {
  const [phase, setPhase] = useState('lobby')
  const [matchData, setMatchData] = useState(null)
  const [mySide, setMySide] = useState(null)
  const [opponentName, setOpponentName] = useState(null)
  const [scores, setScores] = useState({ p1: 0, p2: 0, draws: 0 })
  const [round, setRound] = useState(0)
  const [myChoice, setMyChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [timer, setTimer] = useState(10)
  const [gameOver, setGameOver] = useState(null)
  const [confetti, setConfetti] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])
  const timerRef = useRef(null)
  const { recordGame } = useStats('rps')
  const isPlaying = phase === 'playing'

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])

  useEffect(() => {
    const unsubs = []
    unsubs.push(onEvent('game:start', (data) => {
      setMatchData(data)
      setMySide(data.side)
      setOpponentName(data.opponent?.username || 'Opponent')
      setPhase('playing')
      setScores({ p1: 0, p2: 0, draws: 0 })
      setRound(0)
      setHistory([])
      setGameOver(null)
    }))
    unsubs.push(onEvent('game:round', (data) => {
      setRound(data.round)
      setScores(s => ({ ...s, p1: data.p1Wins, p2: data.p2Wins }))
      setMyChoice(null)
      setResult(null)
      setSelected(null)
      setWaiting(false)
      setTimer(10)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) { clearInterval(timerRef.current); return 0 }
          return t - 1
        })
      }, 1000)
    }))
    unsubs.push(onEvent('game:result', (data) => {
      setResult(data)
      setHistory(h => [...h, { round, ...data }])
      if (data.result === 'draw') setScores(s => ({ ...s, draws: s.draws + 1 }))
      else if (data.result === mySide) setScores(s => ({ ...s, [mySide]: s[mySide] + 1 }))
      if (timerRef.current) clearInterval(timerRef.current)
    }))
    unsubs.push(onEvent('rps:waiting', () => {
      setWaiting(true)
    }))
    unsubs.push(onEvent('game:over', (data) => {
      setGameOver(data)
      const won = data.winnerId === getSocket()?.userId
      recordGame(won, 0)
      if (won) setConfetti(true)
      if (timerRef.current) clearInterval(timerRef.current)
    }))
    unsubs.push(onEvent('game:opponent-disconnected', () => {
      setGameOver({ winnerName: 'You', reason: 'opponent_disconnected', score: scores })
      setPhase('gameover')
      recordGame(true, 0)
      setConfetti(true)
      if (timerRef.current) clearInterval(timerRef.current)
    }))
    return () => {
      unsubs.forEach(fn => fn())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [mySide, round, scores])

  function choose(choice) {
    if (selected || result || gameOver) return
    setSelected(choice)
    sendRpsChoice(choice)
  }

  function handleShare() {
    const won = gameOver?.winnerName === 'You'
    const text = `✊ RPS PvP — ${won ? 'Won' : 'Lost'} ${scores.p1}-${scores.p2} vs ${opponentName}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function reset() {
    setPhase('lobby')
    setMatchData(null)
    setMySide(null)
    setOpponentName(null)
    setScores({ p1: 0, p2: 0, draws: 0 })
    setRound(0)
    setMyChoice(null)
    setResult(null)
    setSelected(null)
    setWaiting(false)
    setTimer(10)
    setGameOver(null)
    setConfetti(false)
    setCopied(false)
    setHistory([])
  }

  if (phase === 'lobby') {
    return (
      <div className="game-card slide-in">
        <h2>✊ Rock Paper Scissors PvP</h2>
        <p className="description">Real-time best-of-5 against a real player!</p>
        <PvPMatchmaker
          gameId="rps"
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
        <h2>✊ Rock Paper Scissors PvP</h2>
        <div className="pvp-countdown">
          <div className="pvp-countdown-vs">VS</div>
          <div className="pvp-countdown-names">
            <span style={{ color: 'var(--neon-cyan)' }}>You</span>
            <span style={{ color: 'var(--text-dim)', margin: '0 16px' }}>vs</span>
            <span style={{ color: 'var(--neon-pink)' }}>{opponentName}</span>
          </div>
          <div className="pvp-countdown-text">Best of 5 — Get Ready...</div>
        </div>
      </div>
    )
  }

  const myScore = scores[mySide] || 0
  const oppScore = scores[mySide === 'p1' ? 'p2' : 'p1'] || 0
  const myChoiceData = result ? CHOICES.find(c => c.name === result[mySide]) : null
  const oppChoiceData = result ? CHOICES.find(c => c.name === result[mySide === 'p1' ? 'p2' : 'p1']) : null
  const myResult = result ? (result.result === 'draw' ? 'draw' : result.result === mySide ? 'win' : 'lose') : null

  return (
    <div className="game-card slide-in">
      <Confetti active={confetti} onDone={() => setConfetti(false)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <QuitConfirmButton onQuit={() => { leaveQueue(); reset() }} gameOver={!!gameOver} className="quit-btn" />
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Best of 5 — Round {round || '—'}
        </div>
      </div>

      <div className="rps-scoreboard">
        <div className="rps-score-side">
          <div className="rps-score-label">You</div>
          <div className="rps-score-num player">{myScore}</div>
        </div>
        <div className="rps-score-center">
          <div className="rps-draws-label">Draws</div>
          <div className="rps-draws-num">{scores.draws}</div>
        </div>
        <div className="rps-score-side">
          <div className="rps-score-label">{opponentName}</div>
          <div className="rps-score-num bot">{oppScore}</div>
        </div>
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{gameOver.winnerName === 'You' ? '🏆' : '💀'}</div>
          <div className={`result-text ${gameOver.winnerName === 'You' ? 'win' : 'lose'}`}>
            {gameOver.reason === 'opponent_disconnected' ? 'Opponent Left!' : gameOver.winnerName === 'You' ? 'You Win!' : 'You Lose!'}
          </div>
          <div className="rps-final-score">
            <span className="player">{myScore}</span>
            <span className="sep">-</span>
            <span className="bot">{oppScore}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={reset}>Play Again</button>
            <button className="play-again-btn share-btn" onClick={handleShare}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      ) : result ? (
        <>
          <div className="rps-battle-area">
            <div className={`rps-fighter ${myResult === 'win' ? 'winner-glow' : ''} ${myResult === 'lose' ? 'loser-dim' : ''}`}>
              <div className="rps-fighter-label">You</div>
              <div className="rps-fighter-emoji revealed">{myChoiceData?.emoji || '❓'}</div>
              {myChoiceData && <div className="rps-fighter-name">{myChoiceData.label}</div>}
            </div>
            <div className="rps-vs">
              <div className={`rps-vs-result ${myResult}`}>{myResult === 'win' ? '→' : myResult === 'lose' ? '←' : '='}</div>
            </div>
            <div className={`rps-fighter ${myResult === 'lose' ? 'winner-glow' : ''} ${myResult === 'win' ? 'loser-dim' : ''}`}>
              <div className="rps-fighter-label">{opponentName}</div>
              <div className="rps-fighter-emoji revealed">{oppChoiceData?.emoji || '❓'}</div>
              {oppChoiceData && <div className="rps-fighter-name">{oppChoiceData.label}</div>}
            </div>
          </div>
          <div className="result-area-inner">
            <div className={`result-text ${myResult}`} style={{ fontSize: 20 }}>
              {myResult === 'win' ? 'You Win!' : myResult === 'lose' ? 'You Lose!' : 'Draw!'}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="pvp-rps-timer">
            <div className="pvp-rps-timer-bar" style={{ width: `${(timer / 10) * 100}%` }} />
            <div className="pvp-rps-timer-text">{timer}s</div>
          </div>

          {waiting && !selected && (
            <div className="result-message">Waiting for opponent...</div>
          )}

          {!result && (
            <div className="rps-choices-row">
              {CHOICES.map(c => (
                <button
                  key={c.name}
                  className={`choice-btn ${c.name} ${selected === c.name ? 'selected' : ''}`}
                  onClick={() => choose(c.name)}
                  disabled={!!selected || !!result}
                >
                  <span className="choice-emoji">{c.emoji}</span>
                  <span className="choice-name">{c.label}</span>
                </button>
              ))}
            </div>
          )}

          {selected && !result && (
            <div className="result-message">You picked {CHOICES.find(c => c.name === selected)?.emoji} — waiting for opponent...</div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="rps-history">
          <div className="rps-history-label">Recent Rounds</div>
          <div className="rps-history-list">
            {history.slice(-8).map((h, i) => (
              <div key={i} className={`rps-history-item ${h.result === mySide ? 'win' : h.result === 'draw' ? 'draw' : 'lose'}`}>
                <span className="history-round">#{h.round}</span>
                <span className="history-pick">{CHOICES.find(c => c.name === h[mySide])?.emoji || '❓'}</span>
                <span className="history-vs">vs</span>
                <span className="history-pick">{CHOICES.find(c => c.name === h[mySide === 'p1' ? 'p2' : 'p1'])?.emoji || '❓'}</span>
                <span className={`history-result ${h.result === mySide ? 'win' : h.result === 'draw' ? 'draw' : 'lose'}`}>
                  {h.result === mySide ? 'W' : h.result === 'draw' ? 'D' : 'L'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
