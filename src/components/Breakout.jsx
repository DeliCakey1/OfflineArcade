import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'
import { createParticlePool, spawnParticles, updateParticles, drawParticles, screenShakeApply, screenShakeRestore } from '../canvasEffects'
import { getAdaptiveDifficulty, getGameConfig } from '../difficulty'

const W = 400, H = 500
const BRICK_ROWS = 6, BRICK_COLS = 8, BRICK_W = 46, BRICK_H = 18, BRICK_PAD = 3, BRICK_TOP = 40
const PADDLE_W = 70, PADDLE_H = 12, PADDLE_Y = H - 30
const BALL_R = 6

const ROW_COLORS = ['#ff2d7b', '#ff6b2b', '#ffe600', '#39ff14', '#00d4ff', '#b946ff']
const ROW_POINTS = [60, 50, 40, 30, 20, 10]

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Wide paddle, slow ball', paddleW: 90, ballSpeed: 3.5, lives: 5 },
  { name: 'Normal', emoji: '🟡', desc: 'Standard paddle and speed', paddleW: 70, ballSpeed: 4.5, lives: 3 },
  { name: 'Hard', emoji: '🟠', desc: 'Narrow paddle, fast ball', paddleW: 55, ballSpeed: 5.5, lives: 3 },
  { name: 'Insane', emoji: '💀', desc: 'Tiny paddle, bullet ball', paddleW: 45, ballSpeed: 6.5, lives: 2 },
]

function createBricks() {
  const bricks = []
  for (let r = 0; r < BRICK_ROWS; r++)
    for (let c = 0; c < BRICK_COLS; c++)
      bricks.push({ x: c * (BRICK_W + BRICK_PAD) + (W - BRICK_COLS * (BRICK_W + BRICK_PAD) + BRICK_PAD) / 2, y: r * (BRICK_H + BRICK_PAD) + BRICK_TOP, color: ROW_COLORS[r], points: ROW_POINTS[r], alive: true })
  return bricks
}

