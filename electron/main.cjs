const { app, BrowserWindow, protocol } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')

const DIST = path.join(__dirname, '..', 'dist')

const MIME = {
  '.html': 'text/html',
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

let mainWindow
let server
let PORT = 18234

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    title: 'Offline Arcade',
    icon: path.join(DIST, 'favicon.svg'),
    backgroundColor: '#1a1033',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false,
  })

  mainWindow.loadURL(`http://localhost:${PORT}/index.html`)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  autoUpdater.checkForUpdatesAndNotify()
}

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let url = req.url.split('?')[0]
      if (url === '/') url = '/index.html'

      const filePath = path.join(DIST, url)

      if (!filePath.startsWith(DIST)) {
        res.writeHead(403)
        res.end()
        return
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(DIST, 'index.html'), (e2, html) => {
            if (e2) { res.writeHead(404); res.end(); return }
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(html)
          })
          return
        }
        const ext = path.extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
        res.end(data)
      })
    })

    server.listen(PORT, '127.0.0.1', () => resolve())
  })
}

autoUpdater.on('update-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available')
  }
})

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded')
  }
})

app.whenReady().then(async () => {
  await startServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (server) server.close()
  if (process.platform !== 'darwin') app.quit()
})
