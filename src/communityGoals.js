import { getDb } from './firebase'

const GOALS = 'communityGoals'
const ACTIVITY = 'activityFeed'

let _f = null
async function f() {
  if (_f) return _f
  const [firestore, db] = await Promise.all([import('firebase/firestore'), getDb()])
  _f = { ...firestore, db }
  return _f
}

export function subscribeToWeeklyGoal(callback) {
  let unsub = null
  ;(async () => {
    const { doc, onSnapshot, getDoc, setDoc } = await f()
    const { db } = await f()
    const ref = doc(db, GOALS, 'weekly')
    unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        const now = Date.now()
        const nextSunday = new Date()
        nextSunday.setUTCHours(23, 59, 59, 999)
        const day = nextSunday.getUTCDay()
        nextSunday.setUTCDate(nextSunday.getUTCDate() + ((7 - day) % 7 || 7))
        await setDoc(ref, {
          goal: 'Play 10,000 games this week',
          target: 10000,
          current: 0,
          reward: 50,
          endsAt: nextSunday.getTime(),
          startedAt: now,
        })
        return
      }
      callback(snap.data())
    })
  })()
  return () => unsub?.()
}

export async function incrementGoalProgress(amount = 1) {
  const { doc, getDoc, setDoc, updateDoc, increment } = await f()
  const { db } = await f()
  const ref = doc(db, GOALS, 'weekly')
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const now = Date.now()
    const nextSunday = new Date()
    nextSunday.setUTCHours(23, 59, 59, 999)
    const day = nextSunday.getUTCDay()
    nextSunday.setUTCDate(nextSunday.getUTCDate() + ((7 - day) % 7 || 7))
    await setDoc(ref, {
      goal: 'Play 10,000 games this week',
      target: 10000,
      current: amount,
      reward: 50,
      endsAt: nextSunday.getTime(),
      startedAt: now,
    })
  } else {
    await updateDoc(ref, { current: increment(amount) })
  }
}

export function subscribeToActivityFeed(callback, limit = 20) {
  let unsub = null
  ;(async () => {
    const { collection, onSnapshot, query, orderBy, limit: fsLimit } = await f()
    const { db } = await f()
    const q = query(collection(db, ACTIVITY), orderBy('createdAt', 'desc'), fsLimit(limit))
    unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      callback(items)
    })
  })()
  return () => unsub?.()
}

export async function addActivityEntry(type, userId, username, data = {}) {
  const { collection, addDoc, query, orderBy, limit: fsLimit, getDocs, deleteDoc, doc } = await f()
  const { db } = await f()
  await addDoc(collection(db, ACTIVITY), {
    type,
    userId,
    username,
    data,
    createdAt: Date.now(),
  })
  const q = query(collection(db, ACTIVITY), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  if (snap.size > 100) {
    const toDelete = snap.docs.slice(100)
    await Promise.all(toDelete.map((d) => deleteDoc(doc(db, ACTIVITY, d.id))))
  }
}

export function getGameName(gameId) {
  const names = {
    rps: 'Rock Paper Scissors', ssg: 'Split Steal Give Away', gtn: 'Guess The Number',
    'gtn-hc': 'Hot or Cold', hol: 'Higher or Lower', dice: 'Dice Roll',
    coin: 'Coin Flip Streak', memory: 'Memory Match', word: 'Word Scramble',
    merge: 'Number Merge', reaction: 'Reaction Time', typing: 'Typing Speed',
    simon: 'Simon Says', slots: 'Slots', blackjack: 'Blackjack', whack: 'Whack-a-Mole',
    snake: 'Snake', tetris: 'Tetris', breakout: 'Breakout', flappy: 'Flappy Bird',
    minesweeper: 'Minesweeper', lightsout: 'Lights Out', mastermind: 'Mastermind',
    dodge: 'Dodge', mergeblitz: 'Merge Blitz', connect4: 'Connect Four',
    sudoku: 'Sudoku', mathdash: 'Math Dash', wordle: 'Wordle',
    pong: 'Pong', spaceinvaders: 'Space Invaders', asteroids: 'Asteroids',
    fruitslice: 'Fruit Slice', centipede: 'Centipede',
  }
  return names[gameId] || gameId
}

export function getGameEmoji(gameId) {
  const emojis = {
    rps: '✊', ssg: '💰', gtn: '🔢', 'gtn-hc': '🌡️', hol: '🃏', dice: '🎲',
    coin: '🪙', memory: '🧠', word: '📚', merge: '🔢', reaction: '⚡', typing: '⌨️',
    simon: '🎵', slots: '🎰', blackjack: '🃏', whack: '🔨', snake: '🐍', tetris: '🧱',
    breakout: '🏓', flappy: '🐦', minesweeper: '💣', lightsout: '💡', mastermind: '🧠',
    dodge: '🎮', mergeblitz: '⚡', connect4: '🔴', sudoku: '🔢', mathdash: '➕',
    wordle: '📝', pong: '🏓', spaceinvaders: '👾', asteroids: '☄️', fruitslice: '🍉',
    centipede: '🐛',
  }
  return emojis[gameId] || '🎮'
}
