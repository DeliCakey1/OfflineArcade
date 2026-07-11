import { useState, useEffect, useCallback, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎']

const PAYOUTS_3 = { '💎': 50, '⭐': 25, '🍇': 15, '🍊': 10, '🍋': 8, '🍒': 5 }
const PAYOUTS_2 = { '💎': 3, '⭐': 2 }

function getRandomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
}

function calculatePayout(reels, bet) {
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    return { multiplier: PAYOUTS_3[reels[0]], type: 'three' }
  }
  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    const matched = reels[0] === reels[1] ? reels[0] : reels[0] === reels[2] ? reels[0] : reels[1]
    const multiplier = PAYOUTS_2[matched] || 1
    return { multiplier, type: 'two' }
  }
  return { multiplier: 0, type: 'none' }
}

export default function Slots({ onPlayingChange }) {
  const [coins, setCoins] = useState(100)
  const [bet, setBet] = useState(10)
  const [reels, setReels] = useState(['❓', '❓', '❓'])
  const [spinning, setSpinning] = useState(false)
  const [stoppedReels, setStoppedReels] = useState([false, false, false])
  const [result, setResult] = useState(null)
  const [lastWin, setLastWin] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestWin, setBestWin] = useState(0)
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState(false)
  const [coinAnim, setCoinAnim] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const spinIntervals = useRef([])
  const sound = useSound()
  const { gameStats, recordGame } = useStats('slots')

  useEffect(() => {
    onPlayingChange?.(spinning)
    return () => onPlayingChange?.(false)
  }, [spinning, onPlayingChange])

  const stopReel = useCallback((index, finalSymbol) => {
    setReels(prev => {
      const next = [...prev]
      next[index] = finalSymbol
      return next
    })
    setStoppedReels(prev => {
      const next = [...prev]
      next[index] = true
      return next
    })
  }, [])

  const spin = useCallback(() => {
    if (spinning || bet < 1 || bet > coins || coins <= 0) return
    sound('confirm')
    setSpinning(true)
    setResult(null)
    setLastWin(0)
    setStoppedReels([false, false, false])
    setCoinAnim('')
    onPlayingChange?.(true)

    const newCoins = coins - bet
    setCoins(newCoins)

    const finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]

    spinIntervals.current.forEach(clearInterval)
    spinIntervals.current = []

    const spinners = [0, 1, 2].map(i => {
      return setInterval(() => {
        setReels(prev => {
          const next = [...prev]
          next[i] = getRandomSymbol()
          return next
        })
      }, 60)
    })
    spinIntervals.current = spinners

    const stopTimes = [800, 1300, 1800]
    stopTimes.forEach((time, i) => {
      setTimeout(() => {
        clearInterval(spinIntervals.current[i])
        stopReel(i, finalReels[i])
        if (i === 2) {
          setTimeout(() => {
            const { multiplier, type } = calculatePayout(finalReels, bet)
            const payout = bet * multiplier
            const newCoinsAfter = newCoins + payout

            setCoins(prev => {
              const updated = Math.max(0, prev + payout)
              return updated
            })

            if (payout > 0) {
              setResult('win')
              setLastWin(payout)
              setStreak(prev => prev + 1)
              setBestWin(prev => Math.max(prev, payout))
              setCoinAnim('win')
              if (type === 'three') sound('victory')
              else sound('cash')
            } else {
              setResult('lose')
              setStreak(0)
              setCoinAnim('lose')
              sound('lose')
            }

            setHistory(prev => [...prev.slice(-19), {
              reels: [...finalReels],
              bet,
              payout,
              won: payout > 0,
              round: prev.length + 1,
            }])

            recordGame(payout > 0, streak + (payout > 0 ? 1 : 0))

            const finalCoins = newCoinsAfter
            if (finalCoins <= 0) {
              setTimeout(() => {
                setGameOver(true)
                sound('defeat')
              }, 600)
            }

            setSpinning(false)
            onPlayingChange?.(false)
            setTimeout(() => setCoinAnim(''), 600)
          }, 200)
        }
      }, time)
    })
  }, [spinning, bet, coins, sound, stopReel, onPlayingChange, recordGame, streak])

  function reset() {
    spinIntervals.current.forEach(clearInterval)
    spinIntervals.current = []
    setCoins(100)
    setBet(10)
    setReels(['❓', '❓', '❓'])
    setSpinning(false)
    setStoppedReels([false, false, false])
    setResult(null)
    setLastWin(0)
    setStreak(0)
    setBestWin(0)
    setHistory([])
    setCopied(false)
    setCoinAnim('')
    setGameOver(false)
    onPlayingChange?.(false)
  }

  function shareResult() {
    const wins = history.filter(h => h.won).length
    const totalPayout = history.reduce((s, h) => s + h.payout, 0)
    const lines = [
      `🎰 Slot Machine Results`,
      `💰 Started with 100, ended with ${coins} coins`,
      `📊 ${wins}/${history.length} spins won | Best win: $${bestWin} | Best streak: ${streak}`,
      ``,
      `Spin history:`,
      ...history.map(h => `  #${h.round}: ${h.reels.join(' ')} → ${h.won ? `+$${h.payout}` : `-$${h.bet}`}`),
      ``,
      `🎮 Offline Arcade`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (gameOver) {
    return (
      <div className="game-card slide-in">
        <h2>Slot Machine</h2>
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">🎰</div>
          <div className="result-text lose">Out of Coins!</div>
          <div className="result-message">
            You had {history.length} spins with {history.filter(h => h.won).length} wins
          </div>
          <div className="result-message">
            Best win: ${bestWin}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={reset}>Play Again (100 coins)</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={reset} className="quit-btn">New Game</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Slot Machine</h2>
      <p className="description">Spin the reels and try your luck!</p>

      <div className="slots-stats">
        <div className="slots-stat">
          <div className="slots-stat-label">Coins</div>
          <div className={`slots-stat-num coins ${coinAnim === 'win' ? 'bounce-win' : coinAnim === 'lose' ? 'bounce-lose' : ''}`}>
            💰 {coins}
          </div>
        </div>
        <div className="slots-stat">
          <div className="slots-stat-label">Streak</div>
          <div className={`slots-stat-num ${streak >= 3 ? 'streak-fire' : ''}`}>
            🔥 {streak}
          </div>
        </div>
        <div className="slots-stat">
          <div className="slots-stat-label">Best Win</div>
          <div className="slots-stat-num best">⭐ {bestWin}</div>
        </div>
      </div>

      <div className="slots-reels-container">
        <div className="slots-reels">
          {reels.map((symbol, i) => (
            <div key={i} className={`slots-reel ${spinning && !stoppedReels[i] ? 'spinning' : ''} ${stoppedReels[i] && result ? (result === 'win' ? 'reel-win' : 'reel-lose') : ''}`}>
              <div className="slots-reel-inner">
                {spinning && !stoppedReels[i] ? (
                  <div className="slots-reel-cycling">{getRandomSymbol()}</div>
                ) : (
                  <span className="slots-reel-symbol">{symbol}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {result && (
        <div className="result-area-inner">
          <div className={`result-text ${result === 'win' ? 'win' : 'lose'}`}>
            {result === 'win' ? `Won $${lastWin}!` : 'No match!'}
          </div>
          {result === 'win' && lastWin >= bet * 5 && (
            <div className="result-message">🎯 Big Win!</div>
          )}
        </div>
      )}

      <div className="slots-controls">
        <div className="slots-bet-area">
          <div className="slots-bet-label">BET</div>
          <div className="slots-bet-buttons">
            <button className="slots-bet-btn" onClick={() => { sound('click'); setBet(Math.max(1, bet - 5)) }} disabled={spinning}>-</button>
            <input
              type="number"
              className="slots-bet-input"
              value={bet}
              min={1}
              max={coins}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v >= 1 && v <= coins) setBet(v)
              }}
              disabled={spinning}
            />
            <button className="slots-bet-btn" onClick={() => { sound('click'); setBet(Math.min(coins, bet + 5)) }} disabled={spinning}>+</button>
          </div>
          <div className="slots-bet-presets">
            {[5, 10, 25, 50].map(amount => (
              <button key={amount} className={`slots-preset-btn ${bet === amount ? 'active' : ''}`}
                onClick={() => { if (amount <= coins) { sound('click'); setBet(amount) } }}
                disabled={spinning || amount > coins}>
                ${amount}
              </button>
            ))}
          </div>
        </div>

        <button
          className={`slots-spin-btn ${spinning ? 'spinning' : ''}`}
          onClick={spin}
          disabled={spinning || bet < 1 || bet > coins || coins <= 0}
        >
          {spinning ? '🎰 Spinning...' : '🎰 SPIN'}
        </button>
      </div>

      <div className="slots-payouts">
        <div className="slots-payouts-title">Payouts</div>
        <div className="slots-payouts-grid">
          {Object.entries(PAYOUTS_3).map(([sym, mult]) => (
            <div key={sym} className="slots-payout-row">
              <span className="slots-payout-sym">{sym}×3</span>
              <span className="slots-payout-mult">{mult}x</span>
            </div>
          ))}
          <div className="slots-payout-divider" />
          <div className="slots-payout-row">
            <span className="slots-payout-sym">💎×2</span>
            <span className="slots-payout-mult">3x</span>
          </div>
          <div className="slots-payout-row">
            <span className="slots-payout-sym">⭐×2</span>
            <span className="slots-payout-mult">2x</span>
          </div>
          <div className="slots-payout-row">
            <span className="slots-payout-sym">Any×2</span>
            <span className="slots-payout-mult">1x</span>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="rps-history">
          <div className="rps-history-label">Spin History</div>
          <div className="rps-history-list">
            {history.slice(-10).map((h, i) => (
              <div key={i} className={`rps-history-item ${h.won ? 'win' : 'lose'}`}>
                <span className="history-round">#{h.round}</span>
                <span className="history-pick">{h.reels.join(' ')}</span>
                <span className={`history-result ${h.won ? 'win' : 'lose'}`}>
                  {h.won ? `+$${h.payout}` : `-$${h.bet}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <button className="play-again-btn share-btn" onClick={shareResult}>
            {copied ? '✓ Copied!' : '📋 Copy Result'}
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={reset} className="quit-btn">
          {gameOver ? 'New Game' : 'Quit Game'}
        </button>
      </div>

      <style>{`
        .slots-stats {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 20px;
        }
        .slots-stat {
          text-align: center;
        }
        .slots-stat-label {
          font-size: 11px;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .slots-stat-num {
          font-family: 'Press Start 2P', monospace;
          font-size: 16px;
          color: var(--neon-yellow);
          transition: all 0.3s ease;
        }
        .slots-stat-num.best {
          color: var(--neon-green);
        }
        .slots-stat-num.streak-fire {
          color: var(--neon-orange);
          animation: streakPulse 0.6s ease infinite alternate;
        }
        .slots-stat-num.bounce-win {
          animation: moneyPop 0.5s ease;
          color: var(--neon-green);
        }
        .slots-stat-num.bounce-lose {
          animation: moneyPop 0.5s ease;
          color: var(--neon-pink);
        }
        .slots-reels-container {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 16px;
          border: 2px solid var(--border-glass);
        }
        .slots-reels {
          display: flex;
          gap: 12px;
        }
        .slots-reel {
          width: 100px;
          height: 100px;
          background: var(--bg-glass);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          border: 2px solid var(--border-glass);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .slots-reel.spinning {
          border-color: var(--neon-purple);
          box-shadow: 0 0 16px rgba(185, 70, 255, 0.3);
        }
        .slots-reel.reel-win {
          border-color: var(--neon-green);
          box-shadow: 0 0 20px rgba(57, 255, 20, 0.4);
          animation: popIn 0.3s ease;
        }
        .slots-reel.reel-lose {
          border-color: var(--neon-pink);
          opacity: 0.6;
        }
        .slots-reel-inner {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .slots-reel-symbol {
          font-size: 48px;
          animation: popIn 0.3s ease;
        }
        .slots-reel-cycling {
          font-size: 48px;
          animation: cycleBlur 0.06s linear infinite;
        }
        @keyframes cycleBlur {
          0% { filter: blur(0px); transform: translateY(-2px); }
          50% { filter: blur(1px); transform: translateY(2px); }
          100% { filter: blur(0px); transform: translateY(-2px); }
        }
        .slots-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .slots-bet-area {
          text-align: center;
        }
        .slots-bet-label {
          font-size: 11px;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .slots-bet-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          justify-content: center;
        }
        .slots-bet-btn {
          font-family: 'Fredoka', sans-serif;
          font-size: 18px;
          font-weight: 700;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid var(--border-glass);
          background: var(--bg-glass);
          backdrop-filter: blur(8px);
          color: var(--text-light);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .slots-bet-btn:hover:not(:disabled) {
          border-color: var(--neon-purple);
          transform: scale(1.1);
        }
        .slots-bet-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .slots-bet-input {
          font-family: 'Press Start 2P', monospace;
          font-size: 18px;
          width: 80px;
          padding: 8px;
          border: 2px solid var(--border-glass);
          border-radius: 10px;
          background: var(--bg-glass);
          backdrop-filter: blur(8px);
          color: var(--neon-yellow);
          text-align: center;
          outline: none;
          -moz-appearance: textfield;
        }
        .slots-bet-input::-webkit-outer-spin-button,
        .slots-bet-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .slots-bet-input:focus {
          border-color: var(--neon-purple);
          box-shadow: 0 0 12px rgba(185, 70, 255, 0.3);
        }
        .slots-bet-input:disabled {
          opacity: 0.5;
        }
        .slots-bet-presets {
          display: flex;
          gap: 6px;
          justify-content: center;
        }
        .slots-preset-btn {
          font-family: 'Fredoka', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid var(--border-glass);
          background: var(--bg-glass);
          backdrop-filter: blur(8px);
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .slots-preset-btn:hover:not(:disabled) {
          border-color: var(--neon-purple);
          color: var(--text-light);
        }
        .slots-preset-btn.active {
          border-color: var(--neon-purple);
          background: rgba(185, 70, 255, 0.15);
          color: var(--neon-purple);
        }
        .slots-preset-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .slots-spin-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 18px;
          padding: 16px 48px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--neon-pink), var(--neon-purple));
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(255, 45, 123, 0.3);
        }
        .slots-spin-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 6px 28px rgba(255, 45, 123, 0.5);
        }
        .slots-spin-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .slots-spin-btn.spinning {
          animation: spinPulse 0.5s ease infinite alternate;
        }
        @keyframes spinPulse {
          from { box-shadow: 0 4px 20px rgba(185, 70, 255, 0.4); }
          to { box-shadow: 0 6px 30px rgba(185, 70, 255, 0.7); }
        }
        .slots-payouts {
          margin-top: 8px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          border: 1px solid var(--border-glass);
        }
        .slots-payouts-title {
          font-size: 11px;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          text-align: center;
        }
        .slots-payouts-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          justify-content: center;
        }
        .slots-payout-row {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
        }
        .slots-payout-sym {
          color: var(--text-dim);
        }
        .slots-payout-mult {
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          color: var(--neon-yellow);
        }
        .slots-payout-divider {
          width: 100%;
          height: 1px;
          background: var(--border-glass);
          margin: 4px 0;
        }
      `}</style>
    </div>
  )
}
