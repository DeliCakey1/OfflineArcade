import { useState, useEffect, useRef, useCallback } from 'react'
import { cleanupExpiredChatMessages, CHAT_TTL_MS } from '../chatTtl'

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, dbMod] = await Promise.all([import('firebase/firestore'), import('../firebase').then(m => m.getDb())])
  _f = { ...firestore, db: dbMod }
  return _f
}

const COLLECTION = 'chatMessages'
const RATE_LIMIT = 5
const RATE_WINDOW = 60000
const MAX_LEN = 100

const BUBBLE_COLORS = [
  '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316',
]
const FRIEND_COLORS_DEFAULT = '#3b82f6'

function getBubbleColor() {
  try { return localStorage.getItem('chat-bubble-color') || BUBBLE_COLORS[0] } catch { return BUBBLE_COLORS[0] }
}
function setBubbleColor(c) {
  try { localStorage.setItem('chat-bubble-color', c) } catch {}
}
function getFriendColors() {
  try { return JSON.parse(localStorage.getItem('chat-friend-colors') || '{}') } catch { return {} }
}
function setFriendColorStore(friendId, color) {
  try {
    const map = getFriendColors()
    map[friendId] = color
    localStorage.setItem('chat-friend-colors', JSON.stringify(map))
  } catch {}
}
function getFriendIdFromRoom(roomId, uid) {
  if (!roomId || !uid) return null
  const parts = roomId.split('_')
  return parts.find(id => id !== uid) || null
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function useChatRoom(roomId) {
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [rateLimited, setRateLimited] = useState(false)
  const sentTimestamps = useRef([])

  useEffect(() => {
    if (!roomId) return
    let unsub = null
    let cancelled = false
    setLoadError('')

    async function subscribe() {
      cleanupExpiredChatMessages()
      try {
        const { collection, query, orderBy, limit, onSnapshot } = await f()
        const { db } = await f()
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(50))
        unsub = onSnapshot(q, snap => {
          if (cancelled) return
          const cutoff = Date.now() - CHAT_TTL_MS
          const msgs = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(m => m.roomId === roomId && m.createdAt > cutoff)
            .reverse()
          setMessages(msgs)
          setLoadError('')
        }, err => {
          console.warn('Chat snapshot error:', err)
          if (!cancelled) setLoadError('Chat unavailable: ' + err.message)
        })
      } catch (e) {
        console.warn('Chat subscribe error:', e)
        if (!cancelled) setLoadError('Chat unavailable: ' + e.message)
      }
    }
    subscribe()
    return () => { cancelled = true; unsub?.() }
  }, [roomId])

  const send = useCallback(async (text, user) => {
    if (!text.trim() || !user) return
    const now = Date.now()
    sentTimestamps.current = sentTimestamps.current.filter(t => now - t < RATE_WINDOW)
    if (sentTimestamps.current.length >= RATE_LIMIT) {
      setRateLimited(true)
      setTimeout(() => setRateLimited(false), RATE_WINDOW)
      return
    }
    sentTimestamps.current.push(now)
    setSending(true)
    try {
      const { collection, addDoc, Timestamp } = await f()
      const { db } = await f()
      await addDoc(collection(db, COLLECTION), {
        roomId,
        userId: user.uid,
        username: user.displayName || user.email?.split('@')[0] || 'Anon',
        text: text.trim().slice(0, MAX_LEN),
        createdAt: Date.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + CHAT_TTL_MS),
      })
    } catch (e) {
      console.warn('Chat send error:', e)
    }
    setSending(false)
  }, [roomId])

  const editMessage = useCallback(async (msgId, newText) => {
    if (!msgId || !newText.trim()) return
    try {
      const { doc, updateDoc, arrayUnion } = await f()
      const { db } = await f()
      await updateDoc(doc(db, COLLECTION, msgId), {
        text: newText.trim().slice(0, MAX_LEN),
        editedAt: Date.now(),
        editHistory: arrayUnion(newText.trim().slice(0, MAX_LEN)),
      })
    } catch (e) {
      console.warn('Chat edit error:', e)
    }
  }, [])

  const deleteMessage = useCallback(async (msgId) => {
    if (!msgId) return
    try {
      const { doc, updateDoc } = await f()
      const { db } = await f()
      await updateDoc(doc(db, COLLECTION, msgId), {
        deleted: true,
        text: '',
        deletedAt: Date.now(),
      })
    } catch (e) {
      console.warn('Chat delete error:', e)
    }
  }, [])

  return { messages, send, sending, loadError, rateLimited, editMessage, deleteMessage }
}

