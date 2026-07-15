import {
  collection, doc, setDoc, getDoc, getDocs, query, where, orderBy,
  updateDoc, increment, arrayUnion, arrayRemove, deleteDoc, serverTimestamp,
  onSnapshot, limit as firestoreLimit
} from 'firebase/firestore'
import { db } from './firebase'
import { MAX_PER_LEAGUE, LEAGUE_RANKS, RANK_PROMO_DEMO, getNextWednesdayMidnightUTC, TOURNAMENT_SIZES, isInLockoutPeriod } from './leagues'
import { TOURNAMENT_COIN_REWARDS, LEAGUE_COIN_REWARDS } from './shopItems'

export { increment }

const PLAYERS = 'players'
const LEAGUES = 'leagues'
const MATCHES = 'matches'
const TOURNAMENTS = 'tournaments'

export async function getOrCreatePlayer(userId, name, username) {
  const ref = doc(db, PLAYERS, userId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data()
    if (!data.nameLower && data.name) {
      updateDoc(ref, { nameLower: data.name.toLowerCase() }).catch(() => {})
      return { id: userId, ...data, nameLower: data.name.toLowerCase() }
    }
    return { id: userId, ...data }
  }
  const playerName = name || `Player${Math.floor(Math.random() * 9999)}`
  const player = {
    name: playerName,
    nameLower: playerName.toLowerCase(),
    username: username || null,
    usernameChangedAt: null,
    xp: 0,
    league: 11,
    leagueInstanceId: null,
    wins: 0,
    losses: 0,
    streak: 0,
    promotions: 0,
    tournamentWins: 0,
    firstPlaceFinishes: 0,
    coins: 0,
    title: null,
    nameplate: null,
    ownedItems: [],
    isAdmin: false,
    createdAt: Date.now(),
    lastActive: Date.now(),
    statsBlob: null,
  }
  await setDoc(ref, player)
  return { id: userId, ...player }
}

