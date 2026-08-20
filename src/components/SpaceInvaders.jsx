import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const W = 360, H = 480
const ALIEN_COLS = 8
const ALIEN_W = 28, ALIEN_H = 22, ALIEN_PAD_X = 6, ALIEN_PAD_Y = 6
const PLAYER_W = 30, PLAYER_H = 20
const PLAYER_SPEED = 4
const BULLET_W = 3, BULLET_H = 12
const ALIEN_BULLET_W = 3, ALIEN_BULLET_H = 10
const SHIELD_COUNT = 4
const SHIELD_W = 48, SHIELD_H = 28, SHIELD_Y = H - 100

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Slow aliens, extra lives', alienSpeed: 0.5, alienShootChance: 0.002, alienRows: 4, lives: 5 },
  { name: 'Normal', emoji: '🟡', desc: 'Standard space defense', alienSpeed: 0.8, alienShootChance: 0.004, alienRows: 5, lives: 3 },
  { name: 'Hard', emoji: '🟠', desc: 'Fast and aggressive', alienSpeed: 1.2, alienShootChance: 0.006, alienRows: 6, lives: 3 },
  { name: 'Insane', emoji: '💀', desc: 'One life, no mercy', alienSpeed: 1.8, alienShootChance: 0.008, alienRows: 6, lives: 1 },
]

function createAliens(rows) {
  const aliens = []
  const totalW = ALIEN_COLS * (ALIEN_W + ALIEN_PAD_X) - ALIEN_PAD_X
  const offsetX = (W - totalW) / 2
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < ALIEN_COLS; c++) {
      aliens.push({
        x: offsetX + c * (ALIEN_W + ALIEN_PAD_X),
        y: 40 + r * (ALIEN_H + ALIEN_PAD_Y),
        alive: true,
        row: r,
      })
    }
  }
  return aliens
}

function createShields() {
  const shields = []
  const totalW = SHIELD_COUNT * SHIELD_W
  const gap = (W - totalW) / (SHIELD_COUNT + 1)
  for (let i = 0; i < SHIELD_COUNT; i++) {
    const sx = gap + i * (SHIELD_W + gap)
    const pixels = []
    for (let py = 0; py < SHIELD_H; py++) {
      for (let px = 0; px < SHIELD_W; px++) {
        if (py < 6 && (px < 6 || px >= SHIELD_W - 6)) continue
        pixels.push({ x: sx + px, y: SHIELD_Y + py, health: 3 })
      }
    }
    shields.push(pixels)
  }
  return shields
}

