import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
import Slots from './components/Slots'
import Blackjack from './components/Blackjack'
import WhackAMole from './components/WhackAMole'
import SnakeGame from './components/SnakeGame'
import Tetris from './components/Tetris'
import Breakout from './components/Breakout'
import FlappyBird from './components/FlappyBird'
import Minesweeper from './components/Minesweeper'
import LeagueScreen from './components/LeagueScreen'
import Confetti from './components/Confetti'
import AchievementsModal from './components/AchievementsModal'
import { VolumeSlider } from './components/VolumeSlider'
import SettingsPage from './components/SettingsPage'
import ThemePicker from './components/ThemePicker'
import SignInPage from './components/SignInPage'
import { onAuthChange, signInWithGoogle, signInWithGitHub, signInWithApple, handleRedirectResult, signOut } from './auth'
import { isMuted, toggleMute, getVolume, setVolume } from './useSound'
import useStats, { ALL_GAME_IDS, ACHIEVEMENTS, getDailyGame, getTimeUntilTomorrow } from './useStats'
import { calculateWinXP } from './leagues'
import { THEMES, THEME_ORDER } from './themes'
import './index.css'

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🎮' },
  { id: 'chance', label: 'Chance', emoji: '🎲' },
  { id: 'brain', label: 'Brain', emoji: '🧠' },
  { id: 'reflex', label: 'Reflex', emoji: '⚡' },
  { id: 'card', label: 'Card', emoji: '🃏' },
  { id: 'classic', label: 'Classic', emoji: '🕹️' },
]

const GAMES = [
  { id: 'rps', label: 'Rock Paper Scissors', emoji: '✊', desc: 'Classic showdown against the bot!', color: '#3b82f6', component: RockPaperScissors, category: 'chance' },
  { id: 'ssg', label: 'Split Steal Give Away', emoji: '💰', desc: 'Your custom game! Outsmart the bot to win the prize.', color: '#f59e0b', component: SplitStealGiveAway, category: 'card' },
  { id: 'gtn', label: 'Guess The Number', emoji: '🔢', desc: "Crack the bot's number! Choose your difficulty!", color: '#22c55e', component: GuessTheNumber, category: 'brain' },
  { id: 'gtn-hc', label: 'Hot or Cold', emoji: '🌡️', desc: 'Getting warmer or colder? Use the clues!', color: '#ef4444', component: GuessTheNumberHotCold, category: 'brain' },
  { id: 'hol', label: 'Higher or Lower', emoji: '🃏', desc: 'Guess if the next card is higher or lower!', color: '#8b5cf6', component: HigherOrLower, category: 'card' },
  { id: 'dice', label: 'Dice Roll', emoji: '🎲', desc: 'Bet on the dice! Exact, Range, or Parity.', color: '#06b6d4', component: DiceRoll, category: 'chance' },
  { id: 'coin', label: 'Coin Flip Streak', emoji: '🪙', desc: 'Call Heads or Tails. Build a streak to win!', color: '#f97316', component: CoinFlipStreak, category: 'chance' },
  { id: 'memory', label: 'Memory Match', emoji: '🧠', desc: 'Find all matching pairs! Fewest moves wins.', color: '#ec4899', component: MemoryMatch, category: 'brain' },
  { id: 'word', label: 'Word Scramble', emoji: '📚', desc: 'Unscramble the letters to guess the word!', color: '#14b8a6', component: WordScramble, category: 'brain' },
  { id: 'merge', label: 'Number Merge', emoji: '🔢', desc: 'Slide tiles to merge same numbers. Reach the goal!', color: '#f59e0b', component: NumberMerge, category: 'classic' },
  { id: 'reaction', label: 'Reaction Time', emoji: '⚡', desc: 'Click as fast as you can when it turns green!', color: '#eab308', component: ReactionTime, category: 'reflex' },
  { id: 'typing', label: 'Typing Speed', emoji: '⌨️', desc: 'Type each word as fast as you can!', color: '#8b5cf6', component: TypingSpeed, category: 'reflex' },
  { id: 'simon', label: 'Simon Says', emoji: '🎵', desc: 'Watch the sequence, then repeat it!', color: '#ef4444', component: SimonSays, category: 'reflex' },
  { id: 'slots', label: 'Slots', emoji: '🎰', desc: 'Spin the reels! Match symbols to win big!', color: '#f59e0b', component: Slots, category: 'chance' },
  { id: 'blackjack', label: 'Blackjack', emoji: '🃏', desc: 'Get as close to 21 as you can without going over!', color: '#22c55e', component: Blackjack, category: 'card' },
  { id: 'whack', label: 'Whack-a-Mole', emoji: '🔨', desc: 'Whack the moles as fast as you can!', color: '#8b5cf6', component: WhackAMole, category: 'reflex' },
  { id: 'snake', label: 'Snake', emoji: '🐍', desc: "Eat food, grow longer, don't hit yourself!", color: '#22c55e', component: SnakeGame, category: 'classic' },
  { id: 'tetris', label: 'Tetris', emoji: '🧱', desc: 'Stack blocks, clear lines, rack up points!', color: '#00d4ff', component: Tetris, category: 'classic' },
  { id: 'breakout', label: 'Breakout', emoji: '🏓', desc: 'Smash all the bricks with the ball!', color: '#ff2d7b', component: Breakout, category: 'classic' },
  { id: 'flappy', label: 'Flappy Bird', emoji: '🐦', desc: 'Tap to flap, dodge the pipes!', color: '#ffe600', component: FlappyBird, category: 'classic' },
  { id: 'minesweeper', label: 'Minesweeper', emoji: '💣', desc: 'Clear the field without hitting a mine!', color: '#f97316', component: Minesweeper, category: 'brain' },
]

