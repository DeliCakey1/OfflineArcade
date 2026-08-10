export const CHAT_TTL_MS = 7 * 24 * 60 * 60 * 1000

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, dbMod] = await Promise.all([import('firebase/firestore'), import('../firebase').then(m => m.getDb())])
  _f = { ...firestore, db: dbMod }
  return _f
}

let lastCleanup = 0

export async function cleanupExpiredChatMessages() {
  const now = Date.now()
  if (now - lastCleanup < 60 * 60 * 1000) return
  lastCleanup = now
  try {
    const { collection, query, where, orderBy, limit, getDocs, deleteDoc } = await f()
    const { db } = await f()
    const cutoff = now - CHAT_TTL_MS
    const q = query(collection(db, 'chatMessages'), where('createdAt', '<', cutoff), orderBy('createdAt'), limit(50))
    const snap = await getDocs(q)
    if (snap.empty) return
    for (const d of snap.docs) {
      deleteDoc(d.ref).catch(() => {})
    }
  } catch {}
}
