import { useState, useEffect, useCallback, useRef } from 'react'

let _listeners = []
let _queue = []
let _idCounter = 0

function notify(notification) {
  const id = ++_idCounter
  const entry = { id, ...notification, createdAt: Date.now() }
  _queue.push(entry)
  _listeners.forEach(fn => fn([..._queue]))
  return id
}

export function toast(message, type = 'info', duration = 3000) {
  return notify({ kind: 'toast', message, type, duration })
}

export function achievement(title, description, coins = 0) {
  return notify({ kind: 'achievement', title, description, coins, duration: 4000 })
}

export function eventAlert(title, message, emoji = '📢') {
  return notify({ kind: 'event', title, message, emoji, duration: 5000 })
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const timersRef = useRef({})

  useEffect(() => {
    const listener = (queue) => setNotifications([...queue])
    _listeners.push(listener)
    return () => { _listeners = _listeners.filter(l => l !== listener) }
  }, [])

  useEffect(() => {
    notifications.forEach(n => {
      if (timersRef.current[n.id]) return
      if (n.duration > 0) {
        timersRef.current[n.id] = setTimeout(() => {
          dismiss(n.id)
          delete timersRef.current[n.id]
        }, n.duration)
      }
    })
    return () => Object.values(timersRef.current).forEach(clearTimeout)
  }, [notifications])

  const dismiss = useCallback((id) => {
    _queue = _queue.filter(n => n.id !== id)
    setNotifications([..._queue])
  }, [])

  return { notifications, dismiss }
}
