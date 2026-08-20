import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useChatRoom } from './ChatPanel'

const ONLINE_THRESHOLD = 120000

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

const LEAGUE_BADGES = {
  bronze: { emoji: '🥉', color: '#cd7f32' },
  silver: { emoji: '🥈', color: '#c0c0c0' },
  gold: { emoji: '🥇', color: '#ffd700' },
  platinum: { emoji: '💎', color: '#00d4ff' },
  diamond: { emoji: '👑', color: '#b946ff' },
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return Math.floor(diff / 86400000) + 'd ago'
}

const PlayerCard = memo(function PlayerCard({ player, onChallenge }) {
  const isOnline = player.lastActive && (Date.now() - player.lastActive) < ONLINE_THRESHOLD
  const league = player.league || 'bronze'
  const badge = LEAGUE_BADGES[league] || LEAGUE_BADGES.bronze
  const lastGame = player.lastGame ? GAME_NAMES[player.lastGame] : null
  const lastEmoji = player.lastGame ? GAME_EMOJIS[player.lastGame] || '🎮' : null

  return (
    <div style={{
      background: 'var(--card, rgba(255,255,255,0.04))',
      border: '1px solid var(--border, rgba(255,255,255,0.08))',
      borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      cursor: onChallenge ? 'pointer' : 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `linear-gradient(135deg, ${badge.color}44, ${badge.color}22)`,
          border: `2px solid ${badge.color}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: badge.color, flexShrink: 0,
          position: 'relative',
        }}>
          {(player.username || 'P')[0].toUpperCase()}
          <span style={{
            position: 'absolute', bottom: -2, right: -2, fontSize: 12,
          }}>{badge.emoji}</span>
          {isOnline && (
            <span style={{
              position: 'absolute', top: -2, right: -2, width: 10, height: 10,
              borderRadius: '50%', background: '#22c55e',
              border: '2px solid var(--card, #1a1033)',
            }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text, #e8e0ff)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {player.username || 'Anonymous'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim, rgba(255,255,255,0.4))' }}>
            {isOnline ? 'Online' : timeAgo(player.lastActive)}
            {player.wins != null && <span> · {player.wins}W-{player.losses || 0}L</span>}
          </div>
        </div>
      </div>
      {lastGame && (
        <div style={{
          fontSize: 11, color: 'var(--text-dim, rgba(255,255,255,0.4))',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span>{lastEmoji}</span>
          <span>Playing {lastGame}</span>
        </div>
      )}
      {onChallenge && isOnline && (
        <button onClick={() => onChallenge(player)} style={{
          background: 'linear-gradient(135deg, #ff2d7b, #b946ff)',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Fredoka, sans-serif',
        }}>
          ⚡ Challenge
        </button>
      )}
    </div>
  )
})

function GoalBar({ goal }) {
  if (!goal) return null
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))

  return (
    <div className="lobby-goal-section" style={{
      background: 'var(--card, rgba(255,255,255,0.04))',
      border: '1px solid var(--border, rgba(255,255,255,0.08))',
      borderRadius: 14, padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #e8e0ff)' }}>
          🎯 {goal.title || 'Community Goal'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim, rgba(255,255,255,0.4))' }}>
          {pct}%
        </div>
      </div>
      <div className="lobby-goal-bar-wrap" style={{
        height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden',
      }}>
        <div className="lobby-goal-bar-fill" style={{ width: pct + '%' }} />
      </div>
      <div className="lobby-goal-text" style={{
        marginTop: 8, fontSize: 12, color: 'var(--text-dim, rgba(255,255,255,0.4))',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{goal.label || `Play ${goal.target.toLocaleString()} games this week`}</span>
        <span style={{ fontWeight: 600, color: 'var(--text, #e8e0ff)' }}>
          {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

function LobbyChat({ user }) {
  const { messages, send, sending, loadError, rateLimited } = useChatRoom('global_lobby')
  const [input, setInput] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || sending || rateLimited) return
    send(input, user)
    setInput('')
  }

  return (
    <div className="lobby-chat" style={{
      background: 'var(--card, rgba(255,255,255,0.04))',
      border: '1px solid var(--border, rgba(255,255,255,0.08))',
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 200,
    }}>
      <div style={{
        padding: '10px 14px', fontSize: 13, fontWeight: 600,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          💬 Global Chat
          <span style={{ fontSize: 11, opacity: 0.4 }}>({messages.length})</span>
        </div>
      </div>

      <div className="lobby-chat-messages" ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', minHeight: 140 }}>
        {loadError && (
          <div style={{ textAlign: 'center', padding: 16, fontSize: 11, color: '#ef4444', opacity: 0.8 }}>
            ⚠️ {loadError}
          </div>
        )}
        {rateLimited && (
          <div style={{ textAlign: 'center', padding: 8, fontSize: 11, color: '#f59e0b', opacity: 0.9 }}>
            ⏳ Slow down! Max 5 messages per minute.
          </div>
        )}
        {messages.length === 0 && !loadError && (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 12, opacity: 0.4 }}>
            No messages yet. Say hi!
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = user && msg.userId === user.uid
          const showName = i === 0 || messages[i - 1]?.userId !== msg.userId
          return (
            <div key={msg.id} style={{
              display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
              alignItems: 'flex-end', gap: 4, marginBottom: 6,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                {!isMe && showName && (
                  <span style={{ fontSize: 10, color: 'var(--neon-cyan, #3b82f6)', opacity: 0.7, marginBottom: 2, fontWeight: 600 }}>
                    @{msg.username}
                  </span>
                )}
                <div className="lobby-chat-msg" style={{
                  background: isMe ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                  color: '#fff', padding: '6px 10px', borderRadius: 12,
                  borderBottomRightRadius: isMe ? 4 : 12,
                  borderBottomLeftRadius: isMe ? 12 : 4,
                  fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-dim, rgba(255,255,255,0.3))', marginTop: 1 }}>
                  {timeAgo(msg.createdAt)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} style={{
          display: 'flex', gap: 6, padding: '8px 10px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <input
            ref={inputRef}
            className="lobby-chat-input"
            value={input}
            onChange={e => setInput(e.target.value.slice(0, 100))}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e) }}
            placeholder="Say something..."
            maxLength={100}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '7px 10px', color: 'var(--text, #e8e0ff)',
              fontSize: 13, outline: 'none', fontFamily: 'Fredoka, sans-serif',
            }}
          />
          <button className="lobby-chat-send" type="submit"
            disabled={sending || !input.trim() || rateLimited}
            style={{
              background: '#8b5cf6', color: '#fff', border: 'none',
              borderRadius: 8, padding: '7px 14px', fontWeight: 600,
              fontSize: 13, cursor: sending || !input.trim() || rateLimited ? 'default' : 'pointer',
              opacity: sending || !input.trim() || rateLimited ? 0.5 : 1,
              fontFamily: 'Fredoka, sans-serif',
            }}>
            ➤
          </button>
        </form>
      ) : (
        <div className="lobby-chat-signin" style={{
          padding: '12px 14px', textAlign: 'center', fontSize: 12,
          color: 'var(--text-dim, rgba(255,255,255,0.4))',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          Sign in to chat
        </div>
      )}
    </div>
  )
}

function GlobalActivityFeed() {
  const [activities, setActivities] = useState([])

  useEffect(() => {
    let cancelled = false
    let unsub = () => {}

    async function subscribe() {
      try {
        const [{ collection, query, orderBy, limit, onSnapshot }, { getDb }] = await Promise.all([
          import('firebase/firestore'),
          import('../firebase'),
        ])
        const db = await getDb()
        const q = query(collection(db, 'scores'), orderBy('createdAt', 'desc'), limit(20))
        unsub = onSnapshot(q, snap => {
          if (cancelled) return
          const items = snap.docs.map(d => {
            const data = d.data()
            return {
              id: d.id,
              username: data.username || 'Anonymous',
              game: data.gameId,
              score: data.score,
              time: data.createdAt,
            }
          })
          setActivities(items)
        }, err => {
          console.warn('Global activity snapshot error:', err)
        })
      } catch (e) {
        console.warn('Global activity subscribe error:', e)
      }
    }
    subscribe()
    return () => { cancelled = true; unsub() }
  }, [])

  if (activities.length === 0) return null

  return (
    <div style={{
      background: 'var(--card, rgba(255,255,255,0.04))',
      border: '1px solid var(--border, rgba(255,255,255,0.08))',
      borderRadius: 14, padding: 14,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 600, marginBottom: 10,
        color: 'var(--text, #e8e0ff)',
      }}>
        🕐 Live Activity
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
        {activities.slice(0, 12).map(a => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.02)',
          }}>
            <span style={{ fontSize: 14 }}>{GAME_EMOJIS[a.game] || '🎮'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: 'var(--neon-cyan, #3b82f6)', fontSize: 11, fontWeight: 600 }}>@{a.username}</span>
              <span style={{ color: 'var(--text-dim, rgba(255,255,255,0.4))', fontSize: 11 }}> played {GAME_NAMES[a.game] || a.game}</span>
            </div>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: 'var(--neon-yellow, #f59e0b)' }}>
              {a.score}
            </span>
            <span style={{ color: 'var(--text-dim, rgba(255,255,255,0.3))', fontSize: 9, flexShrink: 0 }}>
              {timeAgo(a.time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function useOnlinePlayers() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let unsub = () => {}

    async function subscribe() {
      try {
        const [{ collection, query, orderBy, limit, onSnapshot }, { getDb }] = await Promise.all([
          import('firebase/firestore'),
          import('../firebase'),
        ])
        const db = await getDb()
        const q = query(collection(db, 'players'), orderBy('lastActive', 'desc'), limit(100))
        unsub = onSnapshot(q, snap => {
          if (cancelled) return
          const now = Date.now()
          const online = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.lastActive && (now - p.lastActive) < ONLINE_THRESHOLD)
          setPlayers(online)
          setLoading(false)
        }, err => {
          console.warn('Players snapshot error:', err)
          if (!cancelled) setLoading(false)
        })
      } catch (e) {
        console.warn('Players subscribe error:', e)
        if (!cancelled) setLoading(false)
      }
    }
    subscribe()
    return () => { cancelled = true; unsub() }
  }, [])

  return { players, loading }
}

function useWeeklyGoal() {
  const [goal, setGoal] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function subscribe() {
      try {
        const [{ doc, onSnapshot }, { getDb }] = await Promise.all([
          import('firebase/firestore'),
          import('../firebase'),
        ])
        const db = await getDb()
        const goalRef = doc(db, 'communityGoals', 'weekly')
        const unsub = onSnapshot(goalRef, snap => {
          if (cancelled) return
          if (snap.exists()) {
            const data = snap.data()
            setGoal({
              current: data.current || 0,
              target: data.target || 10000,
              title: data.title || 'Community Goal',
              label: data.label || 'Play 10,000 games this week',
            })
          } else {
            setGoal(null)
          }
        }, err => {
          console.warn('Goal snapshot error:', err)
        })
        return unsub
      } catch (e) {
        console.warn('Goal subscribe error:', e)
      }
    }
    const unsubPromise = subscribe()
    return () => { cancelled = true; unsubPromise?.then?.(u => u?.()) }
  }, [])

  return goal
}

export default function Lobby({ user, onChallenge, onMessage }) {
  const { players, loading: playersLoading } = useOnlinePlayers()
  const goal = useWeeklyGoal()
  const [activeTab, setActiveTab] = useState('activity')

  return (
    <div className="lobby-page" style={{
      minHeight: '100vh', padding: '20px 16px 40px',
      maxWidth: 960, margin: '0 auto',
    }}>
      <div className="lobby-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 8,
      }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700,
          color: 'var(--text, #e8e0ff)',
        }}>
          🏟️ Lobby
        </h1>
        <div className="lobby-online-badge" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 600,
          color: '#22c55e',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
            animation: 'pulse 2s infinite',
          }} />
          {playersLoading ? '...' : players.length} players online
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .lobby-goal-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff2d7b, #b946ff, #00d4ff);
          border-radius: 999px;
          transition: width 0.5s ease;
          position: relative;
          overflow: hidden;
        }
        .lobby-goal-bar-fill::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 2s infinite;
        }
        @media (max-width: 640px) {
          .lobby-content { flex-direction: column !important; }
          .lobby-players-section, .lobby-right-section { width: 100% !important; }
          .lobby-players-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div className="lobby-content" style={{
        display: 'flex', gap: 16, marginBottom: 16,
      }}>
        <div className="lobby-players-section" style={{ width: '38%', flexShrink: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, marginBottom: 10,
            color: 'var(--text-dim, rgba(255,255,255,0.4))',
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            👥 Players
          </div>
          <div className="lobby-players-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
            maxHeight: 'calc(100vh - 260px)', overflowY: 'auto',
            paddingRight: 4,
          }}>
            {playersLoading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32, fontSize: 12, opacity: 0.4 }}>
                Loading players...
              </div>
            )}
            {!playersLoading && players.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32, fontSize: 12, opacity: 0.4 }}>
                No players online right now
              </div>
            )}
            {players.map(p => (
              <PlayerCard key={p.id} player={p} onChallenge={onChallenge} />
            ))}
          </div>
        </div>

        <div className="lobby-right-section" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex', gap: 4, marginBottom: 2,
          }}>
            <button
              onClick={() => setActiveTab('activity')}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Fredoka, sans-serif',
                background: activeTab === 'activity' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                color: activeTab === 'activity' ? '#b946ff' : 'var(--text-dim, rgba(255,255,255,0.4))',
                transition: 'background 0.15s ease',
              }}
            >
              🕐 Activity
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Fredoka, sans-serif',
                background: activeTab === 'chat' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                color: activeTab === 'chat' ? '#b946ff' : 'var(--text-dim, rgba(255,255,255,0.4))',
                transition: 'background 0.15s ease',
              }}
            >
              💬 Chat
            </button>
          </div>

          {activeTab === 'activity' && <GlobalActivityFeed />}
          {activeTab === 'chat' && <LobbyChat user={user} />}
        </div>
      </div>

      <GoalBar goal={goal} />
    </div>
  )
}
