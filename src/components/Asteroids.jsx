import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const W = 400, H = 400

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Few slow asteroids', startAsteroids: 4, asteroidSpeed: 1, shipSpeed: 4, bulletSpeed: 8, lives: 5, invincibleMs: 3000 },
  { name: 'Normal', emoji: '🟡', desc: 'Classic experience', startAsteroids: 6, asteroidSpeed: 1.5, shipSpeed: 3.5, bulletSpeed: 7, lives: 3, invincibleMs: 2000 },
  { name: 'Hard', emoji: '🟠', desc: 'Fast and deadly', startAsteroids: 8, asteroidSpeed: 2, shipSpeed: 3, bulletSpeed: 6, lives: 3, invincibleMs: 1500 },
  { name: 'Insane', emoji: '💀', desc: 'One life, no mercy', startAsteroids: 10, asteroidSpeed: 2.5, shipSpeed: 2.5, bulletSpeed: 5, lives: 1, invincibleMs: 1000 },
]

function makeAsteroidShape(radius) {
  const verts = []
  const n = 8 + Math.floor(Math.random() * 4)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = radius * (0.7 + Math.random() * 0.3)
    verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }
  return verts
}

function spawnAsteroid(x, y, size, speed) {
  const angle = Math.random() * Math.PI * 2
  const spd = speed * (0.5 + Math.random() * 0.5)
  return {
    x, y,
    vx: Math.cos(angle) * spd,
    vy: Math.sin(angle) * spd,
    size,
    radius: size === 'large' ? 30 : size === 'medium' ? 18 : 10,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    shape: makeAsteroidShape(size === 'large' ? 30 : size === 'medium' ? 18 : 10),
  }
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export default function Asteroids({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [copied, setCopied] = useState(false)
  const [lives, setLives] = useState(0)
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const animRef = useRef(null)
  const scoreRef = useRef(0)
  const livesRef = useRef(0)
  const gameOverRef = useRef(false)
  const diffRef = useRef(null)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('asteroids')
  const isPlaying = difficulty && !gameOver

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { diffRef.current = difficulty }, [difficulty])

  function resetGame(diffName) {
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    const g = {
      ship: { x: W / 2, y: H / 2, angle: -Math.PI / 2, thrust: false },
      asteroids: [],
      bullets: [],
      frame: 0,
      mouseX: W / 2,
      mouseY: H / 2,
      keys: {},
      invincibleUntil: 0,
      wave: 1,
      stars: [],
    }
    for (let i = 0; i < 80; i++) {
      g.stars.push({ x: Math.random() * W, y: Math.random() * H, speed: 0.1 + Math.random() * 0.3, size: 0.5 + Math.random() * 1 })
    }
    spawnWave(g, d.startAsteroids, d.asteroidSpeed)
    gameRef.current = g
    scoreRef.current = 0
    livesRef.current = d.lives
    gameOverRef.current = false
    setScore(0)
    setLives(d.lives)
    setGameOver(false)
    setCopied(false)
  }

  function spawnWave(g, count, speed) {
    for (let i = 0; i < count; i++) {
      let x, y
      do {
        x = Math.random() * W
        y = Math.random() * H
      } while (dist({ x, y }, g.ship) < 100)
      g.asteroids.push(spawnAsteroid(x, y, 'large', speed))
    }
  }

  function startGame(diffName) {
    setDifficulty(diffName)
    resetGame(diffName)
  }

  function handleShare() {
    const text = `🚀 Asteroids — ${score} pts | ${DIFFICULTIES.find(d => d.name === difficulty)?.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g = gameRef.current
    if (!g || !diffRef.current || gameOverRef.current) { animRef.current = requestAnimationFrame(gameLoop); return }
    const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]
    const now = performance.now()

    g.frame++

    const ship = g.ship
    const mouseRelX = g.mouseX - W / 2
    const mouseRelY = g.mouseY - H / 2
    const mouseAngle = Math.atan2(mouseRelY, mouseRelX)
    const keys = g.keys

    let targetAngle = mouseAngle
    if (keys.ArrowLeft || keys.KeyA) targetAngle -= 0.08
    if (keys.ArrowRight || keys.KeyD) targetAngle += 0.08

    let angleDiff = targetAngle - ship.angle
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
    ship.angle += angleDiff * 0.12

    ship.x += Math.cos(ship.angle) * d.shipSpeed * 0.15
    ship.y += Math.sin(ship.angle) * d.shipSpeed * 0.15
    if (ship.x < 0) ship.x += W
    if (ship.x > W) ship.x -= W
    if (ship.y < 0) ship.y += H
    if (ship.y > H) ship.y -= H

    for (const a of g.asteroids) {
      a.x += a.vx
      a.y += a.vy
      a.rot += a.rotSpeed
      if (a.x < -40) a.x += W + 80
      if (a.x > W + 40) a.x -= W + 80
      if (a.y < -40) a.y += H + 80
      if (a.y > H + 40) a.y -= H + 80
    }

    for (const b of g.bullets) {
      b.x += b.vx
      b.y += b.vy
      b.life--
    }
    g.bullets = g.bullets.filter(b => b.life > 0)

    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i]
      for (let j = g.asteroids.length - 1; j >= 0; j--) {
        const a = g.asteroids[j]
        if (dist(b, a) < a.radius + 3) {
          g.bullets.splice(i, 1)
          g.asteroids.splice(j, 1)
          const pts = a.size === 'large' ? 20 : a.size === 'medium' ? 50 : 100
          scoreRef.current += pts
          setScore(scoreRef.current)
          sound('hit')
          if (a.size === 'large') {
            g.asteroids.push(spawnAsteroid(a.x, a.y, 'medium', d.asteroidSpeed))
            g.asteroids.push(spawnAsteroid(a.x, a.y, 'medium', d.asteroidSpeed))
          } else if (a.size === 'medium') {
            g.asteroids.push(spawnAsteroid(a.x, a.y, 'small', d.asteroidSpeed))
            g.asteroids.push(spawnAsteroid(a.x, a.y, 'small', d.asteroidSpeed))
          }
          break
        }
      }
    }

    if (now > g.invincibleUntil) {
      for (const a of g.asteroids) {
        if (dist(ship, a) < a.radius + 10) {
          livesRef.current--
          setLives(livesRef.current)
          if (livesRef.current <= 0) {
            gameOverRef.current = true
            setGameOver(true)
            sound('death')
            const finalScore = scoreRef.current
            if (finalScore > bestScore) { setBestScore(finalScore); saveHighScore('asteroids', finalScore) }
            recordGame(finalScore, 0)
            return
          }
          sound('lose')
          g.invincibleUntil = now + d.invincibleMs
          ship.x = W / 2
          ship.y = H / 2
          break
        }
      }
    }

    if (g.asteroids.length === 0) {
      g.wave++
      sound('levelup')
      spawnWave(g, d.startAsteroids + g.wave, d.asteroidSpeed)
    }

    for (const s of g.stars) {
      s.y += s.speed
      if (s.y > H) { s.y = 0; s.x = Math.random() * W }
    }

    ctx.fillStyle = '#0a0a2e'
    ctx.fillRect(0, 0, W, H)

    for (const s of g.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + s.speed * 0.5})`
      ctx.fillRect(s.x, s.y, s.size, s.size)
    }

    ctx.strokeStyle = '#888888'
    ctx.shadowColor = '#888888'
    ctx.shadowBlur = 4
    for (const a of g.asteroids) {
      ctx.save()
      ctx.translate(a.x, a.y)
      ctx.rotate(a.rot)
      ctx.beginPath()
      ctx.moveTo(a.shape[0].x, a.shape[0].y)
      for (let i = 1; i < a.shape.length; i++) {
        ctx.lineTo(a.shape[i].x, a.shape[i].y)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.restore()
    }
    ctx.shadowBlur = 0

    ctx.strokeStyle = '#ffe600'
    ctx.shadowColor = '#ffe600'
    ctx.shadowBlur = 6
    ctx.fillStyle = '#ffe600'
    for (const b of g.bullets) {
      ctx.beginPath()
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0

    const blinkOn = now > g.invincibleUntil || Math.floor(now / 100) % 2 === 0
    if (blinkOn) {
      ctx.save()
      ctx.translate(ship.x, ship.y)
      ctx.rotate(ship.angle)
      ctx.strokeStyle = '#00d4ff'
      ctx.shadowColor = '#00d4ff'
      ctx.shadowBlur = 10
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(12, 0)
      ctx.lineTo(-8, -7)
      ctx.lineTo(-4, 0)
      ctx.lineTo(-8, 7)
      ctx.closePath()
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()
    }

    animRef.current = requestAnimationFrame(gameLoop)
  }, [bestScore, recordGame, saveHighScore, sound])

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
      const g = gameRef.current
      if (g) {
        g.mouseX = ((e.clientX || e.touches?.[0]?.clientX || 0) - rect.left) * (W / rect.width)
        g.mouseY = ((e.clientY || e.touches?.[0]?.clientY || 0) - rect.top) * (H / rect.height)
      }
    }
    function shoot() {
      const g = gameRef.current
      if (!g || gameOverRef.current) return
      const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]
      g.bullets.push({
        x: g.ship.x + Math.cos(g.ship.angle) * 14,
        y: g.ship.y + Math.sin(g.ship.angle) * 14,
        vx: Math.cos(g.ship.angle) * d.bulletSpeed,
        vy: Math.sin(g.ship.angle) * d.bulletSpeed,
        life: 60,
      })
      sound('click')
    }
    function handleTap(e) {
      shoot()
    }
    function onKeyDown(e) {
      const g = gameRef.current
      if (g) g.keys[e.code] = true
      if (e.code === 'Space') { e.preventDefault(); shoot() }
    }
    function onKeyUp(e) {
      const g = gameRef.current
      if (g) g.keys[e.code] = false
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('click', handleTap)
      canvas.addEventListener('touchstart', handleTap, { passive: true })
    }
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      if (canvas) {
        canvas.removeEventListener('click', handleTap)
        canvas.removeEventListener('touchstart', handleTap)
      }
    }
  }, [isPlaying, sound])

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🚀 Asteroids</h2>
        <p className="description">Mouse to aim, click to shoot. Destroy all asteroids to advance!</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Mouse / Arrow keys to aim · Click / Space to shoot</span>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => { setDifficulty(null); cancelAnimationFrame(animRef.current) }} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Score</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-cyan)' }}>{score}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Lives</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: '#ff4466' }}>{'❤'.repeat(Math.max(0, lives))}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Best</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-orange)' }}>🏆 {bestScore}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 12, border: '2px solid var(--border-glass)', cursor: 'none' }} />
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: 'var(--lose-color)', marginBottom: 8 }}>GAME OVER</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{score} points scored</div>
          <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>
          <button className="confirm-btn yes" onClick={() => { startGame(difficulty) }}>Play Again</button>
        </div>
      )}
    </div>
  )
}
