// One-time cleanup: remove members with zero games played from all active
// leagues and tournaments, and clear their leagueInstanceId.
//
// Usage (Cloud Shell, Node 20+):
//   cd OfflineArcade
//   npm install --no-save firebase-admin
//   gcloud auth application-default login   # once, if not already set up
//   node scripts/cleanup-inactive-league-members.mjs
//
// Env: FIREBASE_PROJECT_ID (default offline-arcade-468cd),
//      GOOGLE_APPLICATION_CREDENTIALS (optional service-account JSON)

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'offline-arcade-468cd'

let credential = applicationDefault()
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (credPath) {
  const { readFileSync } = await import('node:fs')
  credential = cert(JSON.parse(readFileSync(credPath, 'utf8')))
}

initializeApp({ credential, projectId: PROJECT_ID })
const db = getFirestore()

const hasPlayed = (p) => (p.gamesPlayed || 0) > 0 || (p.wins || 0) > 0 || (p.losses || 0) > 0

async function inspect(doc) {
  const players = doc.data().players || []
  const toRemove = []
  for (const uid of players) {
    const snap = await db.collection('players').doc(uid).get()
    if (!snap.exists) {
      toRemove.push({ uid, missing: true })
      continue
    }
    if (!hasPlayed(snap.data())) toRemove.push({ uid, missing: false })
  }
  return toRemove
}

async function run() {
  const [leaguesSnap, tournamentsSnap] = await Promise.all([
    db.collection('leagues').where('status', '==', 'active').get(),
    db.collection('tournaments').where('status', '==', 'active').get(),
  ])

  let inspected = 0
  let removed = 0
  let missingDocs = 0
  const playerIdToLeague = new Map()
  const containerRemovals = []

  const processContainer = async (doc) => {
    const list = await inspect(doc)
    if (list.length === 0) return
    const ids = list.map((r) => r.uid)
    containerRemovals.push({ ref: doc.ref, ids })
    for (const r of list) {
      if (r.missing) missingDocs++
      else removed++
      inspected++
      playerIdToLeague.set(r.uid, doc.id)
    }
  }

  for (const d of leaguesSnap.docs) await processContainer(d)
  for (const d of tournamentsSnap.docs) await processContainer(d)

  console.log(`Inspected members in active leagues/tournaments`)
  console.log(`Removed (0 games played): ${removed}`)
  console.log(`Removed (player doc missing): ${missingDocs}`)

  const batches = []
  for (let i = 0; i < containerRemovals.length; i += 10) {
    const batch = db.batch()
    for (const c of containerRemovals.slice(i, i + 10)) {
      batch.update(c.ref, { players: FieldValue.arrayRemove(...c.ids) })
    }
    batches.push(batch.commit())
  }

  const playerIds = [...playerIdToLeague.keys()]
  for (let i = 0; i < playerIds.length; i += 400) {
    const batch = db.batch()
    for (const uid of playerIds.slice(i, i + 400)) {
      const playerRef = db.collection('players').doc(uid)
      batch.update(playerRef, { leagueInstanceId: null, lastActive: Date.now() })
    }
    batches.push(batch.commit())
  }

  await Promise.all(batches)
  console.log(`Cleared leagueInstanceId for ${playerIds.length} players`)
  console.log('Done.')
}

run().catch((e) => {
  console.error('Cleanup failed:', e)
  process.exit(1)
})
