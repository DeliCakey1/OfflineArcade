import { useState, useEffect, useRef, useCallback } from 'react'
import { getFriendCode, getFriends } from '../socialService'
import { getNameplateStyle, getNameplateBorderStyle, getNameplateEffectClass, getNameplateNeonColor } from '../nameplateUtils'
import { LEAGUE_RANKS } from '../leagues'
import ChatPanel from './ChatPanel'
import { cleanupExpiredChatMessages, CHAT_TTL_MS } from '../chatTtl'

let _f = null
async function fb() {
  if (_f) return _f
  const [firestore, dbMod] = await Promise.all([import('firebase/firestore'), import('../firebase').then(m => m.getDb())])
  _f = { ...firestore, db: dbMod }
  return _f
}

function getLastRead(roomId) {
  try { return parseInt(localStorage.getItem('chat-lastread-' + roomId)) || 0 } catch { return 0 }
}
function setLastRead(roomId, ts) {
  try { localStorage.setItem('chat-lastread-' + roomId, String(ts || Date.now())) } catch {}
}

function loadUnreadCounts(uid) {
  if (!uid) return {}
  try { return JSON.parse(localStorage.getItem('chat-unread-' + uid) || '{}') } catch { return {} }
}
function saveUnreadCounts(uid, counts) {
  if (!uid) return
  try { localStorage.setItem('chat-unread-' + uid, JSON.stringify(counts)) } catch {}
}

