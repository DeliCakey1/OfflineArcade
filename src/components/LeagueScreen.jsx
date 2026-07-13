import { useState, useEffect, useRef } from 'react'
import useSound from '../useSound'
import {
  getRankInfo, MAX_PER_LEAGUE, PROMOTE_COUNT, DEMOTE_COUNT,
  getTimeUntilSeasonEnd, formatSeasonTime
} from '../leagues'
import {
  getOrCreatePlayer, findOrCreateLeagueInstance, joinLeague,
  getLeagueInstance, getLeaguePlayers, findMatch, createMatch, finishMatch,
  subscribeToLeague, subscribeToPlayer, processSeasonReset, updatePlayer,
  getPlayer
} from '../leagueService'

const GAMES_FOR_LEAGUE = [
  { id: 'rps', label: 'RPS', emoji: '✊' },
  { id: 'gtn', label: 'Guess #', emoji: '🔢' },
  { id: 'hol', label: 'Hi/Lo', emoji: '🃏' },
  { id: 'dice', label: 'Dice', emoji: '🎲' },
  { id: 'simon', label: 'Simon', emoji: '🎵' },
  { id: 'typing', label: 'Typing', emoji: '⌨️' },
]

export default function LeagueScreen({ onBack, userId }) {
  const [player, setPlayer] = useState(null)
  const [league, setLeague] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seasonTime, setSeasonTime] = useState(0)
  const [searching, setSearching] = useState(false)
  const [matchFound, setMatchFound] = useState(null)
  const sound = useSound()
  const unsubLeagueRef = useRef(null)
  const unsubPlayerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        if (!userId) { setError('Sign in to access leagues'); setLoading(false); return }
        const p = await getOrCreatePlayer(userId)
        if (cancelled) return
        setPlayer(p)

        if (!p.leagueInstanceId) {
          const lg = await findOrCreateLeagueInstance(p.league)
          await joinLeague(lg.id, userId)
          await updatePlayer(userId, { leagueInstanceId: lg.id })
          if (!cancelled) setLeague(lg)
        } else {
          const lg = await getLeagueInstance(p.leagueInstanceId)
          if (!lg || lg.status === 'completed') {
            const newLg = await findOrCreateLeagueInstance(p.league)
            await joinLeague(newLg.id, userId)
            await updatePlayer(userId, { leagueInstanceId: newLg.id })
            if (!cancelled) setLeague(newLg)
          } else {
            if (!cancelled) setLeague(lg)
          }
        }
        if (!cancelled) setLoading(false)
      } catch (e) {
        console.error('League init error:', e)
        if (!cancelled) {
          setError(e.message || 'Failed to load league data')
          setLoading(false)
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    if (!league?.id) return
    unsubLeagueRef.current = subscribeToLeague(league.id, setLeague)
    return () => unsubLeagueRef.current?.()
  }, [league?.id])

  useEffect(() => {
    if (!player?.id) return
    unsubPlayerRef.current = subscribeToPlayer(player.id, setPlayer)
    return () => unsubPlayerRef.current?.()
  }, [player?.id])

  useEffect(() => {
    if (!league?.players) return
    let cancelled = false
    getLeaguePlayers(league.players).then(p => { if (!cancelled) setPlayers(p) })
    return () => { cancelled = true }
  }, [league?.players])

  useEffect(() => {
    if (!league?.seasonStart) return
    const tick = () => setSeasonTime(getTimeUntilSeasonEnd(league.seasonStart))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [league?.seasonStart])

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.streak !== b.streak) return b.streak - a.streak
    return b.xp - a.xp
  })

  const playerPosition = sortedPlayers.findIndex(p => p.id === userId) + 1
  const isPromotion = playerPosition > 0 && playerPosition <= PROMOTE_COUNT
  const isDemotion = playerPosition > sortedPlayers.length - DEMOTE_COUNT && playerPosition > PROMOTE_COUNT
  const rankInfo = getRankInfo(league?.rank || 10)

  async function handleFindMatch() {
    setSearching(true)
    sound('click')
    try {
      const opponentId = await findMatch(league.id, userId)
      if (!opponentId) {
        setSearching(false)
        setError('No opponents available. Try again later.')
        setTimeout(() => setError(null), 3000)
        return
      }
      setMatchFound(opponentId)
      sound('confirm')
    } catch (e) {
      setSearching(false)
      setError('Failed to find match')
      setTimeout(() => setError(null), 3000)
    }
  }

  async function handleAcceptMatch(gameId) {
    if (!matchFound) return
    sound('confirm')
    try {
      const match = await createMatch(userId, matchFound, gameId)
      await finishMatch(match.id, userId, matchFound)
      setMatchFound(null)
      setSearching(false)
      sound('victory')
      setError('You won +10 XP!')
      setTimeout(() => setError(null), 3000)
    } catch (e) {
      setError('Match failed: ' + e.message)
      setTimeout(() => setError(null), 3000)
    }
  }

  function handleDeclineMatch() {
    setMatchFound(null)
    setSearching(false)
    sound('click')
  }

  async function handleSeasonReset() {
    if (!league?.id) return
    sound('confirm')
    try {
      await processSeasonReset(league.id)
      const p = await getOrCreatePlayer(userId)
      setPlayer(p)
      if (p.leagueInstanceId) {
        const lg = await getLeagueInstance(p.leagueInstanceId)
        setLeague(lg)
      }
      sound('victory')
    } catch (e) {
      setError('Reset failed: ' + e.message)
      setTimeout(() => setError(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="league-sidebar">
        <div className="league-sidebar-header">
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
      <div className="league-sidebar">
        <div className="league-sidebar-header">
          <button className="quit-btn" onClick={onBack}>← Back</button>
          <h2>⚔️ Leagues</h2>
        </div>
        <p style={{ color: 'var(--lose-color)', textAlign: 'center', padding: 20 }}>{error}</p>
      </div>
    )
  }

  return (
    <div className="league-sidebar">
      <div className="league-sidebar-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <div className="league-header-text">
          <h2>{rankInfo.emoji} {rankInfo.name}</h2>
          <span className="league-season-timer" style={{ color: seasonTime < 3600000 ? 'var(--neon-red)' : 'var(--neon-blue)' }}>
            ⏱ {formatSeasonTime(seasonTime)}
          </span>
        </div>
      </div>

      <div className="league-sidebar-stats">
        {player && (
          <div className="league-player-stats">
            <span>⭐ {player.xp} XP</span>
            <span>🏆 {player.wins}W</span>
            <span>💀 {player.losses}L</span>
            {player.streak > 0 && <span>🔥 {player.streak}</span>}
          </div>
        )}
        <span className="league-size">{players.length}/{MAX_PER_LEAGUE}</span>
      </div>

      {playerPosition > 0 && (
        <div className={`league-zone ${isPromotion ? 'promotion' : isDemotion ? 'demotion' : 'safe'}`}>
          {isPromotion ? `⬆️ Promotion (#${playerPosition})` : isDemotion ? `⬇️ Demotion (#${playerPosition})` : `— Safe (#${playerPosition})`}
        </div>
      )}

      <div className="league-standings">
        <h3>Standings</h3>
        <div className="league-standings-list">
          {sortedPlayers.map((p, i) => {
            const pos = i + 1
            const isYou = p.id === userId
            const isPromo = pos <= PROMOTE_COUNT
            const isDemo = pos > sortedPlayers.length - DEMOTE_COUNT && pos > PROMOTE_COUNT
            return (
              <div key={p.id} className={`league-row ${isYou ? 'you' : ''} ${isPromo ? 'promo' : isDemo ? 'demo' : ''}`}>
                <span className="league-row-pos">#{pos}</span>
                <span className="league-row-name">{p.name}{isYou ? ' (you)' : ''}</span>
                <span className="league-row-xp">⭐{p.xp}</span>
                {p.streak > 0 && <span className="league-row-streak">🔥{p.streak}</span>}
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
        <button className="league-reset-btn" onClick={handleSeasonReset}>🔄 Reset Season</button>
      )}

      {matchFound ? (
        <div className="league-match-found">
          <p>⚔️ Pick a game:</p>
          <div className="league-game-grid">
            {GAMES_FOR_LEAGUE.map(g => (
              <button key={g.id} className="league-game-btn" onClick={() => handleAcceptMatch(g.id)}>
                <span className="league-game-emoji">{g.emoji}</span>
                <span className="league-game-label">{g.label}</span>
              </button>
            ))}
          </div>
          <button className="confirm-btn no" onClick={handleDeclineMatch}>Decline</button>
        </div>
      ) : (
        <button className="league-find-btn" onClick={handleFindMatch} disabled={searching}>
          {searching ? '⏳ Searching...' : '⚔️ Find Match'}
        </button>
      )}

      {error && (
        <div className={`league-toast ${error.includes('won') ? 'win' : 'info'}`}>{error}</div>
      )}

      <div className="league-footer">
        Top {PROMOTE_COUNT} promote · Bottom {DEMOTE_COUNT} demote · Win +10 XP · Loss -5 XP
      </div>
    </div>
  )
}
