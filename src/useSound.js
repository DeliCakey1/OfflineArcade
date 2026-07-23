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
      }
    } catch (e) {}
  }, [getCtx])
}