export default function FriendsChatPopup({ userId, user }) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [unreadCounts, setUnreadCounts] = useState(() => loadUnreadCounts(userId))

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  const friendsLoaded = useRef(false)
  const prevUserId = useRef(userId)

  // Handle userId changes (sign out/in with different account)
  useEffect(() => {
    if (prevUserId.current !== userId) {
      setUnreadCounts(loadUnreadCounts(userId))
      friendsLoaded.current = false
      setFriends([])
    }
    prevUserId.current = userId
  }, [userId])

  // Persist unread counts to localStorage whenever they change
  useEffect(() => {
    saveUnreadCounts(userId, unreadCounts)
  }, [userId, unreadCounts])

  useEffect(() => {
    if (!open || !userId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const list = await getFriends()
        if (!cancelled) setFriends(list)
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [open, userId])

  useEffect(() => {
    if (!open) setSelected(null)
  }, [open])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let unsub = null

    // Always load friends list in background for unread tracking
    async function init() {
      try {
        const list = await getFriends()
        if (cancelled) return
        setFriends(list)
        friendsLoaded.current = true
      } catch {}
    }
    if (!friendsLoaded.current) init()

    async function listenForUnreads() {
      cleanupExpiredChatMessages()
      const { collection, query, orderBy, limit: qLimit, onSnapshot } = await fb()
      const { db } = await fb()

      const q = query(collection(db, 'chatMessages'), orderBy('createdAt', 'desc'), qLimit(50))
      unsub = onSnapshot(q, (snap) => {
        if (cancelled) return
        const counts = {}
        const cutoff = Date.now() - CHAT_TTL_MS
        snap.docs.forEach(doc => {
          const data = doc.data()
          if (!data.roomId || !data.userId) return
          if (data.userId === userId) return
          const parts = data.roomId.split('_')
          const friendId = parts.find(id => id !== userId)
          if (!friendId) return
          const lastRead = getLastRead(data.roomId)
          if (data.createdAt > cutoff && data.createdAt > lastRead && !data.deleted) {
            counts[friendId] = (counts[friendId] || 0) + 1
          }
        })
        if (!cancelled) setUnreadCounts(counts)
      }, () => {})
    }

    if (!open) listenForUnreads()
    return () => { cancelled = true; if (unsub) unsub() }
  }, [open, userId])

  const handleOpen = useCallback(() => {
    setOpen(true)
    // Mark all friend rooms as read
    const ts = Date.now()
    friends.forEach(f => {
      const roomId = [userId, f.id].sort().join('_')
      setLastRead(roomId, ts)
    })
    setUnreadCounts({})
  }, [friends, userId])

  const handleSelectFriend = useCallback((f) => {
    setSelected(f)
    const roomId = [userId, f.id].sort().join('_')
    setLastRead(roomId, Date.now())
    // Clear unread for this friend
    setUnreadCounts(prev => {
      const next = { ...prev }
      delete next[f.id]
      return next
    })
  }, [userId])

  const handleClose = useCallback((e) => {
    e?.stopPropagation()
    setOpen(false)
    // Mark all as read
    const ts = Date.now()
    friends.forEach(f => {
      const roomId = [userId, f.id].sort().join('_')
      setLastRead(roomId, ts)
    })
    setUnreadCounts({})
  }, [friends, userId])

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'transparent',
          }}
        />
      )}
      <div style={{ position: 'fixed', bottom: 20, right: 16, zIndex: 100 }}>
        {open && (
          <div style={{
            position: 'absolute', bottom: 56, right: 0,
            width: 360, maxHeight: 500,
            background: 'var(--card, #1a1033)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: 16, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 600,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{selected ? `💬 @${selected.username || 'friend'}` : '👥 Friends'}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {selected && (
                  <button onClick={(e) => { e.stopPropagation(); setSelected(null) }} style={{
                    background: 'transparent', border: 'none', color: 'var(--text-dim)',
                    cursor: 'pointer', fontSize: 12, padding: '2px 6px',
                  }}>← Back</button>
                )}
                <button onClick={handleClose} style={{
                  background: 'transparent', border: 'none', color: 'var(--text-dim)',
                  cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
                }}>×</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }} onClick={(e) => e.stopPropagation()}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 24, fontSize: 12, opacity: 0.4 }}>Loading...</div>
              ) : !selected ? (
                friends.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, fontSize: 12, opacity: 0.4 }}>No friends yet</div>
                ) : (
                  <div style={{ padding: 6 }}>
                    {friends.map(f => {
                      const ri = LEAGUE_RANKS.find(r => r.rank === f.league)
                      const unread = unreadCounts[f.id] || 0
                      return (
                        <button key={f.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                          borderRadius: 8, background: unread ? 'rgba(139,92,246,0.08)' : 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                          color: 'var(--text)', fontFamily: 'Fredoka, sans-serif',
                        }} onClick={(e) => { e.stopPropagation(); handleSelectFriend(f) }}>
                          <div style={{ position: 'relative' }}>
                            <span style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'var(--accent)', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                            }}>{(f.username || f.name || 'U')[0].toUpperCase()}</span>
                            {unread > 0 && (
                              <span style={{
                                position: 'absolute', top: -4, right: -4,
                                background: '#ef4444', color: '#fff', fontSize: 9,
                                fontWeight: 700, minWidth: 16, height: 16,
                                borderRadius: 8, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', padding: '0 4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                lineHeight: 1,
                              }}>{unread > 99 ? '99+' : unread}</span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{
                              fontSize: 12, fontWeight: unread ? 700 : 600,
                              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              @{f.username || f.name || 'Anonymous'}
                            </span>
                            <span style={{ fontSize: 10, opacity: 0.4 }}>
                              {ri?.emoji || '🦠'} {ri?.name || 'Microbe'} · {(f.xp || 0).toLocaleString()} pts
                            </span>
                          </div>
                          <span style={{ fontSize: 10, opacity: 0.3 }}>{unread > 0 ? '💬' : '💬'}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              ) : (
                <div onClick={(e) => e.stopPropagation()}>
                  <ChatPanel roomId={[userId, selected.id].sort().join('_')} user={user} />
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); if (open) setOpen(false); else handleOpen() }}
          style={{
            width: 48, height: 48, borderRadius: 12,
            background: open ? 'var(--accent, #8b5cf6)' : 'var(--card, #241845)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'all 0.2s', color: '#fff', position: 'relative',
          }}
          title={totalUnread > 0 ? `Friends Chat (${totalUnread} unread)` : 'Friends Chat'}
        >
          {open ? '×' : '👥'}
          {!open && totalUnread > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: '#fff', fontSize: 10,
              fontWeight: 700, minWidth: 18, height: 18,
              borderRadius: 9, display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '0 5px',
              boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
              lineHeight: 1,
            }}>{totalUnread > 99 ? '99+' : totalUnread}</span>
          )}
        </button>
      </div>
    </>
  )
}
