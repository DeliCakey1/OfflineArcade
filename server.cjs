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

const ABOUT_BLANK_HTML = `<!DOCTYPE html>
<html>
<head><title>Offline Arcade</title></head>
<body style="margin:0;background:#0a0a0f;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
<div>
<h1 style="font-size:14px;opacity:0.5;margin-bottom:20px">Offline Arcade</h1>
<button id="openBtn" style="padding:12px 24px;font-size:16px;cursor:pointer;border:1px solid #444;background:#1a1a2e;color:#fff;border-radius:8px">Open Arcade</button>
<p id="msg" style="font-size:11px;opacity:0.4;margin-top:12px;display:none"></p>
<script>
var siteHtml = null;
fetch('/').then(function(r){ return r.text() }).then(function(html){
  siteHtml = html.replace(/<head>/i, '<head><base href="' + location.origin + '/">');
});
document.getElementById('openBtn').onclick = function() {
  if (!siteHtml) { return; }
  var w = window.open('', '_blank');
  if (w) {
    w.document.open();
    w.document.write(siteHtml);
    w.document.close();
  } else {
    var msg = document.getElementById('msg');
    msg.style.display = 'block';
    msg.textContent = 'Popup blocked. Allow popups and click again.';
  }
};
</script>
</div>
</body>
</html>`

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url)
    const pathname = decodeURIComponent(parsed.pathname).replace(/\/+$/, '') || '/'

    if (pathname === '/god-commands/about-blank') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(ABOUT_BLANK_HTML)
      return
    }
    const filePath = path.join(DIST, pathname === '/' ? 'index.html' : pathname)

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveFile(res, filePath)
    } else {
      serveFile(res, path.join(DIST, 'index.html'))
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
