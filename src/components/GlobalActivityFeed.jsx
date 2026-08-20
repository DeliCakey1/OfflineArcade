import { useState, useEffect } from 'react'
import { subscribeToActivityFeed, getGameName, getGameEmoji } from '../communityGoals'

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return Math.floor(diff / 86400000) + 'd ago'
}

function GlobalActivityFeed() {
  const [activities, setActivities] = useState([])

  useEffect(() => {
    const unsub = subscribeToActivityFeed((items) => setActivities(items), 20)
    return () => unsub?.()
  }, [])

  if (activities.length === 0) return null

  function renderActivity(item) {
    const { type, username, data, createdAt } = item
    switch (type) {
      case 'game_complete':
        return (
          <>
            <span className="lobby-activity-emoji">{getGameEmoji(data?.gameId)}</span>
            <span className="lobby-activity-user">@{username}</span>
            <span>scored {data?.score || 0} in {getGameName(data?.gameId)}</span>
          </>
        )
      case 'level_up':
        return (
          <>
            <span className="lobby-activity-emoji">🎉</span>
            <span className="lobby-activity-user">@{username}</span>
            <span>reached Level {data?.level || '?'}</span>
          </>
        )
      case 'achievement':
        return (
          <>
            <span className="lobby-activity-emoji">{data?.emoji || '🏅'}</span>
            <span className="lobby-activity-user">@{username}</span>
            <span>earned "{data?.name || 'Achievement'}"</span>
          </>
        )
      case 'new_player':
        return (
          <>
            <span className="lobby-activity-emoji">🆕</span>
            <span className="lobby-activity-user">@{username}</span>
            <span>joined the arcade!</span>
          </>
        )
      default:
        return (
          <>
            <span className="lobby-activity-emoji">🎮</span>
            <span className="lobby-activity-user">@{username}</span>
            <span>was active</span>
          </>
        )
    }
  }

  return (
    <div className="lobby-activity-feed">
      <h3 className="lobby-section-title">Live Activity</h3>
      <div className="lobby-activity-list">
        {activities.map(item => (
          <div key={item.id} className="lobby-activity-item">
            <div className="lobby-activity-content">{renderActivity(item)}</div>
            <span className="lobby-activity-time">{timeAgo(item.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GlobalActivityFeed
