import { useState, useEffect, useRef } from 'react'
import { connectPvP, joinQueue, leaveQueue, onEvent, getSocket } from '../pvpClient'
import useSound from '../useSound'

export default function PvPMatchmaker({ gameId, userId, username, onMatchFound, onCancel }) {
  const [status, setStatus] = useState('connecting')
  const [waitTime, setWaitTime] = useState(0)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)
  const sound = useSound()

  useEffect(() => {
    const socket = connectPvP()
    if (socket?.connected) setStatus('searching')
    else setStatus('connecting')

    const unsubs = []

    unsubs.push(onEvent('connect', () => setStatus('searching')))
    unsubs.push(onEvent('disconnect', () => {
      if (status !== 'found') setError('Connection lost. Retrying...')
    }))
    unsubs.push(onEvent('connect_error', () => {
      setError('Cannot reach server. Retrying...')
    }))
    unsubs.push(onEvent('match:queued', () => {
      setError(null)
      setStatus('searching')
    }))
    unsubs.push(onEvent('match:found', (data) => {
      sound('victory')
      setStatus('found')
      if (timerRef.current) clearInterval(timerRef.current)
      setTimeout(() => onMatchFound?.(data), 1200)
    }))
    unsubs.push(onEvent('match:timeout', () => {
      setError('No opponent found. Try again!')
      setStatus('idle')
    }))

    timerRef.current = setInterval(() => {
      if (status === 'searching') setWaitTime(t => t + 1)
    }, 1000)

    joinQueue(gameId, userId || 'guest', username || 'Anonymous')

    return () => {
      unsubs.forEach(fn => fn())
      if (timerRef.current) clearInterval(timerRef.current)
      leaveQueue()
    }
  }, [gameId])

  function handleCancel() {
    leaveQueue()
    onCancel?.()
  }

  function handleRetry() {
    setError(null)
    setWaitTime(0)
    setStatus('connecting')
    connectPvP()
    setTimeout(() => joinQueue(gameId, userId || 'guest', username || 'Anonymous'), 500)
    setStatus('searching')
  }

  return (
    <div className="pvp-matchmaker">
      <div className="pvp-matchmaker-card">
        {status === 'found' ? (
          <>
            <div className="pvp-match-found-icon">⚔️</div>
            <div className="pvp-match-found-text">Match Found!</div>
            <div className="pvp-match-found-sub">Get Ready...</div>
          </>
        ) : error ? (
          <>
            <div className="pvp-match-spinner error">⚠️</div>
            <div className="pvp-match-status">{error}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="pvp-match-btn" onClick={handleRetry}>Try Again</button>
              <button className="pvp-match-btn cancel" onClick={handleCancel}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div className="pvp-match-spinner">
              <div className="pvp-match-spinner-ring" />
              <div className="pvp-match-spinner-icon">⚔️</div>
            </div>
            <div className="pvp-match-status">
              {status === 'connecting' ? 'Connecting to server...' : 'Searching for opponent...'}
            </div>
            <div className="pvp-match-timer">{waitTime}s</div>
            <button className="pvp-match-btn cancel" onClick={handleCancel}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}
