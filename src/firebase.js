let _app = null
let _db = null
let _auth = null
let _initPromise = null

function initFirebase() {
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    try {
      const [{ initializeApp }, { getFirestore }, { getAuth }] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
        import('firebase/auth'),
      ])
      const config = {
        apiKey: "AIzaSyCGtzsORtawgLVGm3z0Msg_pjdh_Cx00w4",
        authDomain: "offline-arcade-468cd.firebaseapp.com",
        projectId: "offline-arcade-468cd",
        storageBucket: "offline-arcade-468cd.firebasestorage.app",
        messagingSenderId: "542077080040",
        appId: "1:542077080040:web:82d3eff8ef24615a5cd45d",
        measurementId: "G-XJS0DQBBDT",
      }
      _app = initializeApp(config)
      _db = getFirestore(_app)
      _auth = getAuth(_app)
    } catch (e) {
      console.warn('Firebase init failed:', e)
    }
  })()
  return _initPromise
}

async function getDb() { await initFirebase(); return _db }
async function getAuthInstance() { await initFirebase(); return _auth }

export async function ensureAuth() {
  const auth = await getAuthInstance()
  if (!auth) return null
  const { onAuthStateChanged, signInAnonymously } = await import('firebase/auth')
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user) }
      else { signInAnonymously(auth).catch(() => resolve(null)) }
    })
  })
}

export { getDb, getAuthInstance }
