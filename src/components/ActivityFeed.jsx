import { useState, useEffect } from 'react'
import { subscribeToFriendScores, getFriends } from '../socialService'

const GAME_NAMES = {
  rps: 'Rock Paper Scissors', ssg: 'Split Steal Give Away', gtn: 'Guess The Number',
  'gtn-hc': 'Hot or Cold', hol: 'Higher or Lower', dice: 'Dice Roll',
  coin: 'Coin Flip Streak', memory: 'Memory Match', word: 'Word Scramble',
  merge: 'Number Merge', reaction: 'Reaction Time', typing: 'Typing Speed',
  simon: 'Simon Says', slots: 'Slots', blackjack: 'Blackjack',
  whack: 'Whack-a-Mole', snake: 'Snake', tetris: 'Tetris',
  breakout: 'Breakout', flappy: 'Flappy Bird', minesweeper: 'Minesweeper',
  lightsout: 'Lights Out', mastermind: 'Mastermind', dodge: 'Dodge',
  mergeblitz: 'Merge Blitz', connect4: 'Connect Four',
  sudoku: 'Sudoku', mathdash: 'Math Dash', wordle: 'Wordle',
}
const GAME_EMOJIS = {
  rps: '✊', ssg: '💰', gtn: '🔢', 'gtn-hc': '🌡️', hol: '🃏', dice: '🎲',
  coin: '🪙', memory: '🧠', word: '📚', merge: '🔢', reaction: '⚡',
  typing: '⌨️', simon: '🎵', slots: '🎰', blackjack: '🃏', whack: '🔨',
  snake: '🐍', tetris: '🧱', breakout: '🏓', flappy: '🐦', minesweeper: '💣',
  lightsout: '💡', mastermind: '🧠', dodge: '🎮', mergeblitz: '⚡',
  connect4: '🔴', sudoku: '🔢', mathdash: '➕', wordle: '📝',
}

export default function ActivityFeed({ userId }) {
  const [activities, setActivities] = useState([])
  const [friendIds, setFriendIds] = useState([])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getFriends().then(friends => {
      if (cancelled) return
      const ids = friends.map(f => f.id)
      setFriendIds(ids)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    if (friendIds.length === 0) return
    const unsub = subscribeToFriendScores(friendIds, (scores) => {
      const mapped = scores.map(s => ({
        id: s.id,
        username: s.username || 'Anonymous',
        gameName: GAME_NAMES[s.gameId] || s.gameId,
        gameEmoji: GAME_EMOJIS[s.gameId] || '🎮',
        score: s.score,
        time: s.createdAt,
      })).sort((a, b) => (b.time || 0) - (a.time || 0))
      setActivities(mapped)
    })
    return () => unsub?.()
  }, [friendIds])

  if (activities.length === 0) return null

  function timeAgo(ts) {
    if (!ts) return ''
    const diff = Date.now() - ts
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.06)', padding: 16,
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
        🕐 Friend Activity
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {activities.slice(0, 10).map(a => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.02)',
          }}>
            <span style={{ fontSize: 16 }}>{a.gameEmoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: 'var(--neon-cyan)', fontSize: 12, fontWeight: 600 }}>@{a.username}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 12 }}> played {a.gameName}</span>
            </div>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: 'var(--neon-yellow)' }}>
              {a.score}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: 10, flexShrink: 0 }}>
              {timeAgo(a.time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
