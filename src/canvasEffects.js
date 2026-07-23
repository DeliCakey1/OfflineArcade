export function createParticlePool() {
  return []
}

export function spawnParticles(pool, x, y, color, count = 8, opts = {}) {
  const { spread = Math.PI * 2, speed = 2, gravity = 0.05, life = 40, sizeMin = 2, sizeMax = 5, angle = 0 } = opts
  for (let i = 0; i < count; i++) {
    const a = angle - spread / 2 + Math.random() * spread
    const s = (0.5 + Math.random()) * speed
    pool.push({
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
}

export function updateParticles(pool) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const p = pool[i]
    p.x += p.vx
    p.y += p.vy
    p.vy += p.gravity
    p.vx *= 0.98
    p.life--
    if (p.life <= 0) pool.splice(i, 1)
  }
}

export function drawParticles(ctx, pool) {
  for (const p of pool) {
    const alpha = Math.max(0, p.life / p.maxLife)
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (0.3 + 0.7 * alpha), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function screenShakeApply(ctx, intensity) {
  const dx = (Math.random() - 0.5) * intensity * 2
  const dy = (Math.random() - 0.5) * intensity * 2
  ctx.save()
  ctx.translate(dx, dy)
}

export function screenShakeRestore(ctx) {
  ctx.restore()
}
