import { useState, useEffect, useRef } from 'react'
import RockPaperScissors from './components/RockPaperScissors'
import SplitStealGiveAway from './components/SplitStealGiveAway'
import GuessTheNumber from './components/GuessTheNumber'
import GuessTheNumberHotCold from './components/GuessTheNumberHotCold'
import HigherOrLower from './components/HigherOrLower'
import DiceRoll from './components/DiceRoll'
import CoinFlipStreak from './components/CoinFlipStreak'
import MemoryMatch from './components/MemoryMatch'
import WordScramble from './components/WordScramble'
import NumberMerge from './components/NumberMerge'
import ReactionTime from './components/ReactionTime'
import TypingSpeed from './components/TypingSpeed'
import SimonSays from './components/SimonSays'
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
  {
    id: 'memory',
    label: 'Memory Match',
    emoji: '🧠',
    desc: 'Find all matching pairs! Fewest moves wins.',
    color: '#ec4899',
    component: MemoryMatch,
  },
  {
    id: 'word',
    label: 'Word Scramble',
    emoji: '📚',
    desc: 'Unscramble the letters to guess the word!',
    color: '#14b8a6',
    component: WordScramble,
  },
  {
    id: 'merge',
    label: 'Number Merge',
    emoji: '🔢',
    desc: 'Slide tiles to merge same numbers. Reach the goal!',
    color: '#f59e0b',
    component: NumberMerge,
  },
  {
    id: 'reaction',
    label: 'Reaction Time',
    emoji: '⚡',
    desc: 'Click as fast as you can when it turns green!',
    color: '#eab308',
    component: ReactionTime,
  },
  {
    id: 'typing',
    label: 'Typing Speed',
    emoji: '⌨️',
    desc: 'Type each word as fast as you can!',
    color: '#8b5cf6',
    component: TypingSpeed,
  },
  {
    id: 'simon',
    label: 'Simon Says',
    emoji: '🎵',
    desc: 'Watch the sequence, then repeat it!',
    color: '#ef4444',
    component: SimonSays,
  },
]

function ConfirmModal({ message, onConfirm, onCancel, confirmText = 'Yes, Leave', cancelText = 'Stay' }) {
  return (
    <div className="stats-overlay" onClick={onCancel}>
      <div className="stats-modal confirm-modal" onClick={e => e.stopPropagation()}>
        <h2 className="stats-title">Are you sure?</h2>
        <p className="confirm-modal-text">{message}</p>
        <div className="confirm-buttons">
          <button className="confirm-btn yes" onClick={onConfirm}>{confirmText}</button>
          <button className="confirm-btn no" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  )
}

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