export default function ChatPanel({ roomId, user }) {
  const { messages, send, sending, loadError, rateLimited, editMessage, deleteMessage } = useChatRoom(roomId)
  const [input, setInput] = useState('')
  const [showColors, setShowColors] = useState(false)
  const [myColor, setMyColorState] = useState(getBubbleColor)
  const [friendColors, setFriendColorsState] = useState(getFriendColors)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editInput, setEditInput] = useState('')
  const [showHistory, setShowHistory] = useState(null)
  const bottomRef = useRef(null)

  const uid = user?.uid || ''
  const friendId = getFriendIdFromRoom(roomId, uid)
  const otherColor = friendColors[friendId] || FRIEND_COLORS_DEFAULT

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || sending || rateLimited) return
    send(input, user)
    setInput('')
  }

  function setColor(c) {
    setMyColorState(c)
    setBubbleColor(c)
  }

  function setFriendColor(c) {
    if (!friendId) return
    setFriendColorStore(friendId, c)
    setFriendColorsState(prev => ({ ...prev, [friendId]: c }))
  }

  function handleBubbleClick(msg) {
    if (!user || msg.userId !== user.uid || msg.deleted) return
    setSelectedMsg(msg)
  }

  function handleEdit() {
    if (!selectedMsg) return
    setEditInput(selectedMsg.text)
    setEditing(selectedMsg.id)
    setSelectedMsg(null)
  }

  function handleSaveEdit() {
    if (!editing || !editInput.trim()) return
    editMessage(editing, editInput)
    setEditing(null)
    setEditInput('')
  }

  function handleDelete() {
    if (!selectedMsg) return
    deleteMessage(selectedMsg.id)
    setSelectedMsg(null)
  }

  const remaining = MAX_LEN - input.length

  return (
    <div style={{
      background: 'var(--card, #241845)', border: '1px solid var(--border, rgba(255,255,255,0.08))',
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 420,
    }}>
      <div style={{
        padding: '10px 14px', fontSize: 13, fontWeight: 600,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          💬 Live Chat
          <span style={{ fontSize: 11, opacity: 0.4 }}>({messages.length})</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
          {showColors && (
            <div style={{
              position: 'absolute', top: 28, right: 0, zIndex: 10,
              background: '#1a1033', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: 8, minWidth: 180,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Your bubbles</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {BUBBLE_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{
                    width: 20, height: 20, borderRadius: '50%', background: c,
                    border: c === myColor ? '2px solid #fff' : '2px solid transparent',
                    cursor: 'pointer', padding: 0,
                  }} />
                ))}
              </div>
              {friendId && (
                <>
                  <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Their bubbles</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {BUBBLE_COLORS.map(c => (
                      <button key={c} onClick={() => setFriendColor(c)} style={{
                        width: 20, height: 20, borderRadius: '50%', background: c,
                        border: c === otherColor ? '2px solid #fff' : '2px solid transparent',
                        cursor: 'pointer', padding: 0,
                      }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button onClick={() => setShowColors(!showColors)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 16, lineHeight: 1, display: 'flex', gap: 2,
          }} title="Change bubble colors">
            <span style={{
              display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
              background: myColor, border: '2px solid rgba(255,255,255,0.3)',
            }} />
            {friendId && (
              <span style={{
                display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                background: otherColor, border: '2px solid rgba(255,255,255,0.3)',
              }} />
            )}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', minHeight: 180 }}>
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
        {!loadError && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 12, opacity: 0.4 }}>
            No messages yet. Say hi!
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.userId === uid
          const showAvatar = !isMe && (i === 0 || messages[i - 1]?.userId !== msg.userId)
          const bubbleColor = isMe ? myColor : otherColor
          if (msg.deleted) {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 4, opacity: 0.4 }}>
                <div style={{ fontSize: 11, fontStyle: 'italic', padding: '4px 8px', color: 'var(--text-dim)' }}>
                  (message deleted by author)
                </div>
              </div>
            )
          }
          return (
            <HoverBubble
              key={msg.id}
              msg={msg}
              isMe={isMe}
              showAvatar={showAvatar}
              bubbleColor={bubbleColor}
              onBubbleClick={handleBubbleClick}
              onShowHistory={setShowHistory}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => { if (e.target.value.length <= MAX_LEN) setInput(e.target.value) }}
            placeholder="Type a message..."
            maxLength={MAX_LEN}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 10px', color: 'var(--text, #e8e0ff)', fontSize: 13,
              outline: 'none', fontFamily: 'Fredoka, sans-serif',
            }}
          />
          <button type="submit" disabled={sending || !input.trim() || rateLimited} style={{
            background: rateLimited ? 'rgba(245,158,11,0.2)' : myColor,
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Fredoka, sans-serif',
            opacity: sending || !input.trim() || rateLimited ? 0.5 : 1,
          }}>{rateLimited ? '⏳' : 'Send'}</button>
        </div>
        <div style={{ fontSize: 10, color: remaining < 20 ? '#ef4444' : 'var(--text-dim)', textAlign: 'right', opacity: 0.6 }}>
          {remaining}/{MAX_LEN}
        </div>
      </form>

      {selectedMsg && (
        <div onClick={() => setSelectedMsg(null)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--card, #1a1033)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 20, minWidth: 240,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Message Options</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
              {selectedMsg.text}
            </div>
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              <button onClick={handleEdit} style={{
                padding: '10px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Fredoka, sans-serif',
              }}>✏️ Edit Message</button>
              <button onClick={handleDelete} style={{
                padding: '10px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Fredoka, sans-serif',
              }}>🗑️ Delete Message</button>
              <button onClick={() => setSelectedMsg(null)} style={{
                padding: '10px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'Fredoka, sans-serif',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div onClick={() => { setEditing(null); setEditInput('') }} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--card, #1a1033)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 20, minWidth: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>✏️ Edit Message</div>
            <textarea
              value={editInput}
              onChange={e => { if (e.target.value.length <= MAX_LEN) setEditInput(e.target.value) }}
              maxLength={MAX_LEN}
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: 60, resize: 'none',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13,
                outline: 'none', fontFamily: 'Fredoka, sans-serif', marginBottom: 8,
              }}
            />
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'right', marginBottom: 12, opacity: 0.5 }}>
              {editInput.length}/{MAX_LEN}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSaveEdit} disabled={!editInput.trim()} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                background: !editInput.trim() ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.15)',
                color: !editInput.trim() ? 'var(--text-dim)' : '#3b82f6',
                cursor: !editInput.trim() ? 'default' : 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'Fredoka, sans-serif',
              }}>Save</button>
              <button onClick={() => { setEditing(null); setEditInput('') }} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'Fredoka, sans-serif',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div onClick={() => setShowHistory(null)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--card, #1a1033)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 20, minWidth: 280, maxHeight: 300, overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📝 Edit History</div>
            {showHistory.editHistory && showHistory.editHistory.length > 0 ? (
              [...showHistory.editHistory].reverse().map((t, idx) => (
                <div key={idx} style={{
                  padding: '8px 10px', background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8, marginBottom: 6, fontSize: 12, color: 'var(--text-dim)',
                }}>
                  <div style={{ opacity: 0.5, fontSize: 10, marginBottom: 2 }}>Version {showHistory.editHistory.length - idx}</div>
                  {t}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, opacity: 0.4, textAlign: 'center', padding: 16 }}>No edit history available.</div>
            )}
            <button onClick={() => setShowHistory(null)} style={{
              width: '100%', marginTop: 8, padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)',
              cursor: 'pointer', fontSize: 13, fontFamily: 'Fredoka, sans-serif',
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

function HoverBubble({ msg, isMe, showAvatar, bubbleColor, onBubbleClick, onShowHistory }) {
  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
      {!isMe && (
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          display: showAvatar ? 'flex' : 'none',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, flexShrink: 0, color: 'var(--text-dim)',
        }}>{(msg.username || '?')[0].toUpperCase()}</span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        {!isMe && showAvatar && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', opacity: 0.5, marginLeft: 4, marginBottom: 2 }}>
            {msg.username}
          </span>
        )}
        <div style={{ display: 'flex', flexDirection: isMe ? 'row' : 'row-reverse', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontSize: 9, color: 'var(--text-dim)', opacity: 0.35,
            paddingBottom: 2, whiteSpace: 'nowrap', flexShrink: 0,
            lineHeight: 1,
          }}>
            {formatTime(msg.createdAt)}
          </span>
          <div
            onClick={() => onBubbleClick(msg)}
            style={{
              background: bubbleColor,
              color: isMe ? '#fff' : '#fff',
              padding: '8px 12px', borderRadius: 16,
              borderBottomRightRadius: isMe ? 4 : 16,
              borderBottomLeftRadius: isMe ? 16 : 4,
              fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word',
              cursor: isMe ? 'pointer' : 'default',
            }}
          >
            {msg.text}
            {msg.editedAt && (
              <span
                onClick={(e) => { e.stopPropagation(); onShowHistory(msg) }}
                style={{ fontSize: 10, opacity: 0.6, display: 'block', marginTop: 2, cursor: 'pointer' }}
              >
                (edited)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
