import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'
import { createParticlePool, spawnParticles, updateParticles, drawParticles, screenShakeApply, screenShakeRestore } from '../canvasEffects'
import { getAdaptiveDifficulty, getGameConfig } from '../difficulty'

const W = 360, H = 520
const BIRD_SIZE = 20
const PIPE_W = 52
const PIPE_GAP = 140
const PIPE_SPEED = 2.5
const GRAVITY = 0.35
const FLAP_POWER = -6.5

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Wide gap, slow pipes', gap: 170, speed: 2, gravity: 0.3 },
  { name: 'Normal', emoji: '🟡', desc: 'Standard flappy', gap: 140, speed: 2.5, gravity: 0.35 },
  { name: 'Hard', emoji: '🟠', desc: 'Tight gap, fast pipes', gap: 115, speed: 3, gravity: 0.4 },
  { name: 'Insane', emoji: '💀', desc: 'Brutal gap and speed', gap: 95, speed: 3.5, gravity: 0.45 },
]

export default function FlappyBird({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(() => 0)
  const [copied, setCopied] = useState(false)
  const [started, setStarted] = useState(false)
  const canvasRef = useRef(null)
  const gameRef = useRef({ birdY: H / 2, birdVY: 0, pipes: [], pipeTimer: 0, frame: 0, deathVY: 0, deathAngle: 0 })
  const animRef = useRef(null)
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const startedRef = useRef(false)
  const diffRef = useRef(null)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('flappy')
  const isPlaying = difficulty && !gameOver
  const particlePoolRef = useRef(createParticlePool())
  const shakeIntensityRef = useRef(0)

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { diffRef.current = difficulty }, [difficulty])
  useEffect(() => { startedRef.current = started }, [started])

  const flap = useCallback(() => {
    if (gameOverRef.current) return
    if (!startedRef.current) {
      startedRef.current = true
      setStarted(true)
    }
    gameRef.current.birdVY = FLAP_POWER
    sound('click')
  }, [sound])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g = gameRef.current
    const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]
    const stats = JSON.parse(localStorage.getItem('arcade-stats') || '{}')
    const adaptiveLevel = getAdaptiveDifficulty('flappy', stats)
    const config = getGameConfig('flappy', adaptiveLevel)
    const gap = config.gap || d.gap
    const speed = config.speed || d.speed

    if (!startedRef.current) {
      animRef.current = requestAnimationFrame(gameLoop)
      return
    }

    if (gameOverRef.current) {
      const g2 = gameRef.current
      g2.deathVY += 0.5
      g2.birdY += g2.deathVY
      g2.deathAngle += 8
      ctx.clearRect(0, 0, W, H)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
      skyGrad.addColorStop(0, '#1a1033')
      skyGrad.addColorStop(1, '#2a1f4e')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H)
      for (const p of g2.pipes) {
        ctx.fillStyle = '#39ff14'
        ctx.beginPath()
        ctx.roundRect(p.x, 0, PIPE_W, p.gapTop, [6, 6, 0, 0])
        ctx.fill()
        ctx.fillStyle = '#39ff14'
        ctx.beginPath()
        ctx.roundRect(p.x, p.gapBot, PIPE_W, H - p.gapBot, [0, 0, 6, 6])
        ctx.fill()
      }
      if (g2.birdY < H + 40) {
        ctx.save()
        ctx.translate(30, g2.birdY)
        ctx.rotate(g2.deathAngle * Math.PI / 180)
        ctx.fillStyle = '#ffe600'
        ctx.beginPath()
        ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2 - 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      const flashAlpha = Math.max(0, 0.3 - g2.deathVY * 0.02)
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 50, 50, ${flashAlpha})`
        ctx.fillRect(0, 0, W, H)
      }
      updateParticles(particlePoolRef.current)
      drawParticles(ctx, particlePoolRef.current)
      animRef.current = requestAnimationFrame(gameLoop)
      return
    }

    g.birdVY += d.gravity
    g.birdY += g.birdVY

    g.pipeTimer++
    if (g.pipeTimer > 90) {
      const gapTop = 60 + Math.random() * (H - gap - 120)
      g.pipes.push({ x: W, gapTop, gapBot: gapTop + gap, passed: false })
      g.pipeTimer = 0
    }

    for (const p of g.pipes) {
      p.x -= speed
      if (!p.passed && p.x + PIPE_W < 30) {
        p.passed = true
        scoreRef.current++
        setScore(scoreRef.current)
        spawnParticles(particlePoolRef.current, p.x + PIPE_W, p.gapTop + (p.gapBot - p.gapTop) / 2, '#39ff14', 6, { spread: Math.PI * 0.8, speed: 2, gravity: 0.03, life: 25, sizeMin: 2, sizeMax: 4, angle: Math.PI })
        sound('score')
        if (scoreRef.current % 10 === 0) {
          for (let i = 0; i < 20; i++) {
            spawnParticles(particlePoolRef.current, W / 2 + (Math.random() - 0.5) * 100, H / 3 + (Math.random() - 0.5) * 60, ['#ffe600', '#ff6b2b', '#ff2d7b'][i % 3], 1, { spread: Math.PI * 2, speed: 3, gravity: 0.02, life: 50, sizeMin: 3, sizeMax: 6, angle: Math.random() * Math.PI * 2 })
          }
          sound('levelup')
        }
      }
    }
    g.pipes = g.pipes.filter(p => p.x > -PIPE_W)

    const bird = { x: 30, y: g.birdY, w: BIRD_SIZE, h: BIRD_SIZE }
    if (g.birdY + BIRD_SIZE / 2 >= H || g.birdY - BIRD_SIZE / 2 <= 0) {
      gameOverRef.current = true
      setGameOver(true)
      shakeIntensityRef.current = 5
      g.deathVY = -4
      g.deathAngle = 0
      sound('death')
      spawnParticles(particlePoolRef.current, 30, g.birdY, '#ff2d7b', 15, { spread: Math.PI * 2, speed: 3, gravity: 0.04, life: 40, sizeMin: 2, sizeMax: 5, angle: 0 })
      const finalScore = scoreRef.current
      if (finalScore > bestScore) { setBestScore(finalScore); saveHighScore('flappy', finalScore) }
      recordGame(finalScore, 0)
      return
    }
    for (const p of g.pipes) {
      if (bird.x + bird.w / 2 > p.x && bird.x - bird.w / 2 < p.x + PIPE_W) {
        if (bird.y - bird.h / 2 < p.gapTop || bird.y + bird.h / 2 > p.gapBot) {
          gameOverRef.current = true
          setGameOver(true)
          shakeIntensityRef.current = 5
          g.deathVY = -4
          g.deathAngle = 0
          sound('death')
          spawnParticles(particlePoolRef.current, 30, g.birdY, '#ff2d7b', 15, { spread: Math.PI * 2, speed: 3, gravity: 0.04, life: 40, sizeMin: 2, sizeMax: 5, angle: 0 })
          const finalScore = scoreRef.current
          if (finalScore > bestScore) { setBestScore(finalScore); saveHighScore('flappy', finalScore) }
          recordGame(finalScore, 0)
          return
        }
      }
    }

    ctx.clearRect(0, 0, W, H)

    const shakeAmt = shakeIntensityRef.current
    if (shakeAmt > 0) {
      screenShakeApply(ctx, shakeAmt)
      shakeIntensityRef.current *= 0.8
      if (shakeIntensityRef.current < 0.5) shakeIntensityRef.current = 0
    }

    const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
    skyGrad.addColorStop(0, '#1a1033')
    skyGrad.addColorStop(1, '#2a1f4e')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, W, H)

    for (const p of g.pipes) {
      ctx.fillStyle = '#39ff14'
      ctx.beginPath()
      ctx.roundRect(p.x, 0, PIPE_W, p.gapTop, [6, 6, 0, 0])
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.fillRect(p.x + 4, 0, PIPE_W - 8, p.gapTop - 4)

      ctx.fillStyle = '#39ff14'
      ctx.beginPath()
      ctx.roundRect(p.x, p.gapBot, PIPE_W, H - p.gapBot, [0, 0, 6, 6])
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.fillRect(p.x + 4, p.gapBot + 4, PIPE_W - 8, H - p.gapBot - 4)
    }

    const birdY = g.birdY
    const tilt = Math.min(Math.max(g.birdVY * 4, -30), 60)
    ctx.save()
    ctx.translate(30, birdY)
    ctx.rotate(tilt * Math.PI / 180)

    ctx.fillStyle = '#ffe600'
    ctx.beginPath()
    ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2 - 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.ellipse(0, 2, BIRD_SIZE / 2 - 2, BIRD_SIZE / 2 - 4, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(5, -3, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(6, -3, 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f97316'
    ctx.beginPath()
    ctx.moveTo(BIRD_SIZE / 2 - 2, 0)
    ctx.lineTo(BIRD_SIZE / 2 + 6, -1)
    ctx.lineTo(BIRD_SIZE / 2 - 2, 3)
    ctx.fill()

    ctx.restore()

    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    const starX = (g.frame * 0.3) % W
    for (let i = 0; i < 8; i++) {
      const sx = (starX + i * 50) % W
      const sy = (i * 67 + 20) % H
      ctx.fillRect(sx, sy, 2, 2)
    }

    updateParticles(particlePoolRef.current)
    drawParticles(ctx, particlePoolRef.current)
    if (shakeAmt > 0) screenShakeRestore(ctx)

    g.frame++

    animRef.current = requestAnimationFrame(gameLoop)
  }, [sound, bestScore, recordGame])

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(animRef.current); return }
    animRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, gameLoop])

  useEffect(() => {
    if (!isPlaying) return
    function handleKey(e) {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); flap() }
    }
    function handleClick(e) { e.preventDefault(); flap() }
    function handleTouch(e) { e.preventDefault(); flap() }
    window.addEventListener('keydown', handleKey)
    const canvas = canvasRef.current
    canvas?.addEventListener('click', handleClick)
    canvas?.addEventListener('touchstart', handleTouch, { passive: false })
    return () => { window.removeEventListener('keydown', handleKey); canvas?.removeEventListener('click', handleClick); canvas?.removeEventListener('touchstart', handleTouch) }
  }, [isPlaying, flap])

  function startGame(diffName) {
    setDifficulty(diffName)
    const g = gameRef.current
    g.birdY = H / 2
    g.birdVY = 0
    g.pipes = []
    g.pipeTimer = 0
    g.frame = 0
    g.deathVY = 0
    g.deathAngle = 0
    scoreRef.current = 0
    gameOverRef.current = false
    startedRef.current = false
    particlePoolRef.current = []
    shakeIntensityRef.current = 0
    setScore(0)
    setGameOver(false)
    setStarted(false)
    setCopied(false)
  }

  function handleShare() {
    const text = `🐦 Flappy Bird — ${score} pipes | ${DIFFICULTIES.find(d => d.name === difficulty)?.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🐦 Flappy Bird</h2>
        <p className="description">Tap to flap, dodge the pipes!</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Space / Click / Tap to flap</span>
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
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Best</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-orange)' }}>🏆 {bestScore}</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 12, border: '2px solid var(--border-glass)', cursor: 'pointer' }} />
      </div>
      {!started && !gameOver && (
        <div style={{ textAlign: 'center', marginTop: 12, animation: 'pulse 1.5s ease-in-out infinite' }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: 'var(--neon-yellow)' }}>TAP OR PRESS SPACE TO START</span>
        </div>
      )}
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: 'var(--lose-color)', marginBottom: 8 }}>GAME OVER</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{score} pipes cleared</div>
          {score > 0 && <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>}
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
