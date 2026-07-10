import { useRef, useCallback } from 'react'

let globalMuted = localStorage.getItem('arcade-muted') === 'true'

export function isMuted() {
  return globalMuted
}

export function setMuted(val) {
  globalMuted = val
  localStorage.setItem('arcade-muted', String(val))
}

export function toggleMute() {
  setMuted(!globalMuted)
}

export default function useSound() {
  const ctxRef = useRef(null)
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    return ctxRef.current
  }, [])

  return useCallback((type) => {
    if (globalMuted) return
    try {
      const ctx = getCtx()

      if (type === 'click') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1
        osc.frequency.value = 800
        osc.type = 'sine'
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.08)
      } else if (type === 'confirm') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1
        osc.frequency.value = 600
        osc.type = 'sine'
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.15)
      } else if (type === 'win') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.06
        osc.type = 'square'
        osc.frequency.setValueAtTime(523, ctx.currentTime)
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } else if (type === 'lose') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.04
        osc.type = 'sawtooth'
        osc.frequency.value = 400
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.35)
      } else if (type === 'draw') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.08
        osc.type = 'triangle'
        osc.frequency.value = 440
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.2)
      } else if (type === 'cash') {
        const notes = [880, 1109, 1319]
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.connect(g)
          g.connect(ctx.destination)
          o.frequency.value = freq
          o.type = 'sine'
          g.gain.value = 0.06
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15)
          o.start(ctx.currentTime + i * 0.08)
          o.stop(ctx.currentTime + i * 0.08 + 0.15)
        })
      } else if (type === 'loseBig') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.05
        osc.type = 'sawtooth'
        osc.frequency.value = 300
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.6)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.7)
      } else if (type === 'victory') {
        const notes = [523, 659, 784, 1047]
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.connect(g)
          g.connect(ctx.destination)
          o.frequency.value = freq
          o.type = 'square'
          g.gain.value = 0.05
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.2)
          o.start(ctx.currentTime + i * 0.15)
          o.stop(ctx.currentTime + i * 0.15 + 0.2)
        })
      } else if (type === 'defeat') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.04
        osc.type = 'sawtooth'
        osc.frequency.value = 300
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.6)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.7)
      }
    } catch (e) {}
  }, [getCtx])
}
