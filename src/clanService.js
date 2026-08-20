import { getDb, ensureAuth } from './firebase'

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, db] = await Promise.all([import('firebase/firestore'), getDb()])
  _f = { ...firestore, db }
  return _f
}

const CLANS = 'clans'
const PLAYERS = 'players'
const CLAN_CREATE_COST = 500
const MAX_MEMBERS = 20
const TAG_REGEX = /^[A-Za-z0-9]{2,4}$/

function generateClanId() {
  return 'clan_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export async function createClan(name, tag, banner = {}) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } = await f()
  const { db } = await f()

  if (!name || name.length < 2 || name.length > 20) return { error: 'Clan name must be 2-20 characters' }
  if (!TAG_REGEX.test(tag)) return { error: 'Tag must be 2-4 letters/numbers' }

  const playerDoc = await getDoc(doc(db, PLAYERS, user.uid))
  const playerData = playerDoc.exists() ? playerDoc.data() : {}
  if ((playerData.clanId || playerData.clan) && playerData.clanId !== null) return { error: 'You are already in a clan' }
  if ((playerData.coins || 0) < CLAN_CREATE_COST) return { error: `Need ${CLAN_CREATE_COST} coins to create a clan` }

  const tagUpper = tag.toUpperCase()
  const nameQuery = query(collection(db, CLANS), where('name', '==', name))
  const nameSnap = await getDocs(nameQuery)
  if (!nameSnap.empty) return { error: 'Clan name already taken' }

  const tagQuery = query(collection(db, CLANS), where('tag', '==', tagUpper))
  const tagSnap = await getDocs(tagQuery)
  if (!tagSnap.empty) return { error: 'Clan tag already taken' }

  const clanId = generateClanId()
  const clanData = {
    name: name.trim(),
    tag: tagUpper,
    leader: user.uid,
    members: [user.uid],
    memberCount: 1,
    clanXP: 0,
    weeklyXP: 0,
    wins: 0,
    losses: 0,
    createdAt: Date.now(),
    banner: { color: banner.color || '#b946ff', icon: banner.icon || '⚔️' },
    description: '',
  }

  await setDoc(doc(db, CLANS, clanId), clanData)

  await updateDoc(doc(db, PLAYERS, user.uid), {
    clanId: clanId,
    clanRole: 'leader',
    coins: (playerData.coins || 0) - CLAN_CREATE_COST,
  })

  return { clanId, ...clanData }
}

export async function joinClan(clanId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc, arrayUnion } = await f()
  const { db } = await f()

  const clanDoc = await getDoc(doc(db, CLANS, clanId))
  if (!clanDoc.exists()) return { error: 'Clan not found' }
  const clanData = clanDoc.data()

  const playerDoc = await getDoc(doc(db, PLAYERS, user.uid))
  const playerData = playerDoc.exists() ? playerDoc.data() : {}
  if (playerData.clanId || playerData.clan) return { error: 'You are already in a clan' }
  if (clanData.memberCount >= MAX_MEMBERS) return { error: 'Clan is full' }

  await updateDoc(doc(db, CLANS, clanId), {
    members: arrayUnion(user.uid),
    memberCount: clanData.memberCount + 1,
  })

  await updateDoc(doc(db, PLAYERS, user.uid), {
    clanId: clanId,
    clanRole: 'member',
  })

  return { success: true }
}

export async function leaveClan(clanId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc, arrayRemove, deleteDoc } = await f()
  const { db } = await f()

  const clanDoc = await getDoc(doc(db, CLANS, clanId))
  if (!clanDoc.exists()) return { error: 'Clan not found' }
  const clanData = clanDoc.data()

  const newMembers = clanData.members.filter(m => m !== user.uid)

  if (newMembers.length === 0) {
    await deleteDoc(doc(db, CLANS, clanId))
  } else {
    const updates = { members: newMembers, memberCount: newMembers.length }
    if (clanData.leader === user.uid) {
      updates.leader = newMembers[0]
    }
    await updateDoc(doc(db, CLANS, clanId), updates)
  }

  await updateDoc(doc(db, PLAYERS, user.uid), {
    clanId: null,
    clanRole: null,
  })

  return { success: true }
}

export async function disbandClan(clanId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc, deleteDoc } = await f()
  const { db } = await f()

  const clanDoc = await getDoc(doc(db, CLANS, clanId))
  if (!clanDoc.exists()) return { error: 'Clan not found' }
  const clanData = clanDoc.data()
  if (clanData.leader !== user.uid) return { error: 'Only the leader can disband' }

  for (const memberId of clanData.members) {
    try {
      await updateDoc(doc(db, PLAYERS, memberId), { clanId: null, clanRole: null })
    } catch {}
  }

  await deleteDoc(doc(db, CLANS, clanId))
  return { success: true }
}

