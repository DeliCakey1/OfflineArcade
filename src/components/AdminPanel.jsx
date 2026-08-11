import { useState, useEffect, useRef, useMemo } from 'react'
import useSound from '../useSound'
import {
  verifyPassword,
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin,
  canAttemptLogin,
  setLoginCooldown,
  getRemainingCooldown,
} from '../adminAuth'
import { resetAllScores, searchPlayersByName, getPlayer, updatePlayer, scheduleTournament, getLatestTournamentForAdmin, cancelTournament, getShopSale, setShopSale, getAnnouncement, setAnnouncement, getChatControls, setChatControls, getAnalytics, setBlacklist, setModeration, clearModeration, getModerationOverview } from '../leagueService'
import { TITLES, ALL_NAMEPLATES, TOURNAMENT_TICKET, SALE_PERCENT_OPTIONS } from '../shopItems'
import { getNextWednesdayMidnightUTC } from '../leagues'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function buildWednesdayOptions() {
  const now = new Date()
  const upper = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, now.getUTCDate())).getTime()
  const opts = []
  let ts = getNextWednesdayMidnightUTC()
  while (ts <= upper) {
    opts.push({ ts, isNext: opts.length === 0 })
    ts += WEEK_MS
  }
  return opts
}

function formatWeekOption(ts, isNext) {
  const label = new Date(ts).toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  return isNext ? `Next Wednesday · ${label}` : label
}

function formatTournamentStart(ts) {
  return new Date(ts).toLocaleString()
}

const TOURNAMENT_STAGE_LABELS = {
  tournament: 'God Tournament',
  semiFinals: 'Semi-Finals',
  finals: 'Finals',
}

const SALE_GROUPS = [
  { id: 'all', label: 'All items' },
  { id: 'titles', label: '🏷️ Titles' },
  { id: 'colors', label: '🎨 Colors' },
  { id: 'gradients', label: '🌈 Gradients' },
  { id: 'borders', label: '🔲 Borders' },
  { id: 'effects', label: '✨ Effects' },
  { id: 'tickets', label: '🎫 Tickets' },
]

function isValidSalePercent(p) {
  return typeof p === 'number' && p > 0 && p < 100
}

const ADMIN_MENU = [
  { id: 'coins', emoji: '🪙', title: 'My Coins', desc: 'Add or remove coins from your own account' },
  { id: 'target', emoji: '🎯', title: 'Give / Remove Coins', desc: 'Search a player and adjust their coins' },
  { id: 'tournament', emoji: '🏟️', title: 'Weekly Tournament', desc: 'Schedule or cancel the God Tournament' },
  { id: 'sale', emoji: '🛒', title: 'Shop Discounts', desc: 'Put shop items on sale' },
  { id: 'controls', emoji: '🎮', title: 'Game Controls', desc: 'Announcement banner and chat on/off' },
  { id: 'analytics', emoji: '📈', title: 'Analytics', desc: 'Live stats on players, coins, and activity' },
  { id: 'moderation', emoji: '🛡️', title: 'Player Moderation', desc: 'Warn or ban players with bad usernames' },
  { id: 'reset', emoji: '💥', title: 'Reset All Scores', desc: 'Wipe all stats, coins, leagues, and tournaments' },
]

const ADMIN_MENU_TITLES = {
  coins: 'My Coins',
  target: 'Give / Remove Coins',
  tournament: 'Weekly Tournament',
  sale: 'Shop Discounts',
  controls: 'Game Controls',
  analytics: 'Analytics',
  moderation: 'Player Moderation',
  reset: 'Reset All Scores',
}