function getSaved(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}

function formatCountdown(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function ConfirmModal({ message, onConfirm, onCancel, confirmText = 'Yes, Leave', cancelText = 'Stay' }) {
  const cancelRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    previousFocus.current = document.activeElement
    cancelRef.current?.focus()
    function handleKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previousFocus.current?.focus() }
  }, [onCancel])

  return (
    <div className="stats-overlay" onClick={onCancel}>
      <div className="stats-modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onClick={e => e.stopPropagation()}>
        <h2 className="stats-title" id="confirm-dialog-title">Are you sure?</h2>
        <p className="confirm-modal-text">{message}</p>
        <div className="confirm-buttons">
          <button className="confirm-btn yes" onClick={onConfirm}>{confirmText}</button>
          <button className="confirm-btn no" ref={cancelRef} onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  )
}

function GameCard({ game, stats, isFav, onFavToggle, onClick }) {
  const gameStats = stats[game.id]
  return (
    <div className="game-select-card" onClick={onClick} style={{ '--card-accent': game.color }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}>
      <button
        className={`fav-btn ${isFav ? 'active' : ''}`}
        onClick={e => { e.stopPropagation(); onFavToggle(game.id) }}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={isFav ? `Remove ${game.label} from favorites` : `Add ${game.label} to favorites`}
      >
        {isFav ? '⭐' : '☆'}
      </button>
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
    </div>
  )
}

function StatsModal({ allStats, onClose, onClear, xp, totalPlayedCount, totalWonCount }) {
  const closeRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    previousFocus.current = document.activeElement
    closeRef.current?.focus()
    function handleKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previousFocus.current?.focus() }
  }, [onClose])

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal" role="dialog" aria-modal="true" aria-labelledby="stats-dialog-title" onClick={e => e.stopPropagation()}>
        <h2 className="stats-title" id="stats-dialog-title">Your Stats</h2>
        <div className="stats-total">
          <span>{totalPlayedCount} games played</span>
          <span>{totalWonCount} won</span>
          <span>⭐ {xp.toLocaleString()} XP</span>
          {totalPlayedCount > 0 && <span>{Math.round((totalWonCount / totalPlayedCount) * 100)}% win rate</span>}
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
          <button className="stats-close" ref={closeRef} onClick={onClose}>Close</button>
          {totalPlayedCount > 0 && (
            <button className="stats-clear-btn" onClick={onClear}>🗑️ Clear All Stats</button>
          )}
        </div>
      </div>
    </div>
  )
}

