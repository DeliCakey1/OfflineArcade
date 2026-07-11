import { useState } from 'react'

export default function QuitConfirmButton({ onQuit, gameOver, className }) {
  const [showConfirm, setShowConfirm] = useState(false)

  if (gameOver) {
    return <button onClick={onQuit} className={className}>New Game</button>
  }

  return (
    <>
      <button onClick={() => setShowConfirm(true)} className={className}>Quit Game</button>
      {showConfirm && (
        <div className="stats-overlay" onClick={() => setShowConfirm(false)}>
          <div className="stats-modal confirm-modal" onClick={e => e.stopPropagation()}>
            <h2 className="stats-title">Quit Game?</h2>
            <p className="confirm-modal-text">Your progress in this game will be lost.</p>
            <div className="confirm-buttons">
              <button className="confirm-btn yes" onClick={onQuit}>Quit</button>
              <button className="confirm-btn no" onClick={() => setShowConfirm(false)}>Stay</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
