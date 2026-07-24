import { useState, useEffect, useRef } from 'react'
import { ensureAuth } from '../firebase'

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, dbMod] = await Promise.all([import('firebase/firestore'), import('../firebase').then(m => m.getDb())])
  _f = { ...firestore, db: dbMod }
  return _f
}

const COLLECTION = 'chatMessages'

export function useChatRoom(roomId) {
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!roomId) return
    let unsub = null
    let cancelled = false

    async function subscribe() {
      const { collection, query, orderBy, limit, onSnapshot } = await f()
      const { db } = await f()
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(50))
      unsub = onSnapshot(q, snap => {
        if (cancelled) return
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(m => m.roomId === roomId)
          .reverse()
        setMessages(msgs)
      })
    }
    subscribe()
    return () => { cancelled = true; unsub?.() }
  }, [roomId])

  async function send(text, user) {
    if (!text.trim() || !user) return
    setSending(true)
    try {
      const { collection, addDoc } = await f()
      const { db } = await f()
      await addDoc(collection(db, COLLECTION), {
        roomId,
        userId: user.uid,
        username: user.displayName || user.email?.split('@')[0] || 'Anon',
        text: text.trim().slice(0, 200),
        createdAt: Date.now(),
      })
    } catch {}
    setSending(false)
  }

  return { messages, send, sending }
}

export default function ChatPanel({ roomId, user }) {
  const { messages, send, sending } = useChatRoom(roomId)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || sending) return
    send(input, user)
    setInput('')
  }

  return (
    <div style={{
      background: 'var(--card, #241845)', border: '1px solid var(--border, rgba(255,255,255,0.08))',
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 320,
    }}>
      <div style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
        💬 Live Chat
        <span style={{ fontSize: 11, opacity: 0.4 }}>({messages.length} messages)</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', minHeight: 100 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, fontSize: 12, opacity: 0.4 }}>No messages yet. Say hi!</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: 'var(--accent, #8b5cf6)' }}>{msg.username}: </span>
            <span style={{ opacity: 0.85 }}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 10px', color: 'var(--text, #e8e0ff)', fontSize: 13,
            outline: 'none', fontFamily: 'Fredoka, sans-serif',
          }}
        />
        <button type="submit" disabled={sending || !input.trim()} style={{
          background: 'var(--accent, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Fredoka, sans-serif',
          opacity: sending || !input.trim() ? 0.5 : 1,
        }}>Send</button>
      </form>
    </div>
  )
}
