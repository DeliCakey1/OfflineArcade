const { app, BrowserWindow, protocol } = require('electron')
const path = require('path')
const fs = require('fs')

const DIST = path.join(__dirname, '..', 'dist')

let mainWindow

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

  mainWindow.loadFile(path.join(DIST, 'index.html'))

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('atom', (request, callback) => {
    const filePath = path.join(DIST, request.url.slice('atom://'.length))
    callback({ path: filePath })
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
