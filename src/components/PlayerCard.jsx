import { memo } from 'react'

const LEAGUE_EMOJIS = {
  1: '🦠', 2: '🐛', 3: '🐢', 4: '🐱', 5: '🐺', 6: '🦁', 7: '🐉', 8: '🦅', 9: '⭐', 10: '👑', 11: '🔱'
}

function PlayerCard({ player, isFriend, onChallenge, onMessage }) {
  const isOnline = player.presence?.lastSeen && (Date.now() - player.presence.lastSeen < 60000)
  const isPlaying = player.presence?.status?.startsWith('Playing ')
  const gameName = isPlaying ? player.presence.status.replace('Playing ', '') : null

  function getLevel(xp) {
    let level = 0
    let remaining = xp || 0
    const needed = [10]
    while (remaining >= needed[level]) {
      remaining -= needed[level]
      level++
      needed.push(Math.ceil(needed[level - 1] * 1.25))
    }
    return level
  }

  const level = getLevel(player.xp || 0)
  const leagueEmoji = LEAGUE_EMOJIS[player.league] || '🦠'

  return (
    <div className={`lobby-player-card ${isFriend ? 'friend' : ''} ${isOnline ? 'online' : 'offline'}`}>
      <div className="lobby-player-status-dot" style={{ background: isOnline ? (isPlaying ? 'var(--neon-cyan)' : '#22c55e') : '#666' }} />
      <div className="lobby-player-info">
        <div className="lobby-player-name">
          <span className="lobby-player-league">{leagueEmoji}</span>
          <span>{player.username || player.name || 'Player'}</span>
          {player.title && <span className="lobby-player-title">{player.title}</span>}
        </div>
        <div className="lobby-player-meta">
          <span className="lobby-player-level">Lv.{level}</span>
          {isPlaying && <span className="lobby-player-game">Playing {gameName}</span>}
          {!isPlaying && isOnline && <span className="lobby-player-status-text">Online</span>}
        </div>
      </div>
      {isOnline && (
        <div className="lobby-player-actions">
          {onChallenge && <button className="lobby-action-btn" onClick={() => onChallenge(player)} title="Challenge">⚔️</button>}
          {onMessage && <button className="lobby-action-btn" onClick={() => onMessage(player)} title="Message">💬</button>}
        </div>
      )}
    </div>
  )
}

export default memo(PlayerCard)
