import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const W = 360, H = 480
const CELL = 20
const COLS = W / CELL
const ROWS = H / CELL

const DIFFICULTIES = [
  { name: 'Easy', emoji: '🟢', desc: 'Slow & short', centipedeSpeed: 120, centipedeLength: 8, spiderChance: 0.001, lives: 5, bulletCooldown: 200 },
  { name: 'Normal', emoji: '🟡', desc: 'Classic arcade', centipedeSpeed: 90, centipedeLength: 10, spiderChance: 0.002, lives: 3, bulletCooldown: 150 },
  { name: 'Hard', emoji: '🟠', desc: 'Fast & swarming', centipedeSpeed: 60, centipedeLength: 12, spiderChance: 0.003, lives: 3, bulletCooldown: 100 },
  { name: 'Insane', emoji: '💀', desc: 'One life chaos', centipedeSpeed: 40, centipedeLength: 14, spiderChance: 0.005, lives: 1, bulletCooldown: 80 },
]

function createCentipede(length, startCol) {
  const segments = []
  for (let i = 0; i < length; i++) {
    segments.push({ col: startCol - i, row: 0, dir: 1, isHead: i === 0 })
  }
  return segments
}

export default function Centipede({ onPlayingChange }) {
  const [difficulty, setDifficulty] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [copied, setCopied] = useState(false)
  const [wave, setWave] = useState(1)
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const animRef = useRef(null)
  const tickRef = useRef(null)
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const diffRef = useRef(null)
  const waveRef = useRef(1)
  const livesRef = useRef(3)
  const [lives, setLives] = useState(3)
  const sound = useSound()
  const { recordGame, getHighScore, setHighScore: saveHighScore } = useStats('centipede')
  const isPlaying = difficulty && !gameOver

  useEffect(() => { onPlayingChange?.(isPlaying); return () => onPlayingChange?.(false) }, [isPlaying, onPlayingChange])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { diffRef.current = difficulty }, [difficulty])

  function resetGameState() {
    const d = DIFFICULTIES.find(x => x.name === difficulty) || DIFFICULTIES[1]
    const g = {
      playerCol: Math.floor(COLS / 2),
      bullet: null,
      centipedes: [createCentipede(d.centipedeLength, Math.floor(COLS / 2))],
      mushrooms: [],
      spiders: [],
      lastTick: 0,
      lastBullet: 0,
      mouseX: W / 2,
      invincibleUntil: 0,
      time: 0,
    }
    for (let i = 0; i < 8; i++) {
      const col = Math.floor(Math.random() * COLS)
      const row = Math.floor(Math.random() * (ROWS - 6)) + 2
      g.mushrooms.push({ col, row, hp: 2 })
    }
    gameRef.current = g
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g = gameRef.current
    if (!g) return

    ctx.clearRect(0, 0, W, H)
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0a0a2e')
    bg.addColorStop(1, '#0d1b2a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 0.5
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath()
      ctx.moveTo(c * CELL, 0)
      ctx.lineTo(c * CELL, H)
      ctx.stroke()
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * CELL)
      ctx.lineTo(W, r * CELL)
      ctx.stroke()
    }

    for (const m of g.mushrooms) {
      const cx = m.col * CELL + CELL / 2
      const cy = m.row * CELL + CELL / 2
      ctx.fillStyle = m.hp === 2 ? '#22c55e' : '#15803d'
      ctx.beginPath()
      ctx.arc(cx, cy - 2, 6, Math.PI, 0)
      ctx.fill()
      ctx.fillRect(cx - 2, cy - 2, 4, 7)
    }

    for (const seg of g.centipedes.flat()) {
      const cx = seg.col * CELL + CELL / 2
      const cy = seg.row * CELL + CELL / 2
      if (seg.isHead) {
        ctx.fillStyle = '#ff2d7b'
        ctx.shadowColor = '#ff2d7b'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(cx - 3, cy - 2, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx + 3, cy - 2, 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = '#b946ff'
        ctx.shadowColor = '#b946ff'
        ctx.shadowBlur = 5
        ctx.beginPath()
        ctx.arc(cx, cy, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    for (const s of g.spiders) {
      const cx = s.x
      const cy = s.y
      ctx.fillStyle = '#ffe600'
      ctx.shadowColor = '#ffe600'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.moveTo(cx, cy - 8)
      ctx.lineTo(cx + 8, cy)
      ctx.lineTo(cx, cy + 8)
      ctx.lineTo(cx - 8, cy)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
    }

    const px = g.playerCol * CELL + CELL / 2
    const py = H - CELL / 2
    ctx.fillStyle = '#00d4ff'
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(px, py - 10)
    ctx.lineTo(px - 8, py + 6)
    ctx.lineTo(px + 8, py + 6)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0

    if (g.bullet) {
      ctx.fillStyle = '#00ff41'
      ctx.shadowColor = '#00ff41'
      ctx.shadowBlur = 6
      ctx.fillRect(g.bullet.col * CELL + CELL / 2 - 1.5, g.bullet.row * CELL, 3, CELL)
      ctx.shadowBlur = 0
    }
  }, [])

  const gameTick = useCallback((timestamp) => {
    if (gameOverRef.current || !diffRef.current) {
      animRef.current = requestAnimationFrame(gameTick)
      draw()
      return
    }
    const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]
    const g = gameRef.current
    if (!g) { animRef.current = requestAnimationFrame(gameTick); return }

    g.time++

    g.playerCol = Math.floor(((g.mouseX) / W) * COLS)
    g.playerCol = Math.max(0, Math.min(COLS - 1, g.playerCol))

    if (g.bullet) {
      g.bullet.row--
      if (g.bullet.row < 0) {
        g.bullet = null
      } else {
        const bCol = g.bullet.col
        const bRow = g.bullet.row

        let hitMushroom = g.mushrooms.findIndex(m => m.col === bCol && m.row === bRow)
        if (hitMushroom >= 0) {
          g.mushrooms[hitMushroom].hp--
          if (g.mushrooms[hitMushroom].hp <= 0) {
            g.mushrooms.splice(hitMushroom, 1)
          }
          g.bullet = null
          sound('brick')
        } else {
          for (let ci = 0; ci < g.centipedes.length; ci++) {
            const chain = g.centipedes[ci]
            for (let si = 0; si < chain.length; si++) {
              if (chain[si].col === bCol && chain[si].row === bRow) {
                const seg = chain[si]
                g.mushrooms.push({ col: seg.col, row: seg.row, hp: 2 })
                const pts = seg.isHead ? 100 : 10
                scoreRef.current += pts
                setScore(scoreRef.current)
                sound('hit')

                if (chain.length === 1) {
                  g.centipedes.splice(ci, 1)
                } else if (si === 0) {
                  const tail = chain.slice(1)
                  tail[0].isHead = true
                  g.centipedes.splice(ci, 1, tail)
                } else if (si === chain.length - 1) {
                  g.centipedes.splice(ci, 1, chain.slice(0, -1))
                } else {
                  const left = chain.slice(0, si)
                  const right = chain.slice(si + 1)
                  right[0].isHead = true
                  g.centipedes.splice(ci, 1, left, right)
                }

                g.bullet = null
                break
              }
            }
            if (!g.bullet) break
          }
        }
      }
    }

    if (g.time % 5 === 0) {
      const allSegments = g.centipedes.flat()
      if (allSegments.length > 0) {
        const maxRow = Math.max(...allSegments.map(s => s.row))
        if (maxRow >= ROWS - 1) {
          nextWave(g, d)
        }
      } else {
        nextWave(g, d)
      }
    }

    if (g.time % Math.round(d.centipedeSpeed / 16) === 0) {
      for (const chain of g.centipedes) {
        moveCentipedeChain(chain, g)
      }
    }

    if (Math.random() < d.spiderChance && g.spiders.length < 2) {
      const fromLeft = Math.random() < 0.5
      g.spiders.push({
        x: fromLeft ? -10 : W + 10,
        y: H - CELL - Math.random() * (H * 0.5),
        dx: fromLeft ? 2.5 : -2.5,
        dy: 0,
        zigTimer: 0,
      })
    }

    for (const s of g.spiders) {
      s.zigTimer++
      if (s.zigTimer % 20 === 0) {
        s.dy = (Math.random() - 0.5) * 4
      }
      s.x += s.dx
      s.y += s.dy
      s.y = Math.max(2 * CELL, Math.min(H - 2 * CELL, s.y))
    }
    g.spiders = g.spiders.filter(s => s.x > -30 && s.x < W + 30)

    const playerPx = g.playerCol * CELL + CELL / 2
    const playerPy = H - CELL / 2

    if (g.time > g.invincibleUntil) {
      for (const s of g.spiders) {
        const dx = playerPx - s.x
        const dy = playerPy - s.y
        if (Math.sqrt(dx * dx + dy * dy) < 16) {
          playerHit(g, d)
          break
        }
      }
    }

    if (g.time > g.invincibleUntil) {
      for (const chain of g.centipedes) {
        for (const seg of chain) {
          const cx = seg.col * CELL + CELL / 2
          const cy = seg.row * CELL + CELL / 2
          const dx = playerPx - cx
          const dy = playerPy - cy
          if (Math.sqrt(dx * dx + dy * dy) < 14) {
            playerHit(g, d)
            break
          }
        }
        if (g.time <= g.invincibleUntil) break
      }
    }

    draw()
    animRef.current = requestAnimationFrame(gameTick)
  }, [draw, sound])

  function moveCentipedeChain(chain, g) {
    for (let i = 0; i < chain.length; i++) {
      const seg = chain[i]
      let nextCol = seg.col + seg.dir
      let hitWall = false

      if (nextCol < 0 || nextCol >= COLS) {
        hitWall = true
      } else {
        const blocked = g.mushrooms.some(m => m.col === nextCol && m.row === seg.row)
        if (blocked) hitWall = true
      }

      if (hitWall) {
        seg.row++
        seg.dir *= -1
        if (seg.row >= ROWS) seg.row = ROWS - 1
      } else {
        seg.col = nextCol
      }
    }
  }

  function playerHit(g, d) {
    livesRef.current--
    setLives(livesRef.current)
    sound('death')
    if (livesRef.current <= 0) {
      gameOverRef.current = true
      setGameOver(true)
      const finalScore = scoreRef.current
      if (finalScore > bestScore) { setBestScore(finalScore); saveHighScore('centipede', finalScore) }
      recordGame(finalScore, 0)
    } else {
      g.invincibleUntil = g.time + 90
      g.playerCol = Math.floor(COLS / 2)
    }
  }

  function nextWave(g, d) {
    const currentTotal = g.centipedes.reduce((sum, c) => sum + c.length, 0)
    const newLen = Math.min(currentTotal + 2, 20)
    g.centipedes = [createCentipede(newLen, Math.floor(Math.random() * (COLS - 4)) + 2)]
    g.centipedes[0].forEach((s, i) => { s.row = i === 0 ? 0 : 0 })
    waveRef.current++
    setWave(waveRef.current)
    sound('levelup')
  }

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(animRef.current); return }
    animRef.current = requestAnimationFrame(gameTick)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, gameTick])

  useEffect(() => {
    if (!isPlaying) return
    function handleMove(e) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      gameRef.current.mouseX = ((e.clientX || e.touches?.[0]?.clientX || 0) - rect.left) * (W / rect.width)
    }
    function handleShoot(e) {
      if (gameOverRef.current) return
      const g = gameRef.current
      if (!g || g.bullet) return
      const now = Date.now()
      const d = DIFFICULTIES.find(x => x.name === diffRef.current) || DIFFICULTIES[1]
      if (now - g.lastBullet < d.bulletCooldown) return
      g.bullet = { col: g.playerCol, row: ROWS - 2 }
      g.lastBullet = now
      sound('click')
    }
    function handleClick(e) { handleShoot(e) }
    function handleKey(e) {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); handleShoot(e) }
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [isPlaying, sound])

  function startGame(diffName) {
    setDifficulty(diffName)
    const d = DIFFICULTIES.find(x => x.name === diffName) || DIFFICULTIES[1]
    scoreRef.current = 0
    gameOverRef.current = false
    waveRef.current = 1
    livesRef.current = d.lives
    setScore(0)
    setGameOver(false)
    setCopied(false)
    setWave(1)
    setLives(d.lives)
    resetGameState()
  }

  function handleShare() {
    const text = `🐛 Centipede — ${score} pts | Wave ${wave} | ${DIFFICULTIES.find(d => d.name === difficulty)?.emoji} ${difficulty}`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (!difficulty) {
    return (
      <div className="game-card slide-in">
        <h2>🐛 Centipede</h2>
        <p className="description">Shoot the centipede! Destroy segments, avoid spiders!</p>
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
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Click / Tap / Space to shoot upward</span>
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
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Best</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: 'var(--neon-orange)' }}>🏆 {bestScore}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 8, fontSize: 12 }}>
        <span style={{ color: 'var(--text-dim)', fontFamily: "'Press Start 2P', monospace", fontSize: 10 }}>WAVE {wave}</span>
        <span style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: lives }).map((_, i) => (
            <span key={i} style={{ color: '#00d4ff', fontSize: 12 }}>▲</span>
          ))}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', maxWidth: W, borderRadius: 12, border: '2px solid var(--border-glass)', cursor: 'none' }} />
      </div>
      {gameOver && (
        <div className="confirm-area" style={{ marginTop: 16 }}>
          <div className="confirm-text" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: 'var(--lose-color)', marginBottom: 8 }}>GAME OVER</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 4 }}>{score} points — Wave {wave}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>{DIFFICULTIES.find(d => d.name === difficulty)?.emoji} {difficulty}</div>
          <button className="share-btn confirm-btn" onClick={handleShare} style={{ marginRight: 8 }}>{copied ? '✓ Copied!' : '📋 Share'}</button>
          <button className="confirm-btn yes" onClick={() => startGame(difficulty)}>Play Again</button>
        </div>
      )}
    </div>
  )
}
