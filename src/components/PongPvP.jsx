import { useState, useEffect, useRef, useCallback } from 'react'
import { connectPvP, sendPaddleMove, onEvent, leaveQueue, getSocket } from '../pvpClient'
import PvPMatchmaker from './PvPMatchmaker'
import QuitConfirmButton from './QuitConfirmButton'
import useStats from '../useStats'

const W = 480, H = 320
const PADDLE_W = 10, PADDLE_OFFSET = 20, PADDLE_H = 70, BALL_R = 7

export default function PongPvP({ onPlayingChange }) {
  const [phase, setPhase] = useState('lobby')
  const [matchData, setMatchData] = useState(null)
  const [gameOver, setGameOver] = useState(null)
  const [scores, setScores] = useState({ p1: 0, p2: 0 })
  const [mySide, setMySide] = useState(null)
  const [opponentName, setOpponentName] = useState('')
  const [copied, setCopied] = useState(false)
  const [rally, setRally] = useState(0)
  const canvasRef = useRef(null)
  const stateRef = useRef({ ballX: W / 2, ballY: H / 2, p1Y: H / 2, p2Y: H / 2, p1Score: 0, p2Score: 0 })
  const animRef = useRef(null)
  const mouseYRef = useRef(H / 2)
  const { recordGame } = useStats('pong')
  const isPlaying = phase === 'playing'

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])

  useEffect(() => {
    const unsubs = []
    unsubs.push(onEvent('game:start', (data) => {
      setPhase('playing')
      setMatchData(data)
      setMySide(data.side)
      setOpponentName(data.opponent?.username || 'Opponent')
    }))
    unsubs.push(onEvent('game:state', (s) => {
      stateRef.current = s
      setScores({ p1: s.p1Score, p2: s.p2Score })
      setRally(s.rally)
    }))
    unsubs.push(onEvent('game:over', (data) => {
      const won = data.winnerId === matchData?.opponent?.userId ? false : data.winnerId === getSocket()?.userId
      setGameOver(data)
      setScores(data.score)
      setPhase('gameover')
      recordGame(data.winnerId === getSocket()?.userId, 0)
    }))
    unsubs.push(onEvent('game:opponent-disconnected', () => {
      setGameOver({ winnerName: 'You', reason: 'opponent_disconnected' })
      setPhase('gameover')
      recordGame(true, 0)
    }))
    return () => unsubs.forEach(fn => fn())
  }, [matchData])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || phase !== 'playing') { animRef.current = requestAnimationFrame(gameLoop); return }
    const ctx = canvas.getContext('2d')
    const s = stateRef.current

    if (mySide === 'p2') {
      const myY = mouseYRef.current
      const clamped = Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, myY))
      sendPaddleMove(clamped)
    } else {
      const myY = mouseYRef.current
      const clamped = Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, myY))
      sendPaddleMove(clamped)
    }

    ctx.clearRect(0, 0, W, H)
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#0a0a2e')
    bg.addColorStop(1, '#16213e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.setLineDash([8, 8])
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W / 2, 0)
    ctx.lineTo(W / 2, H)
    ctx.stroke()
    ctx.setLineDash([])

    for (let i = 5; i > 0; i--) {
      const alpha = 0.08 * (5 - i) / 5
      ctx.fillStyle = `rgba(255,230,0,${alpha})`
      ctx.beginPath()
      ctx.arc(s.ballX - (stateRef.current.ballVX || 0) * i * 1.5, s.ballY - (stateRef.current.ballVY || 0) * i * 1.5, BALL_R * 0.8, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#ffe600'
    ctx.shadowColor = '#ffe600'
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    const leftColor = mySide === 'p1' ? '#00d4ff' : '#ff2d7b'
    const rightColor = mySide === 'p1' ? '#ff2d7b' : '#00d4ff'

    ctx.fillStyle = leftColor
    ctx.shadowColor = leftColor
    ctx.shadowBlur = 12
    ctx.fillRect(PADDLE_OFFSET, s.p1Y - PADDLE_H / 2, PADDLE_W, PADDLE_H)
    ctx.shadowBlur = 0

    ctx.fillStyle = rightColor
    ctx.shadowColor = rightColor
    ctx.shadowBlur = 12
    ctx.fillRect(W - PADDLE_OFFSET - PADDLE_W, s.p2Y - PADDLE_H / 2, PADDLE_W, PADDLE_H)
    ctx.shadowBlur = 0

    ctx.font = "bold 36px 'Press Start 2P', monospace"
    ctx.textAlign = 'center'
    ctx.fillStyle = leftColor
    ctx.globalAlpha = 0.25
    ctx.fillText(s.p1Score, W / 2 - 60, 50)
    ctx.fillStyle = rightColor
    ctx.fillText(s.p2Score, W / 2 + 60, 50)
    ctx.globalAlpha = 1

    ctx.font = "bold 11px 'Press Start 2P', monospace"
    ctx.globalAlpha = 0.4
    ctx.fillStyle = leftColor
    ctx.fillText(mySide === 'p1' ? 'YOU' : 'OPP', W / 2 - 60, 70)
    ctx.fillStyle = rightColor
    ctx.fillText(mySide === 'p2' ? 'YOU' : 'OPP', W / 2 + 60, 70)
    ctx.globalAlpha = 1

    animRef.current = requestAnimationFrame(gameLoop)
  }, [phase, mySide])

  useEffect(() => {
    if (phase !== 'playing') { cancelAnimationFrame(animRef.current); return }
    animRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, gameLoop])

  useEffect(() => {
    if (phase !== 'playing') return
    function handleMove(e) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      mouseYRef.current = ((e.clientY || e.touches?.[0]?.clientY || 0) - rect.top) * (H / rect.height)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchmove', handleMove, { passive: true })
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('touchmove', handleMove) }
  }, [phase])

  function handleShare() {
    const won = gameOver?.winnerName === 'You' || gameOver?.reason === 'opponent_disconnected'
    const text = `🏓 Pong PvP — ${won ? 'Won' : 'Lost'} ${scores.p1}-${scores.p2} vs ${opponentName}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function reset() {
    setPhase('lobby')
    setMatchData(null)
    setGameOver(null)
    setScores({ p1: 0, p2: 0 })
    setMySide(null)
    setOpponentName('')
    setCopied(false)
    setRally(0)
    stateRef.current = { ballX: W / 2, ballY: H / 2, p1Y: H / 2, p2Y: H / 2, p1Score: 0, p2Score: 0 }
  }

  if (phase === 'lobby') {
    return (
      <div className="game-card slide-in">
        <h2>🏓 Pong PvP</h2>
        <p className="description">Real-time 1v1 Pong! Race your opponent to 7 points.</p>
        <PvPMatchmaker
          gameId="pong"
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
        <h2>🏓 Pong PvP</h2>
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

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => { leaveQueue(); reset(); cancelAnimationFrame(animRef.current) }} gameOver={!!gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Rally</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-cyan)' }}>{rally}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{opponentName}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-pink)' }}>{scores[mySide === 'p1' ? 'p2' : 'p1']}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 12, border: '2px solid var(--border-glass)', cursor: 'none' }} />
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: gameOver.reason === 'opponent_disconnected' || gameOver.winnerName === 'You' ? 'var(--win-color)' : 'var(--lose-color)', marginBottom: 8 }}>
            {gameOver.reason === 'opponent_disconnected' ? 'OPPONENT LEFT' : gameOver.winnerName === 'You' ? 'YOU WIN!' : 'YOU LOSE'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>Score: {scores.p1} - {scores.p2} vs {opponentName}</div>
          <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>
          <button className="confirm-btn yes" onClick={reset}>Play Again</button>
        </div>
      )}
    </div>
  )
}
