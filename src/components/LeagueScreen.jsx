import { useState, useEffect, useRef } from 'react'
import useSound from '../useSound'
import {
  getRankInfo, getPromotionZone, getDemotionZone,
  getTimeUntilSeasonEnd, formatSeasonTime, LEAGUE_RANKS, RANK_PROMO_DEMO,
  isInLockoutPeriod
} from '../leagues'
import {
  getOrCreatePlayer, findOrCreateLeagueInstance, joinLeague,
  getLeagueInstance, getLeaguePlayers, getTournament,
  subscribeToLeague, subscribeToPlayer, subscribeToTournament,
  processSeasonReset, processTournamentReset, processSemiFinalsReset,
  processFinalsReset, updatePlayer, ensurePlayerInLeague,
  searchPlayersByName,
} from '../leagueService'
import { MAX_PER_LEAGUE } from '../leagues'
import { TITLES, ALL_NAMEPLATES } from '../shopItems'

const LEAGUE_GAMES = [
  { id: 'rps', label: 'RPS', emoji: '✊' },
  { id: 'gtn', label: 'Guess #', emoji: '🔢' },
  { id: 'hol', label: 'Hi/Lo', emoji: '🃏' },
  { id: 'dice', label: 'Dice', emoji: '🎲' },
  { id: 'simon', label: 'Simon', emoji: '🎵' },
  { id: 'typing', label: 'Typing', emoji: '⌨️' },
  { id: 'coin', label: 'Coin Flip', emoji: '🪙' },
  { id: 'memory', label: 'Memory', emoji: '🧠' },
  { id: 'word', label: 'Word Scramble', emoji: '📚' },
  { id: 'whack', label: 'Whack-a-Mole', emoji: '🔨' },
  { id: 'slots', label: 'Slots', emoji: '🎰' },
  { id: 'blackjack', label: 'Blackjack', emoji: '🃏' },
]

const TOURNAMENT_LABELS = {
  tournament: { name: 'Tournament', emoji: '🏟️', size: 20 },
  semiFinals: { name: 'Semi-Finals', emoji: '⚔️', size: 15 },
  finals: { name: 'Finals', emoji: '🏆', size: 10 },
}

