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
  '/admin-panel',
  '/god-commands',
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

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveFile(res, filePath)
    } else if (VALID_ROUTES.includes(pathname)) {
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
