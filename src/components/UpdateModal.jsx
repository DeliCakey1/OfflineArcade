import { useRef, useEffect } from 'react'

export default function UpdateModal({ status, error, onInstall, onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && status !== 'downloaded' && status !== 'uptodate') return
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [status, onClose])

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current && status !== 'downloaded') return
    if (e.target === overlayRef.current) onClose?.()
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal-box" style={{ maxWidth: 400, textAlign: 'center' }}>
        {status === 'checking' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
            <h3 style={{ margin: '0 0 8px' }}>Checking for Updates</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Looking for a new version...</p>
          </>
        )}
        {status === 'available' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📥</div>
            <h3 style={{ margin: '0 0 8px' }}>Update Available</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Downloading the latest version...</p>
            <div className="loading-spinner" style={{ margin: '12px auto' }} />
          </>
        )}
        {status === 'downloaded' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: '0 0 8px' }}>Update Ready</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
              A new version has been downloaded. Install now to apply the update.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="confirm-btn yes" onClick={onInstall}>
                Install Now
              </button>
              <button className="confirm-btn no" onClick={onClose}>
                Later
              </button>
            </div>
          </>
        )}
        {status === 'uptodate' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👍</div>
            <h3 style={{ margin: '0 0 8px' }}>You're Up to Date</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
              You have the latest version installed.
            </p>
            <button className="confirm-btn yes" onClick={onClose}>
              OK
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px' }}>Update Check Failed</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
              {error || 'Could not check for updates. Make sure you have an internet connection.'}
            </p>
            <button className="confirm-btn yes" onClick={onClose}>
              OK
            </button>
          </>
        )}
      </div>
    </div>
  )
}