function getNameplateStyle(nameplateId) {
  if (!nameplateId) return null
  const np = ALL_NAMEPLATES.find(n => n.id === nameplateId)
  if (!np) return null
  if (np.type === 'solid') return { color: np.color }
  if (np.type === 'gradient') return { background: np.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  return null
}

function getNameplateBorderStyle(nameplateId) {
  if (!nameplateId) return null
  const np = ALL_NAMEPLATES.find(n => n.id === nameplateId)
  if (!np) return null
  if (np.type === 'border') {
    if (np.gradientBorder) return { borderImage: `${np.gradientBorder} 1`, borderImageSlice: 1, borderWidth: 2, borderStyle: 'solid' }
    return { borderColor: np.borderColor, borderWidth: 2, borderStyle: 'solid' }
  }
  return null
}

function getNameplateEffectClass(nameplateId) {
  if (!nameplateId) return ''
  const np = ALL_NAMEPLATES.find(n => n.id === nameplateId)
  if (!np) return ''
  if (np.type === 'effect') {
    if (np.neonColor) return 'np-fx-neon'
    if (np.id === 'np-fx-rainbow-wave') return 'np-fx-rainbow'
    if (np.id === 'np-fx-gold-shimmer') return 'np-fx-shimmer'
    if (np.id === 'np-fx-champion-glow') return 'np-fx-champion'
    if (np.id === 'np-fx-diamond-dust') return 'np-fx-diamond'
    if (np.id === 'np-fx-smash') return 'np-fx-smash'
    if (np.id === 'np-fx-spin-in') return 'np-fx-spin-in'
    if (np.id === 'np-fx-pop-out') return 'np-fx-pop-out'
    if (np.id === 'np-fx-glitch') return 'np-fx-glitch'
    if (np.id === 'np-fx-float') return 'np-fx-float'
    if (np.id === 'np-fx-pulse') return 'np-fx-pulse'
  }
  if (np.type === 'border') return 'np-fx-border'
  return ''
}

function getNameplateNeonColor(nameplateId) {
  if (!nameplateId) return null
  const np = ALL_NAMEPLATES.find(n => n.id === nameplateId)
  if (!np || np.type !== 'effect' || !np.neonColor) return null
  return np.neonColor
}

function getTitleName(titleId) {
  if (!titleId) return null
  const t = TITLES.find(ti => ti.id === titleId)
  return t ? t.name : null
}

export default function LeagueScreen({ onBack, userId, onPlayGame }) {
  const [player, setPlayer] = useState(null)
  const [league, setLeague] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seasonTime, setSeasonTime] = useState(0)
  const [playerSearch, setPlayerSearch] = useState('')
  const [playerSearchResults, setPlayerSearchResults] = useState([])
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false)
  const sound = useSound()
  const unsubLeagueRef = useRef(null)
  const unsubPlayerRef = useRef(null)
  const unsubTournamentRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        if (!userId) { return }
        const p = await getOrCreatePlayer(userId)
        if (cancelled) return
        setPlayer(p)

        if (p.league === 1) {
          if (!cancelled) setLoading(false)
          return
        }

        if (p.leagueInstanceId) {
          const tDoc = await getTournament(p.leagueInstanceId).catch(() => null)
          if (tDoc && tDoc.stage) {
            if (!cancelled) setTournament(tDoc)
            if (!cancelled) setLoading(false)
            return
          }

          const lg = await getLeagueInstance(p.leagueInstanceId)
          if (!lg || lg.status === 'completed') {
            if (isInLockoutPeriod()) {
              if (!cancelled) setLoading(false)
              return
            }
            const newLg = await ensurePlayerInLeague(userId)
            if (!cancelled) setLeague(newLg)
          } else {
            if (!cancelled) setLeague(lg)
          }
        } else if (!isInLockoutPeriod()) {
          const newLg = await ensurePlayerInLeague(userId)
          if (!cancelled) setLeague(newLg)
        }
        if (!cancelled) setLoading(false)
      } catch (e) {
        console.error('League init error:', e)
        if (!cancelled) { setError(e.message || 'Failed to load league data'); setLoading(false) }
      }
    }
    init()
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    if (tournament?.id) {
      unsubTournamentRef.current = subscribeToTournament(tournament.id, (t) => {
        setTournament(t)
        if (t.status === 'completed') setTournament(null)
      })
      return () => unsubTournamentRef.current?.()
    }
  }, [tournament?.id])

  useEffect(() => {
    if (!tournament?.id && league?.id) {
      unsubLeagueRef.current = subscribeToLeague(league.id, setLeague)
      return () => unsubLeagueRef.current?.()
    }
  }, [league?.id, tournament?.id])

  useEffect(() => {
    if (!player?.id) return
    unsubPlayerRef.current = subscribeToPlayer(player.id, setPlayer)
    return () => unsubPlayerRef.current?.()
  }, [player?.id])

  useEffect(() => {
    const source = tournament?.players || league?.players
    if (!source) return
    let cancelled = false
    getLeaguePlayers(source).then(p => { if (!cancelled) setPlayers(p) })
    return () => { cancelled = true }
  }, [tournament?.players, league?.players])

  useEffect(() => {
    const source = tournament?.players || league?.players
    if (!source?.length) return
    let cancelled = false
    const refresh = () => {
      getLeaguePlayers(source).then(p => { if (!cancelled) setPlayers(p) }).catch(() => {})
    }
    const interval = setInterval(refresh, 10000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [tournament?.players, league?.players])

  useEffect(() => {
    const tick = () => setSeasonTime(getTimeUntilSeasonEnd())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const term = playerSearch.trim()
    if (!term) { setPlayerSearchResults([]); setPlayerSearchLoading(false); return }
    let cancelled = false
    setPlayerSearchLoading(true)
    searchPlayersByName(term).then(results => {
      if (!cancelled) { setPlayerSearchResults(results); setPlayerSearchLoading(false) }
    }).catch(err => { console.error('Player search error:', err); if (!cancelled) { setPlayerSearchResults([]); setPlayerSearchLoading(false) } })
    return () => { cancelled = true }
  }, [playerSearch])

  const sortedPlayers = [...players].sort((a, b) => b.xp - a.xp)
  const playerPosition = sortedPlayers.findIndex(p => p.id === userId) + 1

  const isTournament = !!tournament
  const currentRank = player?.league || 11
  const rankInfo = getRankInfo(currentRank)

  let promoteCount = 0
  let demoteCount = 0
  if (isTournament) {
    const tInfo = TOURNAMENT_LABELS[tournament.stage]
    promoteCount = tournament.stage === 'finals' ? 3 : tInfo ? tInfo.size - (tournament.stage === 'semiFinals' ? 5 : tournament.stage === 'tournament' ? 5 : 0) : 0
    demoteCount = tournament.stage === 'tournament' ? 5 : tournament.stage === 'semiFinals' ? 5 : 0
  } else if (league) {
    const pd = RANK_PROMO_DEMO[league.rank] || { promote: 0, demote: 0 }
    promoteCount = pd.promote
    demoteCount = pd.demote
  }

  const isPromotion = playerPosition > 0 && playerPosition <= promoteCount
  const isDemotion = demoteCount > 0 && playerPosition > sortedPlayers.length - demoteCount && playerPosition > promoteCount

  async function handleSeasonReset() {
    sound('confirm')
    try {
      if (isTournament) {
        if (tournament.stage === 'tournament') {
          await processTournamentReset()
        } else if (tournament.stage === 'semiFinals') {
          await processSemiFinalsReset()
        } else if (tournament.stage === 'finals') {
          await processFinalsReset()
        }
      } else if (league?.id) {
        await processSeasonReset(league.id)
      }
      const p = await getOrCreatePlayer(userId)
      setPlayer(p)
      setTournament(null)
      setLeague(null)
      if (p.leagueInstanceId) {
        const tDoc = await getTournament(p.leagueInstanceId).catch(() => null)
        if (tDoc && tDoc.stage) {
          setTournament(tDoc)
        } else {
          const lg = await getLeagueInstance(p.leagueInstanceId)
          setLeague(lg)
        }
      }
      sound('victory')
    } catch (e) {
      setError('Reset failed: ' + e.message)
      setTimeout(() => setError(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="league-page">
        <div className="league-page-header">
          <button className="quit-btn" onClick={onBack}>← Back</button>
          <h2>⚔️ Leagues</h2>
        </div>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>⚔️</div>
          <p style={{ color: 'var(--text-dim)' }}>Loading leagues...</p>
        </div>
      </div>
    )
  }

  if (error && !player) {
    return (
      <div className="league-page">
        <div className="league-page-header">
          <button className="quit-btn" onClick={onBack}>← Back</button>
          <h2>⚔️ Leagues</h2>
        </div>
        <p style={{ color: 'var(--lose-color)', textAlign: 'center', padding: 20 }}>{error}</p>
      </div>
    )
  }

  if (player && player.league === 1) {
    return (
      <div className="league-page">
        <div className="league-page-header">
          <button className="quit-btn" onClick={onBack}>← Back</button>
          <div className="league-header-text">
            <h2>👑 Champion</h2>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👑</div>
          <h3 style={{ color: '#ffd700', marginBottom: 8 }}>You are Champion!</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>You've reached the highest rank. Congratulations!</p>
          {player.tournamentWins > 0 && (
            <p style={{ color: 'var(--neon-yellow)', fontSize: 13, marginTop: 8 }}>🏆 Tournament Wins: {player.tournamentWins}</p>
          )}
        </div>
      </div>
    )
  }

  if (player && !player.leagueInstanceId && !league && !tournament) {
    const lockout = isInLockoutPeriod()
    return (
      <div className="league-page">
        <div className="league-page-header">
          <button className="quit-btn" onClick={onBack}>← Back</button>
          <div className="league-header-text">
            <h2>⚔️ Leagues</h2>
          </div>
        </div>
        {lockout ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h3 style={{ color: 'var(--neon-yellow)', marginBottom: 8 }}>Season ending soon!</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>League placement is locked within 24 hours of a season reset. Check back after the next season starts!</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
            <h3 style={{ color: 'var(--text-light)', marginBottom: 8 }}>Complete a game to join!</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Play and finish any game to be placed in a league with other players.</p>
          </div>
        )}
      </div>
    )
  }

  if (player && player.leagueInstanceId && !league && !tournament && isInLockoutPeriod()) {
    return (
      <div className="league-page">
        <div className="league-page-header">
          <button className="quit-btn" onClick={onBack}>← Back</button>
          <div className="league-header-text">
            <h2>⚔️ Leagues</h2>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h3 style={{ color: 'var(--neon-yellow)', marginBottom: 8 }}>Season ending soon!</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Your league season has ended and placement for the next season is locked. Check back after the reset!</p>
        </div>
      </div>
    )
  }

  const tournamentInfo = isTournament ? TOURNAMENT_LABELS[tournament.stage] || { emoji: '🏆', name: 'Tournament', size: 20 } : null

  return (
    <div className="league-page">
      <div className="league-page-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <div className="league-header-text">
          <h2>{isTournament ? `${tournamentInfo.emoji} ${tournamentInfo.name}` : `${rankInfo.emoji} ${rankInfo.name}`}</h2>
          <span className="league-season-timer" style={{ color: seasonTime < 3600000 ? 'var(--neon-red)' : 'var(--neon-blue)' }}>
            ⏱ {formatSeasonTime(seasonTime)}
          </span>
        </div>
      </div>

      <div className="league-page-stats">
        {player && (
          <div className="league-player-stats">
            <span>⭐ {player.xp} XP</span>
            <span>🏆 {player.wins}W</span>
            <span>💀 {player.losses}L</span>
            {player.streak > 0 && <span>🔥 {player.streak}</span>}
          </div>
        )}
        <span className="league-size">{players.length}/{isTournament ? tournamentInfo.size : MAX_PER_LEAGUE}</span>
      </div>

      {playerPosition > 0 && (
        <div className={`league-zone ${isPromotion ? 'promotion' : isDemotion ? 'demotion' : 'safe'}`}>
          {isPromotion ? `⬆️ Promotion (#${playerPosition})` : isDemotion ? `⬇️ Demotion (#${playerPosition})` : `— Safe (#${playerPosition})`}
        </div>
      )}

      {isTournament ? (
        <div className="league-rank-ladder">
          <div className="league-ladder-rank promotion-target">
            <span className="league-ladder-arrow">⬆️</span>
            <span className="league-ladder-emoji">💠</span>
            <span className="league-ladder-name" style={{ color: '#00d4ff' }}>Diamond</span>
          </div>
          <div className="league-ladder-current">
            <span className="league-ladder-emoji current">{tournamentInfo.emoji}</span>
            <span className="league-ladder-name current" style={{ color: 'var(--neon-yellow)' }}>{tournamentInfo.name}</span>
            <span className="league-ladder-you">You are here</span>
          </div>
          <div className="league-ladder-rank demotion-target">
            <span className="league-ladder-arrow">⬇️</span>
            <span className="league-ladder-emoji">💠</span>
            <span className="league-ladder-name" style={{ color: '#00d4ff' }}>Diamond</span>
          </div>
        </div>
      ) : player && (() => {
        const cr = LEAGUE_RANKS.find(r => r.rank === (league?.rank || player.league))
        const prevRank = LEAGUE_RANKS.find(r => r.rank === (cr?.rank || 11) - 1)
        const nextRank = LEAGUE_RANKS.find(r => r.rank === (cr?.rank || 11) + 1)
        const isDiamondPromo = cr?.rank === 3
        return (
          <div className="league-rank-ladder">
            {prevRank ? (
              <div className="league-ladder-rank promotion-target">
                <span className="league-ladder-arrow">⬆️</span>
                <span className="league-ladder-emoji">{prevRank.emoji}</span>
                <span className="league-ladder-name" style={{ color: prevRank.color }}>{isDiamondPromo ? 'Tournament' : prevRank.name}</span>
              </div>
            ) : <div className="league-ladder-rank" />}
            <div className="league-ladder-current">
              <span className="league-ladder-emoji current">{cr?.emoji}</span>
              <span className="league-ladder-name current" style={{ color: cr?.color }}>{cr?.name}</span>
              <span className="league-ladder-you">You are here</span>
            </div>
            {nextRank ? (
              <div className="league-ladder-rank demotion-target">
                <span className="league-ladder-arrow">⬇️</span>
                <span className="league-ladder-emoji">{nextRank.emoji}</span>
                <span className="league-ladder-name" style={{ color: nextRank.color }}>{nextRank.name}</span>
              </div>
            ) : <div className="league-ladder-rank" />}
          </div>
        )
      })()}

      <div className="league-play-section">
        <h3>Play for League XP</h3>
        <p className="league-play-hint">Win games to earn league XP and climb the standings</p>
        <div className="league-play-grid">
          {LEAGUE_GAMES.map(g => (
            <button key={g.id} className="league-game-btn" onClick={() => { sound('click'); onPlayGame(g.id) }}>
              <span className="league-game-emoji">{g.emoji}</span>
              <span className="league-game-label">{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="league-standings">
        <h3>{isTournament ? `${tournamentInfo.name} Standings` : 'Standings'}</h3>
        <div className="player-search-bar">
          <span className="player-search-icon">🔍</span>
          <input
            className="player-search-input"
            type="text"
            placeholder="Search by username or name..."
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            aria-label="Search players"
          />
          {playerSearch && <button className="player-search-clear" onClick={() => { setPlayerSearch(''); setPlayerSearchResults([]) }} aria-label="Clear search">×</button>}
        </div>
        {playerSearch.trim() && (
          <div className="player-search-results">
            {playerSearchLoading ? (
              <p className="player-search-empty">Searching...</p>
            ) : playerSearchResults.length === 0 ? (
              <p className="player-search-empty">No players found</p>
            ) : (
              playerSearchResults.map(p => {
                const rank = LEAGUE_RANKS.find(r => r.rank === p.league)
                return (
                  <div key={p.id} className={`player-search-row ${p.id === userId ? 'you' : ''}`}>
                    <div className="player-search-row-name">
                      <span className={`player-search-name ${getNameplateEffectClass(p.nameplate)}`} style={{ ...getNameplateStyle(p.nameplate), ...getNameplateBorderStyle(p.nameplate), '--np-neon-color': getNameplateNeonColor(p.nameplate) || undefined }}>
                        @{p.username || 'unknown'}{p.id === userId ? ' (you)' : ''}
                      </span>
                      {getTitleName(p.title) && <span className="player-search-title">{getTitleName(p.title)}</span>}
                    </div>
                    <div className="player-search-row-stats">
                      {rank && <span className="player-search-rank" style={{ color: rank.color }}>{rank.emoji} {rank.name}</span>}
                      <span>⭐ {p.xp} XP</span>
                      <span>{p.wins}W/{p.losses}L</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
        <div className="league-standings-list">
          {sortedPlayers.map((p, i) => {
            const pos = i + 1
            const isYou = p.id === userId
            const isPromo = pos <= promoteCount
            const isDemo = demoteCount > 0 && pos > sortedPlayers.length - demoteCount && pos > promoteCount
            return (
              <div key={p.id} className={`league-row ${isYou ? 'you' : ''} ${isPromo ? 'promo' : isDemo ? 'demo' : ''}`}>
                <span className="league-row-pos">#{pos}</span>
                <div className="league-row-name-col">
                  <span
                    className={`league-row-name ${getNameplateEffectClass(p.nameplateEffect)}`}
                    style={{ ...getNameplateStyle(p.nameplate), ...getNameplateBorderStyle(p.nameplateEffect), '--np-neon-color': getNameplateNeonColor(p.nameplateEffect) || undefined }}
                  >
                    {p.name}{isYou ? ' (you)' : ''}
                  </span>
                  {getTitleName(p.title) && (
                    <span className="league-row-title">{getTitleName(p.title)}</span>
                  )}
                  {p.username && (
                    <span className="league-row-username">@{p.username}</span>
                  )}
                </div>
                <span className="league-row-xp">⭐{p.xp}</span>
                <span className="league-row-record">{p.wins}W/{p.losses}L</span>
              </div>
            )
          })}
          {sortedPlayers.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>No players yet</p>
          )}
        </div>
      </div>

      {seasonTime === 0 && (
        <button className="league-reset-btn" onClick={handleSeasonReset}>
          {isTournament ? `🔄 Advance ${tournamentInfo.name}` : '🔄 Reset Season'}
        </button>
      )}

      {error && (
        <div className={`league-toast ${error.includes('won') ? 'win' : 'info'}`}>{error}</div>
      )}

      <div className="league-footer">
        {isTournament
          ? tournament.stage === 'finals'
            ? `Top 3 win · Bottom ${demoteCount} → Diamond`
            : `Top ${promoteCount} advance · Bottom ${demoteCount} → Diamond`
          : `Top ${promoteCount} promote · Bottom ${demoteCount} demote · Win +10 XP`
        }
      </div>
      <div className="league-footer" style={{ marginTop: 4, fontSize: 11 }}>
        Seasons reset every Wednesday at 12 AM UTC
      </div>
    </div>
  )
}