export default function Breakout({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [copied, setCopied] = useState(false)
  const [highScore, setHighScore] = useState(() => 0)
  const canvasRef = useRef(null)
  const gameRef = useRef({ paddleX: W / 2, ballX: W / 2, ballY: PADDLE_Y - 15, ballDX: 0, ballDY: 0, bricks: [], paused: false, floats: [] })
  const animRef = useRef(null)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const gameOverRef = useRef(false)
  const diffRef = useRef(null)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('breakout')
  const isPlaying = difficulty && !gameOver
  const particlePoolRef = useRef(createParticlePool())
  const shakeIntensityRef = useRef(0)

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { diffRef.current = difficulty }, [difficulty])

  const launchBall = useCallback((diffName) => {
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    const stats = JSON.parse(localStorage.getItem('arcade-stats') || '{}')
    const adaptiveLevel = getAdaptiveDifficulty('breakout', stats)
    const config = getGameConfig('breakout', adaptiveLevel)
    const ballSpeed = config.ballSpeed || d.ballSpeed
    const g = gameRef.current
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
    g.ballDX = Math.cos(angle) * ballSpeed
    g.ballDY = Math.sin(angle) * ballSpeed
  }, [])

  const resetBall = useCallback((diffName) => {
    const g = gameRef.current
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    const stats = JSON.parse(localStorage.getItem('arcade-stats') || '{}')
    const adaptiveLevel = getAdaptiveDifficulty('breakout', stats)
    const config = getGameConfig('breakout', adaptiveLevel)
    const ballSpeed = config.ballSpeed || d.ballSpeed
    g.ballX = g.paddleX
    g.ballY = PADDLE_Y - 15
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
    g.ballDX = Math.cos(angle) * ballSpeed
    g.ballDY = Math.sin(angle) * ballSpeed
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g = gameRef.current
    if (g.paused || gameOverRef.current) { animRef.current = requestAnimationFrame(gameLoop); return }
    const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]

    g.ballX += g.ballDX
    g.ballY += g.ballDY

    if (g.ballX - BALL_R <= 0 || g.ballX + BALL_R >= W) { g.ballDX *= -1; g.ballX = Math.max(BALL_R, Math.min(W - BALL_R, g.ballX)); sound('click') }
    if (g.ballY - BALL_R <= 0) { g.ballDY *= -1; g.ballY = BALL_R; sound('click') }

    if (g.ballY + BALL_R >= PADDLE_Y && g.ballX >= g.paddleX - d.paddleW / 2 && g.ballX <= g.paddleX + d.paddleW / 2 && g.ballDY > 0) {
      const hit = (g.ballX - g.paddleX) / (d.paddleW / 2)
      const angle = -Math.PI / 2 + hit * (Math.PI / 3)
      const speed = Math.sqrt(g.ballDX * g.ballDX + g.ballDY * g.ballDY)
      g.ballDX = Math.cos(angle) * speed
      g.ballDY = Math.sin(angle) * speed
      g.ballY = PADDLE_Y - BALL_R
      spawnParticles(particlePoolRef.current, g.ballX, PADDLE_Y, '#ffffff', 4, { spread: Math.PI, speed: 1.5, gravity: 0.08, life: 20, sizeMin: 2, sizeMax: 4, angle: -Math.PI / 2 })
      sound('click')
    }

    if (g.ballY > H + 20) {
      livesRef.current--
      setLives(livesRef.current)
      shakeIntensityRef.current = 6
      if (livesRef.current <= 0) {
        gameOverRef.current = true
        setGameOver(true)
        sound('death')
        const finalScore = scoreRef.current
        if (finalScore > highScore) { setHighScore(finalScore); saveHighScore('breakout', finalScore) }
        recordGame(finalScore, 0)
        return
      }
      resetBall(diffRef.current)
      sound('death')
    }

    for (const b of g.bricks) {
      if (!b.alive) continue
      if (g.ballX + BALL_R > b.x && g.ballX - BALL_R < b.x + BRICK_W && g.ballY + BALL_R > b.y && g.ballY - BALL_R < b.y + BRICK_H) {
        b.alive = false
        g.ballDY *= -1
        scoreRef.current += b.points
        setScore(scoreRef.current)
        g.floats.push({ x: b.x + BRICK_W / 2, y: b.y, text: `+${b.points}`, color: b.color, life: 40, vy: -1.5 })
        spawnParticles(particlePoolRef.current, b.x + BRICK_W / 2, b.y + BRICK_H / 2, b.color, 10, { spread: Math.PI * 2, speed: 3, gravity: 0.08, life: 35, sizeMin: 2, sizeMax: 5 })
        sound('hit')
        break
      }
    }

    if (g.bricks.every(b => !b.alive)) {
      gameOverRef.current = true
      setGameOver(true)
      const colors = ['#ff2d7b', '#ff6b2b', '#ffe600', '#39ff14', '#00d4ff', '#b946ff', '#ffffff']
      for (let i = 0; i < 50; i++) {
        spawnParticles(particlePoolRef.current, Math.random() * W, Math.random() * H * 0.5, colors[i % colors.length], 1, { spread: Math.PI, speed: 2, gravity: 0.03, life: 60, sizeMin: 3, sizeMax: 6, angle: -Math.PI / 2 })
      }
      sound('victory')
      const finalScore = scoreRef.current + 500
      scoreRef.current = finalScore
      setScore(finalScore)
      if (finalScore > highScore) { setHighScore(finalScore); saveHighScore('breakout', finalScore) }
      recordGame(finalScore, 1)
      return
    }

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(0, 0, W, H)

    const shakeAmt = shakeIntensityRef.current
    if (shakeAmt > 0) {
      screenShakeApply(ctx, shakeAmt)
      shakeIntensityRef.current *= 0.8
      if (shakeIntensityRef.current < 0.5) shakeIntensityRef.current = 0
    }

    for (const b of g.bricks) {
      if (!b.alive) continue
      ctx.fillStyle = b.color
      ctx.beginPath()
      ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 4)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(b.x + 2, b.y + 2, BRICK_W - 4, 4)
    }

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.roundRect(g.paddleX - d.paddleW / 2, PADDLE_Y, d.paddleW, PADDLE_H, 6)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(g.paddleX - d.paddleW / 2 + 4, PADDLE_Y + 2, d.paddleW - 8, 3)

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(g.ballX, g.ballY, BALL_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowColor = '#fff'
    ctx.shadowBlur = 8
    ctx.fill()
    ctx.shadowBlur = 0

    for (let i = g.floats.length - 1; i >= 0; i--) {
      const f = g.floats[i]
      f.y += f.vy
      f.life--
      const alpha = f.life / 40
      ctx.fillStyle = f.color
      ctx.globalAlpha = alpha
      ctx.font = "bold 14px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'
      ctx.fillText(f.text, f.x, f.y)
      ctx.globalAlpha = 1
      if (f.life <= 0) g.floats.splice(i, 1)
    }

    for (let i = 0; i < livesRef.current; i++) {
      ctx.fillStyle = '#ff2d7b'
      ctx.beginPath()
      ctx.arc(W - 20 - i * 18, 16, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    updateParticles(particlePoolRef.current)
    drawParticles(ctx, particlePoolRef.current)

    if (shakeAmt > 0) screenShakeRestore(ctx)

    animRef.current = requestAnimationFrame(gameLoop)
  }, [sound, highScore, recordGame, resetBall])

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(animRef.current); return }
    animRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, gameLoop])

  useEffect(() => {
    if (!isPlaying) return
    function handleMouse(e) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (W / rect.width)
      gameRef.current.paddleX = Math.max(DIFFICULTIES.find(d => d.name === diffRef.current).paddleW / 2, Math.min(W - DIFFICULTIES.find(d => d.name === diffRef.current).paddleW / 2, x))
    }
    function handleTouch(e) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = (e.touches[0].clientX - rect.left) * (W / rect.width)
      gameRef.current.paddleX = Math.max(DIFFICULTIES.find(d => d.name === diffRef.current).paddleW / 2, Math.min(W - DIFFICULTIES.find(d => d.name === diffRef.current).paddleW / 2, x))
    }
    function handleKey(e) {
      const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]
      if (e.key === 'ArrowLeft' || e.key === 'a') { gameRef.current.paddleX = Math.max(d.paddleW / 2, gameRef.current.paddleX - 20); e.preventDefault() }
      if (e.key === 'ArrowRight' || e.key === 'd') { gameRef.current.paddleX = Math.min(W - d.paddleW / 2, gameRef.current.paddleX + 20); e.preventDefault() }
    }
    window.addEventListener('mousemove', handleMouse)
    window.addEventListener('touchmove', handleTouch, { passive: true })
    window.addEventListener('keydown', handleKey)
    return () => { window.removeEventListener('mousemove', handleMouse); window.removeEventListener('touchmove', handleTouch); window.removeEventListener('keydown', handleKey) }
  }, [isPlaying])

  function startGame(diffName) {
    setDifficulty(diffName)
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    const stats = JSON.parse(localStorage.getItem('arcade-stats') || '{}')
    const adaptiveLevel = getAdaptiveDifficulty('breakout', stats)
    const config = getGameConfig('breakout', adaptiveLevel)
    const ballSpeed = config.ballSpeed || d.ballSpeed
    const g = gameRef.current
    g.paddleX = W / 2
    g.bricks = createBricks()
    g.ballX = W / 2
    g.ballY = PADDLE_Y - 15
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
    g.ballDX = Math.cos(angle) * ballSpeed
    g.ballDY = Math.sin(angle) * ballSpeed
    scoreRef.current = 0
    livesRef.current = d.lives
    gameOverRef.current = false
    particlePoolRef.current = []
    shakeIntensityRef.current = 0
    g.floats = []
    setScore(0)
    setLives(d.lives)
    setGameOver(false)
    setCopied(false)
  }

  function handleShare() {
    const text = `🎮 Breakout — ${score} pts | ${DIFFICULTIES.find(d => d.name === difficulty)?.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🧱 Breakout</h2>
        <p className="description">Smash all the bricks with the ball!</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Mouse/Touch/← → to move paddle</span>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => { setDifficulty(null); cancelAnimationFrame(animRef.current) }} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Score</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-yellow)' }}>{score}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Lives</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-pink)' }}>{'❤️'.repeat(lives)}</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 12, border: '2px solid var(--border-glass)', cursor: 'none' }} />
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: score > 0 && gameRef.current.bricks.every(b => !b.alive) ? 'var(--win-color)' : 'var(--lose-color)', marginBottom: 8 }}>
            {gameRef.current.bricks.every(b => !b.alive) ? 'YOU WIN!' : 'GAME OVER'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{score} points</div>
          {score > 0 && <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>}
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
