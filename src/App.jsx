import { useState } from 'react'
import RockPaperScissors from './components/RockPaperScissors'
import SplitStealGiveAway from './components/SplitStealGiveAway'
import './index.css'

const GAMES = [
  { id: 'rps', label: 'Rock Paper Scissors', component: RockPaperScissors },
  { id: 'ssg', label: 'Split Steal Give Away', component: SplitStealGiveAway },
]

function App() {
  const [activeGame, setActiveGame] = useState('rps')
  const ActiveComponent = GAMES.find(g => g.id === activeGame).component

  return (
    <div>
      <header className="arcade-header">
        <h1 className="arcade-title">ARCADE GAMES</h1>
        <p className="arcade-subtitle">Play against the bot and test your luck!</p>
      </header>

      <nav className="tab-bar">
        {GAMES.map(game => (
          <button
            key={game.id}
            className={`tab-btn ${activeGame === game.id ? 'active' : ''}`}
            onClick={() => setActiveGame(game.id)}
          >
            {game.label}
          </button>
        ))}
      </nav>

      <main className="game-container">
        <ActiveComponent />
      </main>
    </div>
  )
}

export default App
