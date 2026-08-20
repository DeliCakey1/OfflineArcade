import { io } from 'socket.io-client'

let socket = null
let listeners = {}

export function connectPvP() {
  if (socket?.connected) return socket
  socket = io(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socket.on('connect', () => {
    for (const cb of listeners['_connected'] || []) cb()
  })
  socket.on('disconnect', (reason) => {
    for (const cb of listeners['_disconnected'] || []) cb(reason)
  })

  return socket
}

export function disconnectPvP() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
  }
  socket = null
  listeners = {}
}

export function getSocket() {
  return socket
}

export function onEvent(event, cb) {
  if (!socket) return () => {}
  socket.on(event, cb)
  return () => socket.off(event, cb)
}

export function joinQueue(gameId, userId, username) {
  socket?.emit('match:join', { gameId, userId, username })
}

export function leaveQueue() {
  socket?.emit('match:leave')
}

export function sendPaddleMove(y) {
  socket?.emit('paddle:move', { y })
}

export function sendTypingProgress(wpm, accuracy) {
  socket?.emit('typing:progress', { wpm, accuracy })
}

export function sendTypingFinish() {
  socket?.emit('typing:finish')
}

export function sendRpsChoice(choice) {
  socket?.emit('rps:choose', { choice })
}
