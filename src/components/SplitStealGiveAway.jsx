import { useState } from 'react'
import useSound from '../useSound'

const CHOICES = [
  { name: 'Split', emoji: '✂️', desc: 'Share fairly', class: 'split' },
  { name: 'Steal', emoji: '🦹', desc: 'Take it all', class: 'steal' },
  { name: 'Give Away', emoji: '🎁', desc: 'Be generous', class: 'giveaway' },
]

const PRIZE_OPTIONS = [
  { amount: 50,   weight: 20 },
  { amount: 100,  weight: 40 },
  { amount: 200,  weight: 20 },
  { amount: 500,  weight: 8 },
  { amount: 1000, weight: 2 },
]

function pickPrize() {
  const totalWeight = PRIZE_OPTIONS.reduce((sum, o) => sum + o.weight, 0)
  let rand = Math.random() * totalWeight
  for (const opt of PRIZE_OPTIONS) {
    rand -= opt.weight
    if (rand <= 0) return opt.amount
  }
  return PRIZE_OPTIONS[0].amount
}

function getPayoffs(player, bot, prize) {
  const same = player === bot
  if (same) {
    if (player === 'Split') return { player: prize / 2, bot: prize / 2 }
    if (player === 'Steal') return { player: 0, bot: 0 }
    return { player: prize, bot: prize }
  }
  if (player === 'Split' && bot === 'Steal') return { player: 0, bot: prize }
  if (player === 'Split' && bot === 'Give Away') return { player: prize, bot: 0 }
  if (player === 'Steal' && bot === 'Split') return { player: prize, bot: 0 }
  if (player === 'Steal' && bot === 'Give Away') return { player: prize / 2, bot: prize }
  if (player === 'Give Away' && bot === 'Split') return { player: 0, bot: prize }
  if (player === 'Give Away' && bot === 'Steal') return { player: prize, bot: prize / 2 }
}

function getResultType(a, b) {
  if (a > b) return 'win'
  if (b > a) return 'lose'
  return 'draw'
}

function getMessage(result, p, b) {
  if (result === 'draw' && p === 'Give Away') return "Both generous! You both get the full prize!"
  if (result === 'draw' && p === 'Split') return "Fair split! You both get half."
  if (result === 'draw' && p === 'Steal') return "Both tried to steal! Nobody gets anything."
  if (result === 'win' && p === 'Give Away') return "Your generosity paid off!"
  if (result === 'win') return "You got the better deal!"
  if (result === 'lose' && b === 'Give Away') return "The bot's generosity cost them!"
  if (result === 'lose') return "The bot outplayed you!"
  return "It's a draw!"
}