function GamesDropdown({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="games-dropdown-wrap" ref={ref}>
      <button className="settings-btn games-dropdown-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox">
        🕹️ Games ▾
      </button>
      <div className={`theme-dropdown games-dropdown ${open ? 'open' : ''}`}>
        {GAMES.map(g => (
          <button key={g.id} className="theme-option" onClick={() => { setOpen(false); onNavigate(g.id) }}>
            <span className="theme-option-emoji">{g.emoji}</span>
            <span className="theme-option-name">{g.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const CLOAK_BLOCKED_KEYS = new Set([
  'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Escape',
])

function CloakScreen({ onBack }) {
  const [mode, setMode] = useState(() => getSaved('arcade-cloak', 'none'))
  const [url, setUrl] = useState(() => getSaved('arcade-cloak-url', 'https://'))
  const [title, setTitle] = useState(() => getSaved('arcade-cloak-title', ''))
  const [favicon, setFavicon] = useState(() => getSaved('arcade-cloak-favicon', ''))
  const [saved, setSaved] = useState(false)
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)
  const [panicUrl, setPanicUrl] = useState(() => getSaved('arcade-panic-url', 'https://'))
  const [panicSequence, setPanicSequence] = useState(() => {
    const saved = getSaved('arcade-panic-sequence', '')
    return saved ? saved.split(',') : []
  })
  const [recording, setRecording] = useState(false)
  const recordingRef = useRef(false)

  function keyDisplayName(code) {
    if (code.startsWith('Key')) return code.slice(3)
    if (code.startsWith('Digit')) return code.slice(5)
    if (code === 'Space') return 'Space'
    if (code.startsWith('Arrow')) return code.slice(5) + '↑'
    if (code === 'Escape') return 'Esc'
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift'
    if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl'
    if (code === 'AltLeft' || code === 'AltRight') return 'Alt'
    if (code === 'MetaLeft' || code === 'MetaRight') return 'Meta'
    return code
  }

  useEffect(() => {
    if (!recording) return
    function handleKey(e) {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Escape') { setRecording(false); recordingRef.current = false; return }
      if (e.code === 'Backspace') { setPanicSequence(prev => prev.slice(0, -1)); return }
      if (CLOAK_BLOCKED_KEYS.has(e.code)) return
      setPanicSequence(prev => [...prev, e.code])
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [recording])

  function openBlankWithArcade(cloakTitle, cloakFavicon) {
    const win = window.open('about:blank', '_blank')
    if (!win) return
    const base = window.location.origin
    let html = '<!doctype html>\n' + document.documentElement.outerHTML
    html = html.replace(/(href|src)="(\/[^"]+)"/g, (_, attr, path) => `${attr}="${base}${path}"`)
    html = html.replace('</head>', '<script>window.__ABOUT_BLANK__ = true</script></head>')
    if (cloakTitle) html = html.replace(/<title>[^<]*<\/title>/, `<title>${cloakTitle}</title>`)
    if (cloakFavicon) html = html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="${cloakFavicon}" />`)
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

  function handleSavePanic() {
    localStorage.setItem('arcade-panic-url', panicUrl)
    localStorage.setItem('arcade-panic-sequence', panicSequence.join(','))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClearPanic() {
    localStorage.removeItem('arcade-panic-url')
    localStorage.removeItem('arcade-panic-sequence')
    setPanicUrl('https://')
    setPanicSequence([])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleRevert() {
    localStorage.removeItem('arcade-cloak')
    localStorage.removeItem('arcade-cloak-url')
    localStorage.removeItem('arcade-cloak-title')
    localStorage.removeItem('arcade-cloak-favicon')
    localStorage.removeItem('arcade-panic-url')
    localStorage.removeItem('arcade-panic-sequence')
    setMode('none')
    setUrl('https://')
    setTitle('')
    setFavicon('')
    setPanicUrl('https://')
    setPanicSequence([])
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
            <input className="cloak-input" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://canvas.instructure.com" />
          </label>
          <label className="cloak-label">
            Tab Title <span className="cloak-optional">(for the about:blank tab)</span>
            <input className="cloak-input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Dashboard | Canvas LMS" />
          </label>
          <label className="cloak-label">
            Tab Favicon URL <span className="cloak-optional">(for the about:blank tab)</span>
            <input className="cloak-input" type="url" value={favicon} onChange={e => setFavicon(e.target.value)} placeholder="https://example.com/favicon.ico" />
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
        <button className={`cloak-save-btn ${mode === 'blank' ? 'cloak-active' : ''}`} onClick={handleEnableBlank}>
          {mode === 'blank' ? '✓ Active — Click to Re-open' : 'Open in about:blank'}
        </button>
      </div>
      <div className="cloak-section">
        <div className="cloak-section-header">
          <span className="cloak-section-emoji">🚨</span>
          <div>
            <h3 className="cloak-section-title">Panic Key</h3>
            <p className="cloak-section-desc">Press a key or sequence of keys to instantly redirect to a safe website.</p>
          </div>
        </div>
        <div className="cloak-inputs">
          <label className="cloak-label">
            Redirect URL
            <input className="cloak-input" type="url" value={panicUrl} onChange={e => setPanicUrl(e.target.value)} placeholder="https://google.com" />
          </label>
          <div className="cloak-label">
            Key Sequence
            <div className="panic-sequence-display">
              {panicSequence.length === 0 && !recording && <span className="panic-empty">No keys recorded</span>}
              {panicSequence.map((code, i) => (
                <span key={i} className="panic-key-chip">
                  {keyDisplayName(code)}
                  <button className="panic-key-remove" onClick={() => setPanicSequence(prev => prev.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
            </div>
            <div className="panic-record-row">
              <button
                className={`panic-record-btn ${recording ? 'recording' : ''}`}
                onClick={() => {
                  if (recording) { setRecording(false); recordingRef.current = false }
                  else { setPanicSequence([]); setRecording(true); recordingRef.current = true }
                }}
              >
                {recording ? '● Recording... (Esc to stop)' : 'Record Sequence'}
              </button>
              {panicSequence.length > 0 && !recording && <button className="panic-clear-btn" onClick={() => setPanicSequence([])}>Clear</button>}
            </div>
            <p className="panic-hint">Blocked: Space, Enter, Escape, Arrows, WASD, E, 1-4. Backspace removes last key.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="cloak-save-btn" onClick={handleSavePanic} disabled={!panicUrl || panicUrl === 'https://' || panicSequence.length === 0} style={{ flex: 1 }}>
            Save Panic Key
          </button>
          {(panicSequence.length > 0 || (panicUrl && panicUrl !== 'https://')) && (
            <button className="cloak-save-btn" onClick={handleClearPanic} style={{ flex: 'none', padding: '12px 20px', background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>Clear</button>
          )}
        </div>
      </div>
      <div className="cloak-section cloak-revert-section">
        <button className="cloak-revert-btn" onClick={() => setShowRevertConfirm(true)}>↩️ Revert to Normal</button>
        <p className="cloak-revert-desc">Clear all cloaking. The site will load normally.</p>
      </div>
      {saved && <div className="cloak-saved-toast">Settings saved!</div>}
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

function SettingsBar({ onHome, onNavigateGame, onCloak, onSettings, user, onSignIn, onSignOut }) {
  return (
    <div className="settings-bar-wrap">
      <div className="settings-bar">
        <div className="settings-bar-left">
          <button className="settings-btn home-btn" onClick={onHome} title="Home" aria-label="Home">🏠</button>
          <GamesDropdown onNavigate={onNavigateGame} />
          <button className="settings-btn" onClick={onCloak} title="Tab Cloaking" aria-label="Tab Cloaking">🎭</button>
        </div>
        <div className="settings-bar-right">
          {user && !user.isAnonymous && (
            <div className="user-badge">
              <span className="user-avatar">{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
              <span className="user-name">{user.displayName || user.email?.split('@')[0] || 'User'}</span>
            </div>
          )}
          {user && !user.isAnonymous ? (
            <button className="settings-btn" onClick={onSignOut} title="Sign Out" aria-label="Sign out">🚪</button>
          ) : (
            <button className="settings-btn" onClick={onSignIn} title="Sign In to Save Data" aria-label="Sign in">👤</button>
          )}
          <button className="settings-btn" onClick={onSettings} title="Settings" aria-label="Settings">⚙️</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [activeGame, setActiveGame] = useState(null)
  const [muted, setMuted] = useState(isMuted())
  const [showStats, setShowStats] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [theme, setTheme] = useState(() => getSaved('arcade-theme', 'neon'))
  const [animations, setAnimations] = useState(() => getSaved('arcade-animations', 'on') === 'on')
  const [glass, setGlass] = useState(() => getSaved('arcade-glass', 'on') === 'on')
  const [bg, setBg] = useState(() => getSaved('arcade-bg', 'on') === 'on')
  const [confirmNav, setConfirmNav] = useState(null)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [waveBar, setWaveBar] = useState(() => getSaved('arcade-wave-bar', 'on') === 'on')
  const [volume, setVolumeState] = useState(() => getVolume())
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [dailyCountdown, setDailyCountdown] = useState(getTimeUntilTomorrow())
  const [userId, setUserId] = useState(null)

  const {
    allStats, clearStats, xp, recent, favorites, setFavorite, isFavorite,
    newAchievements, markAchievementsSeen,
    markDailyCompleted, totalPlayedCount, totalWonCount,
  } = useStats('_global')

  const dailyGame = useMemo(() => {
    const dg = getDailyGame(ALL_GAME_IDS)
    return { ...dg, game: GAMES.find(g => g.id === dg.gameId) }
  }, [])

  const playDaily = useCallback(() => {
    markDailyCompleted()
    setActiveGame(dailyGame.gameId)
  }, [dailyGame.gameId, markDailyCompleted])

  useEffect(() => {
    const timer = setInterval(() => setDailyCountdown(getTimeUntilTomorrow()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const vars = THEMES[theme]?.vars || THEMES.neon.vars
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v)
    }
    try { localStorage.setItem('arcade-theme', theme) } catch {}
  }, [theme])

  useEffect(() => { document.documentElement.classList.toggle('no-animations', !animations); try { localStorage.setItem('arcade-animations', animations ? 'on' : 'off') } catch {} }, [animations])
  useEffect(() => { document.documentElement.classList.toggle('no-glass', !glass); try { localStorage.setItem('arcade-glass', glass ? 'on' : 'off') } catch {} }, [glass])
  useEffect(() => { document.documentElement.classList.toggle('no-bg', !bg); try { localStorage.setItem('arcade-bg', bg ? 'on' : 'off') } catch {} }, [bg])
  useEffect(() => { document.documentElement.classList.toggle('has-wave-bar', waveBar); try { localStorage.setItem('arcade-wave-bar', waveBar ? 'on' : 'off') } catch {} }, [waveBar])

  const [user, setUser] = useState(null)

  useEffect(() => {
    handleRedirectResult().catch(() => {})
    const unsub = onAuthChange((u) => {
      if (u) {
        const wasAnonymous = !user && u.metadata.creationTime === u.metadata.lastSignInTime
        setUser(u)
        setUserId(u.uid)
        if (wasAnonymous && !u.isAnonymous) {
          import('./leagueService').then(({ getOrCreatePlayer, getPlayer, updatePlayer }) => {
            getOrCreatePlayer(u.uid, u.displayName || u.email?.split('@')[0] || 'Player')
            const localXp = (() => { try { return JSON.parse(localStorage.getItem('arcade-stats') || '{}')._xp?.total || 0 } catch { return 0 } })()
            if (localXp > 0) {
              getPlayer(u.uid).then(p => {
                if (p && (p.xp || 0) < localXp) {
                  updatePlayer(u.uid, { xp: localXp })
                }
              })
            }
          }).catch(() => {})
        }
      } else {
        setUser(null)
        setUserId(null)
        import('./firebase').then(({ ensureAuth }) => {
          ensureAuth().then(u => { if (u) { setUser(u); setUserId(u.uid) } })
        }).catch(() => {})
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    function handleWin(e) {
      setShowConfetti(true)
      if (userId && e.detail?.gameId) {
        import('./leagueService').then(({ updatePlayer, getPlayer, increment }) => {
          getPlayer(userId).then(p => {
            if (p) {
              const xp = calculateWinXP(e.detail.gameId, p.streak || 0)
              updatePlayer(userId, { xp: increment(xp), wins: increment(1), streak: increment(1) })
            }
          })
        }).catch(() => {})
      }
    }
    window.addEventListener('arcade-win', handleWin)
    return () => window.removeEventListener('arcade-win', handleWin)
  }, [userId])

  useEffect(() => {
    function handleGameComplete(e) {
      if (!userId) return
      const { won } = e.detail || {}
        import('./leagueService').then(({ getPlayer, updatePlayer, ensurePlayerInLeague, increment }) => {
          getPlayer(userId).then(p => {
            if (!p) return
            if (!p.leagueInstanceId) {
              ensurePlayerInLeague(userId).catch(() => {})
            }
            if (!won) {
              updatePlayer(userId, { losses: increment(1), streak: 0 }).catch(() => {})
            }
        })
      }).catch(() => {})
    }
    window.addEventListener('arcade-game-complete', handleGameComplete)
    return () => window.removeEventListener('arcade-game-complete', handleGameComplete)
  }, [userId])

  useEffect(() => {
    if (newAchievements.length > 0) {
      setShowAchievements(true)
      markAchievementsSeen()
    }
  }, [newAchievements, markAchievementsSeen])

  useEffect(() => {
    let buf = []
    let lastTime = 0
    const TIMEOUT = 2000
    function handleKey(e) {
      const seq = getSaved('arcade-panic-sequence', '')
      const url = getSaved('arcade-panic-url', '')
      if (!seq || !url || url === 'https://') return
      const sequence = seq.split(',')
      const now = Date.now()
      if (now - lastTime > TIMEOUT) buf = []
      lastTime = now
      buf.push(e.code)
      if (buf.length >= sequence.length) {
        const tail = buf.slice(-sequence.length)
        if (tail.every((k, i) => k === sequence[i])) { buf = []; window.location.replace(url) }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (activeGame || currentPage !== 'home') return
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const idx = GAMES.findIndex(g => g.id === activeGame)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = idx < GAMES.length - 1 ? idx + 1 : 0
        setActiveGame(GAMES[next].id)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = idx > 0 ? idx - 1 : GAMES.length - 1
        setActiveGame(GAMES[prev].id)
      } else if (e.key === 'Escape' && activeGame) {
        e.preventDefault()
        if (isPlaying) setConfirmNav({ type: 'home' })
        else setActiveGame(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeGame, isPlaying, currentPage])

  function handleMuteToggle() { toggleMute(); setMuted(isMuted()) }

  function handleVolumeChange(val) {
    setVolume(val)
    setVolumeState(val)
  }

  function handleHome() {
    setShowConfetti(false)
    if (isPlaying) setConfirmNav({ type: 'home' })
    else { setActiveGame(null); setCurrentPage('home') }
  }

  function handleNavigateGame(gameId) {
    setShowConfetti(false)
    if (isPlaying && activeGame !== gameId) setConfirmNav({ type: 'game', gameId })
    else { setActiveGame(gameId); setCurrentPage('home') }
  }

  function confirmNavAction() {
    setShowConfetti(false)
    if (confirmNav.type === 'home') { setActiveGame(null); setIsPlaying(false); setCurrentPage('home') }
    else if (confirmNav.type === 'game') { setActiveGame(confirmNav.gameId); setIsPlaying(false); setCurrentPage('home') }
    setConfirmNav(null)
  }

  const filteredGames = useMemo(() => {
    let list = [...GAMES]
    if (category !== 'all') list = list.filter(g => g.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g => g.label.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q))
    }
    const favIds = new Set(favorites)
    const favs = list.filter(g => favIds.has(g.id))
    const rest = list.filter(g => !favIds.has(g.id))
    return [...favs, ...rest]
  }, [category, search, favorites])

  const recentGames = useMemo(() => {
    return recent.map(id => GAMES.find(g => g.id === id)).filter(Boolean)
  }, [recent])

  const settings = {
    onHome: handleHome,
    onNavigateGame: handleNavigateGame,
    onCloak: () => setCurrentPage('cloak'),
    onSettings: () => setCurrentPage('settings'),
    user,
    onSignIn: () => setCurrentPage('signin'),
    onSignOut: () => signOut().catch(() => {}),
  }

  if (currentPage === 'settings') {
    return (
      <div>
        {waveBar && <div className="wave-bar" aria-hidden="true" />}
        <SettingsPage onBack={() => setCurrentPage('home')} muted={muted} onMuteToggle={handleMuteToggle} theme={theme} onThemeChange={setTheme} animations={animations} onAnimToggle={() => setAnimations(a => !a)} glass={glass} onGlassToggle={() => setGlass(g => !g)} bg={bg} onBgToggle={() => setBg(b => !b)} waveBar={waveBar} onWaveBarToggle={() => setWaveBar(w => !w)} volume={volume} onVolumeChange={handleVolumeChange} onCloak={() => setCurrentPage('cloak')} user={user} onSignIn={() => setCurrentPage('signin')} onSignOut={() => signOut().catch(() => {})} />
        {showStats && <StatsModal allStats={allStats} xp={xp} totalPlayedCount={totalPlayedCount} totalWonCount={totalWonCount} onClose={() => setShowStats(false)} onClear={() => { setShowStats(false); setShowConfirmClear(true) }} />}
        {showAchievements && <AchievementsModal earnedIds={ACHIEVEMENTS.filter(a => a.check(allStats)).map(a => a.id)} onClose={() => setShowAchievements(false)} />}
        {showConfirmClear && <ConfirmModal message="This will permanently delete all your stats. Are you sure?" confirmText="Clear Stats" cancelText="Cancel" onConfirm={() => { clearStats(); setShowConfirmClear(false) }} onCancel={() => setShowConfirmClear(false)} />}
      </div>
    )
  }

  if (currentPage === 'signin') {
    return (
      <div>
        {waveBar && <div className="wave-bar" aria-hidden="true" />}
        <SignInPage onBack={() => setCurrentPage('home')} />
      </div>
    )
  }

  if (currentPage === 'leagues') {
    return (
      <div>
        {waveBar && <div className="wave-bar" aria-hidden="true" />}
        <LeagueScreen onBack={() => setCurrentPage('home')} userId={userId} onPlayGame={(id) => { setCurrentPage('home'); setActiveGame(id) }} />
        {showStats && <StatsModal allStats={allStats} xp={xp} totalPlayedCount={totalPlayedCount} totalWonCount={totalWonCount} onClose={() => setShowStats(false)} onClear={() => { setShowStats(false); setShowConfirmClear(true) }} />}
        {showAchievements && <AchievementsModal earnedIds={ACHIEVEMENTS.filter(a => a.check(allStats)).map(a => a.id)} onClose={() => setShowAchievements(false)} />}
        {showConfirmClear && <ConfirmModal message="This will permanently delete all your stats. Are you sure?" confirmText="Clear Stats" cancelText="Cancel" onConfirm={() => { clearStats(); setShowConfirmClear(false) }} onCancel={() => setShowConfirmClear(false)} />}
      </div>
    )
  }

  if (currentPage === 'cloak') {
    return (
      <div>
        {waveBar && <div className="wave-bar" aria-hidden="true" />}
        <CloakScreen onBack={() => setCurrentPage('home')} />
      </div>
    )
  }

  if (activeGame) {
    const game = GAMES.find(g => g.id === activeGame)
    const ActiveComponent = game.component
    return (
      <div>
        {waveBar && <div className="wave-bar" aria-hidden="true" />}
        <SettingsBar {...settings} />
        <header className="arcade-header">
          <h1 className="arcade-title">ARCADE GAMES</h1>
        </header>
        <nav className="tab-bar">
          <button className="tab-btn back-btn" onClick={handleHome}>← Back to Games</button>
          {GAMES.map(g => (
            <button key={g.id} className={`tab-btn ${activeGame === g.id ? 'active' : ''}`} onClick={() => handleNavigateGame(g.id)}>
              {g.emoji} {g.label}
            </button>
          ))}
        </nav>
        <main className="game-container">
          <ActiveComponent key={activeGame} onPlayingChange={setIsPlaying} />
        </main>
        <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
        {showStats && <StatsModal allStats={allStats} xp={xp} totalPlayedCount={totalPlayedCount} totalWonCount={totalWonCount} onClose={() => setShowStats(false)} onClear={() => { setShowStats(false); setShowConfirmClear(true) }} />}
        {showAchievements && <AchievementsModal earnedIds={ACHIEVEMENTS.filter(a => a.check(allStats)).map(a => a.id)} onClose={() => setShowAchievements(false)} />}
        {confirmNav && <ConfirmModal message="You're in the middle of a game. Are you sure you want to leave?" onConfirm={confirmNavAction} onCancel={() => setConfirmNav(null)} />}
        {showConfirmClear && <ConfirmModal message="This will permanently delete all your stats. Are you sure?" confirmText="Clear Stats" cancelText="Cancel" onConfirm={() => { clearStats(); setShowConfirmClear(false) }} onCancel={() => setShowConfirmClear(false)} />}
      </div>
    )
  }

  return (
    <div>
      {waveBar && <div className="wave-bar" aria-hidden="true" />}
      <SettingsBar {...settings} />
      <header className="arcade-header">
        <h1 className="arcade-title">ARCADE GAMES</h1>
        <p className="arcade-subtitle">Pick a game and challenge the bot!</p>
        <div className="xp-bar">
          <span className="xp-badge">⭐ {xp.toLocaleString()} XP</span>
          <span className="xp-detail">{totalPlayedCount} played · {totalWonCount} won</span>
        </div>
        <div className="home-action-bar">
          <button className="home-action-btn" onClick={() => setShowAchievements(true)} title="Achievements" aria-label="View achievements">🏅 Achievements</button>
          <button className="home-action-btn" onClick={() => setCurrentPage('leagues')} title="Leagues" aria-label="View leagues">⚔️ Leagues</button>
          <button className="home-action-btn" onClick={() => setShowStats(true)} title="Stats" aria-label="View statistics">📊 Stats</button>
          {user && user.isAnonymous && (
            <button className="home-action-btn signin-prompt" onClick={() => setCurrentPage('signin')} title="Sign in to save data" aria-label="Sign in">☁️ Sign In</button>
          )}
        </div>
      </header>
      <main className="game-container">
        {recentGames.length > 0 && (
          <div className="recent-section">
            <h3 className="section-title">🕐 Continue Playing</h3>
            <div className="recent-row">
              {recentGames.map(g => (
                <button key={g.id} className="recent-card" onClick={() => setActiveGame(g.id)} style={{ '--card-accent': g.color }}>
                  <span className="recent-emoji">{g.emoji}</span>
                  <span className="recent-label">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {dailyGame.game && (
          <div className="daily-challenge" onClick={playDaily}>
            <div className="daily-left">
              <span className="daily-emoji">📅</span>
              <div>
                <div className="daily-label">Daily Challenge</div>
                <div className="daily-game-name">{dailyGame.game.emoji} {dailyGame.game.label} — {dailyGame.difficulty}</div>
              </div>
            </div>
            <div className="daily-right">
              <div className="daily-countdown">{formatCountdown(dailyCountdown)}</div>
              <div className="daily-hint">Resets tomorrow</div>
            </div>
          </div>
        )}
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search games"
          />
          {search && <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
        </div>
        <div className="category-tabs" role="tablist">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`category-tab ${category === c.id ? 'active' : ''}`}
              onClick={() => setCategory(c.id)}
              role="tab"
              aria-selected={category === c.id}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        {filteredGames.length === 0 ? (
          <div className="no-results">No games found</div>
        ) : (
          <div className="game-select-grid">
            {filteredGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                stats={allStats}
                isFav={isFavorite(game.id)}
                onFavToggle={setFavorite}
                onClick={() => setActiveGame(game.id)}
              />
            ))}
          </div>
        )}
      </main>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      {showStats && <StatsModal allStats={allStats} xp={xp} totalPlayedCount={totalPlayedCount} totalWonCount={totalWonCount} onClose={() => setShowStats(false)} onClear={() => { setShowStats(false); setShowConfirmClear(true) }} />}
      {showAchievements && <AchievementsModal earnedIds={ACHIEVEMENTS.filter(a => a.check(allStats)).map(a => a.id)} onClose={() => setShowAchievements(false)} />}
      {showConfirmClear && <ConfirmModal message="This will permanently delete all your stats. Are you sure?" confirmText="Clear Stats" cancelText="Cancel" onConfirm={() => { clearStats(); setShowConfirmClear(false) }} onCancel={() => setShowConfirmClear(false)} />}
    </div>
  )
}

export default App
