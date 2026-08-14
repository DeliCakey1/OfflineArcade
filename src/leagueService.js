import { increment } from 'firebase/firestore'
import { getDb } from './firebase'
import { MAX_PER_LEAGUE, LEAGUE_RANKS, RANK_PROMO_DEMO, getNextWednesdayMidnightUTC, TOURNAMENT_SIZES, isInLockoutPeriod } from './leagues'
import { TOURNAMENT_COIN_REWARDS, LEAGUE_COIN_REWARDS } from './shopItems'
import { BANNER_COLORS } from './bannerColors'

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
const CONFIG = 'config'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export async function getOrCreatePlayer(userId, name, username, isGuest) {
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
    if (data.username === undefined) updates.username = null
    if (data.usernameChangedAt === undefined) updates.usernameChangedAt = null
    if (data.inviteCode === undefined) updates.inviteCode = makeInviteCode()
    if (data.referrals == null) updates.referrals = 0
    if (data.referredBy === undefined) updates.referredBy = null
    if (data.gamesPlayed == null) updates.gamesPlayed = 0
    if (isGuest != null && data.isGuest !== !!isGuest) updates.isGuest = !!isGuest
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
    gamesPlayed: 0,
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
    isGuest: !!isGuest,
    usernameSkipped: false,
    inviteCode: makeInviteCode(),
    referrals: 0,
    referredBy: null,
    createdAt: Date.now(),
    lastActive: Date.now(),
    statsBlob: null,
  }
  await setDoc(ref, player)
  processReferralFromStorage(userId).catch(() => {})
  return { id: userId, ...player, _created: true }
}

export function makeInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

async function processReferralFromStorage(userId) {
  let code = ''
  try { code = localStorage.getItem('arcade-ref') || '' } catch {}
  if (!code) return
  try { localStorage.removeItem('arcade-ref') } catch {}
  const trimmed = String(code).trim().toUpperCase()
  if (!/^[A-Z0-9]{4,12}$/.test(trimmed)) return
  await applyReferral(userId, trimmed)
}

export async function getPlayerByInviteCode(inviteCode) {
  if (!inviteCode) return null
  const { collection, query, where, limit: firestoreLimit, getDocs } = await f()
  const { db } = await f()
  const q = query(collection(db, PLAYERS), where('inviteCode', '==', String(inviteCode).trim().toUpperCase()), firestoreLimit(1))
  const snap = await getDocs(q)
  return snap.docs.length ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null
}

export async function applyReferral(inviteeId, inviteCode) {
  const inviter = await getPlayerByInviteCode(inviteCode)
  if (!inviter || inviter.id === inviteeId) return
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()
  const inviteeRef = doc(db, PLAYERS, inviteeId)
  const inviteeSnap = await getDoc(inviteeRef)
  if (!inviteeSnap.exists()) return
  const invitee = inviteeSnap.data()
  if (invitee.referredBy) return
  await updateDoc(doc(db, PLAYERS, inviter.id), { coins: increment(250), referrals: increment(1) }).catch(() => {})
  await updateDoc(inviteeRef, { referredBy: inviter.id, coins: increment(50) }).catch(() => {})
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

export async function getShopSale() {
  const { doc, getDoc } = await f()
  const { db } = await f()
  const snap = await getDoc(doc(db, CONFIG, 'shopSale'))
  if (!snap.exists()) return { items: {}, updatedAt: null }
  const data = snap.data()
  return { items: data.items || {}, updatedAt: data.updatedAt || null }
}

export async function setShopSale(items) {
  const { doc, setDoc } = await f()
  const { db } = await f()
  const clean = { items: items || {}, updatedAt: Date.now() }
  await setDoc(doc(db, CONFIG, 'shopSale'), clean)
  return clean
}

function cleanBannerData(banners) {
  return (Array.isArray(banners) ? banners : [])
    .slice(0, 3)
    .map(b => ({
      text: String(b.text || '').slice(0, 200),
      color: BANNER_COLORS[b.color] ? b.color : 'purple',
      emoji: String(b.emoji || '📣').slice(0, 8),
      enabled: b.enabled !== false,
    }))
}

function bannerView(b, i) {
  return { ...b, id: `b${i}` }
}

function announcementFromData(data) {
  const rawBanners = Array.isArray(data.banners)
    ? data.banners
    : (data.text ? [{ text: data.text, color: 'purple', emoji: '📣', enabled: true }] : [])
  return { banners: cleanBannerData(rawBanners).map(bannerView), enabled: !!data.enabled, updatedAt: data.updatedAt || null }
}

export async function getAnnouncement() {
  const { doc, getDoc } = await f()
  const { db } = await f()
  const snap = await getDoc(doc(db, CONFIG, 'announcement'))
  if (!snap.exists()) return { banners: [], enabled: false, updatedAt: null }
  return announcementFromData(snap.data())
}

export async function subscribeToAnnouncement(callback) {
  const { doc, onSnapshot } = await f()
  const { db } = await f()
  const ref = doc(db, CONFIG, 'announcement')
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? announcementFromData(snap.data()) : { banners: [], enabled: false, updatedAt: null })
  })
}

