import { useState, useEffect, useRef } from 'react'

export default function QuitConfirmButton({ onQuit, gameOver, className }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const cancelRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!showConfirm) return
    previousFocus.current = document.activeElement
    cancelRef.current?.focus()
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowConfirm(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      previousFocus.current?.focus()
    }
  }, [showConfirm])

  if (gameOver) {
    return <button onClick={onQuit} className={className}>New Game</button>
  }

  return (
    <>
      <button onClick={() => setShowConfirm(true)} className={className}>Quit Game</button>
      {showConfirm && (
        <div className="stats-overlay" onClick={() => setShowConfirm(false)}>
          <div className="stats-modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="quit-dialog-title" onClick={e => e.stopPropagation()}>
            <h2 className="stats-title" id="quit-dialog-title">Quit Game?</h2>
            <p className="confirm-modal-text">Your progress in this game will be lost.</p>
            <div className="confirm-buttons">
              <button className="confirm-btn yes" onClick={onQuit}>Quit</button>
              <button className="confirm-btn no" ref={cancelRef} onClick={() => setShowConfirm(false)}>Stay</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