export default function SpaceInvaders({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [copied, setCopied] = useState(false)
  const [wave, setWave] = useState(1)
  const canvasRef = useRef(null)
  const gameRef = useRef({
    playerX: W / 2,
    aliens: [],
    alienDir: 1,
    alienDrop: false,
    playerBullets: [],
    alienBullets: [],
    shields: [],
    frame: 0,
    mouseX: W / 2,
    shooting: false,
    lastShot: 0,
  })
  const animRef = useRef(null)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const waveRef = useRef(1)
  const gameOverRef = useRef(false)
  const diffRef = useRef(null)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('spaceinvaders')
  const isPlaying = difficulty && !gameOver

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { diffRef.current = difficulty }, [difficulty])

  const spawnWave = useCallback((diffName, currentWave) => {
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    const g = gameRef.current
    g.aliens = createAliens(d.alienRows)
    g.alienDir = 1
    g.alienDrop = false
    g.alienBullets = []
    g.playerBullets = []
    g.shields = createShields()
    g.lastShot = 0
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g = gameRef.current
    if (!diffRef.current || gameOverRef.current) { animRef.current = requestAnimationFrame(gameLoop); return }
    const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]

    g.frame++

    g.playerX += (g.mouseX - g.playerX) * 0.15
    g.playerX = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, g.playerX))

    if (g.shooting && g.frame - g.lastShot > 15) {
      g.playerBullets.push({ x: g.playerX, y: H - 50 })
      g.lastShot = g.frame
      sound('click')
    }

    const aliveAliens = g.aliens.filter(a => a.alive)
    const speedMultiplier = 1 + (1 - aliveAliens.length / (d.alienRows * ALIEN_COLS)) * 1.5
    const alienSpeed = d.alienSpeed * speedMultiplier

    let needDrop = false
    for (const a of aliveAliens) {
      a.x += alienSpeed * g.alienDir
    }
    for (const a of aliveAliens) {
      if (a.x + ALIEN_W > W - 4 || a.x < 4) {
        needDrop = true
        break
      }
    }
    if (needDrop) {
      g.alienDir *= -1
      for (const a of g.aliens) {
        if (a.alive) a.y += 12
      }
    }

    for (const b of g.playerBullets) {
      b.y -= 7
    }
    g.playerBullets = g.playerBullets.filter(b => b.y > -10)

    for (const b of g.alienBullets) {
      b.y += 4
    }
    g.alienBullets = g.alienBullets.filter(b => b.y < H + 10)

    for (const b of g.playerBullets) {
      for (const a of g.aliens) {
        if (!a.alive) continue
        if (b.x > a.x && b.x < a.x + ALIEN_W && b.y > a.y && b.y < a.y + ALIEN_H) {
          a.alive = false
          b.y = -100
          const pts = 10 * (a.row + 1)
          scoreRef.current += pts
          setScore(scoreRef.current)
          sound('hit')
          break
        }
      }
    }

    for (const b of g.playerBullets) {
      for (const shield of g.shields) {
        for (let i = shield.length - 1; i >= 0; i--) {
          const p = shield[i]
          if (b.x > p.x && b.x < p.x + 4 && b.y > p.y && b.y < p.y + 4) {
            p.health--
            b.y = -100
            if (p.health <= 0) shield.splice(i, 1)
            break
          }
        }
      }
    }

    for (const b of g.alienBullets) {
      for (const shield of g.shields) {
        for (let i = shield.length - 1; i >= 0; i--) {
          const p = shield[i]
          if (b.x > p.x && b.x < p.x + 4 && b.y > p.y && b.y < p.y + 4) {
            p.health--
            b.y = H + 100
            if (p.health <= 0) shield.splice(i, 1)
            break
          }
        }
      }
    }

    if (aliveAliens.length > 0 && Math.random() < d.alienShootChance) {
      const shooters = aliveAliens.filter(a => {
        const below = aliveAliens.find(o => o.row > a.row && Math.abs(o.x - a.x) < ALIEN_W)
        return !below
      })
      if (shooters.length > 0) {
        const shooter = shooters[Math.floor(Math.random() * shooters.length)]
        g.alienBullets.push({ x: shooter.x + ALIEN_W / 2, y: shooter.y + ALIEN_H })
      }
    }

    const px = g.playerX, py = H - 40
    for (const b of g.alienBullets) {
      if (b.x > px - PLAYER_W / 2 && b.x < px + PLAYER_W / 2 && b.y > py && b.y < py + PLAYER_H) {
        b.y = H + 100
        livesRef.current--
        setLives(livesRef.current)
        sound('death')
        if (livesRef.current <= 0) {
          gameOverRef.current = true
          setGameOver(true)
          const finalScore = scoreRef.current
          if (finalScore > highScore) { setHighScore(finalScore); saveHighScore('spaceinvaders', finalScore) }
          recordGame(finalScore, 0)
          return
        }
        break
      }
    }

    for (const a of aliveAliens) {
      if (a.y + ALIEN_H > py) {
        gameOverRef.current = true
        setGameOver(true)
        sound('death')
        const finalScore = scoreRef.current
        if (finalScore > highScore) { setHighScore(finalScore); saveHighScore('spaceinvaders', finalScore) }
        recordGame(finalScore, 0)
        return
      }
    }

    if (aliveAliens.length === 0) {
      waveRef.current++
      setWave(waveRef.current)
      spawnWave(diffRef.current, waveRef.current)
      sound('victory')
    }

    ctx.clearRect(0, 0, W, H)
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0a0a2e')
    bg.addColorStop(1, '#0d1b2a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    for (let i = 0; i < 8; i++) {
      const sx = (g.frame * 0.15 + i * 50) % W
      ctx.fillRect(sx, (i * 71 + 15) % H, 1.5, 1.5)
    }

    ctx.fillStyle = '#00d4ff'
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(px, py - 8)
    ctx.lineTo(px - PLAYER_W / 2, py + PLAYER_H / 2)
    ctx.lineTo(px + PLAYER_W / 2, py + PLAYER_H / 2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(0, 212, 255, 0.25)'
    ctx.beginPath()
    ctx.moveTo(px, py - 4)
    ctx.lineTo(px - PLAYER_W / 4, py + PLAYER_H / 3)
    ctx.lineTo(px + PLAYER_W / 4, py + PLAYER_H / 3)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0

    for (const b of g.playerBullets) {
      ctx.fillStyle = '#00ff41'
      ctx.shadowColor = '#00ff41'
      ctx.shadowBlur = 6
      ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H)
      ctx.shadowBlur = 0
    }

    for (const b of g.alienBullets) {
      ctx.fillStyle = '#ff2d7b'
      ctx.shadowColor = '#ff2d7b'
      ctx.shadowBlur = 6
      ctx.fillRect(b.x - ALIEN_BULLET_W / 2, b.y, ALIEN_BULLET_W, ALIEN_BULLET_H)
      ctx.shadowBlur = 0
    }

    for (const a of g.aliens) {
      if (!a.alive) continue
      const color = a.row % 2 === 0 ? '#ff2d7b' : '#b946ff'
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 6
      const wobble = Math.sin(g.frame * 0.05 + a.row) * 1.5
      ctx.beginPath()
      ctx.roundRect(a.x + 2, a.y + 2, ALIEN_W - 4, ALIEN_H - 4, 4)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(a.x + 5, a.y + 4, ALIEN_W - 10, 5)
      const eyeY = a.y + ALIEN_H / 2 + wobble
      ctx.fillStyle = '#fff'
      ctx.fillRect(a.x + 7, eyeY - 2, 4, 4)
      ctx.fillRect(a.x + ALIEN_W - 11, eyeY - 2, 4, 4)
      ctx.shadowBlur = 0
    }

    for (const shield of g.shields) {
      for (const p of shield) {
        if (p.health === 3) ctx.fillStyle = '#00ff41'
        else if (p.health === 2) ctx.fillStyle = '#77ff77'
        else ctx.fillStyle = '#555'
        ctx.fillRect(p.x, p.y, 3, 3)
      }
    }

    for (let i = 0; i < livesRef.current; i++) {
      ctx.fillStyle = '#00d4ff'
      ctx.beginPath()
      const lx = 14 + i * 22, ly = 14
      ctx.moveTo(lx, ly - 5)
      ctx.lineTo(lx - 8, ly + 5)
      ctx.lineTo(lx + 8, ly + 5)
      ctx.closePath()
      ctx.fill()
    }

    animRef.current = requestAnimationFrame(gameLoop)
  }, [highScore, recordGame, sound, spawnWave])

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
      gameRef.current.mouseX = ((e.clientX || e.touches?.[0]?.clientX || 0) - rect.left) * (W / rect.width)
    }
    function handleDown(e) {
      if (e.button === 0 || e.touches) gameRef.current.shooting = true
    }
    function handleUp(e) {
      if (e.button === 0 || !e.touches) gameRef.current.shooting = false
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('mousedown', handleDown)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchstart', handleDown, { passive: true })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('mousedown', handleDown)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchstart', handleDown)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isPlaying])

  function startGame(diffName) {
    setDifficulty(diffName)
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    const g = gameRef.current
    g.playerX = W / 2
    g.mouseX = W / 2
    g.playerBullets = []
    g.alienBullets = []
    g.shooting = false
    g.frame = 0
    scoreRef.current = 0
    livesRef.current = d.lives
    waveRef.current = 1
    gameOverRef.current = false
    g.aliens = createAliens(d.alienRows)
    g.alienDir = 1
    g.alienDrop = false
    g.shields = createShields()
    setScore(0)
    setLives(d.lives)
    setWave(1)
    setGameOver(false)
    setCopied(false)
  }

  function handleShare() {
    const text = `👾 Space Invaders — ${score} pts | Wave ${wave} | ${DIFFICULTIES.find(d => d.name === difficulty)?.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>👾 Space Invaders</h2>
        <p className="description">Defend Earth from waves of alien invaders!</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Mouse/Touch to aim — Click/Tap to fire</span>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => { setDifficulty(null); cancelAnimationFrame(animRef.current) }} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Score</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-cyan)' }}>{score}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Wave</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: '#b946ff' }}>{wave}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Lives</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-pink)' }}>{lives}</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 12, border: '2px solid var(--border-glass)', cursor: 'none' }} />
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: 'var(--lose-color)', marginBottom: 8 }}>GAME OVER</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 4 }}>{score} points — Wave {wave}</div>
          {score > 0 && <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>}
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
