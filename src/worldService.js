import { getDb, ensureAuth } from './firebase'

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, db] = await Promise.all([import('firebase/firestore'), getDb()])
  _f = { ...firestore, db }
  return _f
}

const WORLD_PLAYERS = 'worldPlayers'
const WORLD_SPACES = 'worldSpaces'
const TRADES = 'trades'
const PLAYERS = 'players'

export const MAP_SIZE = 80
export const SPACE_SIZE = 8
export const TILE_SIZE = 40

const DECORATIONS = [
  { id: 'deco-chair', name: 'Chair', emoji: '🪑', price: 200, category: 'furniture' },
  { id: 'deco-table', name: 'Table', emoji: '🪵', price: 300, category: 'furniture' },
  { id: 'deco-bed', name: 'Bed', emoji: '🛏️', price: 500, category: 'furniture' },
  { id: 'deco-bookshelf', name: 'Bookshelf', emoji: '📚', price: 400, category: 'furniture' },
  { id: 'deco-lamp', name: 'Lamp', emoji: '💡', price: 150, category: 'furniture' },
  { id: 'deco-rug', name: 'Rug', emoji: '🟫', price: 250, category: 'furniture' },
  { id: 'deco-plant', name: 'Plant', emoji: '🪴', price: 200, category: 'nature' },
  { id: 'deco-tree', name: 'Tree', emoji: '🌳', price: 350, category: 'nature' },
  { id: 'deco-flower', name: 'Flowers', emoji: '🌸', price: 150, category: 'nature' },
  { id: 'deco-fountain', name: 'Fountain', emoji: '⛲', price: 800, category: 'nature' },
  { id: 'deco-flag', name: 'Flag', emoji: '🚩', price: 100, category: 'decor' },
  { id: 'deco-trophy', name: 'Trophy', emoji: '🏆', price: 600, category: 'decor' },
  { id: 'deco-painting', name: 'Painting', emoji: '🖼️', price: 400, category: 'decor' },
  { id: 'deco-globe', name: 'Globe', emoji: '🌍', price: 500, category: 'decor' },
  { id: 'deco-crystal', name: 'Crystal', emoji: '💎', price: 750, category: 'decor' },
  { id: 'deco-anvil', name: 'Anvil', emoji: '🔨', price: 300, category: 'workshop' },
  { id: 'deco-cauldron', name: 'Cauldron', emoji: '🧪', price: 450, category: 'workshop' },
  { id: 'deco-spellbook', name: 'Spell Book', emoji: '📖', price: 550, category: 'workshop' },
]

const MAP_TILES = generateMapTiles()

function generateMapTiles() {
  const tiles = []
  const grass = '🟩'
  const water = '🟦'
  const sand = '🟨'
  const path = '⬜'
  const tree = '🌲'
  const mountain = '⛰️'
  const flower = '🌺'

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const distFromCenter = Math.sqrt((x - MAP_SIZE/2) ** 2 + (y - MAP_SIZE/2) ** 2)
      const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3)

      if (distFromCenter > 35) {
        tiles.push(water)
      } else if (distFromCenter > 32) {
        tiles.push(sand)
      } else if (noise > 0.6 && distFromCenter > 5) {
        tiles.push(tree)
      } else if (noise < -0.7 && distFromCenter > 8) {
        tiles.push(mountain)
      } else if (Math.abs(noise) < 0.1 && distFromCenter < 25) {
        tiles.push(path)
      } else if (noise > 0.4 && noise < 0.5) {
        tiles.push(flower)
      } else {
        tiles.push(grass)
      }
    }
  }
  return tiles
}

export function getMapTile(x, y) {
  if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return null
  return MAP_TILES[y * MAP_SIZE + x]
}

export function isWalkable(x, y) {
  const tile = getMapTile(x, y)
  return tile && tile !== '🟦' && tile !== '⛰️'
}

export async function updatePosition(x, y) {
  const user = await ensureAuth()
  if (!user) return
  const { doc, setDoc } = await f()
  const { db } = await f()

  await setDoc(doc(db, WORLD_PLAYERS, user.uid), {
    x, y,
    lastSeen: Date.now(),
    uid: user.uid,
  }, { merge: true })
}

export function subscribeToNearbyPlayers(callback, range = 20) {
  let unsub = null
  ;(async () => {
    const { collection, onSnapshot } = await f()
    const { db } = await f()
    unsub = onSnapshot(collection(db, WORLD_PLAYERS), snap => {
      const players = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.lastSeen > Date.now() - 120000)
      callback(players)
    })
  })()
  return () => unsub?.()
}