const BAN_DURATIONS = [
  { id: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
  { id: '6h', label: '6 hours', ms: 6 * 60 * 60 * 1000 },
  { id: '1d', label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { id: '3d', label: '3 days', ms: 3 * 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30 days', ms: 30 * 24 * 60 * 60 * 1000 },
]

function formatModerationStatus(mod) {
  if (!mod) return null
  if (mod.type === 'permanent') return { label: 'Permanently banned', emoji: '🚫', tone: 'ban' }
  if (mod.type === 'temp') {
    const active = mod.until > Date.now()
    return { label: active ? `Banned until ${new Date(mod.until).toLocaleString()}` : 'Temp ban expired', emoji: '⏳', tone: active ? 'ban' : 'ok' }
  }
  return { label: 'Warned', emoji: '⚠️', tone: 'warn' }
}

export default function AdminPanel({ userId }) {
  const [authenticated, setAuthenticated] = useState(isAdminLoggedIn())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirming, setResetConfirming] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState('')
  const [myCoins, setMyCoins] = useState(null)
  const [myCoinsLoading, setMyCoinsLoading] = useState(false)
  const [myCoinAmount, setMyCoinAmount] = useState('')
  const [myCoinDone, setMyCoinDone] = useState('')
  const [myCoinError, setMyCoinError] = useState('')
  const [targetUsername, setTargetUsername] = useState('')
  const [targetResults, setTargetResults] = useState([])
  const [targetPlayer, setTargetPlayer] = useState(null)
  const [targetLoading, setTargetLoading] = useState(false)
  const [targetError, setTargetError] = useState('')
  const [targetCoinAmount, setTargetCoinAmount] = useState('')
  const [targetActionLoading, setTargetActionLoading] = useState('')
  const [targetDone, setTargetDone] = useState('')
  const [tournament, setTournament] = useState(null)
  const [scheduleStart, setScheduleStart] = useState('')
  const [tournamentLoading, setTournamentLoading] = useState(false)
  const [tournamentError, setTournamentError] = useState('')
  const [tournamentDone, setTournamentDone] = useState('')
  const [cancelConfirming, setCancelConfirming] = useState(false)
  const [saleItems, setSaleItems] = useState({})
  const [saleDraft, setSaleDraft] = useState({})
  const [saleGroup, setSaleGroup] = useState('all')
  const [saleSaving, setSaleSaving] = useState(false)
  const [saleDone, setSaleDone] = useState('')
  const [saleError, setSaleError] = useState('')
  const [controlsLoading, setControlsLoading] = useState(false)
  const [controlsSaving, setControlsSaving] = useState(false)
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementEnabled, setAnnouncementEnabled] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [controlsDone, setControlsDone] = useState('')
  const [controlsError, setControlsError] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [modLoading, setModLoading] = useState(false)
  const [blacklistWords, setBlacklistWords] = useState([])
  const [blacklistInput, setBlacklistInput] = useState('')
  const [blacklistSaving, setBlacklistSaving] = useState(false)
  const [needsAttention, setNeedsAttention] = useState([])
  const [modTarget, setModTarget] = useState(null)
  const [modAction, setModAction] = useState('')
  const [modReason, setModReason] = useState('')
  const [modDuration, setModDuration] = useState('1d')
  const [modBusy, setModBusy] = useState(false)
  const [modDone, setModDone] = useState('')
  const [modError, setModError] = useState('')
  const [adminPage, setAdminPage] = useState('menu')
  const inputRef = useRef(null)
  const sound = useSound()

  useEffect(() => {
    if (!authenticated && inputRef.current) {
      inputRef.current.focus()
    }
  }, [authenticated])

  useEffect(() => {
    if (authenticated && userId) {
      setMyCoinsLoading(true)
      getPlayer(userId).then(p => {
        setMyCoins(p?.coins || 0)
        setMyCoinsLoading(false)
      }).catch(() => setMyCoinsLoading(false))
    }
  }, [authenticated, userId])

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    getLatestTournamentForAdmin().then(t => {
      if (cancelled) return
      setTournament(t)
      if (!t) setScheduleStart(buildWednesdayOptions()[0]?.ts ?? null)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    getShopSale().then(sale => {
      if (cancelled) return
      const items = sale?.items || {}
      setSaleItems(items)
      setSaleDraft({ ...items })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    setControlsLoading(true)
    Promise.all([getAnnouncement(), getChatControls()]).then(([ann, chat]) => {
      if (cancelled) return
      setAnnouncementText(ann?.text || '')
      setAnnouncementEnabled(!!ann?.enabled)
      setChatEnabled(chat?.enabled !== false)
      setControlsLoading(false)
    }).catch(() => setControlsLoading(false))
    return () => { cancelled = true }
  }, [authenticated])

  async function handleLoadModeration() {
    setModLoading(true)
    setModError('')
    setModDone('')
    try {
      const overview = await getModerationOverview()
      setBlacklistWords(overview.blacklist)
      setNeedsAttention(overview.needsAttention)
    } catch (err) {
      setModError(err.message || 'Failed to load moderation data.')
    }
    setModLoading(false)
  }

  useEffect(() => {
    if (!authenticated || adminPage !== 'moderation') return
    handleLoadModeration()
  }, [authenticated, adminPage])

  const saleItemList = useMemo(() => {
    const items = []
    for (const t of TITLES) items.push({ id: t.id, name: t.name, emoji: t.emoji, price: t.price, group: 'titles' })
    for (const np of ALL_NAMEPLATES) {
      const group = np.type === 'solid' ? 'colors' : np.type === 'gradient' ? 'gradients' : np.type === 'border' ? 'borders' : 'effects'
      items.push({ id: np.id, name: np.name, emoji: '✨', price: np.price, group })
    }
    items.push({ id: TOURNAMENT_TICKET.id, name: TOURNAMENT_TICKET.name, emoji: TOURNAMENT_TICKET.emoji, price: TOURNAMENT_TICKET.price, group: 'tickets' })
    return items
  }, [])

  const filteredSaleItems = useMemo(() => saleItemList.filter(it => saleGroup === 'all' || it.group === saleGroup), [saleItemList, saleGroup])

  const activeSaleCount = useMemo(() => Object.values(saleItems).filter(isValidSalePercent).length, [saleItems])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => Math.max(0, c - 100)), 100)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleLogin(e) {
    e.preventDefault()
    if (!canAttemptLogin()) {
      const remaining = getRemainingCooldown()
      setCooldown(remaining)
      setError(`Too many attempts. Wait ${Math.ceil(remaining / 1000)}s.`)
      return
    }

    setLoading(true)
    setError('')

    const valid = await verifyPassword(password)
    if (valid) {
      loginAdmin()
      setAuthenticated(true)
      setPassword('')
      sound('cash')
    } else {
      setLoginCooldown()
      setCooldown(getRemainingCooldown())
      setError('Incorrect password.')
      setPassword('')
      sound('lose')
    }
    setLoading(false)
  }

  function handleLogout() {
    logoutAdmin()
    setAuthenticated(false)
    setPassword('')
    setMyCoins(null)
    sound('click')
  }

  async function handleMyCoinAction(action) {
    const amount = parseInt(myCoinAmount)
    if (!amount || amount <= 0 || !userId) return
    setMyCoinDone('')
    setMyCoinError('')
    try {
      const player = await getPlayer(userId)
      const current = player?.coins || 0
      const newCoins = action === 'add' ? current + amount : Math.max(0, current - amount)
      await updatePlayer(userId, { coins: newCoins })
      setMyCoins(newCoins)
      setMyCoinDone(`${action === 'add' ? 'Added' : 'Removed'} ${amount} coins`)
      setMyCoinAmount('')
      sound('cash')
    } catch (err) {
      setMyCoinError(err.message || 'Failed')
      sound('lose')
    }
  }

  async function handleResetAllScores() {
    if (resetting) return
    setResetting(true)
    setResetError('')
    setResetDone(false)
    try {
      await resetAllScores(userId)
      setResetDone(true)
      setResetConfirming(false)
      sound('cash')
    } catch (e) {
      setResetError(e.message || 'Reset failed')
      sound('lose')
    }
    setResetting(false)
  }

  async function handleTargetLookup(e) {
    e.preventDefault()
    const name = targetUsername.trim().toLowerCase()
    if (!name) return
    setTargetLoading(true)
    setTargetError('')
    setTargetResults([])
    setTargetPlayer(null)
    setTargetDone('')
    try {
      const results = await searchPlayersByName(name)
      if (results.length === 0) {
        setTargetError('No players found.')
      } else {
        setTargetResults(results)
      }
    } catch (err) {
      setTargetError(err.message || 'Lookup failed.')
    }
    setTargetLoading(false)
  }

  function handleSelectTarget(player) {
    setTargetPlayer(player)
    setTargetResults([])
    setTargetUsername('')
    setTargetDone('')
  }

  async function handleTargetCoinAction(action) {
    const amount = parseInt(targetCoinAmount)
    if (!amount || amount <= 0 || !targetPlayer) return
    setTargetActionLoading(action)
    setTargetDone('')
    setTargetError('')
    try {
      const player = await getPlayer(targetPlayer.id)
      const current = player?.coins || 0
      const newCoins = action === 'add' ? current + amount : Math.max(0, current - amount)
      await updatePlayer(targetPlayer.id, { coins: newCoins })
      setTargetPlayer(prev => prev ? { ...prev, coins: newCoins } : prev)
      setTargetDone(`${action === 'add' ? 'Added' : 'Removed'} ${amount} coins from @${targetPlayer.username}`)
      setTargetCoinAmount('')
      sound('cash')
    } catch (err) {
      setTargetError(err.message || 'Action failed.')
      sound('lose')
    }
    setTargetActionLoading('')
  }

  async function doSchedule(ts) {
    setTournamentLoading(true)
    setTournamentError('')
    setTournamentDone('')
    try {
      const t = await scheduleTournament(ts)
      setTournament(t)
      setTournamentDone(`Scheduled for ${formatTournamentStart(t.startsAt)}`)
      sound('cash')
    } catch (err) {
      setTournamentError(err.message || 'Failed to schedule tournament.')
      sound('lose')
    }
    setTournamentLoading(false)
  }

  async function handleScheduleTournament(e) {
    e.preventDefault()
    const ts = Number(scheduleStart)
    if (!ts || isNaN(ts) || ts <= Date.now()) { setTournamentError('Pick a valid week to start.'); return }
    await doSchedule(ts)
  }

  async function handleQuickSchedule() {
    const next = buildWednesdayOptions()[0]?.ts
    if (!next || next <= Date.now()) return
    await doSchedule(next)
  }

  async function handleCancelTournament() {
    if (!tournament) return
    setTournamentLoading(true)
    setTournamentError('')
    setTournamentDone('')
    try {
      await cancelTournament(tournament.id)
      setTournament(null)
      setCancelConfirming(false)
      setScheduleStart(buildWednesdayOptions()[0]?.ts ?? null)
      setTournamentDone('Tournament cancelled.')
      sound('cash')
    } catch (err) {
      setTournamentError(err.message || 'Failed to cancel tournament.')
      sound('lose')
    }
    setTournamentLoading(false)
  }

  function handleSaleSet(itemId, value) {
    const pct = parseInt(value, 10)
    setSaleDraft(prev => {
      const next = { ...prev }
      if (isValidSalePercent(pct)) next[itemId] = pct
      else delete next[itemId]
      return next
    })
    setSaleDone('')
    sound('click')
  }

  function handleClearSale() {
    setSaleDraft({})
    setSaleDone('')
    sound('click')
  }

  async function handleSaveSale() {
    setSaleSaving(true)
    setSaleError('')
    setSaleDone('')
    try {
      const cleaned = {}
      for (const [id, pct] of Object.entries(saleDraft)) {
        if (isValidSalePercent(pct)) cleaned[id] = Math.round(pct)
      }
      await setShopSale(cleaned)
      setSaleItems(cleaned)
      setSaleDraft({ ...cleaned })
      const count = Object.keys(cleaned).length
      setSaleDone(count > 0 ? `Sale saved: ${count} item${count === 1 ? '' : 's'} on discount.` : 'Sale cleared. No items discounted.')
      sound('cash')
    } catch (err) {
      setSaleError(err.message || 'Failed to save sale.')
      sound('lose')
    }
    setSaleSaving(false)
  }

  async function handleSaveControls() {
    setControlsSaving(true)
    setControlsError('')
    setControlsDone('')
    try {
      await Promise.all([
        setAnnouncement(announcementText, announcementEnabled),
        setChatControls(chatEnabled),
      ])
      setControlsDone('Controls saved. Changes are live for all players.')
      sound('cash')
    } catch (err) {
      setControlsError(err.message || 'Failed to save controls.')
      sound('lose')
    }
    setControlsSaving(false)
  }

  async function handleLoadAnalytics() {
    setAnalyticsLoading(true)
    setAnalyticsError('')
    setAnalytics(null)
    try {
      const data = await getAnalytics()
      setAnalytics(data)
    } catch (err) {
      setAnalyticsError(err.message || 'Failed to load analytics.')
    }
    setAnalyticsLoading(false)
  }

  function handleAddBlacklistWord() {
    const word = blacklistInput.trim().toLowerCase()
    if (!word) return
    if (!blacklistWords.includes(word)) setBlacklistWords(prev => [...prev, word])
    setBlacklistInput('')
    setModDone('')
    sound('click')
  }

  function handleRemoveBlacklistWord(word) {
    setBlacklistWords(prev => prev.filter(w => w !== word))
    setModDone('')
    sound('click')
  }

  async function handleSaveBlacklist() {
    setBlacklistSaving(true)
    setModError('')
    setModDone('')
    try {
      const res = await setBlacklist(blacklistWords)
      setBlacklistWords(res.words)
      setModDone(`Blacklist saved: ${res.words.length} word${res.words.length === 1 ? '' : 's'}.`)
      sound('cash')
    } catch (err) {
      setModError(err.message || 'Failed to save blacklist.')
      sound('lose')
    }
    setBlacklistSaving(false)
  }

  function openModTarget(player, mod) {
    setModTarget({ player, moderation: mod })
    setModAction('')
    setModReason('')
    setModDuration('1d')
    setModDone('')
    setModError('')
  }

  async function handleModSubmit(action) {
    if (!modTarget) return
    if (action !== 'warn' && !modReason.trim()) {
      setModError('Please enter a reason for the ban.')
      return
    }
    setModBusy(true)
    setModError('')
    setModDone('')
    try {
      const targetName = modTarget.player.username || modTarget.player.name || 'unknown'
      let result
      if (action === 'warn') {
        result = await setModeration(modTarget.player.id, { type: 'warn', reason: modReason.trim() || 'No reason given', until: null, issuedBy: userId, username: targetName })
      } else if (action === 'temp') {
        const dur = BAN_DURATIONS.find(d => d.id === modDuration)
        result = await setModeration(modTarget.player.id, { type: 'temp', reason: modReason.trim(), until: Date.now() + (dur?.ms || BAN_DURATIONS[2].ms), issuedBy: userId, username: targetName })
      } else {
        result = await setModeration(modTarget.player.id, { type: 'permanent', reason: modReason.trim(), until: null, issuedBy: userId, username: targetName })
      }
      const nextMod = { userId: modTarget.player.id, ...result }
      setModTarget(prev => prev ? { player: prev.player, moderation: nextMod } : prev)
      setModDone(action === 'warn' ? `Warning issued to @${targetName}.` : action === 'temp' ? `Temp ban applied to @${targetName}.` : `@${targetName} is now permanently banned.`)
      setModAction('')
      setModReason('')
      sound('cash')
    } catch (err) {
      setModError(err.message || 'Action failed.')
      sound('lose')
    }
    setModBusy(false)
  }

  async function handleModLift() {
    if (!modTarget) return
    setModBusy(true)
    setModError('')
    setModDone('')
    try {
      await clearModeration(modTarget.player.id)
      setModTarget(prev => prev ? { player: prev.player, moderation: null } : prev)
      setModDone(`Moderation cleared for @${modTarget.player.username || modTarget.player.name || 'unknown'}.`)
      setModAction('')
      setModReason('')
      sound('cash')
    } catch (err) {
      setModError(err.message || 'Failed to clear moderation.')
      sound('lose')
    }
    setModBusy(false)
  }

  if (!authenticated) {
    return (
      <div className="full-page">
        <div className="full-page-header">
          <h2 className="full-page-title">🔒 Admin Panel</h2>
        </div>
        <div className="admin-login-container">
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="admin-lock-icon">🔐</div>
            <h3 className="admin-login-title">Admin Access</h3>
            <p className="admin-login-subtitle">Enter the admin key to continue.</p>
            <input
              ref={inputRef}
              type="password"
              className="admin-password-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin key..."
              disabled={loading || cooldown > 0}
              autoComplete="off"
            />
            {error && (
              <div className="admin-error">{error}</div>
            )}
            <button
              type="submit"
              className="admin-login-btn"
              disabled={loading || cooldown > 0 || !password}
            >
              {loading ? 'Verifying...' : cooldown > 0 ? `Wait ${Math.ceil(cooldown / 1000)}s...` : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="full-page">
      <div className="full-page-header">
        <h2 className="full-page-title">🔒 Admin Panel</h2>
      </div>
      <div className="admin-dashboard">
        {adminPage === 'menu' ? (
          <>
            <div className="admin-welcome">
              <span className="admin-badge-large">👑</span>
              <h3>Welcome, Admin</h3>
              <p>Pick a section to get started.</p>
            </div>
            <div className="admin-menu-grid">
              {ADMIN_MENU.map(item => (
                <button
                  key={item.id}
                  className={`admin-menu-card ${item.id === 'reset' ? 'admin-menu-danger' : ''}`}
                  onClick={() => { setAdminPage(item.id); sound('click') }}
                >
                  <span className="admin-menu-emoji">{item.emoji}</span>
                  <span className="admin-menu-title">{item.title}</span>
                  <span className="admin-menu-desc">{item.desc}</span>
                  <span className="admin-menu-arrow">→</span>
                </button>
              ))}
            </div>
            <button className="admin-logout-btn" onClick={handleLogout}>
              🚪 Lock Admin Panel
            </button>
          </>
        ) : (
          <>
            <div className="admin-sub-header">
              <button className="quit-btn" onClick={() => { setAdminPage('menu'); sound('click') }}>
                ← Admin Menu
              </button>
              <h3 className="admin-sub-title">{ADMIN_MENU_TITLES[adminPage]}</h3>
            </div>

            {adminPage === 'coins' && (
              <div className="admin-section-card admin-page-body">
                <span className="admin-section-emoji">🪙</span>
                <h4>My Coins</h4>
                <div className="admin-my-coins">
                  <span className="admin-my-coins-amount">{myCoinsLoading ? '...' : `🪙 ${(myCoins || 0).toLocaleString()}`}</span>
                </div>
                <div className="admin-my-coins-actions">
                  <input
                    type="number"
                    className="admin-coin-amount-input"
                    value={myCoinAmount}
                    onChange={e => setMyCoinAmount(e.target.value)}
                    placeholder="Amount"
                    min="1"
                  />
                  <button
                    className="admin-coin-action-btn admin-coin-give"
                    onClick={() => handleMyCoinAction('add')}
                    disabled={!myCoinAmount}
                  >
                    + Add
                  </button>
                  <button
                    className="admin-coin-action-btn admin-coin-remove"
                    onClick={() => handleMyCoinAction('remove')}
                    disabled={!myCoinAmount}
                  >
                    - Remove
                  </button>
                </div>
                {myCoinDone && <p className="admin-reset-success">{myCoinDone}</p>}
                {myCoinError && <p className="admin-reset-error">{myCoinError}</p>}
              </div>
            )}

            {adminPage === 'target' && (
              <div className="admin-section-card admin-page-body">
                <span className="admin-section-emoji">🎯</span>
                <h4>Give / Remove Coins</h4>
                <p>Search for a player, select them, then give or remove coins.</p>
                <form onSubmit={handleTargetLookup} className="admin-coin-search">
                  <input
                    type="text"
                    className="admin-coin-input"
                    value={targetUsername}
                    onChange={e => setTargetUsername(e.target.value)}
                    placeholder="Search by username..."
                  />
                  <button type="submit" className="admin-coin-search-btn" disabled={targetLoading || !targetUsername.trim()}>
                    {targetLoading ? '...' : '🔍'}
                  </button>
                </form>
                {targetError && <p className="admin-reset-error">{targetError}</p>}
                {targetDone && <p className="admin-reset-success">{targetDone}</p>}
                {targetResults.length > 0 && !targetPlayer && (
                  <div className="admin-coin-results">
                    {targetResults.map(r => (
                      <div key={r.id} className="admin-coin-result admin-coin-selectable" onClick={() => handleSelectTarget(r)}>
                        <div className="admin-coin-result-info">
                          <span className="admin-coin-result-name">@{r.username || 'unknown'}</span>
                          <span className="admin-coin-result-coins">🪙 {(r.coins || 0).toLocaleString()}</span>
                        </div>
                        <span className="admin-coin-select-hint">→</span>
                      </div>
                    ))}
                  </div>
                )}
                {targetPlayer && (
                  <div className="admin-coin-results">
                    <div className="admin-coin-result">
                      <div className="admin-coin-result-info">
                        <span className="admin-coin-result-name">@{targetPlayer.username || 'unknown'}</span>
                        <span className="admin-coin-result-coins">🪙 {(targetPlayer.coins || 0).toLocaleString()}</span>
                      </div>
                      <button className="admin-coin-action-btn admin-coin-back" onClick={() => { setTargetPlayer(null); setTargetResults([]); setTargetDone('') }}>
                        ✕
                      </button>
                    </div>
                    <div className="admin-coin-amount-row">
                      <input
                        type="number"
                        className="admin-coin-amount-input"
                        value={targetCoinAmount}
                        onChange={e => setTargetCoinAmount(e.target.value)}
                        placeholder="Amount"
                        min="1"
                      />
                      <button
                        className="admin-coin-action-btn admin-coin-give"
                        onClick={() => handleTargetCoinAction('add')}
                        disabled={targetActionLoading === 'add' || !targetCoinAmount}
                      >
                        {targetActionLoading === 'add' ? '...' : '+ Give'}
                      </button>
                      <button
                        className="admin-coin-action-btn admin-coin-remove"
                        onClick={() => handleTargetCoinAction('remove')}
                        disabled={targetActionLoading === 'remove' || !targetCoinAmount}
                      >
                        {targetActionLoading === 'remove' ? '...' : '- Remove'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {adminPage === 'tournament' && (
              <div className="admin-section-card admin-page-body">
                <span className="admin-section-emoji">🏟️</span>
                <h4>Weekly Tournament</h4>
                <p>Schedule a 3-week God Tournament (1 week per stage). Top 8 God players with tickets enter when it starts.</p>
                {tournament ? (
                  <div className="admin-tournament-status">
                    <p className="admin-tournament-line">
                      {tournament.status === 'scheduled'
                        ? `📅 Scheduled to start ${formatTournamentStart(tournament.startsAt)}`
                        : `🔥 Active · ${TOURNAMENT_STAGE_LABELS[tournament.stage] || tournament.stage}`}
                    </p>
                    <p className="admin-tournament-line">👥 {tournament.players?.length || 0} players entered</p>
                    {cancelConfirming ? (
                      <div className="admin-reset-confirm">
                        <p className="admin-reset-confirm-text">Cancel this tournament? Players will return to their leagues.</p>
                        <button className="admin-reset-btn admin-reset-confirm-yes" onClick={handleCancelTournament} disabled={tournamentLoading}>
                          {tournamentLoading ? '...' : 'Yes, cancel'}
                        </button>
                        <button className="admin-reset-btn admin-reset-confirm-no" onClick={() => setCancelConfirming(false)} disabled={tournamentLoading}>
                          Keep it
                        </button>
                      </div>
                    ) : (
                      <button className="admin-reset-btn" onClick={() => setCancelConfirming(true)} disabled={tournamentLoading}>
                        ✕ Cancel Tournament
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      className="admin-quick-schedule-btn"
                      onClick={handleQuickSchedule}
                      disabled={tournamentLoading}
                    >
                      ⚡ Quick Schedule for Next Week
                    </button>
                    <form onSubmit={handleScheduleTournament} className="admin-tournament-form">
                      <select
                        className="admin-coin-input"
                        value={scheduleStart == null ? '' : String(scheduleStart)}
                        onChange={e => setScheduleStart(Number(e.target.value))}
                      >
                        {!scheduleStart && <option value="" disabled>Select start week...</option>}
                        {buildWednesdayOptions().map(o => (
                          <option key={o.ts} value={String(o.ts)}>{formatWeekOption(o.ts, o.isNext)}</option>
                        ))}
                      </select>
                      <p className="admin-tournament-line">Tournaments start Wednesday 00:00 UTC and run 3 weeks (1 week per stage).</p>
                      <div className="admin-tournament-btns">
                        <button type="submit" className="admin-coin-action-btn admin-coin-give" disabled={tournamentLoading || !scheduleStart}>
                          {tournamentLoading ? '...' : 'Schedule'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
                {tournamentDone && <p className="admin-reset-success">{tournamentDone}</p>}
                {tournamentError && <p className="admin-reset-error">{tournamentError}</p>}
              </div>
            )}

            {adminPage === 'sale' && (
              <div className="admin-section-card admin-page-body">
                <span className="admin-section-emoji">🛒</span>
                <h4>Shop Discounts</h4>
                <p>Put items on sale. Discounted prices show in the Shop for everyone.</p>
                <div className="admin-sale-bar">
                  <span className="admin-sale-count">{activeSaleCount} on sale</span>
                  <select
                    className="admin-sale-group-select"
                    value={saleGroup}
                    onChange={e => setSaleGroup(e.target.value)}
                  >
                    {SALE_GROUPS.map(g => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-sale-list">
                  {filteredSaleItems.map(it => {
                    const pct = saleDraft[it.id]
                    return (
                      <div key={it.id} className={`admin-sale-row ${isValidSalePercent(pct) ? 'on-sale' : ''}`}>
                        <span className="admin-sale-emoji">{it.emoji}</span>
                        <span className="admin-sale-name">{it.name}</span>
                        <span className="admin-sale-price">🪙 {it.price.toLocaleString()}</span>
                        <select
                          className="admin-sale-select"
                          value={isValidSalePercent(pct) ? pct : ''}
                          onChange={e => handleSaleSet(it.id, e.target.value)}
                        >
                          <option value="">Off</option>
                          {SALE_PERCENT_OPTIONS.map(p => (
                            <option key={p} value={p}>{p}%</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
                <div className="admin-sale-actions">
                  <button className="admin-reset-btn" onClick={handleClearSale} disabled={saleSaving}>
                    Clear discounts
                  </button>
                  <button className="admin-coin-action-btn admin-coin-give" onClick={handleSaveSale} disabled={saleSaving}>
                    {saleSaving ? 'Saving...' : '💾 Save sale'}
                  </button>
                </div>
                {saleDone && <p className="admin-reset-success">{saleDone}</p>}
                {saleError && <p className="admin-reset-error">{saleError}</p>}
              </div>
            )}

            {adminPage === 'controls' && (
              <div className="admin-section-card admin-page-body">
                <span className="admin-section-emoji">🎮</span>
                <h4>Game Controls</h4>
                <p>Global settings that apply to every player immediately.</p>
                {controlsLoading ? (
                  <p className="admin-tournament-line">Loading current settings...</p>
                ) : (
                  <>
                    <div className="admin-control-group">
                      <h5 className="admin-control-heading">📣 Announcement Banner</h5>
                      <p className="admin-tournament-line">Shown at the top of the app for all players (max 200 chars).</p>
                      <textarea
                        className="admin-announcement-textarea"
                        value={announcementText}
                        onChange={e => setAnnouncementText(e.target.value.slice(0, 200))}
                        placeholder="e.g. God Tournament starts this Wednesday at 00:00 UTC!"
                        maxLength={200}
                      />
                      <div className="admin-control-char-count">{announcementText.length}/200</div>
                      <div className="admin-toggle-row">
                        <span className="admin-toggle-label">Show banner</span>
                        <button
                          className={`admin-toggle ${announcementEnabled ? 'on' : ''}`}
                          onClick={() => setAnnouncementEnabled(v => !v)}
                          role="switch"
                          aria-checked={announcementEnabled}
                        >
                          <span className="admin-toggle-knob" />
                        </button>
                      </div>
                    </div>
                    <div className="admin-control-group">
                      <h5 className="admin-control-heading">💬 Live Chat</h5>
                      <p className="admin-tournament-line">When off, players can read messages but not send new ones.</p>
                      <div className="admin-toggle-row">
                        <span className="admin-toggle-label">Chat enabled</span>
                        <button
                          className={`admin-toggle ${chatEnabled ? 'on' : ''}`}
                          onClick={() => setChatEnabled(v => !v)}
                          role="switch"
                          aria-checked={chatEnabled}
                        >
                          <span className="admin-toggle-knob" />
                        </button>
                      </div>
                    </div>
                    <button className="admin-coin-action-btn admin-coin-give" onClick={handleSaveControls} disabled={controlsSaving}>
                      {controlsSaving ? 'Saving...' : '💾 Save controls'}
                    </button>
                    {controlsDone && <p className="admin-reset-success">{controlsDone}</p>}
                    {controlsError && <p className="admin-reset-error">{controlsError}</p>}
                  </>
                )}
              </div>
            )}

            {adminPage === 'analytics' && (
              <div className="admin-section-card admin-page-body">
                <span className="admin-section-emoji">📈</span>
                <h4>Analytics</h4>
                <p>Live snapshot of players, activity, and the economy.</p>
                <div className="admin-analytics-topbar">
                  <button className="admin-coin-action-btn admin-coin-give" onClick={handleLoadAnalytics} disabled={analyticsLoading}>
                    {analyticsLoading ? 'Loading...' : '🔄 Refresh'}
                  </button>
                </div>
                {analyticsError && <p className="admin-reset-error">{analyticsError}</p>}
                {!analytics && !analyticsLoading && !analyticsError && (
                  <p className="admin-tournament-line">Click Refresh to pull the latest stats.</p>
                )}
                {analyticsLoading && <p className="admin-tournament-line">Crunching numbers...</p>}
                {analytics && !analyticsLoading && (
                  <>
                    <div className="admin-analytics-grid">
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">👥 {analytics.totalPlayers.toLocaleString()}</span><span className="admin-analytics-label">Total players</span></div>
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">🟢 {analytics.activeToday.toLocaleString()}</span><span className="admin-analytics-label">Active today</span></div>
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">📆 {analytics.activeWeek.toLocaleString()}</span><span className="admin-analytics-label">Active this week</span></div>
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">🪙 {analytics.totalCoins.toLocaleString()}</span><span className="admin-analytics-label">Coins in circulation</span></div>
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">⭐ {analytics.totalXp.toLocaleString()}</span><span className="admin-analytics-label">Total XP</span></div>
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">🎮 {analytics.totalGames.toLocaleString()}</span><span className="admin-analytics-label">Games played</span></div>
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">🏆 {analytics.leagues.active.toLocaleString()}</span><span className="admin-analytics-label">Active leagues</span></div>
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">⚔️ {analytics.leagues.players.toLocaleString()}</span><span className="admin-analytics-label">Players in leagues</span></div>
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">🔥 {analytics.tournaments.active.toLocaleString()}</span><span className="admin-analytics-label">Active tournaments</span></div>
                      <div className="admin-analytics-stat"><span className="admin-analytics-num">👑 {analytics.tournaments.players.toLocaleString()}</span><span className="admin-analytics-label">Tournament players</span></div>
                    </div>
                    <div className="admin-analytics-section">
                      <h5 className="admin-control-heading">League distribution</h5>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(rank => {
                        const count = analytics.rankCounts[rank] || 0
                        const pct = analytics.totalPlayers > 0 ? Math.round((count / analytics.totalPlayers) * 100) : 0
                        return (
                          <div key={rank} className="admin-analytics-rank">
                            <span className="admin-analytics-rank-name">Rank {rank}</span>
                            <div className="admin-analytics-rank-track">
                              <div className="admin-analytics-rank-fill" style={{ width: `${Math.max(2, pct)}%` }} />
                            </div>
                            <span className="admin-analytics-rank-count">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="admin-analytics-columns">
                      <div className="admin-analytics-section">
                        <h5 className="admin-control-heading">Top by XP</h5>
                        {analytics.topXp.length === 0 && <p className="admin-tournament-line">No players yet.</p>}
                        {analytics.topXp.map((p, i) => (
                          <div key={p.id} className="admin-top-row">
                            <span className="admin-top-rank">{i + 1}</span>
                            <span className="admin-top-name">@{p.username || p.name || 'unknown'}</span>
                            <span className="admin-top-value">⭐ {p.xp?.toLocaleString() || 0}</span>
                          </div>
                        ))}
                      </div>
                      <div className="admin-analytics-section">
                        <h5 className="admin-control-heading">Top by Coins</h5>
                        {analytics.topCoins.length === 0 && <p className="admin-tournament-line">No players yet.</p>}
                        {analytics.topCoins.map((p, i) => (
                          <div key={p.id} className="admin-top-row">
                            <span className="admin-top-rank">{i + 1}</span>
                            <span className="admin-top-name">@{p.username || p.name || 'unknown'}</span>
                            <span className="admin-top-value">🪙 {p.coins?.toLocaleString() || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {adminPage === 'moderation' && (
              <div className="admin-section-card admin-page-body">
                <span className="admin-section-emoji">🛡️</span>
                <h4>Player Moderation</h4>
                <p>Manage blacklisted words and warn or ban players whose names match them.</p>
                {modError && <p className="admin-reset-error">{modError}</p>}
                {modDone && <p className="admin-reset-success">{modDone}</p>}

                <h5 className="admin-control-heading">Blacklisted words</h5>
                {blacklistWords.length === 0 && <p className="admin-tournament-line">No blacklisted words yet.</p>}
                <div className="admin-blacklist-chips">
                  {blacklistWords.map(w => (
                    <span key={w} className="admin-blacklist-chip">
                      {w}
                      <button className="admin-blacklist-chip-x" onClick={() => handleRemoveBlacklistWord(w)} aria-label={`Remove ${w}`}>×</button>
                    </span>
                  ))}
                </div>
                <div className="admin-control-row">
                  <input
                    className="admin-coin-input"
                    type="text"
                    value={blacklistInput}
                    onChange={e => setBlacklistInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddBlacklistWord() }}
                    placeholder="Add a word…"
                    maxLength={30}
                  />
                  <button className="admin-coin-action-btn admin-coin-give" onClick={handleAddBlacklistWord} disabled={!blacklistInput.trim()}>＋ Add</button>
                  <button className="admin-coin-action-btn admin-coin-give" onClick={handleSaveBlacklist} disabled={blacklistSaving}>
                    {blacklistSaving ? 'Saving…' : '💾 Save list'}
                  </button>
                </div>

                <h5 className="admin-control-heading">
                  Needs Attention
                  <button className="admin-coin-action-btn admin-coin-give admin-mod-refresh" onClick={handleLoadModeration} disabled={modLoading}>
                    {modLoading ? 'Loading…' : '🔄 Refresh'}
                  </button>
                </h5>
                {modLoading && <p className="admin-tournament-line">Scanning players…</p>}
                {!modLoading && needsAttention.length === 0 && (
                  <p className="admin-tournament-line">No player names match the blacklist. 🎉</p>
                )}
                <div className="admin-mod-list">
                  {needsAttention.map(({ player, matches, moderation }) => {
                    const status = formatModerationStatus(moderation)
                    return (
                      <div key={player.id} className="admin-mod-row">
                        <div className="admin-mod-info">
                          <span className="admin-mod-name">@{player.username || player.name || 'unknown'}</span>
                          <span className="admin-mod-words">matched: {matches.join(', ')}</span>
                          {status && (
                            <span className={`admin-mod-status admin-mod-status-${status.tone}`}>
                              {status.emoji} {status.label}
                            </span>
                          )}
                        </div>
                        <button className="admin-coin-action-btn admin-coin-give" onClick={() => openModTarget(player, moderation)}>
                          {moderation ? 'Manage' : 'Action'}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {modTarget && (
                  <div className="admin-mod-panel">
                    <h5 className="admin-control-heading">
                      @{modTarget.player.username || modTarget.player.name || 'unknown'}
                    </h5>
                    {(() => {
                      const status = formatModerationStatus(modTarget.moderation)
                      return status ? (
                        <p className={`admin-mod-status admin-mod-status-${status.tone}`}>{status.emoji} {status.label}</p>
                      ) : (
                        <p className="admin-mod-status admin-mod-status-ok">No active moderation.</p>
                      )
                    })()}
                    {modTarget.moderation?.reason && (
                      <p className="admin-mod-reason">Reason: {modTarget.moderation.reason}</p>
                    )}
                    <div className="admin-control-row">
                      <select className="admin-coin-input admin-mod-select" value={modAction} onChange={e => setModAction(e.target.value)}>
                        <option value="">Choose action…</option>
                        <option value="warn">⚠️ Warn</option>
                        <option value="temp">⏳ Temp ban…</option>
                        <option value="permanent">🚫 Permanent ban</option>
                      </select>
                      {modAction === 'temp' && (
                        <select className="admin-coin-input admin-mod-select" value={modDuration} onChange={e => setModDuration(e.target.value)}>
                          {BAN_DURATIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                      )}
                    </div>
                    {modAction !== '' && modAction !== 'warn' && (
                      <input
                        className="admin-coin-input admin-mod-reason-input"
                        type="text"
                        value={modReason}
                        onChange={e => setModReason(e.target.value)}
                        placeholder="Reason (required)…"
                        maxLength={300}
                      />
                    )}
                    {modAction === 'warn' && (
                      <input
                        className="admin-coin-input admin-mod-reason-input"
                        type="text"
                        value={modReason}
                        onChange={e => setModReason(e.target.value)}
                        placeholder="Reason (optional)…"
                        maxLength={300}
                      />
                    )}
                    <div className="admin-mod-actions">
                      {modAction && (
                        <button
                          className="admin-coin-action-btn admin-coin-give"
                          onClick={() => handleModSubmit(modAction)}
                          disabled={modBusy}
                        >
                          {modBusy ? 'Working…' : modAction === 'warn' ? '⚠️ Issue warning' : modAction === 'temp' ? '⏳ Apply ban' : '🚫 Ban permanently'}
                        </button>
                      )}
                      {modTarget.moderation && (
                        <button
                          className="admin-coin-action-btn admin-coin-remove"
                          onClick={handleModLift}
                          disabled={modBusy}
                        >
                          🔓 Lift / clear
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {adminPage === 'reset' && (
              <div className="admin-section-card admin-page-body admin-danger">
                <span className="admin-section-emoji">💥</span>
                <h4>Reset All Scores</h4>
                <p>Wipe all player stats, XP, coins, leagues, and tournaments. Your admin account is preserved.</p>
                {resetDone && <p className="admin-reset-success">All scores have been reset.</p>}
                {resetError && <p className="admin-reset-error">{resetError}</p>}
                {resetConfirming ? (
                  <div className="admin-reset-confirm">
                    <p className="admin-reset-confirm-text">Are you sure? This cannot be undone.</p>
                    <button
                      className="admin-reset-btn admin-reset-confirm-yes"
                      onClick={handleResetAllScores}
                      disabled={resetting}
                    >
                      {resetting ? 'Resetting...' : 'Yes, reset everything'}
                    </button>
                    <button
                      className="admin-reset-btn admin-reset-confirm-no"
                      onClick={() => setResetConfirming(false)}
                      disabled={resetting}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="admin-reset-btn"
                    onClick={() => setResetConfirming(true)}
                  >
                    💥 Nuclear Reset
                  </button>
                )}
              </div>
            )}

            <button className="admin-logout-btn" onClick={handleLogout}>
              🚪 Lock Admin Panel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
