import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const W = 360, H = 480
const MAX_FRUITS = 6

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Slow fruits, few bombs', fruitSpeed: 3, gravity: 0.06, bombChance: 0.05, maxMisses: 5, spawnRate: 80 },
  { name: 'Normal', emoji: '🟡', desc: 'Standard slice action', fruitSpeed: 4, gravity: 0.08, bombChance: 0.1, maxMisses: 3, spawnRate: 60 },
  { name: 'Hard', emoji: '🟠', desc: 'Fast fruits, more bombs', fruitSpeed: 5, gravity: 0.1, bombChance: 0.15, maxMisses: 3, spawnRate: 45 },
  { name: 'Insane', emoji: '💀', desc: 'Fruit nightmare', fruitSpeed: 6, gravity: 0.12, bombChance: 0.2, maxMisses: 2, spawnRate: 35 },
]

const FRUITS = [
  { emoji: '🍎', color: '#ff2d2d', points: 10 },
  { emoji: '🍊', color: '#ff8c00', points: 10 },
  { emoji: '🍋', color: '#ffe600', points: 20 },
  { emoji: '🍉', color: '#22c55e', points: 30 },
  { emoji: '💣', color: '#333333', points: 0, isBomb: true },
]

function lineCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1
  const fx = x1 - cx, fy = y1 - cy
  const a = dx * dx + dy * dy
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - r * r
  let disc = b * b - 4 * a * c
  if (disc < 0) return false
  disc = Math.sqrt(disc)
  const t1 = (-b - disc) / (2 * a)
  const t2 = (-b + disc) / (2 * a)
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1)
}

function pickFruit(bombChance) {
  if (Math.random() < bombChance) return { ...FRUITS[4] }
  const weights = [35, 30, 20, 15]
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return { ...FRUITS[i] }
  }
  return { ...FRUITS[0] }
}