export async function getOccupiedSpaces() {
  const { collection, getDocs } = await f()
  const { db } = await f()
  const snap = await getDocs(collection(db, WORLD_SPACES))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function subscribeToSpaces(callback) {
  let unsub = null
  ;(async () => {
    const { collection, onSnapshot } = await f()
    const { db } = await f()
    unsub = onSnapshot(collection(db, WORLD_SPACES), snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  })()
  return () => unsub?.()
}

export async function claimSpace(x, y) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, setDoc, getDoc, getDocs, query, where } = await f()
  const { db } = await f()

  const spaceX = Math.floor(x / SPACE_SIZE) * SPACE_SIZE
  const spaceY = Math.floor(y / SPACE_SIZE) * SPACE_SIZE
  const spaceId = `${spaceX}_${spaceY}`

  if (spaceX < 10 || spaceY < 10 || spaceX >= MAP_SIZE - 10 || spaceY >= MAP_SIZE - 10) {
    return { error: 'Cannot claim spaces near the map edge' }
  }

  const existing = await getDoc(doc(db, WORLD_SPACES, spaceId))
  if (existing.exists() && existing.data().ownerId !== user.uid) {
    return { error: 'Space already claimed by another player' }
  }

  const ownSpaces = await getDocs(query(collection(db, WORLD_SPACES), where('ownerId', '==', user.uid)))
  if (!existing.exists() && ownSpaces.size >= 3) {
    return { error: 'Maximum 3 spaces per player' }
  }

  const playerDoc = await getDoc(doc(db, PLAYERS, user.uid))
  const playerData = playerDoc.exists() ? playerDoc.data() : {}
  if ((playerData.coins || 0) < 500 && !existing.exists()) {
    return { error: 'Need 500 coins to claim a space' }
  }

  if (!existing.exists()) {
    await setDoc(doc(db, PLAYERS, user.uid), {
      coins: (playerData.coins || 0) - 500,
    }, { merge: true })
  }

  await setDoc(doc(db, WORLD_SPACES, spaceId), {
    ownerId: user.uid,
    x: spaceX,
    y: spaceY,
    name: playerData.username || playerData.name || 'Player',
    decorations: existing.exists() ? (existing.data().decorations || []) : [],
    createdAt: existing.exists() ? (existing.data().createdAt || Date.now()) : Date.now(),
    lastUpdated: Date.now(),
  }, { merge: true })

  return { success: true, spaceId }
}

export async function addDecoration(spaceId, decoId, gridX, gridY) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc, arrayUnion } = await f()
  const { db } = await f()

  const spaceDoc = await getDoc(doc(db, WORLD_SPACES, spaceId))
  if (!spaceDoc.exists()) return { error: 'Space not found' }
  if (spaceDoc.data().ownerId !== user.uid) return { error: 'Not your space' }

  const deco = DECORATIONS.find(d => d.id === decoId)
  if (!deco) return { error: 'Invalid decoration' }

  const existing = spaceDoc.data().decorations || []
  if (existing.find(d => d.gridX === gridX && d.gridY === gridY)) {
    return { error: 'Tile already occupied' }
  }

  const playerDoc = await getDoc(doc(db, PLAYERS, user.uid))
  const playerData = playerDoc.exists() ? playerDoc.data() : {}
  if ((playerData.coins || 0) < deco.price) {
    return { error: 'Not enough coins' }
  }

  await updateDoc(doc(db, PLAYERS, user.uid), {
    coins: (playerData.coins || 0) - deco.price,
  })

  await updateDoc(doc(db, WORLD_SPACES, spaceId), {
    decorations: arrayUnion({ id: decoId, emoji: deco.emoji, gridX, gridY, name: deco.name }),
    lastUpdated: Date.now(),
  })

  return { success: true }
}

export async function removeDecoration(spaceId, gridX, gridY) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()

  const spaceDoc = await getDoc(doc(db, WORLD_SPACES, spaceId))
  if (!spaceDoc.exists()) return { error: 'Space not found' }
  if (spaceDoc.data().ownerId !== user.uid) return { error: 'Not your space' }

  const decos = (spaceDoc.data().decorations || []).filter(d => !(d.gridX === gridX && d.gridY === gridY))

  await updateDoc(doc(db, WORLD_SPACES, spaceId), {
    decorations: decos,
    lastUpdated: Date.now(),
  })

  return { success: true }
}

export async function sendTradeOffer(targetUserId, offer, request) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, setDoc, getDoc } = await f()
  const { db } = await f()

  if (user.uid === targetUserId) return { error: 'Cannot trade with yourself' }

  const tradeId = 'trade_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

  const fromDoc = await getDoc(doc(db, PLAYERS, user.uid))
  const fromData = fromDoc.exists() ? fromDoc.data() : {}

  if (offer.coins > 0 && (fromData.coins || 0) < offer.coins) {
    return { error: 'Not enough coins' }
  }

  const toDoc = await getDoc(doc(db, PLAYERS, targetUserId))
  const toData = toDoc.exists() ? toDoc.data() : {}

  if (request.coins > 0 && (toData.coins || 0) < request.coins) {
    return { error: 'Target player doesn\'t have enough coins' }
  }

  await setDoc(doc(db, TRADES, tradeId), {
    from: { userId: user.uid, username: fromData.username || fromData.name || 'Player' },
    to: { userId: targetUserId, username: toData.username || toData.name || 'Player' },
    offer,
    request,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000,
  })

  return { tradeId }
}

