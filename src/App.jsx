import { useState, useEffect } from 'react'
import RockPaperScissors from './components/RockPaperScissors'
import SplitStealGiveAway from './components/SplitStealGiveAway'
import GuessTheNumber from './components/GuessTheNumber'
import GuessTheNumberHotCold from './components/GuessTheNumberHotCold'
import HigherOrLower from './components/HigherOrLower'
import DiceRoll from './components/DiceRoll'
import CoinFlipStreak from './components/CoinFlipStreak'
import { isMuted, toggleMute } from './useSound'
import useStats from './useStats'
import { THEMES, THEME_ORDER } from './themes'
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
    desc: 'Crack the bot\'s number! Choose your difficulty!',
    color: '#22c55e',
    component: GuessTheNumber,
  },
  {
    id: 'gtn-hc',
    label: 'Hot or Cold',
    emoji: '🌡️',
    desc: 'Getting warmer or colder? Use the clues!',
    color: '#ef4444',
    component: GuessTheNumberHotCold,
  },
  {
    id: 'hol',
    label: 'Higher or Lower',
    emoji: '🃏',
    desc: 'Guess if the next card is higher or lower!',
    color: '#8b5cf6',
    component: HigherOrLower,
  },
  {
    id: 'dice',
    label: 'Dice Roll',
    emoji: '🎲',
    desc: 'Bet on the dice! Exact, Range, or Parity.',
    color: '#06b6d4',
    component: DiceRoll,
  },
  {
    id: 'coin',
    label: 'Coin Flip Streak',
    emoji: '🪙',
    desc: 'Call Heads or Tails. Build a streak to win!',
    color: '#f97316',
    component: CoinFlipStreak,
  },
]

function GameCard({ game, stats, onClick }) {
  const gameStats = stats[game.id]
  return (
    <button
      className="game-select-card"
      onClick={onClick}
      style={{ '--card-accent': game.color }}
    >
      <div className="game-select-emoji">{game.emoji}</div>
      <div className="game-select-label">{game.label}</div>
      <div className="game-select-desc">{game.desc}</div>
      {gameStats && gameStats.played > 0 && (
        <div className="game-select-stats">
          {gameStats.won}/{gameStats.played} won
          {gameStats.bestStreak > 0 && <> · 🔥 {gameStats.bestStreak}</>}
        </div>
      )}
      <div className="game-select-play">Play Now →</div>
    </button>
  )
}

function StatsModal({ allStats, onClose }) {
  const totalPlayed = Object.values(allStats).reduce((s, g) => s + g.played, 0)
  const totalWon = Object.values(allStats).reduce((s, g) => s + g.won, 0)
  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal" onClick={e => e.stopPropagation()}>
        <h2 className="stats-title">Your Stats</h2>
        <div className="stats-total">
          <span>{totalPlayed} games played</span>
          <span>{totalWon} won</span>
          {totalPlayed > 0 && <span>{Math.round((totalWon / totalPlayed) * 100)}% win rate</span>}
        </div>
        <div className="stats-list">
          {GAMES.map(g => {
            const s = allStats[g.id]
            if (!s || s.played === 0) return null
            return (
              <div key={g.id} className="stats-row">
                <span className="stats-row-emoji">{g.emoji}</span>
                <span className="stats-row-name">{g.label}</span>
                <span className="stats-row-detail">{s.won}/{s.played}</span>
                {s.bestStreak > 0 && <span className="stats-row-streak">🔥 {s.bestStreak}</span>}
              </div>
            )
          })}
        </div>
        <button className="stats-close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function getSaved(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}

function ThemePicker({ current, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="theme-picker">
      <button className="settings-btn" onClick={() => setOpen(!open)} title="Change Theme">
        {THEMES[current].emoji}
      </button>
      {open && (
        <div className="theme-dropdown">
          {THEME_ORDER.map(id => (
            <button
              key={id}
              className={`theme-option ${id === current ? 'active' : ''}`}
              onClick={() => { onChange(id); setOpen(false) }}
            >
              <span className="theme-option-emoji">{THEMES[id].emoji}</span>
              <span className="theme-option-name">{THEMES[id].name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsBar({ muted, onMuteToggle, theme, onThemeChange, animations, onAnimToggle, glass, onGlassToggle, onStats }) {
  return (
    <div className="settings-bar">
      <div className="settings-bar-left">
        <span className="settings-bar-label">⚙️ Settings</span>
      </div>
      <div className="settings-bar-right">
        <button className="settings-btn" onClick={onMuteToggle} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="settings-btn" onClick={onAnimToggle} title={animations ? 'Disable Animations' : 'Enable Animations'}>
          {animations ? '✨' : '🚫'}
        </button>
        <button className="settings-btn" onClick={onGlassToggle} title={glass ? 'Disable Glassmorphism' : 'Enable Glassmorphism'}>
          {glass ? '💎' : '🪟'}
        </button>
        <button className="settings-btn" onClick={onStats} title="Stats">
          📊
        </button>
        <ThemePicker current={theme} onChange={onThemeChange} />
      </div>
    </div>
  )
}

function App() {
  const [activeGame, setActiveGame] = useState(null)
  const [muted, setMuted] = useState(isMuted())
  const [showStats, setShowStats] = useState(false)
  const [theme, setTheme] = useState(() => getSaved('arcade-theme', 'neon'))
  const [animations, setAnimations] = useState(() => getSaved('arcade-animations', 'on') === 'on')
  const [glass, setGlass] = useState(() => getSaved('arcade-glass', 'on') === 'on')
  const { allStats } = useStats('_global')

  useEffect(() => {
    const vars = THEMES[theme]?.vars || THEMES.neon.vars
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v)
    }
    try { localStorage.setItem('arcade-theme', theme) } catch {}
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('no-animations', !animations)
    try { localStorage.setItem('arcade-animations', animations ? 'on' : 'off') } catch {}
  }, [animations])

  useEffect(() => {
    document.documentElement.classList.toggle('no-glass', !glass)
    try { localStorage.setItem('arcade-glass', glass ? 'on' : 'off') } catch {}
  }, [glass])

  function handleMuteToggle() {
    toggleMute()
    setMuted(isMuted())
  }

  const settings = {
    muted, onMuteToggle: handleMuteToggle,
    theme, onThemeChange: setTheme,
    animations, onAnimToggle: () => setAnimations(a => !a),
    glass, onGlassToggle: () => setGlass(g => !g),
    onStats: () => setShowStats(true),
  }

  if (activeGame) {
    const game = GAMES.find(g => g.id === activeGame)
    const ActiveComponent = game.component
    return (
      <div>
        <SettingsBar {...settings} />
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
      <SettingsBar {...settings} />
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
              stats={allStats}
              onClick={() => setActiveGame(game.id)}
            />
          ))}
        </div>
      </main>
      {showStats && <StatsModal allStats={allStats} onClose={() => setShowStats(false)} />}
    </div>
  )
}

export default App
