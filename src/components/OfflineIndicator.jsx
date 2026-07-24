import { useState, useEffect } from 'react'

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    let timer = null
    function online() {
      setOffline(false)
      setShowToast(true)
      timer = setTimeout(() => setShowToast(false), 3000)
    }
    function offline() {
      setOffline(true)
      setShowToast(true)
      timer = setTimeout(() => setShowToast(false), 5000)
    }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!showToast) return null

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
      background: offline ? 'rgba(239,68,68,0.95)' : 'rgba(34,197,94,0.95)',
      color: '#fff', borderRadius: 12, padding: '10px 20px', fontSize: 14,
      fontWeight: 600, fontFamily: 'Fredoka, sans-serif', display: 'flex', alignItems: 'center',
      gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', animation: 'slide-in-up 0.3s ease-out',
    }}>
      <span>{offline ? '📡' : '✅'}</span>
      {offline ? 'You\'re offline — games still work!' : 'Back online!'}
    </div>
  )
}
