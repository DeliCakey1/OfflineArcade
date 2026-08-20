import { useState, useEffect } from 'react'
import { acceptTrade, declineTrade } from '../worldService'
import useSound from '../useSound'

export default function TradeNotification({ trades, onAccepted, onDeclined }) {
  const [countdowns, setCountdowns] = useState({})
  const sound = useSound()

  useEffect(() => {
    if (!trades || trades.length === 0) return
    setCountdowns(prev => {
      const next = { ...prev }
      trades.forEach(t => { next[t.id] = Math.max(0, Math.floor((t.expiresAt - Date.now()) / 1000)) })
      return next
    })
  }, [trades])

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const next = { ...prev }
        let changed = false
        for (const id in next) { if (next[id] > 0) { next[id]--; changed = true } }
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleAccept(tradeId) {
    sound('win')
    const result = await acceptTrade(tradeId)
    if (result.success) onAccepted?.(result)
  }

  async function handleDecline(tradeId) {
    sound('click')
    await declineTrade(tradeId)
    onDeclined?.(tradeId)
  }

  if (!trades || trades.length === 0) return null

  return (
    <div className="trade-notifications">
      {trades.map(t => {
        const remaining = countdowns[t.id] ?? 30
        return (
          <div key={t.id} className="trade-notification">
            <div className="trade-notif-header">
              <span className="trade-notif-icon">🤝</span>
              <div className="trade-notif-info">
                <span className="trade-notif-from">{t.from?.username || 'Someone'}</span>
                <span className="trade-notif-action">wants to trade!</span>
              </div>
            </div>
            <div className="trade-notif-details">
              {t.offer?.coins > 0 && <span>Offers {t.offer.coins} 🪙</span>}
              {t.request?.coins > 0 && <span>Wants {t.request.coins} 🪙</span>}
            </div>
            <div className="trade-notif-actions">
              <button className="space-btn small primary" onClick={() => handleAccept(t.id)}>Accept</button>
              <button className="space-btn small" onClick={() => handleDecline(t.id)}>Decline</button>
              <span className="trade-notif-timer">{remaining}s</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