export async function setAnnouncement(banners, enabled) {
  const { doc, setDoc } = await f()
  const { db } = await f()
  const clean = { banners: cleanBannerData(banners), enabled: !!enabled, updatedAt: Date.now() }
  await setDoc(doc(db, CONFIG, 'announcement'), clean)
  return clean
}

export async function getChatControls() {
  const { doc, getDoc } = await f()
  const { db } = await f()
  const snap = await getDoc(doc(db, CONFIG, 'chatControls'))
  if (!snap.exists()) return { enabled: true, updatedAt: null }
  const data = snap.data()
  return { enabled: data.enabled !== false, updatedAt: data.updatedAt || null }
}

export async function setChatControls(enabled) {
  const { doc, setDoc } = await f()
  const { db } = await f()
  const clean = { enabled: !!enabled, updatedAt: Date.now() }
  await setDoc(doc(db, CONFIG, 'chatControls'), clean)
  return clean
}

export async function getBlacklist() {
  const { doc, getDoc } = await f()
  const { db } = await f()
  const snap = await getDoc(doc(db, CONFIG, 'blacklist'))
  if (!snap.exists()) return { words: [], updatedAt: null }
  const d = snap.data()
  return { words: d.words || [], updatedAt: d.updatedAt || null }
}

export async function setBlacklist(words) {
  const { doc, setDoc } = await f()
  const { db } = await f()
  const clean = { words: (words || []).map(w => String(w).trim()).filter(Boolean).slice(0, 100), updatedAt: Date.now() }
  await setDoc(doc(db, CONFIG, 'blacklist'), clean)
  return clean
}

export async function getModeration(userId) {
  if (!userId) return null
  const { doc, getDoc } = await f()
  const { db } = await f()
  const snap = await getDoc(doc(db, 'moderation', userId))
  if (!snap.exists()) return null
  return { userId, ...snap.data() }
}

export async function setModeration(playerId, data) {
  const { doc, setDoc } = await f()
  const { db } = await f()
  const clean = {
    userId: playerId,
    type: data.type,
    reason: String(data.reason || '').slice(0, 300),
    until: data.type === 'temp' ? Number(data.until) || null : null,
    issuedAt: Date.now(),
    issuedBy: data.issuedBy || '',
    username: String(data.username || '').slice(0, 50),
  }
  await setDoc(doc(db, 'moderation', playerId), clean)
  return clean
}

export async function clearModeration(playerId) {
  const { doc, deleteDoc } = await f()
  const { db } = await f()
  await deleteDoc(doc(db, 'moderation', playerId))
}

export async function getModerationOverview() {
  const { collection, getDocs } = await f()
  const { db } = await f()
  const [playersSnap, modSnap, blacklist] = await Promise.all([
    getDocs(collection(db, PLAYERS)).catch(() => null),
    getDocs(collection(db, 'moderation')).catch(() => null),
    getBlacklist().catch(() => ({ words: [] })),
  ])

  const players = playersSnap ? playersSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []
  const modMap = {}
  if (modSnap) modSnap.docs.forEach(d => { modMap[d.id] = { ...d.data() } })

  const words = (blacklist.words || []).map(w => String(w).trim().toLowerCase()).filter(Boolean)
  const needsAttention = []
  for (const p of players) {
    const name = String(p.name || '').toLowerCase()
    const username = String(p.username || '').toLowerCase()
    const matches = []
    for (const w of words) {
      if (name.includes(w) && !matches.includes(w)) matches.push(w)
      if (username.includes(w) && !matches.includes(w)) matches.push(w)
    }
    if (matches.length > 0) {
      needsAttention.push({ player: p, matches, moderation: modMap[p.id] || null })
    }
  }
  needsAttention.sort((a, b) => (b.player.lastActive || 0) - (a.player.lastActive || 0))

  return { blacklist: words, needsAttention, modMap }
}