export default function SplitStealGiveAway() {
  const [totalRounds, setTotalRounds] = useState(null)
  const [currentPrize, setCurrentPrize] = useState(100)
  const [playerChoice, setPlayerChoice] = useState(null)
  const [pendingChoice, setPendingChoice] = useState(null)
  const [botChoice, setBotChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [payoffs, setPayoffs] = useState(null)
  const [totals, setTotals] = useState({ player: 0, bot: 0 })
  const [round, setRound] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [history, setHistory] = useState([])
  const [shake, setShake] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [prizeFlash, setPrizeFlash] = useState(false)
  const sound = useSound()

  function selectChoice(choice) {
    if (animating || gameOver) return
    sound('click')
    setPendingChoice(choice)
  }

  function confirmChoice() {
    if (!pendingChoice || animating) return
    sound('confirm')
    setAnimating(true)
    setPlayerChoice(pendingChoice)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setPayoffs(null)
    setReveal(false)

    const prize = pickPrize()
    setCurrentPrize(prize)
    if (prize >= 500) {
      setPrizeFlash(true)
      setTimeout(() => setPrizeFlash(false), 600)
    }
    const botPick = CHOICES[Math.floor(Math.random() * 3)]

    setShake(true)
    let step = 0
    const interval = setInterval(() => {
      setBotChoice(CHOICES[step % 3])
      step++
      if (step > 8) {
        clearInterval(interval)
        setShake(false)
        setReveal(true)
        setBotChoice(botPick)
        const p = getPayoffs(pendingChoice.name, botPick.name, prize)
        const res = getResultType(p.player, p.bot)

        setTimeout(() => {
          setPayoffs(p)
          setResult(res)
          if (res === 'win') sound('cash')
          else if (res === 'lose') sound('lose')
          else sound('draw')

          const newTotals = {
            player: totals.player + p.player,
            bot: totals.bot + p.bot,
          }
          setTotals(newTotals)
          setRound(prev => {
            const next = prev + 1
            if (next >= totalRounds) {
              setGameOver(true)
              setTimeout(() => {
                if (newTotals.player > newTotals.bot) sound('victory')
                else if (newTotals.bot > newTotals.player) sound('defeat')
                else sound('draw')
              }, 300)
            }
            return next
          })
          setHistory(prev => [...prev.slice(-19), {
            player: pendingChoice, bot: botPick,
            playerPayoff: p.player, botPayoff: p.bot,
            prize, result: res, round: round + 1,
          }])
          setAnimating(false)
        }, 300)
      }
    }, 70)
  }

  function nextRound() {
    setPlayerChoice(null)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setPayoffs(null)
    setReveal(false)
  }

  function reset() {
    setTotalRounds(null)
    setPlayerChoice(null)
    setPendingChoice(null)
    setBotChoice(null)
    setResult(null)
    setPayoffs(null)
    setTotals({ player: 0, bot: 0 })
    setRound(0)
    setHistory([])
    setGameOver(false)
    setShake(false)
    setReveal(false)
  }

  const moneyLead = totals.player - totals.bot
  const streakType = history.length >= 2 ? history[history.length - 1].result : null
  const streakCount = history.length >= 2
    ? (() => { let c = 0; for (let i = history.length - 1; i >= 0; i--) { if (history[i].result === streakType) c++; else break } return c })()
    : 0

  if (!totalRounds) {
    return (
      <div className="game-card slide-in">
        <h2>Split Steal Give Away</h2>
        <p className="description">Your custom game! Outsmart the bot to win the prize money.</p>
        <div className="prize-display">
          <div className="prize-label">Prize Pool Changes Every Round!</div>
          <div className="prize-amount" style={{ fontSize: 16 }}>$50 · $100 · $200 · $500 · $1,000</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>$100 is most common, $1,000 is ultra rare</div>
        </div>
        <div className="round-picker">
          <div className="round-picker-label">How many rounds?</div>
          <div className="round-picker-options">
            {[5, 10, 15].map(n => (
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
        <div className="rules-box">
          <h3>Payoff Rules</h3>
          <table>
            <thead>
              <tr><th>You \ Bot</th><th>✂️ Split</th><th>🦹 Steal</th><th>🎁 Give Away</th></tr>
            </thead>
            <tbody>
              <tr>
                <th>✂️ Split</th>
                <td className="even-cell">Both half</td>
                <td><span className="loser-cell">You nothing</span><br/><span className="winner-cell">Bot full</span></td>
                <td><span className="winner-cell">You full</span><br/><span className="loser-cell">Bot nothing</span></td>
              </tr>
              <tr>
                <th>🦹 Steal</th>
                <td><span className="winner-cell">You full</span><br/><span className="loser-cell">Bot nothing</span></td>
                <td className="loser-cell">Both nothing</td>
                <td><span className="even-cell">You half</span><br/><span className="winner-cell">Bot full</span></td>
              </tr>
              <tr>
                <th>🎁 Give Away</th>
                <td><span className="loser-cell">You nothing</span><br/><span className="winner-cell">Bot full</span></td>
                <td><span className="winner-cell">You full</span><br/><span className="even-cell">Bot half</span></td>
                <td className="both-get">Both full</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Split Steal Give Away</h2>
      <p className="description">Round {round} of {totalRounds}</p>

      <div className={`prize-display ${prizeFlash ? 'prize-flash' : ''}`}>
        <div className="prize-label">This Round's Prize</div>
        <div className="prize-amount">${currentPrize.toLocaleString()}</div>
      </div>

      <div className="ssg-scoreboard">
        <div className="rps-score-side">
          <div className="rps-score-label">You</div>
          <div className="rps-score-num player">${totals.player.toLocaleString()}</div>
        </div>
        <div className="rps-score-center">
          <div className="rps-draws-label">Lead</div>
          <div className="rps-draws-num" style={{ color: moneyLead > 0 ? 'var(--neon-blue)' : moneyLead < 0 ? 'var(--neon-pink)' : 'var(--neon-yellow)' }}>
            {moneyLead > 0 ? `+$${moneyLead.toLocaleString()}` : moneyLead < 0 ? `-$${Math.abs(moneyLead).toLocaleString()}` : '$0'}
          </div>
          {streakCount >= 2 && (
            <div className={`rps-streak ${streakType}`}>
              {streakCount}x {streakType === 'win' ? 'Win Streak!' : streakType === 'lose' ? 'Loss Streak!' : 'Draws'}
            </div>
          )}
        </div>
        <div className="rps-score-side">
          <div className="rps-score-label">Bot</div>
          <div className="rps-score-num bot">${totals.bot.toLocaleString()}</div>
        </div>
      </div>

      <div className="ssg-progress-bar">
        <div className="ssg-progress-fill player" style={{ width: `${totals.player + totals.bot > 0 ? (totals.player / (totals.player + totals.bot)) * 100 : 50}%` }} />
        <div className="ssg-progress-fill bot" style={{ width: `${totals.player + totals.bot > 0 ? (totals.bot / (totals.player + totals.bot)) * 100 : 50}%` }} />
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">{totals.player > totals.bot ? '💰' : totals.bot > totals.player ? '💀' : '🤝'}</div>
          <div className={`result-text ${totals.player > totals.bot ? 'win' : totals.bot > totals.player ? 'lose' : 'draw'}`}>
            {totals.player > totals.bot ? 'You Win!' : totals.bot > totals.player ? 'Bot Wins!' : "It's a Tie!"}
          </div>
          <div className="rps-final-score">
            <span className="player">${totals.player.toLocaleString()}</span>
            <span className="sep">-</span>
            <span className="bot">${totals.bot.toLocaleString()}</span>
          </div>
          <button className="play-again-btn" onClick={reset}>Play Again</button>
        </div>
      ) : (
        <>
          <div className="rps-battle-area">
            <div className={`rps-fighter ${reveal && result === 'win' ? 'winner-glow' : ''} ${reveal && result === 'lose' ? 'loser-dim' : ''}`}>
              <div className="rps-fighter-label">You</div>
              {playerChoice ? (
                <div className={`rps-fighter-emoji ${reveal ? 'revealed' : ''}`}>{playerChoice.emoji}</div>
              ) : (
                <div className="rps-fighter-emoji placeholder">❓</div>
              )}
              {playerChoice && <div className="rps-fighter-name">{playerChoice.name}</div>}
            </div>

            <div className="rps-vs">
              {animating && shake ? (
                <div className="rps-vs-shake">⚔️</div>
              ) : reveal && result ? (
                <div className={`rps-vs-result ${result}`}>{result === 'win' ? '→' : result === 'lose' ? '←' : '='}</div>
              ) : (
                <div className="rps-vs-text">VS</div>
              )}
            </div>

            <div className={`rps-fighter ${reveal && result === 'lose' ? 'winner-glow' : ''} ${reveal && result === 'win' ? 'loser-dim' : ''}`}>
              <div className="rps-fighter-label">Bot</div>
              {botChoice ? (
                <div className={`rps-fighter-emoji ${shake ? 'shaking' : ''} ${reveal ? 'revealed' : ''}`}>{botChoice.emoji}</div>
              ) : (
                <div className="rps-fighter-emoji placeholder">❓</div>
              )}
              {botChoice && reveal && <div className="rps-fighter-name">{botChoice.name}</div>}
            </div>
          </div>

          {result && payoffs && (
            <div className="result-area-inner">
              <div className={`result-text ${result}`} style={{ fontSize: 16 }}>
                {getMessage(result, playerChoice.name, botChoice.name)}
              </div>
              <div className="winnings-display">
                <div className="winnings-item">
                  <div className="winnings-label">You got</div>
                  <div className={`winnings-amount player ${payoffs.player > 0 ? 'has-money' : ''}`}>
                    ${payoffs.player.toLocaleString()}
                  </div>
                </div>
                <div className="winnings-item">
                  <div className="winnings-label">Bot got</div>
                  <div className={`winnings-amount bot ${payoffs.bot > 0 ? 'has-money' : ''}`}>
                    ${payoffs.bot.toLocaleString()}
                  </div>
                </div>
              </div>
              <button className="play-again-btn" onClick={nextRound}>
                {round >= totalRounds ? 'See Results' : 'Next Round'}
              </button>
            </div>
          )}

          {!result && !animating && (
            <>
              <div className="ssg-choices-row">
                {CHOICES.map(c => (
                  <button key={c.name}
                    className={`choice-btn ${c.class} ${pendingChoice?.name === c.name ? 'selected' : ''}`}
                    onClick={() => selectChoice(c)} disabled={animating}>
                    <span className="choice-emoji">{c.emoji}</span>
                    <span className="choice-name">{c.name}</span>
                    <span className="choice-desc">{c.desc}</span>
                  </button>
                ))}
              </div>

              {pendingChoice && (
                <div className="confirm-area">
                  <div className="confirm-text">You picked <strong>{pendingChoice.emoji} {pendingChoice.name}</strong></div>
                  <div className="confirm-buttons">
                    <button className="confirm-btn yes" onClick={confirmChoice}>Let's Go!</button>
                    <button className="confirm-btn no" onClick={() => { sound('click'); setPendingChoice(null) }}>Change</button>
                  </div>
                </div>
              )}

              {!pendingChoice && (
                <div className="result-message">Choose your strategy!</div>
              )}
            </>
          )}

          {animating && (
            <div className="result-message">Deciding...</div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="rps-history">
          <div className="rps-history-label">Recent Rounds</div>
          <div className="rps-history-list">
            {history.slice(-8).map((h, i) => (
              <div key={i} className={`rps-history-item ${h.result}`}>
                <span className="history-round">#{h.round}</span>
                <span className="history-prize">${h.prize}</span>
                <span className="history-pick">{h.player.emoji}</span>
                <span className="history-vs">vs</span>
                <span className="history-pick">{h.bot.emoji}</span>
                <span className={`history-result ${h.result}`}>
                  {h.result === 'win' ? `+$${h.playerPayoff}` : h.result === 'lose' ? `-$${h.botPayoff}` : `$${h.playerPayoff}`}
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
