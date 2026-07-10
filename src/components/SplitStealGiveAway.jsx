import { useState } from 'react'
import useSound from '../useSound'

const CHOICES = [
  { name: 'Split', emoji: '✂️', desc: 'Share fairly', class: 'split' },
  { name: 'Steal', emoji: '🦹', desc: 'Take it all', class: 'steal' },
  { name: 'Give Away', emoji: '🎁', desc: 'Be generous', class: 'giveaway' },
]

const PRIZE = 1000

function getPayoffs(player, bot) {
  const same = player === bot
  if (same) {
    if (player === 'Split') return { player: PRIZE / 2, bot: PRIZE / 2 }
    if (player === 'Steal') return { player: 0, bot: 0 }
    return { player: PRIZE, bot: PRIZE }
  }

  if (player === 'Split' && bot === 'Steal') return { player: 0, bot: PRIZE }
  if (player === 'Split' && bot === 'Give Away') return { player: PRIZE, bot: 0 }
  if (player === 'Steal' && bot === 'Split') return { player: PRIZE, bot: 0 }
  if (player === 'Steal' && bot === 'Give Away') return { player: PRIZE / 2, bot: PRIZE }
  if (player === 'Give Away' && bot === 'Split') return { player: 0, bot: PRIZE }
  if (player === 'Give Away' && bot === 'Steal') return { player: PRIZE, bot: PRIZE / 2 }
}

function getResultType(playerWin, botWin) {
  if (playerWin > botWin) return 'win'
  if (botWin > playerWin) return 'lose'
  return 'draw'
}

function getMessage(result, playerChoice, botChoice) {
  if (result === 'draw' && playerChoice === 'Give Away') return "Both generous! You both get the full prize!"
  if (result === 'draw' && playerChoice === 'Split') return "Fair split! You both get half."
  if (result === 'draw' && playerChoice === 'Steal') return "Both tried to steal! Nobody gets anything."
  if (result === 'win' && playerChoice === 'Give Away') return "Your generosity paid off!"
  if (result === 'win') return "You got the better deal!"
  if (result === 'lose' && botChoice === 'Give Away') return "The bot's generosity cost them!"
  if (result === 'lose') return "The bot outplayed you!"
  return "It's a draw!"
}

