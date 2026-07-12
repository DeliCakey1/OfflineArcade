import { useState, useEffect, useCallback, useRef } from 'react'
import useSound from '../useSound'
import useStats from '../useStats'
import QuitConfirmButton from './QuitConfirmButton'

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function isRed(suit) {
  return suit === '♥' || suit === '♦'
}

function isFaceOrTen(rank) {
  return rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K'
}

function cardValue(rank) {
  if (rank === 'A') return 11
  if (isFaceOrTen(rank)) return 10
  return parseInt(rank)
}

function handValue(cards) {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += cardValue(c.rank)
    if (c.rank === 'A') aces++
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21
}

function makeDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}-${suit}` })
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function CardFace({ card, style, className }) {
  const red = isRed(card.suit)
  return (
    <div className={`bj-card ${red ? 'red' : 'black'} ${className || ''}`} style={style} aria-label={`${card.rank} of ${card.suit === '♠' ? 'spades' : card.suit === '♥' ? 'hearts' : card.suit === '♦' ? 'diamonds' : 'clubs'}`}>
      <div className="bj-card-top">{card.rank}<br />{card.suit}</div>
      <div className="bj-card-center">{card.suit}</div>
      <div className="bj-card-bottom">{card.rank}<br />{card.suit}</div>
    </div>
  )
}

function CardBack({ style, className }) {
  return (
    <div className={`bj-card bj-card-back ${className || ''}`} style={style}>
      <div className="bj-card-back-pattern">
        <span>♠</span>
        <span>♦</span>
        <span>♥</span>
        <span>♣</span>
      </div>
    </div>
  )
}

function Hand({ cards, label, faceDownCount, value, showValue, bust }) {
  return (
    <div className="bj-hand">
      <div className="bj-hand-label">{label}</div>
      <div className="bj-hand-cards">
        {cards.map((card, i) => {
          if (i < faceDownCount) {
            return <CardBack key={`back-${i}`} className="bj-card-anim" style={{ animationDelay: `${i * 120}ms` }} />
          }
          return <CardFace key={card.id} card={card} className="bj-card-anim" style={{ animationDelay: `${i * 120}ms` }} />
        })}
      </div>
      {showValue && (
        <div className={`bj-hand-value ${bust ? 'bust' : ''}`}>
          {value}{bust ? ' BUST' : ''}
        </div>
      )}
    </div>
  )
}

export default function Blackjack({ onPlayingChange }) {
  const [coins, setCoins] = useState(100)
  const [bet, setBet] = useState(null)
  const [deck, setDeck] = useState([])
  const [playerCards, setPlayerCards] = useState([])
  const [dealerCards, setDealerCards] = useState([])
  const [playerValue, setPlayerValue] = useState(0)
  const [dealerValue, setDealerValue] = useState(0)
  const [dealerRevealed, setDealerRevealed] = useState(false)
  const [phase, setPhase] = useState('betting')
  const [result, setResult] = useState(null)
  const [resultDetail, setResultDetail] = useState('')
  const [animating, setAnimating] = useState(false)
  const [round, setRound] = useState(0)
  const [wins, setWins] = useState(0)
  const [losses, setLosses] = useState(0)
  const [pushes, setPushes] = useState(0)
  const [winStreak, setWinStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])
  const [betInput, setBetInput] = useState('')
  const sound = useSound()
  const { recordGame } = useStats('blackjack')
  const deckRef = useRef([])
  const dealTimeoutRef = useRef(null)
  const coinsRef = useRef(100)

  useEffect(() => {
    coinsRef.current = coins
  }, [coins])

  useEffect(() => {
    onPlayingChange?.(phase === 'dealing' || phase === 'playing')
    return () => { onPlayingChange?.(false); if (dealTimeoutRef.current) clearTimeout(dealTimeoutRef.current) }
  }, [phase, onPlayingChange])

  useEffect(() => {
    return () => { if (dealTimeoutRef.current) clearTimeout(dealTimeoutRef.current) }
  }, [])

  function dealNewHand(currentBet) {
    const newDeck = deckRef.current.length < 20 ? makeDeck() : [...deckRef.current]
    const cards = newDeck.splice(0, 4)
    deckRef.current = newDeck
    setDeck(newDeck)

    const pCards = [cards[0], cards[2]]
    const dCards = [cards[1], cards[3]]

    setPlayerCards(pCards)
    setDealerCards(dCards)
    setDealerRevealed(false)
    setPlayerValue(handValue(pCards))
    setDealerValue(cardValue(dCards[0].rank))
    setPhase('dealing')
    setAnimating(true)
    setBet(currentBet)
    onPlayingChange?.(true)

    let cardIndex = 0
    const revealCards = () => {
      if (cardIndex < 4) {
        if (cardIndex === 0) setPlayerCards([cards[0]])
        else if (cardIndex === 1) setDealerCards([cards[1]])
        else if (cardIndex === 2) setPlayerCards([cards[0], cards[2]])
        else if (cardIndex === 3) {
          setDealerCards([cards[1], cards[3]])
          setPlayerValue(handValue(pCards))
          setDealerValue(cardValue(dCards[0].rank))
        }
        cardIndex++
        if (cardIndex < 4) {
          dealTimeoutRef.current = setTimeout(revealCards, 150)
        } else {
          dealTimeoutRef.current = setTimeout(() => {
            setAnimating(false)
            if (isBlackjack(pCards)) {
              setDealerRevealed(true)
              setDealerValue(handValue(dCards))
              if (isBlackjack(dCards)) {
                finishRound('push', currentBet, 'Both Blackjack! Push', pCards, dCards, true)
              } else {
                finishRound('blackjack', currentBet, 'Blackjack! 3x payout!', pCards, dCards, true)
              }
            } else {
              setPhase('playing')
              onPlayingChange?.(false)
            }
          }, 200)
        }
      }
    }
    revealCards()
  }

  function finishRound(resultType, currentBet, detail, pCards, dCards, dealerAlreadyRevealed) {
    const dv = handValue(dCards)
    if (!dealerAlreadyRevealed) {
      setDealerRevealed(true)
      setDealerValue(dv)
    }
    setPlayerValue(handValue(pCards))
    setDealerValue(dv)

    let coinChange = 0
    if (resultType === 'blackjack') coinChange = currentBet * 3
    else if (resultType === 'win' || resultType === 'dealerBust') coinChange = currentBet * 2
    else if (resultType === 'push') coinChange = currentBet
    else if (resultType === 'surrender') coinChange = Math.floor(currentBet / 2)
    else coinChange = 0

    const newCoins = coinsRef.current + coinChange
    setCoins(newCoins)

    const newRound = round + 1
    setRound(newRound)

    const won = resultType === 'blackjack' || resultType === 'win' || resultType === 'dealerBust'
    const lost = resultType === 'bust' || resultType === 'lose' || resultType === 'surrender'
    if (won) {
      setWins(w => w + 1)
      setWinStreak(s => {
        const ns = s + 1
        setBestStreak(b => Math.max(b, ns))
        return ns
      })
    } else if (lost) {
      setLosses(l => l + 1)
      setWinStreak(0)
    } else {
      setPushes(p => p + 1)
    }

    const resultLabel = won ? 'win' : lost ? 'lose' : 'draw'
    recordGame(won, bestStreak)

    setHistory(prev => [...prev.slice(-19), {
      round: newRound,
      bet: currentBet,
      result: resultLabel,
      detail: detail,
      playerHand: pCards.map(c => `${c.rank}${c.suit}`).join(' '),
      dealerHand: dCards.map(c => `${c.rank}${c.suit}`).join(' '),
      coinsChange: coinChange,
      coinsAfter: newCoins,
    }])

    setResult(resultLabel)
    setResultDetail(detail)
    setPhase('result')
    setAnimating(false)
    onPlayingChange?.(false)

    if (won) sound(resultType === 'blackjack' ? 'victory' : 'win')
    else if (lost) sound(resultType === 'surrender' ? 'lose' : 'loseBig')
    else sound('draw')
  }

  function playerHit() {
    if (phase !== 'playing' || animating) return
    sound('click')
    const newCard = deckRef.current[0]
    deckRef.current = deckRef.current.slice(1)
    setDeck([...deckRef.current])

    const newCards = [...playerCards, newCard]
    setPlayerCards(newCards)
    const newValue = handValue(newCards)
    setPlayerValue(newValue)

    if (newValue > 21) {
      setAnimating(true)
      dealTimeoutRef.current = setTimeout(() => {
        finishRound('bust', bet, 'Bust! You lose.', newCards, dealerCards, false)
      }, 400)
    }
  }

  function playerStand() {
    if (phase !== 'playing' || animating) return
    sound('confirm')
    setAnimating(true)
    setPhase('dealerTurn')
    onPlayingChange?.(true)
    dealerPlay(dealerCards)
  }

  function playerDoubleDown() {
    if (phase !== 'playing' || animating || playerCards.length !== 2) return
    if (coinsRef.current < bet) return

    sound('confirm')
    const newBet = bet * 2
    setBet(newBet)
    setCoins(coinsRef.current - bet)

    const newCard = deckRef.current[0]
    deckRef.current = deckRef.current.slice(1)
    setDeck([...deckRef.current])

    const newCards = [...playerCards, newCard]
    setPlayerCards(newCards)
    const newValue = handValue(newCards)
    setPlayerValue(newValue)

    if (newValue > 21) {
      dealTimeoutRef.current = setTimeout(() => {
        finishRound('bust', newBet, 'Bust on double down!', newCards, dealerCards, false)
      }, 400)
    } else {
      setAnimating(true)
      setPhase('dealerTurn')
      onPlayingChange?.(true)
      dealTimeoutRef.current = setTimeout(() => dealerPlay(dealerCards, newCards, newBet), 400)
    }
  }

  function playerSurrender() {
    if (phase !== 'playing' || animating || playerCards.length !== 2) return
    sound('click')
    finishRound('surrender', bet, 'Surrendered. Half bet returned.', playerCards, dealerCards, false)
  }

  function dealerPlay(currentDealerCards, currentPlayerCards, currentBet) {
    const pCards = currentPlayerCards || playerCards
    const dCards = [...currentDealerCards]
    const currentBetVal = currentBet || bet
    let dDeck = [...deckRef.current]

    function dealerDraw() {
      const dv = handValue(dCards)
      if (dv < 17) {
        const newCard = dDeck[0]
        dDeck = dDeck.slice(1)
        deckRef.current = dDeck
        setDeck([...dDeck])
        dCards.push(newCard)
        setDealerCards([...dCards])
        setDealerValue(handValue(dCards))

        dealTimeoutRef.current = setTimeout(dealerDraw, 300)
      } else {
        setDealerValue(handValue(dCards))
        dealTimeoutRef.current = setTimeout(() => {
          const finalPlayerValue = handValue(pCards)
          const finalDealerValue = handValue(dCards)

          if (finalDealerValue > 21) {
            finishRound('dealerBust', currentBetVal, 'Dealer busts! You win!', pCards, dCards, true)
          } else if (finalPlayerValue > finalDealerValue) {
            finishRound('win', currentBetVal, `You win! ${finalPlayerValue} vs ${finalDealerValue}`, pCards, dCards, true)
          } else if (finalPlayerValue < finalDealerValue) {
            finishRound('lose', currentBetVal, `Dealer wins. ${finalDealerValue} vs ${finalPlayerValue}`, pCards, dCards, true)
          } else {
            finishRound('push', currentBetVal, `Push! Both have ${finalPlayerValue}`, pCards, dCards, true)
          }
        }, 200)
      }
    }
    dealerDraw()
  }

  function startBetting() {
    setPlayerCards([])
    setDealerCards([])
    setDealerRevealed(false)
    setPlayerValue(0)
    setDealerValue(0)
    setResult(null)
    setResultDetail('')
    setBet(null)
    setBetInput('')
    setPhase('betting')
  }

  function placeBet(amount) {
    if (amount < 1 || amount > coinsRef.current) return
    sound('confirm')
    setBet(amount)
    setCoins(coinsRef.current - amount)
    dealNewHand(amount)
  }

  function quickBet(amt) {
    setBetInput(String(amt))
  }

  function handleBetSubmit(e) {
    e.preventDefault()
    const v = parseInt(betInput)
    if (v >= 1 && v <= coins) placeBet(v)
  }

  function newRound() {
    startBetting()
  }

  function reset() {
    if (dealTimeoutRef.current) clearTimeout(dealTimeoutRef.current)
    setCoins(100)
    setBet(null)
    setDeck([])
    setPlayerCards([])
    setDealerCards([])
    setPlayerValue(0)
    setDealerValue(0)
    setDealerRevealed(false)
    setPhase('betting')
    setResult(null)
    setResultDetail('')
    setAnimating(false)
    setRound(0)
    setWins(0)
    setLosses(0)
    setPushes(0)
    setWinStreak(0)
    setBestStreak(0)
    setHistory([])
    setBetInput('')
    deckRef.current = []
  }

  function shareResult() {
    const lines = [
      `🃏 Beat the dealer at Blackjack!`,
      `💰 Final coins: ${coins} | Rounds: ${round} | W/L/P: ${wins}/${losses}/${pushes}`,
      `🔥 Best streak: ${bestStreak}`,
      ``,
      `Recent hands:`,
      ...history.slice(-8).map(h => `  #${h.round}: Bet ${h.bet} | ${h.detail} (${h.coinsChange >= 0 ? '+' : ''}${h.coinsChange})`),
      ``,
      `🎮 Offline Arcade`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const pVal = handValue(playerCards)
  const dVal = dealerRevealed ? handValue(dealerCards) : cardValue(dealerCards[0] || { rank: '2' })
  const canDouble = phase === 'playing' && playerCards.length === 2 && coinsRef.current >= bet && !animating
  const canSurrender = phase === 'playing' && playerCards.length === 2 && !animating

  if (coins <= 0 && phase === 'betting') {
    return (
      <div className="game-card slide-in">
        <h2>Blackjack</h2>
        <div className="rps-game-over">
          <div className="rps-game-over-emoji">💸</div>
          <div className="result-text lose">Out of Coins!</div>
          <div className="result-message">Final stats: {wins}W / {losses}L / {pushes}P — Best streak: {bestStreak}</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={reset}>Start Over</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <h2>Blackjack</h2>
      <p className="description">Beat the dealer to 21!</p>

      <div className="bj-stats-row">
        <div className="bj-stat">
          <div className="bj-stat-label">Coins</div>
          <div className="bj-stat-num coins">💰 {coins}</div>
        </div>
        <div className="bj-stat">
          <div className="bj-stat-label">Bet</div>
          <div className="bj-stat-num bet">{bet != null ? `🪙 ${bet}` : '—'}</div>
        </div>
        <div className="bj-stat">
          <div className="bj-stat-label">Round</div>
          <div className="bj-stat-num">{round}</div>
        </div>
        <div className="bj-stat">
          <div className="bj-stat-label">W/L/P</div>
          <div className="bj-stat-num">{wins}/{losses}/{pushes}</div>
        </div>
        {winStreak >= 2 && (
          <div className="bj-stat">
            <div className="bj-stat-label">Streak</div>
            <div className="bj-stat-num fire">🔥 {winStreak}</div>
          </div>
        )}
      </div>

      {phase === 'betting' ? (
        <div className="bj-bet-area">
          <div className="bj-bet-title">Place Your Bet</div>
          <div className="bj-bet-quick">
            {[1, 5, 10, 25, 50].filter(n => n <= coins).map(n => (
              <button key={n} className="bj-bet-quick-btn" onClick={() => quickBet(n)}>{n}</button>
            ))}
            <button className="bj-bet-quick-btn" onClick={() => quickBet(coins)}>All In</button>
          </div>
          <form className="bj-bet-form" onSubmit={handleBetSubmit}>
            <input
              type="number"
              min="1"
              max={coins}
              className="bj-bet-input"
              placeholder={`1 - ${coins}`}
              aria-label={`Bet amount, 1 to ${coins} coins`}
              value={betInput}
              onChange={e => setBetInput(e.target.value)}
            />
            <button type="submit" className="bj-bet-submit" disabled={!betInput || parseInt(betInput) < 1 || parseInt(betInput) > coins}>
              Deal
            </button>
          </form>
          {round > 0 && (
            <div className="bj-record">
              Best streak: {bestStreak} | Last result: {history.length > 0 ? history[history.length - 1].detail : '—'}
            </div>
          )}
        </div>
      ) : phase === 'result' ? (
        <div className="bj-table">
          <Hand cards={dealerCards} label="Dealer" faceDownCount={dealerRevealed ? 0 : 1} value={handValue(dealerCards)} showValue={true} bust={handValue(dealerCards) > 21 && dealerRevealed} />
          <Hand cards={playerCards} label="You" faceDownCount={0} value={pVal} showValue={true} bust={pVal > 21} />
        </div>
      ) : (
        <div className="bj-table">
          <Hand
            cards={dealerCards}
            label="Dealer"
            faceDownCount={dealerRevealed ? 0 : 1}
            value={dealerRevealed ? handValue(dealerCards) : cardValue(dealerCards[0] || { rank: '2' })}
            showValue={true}
            bust={dealerRevealed && handValue(dealerCards) > 21}
          />
          <Hand cards={playerCards} label="You" faceDownCount={0} value={pVal} showValue={true} bust={pVal > 21} />
        </div>
      )}

      {phase === 'result' && (
        <div className="rps-game-over">
          <div className={`result-text ${result}`}>
            {result === 'win' ? '🎉 You Win!' : result === 'blackjack' ? '🃏 BLACKJACK!' : result === 'lose' || result === 'bust' || result === 'surrender' ? '😔 ' + (result === 'surrender' ? 'Surrendered' : result === 'bust' ? 'Busted!' : 'Dealer Wins') : '🤝 Push!'}
          </div>
          <div className="result-message">{resultDetail}</div>
          <div className="bj-coins-after">💰 {coins} coins</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="play-again-btn" onClick={newRound}>Next Hand</button>
            <button className="play-again-btn share-btn" onClick={shareResult}>
              {copied ? '✓ Copied!' : '📋 Copy Result'}
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && !animating && (
        <div className="bj-actions">
          <button className="bj-action-btn hit" onClick={playerHit}>Hit</button>
          <button className="bj-action-btn stand" onClick={playerStand}>Stand</button>
          <button className={`bj-action-btn double ${!canDouble ? 'disabled' : ''}`} onClick={playerDoubleDown} disabled={!canDouble}>
            Double{!canDouble ? '' : ` (${bet * 2})`}
          </button>
          <button className={`bj-action-btn surrender ${!canSurrender ? 'disabled' : ''}`} onClick={playerSurrender} disabled={!canSurrender}>
            Surrender
          </button>
        </div>
      )}

      {(phase === 'dealing' || (phase === 'dealerTurn' && animating)) && (
        <div className="result-message">Dealing...</div>
      )}

      {history.length > 0 && (
        <div className="rps-history">
          <div className="rps-history-label">Recent Hands</div>
          <div className="rps-history-list">
            {history.slice(-8).map((h, i) => (
              <div key={i} className={`rps-history-item ${h.result}`}>
                <span className="history-round">#{h.round}</span>
                <span className="history-pick">{h.bet}🪙</span>
                <span className="history-vs">→</span>
                <span className="history-pick">{h.detail.substring(0, 16)}</span>
                <span className={`history-result ${h.result}`}>
                  {h.result === 'win' ? 'W' : h.result === 'lose' ? 'L' : 'P'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <QuitConfirmButton onQuit={reset} gameOver={coins <= 0} className="quit-btn" />
      </div>
    </div>
  )
}
