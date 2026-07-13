import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCGtzsORtawgLVGm3z0Msg_pjdh_Cx00w4",
  authDomain: "offline-arcade-468cd.firebaseapp.com",
  projectId: "offline-arcade-468cd",
  storageBucket: "offline-arcade-468cd.firebasestorage.app",
  messagingSenderId: "542077080040",
  appId: "1:542077080040:web:82d3eff8ef24615a5cd45d",
  measurementId: "G-XJS0DQBBDT"
}

let app = null
let db = null
let auth = null

try {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
} catch (e) {
  console.warn('Firebase init failed:', e)
}

export { db, auth }
export async function ensureAuth() {
  if (!auth) return null
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user) }
      else { signInAnonymously(auth).catch(() => resolve(null)) }
    })
  })
}
