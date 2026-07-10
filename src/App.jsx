import { useState } from 'react'
import RockPaperScissors from './components/RockPaperScissors'
import SplitStealGiveAway from './components/SplitStealGiveAway'
import GuessTheNumber from './components/GuessTheNumber'
import './index.css'

const GAMES = [
  {
    id: 'rps',
    label: 'Rock Paper Scissors',
    emoji: '✊',
    desc: 'Classic showdown against the bot!',
    color: '#3b82f6',
    component: RockPaperScissors,
  },
  {
    id: 'ssg',
    label: 'Split Steal Give Away',
    emoji: '💰',
    desc: 'Your custom game! Outsmart the bot to win the prize.',
    color: '#f59e0b',
    component: SplitStealGiveAway,
  },
  {
    id: 'gtn',
    label: 'Guess The Number',
    emoji: '🔢',
    desc: 'Can you crack the bot\'s number in 10 tries?',
    color: '#22c55e',
    component: GuessTheNumber,
  },
]

function GameCard({ game, onClick }) {
  return (
    <button
      className="game-select-card"
      onClick={onClick}
      style={{ '--card-accent': game.color }}
    >
      <div className="game-select-emoji">{game.emoji}</div>
      <div className="game-select-label">{game.label}</div>
      <div className="game-select-desc">{game.desc}</div>
      <div className="game-select-play">Play Now →</div>
    </button>
  )
}

function App() {
  const [activeGame, setActiveGame] = useState(null)

  if (activeGame) {
    const game = GAMES.find(g => g.id === activeGame)
    const ActiveComponent = game.component
    return (
      <div>
        <header className="arcade-header">
          <h1 className="arcade-title">ARCADE GAMES</h1>
        </header>
        <nav className="tab-bar">
          <button className="tab-btn back-btn" onClick={() => setActiveGame(null)}>
            ← Back to Games
          </button>
          {GAMES.map(g => (
            <button
              key={g.id}
              className={`tab-btn ${activeGame === g.id ? 'active' : ''}`}
              onClick={() => setActiveGame(g.id)}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </nav>
        <main className="game-container">
          <ActiveComponent key={activeGame} />
        </main>
      </div>
    )
  }

  return (
    <div>
      <header className="arcade-header">
        <h1 className="arcade-title">ARCADE GAMES</h1>
        <p className="arcade-subtitle">Pick a game and challenge the bot!</p>
      </header>
      <main className="game-container">
        <div className="game-select-grid">
          {GAMES.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onClick={() => setActiveGame(game.id)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