function StatsModal({ allStats, onClose, onClear }) {
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
        <div className="stats-footer">
          <button className="stats-close" onClick={onClose}>Close</button>
          {totalPlayed > 0 && (
            <button className="stats-clear-btn" onClick={onClear}>🗑️ Clear All Stats</button>
          )}
        </div>
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

function GamesDropdown({ inGame, onNavigate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="games-dropdown-wrap" ref={ref}>
      <button className="settings-btn games-dropdown-btn" onClick={() => setOpen(!open)}>
        🕹️ Games ▾
      </button>
      <div className={`theme-dropdown games-dropdown ${open ? 'open' : ''}`}>
        {GAMES.map(g => (
          <button
            key={g.id}
            className="theme-option"
            onClick={() => { setOpen(false); onNavigate(g.id) }}
          >
            <span className="theme-option-emoji">{g.emoji}</span>
            <span className="theme-option-name">{g.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CloakScreen({ onBack }) {
  const [mode, setMode] = useState(() => getSaved('arcade-cloak', 'none'))
  const [url, setUrl] = useState(() => getSaved('arcade-cloak-url', 'https://'))
  const [title, setTitle] = useState(() => getSaved('arcade-cloak-title', ''))
  const [favicon, setFavicon] = useState(() => getSaved('arcade-cloak-favicon', ''))
  const [saved, setSaved] = useState(false)
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)

  function openBlankWithArcade(cloakTitle, cloakFavicon) {
    const win = window.open('about:blank', '_blank')
    if (!win) return
    const base = window.location.origin
    let html = '<!doctype html>\n' + document.documentElement.outerHTML
    html = html.replace(/(href|src)="(\/[^"]+)"/g, (_, attr, path) => `${attr}="${base}${path}"`)
    html = html.replace('</head>', '<script>window.__ABOUT_BLANK__ = true</script></head>')
    if (cloakTitle) {
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${cloakTitle}</title>`)
    }
    if (cloakFavicon) {
      html = html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="${cloakFavicon}" />`)
    }
    win.document.write(html)
    win.document.close()
  }

  function handleSaveCustom() {
    localStorage.setItem('arcade-cloak', 'custom')
    localStorage.setItem('arcade-cloak-url', url)
    localStorage.setItem('arcade-cloak-title', title)
    localStorage.setItem('arcade-cloak-favicon', favicon)
    setMode('custom')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    openBlankWithArcade(title, favicon)
    setTimeout(() => { window.location.replace(url) }, 500)
  }

  function handleEnableBlank() {
    localStorage.setItem('arcade-cloak', 'blank')
    setMode('blank')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    openBlankWithArcade('', '')
  }

  function handleRevert() {
    localStorage.removeItem('arcade-cloak')
    localStorage.removeItem('arcade-cloak-url')
    localStorage.removeItem('arcade-cloak-title')
    localStorage.removeItem('arcade-cloak-favicon')
    setMode('none')
    setUrl('https://')
    setTitle('')
    setFavicon('')
    document.title = 'Offline Arcade'
    const link = document.querySelector("link[rel~='icon']")
    if (link) link.href = '/favicon.svg'
    setShowRevertConfirm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isActive = mode !== 'none'

  return (
    <div className="cloak-screen">
      <div className="cloak-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <h2 className="cloak-title">Tab Cloaking</h2>
        <p className="cloak-subtitle">Disguise the tab to look like something else</p>
      </div>

      {isActive && (
        <div className="cloak-status">
          <span className="cloak-status-dot" />
          <span>Active: {mode === 'custom' ? `Redirecting to ${url}` : 'about:blank mode'}</span>
        </div>
      )}

      <div className="cloak-section">
        <div className="cloak-section-header">
          <span className="cloak-section-emoji">🔗</span>
          <div>
            <h3 className="cloak-section-title">Custom Website</h3>
            <p className="cloak-section-desc">Redirects this tab to a website of your choice, and opens the arcade in a new about:blank tab</p>
          </div>
        </div>
        <div className="cloak-inputs">
          <label className="cloak-label">
            Website URL
            <input
              className="cloak-input"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://canvas.instructure.com"
            />
          </label>
          <label className="cloak-label">
            Tab Title <span className="cloak-optional">(for the about:blank tab)</span>
            <input
              className="cloak-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Dashboard | Canvas LMS"
            />
          </label>
          <label className="cloak-label">
            Tab Favicon URL <span className="cloak-optional">(for the about:blank tab)</span>
            <input
              className="cloak-input"
              type="url"
              value={favicon}
              onChange={e => setFavicon(e.target.value)}
              placeholder="https://example.com/favicon.ico"
            />
          </label>
        </div>
        <button className="cloak-save-btn" onClick={handleSaveCustom} disabled={!url || url === 'https://'}>
          {mode === 'custom' ? '✓ Saved — Click to Update' : 'Save & Activate'}
        </button>
      </div>

      <div className="cloak-section">
        <div className="cloak-section-header">
          <span className="cloak-section-emoji">🔲</span>
          <div>
            <h3 className="cloak-section-title">about:blank</h3>
            <p className="cloak-section-desc">Opens the arcade in an about:blank tab. Address bar shows nothing.</p>
          </div>
        </div>
        <button
          className={`cloak-save-btn ${mode === 'blank' ? 'cloak-active' : ''}`}
          onClick={handleEnableBlank}
        >
          {mode === 'blank' ? '✓ Active — Click to Re-open' : 'Open in about:blank'}
        </button>
      </div>

      <div className="cloak-section cloak-revert-section">
        <button className="cloak-revert-btn" onClick={() => setShowRevertConfirm(true)}>
          ↩️ Revert to Normal
        </button>
        <p className="cloak-revert-desc">Clear all cloaking. The site will load normally.</p>
      </div>

      {saved && (
        <div className="cloak-saved-toast">Settings saved!</div>
      )}

      {showRevertConfirm && (
        <div className="stats-overlay" onClick={() => setShowRevertConfirm(false)}>
          <div className="stats-modal confirm-modal" onClick={e => e.stopPropagation()}>
            <h2 className="stats-title">Revert to Normal?</h2>
            <p className="confirm-modal-text">This will clear all cloaking settings. The site will load normally from now on.</p>
            <div className="confirm-buttons">
              <button className="confirm-btn yes" onClick={handleRevert}>Revert</button>
              <button className="confirm-btn no" onClick={() => setShowRevertConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsBar({ muted, onMuteToggle, theme, onThemeChange, animations, onAnimToggle, glass, onGlassToggle, bg, onBgToggle, onStats, inGame, onHome, onNavigateGame, onCloak }) {
  return (
    <div className="settings-bar">
      <div className="settings-bar-left">
        <button className="settings-btn home-btn" onClick={onHome} title="Home">
          🏠
        </button>
        <GamesDropdown inGame={inGame} onNavigate={onNavigateGame} />
        <button className="settings-btn" onClick={onCloak} title="Tab Cloaking">
          🎭
        </button>
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
        <button className="settings-btn" onClick={onBgToggle} title={bg ? 'Disable Background' : 'Enable Background'}>
          {bg ? '🖼️' : '⬛'}
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
  const [bg, setBg] = useState(() => getSaved('arcade-bg', 'on') === 'on')
  const [confirmNav, setConfirmNav] = useState(null)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showCloak, setShowCloak] = useState(false)
  const { allStats, clearStats } = useStats('_global')

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

  useEffect(() => {
    document.documentElement.classList.toggle('no-bg', !bg)
    try { localStorage.setItem('arcade-bg', bg ? 'on' : 'off') } catch {}
  }, [bg])

  function handleMuteToggle() {
    toggleMute()
    setMuted(isMuted())
  }

  function handleHome() {
    if (isPlaying) {
      setConfirmNav({ type: 'home' })
    } else {
      setActiveGame(null)
    }
  }

  function handleNavigateGame(gameId) {
    if (isPlaying && activeGame !== gameId) {
      setConfirmNav({ type: 'game', gameId })
    } else {
      setActiveGame(gameId)
    }
  }

  function confirmNavAction() {
    if (confirmNav.type === 'home') {
      setActiveGame(null)
      setIsPlaying(false)
    } else if (confirmNav.type === 'game') {
      setActiveGame(confirmNav.gameId)
      setIsPlaying(false)
    }
    setConfirmNav(null)
  }

  const settings = {
    muted, onMuteToggle: handleMuteToggle,
    theme, onThemeChange: setTheme,
    animations, onAnimToggle: () => setAnimations(a => !a),
    glass, onGlassToggle: () => setGlass(g => !g),
    bg, onBgToggle: () => setBg(b => !b),
    onStats: () => setShowStats(true),
    inGame: !!activeGame,
    onHome: handleHome,
    onNavigateGame: handleNavigateGame,
    onCloak: () => setShowCloak(true),
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
          <button className="tab-btn back-btn" onClick={handleHome}>
            ← Back to Games
          </button>
          {GAMES.map(g => (
            <button
              key={g.id}
              className={`tab-btn ${activeGame === g.id ? 'active' : ''}`}
              onClick={() => handleNavigateGame(g.id)}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </nav>
        <main className="game-container">
          <ActiveComponent key={activeGame} onPlayingChange={setIsPlaying} />
        </main>
        {showStats && <StatsModal allStats={allStats} onClose={() => setShowStats(false)} onClear={() => { setShowStats(false); setShowConfirmClear(true) }} />}
        {confirmNav && (
          <ConfirmModal
            message={`You're in the middle of a game. Are you sure you want to leave?`}
            onConfirm={confirmNavAction}
            onCancel={() => setConfirmNav(null)}
          />
        )}
        {showConfirmClear && (
          <ConfirmModal
            message="This will permanently delete all your stats. Are you sure?"
            confirmText="Clear Stats"
            cancelText="Cancel"
            onConfirm={() => { clearStats(); setShowConfirmClear(false) }}
            onCancel={() => setShowConfirmClear(false)}
          />
        )}
        {showCloak && <CloakScreen onBack={() => setShowCloak(false)} />}
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
      {showStats && <StatsModal allStats={allStats} onClose={() => setShowStats(false)} onClear={() => { setShowStats(false); setShowConfirmClear(true) }} />}
      {showCloak && <CloakScreen onBack={() => setShowCloak(false)} />}
    </div>
  )
}

export default App