export async function getAnalytics() {
  const { collection, getDocs } = await f()
  const { db } = await f()
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000
  const WEEK_MS2 = 7 * DAY_MS

  const [playersSnap, leaguesSnap, tournamentsSnap] = await Promise.all([
    getDocs(collection(db, PLAYERS)).catch(() => null),
    getDocs(collection(db, LEAGUES)).catch(() => null),
    getDocs(collection(db, TOURNAMENTS)).catch(() => null),
  ])

  const players = playersSnap ? playersSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []
  const leagues = leaguesSnap ? leaguesSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []
  const tournaments = tournamentsSnap ? tournamentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []

  let totalCoins = 0
  let totalXp = 0
  let totalGames = 0
  let activeToday = 0
  let activeWeek = 0
  const rankCounts = {}
  for (const p of players) {
    totalCoins += p.coins || 0
    totalXp += p.xp || 0
    totalGames += p.gamesPlayed || 0
    const last = p.lastActive || 0
    if (now - last < DAY_MS) activeToday++
    if (now - last < WEEK_MS2) activeWeek++
    const rank = p.league || 10
    rankCounts[rank] = (rankCounts[rank] || 0) + 1
  }

  const topXp = [...players].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5)
  const topCoins = [...players].sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 5)

  const activeLeagues = leagues.filter(l => l.status === 'active')
  const activeTournaments = tournaments.filter(t => t.status === 'active')
  const scheduledTournaments = tournaments.filter(t => t.status === 'scheduled')

  return {
    totalPlayers: players.length,
    activeToday,
    activeWeek,
    totalCoins,
    totalXp,
    totalGames,
    rankCounts,
    topXp,
    topCoins,
    leagues: {
      active: activeLeagues.length,
      total: leagues.length,
      players: activeLeagues.reduce((n, l) => n + (l.players?.length || 0), 0),
    },
    tournaments: {
      active: activeTournaments.length,
      scheduled: scheduledTournaments.length,
      players: activeTournaments.reduce((n, t) => n + (t.players?.length || 0), 0),
      stage: activeTournaments[0]?.stage || null,
    },
  }
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
  const { collection, query, orderBy, where, getDocs, limit: firestoreLimit, doc, getDoc } = await f()
  const { db } = await f()
  const term = username.trim().toLowerCase()
  const claimSnap = await getDoc(doc(db, 'usernames', term))
  if (claimSnap.exists()) {
    if (excludeUserId && claimSnap.data().uid === excludeUserId) return true
    return false
  }
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

