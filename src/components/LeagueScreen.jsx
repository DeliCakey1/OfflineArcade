import { useState, useEffect, useRef } from 'react'
import useSound from '../useSound'
import {
  getRankInfo, MAX_PER_LEAGUE, PROMOTE_COUNT, DEMOTE_COUNT,
  getTimeUntilSeasonEnd, formatSeasonTime
} from '../leagues'
import {
  getOrCreatePlayer, findOrCreateLeagueInstance, joinLeague,
  getLeagueInstance, getLeaguePlayers,
  subscribeToLeague, subscribeToPlayer, processSeasonReset, updatePlayer,
  ensurePlayerInLeague,
} from '../leagueService'

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

export default function LeagueScreen({ onBack, userId, onPlayGame }) {
  const [player, setPlayer] = useState(null)
  const [league, setLeague] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seasonTime, setSeasonTime] = useState(0)
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
          if (!cancelled) setLoading(false)
          return
        }
        const lg = await getLeagueInstance(p.leagueInstanceId)
        if (!lg || lg.status === 'completed') {
          const newLg = await ensurePlayerInLeague(userId)
          if (!cancelled) setLeague(newLg)
        } else {
          if (!cancelled) setLeague(lg)
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
    if (!league?.players?.length) return
    let cancelled = false
    const refresh = () => {
      getLeaguePlayers(league.players).then(p => { if (!cancelled) setPlayers(p) }).catch(() => {})
    }
    const interval = setInterval(refresh, 10000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [league?.players])

  useEffect(() => {
    const tick = () => setSeasonTime(getTimeUntilSeasonEnd())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const sortedPlayers = [...players].sort((a, b) => b.xp - a.xp)
  const playerPosition = sortedPlayers.findIndex(p => p.id === userId) + 1
  const isPromotion = playerPosition > 0 && playerPosition <= PROMOTE_COUNT
  const isDemotion = playerPosition > sortedPlayers.length - DEMOTE_COUNT && playerPosition > PROMOTE_COUNT
  const rankInfo = getRankInfo(league?.rank || 10)

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

  if (player && !player.leagueInstanceId && !league) {
    return (
      <div className="league-page">
        <div className="league-page-header">
          <button className="quit-btn" onClick={onBack}>← Back</button>
          <div className="league-header-text">
            <h2>⚔️ Leagues</h2>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
          <h3 style={{ color: 'var(--text-light)', marginBottom: 8 }}>Complete a game to join!</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Play and finish any game to be placed in a league with other players.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="league-page">
      <div className="league-page-header">
        <button className="quit-btn" onClick={onBack}>← Back</button>
        <div className="league-header-text">
          <h2>{rankInfo.emoji} {rankInfo.name}</h2>
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
        <span className="league-size">{players.length}/{MAX_PER_LEAGUE}</span>
      </div>

      {playerPosition > 0 && (
        <div className={`league-zone ${isPromotion ? 'promotion' : isDemotion ? 'demotion' : 'safe'}`}>
          {isPromotion ? `⬆️ Promotion (#${playerPosition})` : isDemotion ? `⬇️ Demotion (#${playerPosition})` : `— Safe (#${playerPosition})`}
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

      {error && (
        <div className={`league-toast ${error.includes('won') ? 'win' : 'info'}`}>{error}</div>
      )}

      <div className="league-footer">
        Top {PROMOTE_COUNT} promote · Bottom {DEMOTE_COUNT} demote · Win +10 XP
      </div>
      <div className="league-footer" style={{ marginTop: 4, fontSize: 11 }}>
        Seasons reset every Wednesday at 12 AM PST
      </div>
    </div>
  )
}