export async function loadPlayerStats(userId) {
  const ref = doc(db, PLAYERS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  return data.statsBlob || null
}

export async function savePlayerStats(userId, stats) {
  const ref = doc(db, PLAYERS, userId)
  await updateDoc(ref, { statsBlob: stats, lastActive: Date.now() })
}

export async function updatePlayer(userId, data) {
  const ref = doc(db, PLAYERS, userId)
  await updateDoc(ref, { ...data, lastActive: Date.now() })
}

export async function setAdminStatus(userId, isAdmin) {
  const ref = doc(db, PLAYERS, userId)
  await setDoc(ref, { isAdmin, lastActive: Date.now() }, { merge: true })
}

export async function getPlayer(userId) {
  const ref = doc(db, PLAYERS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: userId, ...snap.data() }
}

export async function isUsernameAvailable(username, excludeUserId) {
  if (!username || username.trim().length === 0) return false
  const term = username.trim().toLowerCase()
  const col = collection(db, PLAYERS)
  const q = query(
    col,
    orderBy('username'),
    where('username', '>=', term),
    where('username', '<=', term + '\uf8ff'),
    firestoreLimit(20)
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    if (excludeUserId && d.id === excludeUserId) continue
    if (d.data().username && d.data().username.toLowerCase() === term) return false
  }
  return true
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000

export async function updateUsername(userId, newUsername) {
  const player = await getPlayer(userId)
  if (!player) throw new Error('Player not found')
  const trimmed = newUsername.trim()
  if (trimmed.length < 3 || trimmed.length > 20) throw new Error('Username must be 3-20 characters')
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) throw new Error('Username can only contain letters, numbers, and underscores')
  if (player.usernameChangedAt && (Date.now() - player.usernameChangedAt) < TWELVE_HOURS_MS) {
    const remaining = TWELVE_HOURS_MS - (Date.now() - player.usernameChangedAt)
    const hours = Math.floor(remaining / 3600000)
    const mins = Math.floor((remaining % 3600000) / 60000)
    throw new Error(`You can change your username again in ${hours}h ${mins}m`)
  }
  const available = await isUsernameAvailable(trimmed, userId)
  if (!available) throw new Error('Username is already taken')
  await updatePlayer(userId, { username: trimmed, usernameChangedAt: Date.now() })
  return trimmed
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
  const fetched = await Promise.all(playerIds.map(id => getPlayer(id).catch(() => null)))
  return fetched.filter(Boolean)
}

export async function searchPlayers(searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) return []
  const term = searchTerm.trim().toLowerCase()
  const col = collection(db, PLAYERS)
  const q = query(
    col,
    orderBy('nameLower'),
    where('nameLower', '>=', term),
    where('nameLower', '<=', term + '\uf8ff'),
    firestoreLimit(20)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
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
  const coinReward = 10
  await updateDoc(doc(db, PLAYERS, winnerId), {
    wins: increment(1),
    xp: increment(xpGain),
    streak: increment(1),
    coins: increment(coinReward),
  })
  await updateDoc(doc(db, PLAYERS, loserId), {
    losses: increment(1),
    xp: increment(-xpLoss),
    streak: 0,
  })
}

export async function ensurePlayerInLeague(userId) {
  if (isInLockoutPeriod()) return null
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

  const currentRank = league.rank
  const pd = RANK_PROMO_DEMO[currentRank] || { promote: 0, demote: 0 }
  const promoteCount = pd.promote
  const demoteCount = pd.demote

  const promoted = players.slice(0, promoteCount)
  const demoted = demoteCount > 0 ? players.slice(-demoteCount) : []
  const stayers = players.slice(promoteCount, demoteCount > 0 ? -demoteCount : undefined)

  const promoteRank = Math.max(1, currentRank - 1)
  const demoteRank = Math.min(11, currentRank + 1)

  const leagueRewards = LEAGUE_COIN_REWARDS[currentRank] || { first: 100, second: 75, third: 50 }
  const coinRewardPositions = [leagueRewards.first, leagueRewards.second, leagueRewards.third]

  for (let i = 0; i < promoted.length; i++) {
    const p = promoted[i]
    const coinReward = coinRewardPositions[i] || 0
    if (promoteRank === 2) {
      await addToTournament(p.id)
      await updatePlayer(p.id, {
        league: promoteRank,
        leagueInstanceId: null,
        promotions: increment(1),
        coins: increment(coinReward),
      })
    } else {
      const newLeague = await findOrCreateLeagueInstance(promoteRank)
      await leaveLeague(leagueId, p.id)
      await joinLeague(newLeague.id, p.id)
      await updatePlayer(p.id, {
        league: promoteRank,
        leagueInstanceId: newLeague.id,
        promotions: increment(1),
        coins: increment(coinReward),
      })
    }
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

export async function addToTournament(userId) {
  const q = query(
    collection(db, TOURNAMENTS),
    where('stage', '==', 'tournament'),
    where('status', '==', 'active')
  )
  const snap = await getDocs(q)

  for (const d of snap.docs) {
    const data = d.data()
    if (data.players.length < TOURNAMENT_SIZES.tournament) {
      await updateDoc(doc(db, TOURNAMENTS, d.id), {
        players: arrayUnion(userId),
      })
      await updatePlayer(userId, { leagueInstanceId: d.id })
      return { id: d.id, ...data }
    }
  }

  const newRef = doc(collection(db, TOURNAMENTS))
  const tournament = {
    stage: 'tournament',
    season: Date.now(),
    players: [userId],
    status: 'active',
    createdAt: Date.now(),
  }
  await setDoc(newRef, tournament)
  await updatePlayer(userId, { leagueInstanceId: newRef.id })
  return { id: newRef.id, ...tournament }
}

export function subscribeToTournament(tournamentId, callback) {
  const ref = doc(db, TOURNAMENTS, tournamentId)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback({ id: tournamentId, ...snap.data() })
  })
}

export async function getTournament(tournamentId) {
  const ref = doc(db, TOURNAMENTS, tournamentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: tournamentId, ...snap.data() }
}

export async function getActiveTournament(stage) {
  const q = query(
    collection(db, TOURNAMENTS),
    where('stage', '==', stage),
    where('status', '==', 'active')
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function processTournamentReset() {
  const tournament = await getActiveTournament('tournament')
  if (!tournament || tournament.players.length === 0) return

  const players = await getLeaguePlayers(tournament.players)
  players.sort((a, b) => b.xp - a.xp)

  const top15 = players.slice(0, 15)
  const bottom5 = players.slice(15)

  const semiRef = doc(collection(db, TOURNAMENTS))
  const semiFinals = {
    stage: 'semiFinals',
    season: tournament.season,
    players: top15.map(p => p.id),
    status: 'active',
    createdAt: Date.now(),
  }
  await setDoc(semiRef, semiFinals)

  for (const p of top15) {
    await updatePlayer(p.id, { leagueInstanceId: semiRef.id })
  }

  for (const p of bottom5) {
    const diamondLeague = await findOrCreateLeagueInstance(3)
    await joinLeague(diamondLeague.id, p.id)
    await updatePlayer(p.id, {
      league: 3,
      leagueInstanceId: diamondLeague.id,
    })
  }

  const tRef = doc(db, TOURNAMENTS, tournament.id)
  await updateDoc(tRef, { status: 'completed', completedAt: Date.now() })
}

export async function processSemiFinalsReset() {
  const semi = await getActiveTournament('semiFinals')
  if (!semi || semi.players.length === 0) return

  const players = await getLeaguePlayers(semi.players)
  players.sort((a, b) => b.xp - a.xp)

  const top10 = players.slice(0, 10)
  const bottom5 = players.slice(10)

  const finalsRef = doc(collection(db, TOURNAMENTS))
  const finals = {
    stage: 'finals',
    season: semi.season,
    players: top10.map(p => p.id),
    status: 'active',
    createdAt: Date.now(),
  }
  await setDoc(finalsRef, finals)

  for (const p of top10) {
    await updatePlayer(p.id, { leagueInstanceId: finalsRef.id })
  }

  for (const p of bottom5) {
    const diamondLeague = await findOrCreateLeagueInstance(3)
    await joinLeague(diamondLeague.id, p.id)
    await updatePlayer(p.id, {
      league: 3,
      leagueInstanceId: diamondLeague.id,
    })
  }

  const sRef = doc(db, TOURNAMENTS, semi.id)
  await updateDoc(sRef, { status: 'completed', completedAt: Date.now() })
}

export async function processFinalsReset() {
  const finals = await getActiveTournament('finals')
  if (!finals || finals.players.length === 0) return

  const players = await getLeaguePlayers(finals.players)
  players.sort((a, b) => b.xp - a.xp)

  const winners = players.slice(0, 3)
  const coinRewards = [TOURNAMENT_COIN_REWARDS.first, TOURNAMENT_COIN_REWARDS.second, TOURNAMENT_COIN_REWARDS.third]

  for (let i = 0; i < winners.length; i++) {
    const p = winners[i]
    const isFirst = i === 0
    await updatePlayer(p.id, {
      league: 1,
      tournamentWins: increment(1),
      coins: increment(coinRewards[i]),
      ...(isFirst ? { firstPlaceFinishes: increment(1) } : {}),
    })
  }

  const remaining = players.slice(3)
  for (const p of remaining) {
    const masterLeague = await findOrCreateLeagueInstance(2)
    await joinLeague(masterLeague.id, p.id)
    await updatePlayer(p.id, {
      league: 2,
      leagueInstanceId: masterLeague.id,
    })
  }

  const fRef = doc(db, TOURNAMENTS, finals.id)
  await updateDoc(fRef, { status: 'completed', completedAt: Date.now() })
}

export async function searchPlayersByName(searchTerm) {
  const term = searchTerm.trim()
  if (!term) return []
  const lower = term.toLowerCase()
  const playerIds = new Set()

  const [leagueResults, tournamentResults] = await Promise.all([
    getDocs(query(collection(db, LEAGUES), where('status', '==', 'active'))).catch(e => { console.warn('League query failed:', e.message); return null }),
    getDocs(query(collection(db, TOURNAMENTS), where('status', '==', 'active'))).catch(e => { console.warn('Tournament query failed:', e.message); return null }),
  ])

  if (leagueResults) {
    for (const d of leagueResults.docs) {
      const data = d.data()
      if (Array.isArray(data.players)) data.players.forEach(id => playerIds.add(id))
    }
  }
  if (tournamentResults) {
    for (const d of tournamentResults.docs) {
      const data = d.data()
      if (Array.isArray(data.players)) data.players.forEach(id => playerIds.add(id))
    }
  }

  const col = collection(db, PLAYERS)
  const [usernameSnap, nameSnap] = await Promise.all([
    getDocs(query(col, orderBy('username'), where('username', '>=', lower), where('username', '<=', lower + '\uf8ff'), firestoreLimit(20))).catch(e => { console.warn('Username query failed:', e.message); return null }),
    getDocs(query(col, orderBy('name'), where('name', '>=', lower), where('name', '<=', lower + '\uf8ff'), firestoreLimit(20))).catch(e => { console.warn('Name query failed:', e.message); return null }),
  ])

  let firestoreResults = []
  if (usernameSnap) {
    firestoreResults = usernameSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  }
  if (nameSnap) {
    for (const d of nameSnap.docs) {
      if (!firestoreResults.some(r => r.id === d.id)) {
        firestoreResults.push({ id: d.id, ...d.data() })
      }
    }
  }

  for (const p of firestoreResults) {
    playerIds.add(p.id)
  }

  if (playerIds.size === 0) return []
  const ids = [...playerIds]
  const results = []
  const seen = new Set(firestoreResults.map(r => r.id))
  for (const p of firestoreResults) {
    if (results.length >= 20) break
    results.push(p)
  }
  const batchSize = 10
  for (let i = 0; i < ids.length && results.length < 20; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const fetched = await Promise.all(batch.map(id => getPlayer(id).catch(() => null)))
    for (const p of fetched) {
      if (results.length >= 20) break
      if (!p || seen.has(p.id)) continue
      if ((p.username && p.username.toLowerCase().includes(lower)) || (p.name && p.name.toLowerCase().includes(lower))) {
        results.push(p)
      }
    }
  }
  return results
}

export async function resetAllScores(adminUserId) {
  const playersSnap = await getDocs(collection(db, PLAYERS))
  const leaguesSnap = await getDocs(query(collection(db, LEAGUES), where('status', '==', 'active')))
  const tournamentsSnap = await getDocs(query(collection(db, TOURNAMENTS), where('status', '==', 'active')))

  for (const d of leaguesSnap.docs) {
    await updateDoc(d.ref, { status: 'completed', completedAt: Date.now() })
  }
  for (const d of tournamentsSnap.docs) {
    await updateDoc(d.ref, { status: 'completed', completedAt: Date.now() })
  }

  for (const d of playersSnap.docs) {
    if (d.id === adminUserId) continue
    await updateDoc(d.ref, {
      xp: 0,
      wins: 0,
      losses: 0,
      streak: 0,
      promotions: 0,
      tournamentWins: 0,
      firstPlaceFinishes: 0,
      coins: 0,
      title: null,
    nameplate: null,
    nameplateEffect: null,
      ownedItems: [],
      league: 11,
      leagueInstanceId: null,
      statsBlob: null,
      lastActive: Date.now(),
    })
  }
}

export async function getAllLeaguesForPlayer(userId) {
  const q = query(collection(db, LEAGUES), where('players', 'array-contains', userId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
