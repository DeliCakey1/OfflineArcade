import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const W = 480, H = 320
const WIN_SCORE = 7

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Slow AI, big paddle', aiSpeed: 0.06, ballSpeed: 4, ballRadius: 8, paddleHeight: 80 },
  { name: 'Normal', emoji: '🟡', desc: 'Standard Pong', aiSpeed: 0.08, ballSpeed: 5, ballRadius: 7, paddleHeight: 70 },
  { name: 'Hard', emoji: '🟠', desc: 'Fast AI, small paddle', aiSpeed: 0.12, ballSpeed: 6, ballRadius: 6, paddleHeight: 60 },
  { name: 'Insane', emoji: '💀', desc: 'Lightning fast', aiSpeed: 0.16, ballSpeed: 7, ballRadius: 5, paddleHeight: 50 },
]

const PADDLE_W = 10
const PADDLE_OFFSET = 20

export default function Pong({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [bestRally, setBestRally] = useState(0)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)
  const gameRef = useRef({
    playerY: H / 2,
    aiY: H / 2,
    ballX: W / 2,
    ballY: H / 2,
    ballVX: 0,
    ballVY: 0,
    pScore: 0,
    aScore: 0,
    rally: 0,
    mouseY: H / 2,
    frame: 0,
  })
  const animRef = useRef(null)
  const gameOverRef = useRef(false)
  const diffRef = useRef(null)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('pong')
  const isPlaying = difficulty && !gameOver

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { diffRef.current = difficulty }, [difficulty])

  const resetBall = useCallback((g) => {
    const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]
    const angle = (Math.random() * Math.PI / 4) - Math.PI / 8
    const dir = Math.random() < 0.5 ? 1 : -1
    g.ballX = W / 2
    g.ballY = H / 2
    g.ballVX = dir * Math.cos(angle) * d.ballSpeed
    g.ballVY = Math.sin(angle) * d.ballSpeed
    g.rally = 0
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g = gameRef.current
    if (!diffRef.current || gameOverRef.current) { animRef.current = requestAnimationFrame(gameLoop); return }
    const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]

    g.playerY += (g.mouseY - g.playerY) * 0.15
    g.playerY = Math.max(d.paddleHeight / 2, Math.min(H - d.paddleHeight / 2, g.playerY))

    const aiTarget = g.ballY
    const aiDiff = aiTarget - g.aiY
    g.aiY += aiDiff * d.aiSpeed
    g.aiY = Math.max(d.paddleHeight / 2, Math.min(H - d.paddleHeight / 2, g.aiY))

    g.ballX += g.ballVX
    g.ballY += g.ballVY

    if (g.ballY - d.ballRadius <= 0) {
      g.ballY = d.ballRadius
      g.ballVY = Math.abs(g.ballVY)
      sound('wall')
    } else if (g.ballY + d.ballRadius >= H) {
      g.ballY = H - d.ballRadius
      g.ballVY = -Math.abs(g.ballVY)
      sound('wall')
    }

    const playerPaddleX = PADDLE_OFFSET + PADDLE_W
    if (g.ballVX < 0 && g.ballX - d.ballRadius <= playerPaddleX && g.ballX + d.ballRadius >= PADDLE_OFFSET) {
      if (g.ballY >= g.playerY - d.paddleHeight / 2 && g.ballY <= g.playerY + d.paddleHeight / 2) {
        g.ballX = playerPaddleX + d.ballRadius
        const hitPos = (g.ballY - g.playerY) / (d.paddleHeight / 2)
        const angle = hitPos * (Math.PI / 4)
        const speed = Math.sqrt(g.ballVX * g.ballVX + g.ballVY * g.ballVY) * 1.05
        g.ballVX = Math.abs(Math.cos(angle)) * speed
        g.ballVY = Math.sin(angle) * speed
        g.rally++
        sound('paddle')
      }
    }

    const aiPaddleX = W - PADDLE_OFFSET - PADDLE_W
    if (g.ballVX > 0 && g.ballX + d.ballRadius >= aiPaddleX && g.ballX - d.ballRadius <= W - PADDLE_OFFSET) {
      if (g.ballY >= g.aiY - d.paddleHeight / 2 && g.ballY <= g.aiY + d.paddleHeight / 2) {
        g.ballX = aiPaddleX - d.ballRadius
        const hitPos = (g.ballY - g.aiY) / (d.paddleHeight / 2)
        const angle = hitPos * (Math.PI / 4)
        const speed = Math.sqrt(g.ballVX * g.ballVX + g.ballVY * g.ballVY) * 1.05
        g.ballVX = -Math.abs(Math.cos(angle)) * speed
        g.ballVY = Math.sin(angle) * speed
        g.rally++
        sound('paddle')
      }
    }

    if (g.ballX < -d.ballRadius * 2) {
      g.aScore++
      sound('score')
      if (g.aScore >= WIN_SCORE) {
        gameOverRef.current = true
        setGameOver(true)
        sound('defeat')
        if (g.rally > bestRally) { setBestRally(g.rally); saveHighScore('pong', g.rally) }
        recordGame(false, g.rally)
        return
      }
      resetBall(g)
    } else if (g.ballX > W + d.ballRadius * 2) {
      g.pScore++
      sound('score')
      setScore(g.rally)
      if (g.pScore >= WIN_SCORE) {
        gameOverRef.current = true
        setGameOver(true)
        sound('victory')
        if (g.rally > bestRally) { setBestRally(g.rally); saveHighScore('pong', g.rally) }
        recordGame(true, g.rally)
        return
      }
      resetBall(g)
    }

    g.frame++

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

    const trailCount = 5
    for (let i = trailCount; i > 0; i--) {
      const alpha = 0.08 * (trailCount - i) / trailCount
      const tx = g.ballX - g.ballVX * i * 1.5
      const ty = g.ballY - g.ballVY * i * 1.5
      ctx.fillStyle = `rgba(255,230,0,${alpha})`
      ctx.beginPath()
      ctx.arc(tx, ty, d.ballRadius * 0.8, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#ffe600'
    ctx.shadowColor = '#ffe600'
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(g.ballX, g.ballY, d.ballRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = '#00d4ff'
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 12
    ctx.fillRect(PADDLE_OFFSET, g.playerY - d.paddleHeight / 2, PADDLE_W, d.paddleHeight)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#ff2d7b'
    ctx.shadowColor = '#ff2d7b'
    ctx.shadowBlur = 12
    ctx.fillRect(W - PADDLE_OFFSET - PADDLE_W, g.aiY - d.paddleHeight / 2, PADDLE_W, d.paddleHeight)
    ctx.shadowBlur = 0

    const scoreFont = "bold 36px 'Press Start 2P', monospace"
    ctx.font = scoreFont
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00d4ff'
    ctx.globalAlpha = 0.25
    ctx.fillText(g.pScore, W / 2 - 60, 50)
    ctx.fillStyle = '#ff2d7b'
    ctx.fillText(g.aScore, W / 2 + 60, 50)
    ctx.globalAlpha = 1

    animRef.current = requestAnimationFrame(gameLoop)
  }, [bestRally, recordGame, resetBall, sound])

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(animRef.current); return }
    animRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, gameLoop])

  useEffect(() => {
    if (!isPlaying) return
    function handleMove(e) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      gameRef.current.mouseY = ((e.clientY || e.touches?.[0]?.clientY || 0) - rect.top) * (H / rect.height)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchmove', handleMove, { passive: true })
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('touchmove', handleMove) }
  }, [isPlaying])

  function startGame(diffName) {
    setDifficulty(diffName)
    const g = gameRef.current
    g.playerY = H / 2
    g.aiY = H / 2
    g.pScore = 0
    g.aScore = 0
    g.rally = 0
    g.mouseY = H / 2
    g.frame = 0
    gameOverRef.current = false
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    const angle = (Math.random() * Math.PI / 4) - Math.PI / 8
    const dir = Math.random() < 0.5 ? 1 : -1
    g.ballX = W / 2
    g.ballY = H / 2
    g.ballVX = dir * Math.cos(angle) * d.ballSpeed
    g.ballVY = Math.sin(angle) * d.ballSpeed
    setScore(0)
    setGameOver(false)
    setCopied(false)
  }

  function handleShare() {
    const won = gameRef.current.pScore >= WIN_SCORE
    const text = `🏓 Pong — ${won ? 'Won' : 'Lost'} ${gameRef.current.pScore}-${gameRef.current.aScore} | Rally: ${gameRef.current.rally} | ${DIFFICULTIES.find(d => d.name === difficulty)?.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🏓 Pong</h2>
        <p className="description">Classic paddle game! Move your mouse to control the left paddle.</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Mouse / Touch to move your paddle — First to {WIN_SCORE} wins!</span>
        </div>
      </div>
    )
  }

  const won = gameRef.current.pScore >= WIN_SCORE

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => { setDifficulty(null); cancelAnimationFrame(animRef.current) }} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Rally</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-cyan)' }}>{score}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Best Rally</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-orange)' }}>🏆 {bestRally}</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 12, border: '2px solid var(--border-glass)', cursor: 'none' }} />
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: won ? 'var(--win-color)' : 'var(--lose-color)', marginBottom: 8 }}>{won ? 'YOU WIN!' : 'YOU LOSE'}</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>Score: {gameRef.current.pScore} - {gameRef.current.aScore} | Rally: {gameRef.current.rally}</div>
          <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
