const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')

const PORT = process.env.PORT || 3000
const DIST = path.join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath)
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  const stream = fs.createReadStream(filePath)
  stream.on('error', () => {
    const fallback = path.join(DIST, 'index.html')
    if (fs.existsSync(fallback)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      fs.createReadStream(fallback).pipe(res)
    } else {
      res.writeHead(500)
      res.end('Server error')
    }
  })
  stream.pipe(res)
}

const VALID_ROUTES = [
  '/',
  '/about-us',
  '/download',
  '/admin-panel',
  '/god-commands',
  '/settings',
  '/signin',
  '/leagues',
  '/stats',
  '/achievements',
  '/shop',
  '/friends',
  '/leaderboard',
]

const ABOUT_BLANK_HTML = `<!DOCTYPE html>
<html>
<head><title>New Tab</title></head>
<body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;height:100vh;cursor:pointer">
<script>
(function() {
  try { history.replaceState(null, '', '/'); } catch(e) {}
  var siteHtml = null;
  fetch('/').then(function(r){ return r.text() }).then(function(html){
    var base = location.origin;
    siteHtml = html.replace(/<head>/i, '<head><base href="' + base + '/">');
  });
  document.body.addEventListener('click', function() {
    if (!siteHtml) return;
    var w = window.open('');
    if (w) {
      w.document.write(siteHtml);
      w.document.close();
    }
  });
})();
</script>
</body>
</html>`

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url)
    const pathname = decodeURIComponent(parsed.pathname).replace(/\/+$/, '') || '/'

    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('ok')
      return
    }
    if (pathname === '/god-commands/about-blank') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      })
      res.end(ABOUT_BLANK_HTML)
      return
    }
    const filePath = path.join(DIST, pathname === '/' ? 'index.html' : pathname)
    const resolved = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
      ? path.join(filePath, 'index.html')
      : filePath

    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      serveFile(res, resolved)
    } else if (VALID_ROUTES.includes(pathname) || /^\/play\/[^/]+$/.test(pathname)) {
      serveFile(res, path.join(DIST, 'index.html'))
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end('<!DOCTYPE html><html><head><title>404</title></head><body style="background:#1a1033;color:#f0e6ff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center"><div><h1>404</h1><p>Page not found</p><a href="/" style="color:#b946ff">← Back to Arcade</a></div></body></html>')
    }
  } catch (e) {
    console.error('Request error:', e)
    res.writeHead(500)
    res.end('Server error')
  }
})

server.listen(PORT, () => {
  console.log('Server running on port ' + PORT)
  console.log('Serving from: ' + DIST)
  try {
    console.log('Files in dist:', fs.readdirSync(DIST))
  } catch (e) {
    console.error('Could not read dist directory:', e.message)
  }
})

// ===== Hourly chat message cleanup =====
// Deletes chatMessages older than 7 days so storage stays bounded even when
// nobody has the app open. Uses firebase-admin (server SDK) so it bypasses
// security rules. Requires the FIREBASE_SERVICE_ACCOUNT env var (JSON key for
// a service account with Firestore read/write) or GOOGLE_APPLICATION_CREDENTIALS.
const CHAT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const CLEANUP_BATCH = 500
const CLEANUP_MAX_ROUNDS = 5

let _admin = null
let _cleanupWarned = false

function getAdmin() {
  if (_admin) return _admin
  let parsed = null
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    try { parsed = JSON.parse(raw) } catch {}
    if (!parsed) {
      try { parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) } catch {}
    }
  }
  if (parsed && parsed.project_id) {
    _admin = require('firebase-admin')
    const certFn = (_admin.credential && _admin.credential.cert) || _admin.cert
    _admin.initializeApp({ credential: certFn(parsed) })
    return _admin
  }
  return null
}

async function runChatCleanup() {
  try {
    const admin = getAdmin()
    if (!admin) {
      if (!_cleanupWarned) {
        console.warn('[chat-cleanup] FIREBASE_SERVICE_ACCOUNT not set; skipping. Set it to enable hourly cleanup.')
        _cleanupWarned = true
      }
      return
    }
    const { getFirestore } = require('firebase-admin/firestore')
    const db = getFirestore()
    const cutoff = Date.now() - CHAT_TTL_MS
    let total = 0
    for (let round = 0; round < CLEANUP_MAX_ROUNDS; round++) {
      const snap = await db.collection('chatMessages')
        .where('createdAt', '<', cutoff)
        .orderBy('createdAt')
        .limit(CLEANUP_BATCH)
        .get()
      if (snap.empty) break
      const batch = db.batch()
      snap.forEach(d => batch.delete(d.ref))
      await batch.commit()
      total += snap.size
      if (snap.size < CLEANUP_BATCH) break
    }
    if (total > 0) console.log(`[chat-cleanup] Deleted ${total} expired chat message(s)`)
  } catch (e) {
    console.warn('[chat-cleanup] error:', e.message)
  }
}

