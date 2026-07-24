const CACHE_NAME = 'arcade-v2'
const PRECACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/Alpine-Amnesia.png',
  '/manifest.json',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)

  if (url.origin !== self.location.origin) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        }
        return res
      }).catch(() => caches.match(e.request))
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          }
          return res
        })
      })
    )
    return
  }

  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
      }
      return res
    }).catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
  )
})