export async function acceptTrade(tradeId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()

  const tradeDoc = await getDoc(doc(db, TRADES, tradeId))
  if (!tradeDoc.exists()) return { error: 'Trade not found' }
  const trade = tradeDoc.data()

  if (trade.to.userId !== user.uid) return { error: 'Not your trade' }
  if (trade.status !== 'pending') return { error: 'Trade no longer pending' }
  if (Date.now() > trade.expiresAt) return { error: 'Trade expired' }

  const fromDoc = await getDoc(doc(db, PLAYERS, trade.from.userId))
  const fromData = fromDoc.exists() ? fromDoc.data() : {}
  const toDoc = await getDoc(doc(db, PLAYERS, user.uid))
  const toData = toDoc.exists() ? toDoc.data() : {}

  if (trade.offer.coins > 0 && (fromData.coins || 0) < trade.offer.coins) {
    return { error: 'Trader no longer has enough coins' }
  }
  if (trade.request.coins > 0 && (toData.coins || 0) < trade.request.coins) {
    return { error: 'You no longer have enough coins' }
  }

  const fromUpdates = {}
  const toUpdates = {}

  if (trade.offer.coins > 0) fromUpdates.coins = (fromData.coins || 0) - trade.offer.coins
  if (trade.request.coins > 0) toUpdates.coins = (toData.coins || 0) - trade.request.coins
  if (trade.offer.coins > 0 && trade.request.coins > 0) {
    fromUpdates.coins = (fromData.coins || 0) - trade.offer.coins + trade.request.coins
    toUpdates.coins = (toData.coins || 0) - trade.request.coins + trade.offer.coins
  }

  if (trade.offer.items?.length > 0) {
    const fromOwned = [...(fromData.ownedItems || [])]
    const toOwned = [...(toData.ownedItems || [])]
    for (const itemId of trade.offer.items) {
      const idx = fromOwned.indexOf(itemId)
      if (idx === -1) return { error: `Trader doesn't own ${itemId}` }
      fromOwned.splice(idx, 1)
      toOwned.push(itemId)
    }
    fromUpdates.ownedItems = fromOwned
    toUpdates.ownedItems = toOwned
  }

  await updateDoc(doc(db, PLAYERS, trade.from.userId), fromUpdates)
  await updateDoc(doc(db, PLAYERS, user.uid), toUpdates)
  await updateDoc(doc(db, TRADES, tradeId), { status: 'completed', completedAt: Date.now() })

  return { success: true }
}

export async function declineTrade(tradeId) {
  const user = await ensureAuth()
  if (!user) return { error: 'Sign in required' }
  const { doc, getDoc, updateDoc } = await f()
  const { db } = await f()

  const tradeDoc = await getDoc(doc(db, TRADES, tradeId))
  if (!tradeDoc.exists()) return { error: 'Trade not found' }
  const trade = tradeDoc.data()

  if (trade.to.userId !== user.uid && trade.from.userId !== user.uid) {
    return { error: 'Not your trade' }
  }

  await updateDoc(doc(db, TRADES, tradeId), { status: 'declined' })
  return { success: true }
}

export function subscribeToTrades(userId, callback) {
  let unsub = null
  ;(async () => {
    const { collection, query, where, onSnapshot } = await f()
    const { db } = await f()
    const q = query(
      collection(db, TRADES),
      where('to.userId', '==', userId),
      where('status', '==', 'pending')
    )
    unsub = onSnapshot(q, snap => {
      const trades = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.expiresAt > Date.now())
      callback(trades)
    })
  })()
  return () => unsub?.()
}

export async function getTradeHistory(userId) {
  if (!userId) return []
  const { collection, query, where, orderBy, getDocs, limit: firestoreLimit } = await f()
  const { db } = await f()

  const sentQuery = query(
    collection(db, TRADES),
    where('from.userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(20)
  )
  const sentSnap = await getDocs(sentQuery)

  const receivedQuery = query(
    collection(db, TRADES),
    where('to.userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(20)
  )
  const receivedSnap = await getDocs(receivedQuery)

  const all = new Map()
  sentSnap.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data(), side: 'sent' }))
  receivedSnap.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data(), side: 'received' }))

  return Array.from(all.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export function getDecorations() { return DECORATIONS }
export function getSpaceSize() { return SPACE_SIZE }
export function getMapSize() { return MAP_SIZE }
