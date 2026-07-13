import { useEffect, useRef } from 'react'

const COLORS = ['#ff2d7b', '#00d4ff', '#39ff14', '#ffe600', '#b946ff', '#ff6b2b', '#f59e0b']
const PARTICLE_COUNT = 60

export default function Confetti({ active, onDone }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 14 - 4,
      size: Math.random() * 8 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.15 + Math.random() * 0.1,
      life: 1,
      decay: 0.008 + Math.random() * 0.008,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }))

    let frame = 0
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of particles) {
        if (p.life <= 0) continue
        alive = true
        p.x += p.vx
        p.vy += p.gravity
        p.y += p.vy
        p.vx *= 0.98
        p.rotation += p.rotSpeed
        p.life -= p.decay

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      frame++
      if (alive && frame < 180) {
        animRef.current = requestAnimationFrame(draw)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onDone?.()
      }
    }
    animRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animRef.current); ctx.clearRect(0, 0, canvas.width, canvas.height) }
  }, [active, onDone])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        pointerEvents: 'none',
      }}
    />
  )
}
