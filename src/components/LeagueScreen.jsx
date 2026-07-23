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
} from '../leagueService'
import { MAX_PER_LEAGUE } from '../leagues'
import { TOURNAMENT_TICKET } from '../shopItems'
import { getNameplateStyle, getNameplateBorderStyle, getNameplateEffectClass, getNameplateNeonColor, getTitleName } from '../nameplateUtils'

const LEAGUE_GAMES = [
  { id: 'rps', label: 'RPS', emoji: '✊' },
  { id: 'ssg', label: 'Split Steal', emoji: '💰' },
  { id: 'gtn', label: 'Guess #', emoji: '🔢' },
  { id: 'gtn-hc', label: 'Hot/Cold', emoji: '🌡️' },
  { id: 'hol', label: 'Hi/Lo', emoji: '🃏' },
  { id: 'dice', label: 'Dice', emoji: '🎲' },
  { id: 'coin', label: 'Coin Flip', emoji: '🪙' },
  { id: 'memory', label: 'Memory', emoji: '🧠' },
  { id: 'word', label: 'Word Scramble', emoji: '📚' },
  { id: 'minesweeper', label: 'Minesweeper', emoji: '💣' },
  { id: 'merge', label: 'Number Merge', emoji: '🔢' },
  { id: 'simon', label: 'Simon', emoji: '🎵' },
  { id: 'typing', label: 'Typing', emoji: '⌨️' },
  { id: 'reaction', label: 'Reaction', emoji: '⚡' },
  { id: 'whack', label: 'Whack-a-Mole', emoji: '🔨' },
  { id: 'slots', label: 'Slots', emoji: '🎰' },
  { id: 'blackjack', label: 'Blackjack', emoji: '🃏' },
  { id: 'snake', label: 'Snake', emoji: '🐍' },
  { id: 'tetris', label: 'Tetris', emoji: '🧱' },
  { id: 'breakout', label: 'Breakout', emoji: '🏓' },
  { id: 'flappy', label: 'Flappy Bird', emoji: '🐦' },
  { id: 'lightsout', label: 'Lights Out', emoji: '💡' },
  { id: 'mastermind', label: 'Mastermind', emoji: '🧠' },
  { id: 'dodge', label: 'Dodge', emoji: '🎮' },
  { id: 'mergeblitz', label: 'Merge Blitz', emoji: '⚡' },
  { id: 'connect4', label: 'Connect Four', emoji: '🔴' },
]

const TOURNAMENT_LABELS = {
  tournament: { name: 'God Tournament', emoji: '🏟️', size: 20 },
  semiFinals: { name: 'Semi-Finals', emoji: '⚔️', size: 15 },
  finals: { name: 'Finals', emoji: '🏆', size: 10 },
}

export default function LeagueScreen({ onBack, userId, onPlayGame, tournamentTickets, coins, onBuyTicket }) {
  const [player, setPlayer] = useState(null)
  const [league, setLeague] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seasonTime, setSeasonTime] = useState(0)
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
            <h2>⚡ God</h2>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h3 style={{ color: '#ffd700', marginBottom: 8 }}>You are God!</h3>
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
            ⏱ {formatSeasonTime(seasonTime)} until promotion & demotion
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
            <span className="league-ladder-emoji">⚡</span>
            <span className="league-ladder-name" style={{ color: '#ffd700' }}>God</span>
          </div>
          <div className="league-ladder-current">
            <span className="league-ladder-emoji current">{tournamentInfo.emoji}</span>
            <span className="league-ladder-name current" style={{ color: 'var(--neon-yellow)' }}>{tournamentInfo.name}</span>
            <span className="league-ladder-you">You are here</span>
          </div>
          <div className="league-ladder-rank demotion-target">
            <span className="league-ladder-arrow">⬇️</span>
            <span className="league-ladder-emoji">🔥</span>
            <span className="league-ladder-name" style={{ color: '#ff6b35' }}>Phoenix</span>
          </div>
        </div>
      ) : player && (() => {
        const cr = LEAGUE_RANKS.find(r => r.rank === (league?.rank || player.league))
        const prevRank = LEAGUE_RANKS.find(r => r.rank === (cr?.rank || 10) - 1)
        const nextRank = LEAGUE_RANKS.find(r => r.rank === (cr?.rank || 10) + 1)
        const isGodPromo = cr?.rank === 1
        return (
          <div className="league-rank-ladder">
            {prevRank ? (
              <div className="league-ladder-rank promotion-target">
                <span className="league-ladder-arrow">⬆️</span>
                <span className="league-ladder-emoji">{prevRank.emoji}</span>
                <span className="league-ladder-name" style={{ color: prevRank.color }}>{isGodPromo ? 'God Tournament' : prevRank.name}</span>
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

      {player && !isTournament && (league?.rank || player.league) === 1 && (
        <div className="league-ticket-prompt">
          <div className="league-ticket-info">
            <span className="league-ticket-icon">🎫</span>
            <div>
              <p className="league-ticket-text">Top 8 advance to <strong>God Tournament</strong> — requires 1 Ticket</p>
              <p className="league-ticket-sub">Without a ticket, you'll earn league coins based on placement.</p>
            </div>
          </div>
          <div className="league-ticket-buy">
            <span className="league-ticket-owned">Owned: {tournamentTickets || 0}</span>
            {coins >= TOURNAMENT_TICKET.price ? (
              <button className="league-ticket-btn" onClick={() => { sound('cash'); onBuyTicket(TOURNAMENT_TICKET.id, TOURNAMENT_TICKET.price) }}>
                Buy 🪙 {TOURNAMENT_TICKET.price.toLocaleString()}
              </button>
            ) : (
              <button className="league-ticket-btn disabled" disabled>Need 🪙 {TOURNAMENT_TICKET.price.toLocaleString()}</button>
            )}
          </div>
        </div>
      )}

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
            ? `Top 3 win · Bottom ${demoteCount} → Phoenix`
            : `Top ${promoteCount} advance · Bottom ${demoteCount} → Phoenix`
          : `Top ${promoteCount} promote · Bottom ${demoteCount} demote · Win +10 XP`
        }
      </div>
      <div className="league-footer" style={{ marginTop: 4, fontSize: 11 }}>
        Seasons reset every Wednesday at 12 AM UTC
      </div>
    </div>
  )
}
