import { useState, useEffect } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'

const ROUND_OPTIONS = [5, 10, 15]
const RANGE_OPTIONS = [
  { label: '2-4', min: 2, max: 4 },
  { label: '5-7', min: 5, max: 7 },
  { label: '8-10', min: 8, max: 10 },
  { label: '11-12', min: 11, max: 12 },
]
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

function rollDice() {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
}

export default function DiceRoll({ onPlayingChange }) {
  const [totalRounds, setTotalRounds] = useState(null)
  const [bet, setBet] = useState(100)
  const [mode, setMode] = useState(null) // 'exact' | 'range' | 'parity'
  const [pendingPick, setPendingPick] = useState(null)
  const [dice, setDice] = useState(null)
  const [result, setResult] = useState(null) // 'win' | 'lose' | null
  const [totalWinnings, setTotalWinnings] = useState(0)
  const [round, setRound] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [shake, setShake] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState(false)
  const sound = useSound()
  const { recordGame } = useStats('dice')

  useEffect(() => {
    const playing = Boolean(mode && totalRounds)
    onPlayingChange?.(playing)
    return () => onPlayingChange?.(false)
  }, [mode, totalRounds, onPlayingChange])

  function getMultiplier() {
    if (mode === 'exact') return 5
    if (mode === 'range') return 2
    return 1
  }

  function checkWin(total) {
    if (mode === 'exact') return total === pendingPick
    if (mode === 'range') return total >= pendingPick.min && total <= pendingPick.max
    if (mode === 'parity') return (total % 2 === 0) === pendingPick
    return false
  }

  function confirmPick() {
    if (!pendingPick || animating || gameOver) return
    sound('confirm')
    setAnimating(true)
    setPendingPick(null)
    setDice(null)
    setResult(null)
    setReveal(false)
    setShake(true)

    const d = rollDice()

    let step = 0
    const interval = setInterval(() => {
      setDice(rollDice())
      step++
      if (step > 8) {
        clearInterval(interval)
        setShake(false)
        setReveal(true)
        setDice(d)

        const total = d[0] + d[1]
        const won = checkWin(total)
        const mult = getMultiplier()
        const payout = won ? bet * mult : -bet

        setTimeout(() => {
          setResult(won ? 'win' : 'lose')
          setTotalWinnings(prev => prev + payout)

          if (won) sound('cash')
          else sound('lose')

          const newRound = round + 1
          setRound(newRound)
          setHistory(prev => [...prev.slice(-14), {
            dice: d, total, pick: pendingPick, won, payout, round: newRound, mode, bet,
          }])

          if (newRound >= totalRounds) {
            setGameOver(true)
            const finalTotal = totalWinnings + payout
            recordGame(finalTotal > 0, 0)
            if (finalTotal > 0) setTimeout(() => sound('victory'), 300)
            else setTimeout(() => sound('defeat'), 300)
          }

          setAnimating(false)
        }, 300)
      }
    }, 60)
  }

  function nextRound() {
    setDice(null)
    setResult(null)
    setPendingPick(null)
    setReveal(false)
  }

  function reset() {
    setTotalRounds(null)
    setBet(100)
    setMode(null)
    setPendingPick(null)
    setDice(null)
    setResult(null)
    setTotalWinnings(0)
    setRound(0)
    setHistory([])
    setGameOver(false)
    setShake(false)
    setReveal(false)
    setCopied(false)
  }

  function shareResult() {
    const modeLabel = mode === 'exact' ? 'Exact' : mode === 'range' ? 'Range' : 'Parity'
    const wins = history.filter(h => h.won).length
    const lines = [
      `🎲 Beat the bot at Dice Roll (${modeLabel})!`,
      `📊 ${wins}/${totalRounds} rounds won | 💰 Net: $${totalWinnings >= 0 ? '+' : ''}${totalWinnings.toLocaleString()}`,
      ``,
      `Round history:`,
      ...history.map(h => `  #${h.round}: Bet $${h.bet} on ${typeof h.pick === 'object' ? h.pick.label : h.pick === true ? 'Even' : h.pick === false ? 'Odd' : h.pick} → 🎲${h.dice[0]}+${h.dice[1]}=${h.total} ${h.won ? `+$${h.payout}` : `-$${Math.abs(h.payout)}`}`),
      ``,
      `🎮 Offline Arcade`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Mode selection
  if (!mode) {
    return (
      <div className="game-card slide-in">
        <h2>Dice Roll</h2>
        <p className="description">Roll the dice and bet on the outcome! Pick your style:</p>
        <div className="gtn-mode-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button className="gtn-mode-card" style={{ '--mode-color': '#b946ff' }}
            onClick={() => { sound('click'); setMode('exact') }}>
            <div className="gtn-mode-emoji">🎯</div>
            <div className="gtn-mode-name">Exact</div>
            <div className="gtn-mode-attempts">Pick exact number (5x payout)</div>
          </button>
          <button className="gtn-mode-card" style={{ '--mode-color': '#3b82f6' }}
            onClick={() => { sound('click'); setMode('range') }}>
            <div className="gtn-mode-emoji">📊</div>
            <div className="gtn-mode-name">Range</div>
            <div className="gtn-mode-attempts">Pick a range (2x payout)</div>
          </button>
          <button className="gtn-mode-card" style={{ '--mode-color': '#22c55e' }}
            onClick={() => { sound('click'); setMode('parity') }}>
            <div className="gtn-mode-emoji">⚖️</div>
            <div className="gtn-mode-name">Parity</div>
            <div className="gtn-mode-attempts">Odd or Even (1x payout)</div>
          </button>
        </div>
      </div>
    )
  }

  // Round selection
  if (!totalRounds) {
    return (
      <div className="game-card slide-in">
        <h2>Dice Roll — {mode === 'exact' ? 'Exact' : mode === 'range' ? 'Range' : 'Parity'}</h2>
        <p className="description">How many rounds?</p>
        <div className="round-picker">
          <div className="round-picker-options">
            {ROUND_OPTIONS.map(n => (
              <button key={n} className="round-picker-btn" onClick={() => { sound('click'); setTotalRounds(n) }}>
                {n} Rounds
              </button>
            ))}
          </div>
          <div className="custom-target-row">
            <span className="custom-target-label">or type a number (max 100):</span>
            <input type="number" min="1" max="100" className="custom-target-input" placeholder="1-100"
              onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseInt(e.target.value); if (v >= 1 && v <= 100) { sound('click'); setTotalRounds(v) } } }} />
            <button className="custom-target-go"
              onClick={(e) => { const v = parseInt(e.target.closest('.custom-target-row').querySelector('input').value); if (v >= 1 && v <= 100) { sound('click'); setTotalRounds(v) } }}>
              Go
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => setMode(null)} className="quit-btn">← Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Dice Roll — {mode === 'exact' ? 'Exact' : mode === 'range' ? 'Range' : 'Parity'}</h2>
      <p className="description">Round {round} of {totalRounds}</p>

      <div className="dice-scoreboard">
        <div className="dice-wallet">
          <div className="dice-wallet-label">Net Winnings</div>
          <div className={`dice-wallet-amount ${totalWinnings >= 0 ? 'positive' : 'negative'}`}>
            {totalWinnings >= 0 ? '+' : ''}{totalWinnings.toLocaleString()}
          </div>
        </div>
        <div className="dice-bet-area">
          <div className="dice-bet-label">Bet</div>
          <div className="dice-bet-amount">${bet.toLocaleString()}</div>
        </div>
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{totalWinnings > 0 ? '🎲' : '💀'}</div>
          <div className={`result-text ${totalWinnings > 0 ? 'win' : 'lose'}`}>
            {totalWinnings > 0 ? 'You Won!' : 'You Lost!'}
          </div>
          <div className="rps-final-score">
            <span className={`player ${totalWinnings >= 0 ? '' : 'lose'}`}>
              {totalWinnings >= 0 ? '+' : ''}${totalWinnings.toLocaleString()}
            </span>
          </div>
          <div className="result-message">
            {history.filter(h => h.won).length}/{totalRounds} rounds won
          </div>
          <div className="gtn-all-guesses">
            {history.map((h, i) => (
              <span key={i} className={`gtn-final-guess ${h.won ? 'higher' : 'lower'}`}>
                {h.dice[0]}{h.dice[1]}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={reset}>Play Again</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dice-area">
            <div className={`dice-pair ${shake ? 'shaking' : ''}`}>
              {dice ? (
                <>
                  <div className={`dice ${reveal ? 'revealed' : ''}`}>{DICE_FACES[dice[0] - 1]}</div>
                  <div className={`dice ${reveal ? 'revealed' : ''}`}>{DICE_FACES[dice[1] - 1]}</div>
                </>
              ) : (
                <>
                  <div className="dice placeholder">?</div>
                  <div className="dice placeholder">?</div>
                </>
              )}
            </div>
            {reveal && dice && (
              <div className={`dice-total ${result === 'win' ? 'win' : result === 'lose' ? 'lose' : ''}`}>
                Total: {dice[0] + dice[1]}
              </div>
            )}
          </div>

          {result && (
            <div className="result-area-inner">
              <div className={`result-text ${result}`} style={{ fontSize: 16 }}>
                {result === 'win'
                  ? `You won $${(bet * getMultiplier()).toLocaleString()}!`
                  : `You lost $${bet.toLocaleString()}!`
                }
              </div>
              <button className="play-again-btn" onClick={round >= totalRounds ? undefined : nextRound}>
                {round >= totalRounds ? 'See Results' : 'Next Round'}
              </button>
            </div>
          )}

          {!result && !animating && (
            <>
              {mode === 'exact' && (
                <div className="dice-pick-grid">
                  {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <button key={n}
                      className={`dice-pick-btn ${pendingPick === n ? 'selected' : ''}`}
                      onClick={() => { sound('click'); setPendingPick(n) }}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'range' && (
                <div className="dice-pick-grid range">
                  {RANGE_OPTIONS.map(r => (
                    <button key={r.label}
                      className={`dice-pick-btn range ${pendingPick?.label === r.label ? 'selected' : ''}`}
                      onClick={() => { sound('click'); setPendingPick(r) }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'parity' && (
                <div className="dice-pick-grid parity">
                  <button className={`dice-pick-btn parity odd ${pendingPick === false ? 'selected' : ''}`}
                    onClick={() => { sound('click'); setPendingPick(false) }}>
                    ⚡ Odd
                  </button>
                  <button className={`dice-pick-btn parity even ${pendingPick === true ? 'selected' : ''}`}
                    onClick={() => { sound('click'); setPendingPick(true) }}>
                    ⚖️ Even
                  </button>
                </div>
              )}

              {pendingPick && (
                <div className="confirm-area">
                  <div className="confirm-text">
                    You picked <strong>{mode === 'exact' ? pendingPick : mode === 'range' ? pendingPick.label : pendingPick ? 'Even' : 'Odd'}</strong>
                  </div>
                  <div className="confirm-buttons">
                    <button className="confirm-btn yes" onClick={confirmPick}>Roll!</button>
                    <button className="confirm-btn no" onClick={() => { sound('click'); setPendingPick(null) }}>Change</button>
                  </div>
                </div>
              )}

              {!pendingPick && (
                <div className="result-message">Pick your prediction!</div>
              )}
            </>
          )}

          {animating && (
            <div className="result-message">Rolling...</div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="rps-history">
          <div className="rps-history-label">Round History</div>
          <div className="rps-history-list">
            {history.slice(-8).map((h, i) => (
              <div key={i} className={`rps-history-item ${h.won ? 'win' : 'lose'}`}>
                <span className="history-round">#{h.round}</span>
                <span className="history-prize">${h.bet}</span>
                <span className="history-pick">🎲{h.dice[0]}{h.dice[1]}</span>
                <span className={`history-result ${h.won ? 'win' : 'lose'}`}>
                  {h.won ? `+$${h.payout}` : `-$${Math.abs(h.payout)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={reset} className="quit-btn">
          {gameOver ? 'New Game' : 'Quit Game'}
        </button>
      </div>
    </div>
  )
}
