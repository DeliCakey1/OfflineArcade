import { useState, useEffect, useRef, useCallback } from 'react'
import useSound from '../useSound'
import {
  getRankInfo, LEAGUE_RANKS, MAX_PER_LEAGUE, PROMOTE_COUNT, DEMOTE_COUNT,
  getTimeUntilSeasonEnd, formatSeasonTime
} from '../leagues'
import {
  getOrCreatePlayer, findOrCreateLeagueInstance, joinLeague, leaveLeague,
  getLeagueInstance, getLeaguePlayers, findMatch, createMatch, finishMatch,
  subscribeToLeague, subscribeToPlayer, processSeasonReset, updatePlayer,
  getAllLeaguesForPlayer, getPlayer
} from '../leagueService'
import QuitConfirmButton from './QuitConfirmButton'

const GAMES_FOR_LEAGUE = [
  { id: 'rps', label: 'Rock Paper Scissors', emoji: '✊' },
  { id: 'gtn', label: 'Guess The Number', emoji: '🔢' },
  { id: 'hol', label: 'Higher or Lower', emoji: '🃏' },
  { id: 'dice', label: 'Dice Roll', emoji: '🎲' },
  { id: 'simon', label: 'Simon Says', emoji: '🎵' },
  { id: 'typing', label: 'Typing Speed', emoji: '⌨️' },
]