export default function SplitStealGiveAway() {
  const [totalRounds, setTotalRounds] = useState(null)
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
  const sound = useSound()

  if (!totalRounds) {
    return (
      <div className="game-card">
        <h2>Split Steal Give Away</h2>
        <p className="description">Your custom game! Outsmart the bot to win the prize money.</p>

        <div className="prize-display">
          <div className="prize-label">Prize Pool Per Round</div>
          <div className="prize-amount">${PRIZE.toLocaleString()}</div>
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
            <input
              type="number"
              min="1"
              max="100"
              className="custom-target-input"
              placeholder="1-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = parseInt(e.target.value)
                  if (v >= 1 && v <= 100) { sound('click'); setTotalRounds(v) }
                }
              }}
            />
            <button
              className="custom-target-go"
              onClick={(e) => {
                const input = e.target.closest('.custom-target-row').querySelector('input')
                const v = parseInt(input.value)
                if (v >= 1 && v <= 100) { sound('click'); setTotalRounds(v) }
              }}
            >
              Go
            </button>
          </div>
        </div>

        <div className="rules-box">
          <h3>Payoff Rules</h3>
          <table>
            <thead>
              <tr>
                <th>You \ Bot</th>
                <th>✂️ Split</th>
                <th>🦹 Steal</th>
                <th>🎁 Give Away</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>✂️ Split</th>
                <td className="even-cell">Both $500</td>
                <td><span className="loser-cell">You $0</span><br/><span className="winner-cell">Bot $1K</span></td>
                <td><span className="winner-cell">You $1K</span><br/><span className="loser-cell">Bot $0</span></td>
              </tr>
              <tr>
                <th>🦹 Steal</th>
                <td><span className="winner-cell">You $1K</span><br/><span className="loser-cell">Bot $0</span></td>
                <td className="loser-cell">Both $0</td>
                <td><span className="even-cell">You $500</span><br/><span className="winner-cell">Bot $1K</span></td>
              </tr>
              <tr>
                <th>🎁 Give Away</th>
                <td><span className="loser-cell">You $0</span><br/><span className="winner-cell">Bot $1K</span></td>
                <td><span className="winner-cell">You $1K</span><br/><span className="even-cell">Bot $500</span></td>
                <td className="both-get">Both $1K</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

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
        const p = getPayoffs(pendingChoice.name, botPick.name)
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
            player: pendingChoice,
            bot: botPick,
            playerPayoff: p.player,
            botPayoff: p.bot,
            result: res,
            round: round + 1,
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
  const leadPercent = totalRounds > 0 ? (round / totalRounds) * 100 : 0

  const streakType = history.length >= 2 ? history[history.length - 1].result : null
  const streakCount = history.length >= 2
    ? (() => {
        let count = 0
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].result === streakType) count++
          else break
        }
        return count
      })()
    : 0

  return (
    <div className="game-card">
      <h2>Split Steal Give Away</h2>
      <p className="description">Round {round} of {totalRounds}</p>

      <div className="prize-display">
        <div className="prize-label">Prize Pool</div>
        <div className="prize-amount">${PRIZE.toLocaleString()}</div>
      </div>

      <div className="ssg-scoreboard">
        <div className="rps-score-side player-side">
          <div className="rps-score-label">You</div>
          <div className="rps-score-num player">${totals.player.toLocaleString()}</div>
        </div>

        <div className="rps-score-center">
          <div className="rps-draws-label">Lead</div>
          <div className={`rps-draws-num ${moneyLead > 0 ? 'player' : moneyLead < 0 ? 'bot' : ''}`} style={{ color: moneyLead > 0 ? 'var(--neon-blue)' : moneyLead < 0 ? 'var(--neon-pink)' : 'var(--neon-yellow)' }}>
            {moneyLead > 0 ? `+$${moneyLead.toLocaleString()}` : moneyLead < 0 ? `-$${Math.abs(moneyLead).toLocaleString()}` : '$0'}
          </div>
          {streakCount >= 2 && (
            <div className={`rps-streak ${streakType === 'win' ? 'win' : streakType === 'lose' ? 'lose' : 'draw'}`}>
              {streakCount}x {streakType === 'win' ? 'Win Streak!' : streakType === 'lose' ? 'Loss Streak!' : 'Draws'}
            </div>
          )}
        </div>

        <div className="rps-score-side bot-side">
          <div className="rps-score-label">Bot</div>
          <div className="rps-score-num bot">${totals.bot.toLocaleString()}</div>
        </div>
      </div>

      <div className="ssg-progress-bar">
        <div className="ssg-progress-fill player" style={{ width: `${Math.min((totals.player / (totals.player + totals.bot || 1)) * 100, 100)}%` }} />
        <div className="ssg-progress-fill bot" style={{ width: `${Math.min((totals.bot / (totals.player + totals.bot || 1)) * 100, 100)}%` }} />
      </div>

      {gameOver ? (
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">
            {totals.player > totals.bot ? '💰' : totals.bot > totals.player ? '💀' : '🤝'}
          </div>
          <div className={`result-text ${totals.player > totals.bot ? 'win' : totals.bot > totals.player ? 'lose' : 'draw'}`}>
            {totals.player > totals.bot ? 'You Win!' : totals.bot > totals.player ? 'Bot Wins!' : "It's a Tie!"}
          </div>
          <div className="rps-final-score">
            <span className="player">${totals.player.toLocaleString()}</span>
            <span className="sep">-</span>
            <span className="bot">${totals.bot.toLocaleString()}</span>
          </div>
          <button className="play-again-btn" onClick={reset}>
            Play Again
          </button>
        </div>
      ) : (
        <>
          <div className="rps-battle-area">
            <div className={`rps-fighter player-fighter ${reveal && result === 'win' ? 'winner-glow' : ''} ${reveal && result === 'lose' ? 'loser-dim' : ''}`}>
              <div className="rps-fighter-label">You</div>
              {playerChoice ? (
                <div className={`rps-fighter-emoji ${reveal ? 'revealed' : ''}`}>
                  {playerChoice.emoji}
                </div>
              ) : (
                <div className="rps-fighter-emoji placeholder">❓</div>
              )}
              {playerChoice && <div className="rps-fighter-name">{playerChoice.name}</div>}
            </div>

            <div className="rps-vs">
              {animating && shake ? (
                <div className="rps-vs-shake">⚔️</div>
              ) : reveal && result ? (
                <div className={`rps-vs-result ${result}`}>
                  {result === 'win' ? '→' : result === 'lose' ? '←' : '='}
                </div>
              ) : (
                <div className="rps-vs-text">VS</div>
              )}
            </div>

            <div className={`rps-fighter bot-fighter ${reveal && result === 'lose' ? 'winner-glow' : ''} ${reveal && result === 'win' ? 'loser-dim' : ''}`}>
              <div className="rps-fighter-label">Bot</div>
              {botChoice ? (
                <div className={`rps-fighter-emoji ${shake ? 'shaking' : ''} ${reveal ? 'revealed' : ''}`}>
                  {botChoice.emoji}
                </div>
              ) : (
                <div className="rps-fighter-emoji placeholder">❓</div>
              )}
              {botChoice && reveal && <div className="rps-fighter-name">{botChoice.name}</div>}
            </div>
          </div>

          {result && payoffs && (
            <>
              <div className={`result-text ${result}`} style={{ fontSize: 16, marginBottom: 4 }}>
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
            </>
          )}

          <div className="ssg-choices-row">
            {CHOICES.map(c => (
              <button
                key={c.name}
                className={`choice-btn ${c.class} ${pendingChoice?.name === c.name ? 'selected' : ''}`}
                onClick={() => selectChoice(c)}
                disabled={animating}
              >
                <span className="choice-emoji">{c.emoji}</span>
                <span className="choice-name">{c.name}</span>
                <span className="choice-desc">{c.desc}</span>
              </button>
            ))}
          </div>

          {pendingChoice && !result && !animating && (
            <div className="confirm-area">
              <div className="confirm-text">
                You picked <strong>{pendingChoice.emoji} {pendingChoice.name}</strong>
              </div>
              <div className="confirm-buttons">
                <button className="confirm-btn yes" onClick={confirmChoice}>
                  Let's Go!
                </button>
                <button className="confirm-btn no" onClick={() => { sound('click'); setPendingChoice(null) }}>
                  Change
                </button>
              </div>
            </div>
          )}

          {!playerChoice && !pendingChoice && !animating && (
            <div className="result-message">Choose your strategy!</div>
          )}

          {result && (
            <button className="play-again-btn" onClick={nextRound} style={{ marginTop: 12 }}>
              {round >= totalRounds ? 'See Results' : 'Next Round'}
            </button>
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
        <button
          onClick={reset}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: 13,
            textDecoration: 'underline',
          }}
        >
          {gameOver ? 'New Game' : 'Quit Game'}
        </button>
      </div>
    </div>
  )
}
