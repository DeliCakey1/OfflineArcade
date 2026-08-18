// One-time cleanup: delete all guest (anonymous) players and their related
// data now that guest accounts are no longer supported. Guest players can no
// longer be created by the app, so this only needs to run once against any
// leftovers already in Firestore.
//
// Removes for each guest player:
//   - their /players/{uid} doc
//   - their /usernames claim (if any)
//   - their /moderation record (if any)
//   - their chatMessages, dailyScores, and matches
// Also removes guest ids from other players' friend lists and from
// league/tournament rosters, and clears leagueInstanceId where it points at
// a deleted guest.
//
// Usage (Cloud Shell, Node 20+):
//   cd OfflineArcade
//   npm install --no-save firebase-admin
//   gcloud auth application-default login   # once, if not already set up
//   node scripts/cleanup-guests.mjs
//
// Env: FIREBASE_PROJECT_ID (default offline-arcade-468cd),
//      GOOGLE_APPLICATION_CREDENTIALS (optional service-account JSON)

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'offline-arcade-468cd'

let credential = applicationDefault()
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (credPath) {
  const { readFileSync } = await import('node:fs')
  credential = cert(JSON.parse(readFileSync(credPath, 'utf8')))
}

initializeApp({ credential, projectId: PROJECT_ID })
const db = getFirestore()

async function run() {
  const playersSnap = await db.collection('players').get()
  const guests = playersSnap.docs.filter(d => d.data().isGuest === true)
  const guestIds = new Set(guests.map(d => d.id))

  if (guestIds.size === 0) {
    console.log('No guest players found. Nothing to clean up.')
    return
  }
  console.log(`Found ${guestIds.size} guest player(s).`)

  let ops = 0
  let batch = db.batch()
  const add = (fn) => { fn(batch); ops++ }
  const flush = async () => {
    if (ops === 0) return
    await batch.commit()
    batch = db.batch()
    ops = 0
  }

  // Delete guest player docs, their username claims, and moderation records.
  for (const d of guests) {
    const p = d.data()
    if (typeof p.username === 'string' && p.username) {
      add(b => b.delete(db.collection('usernames').doc(p.username.toLowerCase())))
    }
    add(b => b.delete(db.collection('moderation').doc(d.id)))
    add(b => b.delete(db.collection('players').doc(d.id)))
  }
  await flush()

  // Remove guest ids from other players' friend lists.
  for (const d of playersSnap.docs) {
    if (guestIds.has(d.id)) continue
    const f = d.data().friends
    if (Array.isArray(f) && f.some(x => guestIds.has(x))) {
      add(b => b.update(d.ref, { friends: f.filter(x => !guestIds.has(x)) }))
    }
  }
  await flush()

  // Remove guest ids from league/tournament rosters.
  for (const col of ['leagues', 'tournaments']) {
    const snap = await db.collection(col).get()
    for (const d of snap.docs) {
      const pl = d.data().players
      if (Array.isArray(pl) && pl.some(x => guestIds.has(x))) {
        add(b => b.update(d.ref, { players: pl.filter(x => !guestIds.has(x)) }))
      }
    }
    await flush()
  }

  // Delete guest chat messages, daily scores, and challenge matches.
  for (const id of guestIds) {
    const chatSnap = await db.collection('chatMessages').where('userId', '==', id).get()
    chatSnap.forEach(m => add(b => b.delete(m.ref)))
    await flush()

    const scoreSnap = await db.collection('dailyScores').where('userId', '==', id).get()
    scoreSnap.forEach(sc => add(b => b.delete(sc.ref)))
    await flush()

    const m1 = await db.collection('matches').where('player1', '==', id).get()
    m1.forEach(m => add(b => b.delete(m.ref)))
    await flush()

    const m2 = await db.collection('matches').where('player2', '==', id).get()
    m2.forEach(m => add(b => b.delete(m.ref)))
    await flush()
  }

  console.log(`Deleted ${guestIds.size} guest account(s).`)
  console.log('Done.')
}

run().catch((e) => {
  console.error('Cleanup failed:', e)
  process.exit(1)
})
