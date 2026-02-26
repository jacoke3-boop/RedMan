import { BrowserWindow } from 'electron'
import axios from 'axios'
import keytar from 'keytar'
import { v4 as uuid } from 'uuid'

const SERVICE_NAME = 'RedMan'
const ACCOUNT_NAME = 'reddit-token'
const REDIRECT_URI = 'http://localhost:7895/oauth/callback'

export class OAuthManager {
  constructor(clientId, clientSecret) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.oauthWindow = null
    this.authStateStore = new Map()
    this.authCallback = null
  }

  async startAuthFlow() {
    const state = uuid()
    this.authStateStore.set(state, true)

    const authUrl = new URL('https://www.reddit.com/api/v1/authorize')
    authUrl.searchParams.set('client_id', this.clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('scope', 'identity read vote submit privatemessages save subscribe')
    authUrl.searchParams.set('duration', 'permanent')

    this.oauthWindow = new BrowserWindow({
      width: 600,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        sandbox: true
      }
    })

    this.oauthWindow.webContents.on('will-navigate', (event, url) => {
      if (url.startsWith(REDIRECT_URI)) {
        this.handleCallback(url)
      }
    })

    this.oauthWindow.loadURL(authUrl.toString())

    return new Promise((resolve) => {
      this.authCallback = resolve
    })
  }

  async handleCallback(callbackUrl) {
    const url = new URL(callbackUrl)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error || !code || !this.authStateStore.has(state)) {
      this.oauthWindow?.close()
      this.oauthWindow = null
      this.authCallback?.({ success: false, error: error || 'Invalid state' })
      return
    }

    this.authStateStore.delete(state)

    try {
      const response = await axios.post('https://www.reddit.com/api/v1/access_token',
        { code, grant_type: 'authorization_code', redirect_uri: REDIRECT_URI },
        { auth: { username: this.clientId, password: this.clientSecret } }
      )

      const { access_token, refresh_token } = response.data

      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, JSON.stringify({
        accessToken: access_token,
        refreshToken: refresh_token,
        savedAt: Date.now()
      }))

      this.oauthWindow?.close()
      this.oauthWindow = null

      this.authCallback?.({ success: true, accessToken: access_token })
    } catch (error) {
      this.oauthWindow?.close()
      this.oauthWindow = null
      this.authCallback?.({ success: false, error: error.message })
    }
  }

  async getStoredToken() {
    try {
      const stored = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Keytar read error:', error)
      return null
    }
  }

  async deleteToken() {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME)
      return true
    } catch (error) {
      console.error('Keytar delete error:', error)
      return false
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post('https://www.reddit.com/api/v1/access_token',
        { grant_type: 'refresh_token', refresh_token: refreshToken },
        { auth: { username: this.clientId, password: this.clientSecret } }
      )

      const { access_token } = response.data
      const stored = await this.getStoredToken()

      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, JSON.stringify({
        ...stored,
        accessToken: access_token
      }))

      return access_token
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw error
    }
  }
}
