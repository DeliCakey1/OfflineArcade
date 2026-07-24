import { getDb, ensureAuth } from './firebase'

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, db] = await Promise.all([import('firebase/firestore'), getDb()])
  _f = { ...firestore, db }
  return _f
}

const DAILY_SCORES = 'dailyScores'
const PLAYERS = 'players'

function getDailyDate() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export async function submitDailyScore(gameId, score, timeMs) {
  const user = await ensureAuth()
  if (!user) return
  const { doc, setDoc, getDoc } = await f()
  const { db } = await f()
  const date = getDailyDate()
  const docId = `${date}_${gameId}_${user.uid}`
  const playerDoc = await getDoc(doc(db, PLAYERS, user.uid))
  const playerData = playerDoc.exists() ? playerDoc.data() : {}
  await setDoc(doc(db, DAILY_SCORES, docId), {
    userId: user.uid,
    username: playerData.username || playerData.name || 'Anonymous',
    nameplate: playerData.nameplate || null,
    nameplateEffect: playerData.nameplateEffect || null,
    title: playerData.title || null,
    date, gameId, score, timeMs: timeMs || 0, createdAt: Date.now(),
  })
}

export async function getDailyLeaderboard(gameId, maxResults = 20) {
  const { collection, query, where, orderBy, getDocs, limit: firestoreLimit } = await f()
  const { db } = await f()
  const date = getDailyDate()
  const q = query(collection(db, DAILY_SCORES), where('date', '==', date), where('gameId', '==', gameId), orderBy('score', 'desc'), firestoreLimit(maxResults))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getDailyLeaderboardByUser(gameId) {
  const { collection, query, where, orderBy, getDocs, limit: firestoreLimit } = await f()
  const { db } = await f()
  const date = getDailyDate()
  const q = query(collection(db, DAILY_SCORES), where('date', '==', date), where('gameId', '==', gameId), orderBy('score', 'desc'), firestoreLimit(100))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getFriendCode(userId) {
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()
  const snap = await getDoc(doc(db, PLAYERS, userId))
  if (!snap.exists()) return null
  const data = snap.data()
  if (data.friendCode) return data.friendCode
  const code = userId.slice(0, 8).toUpperCase()
  await updateDoc(doc(db, PLAYERS, userId), { friendCode: code })
  return code
}

export async function addFriendByCode(friendCode) {
  const user = await ensureAuth()
  if (!user) return { error: 'Not signed in' }
  const { collection, query, where, getDocs, doc, updateDoc, arrayUnion } = await f()
  const { db } = await f()
  const q = query(collection(db, PLAYERS), where('friendCode', '==', friendCode.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) return { error: 'Player not found' }
  const friendDoc = snap.docs[0]
  if (friendDoc.id === user.uid) return { error: "Can't add yourself" }
  await updateDoc(doc(db, PLAYERS, user.uid), { friends: arrayUnion(friendDoc.id) })
  await updateDoc(doc(db, PLAYERS, friendDoc.id), { friends: arrayUnion(user.uid) })
  return { success: true, name: friendDoc.data().username || friendDoc.data().name }
}

export async function removeFriend(friendId) {
  const user = await ensureAuth()
  if (!user) return
  const { doc, updateDoc, arrayRemove } = await f()
  const { db } = await f()
  await updateDoc(doc(db, PLAYERS, user.uid), { friends: arrayRemove(friendId) })
  await updateDoc(doc(db, PLAYERS, friendId), { friends: arrayRemove(user.uid) })
}

export async function getFriends() {
  const user = await ensureAuth()
  if (!user) return []
  const { doc, getDoc } = await f()
  const { db } = await f()
  const snap = await getDoc(doc(db, PLAYERS, user.uid))
  if (!snap.exists()) return []
  const friendIds = snap.data().friends || []
  if (friendIds.length === 0) return []
  const friendDocs = await Promise.all(friendIds.map(id => getDoc(doc(db, PLAYERS, id)).catch(() => null)))
  return friendDocs.filter(d => d && d.exists()).map(d => ({ id: d.id, ...d.data() }))
}

export async function subscribeToFriendScores(friendIds, callback) {
  if (!friendIds || friendIds.length === 0) return () => {}
  const { collection, query, where, orderBy, limit: firestoreLimit, onSnapshot } = await f()
  const { db } = await f()
  const date = getDailyDate()
  const q = query(collection(db, DAILY_SCORES), where('date', '==', date), where('userId', 'in', friendIds.slice(0, 10)), orderBy('score', 'desc'), firestoreLimit(50))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}
