import { useState, useEffect } from 'react'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('arcade-install-dismissed')
    if (dismissed) return

    function handler(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !deferredPrompt) return null

  async function install() {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
    if (outcome === 'accepted') localStorage.setItem('arcade-install-dismissed', 'true')
  }

  function dismiss() {
    setVisible(false)
    localStorage.setItem('arcade-install-dismissed', 'true')
  }

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
      background: 'linear-gradient(135deg, var(--accent, #8b5cf6), var(--accent2, #3b82f6))',
      color: '#fff', borderRadius: 16, padding: '14px 24px', display: 'flex', alignItems: 'center',
      gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: 'calc(100vw - 32px)',
      animation: 'slide-in-up 0.4s ease-out', fontFamily: 'Fredoka, sans-serif', fontWeight: 500,
    }}>
      <span style={{ fontSize: 28 }}>📱</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Install Offline Arcade</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Play 29 games offline anytime!</div>
      </div>
      <button onClick={install} style={{
        background: '#fff', color: 'var(--accent, #8b5cf6)', border: 'none', borderRadius: 10,
        padding: '8px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>Install</button>
      <button onClick={dismiss} style={{
        background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: 20,
        cursor: 'pointer', padding: '0 4px', lineHeight: 1,
      }}>×</button>
    </div>
  )
}