export default function LeagueScreen({ onBack, userId, onNavigateGame }) {
  const [player, setPlayer] = useState(null)
  const [league, setLeague] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seasonTime, setSeasonTime] = useState(0)
  const [searching, setSearching] = useState(false)
  const [matchFound, setMatchFound] = useState(null)
  const [selectedGame, setSelectedGame] = useState(null)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const sound = useSound()
  const unsubLeagueRef = useRef(null)
  const unsubPlayerRef = useRef(null)

  useEffect(() => {
    async function init() {
      try {
        if (!userId) { setError('Please sign in to access leagues'); setLoading(false); return }
        const p = await getOrCreatePlayer(userId)
        setPlayer(p)

        if (!p.leagueInstanceId) {
          const lg = await findOrCreateLeagueInstance(p.league)
          await joinLeague(lg.id, userId)
          await updatePlayer(userId, { leagueInstanceId: lg.id })
          setLeague(lg)
        } else {
          const lg = await getLeagueInstance(p.leagueInstanceId)
          if (!lg || lg.status === 'completed') {
            const newLg = await findOrCreateLeagueInstance(p.league)
            await joinLeague(newLg.id, userId)
            await updatePlayer(userId, { leagueInstanceId: newLg.id })
            setLeague(newLg)
          } else {
            setLeague(lg)
          }
        }
        setLoading(false)
      } catch (e) {
        setError('Failed to load league data. Check your connection.')
        setLoading(false)
      }
    }
    init()
  }, [userId])

  useEffect(() => {
    if (!league?.id) return
    unsubLeagueRef.current = subscribeToLeague(league.id, (data) => {
      setLeague(data)
    })
    return () => unsubLeagueRef.current?.()
  }, [league?.id])

  useEffect(() => {
    if (!player?.id) return
    unsubPlayerRef.current = subscribeToPlayer(player.id, (data) => {
      setPlayer(data)
    })
    return () => unsubPlayerRef.current?.()
  }, [player?.id])

  useEffect(() => {
    if (!league?.players) return
    let cancelled = false
    getLeaguePlayers(league.players).then(p => {
      if (!cancelled) setPlayers(p)
    })
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
        setError('No opponents available right now. Try again later.')
        setTimeout(() => setError(null), 3000)
        return
      }
      setMatchFound(opponentId)
      const opponent = await getPlayer(opponentId)
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
    setWaitingForOpponent(true)
    setSelectedGame(gameId)

    const match = await createMatch(userId, matchFound, gameId)
    await finishMatch(match.id, userId, matchFound)
    setWaitingForOpponent(false)
    setMatchFound(null)
    setSelectedGame(null)
    sound('victory')
    setError(`You won +10 XP!`)
    setTimeout(() => setError(null), 3000)
  }

  function handleDeclineMatch() {
    setMatchFound(null)
    setSearching(false)
    sound('click')
  }

  async function handleSeasonReset() {
    if (!league?.id) return
    sound('confirm')
    await processSeasonReset(league.id)
    const p = await getOrCreatePlayer(userId)
    setPlayer(p)
    if (p.leagueInstanceId) {
      const lg = await getLeagueInstance(p.leagueInstanceId)
      setLeague(lg)
    }
    sound('victory')
  }

  if (loading) {
    return (
      <div className="game-card slide-in">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>⚔️</div>
          <p style={{ color: 'var(--text-dim)' }}>Loading leagues...</p>
        </div>
      </div>
    )
  }

  if (error && !player) {
    return (
      <div className="game-card slide-in">
        <h2>⚔️ Leagues</h2>
        <p style={{ color: 'var(--lose-color)', textAlign: 'center', padding: 20 }}>{error}</p>
        <button className="quit-btn" onClick={onBack}>← Back</button>
      </div>
    )
  }

  return (
    <div className="game-card slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <QuitConfirmButton onQuit={onBack} gameOver={true} className="quit-btn" />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>Season Ends</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: seasonTime < 3600000 ? 'var(--neon-red)' : 'var(--neon-blue)' }}>
            {formatSeasonTime(seasonTime)}
          </div>
        </div>
      </div>

      <div className="league-header" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{rankInfo.emoji}</div>
        <h2 style={{ color: rankInfo.color, marginBottom: 4 }}>{rankInfo.name}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          League {league?.rank || 10} · {players.length}/{MAX_PER_LEAGUE} players
        </p>
        {player && (
          <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center', fontSize: 14 }}>
            <span>⭐ {player.xp} XP</span>
            <span>🏆 {player.wins}W</span>
            <span>💀 {player.losses}L</span>
            {player.streak > 0 && <span>🔥 {player.streak}</span>}
          </div>
        )}
      </div>

      {playerPosition > 0 && (
        <div className={`league-zone ${isPromotion ? 'promotion' : isDemotion ? 'demotion' : 'safe'}`} style={{
          textAlign: 'center', padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          border: `1px solid ${isPromotion ? 'rgba(57,255,20,0.3)' : isDemotion ? 'rgba(255,45,123,0.3)' : 'rgba(255,255,255,0.1)'}`,
          background: isPromotion ? 'rgba(57,255,20,0.08)' : isDemotion ? 'rgba(255,45,123,0.08)' : 'rgba(255,255,255,0.04)',
        }}>
          <span style={{ fontWeight: 700, color: isPromotion ? 'var(--win-color)' : isDemotion ? 'var(--lose-color)' : 'var(--text-dim)' }}>
            {isPromotion ? `⬆️ Promotion Zone (#${playerPosition})` : isDemotion ? `⬇️ Demotion Zone (#${playerPosition})` : `— Safe Zone (#${playerPosition})`}
          </span>
        </div>
      )}

      <div className="league-standings" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 10, color: 'var(--text-dim)' }}>Standings</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sortedPlayers.map((p, i) => {
            const pos = i + 1
            const isYou = p.id === userId
            const isPromo = pos <= PROMOTE_COUNT
            const isDemo = pos > sortedPlayers.length - DEMOTE_COUNT && pos > PROMOTE_COUNT
            return (
              <div key={p.id} className={`league-row ${isYou ? 'you' : ''}`} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 10, border: `1px solid ${isYou ? 'var(--neon-purple)' : isPromo ? 'rgba(57,255,20,0.2)' : isDemo ? 'rgba(255,45,123,0.2)' : 'var(--border-glass)'}`,
                background: isYou ? 'rgba(185,70,255,0.1)' : isPromo ? 'rgba(57,255,20,0.04)' : isDemo ? 'rgba(255,45,123,0.04)' : 'var(--bg-glass)',
                fontWeight: isYou ? 700 : 400,
              }}>
                <span style={{ width: 24, textAlign: 'center', fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: isPromo ? 'var(--win-color)' : isDemo ? 'var(--lose-color)' : 'var(--text-dim)' }}>
                  #{pos}
                </span>
                <span style={{ flex: 1, fontSize: 14 }}>{p.name}{isYou ? ' (you)' : ''}</span>
                <span style={{ fontSize: 13, color: 'var(--neon-yellow)' }}>⭐ {p.xp}</span>
                {p.streak > 0 && <span style={{ fontSize: 12 }}>🔥 {p.streak}</span>}
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{p.wins}W/{p.losses}L</span>
              </div>
            )
          })}
          {sortedPlayers.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>No players in this league yet</p>
          )}
        </div>
      </div>

      {seasonTime === 0 && (
        <button className="cloak-save-btn" onClick={handleSeasonReset} style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}>
          🔄 Process Season Reset
        </button>
      )}

      {matchFound ? (
        <div className="match-found" style={{ textAlign: 'center', padding: 16, background: 'rgba(57,255,20,0.08)', borderRadius: 12, border: '1px solid rgba(57,255,20,0.25)', marginBottom: 16, animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚔️</div>
          <p style={{ fontWeight: 700, marginBottom: 12 }}>Opponent Found! Pick a game:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {GAMES_FOR_LEAGUE.map(g => (
              <button key={g.id} className="rps-mode-card" onClick={() => handleAcceptMatch(g.id)} style={{ padding: '12px 8px', fontSize: 13 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{g.emoji}</div>
                <div>{g.label}</div>
              </button>
            ))}
          </div>
          <button className="confirm-btn no" onClick={handleDeclineMatch} style={{ marginTop: 12 }}>Decline</button>
        </div>
      ) : (
        <button
          className="cloak-save-btn"
          onClick={handleFindMatch}
          disabled={searching}
          style={{ width: '100%', background: searching ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--neon-green), var(--neon-blue))', marginBottom: 12 }}
        >
          {searching ? '⏳ Searching...' : '⚔️ Find Match'}
        </button>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: 10, borderRadius: 8, background: error.includes('won') ? 'rgba(57,255,20,0.1)' : 'rgba(255,45,123,0.1)', color: error.includes('won') ? 'var(--win-color)' : 'var(--lose-color)', fontSize: 14, marginBottom: 12, animation: 'popIn 0.3s ease' }}>
          {error}
        </div>
      )}

      <div className="league-info" style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.6, padding: '8px 0' }}>
        <p>Top {PROMOTE_COUNT} promote · Bottom {DEMOTE_COUNT} demote</p>
        <p>Win = +10 XP · Loss = -5 XP</p>
      </div>
    </div>
  )
}