setTimeout(runChatCleanup, 10 * 1000)
setInterval(runChatCleanup, 60 * 60 * 1000)

// ===== Stale account cleanup =====
// Deletes accounts older than 5 years that have never been used since they
// were created (no activity after the initial creation write). Admins are
// always excluded. Uses firebase-admin (server SDK) so it bypasses security
// rules; requires FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS.
const STALE_ACCOUNT_AGE_MS = 5 * 365 * 24 * 60 * 60 * 1000
const STALE_ACCOUNT_BUFFER_MS = 60 * 60 * 1000

function toMillis(v) {
  if (typeof v === 'number') return v
  if (v && typeof v.toMillis === 'function') return v.toMillis()
  return 0
}

async function runStaleAccountCleanup() {
  try {
    const admin = getAdmin()
    if (!admin) {
      if (!_cleanupWarned) {
        console.warn('[account-cleanup] FIREBASE_SERVICE_ACCOUNT not set; skipping. Set it to enable stale account cleanup.')
        _cleanupWarned = true
      }
      return
    }
    const { getFirestore } = require('firebase-admin/firestore')
    const db = getFirestore()
    const cutoff = Date.now() - STALE_ACCOUNT_AGE_MS

    const playersSnap = await db.collection('players').get()
    const stale = []
    for (const d of playersSnap.docs) {
      const p = d.data()
      if (p.isAdmin) continue
      const created = toMillis(p.createdAt)
      const last = toMillis(p.lastActive)
      if (created > 0 && created < cutoff && last <= created + STALE_ACCOUNT_BUFFER_MS) {
        stale.push({ id: d.id, username: typeof p.username === 'string' ? p.username : null })
      }
    }
    if (stale.length === 0) {
      console.log('[account-cleanup] No stale accounts found')
      return
    }
    const staleIds = new Set(stale.map(s => s.id))

    let ops = 0
    let batch = db.batch()
    const add = (fn) => { fn(batch); ops++ }
    const flush = async () => {
      if (ops === 0) return
      await batch.commit()
      batch = db.batch()
      ops = 0
    }

    // Delete player docs + their username claims + moderation records.
    for (const s of stale) {
      if (s.username) add(b => b.delete(db.collection('usernames').doc(s.username.toLowerCase())))
      add(b => b.delete(db.collection('moderation').doc(s.id)))
      add(b => b.delete(db.collection('players').doc(s.id)))
    }
    await flush()

    // Remove stale ids from other players' friend lists.
    for (const d of playersSnap.docs) {
      if (staleIds.has(d.id)) continue
      const f = d.data().friends
      if (Array.isArray(f) && f.some(x => staleIds.has(x))) {
        add(b => b.update(d.ref, { friends: f.filter(x => !staleIds.has(x)) }))
      }
    }
    await flush()

    // Remove stale ids from league/tournament rosters.
    for (const col of ['leagues', 'tournaments']) {
      const snap = await db.collection(col).get()
      for (const d of snap.docs) {
        const pl = d.data().players
        if (Array.isArray(pl) && pl.some(x => staleIds.has(x))) {
          add(b => b.update(d.ref, { players: pl.filter(x => !staleIds.has(x)) }))
        }
      }
      await flush()
    }

    // Delete chat messages, daily scores, and challenge matches.
    for (const s of stale) {
      const chatSnap = await db.collection('chatMessages').where('userId', '==', s.id).get()
      chatSnap.forEach(m => add(b => b.delete(m.ref)))
      await flush()
      const scoreSnap = await db.collection('dailyScores').where('userId', '==', s.id).get()
      scoreSnap.forEach(sc => add(b => b.delete(sc.ref)))
      await flush()
      const m1 = await db.collection('matches').where('player1', '==', s.id).get()
      m1.forEach(m => add(b => b.delete(m.ref)))
      await flush()
      const m2 = await db.collection('matches').where('player2', '==', s.id).get()
      m2.forEach(m => add(b => b.delete(m.ref)))
      await flush()
    }

    console.log(`[account-cleanup] Deleted ${stale.length} stale account(s): ${stale.map(s => s.username || s.id).join(', ')}`)
  } catch (e) {
    console.warn('[account-cleanup] error:', e.message)
  }
}

setTimeout(runStaleAccountCleanup, 20 * 1000)
setInterval(runStaleAccountCleanup, 24 * 60 * 60 * 1000)
