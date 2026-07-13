import {
  collection, doc, setDoc, getDoc, getDocs, query, where, orderBy,
  updateDoc, increment, arrayUnion, arrayRemove, deleteDoc, serverTimestamp,
  onSnapshot, limit as firestoreLimit
} from 'firebase/firestore'
import { db } from './firebase'
import { MAX_PER_LEAGUE, LEAGUE_RANKS, getNextWednesdayMidnightPST } from './leagues'

export { increment }

const PLAYERS = 'players'
const LEAGUES = 'leagues'
const MATCHES = 'matches'

export async function getOrCreatePlayer(userId, name) {
  const ref = doc(db, PLAYERS, userId)
  const snap = await getDoc(ref)
  if (snap.exists()) return { id: userId, ...snap.data() }
  const player = {
    name: name || `Player${Math.floor(Math.random() * 9999)}`,
    xp: 0,
    league: 10,
    leagueInstanceId: null,
    wins: 0,
    losses: 0,
    streak: 0,
    createdAt: Date.now(),
    lastActive: Date.now(),
  }
  await setDoc(ref, player)
  return { id: userId, ...player }
}

export async function updatePlayer(userId, data) {
  const ref = doc(db, PLAYERS, userId)
  await updateDoc(ref, { ...data, lastActive: Date.now() })
}

export async function getPlayer(userId) {
  const ref = doc(db, PLAYERS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: userId, ...snap.data() }
}

export function subscribeToPlayer(userId, callback) {
  const ref = doc(db, PLAYERS, userId)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback({ id: userId, ...snap.data() })
  })
}

export async function findOrCreateLeagueInstance(rank) {
  const q = query(
    collection(db, LEAGUES),
    where('rank', '==', rank),
    orderBy('createdAt', 'asc')
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    const data = d.data()
    if (data.players.length < MAX_PER_LEAGUE) {
      return { id: d.id, ...data }
    }
  }
  const newRef = doc(collection(db, LEAGUES))
  const instance = {
    rank,
    instance: snap.size,
    players: [],
    seasonStart: Date.now(),
    status: 'active',
    createdAt: Date.now(),
  }
  await setDoc(newRef, instance)
  return { id: newRef.id, ...instance }
}

export async function joinLeague(leagueId, userId) {
  const ref = doc(db, LEAGUES, leagueId)
  await updateDoc(ref, {
    players: arrayUnion(userId),
  })
}

export async function leaveLeague(leagueId, userId) {
  const ref = doc(db, LEAGUES, leagueId)
  await updateDoc(ref, {
    players: arrayRemove(userId),
  })
}

export async function getLeagueInstance(leagueId) {
  const ref = doc(db, LEAGUES, leagueId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: leagueId, ...snap.data() }
}

export function subscribeToLeague(leagueId, callback) {
  const ref = doc(db, LEAGUES, leagueId)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback({ id: leagueId, ...snap.data() })
  })
}

export async function getLeaguePlayers(playerIds) {
  if (playerIds.length === 0) return []
  const players = []
  for (const id of playerIds) {
    const p = await getPlayer(id)
    if (p) players.push(p)
  }
  return players
}

export async function findMatch(leagueId, excludeUserId) {
  const league = await getLeagueInstance(leagueId)
  if (!league) return null
  const candidates = league.players.filter(id => id !== excludeUserId)
  if (candidates.length === 0) return null
  const randomIdx = Math.floor(Math.random() * candidates.length)
  return candidates[randomIdx]
}

export async function createMatch(player1Id, player2Id, game) {
  const matchRef = doc(collection(db, MATCHES))
  const match = {
    id: matchRef.id,
    player1: player1Id,
    player2: player2Id,
    game,
    result: null,
    status: 'pending',
    createdAt: Date.now(),
  }
  await setDoc(matchRef, match)
  return match
}

export async function acceptMatch(matchId, userId) {
  const ref = doc(db, MATCHES, matchId)
  await updateDoc(ref, {
    status: 'accepted',
    acceptedAt: Date.now(),
  })
}

export async function finishMatch(matchId, winnerId, loserId) {
  const ref = doc(db, MATCHES, matchId)
  await updateDoc(ref, {
    result: winnerId,
    status: 'finished',
    finishedAt: Date.now(),
  })
  const xpGain = 10
  const xpLoss = 5
  await updateDoc(doc(db, PLAYERS, winnerId), {
    wins: increment(1),
    xp: increment(xpGain),
    streak: increment(1),
  })
  await updateDoc(doc(db, PLAYERS, loserId), {
    losses: increment(1),
    xp: increment(-xpLoss),
    streak: 0,
  })
}

export async function ensurePlayerInLeague(userId) {
  const p = await getPlayer(userId)
  if (!p) return null
  if (p.leagueInstanceId) {
    const lg = await getLeagueInstance(p.leagueInstanceId)
    if (lg && lg.status !== 'completed') return lg
  }
  const lg = await findOrCreateLeagueInstance(p.league)
  await joinLeague(lg.id, userId)
  await updatePlayer(userId, { leagueInstanceId: lg.id })
  return lg
}

export async function processSeasonReset(leagueId) {
  const league = await getLeagueInstance(leagueId)
  if (!league || league.players.length === 0) return

  const players = await getLeaguePlayers(league.players)
  players.sort((a, b) => b.xp - a.xp)

  const promoted = players.slice(0, 3)
  const demoted = players.slice(-3)
  const stayers = players.slice(3, -3)

  const currentRank = league.rank
  const promoteRank = Math.max(1, currentRank - 1)
  const demoteRank = Math.min(10, currentRank + 1)

  for (const p of promoted) {
    const newLeague = await findOrCreateLeagueInstance(promoteRank)
    await leaveLeague(leagueId, p.id)
    await joinLeague(newLeague.id, p.id)
    await updatePlayer(p.id, { league: promoteRank, leagueInstanceId: newLeague.id })
  }

  for (const p of demoted) {
    const newLeague = await findOrCreateLeagueInstance(demoteRank)
    await leaveLeague(leagueId, p.id)
    await joinLeague(newLeague.id, p.id)
    await updatePlayer(p.id, { league: demoteRank, leagueInstanceId: newLeague.id })
  }

  for (const p of stayers) {
    await updatePlayer(p.id, { leagueInstanceId: leagueId })
  }

  const ref = doc(db, LEAGUES, leagueId)
  await updateDoc(ref, {
    status: 'completed',
    completedAt: Date.now(),
  })
}

export async function getAllLeaguesForPlayer(userId) {
  const q = query(collection(db, LEAGUES), where('players', 'array-contains', userId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
