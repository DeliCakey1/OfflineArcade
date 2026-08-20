import { useState } from 'react'
import { sendTradeOffer } from '../worldService'
import useSound from '../useSound'

const COIN_PRESETS = [0, 100, 250, 500, 1000]

export default function TradeModal({ userId, username, targetUser, onClose }) {
  const [offerCoins, setOfferCoins] = useState(0)
  const [requestCoins, setRequestCoins] = useState(0)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const sound = useSound()

  async function handleSend() {
    if (offerCoins === 0 && requestCoins === 0) { setError('Set at least one amount'); return }
    sound('confirm')
    setSending(true)
    setError('')
    try {
      const result = await sendTradeOffer(
        targetUser.id || targetUser.userId,
        { coins: offerCoins, items: [] },
        { coins: requestCoins, items: [] }
      )
      if (result.error) { setError(result.error); setSending(false); return }
      setSent(true)
      setTimeout(() => onClose?.(), 2000)
    } catch { setError('Failed to send trade') }
    setSending(false)
  }

  if (sent) {
    return (
      <div className="trade-modal-overlay" onClick={onClose}>
        <div className="trade-modal" onClick={e => e.stopPropagation()}>
          <div className="trade-sent-icon">🤝</div>
          <h2>Trade Offer Sent!</h2>
          <p>Waiting for {targetUser?.username || 'player'} to respond...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="trade-modal-overlay" onClick={onClose}>
      <div className="trade-modal" onClick={e => e.stopPropagation()}>
        <div className="trade-modal-header">
          <h2>🤝 Trade with {targetUser?.username || 'Player'}</h2>
          <button className="trade-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="trade-error">{error}</div>}

        <div className="trade-columns">
          <div className="trade-column">
            <label>You Offer</label>
            <div className="trade-coin-picker">
              {COIN_PRESETS.map(amount => (
                <button key={amount} className={`trade-coin-btn ${offerCoins === amount ? 'selected' : ''}`}
                  onClick={() => setOfferCoins(amount)}>
                  {amount === 0 ? 'None' : `${amount} 🪙`}
                </button>
              ))}
            </div>
          </div>

          <div className="trade-vs">⇄</div>

          <div className="trade-column">
            <label>You Request</label>
            <div className="trade-coin-picker">
              {COIN_PRESETS.map(amount => (
                <button key={amount} className={`trade-coin-btn ${requestCoins === amount ? 'selected' : ''}`}
                  onClick={() => setRequestCoins(amount)}>
                  {amount === 0 ? 'None' : `${amount} 🪙`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(offerCoins > 0 || requestCoins > 0) && (
          <div className="trade-summary">
            {offerCoins > 0 && <span>You give {offerCoins} 🪙</span>}
            {requestCoins > 0 && <span>You get {requestCoins} 🪙</span>}
          </div>
        )}

        <button className="trade-btn primary full-width" onClick={handleSend}
          disabled={sending || (offerCoins === 0 && requestCoins === 0)}>
          {sending ? 'Sending...' : 'Send Trade Offer'}
        </button>
      </div>
    </div>
  )
}