// Claims a username uniquely. Rules enforce uniqueness via the
// /usernames/{lower} doc ID: creating it is denied if anyone owns the name,
// and updating an existing doc is denied outright. A write batch can't be used
// here because rules for a batch are evaluated against the pre-batch state, so
// the player update's claim check would never see the claim being created in
// the same batch. Instead we create the claim first, then update the player,
// then release the old claim. The claim is rolled back if the player update
// fails, so a user never gets stuck on a name they own.
export async function claimUsername(userId, newUsername) {
  const { doc, getDoc, setDoc, deleteDoc, updateDoc } = await f()
  const { db } = await f()
  const trimmed = newUsername.trim()
  const term = trimmed.toLowerCase()
  const playerRef = doc(db, PLAYERS, userId)
  const playerSnap = await getDoc(playerRef)
  if (!playerSnap.exists()) throw new Error('Player not found')
  const oldTerm = playerSnap.data().username && typeof playerSnap.data().username === 'string'
    ? playerSnap.data().username.toLowerCase()
    : null
  if (oldTerm === term) return trimmed
  const claimRef = doc(db, 'usernames', term)
  const claimSnap = await getDoc(claimRef)
  if (claimSnap.exists()) {
    if (claimSnap.data().uid !== userId) throw new Error('Username is already taken')
  } else {
    try {
      await setDoc(claimRef, { uid: userId, createdAt: Date.now() })
    } catch (e) {
      if (/permission/i.test(String((e && e.message) || ''))) {
        throw new Error('Username is already taken')
      }
      throw e
    }
  }
  try {
    await updateDoc(playerRef, { username: trimmed, usernameChangedAt: Date.now(), usernameSkipped: false })
  } catch (e) {
    await deleteDoc(claimRef).catch(() => {})
    throw e
  }
  if (oldTerm) await deleteDoc(doc(db, 'usernames', oldTerm)).catch(() => {})
  return trimmed
}

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
  await claimUsername(userId, trimmed)
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
    await pruneGuestsFromLeague(d.id, data.players)
    const fresh = await getLeagueInstance(d.id)
    if (fresh && fresh.players.length < MAX_PER_LEAGUE) return fresh
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

export async function pruneGuestsFromLeague(leagueId, playerIds) {
  if (!playerIds || playerIds.length === 0) return false
  const fetched = await getLeaguePlayers(playerIds)
  const guestIds = fetched.filter(p => p.isGuest).map(p => p.id)
  if (guestIds.length === 0) return false
  const { doc, updateDoc, arrayRemove } = await f()
  const { db } = await f()
  await updateDoc(doc(db, LEAGUES, leagueId), { players: arrayRemove(...guestIds) }).catch(() => {})
  return true
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
  if (p.isGuest) return null
  if ((p.gamesPlayed || 0) < 1 && !(p.wins || 0) && !(p.losses || 0)) return null
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

  let players = await getLeaguePlayers(league.players)
  const guestIds = players.filter(p => p.isGuest).map(p => p.id)
  if (guestIds.length > 0) {
    const { doc, updateDoc, arrayRemove } = await f()
    const { db } = await f()
    await updateDoc(doc(db, LEAGUES, leagueId), { players: arrayRemove(...guestIds) }).catch(() => {})
    players = players.filter(p => !p.isGuest)
  }
  if (players.length < MAX_PER_LEAGUE) return

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
        const t = await addToTournament(p.id)
        if (t) {
          await updatePlayer(p.id, { league: promoteRank, leagueInstanceId: t.id, promotions: increment(1), tournamentTickets: increment(-1), coins: increment(coinReward) })
        } else {
          await updatePlayer(p.id, { league: promoteRank, leagueInstanceId: null, promotions: increment(1), coins: increment(coinReward) })
        }
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

export async function activateScheduledTournamentIfDue() {
  const { collection, query, where, getDocs, doc, updateDoc } = await f()
  const { db } = await f()
  const q = query(collection(db, TOURNAMENTS), where('status', '==', 'scheduled'))
  const snap = await getDocs(q)
  const now = Date.now()
  const due = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.startsAt && t.startsAt <= now)
    .sort((a, b) => (a.startsAt || 0) - (b.startsAt || 0))[0]
  if (!due) return null
  const stageStartedAt = due.startsAt
  const stageEndsAt = stageStartedAt + WEEK_MS
  await updateDoc(doc(db, TOURNAMENTS, due.id), { status: 'active', stageStartedAt, stageEndsAt })
  return { id: due.id, ...due, status: 'active', stageStartedAt, stageEndsAt }
}

