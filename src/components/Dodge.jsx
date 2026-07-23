import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const W = 360, H = 480
const PLAYER_SIZE = 30
const OBSTACLE_SPEED_BASE = 2

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Slow obstacles, big player', speed: 1.5, spawnRate: 50, playerSize: 36 },
  { name: 'Normal', emoji: '🟡', desc: 'Standard dodge', speed: 2.5, spawnRate: 35, playerSize: 30 },
  { name: 'Hard', emoji: '🟠', desc: 'Fast and frequent', speed: 3.5, spawnRate: 25, playerSize: 26 },
  { name: 'Insane', emoji: '💀', desc: 'Bullet hell', speed: 5, spawnRate: 18, playerSize: 22 },
]

const OBSTACLE_TYPES = [
  { color: '#ff2d7b', shape: 'circle' },
  { color: '#ff6b2b', shape: 'square' },
  { color: '#ffe600', shape: 'triangle' },
  { color: '#b946ff', shape: 'diamond' },
]

export default function Dodge({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)
  const gameRef = useRef({ playerX: W / 2, playerY: H - 60, obstacles: [], frame: 0, mouseX: W / 2 })
  const animRef = useRef(null)
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const diffRef = useRef(null)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('dodge')
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

    g.playerX += (g.mouseX - g.playerX) * 0.12
    g.playerX = Math.max(d.playerSize / 2, Math.min(W - d.playerSize / 2, g.playerX))

    g.frame++
    if (g.frame % d.spawnRate === 0) {
      const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)]
      const x = Math.random() * (W - 20) + 10
      g.obstacles.push({ x, y: -15, speed: d.speed + Math.random() * 1.5, type, size: 10 + Math.random() * 8 })
    }

    if (g.frame % 300 === 0) {
      for (let i = 0; i < 3; i++) {
        const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)]
        g.obstacles.push({ x: Math.random() * (W - 20) + 10, y: -15 - i * 30, speed: d.speed + 1 + Math.random(), type, size: 12 + Math.random() * 6 })
      }
    }

    for (const o of g.obstacles) {
      o.y += o.speed
      if (o.y > 20 && o.y < 25) {
        scoreRef.current++
        setScore(scoreRef.current)
      }
    }

    const px = g.playerX, py = g.playerY, pr = d.playerSize / 2
    for (const o of g.obstacles) {
      const dx = px - o.x, dy = py - o.y
      if (Math.sqrt(dx * dx + dy * dy) < pr + o.size / 2) {
        gameOverRef.current = true
        setGameOver(true)
        sound('death')
        const finalScore = scoreRef.current
        if (finalScore > bestScore) { setBestScore(finalScore); saveHighScore('dodge', finalScore) }
        recordGame(finalScore, 0)
        return
      }
    }

    g.obstacles = g.obstacles.filter(o => o.y < H + 20)

    ctx.clearRect(0, 0, W, H)
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#1a0a2e')
    bg.addColorStop(1, '#16213e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    for (let i = 0; i < 6; i++) {
      const sx = (g.frame * 0.2 + i * 65) % W
      ctx.fillRect(sx, (i * 83 + 10) % H, 1.5, 1.5)
    }

    for (const o of g.obstacles) {
      ctx.fillStyle = o.type.color
      ctx.shadowColor = o.type.color
      ctx.shadowBlur = 6
      if (o.type.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(o.x, o.y, o.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else if (o.type.shape === 'square') {
        ctx.fillRect(o.x - o.size / 2, o.y - o.size / 2, o.size, o.size)
      } else if (o.type.shape === 'triangle') {
        ctx.beginPath()
        ctx.moveTo(o.x, o.y - o.size / 2)
        ctx.lineTo(o.x - o.size / 2, o.y + o.size / 2)
        ctx.lineTo(o.x + o.size / 2, o.y + o.size / 2)
        ctx.closePath()
        ctx.fill()
      } else if (o.type.shape === 'diamond') {
        ctx.beginPath()
        ctx.moveTo(o.x, o.y - o.size / 2)
        ctx.lineTo(o.x + o.size / 2, o.y)
        ctx.lineTo(o.x, o.y + o.size / 2)
        ctx.lineTo(o.x - o.size / 2, o.y)
        ctx.closePath()
        ctx.fill()
      }
      ctx.shadowBlur = 0
    }

    ctx.fillStyle = '#00d4ff'
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(px, py, pr, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.arc(px - pr * 0.25, py - pr * 0.25, pr * 0.3, 0, Math.PI * 2)
    ctx.fill()
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
    function handleMove(e) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      gameRef.current.mouseX = ((e.clientX || e.touches?.[0]?.clientX || 0) - rect.left) * (W / rect.width)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchmove', handleMove, { passive: true })
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('touchmove', handleMove) }
  }, [isPlaying])

  function startGame(diffName) {
    setDifficulty(diffName)
    const g = gameRef.current
    g.playerX = W / 2
    g.playerY = H - 60
    g.obstacles = []
    g.frame = 0
    g.mouseX = W / 2
    scoreRef.current = 0
    gameOverRef.current = false
    setScore(0)
    setGameOver(false)
    setCopied(false)
  }

  function handleShare() {
    const text = `🎮 Dodge — ${score} survived | ${DIFFICULTIES.find(d => d.name === difficulty)?.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🎮 Dodge</h2>
        <p className="description">Move your cursor to dodge the falling obstacles!</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Mouse / Touch to move your orb</span>
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
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 12, border: '2px solid var(--border-glass)', cursor: 'none' }} />
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: 'var(--lose-color)', marginBottom: 8 }}>GAME OVER</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>{score} obstacles dodged</div>
          <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
