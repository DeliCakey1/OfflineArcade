import { getDb, ensureAuth } from './firebase'

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, db] = await Promise.all([import('firebase/firestore'), getDb()])
  _f = { ...firestore, db }
  return _f
}

const CHALLENGES = 'challenges'
const PLAYERS = 'players'
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000
const CHALLENGE_GAMES = ['pong-pvp', 'typing-pvp', 'rps-pvp']

export async function sendChallenge(fromId, fromName, toId, toName, gameId, betAmount = 0) {
  if (!fromId || !toId || !gameId) return { error: 'Missing required fields' }
  if (!CHALLENGE_GAMES.includes(gameId)) return { error: 'Can only challenge PvP games' }
  if (betAmount < 0 || betAmount > 10000) return { error: 'Invalid bet amount' }

  const { doc, setDoc, getDoc, updateDoc } = await f()
  const { db } = await f()

  if (fromId === toId) return { error: 'Cannot challenge yourself' }

  const fromDoc = await getDoc(doc(db, PLAYERS, fromId))
  const fromData = fromDoc.exists() ? fromDoc.data() : {}
  if (betAmount > 0 && (fromData.coins || 0) < betAmount) {
    return { error: 'Not enough coins' }
  }

  const challengeId = 'ch_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const challengeData = {
    challenger: { userId: fromId, username: fromName || 'Anonymous', nameplate: fromData.nameplate || null },
    challenged: { userId: toId, username: toName || 'Anonymous', nameplate: null },
    gameId,
    betAmount: betAmount || 0,
    status: 'pending',
    result: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + CHALLENGE_EXPIRY_MS,
  }

  await setDoc(doc(db, CHALLENGES, challengeId), challengeData)

  if (betAmount > 0) {
    await updateDoc(doc(db, PLAYERS, fromId), {
      coins: (fromData.coins || 0) - betAmount,
    })
  }

  return { challengeId, ...challengeData }
}

export async function acceptChallenge(challengeId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()

  const challengeDoc = await getDoc(doc(db, CHALLENGES, challengeId))
  if (!challengeDoc.exists()) return { error: 'Challenge not found' }
  const challenge = challengeDoc.data()

  if (challenge.challenged.userId !== user.uid) return { error: 'Not your challenge' }
  if (challenge.status !== 'pending') return { error: 'Challenge no longer pending' }
  if (Date.now() > challenge.expiresAt) return { error: 'Challenge expired' }

  if (challenge.betAmount > 0) {
    const playerDoc = await getDoc(doc(db, PLAYERS, user.uid))
    const playerData = playerDoc.exists() ? playerDoc.data() : {}
    if ((playerData.coins || 0) < challenge.betAmount) {
      return { error: 'Not enough coins' }
    }
    await updateDoc(doc(db, PLAYERS, user.uid), {
      coins: (playerData.coins || 0) - challenge.betAmount,
    })
  }

  await updateDoc(doc(db, CHALLENGES, challengeId), { status: 'accepted' })
  return { success: true, gameId: challenge.gameId }
}

export async function declineChallenge(challengeId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()

  const challengeDoc = await getDoc(doc(db, CHALLENGES, challengeId))
  if (!challengeDoc.exists()) return { error: 'Challenge not found' }
  const challenge = challengeDoc.data()

  if (challenge.challenged.userId !== user.uid) return { error: 'Not your challenge' }

  await updateDoc(doc(db, CHALLENGES, challengeId), { status: 'declined' })

  if (challenge.betAmount > 0) {
    const challengerDoc = await getDoc(doc(db, PLAYERS, challenge.challenger.userId))
    const cData = challengerDoc.exists() ? challengerDoc.data() : {}
    await updateDoc(doc(db, PLAYERS, challenge.challenger.userId), {
      coins: (cData.coins || 0) + challenge.betAmount,
    })
  }

  return { success: true }
}

export async function finishChallenge(challengeId, winnerId) {
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()

  const challengeDoc = await getDoc(doc(db, CHALLENGES, challengeId))
  if (!challengeDoc.exists()) return { error: 'Challenge not found' }
  const challenge = challengeDoc.data()

  await updateDoc(doc(db, CHALLENGES, challengeId), {
    status: 'completed',
    result: { winnerId, completedAt: Date.now() },
  })

  const totalPot = challenge.betAmount * 2
  if (totalPot > 0) {
    const winnerDoc = await getDoc(doc(db, PLAYERS, winnerId))
    const wData = winnerDoc.exists() ? winnerDoc.data() : {}
    await updateDoc(doc(db, PLAYERS, winnerId), {
      coins: (wData.coins || 0) + totalPot,
    })
  }

  return { success: true, totalPot }
}

export async function getChallenge(challengeId) {
  const { doc, getDoc } = await f()
  const { db } = await f()
  const snap = await getDoc(doc(db, CHALLENGES, challengeId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getChallengeHistory(userId) {
  if (!userId) return []
  const { collection, query, where, orderBy, getDocs, limit: firestoreLimit } = await f()
  const { db } = await f()

  const sentQuery = query(
    collection(db, CHALLENGES),
    where('challenger.userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(20)
  )
  const sentSnap = await getDocs(sentQuery)

  const receivedQuery = query(
    collection(db, CHALLENGES),
    where('challenged.userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(20)
  )
  const receivedSnap = await getDocs(receivedQuery)

  const all = new Map()
  sentSnap.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data(), side: 'sent' }))
  receivedSnap.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data(), side: 'received' }))

  return Array.from(all.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export function subscribeToChallenges(userId, callback) {
  let unsub = null
  ;(async () => {
    const { collection, query, where, onSnapshot } = await f()
    const { db } = await f()
    const q = query(
      collection(db, CHALLENGES),
      where('challenged.userId', '==', userId),
      where('status', '==', 'pending')
    )
    unsub = onSnapshot(q, snap => {
      const challenges = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.expiresAt > Date.now())
      callback(challenges)
    })
  })()
  return () => unsub?.()
}

export { CHALLENGE_GAMES, CHALLENGE_EXPIRY_MS }