export default function FruitSlice({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)
  const gameRef = useRef({ fruits: [], trail: [], dragging: false, lastMouse: null, frame: 0 })
  const animRef = useRef(null)
  const scoreRef = useRef(0)
  const missesRef = useRef(0)
  const gameOverRef = useRef(false)
  const diffRef = useRef(null)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('fruitslice')
  const isPlaying = difficulty && !gameOver

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { diffRef.current = difficulty }, [difficulty])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g = gameRef.current
    if (!diffRef.current || gameOverRef.current) { animRef.current = requestAnimationFrame(gameLoop); return }
    const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]

    g.frame++

    if (g.frame % d.spawnRate === 0 && g.fruits.length < MAX_FRUITS) {
      const fruitData = pickFruit(d.bombChance)
      const x = 40 + Math.random() * (W - 80)
      const vy = -(d.fruitSpeed + Math.random() * 2)
      g.fruits.push({
        x, y: H + 30,
        vx: (Math.random() - 0.5) * 2,
        vy,
        fruit: fruitData,
        radius: fruitData.isBomb ? 18 : 22,
        sliced: false,
        sliceTime: 0,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 0.1,
      })
    }

    for (const f of g.fruits) {
      if (f.sliced) {
        f.sliceTime++
        f.y += 4
        f.rotation += f.rotSpeed * 3
        continue
      }
      f.vy += d.gravity
      f.x += f.vx
      f.y += f.vy
      f.rotation += f.rotSpeed
    }

    const unslicedBefore = g.fruits.filter(f => !f.sliced).length
    g.fruits = g.fruits.filter(f => {
      if (f.sliced) return f.sliceTime < 40
      return f.y < H + 50
    })
    const unslicedAfter = g.fruits.filter(f => !f.sliced).length
    const missed = unslicedBefore - unslicedAfter
    if (missed > 0) {
      missesRef.current += missed
      if (missesRef.current >= d.maxMisses) {
        gameOverRef.current = true
        setGameOver(true)
        sound('death')
        const finalScore = scoreRef.current
        if (finalScore > bestScore) { setBestScore(finalScore); saveHighScore('fruitslice', finalScore) }
        recordGame(finalScore, 0)
        return
      }
    }

    if (g.dragging && g.trail.length > 1) {
      const trail = g.trail
      for (const f of g.fruits) {
        if (f.sliced) continue
        for (let i = 1; i < trail.length; i++) {
          if (lineCircleIntersect(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, f.x, f.y, f.radius)) {
            f.sliced = true
            f.sliceTime = 0
            if (f.fruit.isBomb) {
              gameOverRef.current = true
              setGameOver(true)
              sound('death')
              const finalScore = scoreRef.current
              if (finalScore > bestScore) { setBestScore(finalScore); saveHighScore('fruitslice', finalScore) }
              recordGame(finalScore, 0)
              return
            } else {
              scoreRef.current += f.fruit.points
              setScore(scoreRef.current)
              sound('score')
            }
            break
          }
        }
      }
    }

    ctx.clearRect(0, 0, W, H)
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#1a0a2e')
    bg.addColorStop(1, '#0d1b2a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    for (let i = 0; i < 8; i++) {
      const sx = (g.frame * 0.15 + i * 50) % W
      ctx.fillRect(sx, (i * 67 + 15) % H, 1, 1)
    }

    for (const f of g.fruits) {
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(f.rotation)

      if (f.sliced) {
        ctx.globalAlpha = 1 - f.sliceTime / 40
        const splitOffset = f.sliceTime * 1.5
        ctx.font = `${f.radius * 1.6}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = f.fruit.color
        ctx.shadowColor = f.fruit.color
        ctx.shadowBlur = 8
        ctx.fillText(f.fruit.emoji, -splitOffset, 0)
        ctx.fillText(f.fruit.emoji, splitOffset, 0)
        ctx.shadowBlur = 0
      } else {
        if (f.fruit.isBomb) {
          ctx.fillStyle = '#1a1a2e'
          ctx.shadowColor = '#ff0000'
          ctx.shadowBlur = 15
          ctx.beginPath()
          ctx.arc(0, 0, f.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.strokeStyle = '#ff3333'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(0, 0, f.radius, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.fillStyle = f.fruit.color
          ctx.shadowColor = f.fruit.color
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.arc(0, 0, f.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
        ctx.font = `${f.radius * 1.4}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(f.fruit.emoji, 0, 0)
      }
      ctx.restore()
    }

    if (g.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 0; i < g.trail.length; i++) {
        const t = i / g.trail.length
        ctx.globalAlpha = t * 0.7
        if (i === 0) ctx.moveTo(g.trail[i].x, g.trail[i].y)
        else ctx.lineTo(g.trail[i].x, g.trail[i].y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const missesLeft = d.maxMisses - missesRef.current
    ctx.font = '18px serif'
    ctx.textAlign = 'left'
    for (let i = 0; i < d.maxMisses; i++) {
      ctx.globalAlpha = i < missesLeft ? 1 : 0.2
      ctx.fillText('❤️', 10 + i * 24, 28)
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = '#fff'
    ctx.font = "bold 16px 'Press Start 2P', monospace"
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 4
    ctx.fillText(scoreRef.current, W / 2, 30)
    ctx.shadowBlur = 0

    animRef.current = requestAnimationFrame(gameLoop)
  }, [bestScore, recordGame, sound])

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(animRef.current); return }
    animRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, gameLoop])

  useEffect(() => {
    if (!isPlaying) return
    const g = gameRef.current

    function getCanvasPos(e) {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const clientX = e.clientX ?? e.touches?.[0]?.clientX
      const clientY = e.clientY ?? e.touches?.[0]?.clientY
      if (clientX == null || clientY == null) return null
      return {
        x: (clientX - rect.left) * (W / rect.width),
        y: (clientY - rect.top) * (H / rect.height),
      }
    }

    function onDown(e) {
      const pos = getCanvasPos(e)
      if (!pos) return
      g.dragging = true
      g.trail = [pos]
      g.lastMouse = pos
    }

    function onMove(e) {
      if (!g.dragging) return
      const pos = getCanvasPos(e)
      if (!pos) return
      g.trail.push(pos)
      if (g.trail.length > 20) g.trail.shift()
      g.lastMouse = pos
    }

    function onUp() {
      g.dragging = false
      g.trail = []
      g.lastMouse = null
    }

    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('touchstart', onDown, { passive: true })
    canvas.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)

    return () => {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('touchstart', onDown)
      canvas.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [isPlaying])

  function startGame(diffName) {
    setDifficulty(diffName)
    const g = gameRef.current
    g.fruits = []
    g.trail = []
    g.dragging = false
    g.lastMouse = null
    g.frame = 0
    scoreRef.current = 0
    missesRef.current = 0
    gameOverRef.current = false
    setScore(0)
    setGameOver(false)
    setCopied(false)
    sound('click')
  }

  function handleShare() {
    const text = `🔪 Fruit Slice — ${score} pts | ${DIFFICULTIES.find(d => d.name === difficulty)?.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🔪 Fruit Slice</h2>
        <p className="description">Swipe to slice fruits! Avoid the bombs!</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Click & drag to slice fruits</span>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <QuitConfirmButton onQuit={() => { setDifficulty(null); cancelAnimationFrame(animRef.current) }} gameOver={gameOver} className="quit-btn" />
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Score</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-cyan)' }}>{score}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Best</div><div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-orange)' }}>🏆 {bestScore}</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 12, border: '2px solid var(--border-glass)', cursor: 'crosshair' }} />
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: 'var(--lose-color)', marginBottom: 8 }}>GAME OVER</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{score} points sliced</div>
          <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
