import { useState, useCallback, useRef, useEffect } from 'react'

let nextId = 0

export default function useEffects() {
  const [particles, setParticles] = useState([])
  const [floats, setFloats] = useState([])
  const [shaking, setShaking] = useState(false)
  const shakeTimer = useRef(null)
  const rafRef = useRef(null)
  const poolRef = useRef([])
  const floatTimerRef = useRef({})

  const spawnParticles = useCallback((x, y, color, count = 8, opts = {}) => {
    const { spread = Math.PI * 2, speed = 3, gravity = 0.12, life = 35, sizeMin = 3, sizeMax = 7, angle = -Math.PI / 2 } = opts
    const newP = []
    for (let i = 0; i < count; i++) {
      const a = angle - spread / 2 + Math.random() * spread
      const s = (0.5 + Math.random()) * speed
      newP.push({
        id: nextId++,
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        life,
        maxLife: life,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        gravity,
      })
    }
    poolRef.current = [...poolRef.current, ...newP]
    setParticles([...poolRef.current])
  }, [])

  const floatText = useCallback((x, y, text, color = '#ffe600') => {
    const id = nextId++
    setFloats(prev => [...prev, { id, x, y, text, color }])
    const timer = setTimeout(() => {
      setFloats(prev => prev.filter(f => f.id !== id))
    }, 850)
    floatTimerRef.current[id] = timer
  }, [])

  const shakeScreen = useCallback((intensity = 4, duration = 300) => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    setShaking(true)
    shakeTimer.current = setTimeout(() => {
      setShaking(false)
      shakeTimer.current = null
    }, duration)
  }, [])

  useEffect(() => {
    let running = true
    function tick() {
      if (!running) return
      const pool = poolRef.current
      let changed = false
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.vx *= 0.97
        p.life--
        if (p.life <= 0) {
          pool.splice(i, 1)
          changed = true
        }
      }
      if (changed || pool.length > 0) {
        setParticles([...pool])
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      Object.values(floatTimerRef.current).forEach(clearTimeout)
      if (shakeTimer.current) clearTimeout(shakeTimer.current)
    }
  }, [])

  const renderParticles = useCallback((containerStyle = {}) => (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', ...containerStyle }}>
      {particles.map(p => {
        const alpha = Math.max(0, p.life / p.maxLife)
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              width: p.size * (0.3 + 0.7 * alpha),
              height: p.size * (0.3 + 0.7 * alpha),
              borderRadius: '50%',
              background: p.color,
              opacity: alpha,
              boxShadow: `0 0 ${p.size}px ${p.color}`,
            }}
          />
        )
      })}
      {floats.map(f => (
        <div
          key={f.id}
          className="juice-float-text"
          style={{
            left: f.x,
            top: f.y,
            color: f.color,
          }}
        >
          {f.text}
        </div>
      ))}
    </div>
  ), [particles, floats])

  const shakeStyle = shaking ? {
    animation: 'juice-shake 0.08s linear infinite',
  } : {}

  return {
    spawnParticles,
    floatText,
    shakeScreen,
    renderParticles,
    shakeStyle,
    particles,
    shaking,
  }
}
