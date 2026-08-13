const http = require('http')
const https = require('https')
const crypto = require('crypto')
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
  '/accessibility',
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
    if (pathname === '/api/payment/packages') {
      const list = Object.values(COIN_PACKAGES).map(p => ({ id: p.id, coins: p.coins, usd: p.usd }))
      json(res, 200, list)
      return
    }
    if (pathname === '/api/payment/token' && req.method === 'POST') {
      readRawBody(req)
        .then(raw => handleCreateToken(req, raw))
        .then(({ status, body }) => json(res, status, body))
        .catch(e => {
          console.error('[xsolla] token route error:', e)
          json(res, 500, { error: 'Server error.' })
        })
      return
    }
    if (pathname === '/xsolla/webhook' && req.method === 'POST') {
      readRawBody(req)
        .then(raw => handleXsollaWebhook(req, raw))
        .then(({ status, body }) => {
          if (status === 204) res.writeHead(204)
          else json(res, status, body)
        })
        .catch(e => {
          console.error('[xsolla] webhook route error:', e)
          res.writeHead(500)
          res.end()
        })
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
  if (!XSOLLA_READY) console.warn('[xsolla] XSOLLA_MERCHANT_ID / XSOLLA_API_KEY / XSOLLA_PROJECT_ID not set; coin purchases disabled.')
  if (!XSOLLA.webhookSecret) console.warn('[xsolla] XSOLLA_WEBHOOK_SECRET not set; payment webhooks disabled.')
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

// ===== Xsolla coin purchases =====
// Buy Coins flow:
//   1) Client POSTs /api/payment/token with a Firebase ID token + a pack id.
//   2) Server verifies the user and creates an order + payment token with Xsolla.
//   3) Client opens the returned Pay Station URL.
//   4) Xsolla posts a signed "payment" webhook to /xsolla/webhook.
//   5) Server verifies the signature and idempotently grants coins (safe to
//      receive the same webhook more than once; grants are keyed by tx id).
// Requires XSOLLA_MERCHANT_ID, XSOLLA_API_KEY, XSOLLA_PROJECT_ID,
// XSOLLA_WEBHOOK_SECRET and FIREBASE_SERVICE_ACCOUNT env vars. Xsolla stays
// in sandbox mode until XSOLLA_SANDBOX is explicitly set to "false".
const COIN_PACKAGES = {
  'coins-100': { id: 'coins-100', coins: 100, sku: 'oa_coins_100', usd: 0.99 },
  'coins-500': { id: 'coins-500', coins: 500, sku: 'oa_coins_500', usd: 4.49 },
  'coins-1200': { id: 'coins-1200', coins: 1200, sku: 'oa_coins_1200', usd: 9.99 },
  'coins-3000': { id: 'coins-3000', coins: 3000, sku: 'oa_coins_3000', usd: 19.99 },
}

const XSOLLA = {
  merchantId: (process.env.XSOLLA_MERCHANT_ID || '').trim(),
  apiKey: (process.env.XSOLLA_API_KEY || '').trim(),
  projectId: (process.env.XSOLLA_PROJECT_ID || '').trim(),
  webhookSecret: (process.env.XSOLLA_WEBHOOK_SECRET || '').trim(),
  sandbox: process.env.XSOLLA_SANDBOX !== 'false',
}

const XSOLLA_READY = Boolean(XSOLLA.merchantId && XSOLLA.apiKey && XSOLLA.projectId)
const SITE_ORIGIN = (process.env.SITE_URL || '').replace(/\/+$/, '') || 'https://offlinearcade.up.railway.app'
const XSOLLA_API_BASE = (process.env.XSOLLA_API_BASE || '').replace(/\/+$/, '') || 'https://store.xsolla.com'
const XSOLLA_UI_BASE = XSOLLA.sandbox ? 'https://sandbox-secure.xsolla.com' : 'https://secure.xsolla.com'

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function xsollaRequest(method, urlStr, authHeader, payload) {
  return new Promise((resolve, reject) => {
    const body = payload == null ? null : Buffer.from(JSON.stringify(payload), 'utf8')
    const headers = { Accept: 'application/json' }
    if (authHeader) headers.Authorization = authHeader
    if (body) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = body.length
    }
    const req = https.request(urlStr, { method, headers }, res => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function verifyXsollaSignature(rawBody, authHeader, secret) {
  const provided = String(authHeader || '').replace(/^Signature\s+/i, '').trim()
  if (!provided || !secret) return false
  const expected = crypto.createHash('sha1').update(String(rawBody) + secret).digest('hex')
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function createXsollaPaymentToken(pkg, user) {
  const url = `${XSOLLA_API_BASE}/api/v3/project/${XSOLLA.projectId}/admin/payment/token`
  const auth = Buffer.from(`${XSOLLA.merchantId}:${XSOLLA.apiKey}`).toString('base64')
  const payload = {
    sandbox: XSOLLA.sandbox,
    user: {
      id: { value: user.uid },
      name: { value: user.name || '' },
    },
    purchase: {},
    settings: {
      project_id: Number(XSOLLA.projectId),
      currency: 'USD',
      language: 'en',
      external_id: user.uid,
      return_url: `${SITE_ORIGIN}/shop`,
    },
  }
  if (pkg.sku) {
    payload.purchase.virtual_items = [{ sku: pkg.sku, quantity: 1 }]
  } else {
    payload.purchase.virtual_currency = { quantity: pkg.coins }
  }
  return xsollaRequest('POST', url, `Basic ${auth}`, payload)
}

const tokenThrottle = new Map()

async function handleCreateToken(req, rawBody) {
  if (!getAdmin()) return { status: 503, body: { error: 'Server is not fully configured.' } }
  if (!XSOLLA_READY) return { status: 503, body: { error: 'Coin purchases are not configured yet.' } }
  let body = {}
  try { body = JSON.parse(rawBody || '{}') } catch {}
  const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!idToken) return { status: 401, body: { error: 'Not signed in.' } }
  let uid = null
  try { uid = (await getAdmin().auth().verifyIdToken(idToken)).uid } catch {}
  if (!uid) return { status: 401, body: { error: 'Not signed in.' } }
  const pkg = COIN_PACKAGES[body.packageId]
  if (!pkg) return { status: 400, body: { error: 'Unknown coin pack.' } }
  const now = Date.now()
  if (now - (tokenThrottle.get(uid) || 0) < 5000) return { status: 429, body: { error: 'Too fast. Try again in a few seconds.' } }
  tokenThrottle.set(uid, now)
  let name = ''
  try {
    const snap = await getAdmin().firestore().collection('players').doc(uid).get()
    if (snap.exists && typeof snap.data().username === 'string') name = snap.data().username
  } catch {}
  let result
  try {
    result = await createXsollaPaymentToken(pkg, { uid, name })
  } catch (e) {
    console.warn('[xsolla] create token error:', e.message)
    return { status: 502, body: { error: 'Payment provider unreachable.' } }
  }
  if (result.status >= 300) {
    console.warn('[xsolla] create token status', result.status, result.body.slice(0, 300))
    return { status: 502, body: { error: 'Payment provider rejected the request.' } }
  }
  let token = ''
  try { token = JSON.parse(result.body).token } catch {}
  if (!token) return { status: 502, body: { error: 'Payment provider returned no token.' } }
  return { status: 200, body: { url: `${XSOLLA_UI_BASE}/paystation4/?token=${encodeURIComponent(token)}` } }
}

function webhookUserId(event) {
  const u = event && event.user
  if (!u) return null
  return u.id && typeof u.id === 'object' ? u.id.value : u.id
}

function coinAmountFromEvent(event) {
  const vc = event.purchase && event.purchase.virtual_currency
  if (vc && vc.quantity) return vc.quantity
  const items = (event.purchase && event.purchase.virtual_items) || (event.payment && event.payment.virtual_items) || []
  let total = 0
  for (const it of items) {
    const pkg = it && Object.values(COIN_PACKAGES).find(p => p.sku === it.sku)
    if (pkg) total += pkg.coins * (it.quantity || 1)
  }
  return total || 0
}

async function grantCoinsFromEvent(event) {
  const admin = getAdmin()
  if (!admin) return
  const db = admin.firestore()
  const userId = String(webhookUserId(event))
  const txId = event.transaction && event.transaction.id
  if (!userId || txId == null) return
  const quantity = coinAmountFromEvent(event)
  if (!quantity) return
  try {
    await db.runTransaction(async t => {
      const receiptRef = db.collection('coinPurchases').doc(String(txId))
      const receipt = await t.get(receiptRef)
      if (receipt.exists) return
      t.set(receiptRef, { userId, quantity, transactionId: txId, status: 'done', at: Date.now() })
      const playerRef = db.collection('players').doc(userId)
      const player = await t.get(playerRef)
      if (player.exists) {
        t.update(playerRef, { coins: admin.firestore.FieldValue.increment(quantity) })
      } else {
        t.set(playerRef, { coins: quantity, createdAt: admin.firestore.FieldValue.serverTimestamp() })
      }
    })
    console.log(`[xsolla] granted ${quantity} coins to ${userId} (tx ${txId})`)
  } catch (e) {
    console.warn('[xsolla] grant error:', e.message)
  }
}

async function handleXsollaWebhook(req, rawBody) {
  const secret = XSOLLA.webhookSecret
  if (!secret) return { status: 503, body: { error: 'Webhook not configured.' } }
  if (!verifyXsollaSignature(rawBody, req.headers.authorization, secret)) {
    return { status: 400, body: { error: 'Invalid signature.' } }
  }
  let event = null
  try { event = JSON.parse(rawBody) } catch {
    return { status: 400, body: { error: 'Bad JSON.' } }
  }
  if (event.notification_type === 'user_validation') {
    const userId = webhookUserId(event)
    if (getAdmin() && userId) {
      const snap = await getAdmin().firestore().collection('players').doc(String(userId)).get()
      return { status: snap.exists ? 204 : 400, body: snap.exists ? null : { error: 'User not found.' } }
    }
    return { status: 503, body: { error: 'Server not configured.' } }
  }
  if (event.notification_type === 'payment' && event.payment && event.payment.status === 'done') {
    await grantCoinsFromEvent(event)
  }
  return { status: 204, body: null }
}
