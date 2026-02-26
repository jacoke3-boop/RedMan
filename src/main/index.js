import { app, BrowserWindow, shell, session } from 'electron'
import { join } from 'path'
import 'dotenv/config'
import Store from 'electron-store'
import { registerIpcHandlers } from './ipc.js'
import { OAuthManager } from './oauth.js'
import { RedditAPI } from './reddit-api.js'

const isDev = !app.isPackaged
let mainWindow
let oauthManager
let redditAPI
const store = new Store({
  defaults: {
    columns: [],
    windowState: { width: 1200, height: 800 },
    settings: {
      notificationsEnabled: true,
      notificationInterval: 300 // 5 minutes in seconds
    }
  }
})

function createWindow() {
  const preloadPath = join(__dirname, '../preload/index.js')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
      webSecurity: true
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#111113'
  })

  // Load dev server or packaged app
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Navigation lockdown: prevent any navigation away from app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devServerUrl = process.env.ELECTRON_RENDERER_URL
    const isLocalFile = url.startsWith('file://')
    const isDevServer = devServerUrl && url.startsWith(devServerUrl)
    if (!isLocalFile && !isDevServer) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
}

// CSP and security headers injection (production only)
function injectCsp() {
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "font-src 'self'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' https://oauth.reddit.com https://www.reddit.com https://reddit.com; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'"
          ],
          'X-Frame-Options': ['DENY'],
          'X-Content-Type-Options': ['nosniff'],
          'X-XSS-Protection': ['1; mode=block'],
          'Referrer-Policy': ['strict-origin-when-cross-origin']
        }
      })
    })
  }
}

// App lifecycle handlers
app.on('ready', () => {
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET in .env.local')
    console.error('See .env.example for setup instructions')
  }

  oauthManager = new OAuthManager(clientId, clientSecret)
  redditAPI = new RedditAPI(oauthManager)

  injectCsp()
  registerIpcHandlers(oauthManager, redditAPI, store)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