export async function addToTournament(userId) {
  await activateScheduledTournamentIfDue()
  const { collection, query, where, getDocs, doc, updateDoc, arrayUnion } = await f()
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

  return null
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

export async function expireEmptyTournaments() {
  const { collection, query, where, getDocs, doc, updateDoc } = await f()
  const { db } = await f()
  const snap = await getDocs(query(collection(db, TOURNAMENTS), where('status', '==', 'active')))
  const now = Date.now()
  for (const d of snap.docs) {
    const data = d.data()
    if ((data.players?.length || 0) === 0 && data.stageEndsAt && data.stageEndsAt < now) {
      await updateDoc(doc(db, TOURNAMENTS, d.id), { status: 'completed', completedAt: now }).catch(() => {})
    }
  }
}

export async function getLatestTournamentForAdmin() {
  await expireEmptyTournaments()
  const { collection, query, where, getDocs } = await f()
  const { db } = await f()
  const snap = await getDocs(query(collection(db, TOURNAMENTS), where('status', 'in', ['scheduled', 'active'])))
  if (snap.empty) return null
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  docs.sort((a, b) => (a.startsAt || a.createdAt || 0) - (b.startsAt || b.createdAt || 0))
  return docs[0]
}

export async function scheduleTournament(startsAt) {
  const ts = Number(startsAt)
  if (!ts || ts <= Date.now()) throw new Error('Tournament start must be in the future')
  const existing = await getLatestTournamentForAdmin()
  if (existing) throw new Error('A tournament is already scheduled or active. Cancel it first.')
  const { collection, doc, setDoc } = await f()
  const { db } = await f()
  const ref = doc(collection(db, TOURNAMENTS))
  const tournament = {
    stage: 'tournament',
    status: 'scheduled',
    startsAt: ts,
    season: ts,
    stageStartedAt: null,
    stageEndsAt: null,
    players: [],
    createdAt: Date.now(),
  }
  await setDoc(ref, tournament)
  return { id: ref.id, ...tournament }
}

export async function cancelTournament(tournamentId) {
  const { doc, updateDoc } = await f()
  const { db } = await f()
  const ref = doc(db, TOURNAMENTS, tournamentId)
  await updateDoc(ref, { status: 'cancelled', cancelledAt: Date.now() })
}

export async function processTournamentReset() {
  const tournament = await getActiveTournament('tournament')
  if (!tournament) return
  if (tournament.players.length === 0) {
    const { doc, updateDoc } = await f()
    const { db } = await f()
    await updateDoc(doc(db, TOURNAMENTS, tournament.id), { status: 'completed', completedAt: Date.now() })
    return
  }

  const players = await getLeaguePlayers(tournament.players)
  players.sort((a, b) => b.xp - a.xp)

  const top15 = players.slice(0, 15)
  const bottom5 = players.slice(15)
  const { collection, doc, setDoc, updateDoc } = await f()
  const { db } = await f()

  const stageStartedAt = tournament.stageEndsAt || Date.now()
  const stageEndsAt = stageStartedAt + WEEK_MS
  const semiRef = doc(collection(db, TOURNAMENTS))
  await setDoc(semiRef, {
    stage: 'semiFinals', season: tournament.season,
    startsAt: tournament.startsAt || tournament.season,
    stageStartedAt, stageEndsAt,
    players: top15.map(p => p.id), status: 'active', createdAt: Date.now(),
  })

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
  if (!semi) return
  if (semi.players.length === 0) {
    const { doc, updateDoc } = await f()
    const { db } = await f()
    await updateDoc(doc(db, TOURNAMENTS, semi.id), { status: 'completed', completedAt: Date.now() })
    return
  }

  const players = await getLeaguePlayers(semi.players)
  players.sort((a, b) => b.xp - a.xp)

  const top10 = players.slice(0, 10)
  const bottom5 = players.slice(10)
  const { collection, doc, setDoc, updateDoc } = await f()
  const { db } = await f()

  const stageStartedAt = semi.stageEndsAt || Date.now()
  const stageEndsAt = stageStartedAt + WEEK_MS
  const finalsRef = doc(collection(db, TOURNAMENTS))
  await setDoc(finalsRef, {
    stage: 'finals', season: semi.season,
    startsAt: semi.startsAt || semi.season,
    stageStartedAt, stageEndsAt,
    players: top10.map(p => p.id), status: 'active', createdAt: Date.now(),
  })

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
  if (!finals) return
  if (finals.players.length === 0) {
    const { doc, updateDoc } = await f()
    const { db } = await f()
    await updateDoc(doc(db, TOURNAMENTS, finals.id), { status: 'completed', completedAt: Date.now() })
    return
  }

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
      xp: 0, wins: 0, losses: 0, streak: 0, gamesPlayed: 0, promotions: 0, tournamentWins: 0, firstPlaceFinishes: 0, coins: 0,
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
