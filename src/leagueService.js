import { increment } from 'firebase/firestore'
import { getDb } from './firebase'
import { MAX_PER_LEAGUE, LEAGUE_RANKS, RANK_PROMO_DEMO, getNextWednesdayMidnightUTC, TOURNAMENT_SIZES, isInLockoutPeriod } from './leagues'
import { TOURNAMENT_COIN_REWARDS, LEAGUE_COIN_REWARDS } from './shopItems'

export { increment }

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, db] = await Promise.all([import('firebase/firestore'), getDb()])
  _f = { ...firestore, db }
  return _f
}

const PLAYERS = 'players'
const LEAGUES = 'leagues'
const MATCHES = 'matches'
const TOURNAMENTS = 'tournaments'

export async function getOrCreatePlayer(userId, name, username) {
  const { doc, getDoc, setDoc, updateDoc } = await f()
  const { db } = await f()
  const ref = doc(db, PLAYERS, userId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data()
    const updates = {}
    if (!data.nameLower && data.name) updates.nameLower = data.name.toLowerCase()
    if (data.league == null) updates.league = 10
    if (data.leagueInstanceId === undefined) updates.leagueInstanceId = null
    if (data.wins == null) updates.wins = 0
    if (data.losses == null) updates.losses = 0
    if (data.streak == null) updates.streak = 0
    if (data.promotions == null) updates.promotions = 0
    if (data.xp == null) updates.xp = 0
    if (data.coins == null) updates.coins = 0
    if (data.title === undefined) updates.title = null
    if (data.nameplate === undefined) updates.nameplate = null
    if (data.nameplateEffect === undefined) updates.nameplateEffect = null
    if (data.ownedItems === undefined) updates.ownedItems = []
    if (data.tournamentWins == null) updates.tournamentWins = 0
    if (data.firstPlaceFinishes == null) updates.firstPlaceFinishes = 0
    if (data.tournamentTickets == null) updates.tournamentTickets = 0
    if (data.usernameSkipped === undefined) updates.usernameSkipped = false
    if (Object.keys(updates).length > 0) {
      updateDoc(ref, updates).catch(() => {})
      Object.assign(data, updates)
    }
    if (updates.nameLower) {
      return { id: userId, ...data, nameLower: updates.nameLower }
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
    league: 10,
    leagueInstanceId: null,
    wins: 0,
    losses: 0,
    streak: 0,
    promotions: 0,
    tournamentWins: 0,
    firstPlaceFinishes: 0,
    tournamentTickets: 0,
    coins: 0,
    title: null,
    nameplate: null,
    nameplateEffect: null,
    ownedItems: [],
    isAdmin: false,
    usernameSkipped: false,
    createdAt: Date.now(),
    lastActive: Date.now(),
    statsBlob: null,
  }
  await setDoc(ref, player)
  return { id: userId, ...player }
}

export async function loadPlayerStats(userId) {
  const { doc, getDoc } = await f()
  const { db } = await f()
  const ref = doc(db, PLAYERS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data().statsBlob || null
}

export async function savePlayerStats(userId, stats) {
  const { doc, updateDoc } = await f()
  const { db } = await f()
  const ref = doc(db, PLAYERS, userId)
  await updateDoc(ref, { statsBlob: stats, lastActive: Date.now() })
}

export async function updatePlayer(userId, data) {
  const { doc, updateDoc } = await f()
  const { db } = await f()
  const ref = doc(db, PLAYERS, userId)
  await updateDoc(ref, { ...data, lastActive: Date.now() })
}

export async function setAdminStatus(userId, isAdmin) {
  const { doc, setDoc } = await f()
  const { db } = await f()
  const ref = doc(db, PLAYERS, userId)
  await setDoc(ref, { isAdmin, lastActive: Date.now() }, { merge: true })
}

export async function getPlayer(userId) {
  const { doc, getDoc } = await f()
  const { db } = await f()
  const ref = doc(db, PLAYERS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: userId, ...snap.data() }
}

export async function isUsernameAvailable(username, excludeUserId) {
  if (!username || username.trim().length === 0) return false
  const { collection, query, orderBy, where, getDocs, limit: firestoreLimit } = await f()
  const { db } = await f()
  const term = username.trim().toLowerCase()
  const col = collection(db, PLAYERS)
  const q = query(col, orderBy('username'), where('username', '>=', term), where('username', '<=', term + '\uf8ff'), firestoreLimit(20))
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

export async function subscribeToPlayer(userId, callback) {
  const { doc, onSnapshot } = await f()
  const { db } = await f()
  const ref = doc(db, PLAYERS, userId)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback({ id: userId, ...snap.data() })
  })
}

export async function findOrCreateLeagueInstance(rank) {
  const { collection, query, where, orderBy, getDocs, doc, setDoc } = await f()
  const { db } = await f()
  const q = query(collection(db, LEAGUES), where('rank', '==', rank), orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    const data = d.data()
    if (data.players.length < MAX_PER_LEAGUE) {
      return { id: d.id, ...data }
    }
  }
  const newRef = doc(collection(db, LEAGUES))
  const instance = { rank, instance: snap.size, players: [], seasonStart: Date.now(), status: 'active', createdAt: Date.now() }
  await setDoc(newRef, instance)
  return { id: newRef.id, ...instance }
}

export async function joinLeague(leagueId, userId) {
  const { doc, updateDoc, arrayUnion } = await f()
  const { db } = await f()
  const ref = doc(db, LEAGUES, leagueId)
  await updateDoc(ref, { players: arrayUnion(userId) })
}

export async function leaveLeague(leagueId, userId) {
  const { doc, updateDoc, arrayRemove } = await f()
  const { db } = await f()
  const ref = doc(db, LEAGUES, leagueId)
  await updateDoc(ref, { players: arrayRemove(userId) })
}

export async function getLeagueInstance(leagueId) {
  const { doc, getDoc } = await f()
  const { db } = await f()
  const ref = doc(db, LEAGUES, leagueId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: leagueId, ...snap.data() }
}

export async function subscribeToLeague(leagueId, callback) {
  const { doc, onSnapshot } = await f()
  const { db } = await f()
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
  const { collection, query, orderBy, where, getDocs, limit: firestoreLimit } = await f()
  const { db } = await f()
  const term = searchTerm.trim().toLowerCase()
  const col = collection(db, PLAYERS)
  const q = query(col, orderBy('nameLower'), where('nameLower', '>=', term), where('nameLower', '<=', term + '\uf8ff'), firestoreLimit(20))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function findMatch(leagueId, excludeUserId) {
  const league = await getLeagueInstance(leagueId)
  if (!league) return null
  const candidates = league.players.filter(id => id !== excludeUserId)
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export async function createMatch(player1Id, player2Id, game) {
  const { collection, doc, setDoc } = await f()
  const { db } = await f()
  const matchRef = doc(collection(db, MATCHES))
  const match = { id: matchRef.id, player1: player1Id, player2: player2Id, game, result: null, status: 'pending', createdAt: Date.now() }
  await setDoc(matchRef, match)
  return match
}

export async function acceptMatch(matchId) {
  const { doc, updateDoc } = await f()
  const { db } = await f()
  const ref = doc(db, MATCHES, matchId)
  await updateDoc(ref, { status: 'accepted', acceptedAt: Date.now() })
}

export async function finishMatch(matchId, winnerId, loserId) {
  const { doc, updateDoc, increment } = await f()
  const { db } = await f()
  const ref = doc(db, MATCHES, matchId)
  await updateDoc(ref, { result: winnerId, status: 'finished', finishedAt: Date.now() })
  await updateDoc(doc(db, PLAYERS, winnerId), { wins: increment(1), xp: increment(10), streak: increment(1), coins: increment(10) })
  await updateDoc(doc(db, PLAYERS, loserId), { losses: increment(1), xp: increment(-5), streak: 0 })
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
  const promoted = players.slice(0, pd.promote)
  const demoted = pd.demote > 0 ? players.slice(-pd.demote) : []
  const stayers = players.slice(pd.promote, pd.demote > 0 ? -pd.demote : undefined)
  const promoteRank = Math.max(1, currentRank - 1)
  const demoteRank = Math.min(11, currentRank + 1)
  const leagueRewards = LEAGUE_COIN_REWARDS[currentRank] || { first: 100, second: 75, third: 50 }
  const coinRewardPositions = [leagueRewards.first, leagueRewards.second, leagueRewards.third]

  for (let i = 0; i < promoted.length; i++) {
    const p = promoted[i]
    const coinReward = coinRewardPositions[i] || 0
    if (currentRank === 1) {
      if ((p.tournamentTickets || 0) > 0) {
        await addToTournament(p.id)
        await updatePlayer(p.id, { league: promoteRank, leagueInstanceId: null, promotions: increment(1), tournamentTickets: increment(-1), coins: increment(coinReward) })
      } else {
        await updatePlayer(p.id, { promotions: increment(1), coins: increment(coinReward) })
      }
    } else {
      const newLeague = await findOrCreateLeagueInstance(promoteRank)
      await leaveLeague(leagueId, p.id)
      await joinLeague(newLeague.id, p.id)
      await updatePlayer(p.id, { league: promoteRank, leagueInstanceId: newLeague.id, promotions: increment(1), coins: increment(coinReward) })
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

  const { doc, updateDoc } = await f()
  const { db } = await f()
  await updateDoc(doc(db, LEAGUES, leagueId), { status: 'completed', completedAt: Date.now() })
}

export async function addToTournament(userId) {
  const { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion } = await f()
  const { db } = await f()
  const q = query(collection(db, TOURNAMENTS), where('stage', '==', 'tournament'), where('status', '==', 'active'))
  const snap = await getDocs(q)

  for (const d of snap.docs) {
    const data = d.data()
    if (data.players.length < TOURNAMENT_SIZES.tournament) {
      await updateDoc(doc(db, TOURNAMENTS, d.id), { players: arrayUnion(userId) })
      await updatePlayer(userId, { leagueInstanceId: d.id })
      return { id: d.id, ...data }
    }
  }

  const newRef = doc(collection(db, TOURNAMENTS))
  const tournament = { stage: 'tournament', season: Date.now(), players: [userId], status: 'active', createdAt: Date.now() }
  await setDoc(newRef, tournament)
  await updatePlayer(userId, { leagueInstanceId: newRef.id })
  return { id: newRef.id, ...tournament }
}

export async function subscribeToTournament(tournamentId, callback) {
  const { doc, onSnapshot } = await f()
  const { db } = await f()
  const ref = doc(db, TOURNAMENTS, tournamentId)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback({ id: tournamentId, ...snap.data() })
  })
}

export async function getTournament(tournamentId) {
  const { doc, getDoc } = await f()
  const { db } = await f()
  const ref = doc(db, TOURNAMENTS, tournamentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: tournamentId, ...snap.data() }
}

export async function getActiveTournament(stage) {
  const { collection, query, where, getDocs } = await f()
  const { db } = await f()
  const q = query(collection(db, TOURNAMENTS), where('stage', '==', stage), where('status', '==', 'active'))
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
  const { collection, doc, setDoc, updateDoc } = await f()
  const { db } = await f()

  const semiRef = doc(collection(db, TOURNAMENTS))
  await setDoc(semiRef, { stage: 'semiFinals', season: tournament.season, players: top15.map(p => p.id), status: 'active', createdAt: Date.now() })

  for (const p of top15) await updatePlayer(p.id, { leagueInstanceId: semiRef.id })
  for (const p of bottom5) {
    const phoenixLeague = await findOrCreateLeagueInstance(2)
    await joinLeague(phoenixLeague.id, p.id)
    await updatePlayer(p.id, { league: 2, leagueInstanceId: phoenixLeague.id })
  }

  await updateDoc(doc(db, TOURNAMENTS, tournament.id), { status: 'completed', completedAt: Date.now() })
}

export async function processSemiFinalsReset() {
  const semi = await getActiveTournament('semiFinals')
  if (!semi || semi.players.length === 0) return

  const players = await getLeaguePlayers(semi.players)
  players.sort((a, b) => b.xp - a.xp)

  const top10 = players.slice(0, 10)
  const bottom5 = players.slice(10)
  const { collection, doc, setDoc, updateDoc } = await f()
  const { db } = await f()

  const finalsRef = doc(collection(db, TOURNAMENTS))
  await setDoc(finalsRef, { stage: 'finals', season: semi.season, players: top10.map(p => p.id), status: 'active', createdAt: Date.now() })

  for (const p of top10) await updatePlayer(p.id, { leagueInstanceId: finalsRef.id })
  for (const p of bottom5) {
    const phoenixLeague = await findOrCreateLeagueInstance(2)
    await joinLeague(phoenixLeague.id, p.id)
    await updatePlayer(p.id, { league: 2, leagueInstanceId: phoenixLeague.id })
  }

  await updateDoc(doc(db, TOURNAMENTS, semi.id), { status: 'completed', completedAt: Date.now() })
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
    await updatePlayer(p.id, {
      league: 1,
      tournamentWins: increment(1),
      coins: increment(coinRewards[i]),
      ...(i === 0 ? { firstPlaceFinishes: increment(1) } : {}),
    })
  }

  const remaining = players.slice(3)
  for (const p of remaining) {
    const masterLeague = await findOrCreateLeagueInstance(2)
    await joinLeague(masterLeague.id, p.id)
    await updatePlayer(p.id, { league: 2, leagueInstanceId: masterLeague.id })
  }

  const { doc, updateDoc } = await f()
  const { db } = await f()
  await updateDoc(doc(db, TOURNAMENTS, finals.id), { status: 'completed', completedAt: Date.now() })
}

export async function searchPlayersByName(searchTerm) {
  const term = searchTerm.trim()
  if (!term) return []
  const lower = term.toLowerCase()
  const { collection, query, where, orderBy, getDocs, limit: firestoreLimit } = await f()
  const { db } = await f()
  const playerIds = new Set()

  const [leagueResults, tournamentResults] = await Promise.all([
    getDocs(query(collection(db, LEAGUES), where('status', '==', 'active'))).catch(() => null),
    getDocs(query(collection(db, TOURNAMENTS), where('status', '==', 'active'))).catch(() => null),
  ])

  if (leagueResults) leagueResults.docs.forEach(d => (d.data().players || []).forEach(id => playerIds.add(id)))
  if (tournamentResults) tournamentResults.docs.forEach(d => (d.data().players || []).forEach(id => playerIds.add(id)))

  const col = collection(db, PLAYERS)
  const [usernameSnap, nameSnap] = await Promise.all([
    getDocs(query(col, orderBy('username'), where('username', '>=', lower), where('username', '<=', lower + '\uf8ff'), firestoreLimit(20))).catch(() => null),
    getDocs(query(col, orderBy('name'), where('name', '>=', lower), where('name', '<=', lower + '\uf8ff'), firestoreLimit(20))).catch(() => null),
  ])

  let firestoreResults = []
  if (usernameSnap) firestoreResults = usernameSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  if (nameSnap) for (const d of nameSnap.docs) {
    if (!firestoreResults.some(r => r.id === d.id)) firestoreResults.push({ id: d.id, ...d.data() })
  }
  for (const p of firestoreResults) playerIds.add(p.id)

  if (playerIds.size === 0) return []
  const ids = [...playerIds]
  const results = [...firestoreResults]
  const seen = new Set(firestoreResults.map(r => r.id))
  const batchSize = 10
  for (let i = 0; i < ids.length && results.length < 20; i += batchSize) {
    const fetched = await Promise.all(ids.slice(i, i + batchSize).map(id => getPlayer(id).catch(() => null)))
    for (const p of fetched) {
      if (results.length >= 20) break
      if (!p || seen.has(p.id)) continue
      if ((p.username && p.username.toLowerCase().includes(lower)) || (p.name && p.name.toLowerCase().includes(lower))) results.push(p)
    }
  }
  return results.slice(0, 20)
}

export async function resetAllScores(adminUserId) {
  const { collection, query, where, getDocs, doc, updateDoc } = await f()
  const { db } = await f()

  const playersSnap = await getDocs(collection(db, PLAYERS))
  const leaguesSnap = await getDocs(query(collection(db, LEAGUES), where('status', '==', 'active')))
  const tournamentsSnap = await getDocs(query(collection(db, TOURNAMENTS), where('status', '==', 'active')))

  for (const d of leaguesSnap.docs) await updateDoc(d.ref, { status: 'completed', completedAt: Date.now() })
  for (const d of tournamentsSnap.docs) await updateDoc(d.ref, { status: 'completed', completedAt: Date.now() })

  for (const d of playersSnap.docs) {
    if (d.id === adminUserId) continue
    await updateDoc(d.ref, {
      xp: 0, wins: 0, losses: 0, streak: 0, promotions: 0, tournamentWins: 0, firstPlaceFinishes: 0, coins: 0,
      title: null, nameplate: null, nameplateEffect: null, ownedItems: [], league: 10, leagueInstanceId: null, statsBlob: null, lastActive: Date.now(),
    })
  }
}

export async function getAllLeaguesForPlayer(userId) {
  const { collection, query, where, getDocs } = await f()
  const { db } = await f()
  const q = query(collection(db, LEAGUES), where('players', 'array-contains', userId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
