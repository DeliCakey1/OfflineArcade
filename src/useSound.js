import { useRef, useCallback } from 'react'

let globalMuted = localStorage.getItem('arcade-muted') === 'true'
let globalVolume = parseFloat(localStorage.getItem('arcade-volume') || '1')

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

export function getVolume() {
  return globalVolume
}

export function setVolume(val) {
  globalVolume = val
  localStorage.setItem('arcade-volume', String(val))
}

export function haptic(pattern = 10) {
  try { navigator.vibrate?.(pattern) } catch {}
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
      const vol = globalVolume

      if (type === 'click') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1 * vol
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
        gain.gain.value = 0.1 * vol
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
        gain.gain.value = 0.06 * vol
        osc.type = 'square'
        osc.frequency.setValueAtTime(523, ctx.currentTime)
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
        haptic([10, 30, 10])
      } else if (type === 'lose') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.04 * vol
        osc.type = 'sawtooth'
        osc.frequency.value = 400
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.35)
        haptic(50)
      } else if (type === 'draw') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.08 * vol
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
          g.gain.value = 0.06 * vol
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15)
          o.start(ctx.currentTime + i * 0.08)
          o.stop(ctx.currentTime + i * 0.08 + 0.15)
        })
      } else if (type === 'loseBig') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.05 * vol
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
          g.gain.value = 0.05 * vol
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.2)
          o.start(ctx.currentTime + i * 0.15)
          o.stop(ctx.currentTime + i * 0.15 + 0.2)
        })
      } else if (type === 'defeat') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.04 * vol
        osc.type = 'sawtooth'
        osc.frequency.value = 300
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.6)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.7)
      } else if (type === 'note1') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = 329.63
        gain.gain.value = 0.12 * vol
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } else if (type === 'note2') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = 440
        gain.gain.value = 0.12 * vol
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } else if (type === 'note3') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = 554.37
        gain.gain.value = 0.12 * vol
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } else if (type === 'note4') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = 659.25
        gain.gain.value = 0.12 * vol
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } else if (type === 'hit') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.15 * vol
        osc.type = 'square'
        osc.frequency.value = 200
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.12)
      } else if (type === 'score') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.08 * vol
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.15)
        haptic(5)
      } else if (type === 'levelup') {
        const notes = [523, 659, 784]
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.connect(g)
          g.connect(ctx.destination)
          o.frequency.value = freq
          o.type = 'sine'
          g.gain.value = 0.08 * vol
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2)
          o.start(ctx.currentTime + i * 0.1)
          o.stop(ctx.currentTime + i * 0.1 + 0.2)
        })
      } else if (type === 'death') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1 * vol
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.55)
        haptic([30, 50, 30, 50, 30])
      } else if (type === 'achievement') {
        const notes = [523, 659, 784, 1047, 1319]
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.connect(g)
          g.connect(ctx.destination)
          o.frequency.value = freq
          o.type = 'sine'
          g.gain.value = 0.06 * vol
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3)
          o.start(ctx.currentTime + i * 0.08)
          o.stop(ctx.currentTime + i * 0.08 + 0.3)
        })
      } else if (type === 'combo') {
        const notes = [660, 880]
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.connect(g)
          g.connect(ctx.destination)
          o.frequency.value = freq
          o.type = 'triangle'
          g.gain.value = 0.07 * vol
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.12)
          o.start(ctx.currentTime + i * 0.06)
          o.stop(ctx.currentTime + i * 0.06 + 0.12)
        })
      } else if (type === 'speedup') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.08 * vol
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(200, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.2)
      } else if (type === 'whack') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.15 * vol
        osc.type = 'square'
        osc.frequency.setValueAtTime(300, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.06)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.08)
      } else if (type === 'swoosh') {
        const bufferSize = ctx.sampleRate * 0.15
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
        }
        const noise = ctx.createBufferSource()
        noise.buffer = buffer
        const bandpass = ctx.createBiquadFilter()
        bandpass.type = 'bandpass'
        bandpass.frequency.setValueAtTime(1000, ctx.currentTime)
        bandpass.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.1)
        const g = ctx.createGain()
        g.gain.value = 0.08 * vol
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        noise.connect(bandpass)
        bandpass.connect(g)
        g.connect(ctx.destination)
        noise.start(ctx.currentTime)
        noise.stop(ctx.currentTime + 0.15)
      } else if (type.startsWith('merge-')) {
        const val = parseInt(type.split('-')[1]) || 4
        const baseFreq = 200 + Math.log2(val) * 80
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.08 * vol
        osc.type = 'sine'
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.08)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.15)
      } else if (type === 'brick') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.12 * vol
        osc.type = 'square'
        osc.frequency.value = 520
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.06)
      } else if (type === 'wall') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.08 * vol
        osc.type = 'square'
        osc.frequency.value = 220
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.08)
      } else if (type === 'paddle') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1 * vol
        osc.type = 'square'
        osc.frequency.value = 380
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.07)
      } else if (type === 'eat') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1 * vol
        osc.type = 'sine'
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.setValueAtTime(700, ctx.currentTime + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.12)
      } else if (type === 'grow') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.07 * vol
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.12)
      } else if (type === 'place') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1 * vol
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(300, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.12)
      } else if (type === 'clear') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1 * vol
        osc.type = 'sine'
        osc.frequency.setValueAtTime(300, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.25)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      } else if (type === 'wing') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.09 * vol
        osc.type = 'sine'
        osc.frequency.setValueAtTime(500, ctx.currentTime)
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.03)
        osc.frequency.setValueAtTime(500, ctx.currentTime + 0.06)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.09)
      } else if (type === 'pipe') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.07 * vol
        osc.type = 'square'
        osc.frequency.value = 180
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.07)
      } else if (type === 'dig') {
        const bufferSize = ctx.sampleRate * 0.08
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
        }
        const noise = ctx.createBufferSource()
        noise.buffer = buffer
        const bandpass = ctx.createBiquadFilter()
        bandpass.type = 'bandpass'
        bandpass.frequency.value = 2000
        bandpass.Q.value = 2
        const g = ctx.createGain()
        g.gain.value = 0.08 * vol
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        noise.connect(bandpass)
        bandpass.connect(g)
        g.connect(ctx.destination)
        noise.start(ctx.currentTime)
        noise.stop(ctx.currentTime + 0.08)
      } else if (type === 'flag') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1 * vol
        osc.type = 'square'
        osc.frequency.value = 1200
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.03)
      } else if (type === 'flip') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.09 * vol
        osc.type = 'sine'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.08)
      } else if (type === 'match') {
        const notes = [523, 659, 784]
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.connect(g)
          g.connect(ctx.destination)
          o.frequency.value = freq
          o.type = 'sine'
          g.gain.value = 0.08 * vol
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.2)
          o.start(ctx.currentTime + i * 0.06)
          o.stop(ctx.currentTime + i * 0.06 + 0.2)
        })
      } else if (type === 'place-piece') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.08 * vol
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(250, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.15)
      } else if (type === 'select') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.04 * vol
        osc.type = 'sine'
        osc.frequency.value = 660
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.05)
      } else if (type === 'navigate') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.02 * vol
        osc.type = 'sine'
        osc.frequency.value = 900
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.03)
      } else if (type === 'powerup') {
        const notes = [440, 554, 659, 880]
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.connect(g)
          g.connect(ctx.destination)
          o.frequency.value = freq
          o.type = 'sine'
          g.gain.value = 0.07 * vol
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.2)
          o.start(ctx.currentTime + i * 0.06)
          o.stop(ctx.currentTime + i * 0.06 + 0.2)
        })
      } else if (type === 'countdown') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.value = 0.1 * vol
        osc.type = 'sine'
        osc.frequency.value = 1000
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.05)
      }
    } catch (e) {}
  }, [getCtx])
}

let musicNodes = null

export function playMusic() {
  if (musicNodes) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.03
    masterGain.connect(ctx.destination)

    const oscs = [220, 221.5, 329.5, 440, 442]
    const nodes = oscs.map((freq) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.value = 0.25
      osc.connect(g)
      g.connect(masterGain)
      osc.start()
      return { osc, gain: g }
    })

    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = 'sine'
    lfo.frequency.value = 0.15
    lfoGain.gain.value = 0.008
    lfo.connect(lfoGain)
    lfoGain.connect(masterGain.gain)
    lfo.start()

    musicNodes = { ctx, masterGain, nodes, lfo, lfoGain }
  } catch (e) {}
}

export function stopMusic() {
  if (!musicNodes) return
  try {
    const { ctx, nodes, lfo, masterGain } = musicNodes
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    nodes.forEach(({ osc }) => { try { osc.stop(ctx.currentTime + 0.5) } catch {} })
    try { lfo.stop(ctx.currentTime + 0.5) } catch {}
    setTimeout(() => { try { ctx.close() } catch {} }, 600)
  } catch (e) {}
  musicNodes = null
}