export async function getClan(clanId) {
  if (!clanId) return null
  const { doc, getDoc } = await f()
  const { db } = await f()
  const snap = await getDoc(doc(db, CLANS, clanId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getClanMembers(memberIds) {
  if (!memberIds || memberIds.length === 0) return []
  const { doc, getDoc } = await f()
  const { db } = await f()
  const members = []
  for (const id of memberIds) {
    try {
      const snap = await getDoc(doc(db, PLAYERS, id))
      if (snap.exists()) members.push({ id: snap.id, ...snap.data() })
    } catch {}
  }
  return members
}

export async function searchClans(searchTerm) {
  if (!searchTerm) return []
  const { collection, query, where, orderBy, getDocs, limit: firestoreLimit } = await f()
  const { db } = await f()
  const q = query(
    collection(db, CLANS),
    where('name', '>=', searchTerm),
    where('name', '<=', searchTerm + '\uf8ff'),
    orderBy('name'),
    firestoreLimit(20)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updateClan(clanId, data) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()

  const clanDoc = await getDoc(doc(db, CLANS, clanId))
  if (!clanDoc.exists()) return { error: 'Clan not found' }
  if (clanDoc.data().leader !== user.uid) return { error: 'Only leader can edit' }

  const allowed = {}
  if (data.name !== undefined) allowed.name = data.name
  if (data.description !== undefined) allowed.description = data.description
  if (data.banner !== undefined) allowed.banner = data.banner

  await updateDoc(doc(db, CLANS, clanId), allowed)
  return { success: true }
}

export async function promoteToOfficer(clanId, targetId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()

  const clanDoc = await getDoc(doc(db, CLANS, clanId))
  if (!clanDoc.exists()) return { error: 'Clan not found' }
  if (clanDoc.data().leader !== user.uid) return { error: 'Only leader can promote' }
  if (!clanDoc.data().members.includes(targetId)) return { error: 'Target not in clan' }

  await updateDoc(doc(db, PLAYERS, targetId), { clanRole: 'officer' })
  return { success: true }
}

export async function demoteMember(clanId, targetId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()

  const clanDoc = await getDoc(doc(db, CLANS, clanId))
  if (!clanDoc.exists()) return { error: 'Clan not found' }
  if (clanDoc.data().leader !== user.uid) return { error: 'Only leader can demote' }

  await updateDoc(doc(db, PLAYERS, targetId), { clanRole: 'member' })
  return { success: true }
}

export async function kickMember(clanId, targetId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc, arrayRemove } = await f()
  const { db } = await f()

  const clanDoc = await getDoc(doc(db, CLANS, clanId))
  if (!clanDoc.exists()) return { error: 'Clan not found' }
  const clanData = clanDoc.data()
  if (clanData.leader !== user.uid) return { error: 'Only leader can kick' }
  if (targetId === user.uid) return { error: 'Cannot kick yourself' }
  if (!clanData.members.includes(targetId)) return { error: 'Target not in clan' }

  const newMembers = clanData.members.filter(m => m !== targetId)
  await updateDoc(doc(db, CLANS, clanId), { members: newMembers, memberCount: newMembers.length })
  await updateDoc(doc(db, PLAYERS, targetId), { clanId: null, clanRole: null })

  return { success: true }
}

export async function getClanLeaderboard() {
  const { collection, query, orderBy, getDocs, limit: firestoreLimit } = await f()
  const { db } = await f()
  const q = query(collection(db, CLANS), orderBy('weeklyXP', 'desc'), firestoreLimit(50))
  const snap = await getDocs(q)
  return snap.docs.map((d, i) => ({ rank: i + 1, id: d.id, ...d.data() }))
}

export async function addClanXP(clanId, xp) {
  if (!clanId || xp <= 0) return
  const { doc, getDoc, updateDoc, increment } = await f()
  const { db } = await f()
  try {
    await updateDoc(doc(db, CLANS, clanId), {
      clanXP: increment(xp),
      weeklyXP: increment(xp),
      wins: increment(1),
    })
  } catch {}
}

export function subscribeToClan(clanId, callback) {
  let unsub = null
  ;(async () => {
    const { doc, onSnapshot } = await f()
    const { db } = await f()
    unsub = onSnapshot(doc(db, CLANS, clanId), snap => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() })
      else callback(null)
    })
  })()
  return () => unsub?.()
}

export { CLAN_CREATE_COST, MAX_MEMBERS }
