import { ipcMain } from 'electron'

/**
 * Validate sender origin — only allow local/dev-server frames
 */
function isValidSender(url) {
  return url.startsWith('file://') || url.startsWith('http://localhost')
}

/**
 * Register all IPC handlers.
 *
 * Pattern for all handlers:
 * 1. Validate sender origin (reject if not local/dev-server)
 * 2. Validate params shape
 * 3. Execute operation
 * 4. Return result
 */

export function registerIpcHandlers(oauthManager, redditAPI, store) {
  // Stub handler — proves the IPC pipeline works
  ipcMain.handle('app:ping', async (event) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null
    return 'pong'
  })

  // OAuth: start authorization flow
  ipcMain.handle('auth:login', async (event) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const result = await oauthManager.startAuthFlow()
      if (result.success) {
        const me = await redditAPI.getMe()
        return { success: true, username: me.name }
      }
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // OAuth: logout
  ipcMain.handle('auth:logout', async (event) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    await oauthManager.deleteToken()
    return { success: true }
  })

  // OAuth: check authentication status
  ipcMain.handle('auth:checkStatus', async (event) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    const token = await oauthManager.getStoredToken()
    if (!token) return { authenticated: false }

    try {
      const me = await redditAPI.getMe()
      return { authenticated: true, username: me.name }
    } catch (error) {
      return { authenticated: false }
    }
  })

  // Reddit API: get front page
  ipcMain.handle('reddit:getFrontPage', async (event, options = {}) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const posts = await redditAPI.getFrontPage(options)
      return { success: true, posts }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: get subreddit
  ipcMain.handle('reddit:getSubreddit', async (event, subreddit, options = {}) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const posts = await redditAPI.getSubreddit(subreddit, options)
      return { success: true, posts }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: get post with comments
  ipcMain.handle('reddit:getPost', async (event, postId) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const data = await redditAPI.getPost(postId)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: upvote
  ipcMain.handle('reddit:upvote', async (event, postId) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      await redditAPI.upvote(postId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: downvote
  ipcMain.handle('reddit:downvote', async (event, postId) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      await redditAPI.downvote(postId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: remove vote
  ipcMain.handle('reddit:removeVote', async (event, postId) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      await redditAPI.removeVote(postId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: save
  ipcMain.handle('reddit:save', async (event, postId) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      await redditAPI.save(postId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: unsave
  ipcMain.handle('reddit:unsave', async (event, postId) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      await redditAPI.unsave(postId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: submit reply
  ipcMain.handle('reddit:submitReply', async (event, parentId, text) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const result = await redditAPI.submitReply(parentId, text)
      return { success: true, ...result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: get user's subreddits
  ipcMain.handle('reddit:getSubreddits', async (event) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const subreddits = await redditAPI.getSubreddits()
      return { success: true, subreddits }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: subscribe
  ipcMain.handle('reddit:subscribeSubreddit', async (event, name) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      await redditAPI.subscribeSubreddit(name)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Reddit API: unsubscribe
  ipcMain.handle('reddit:unsubscribeSubreddit', async (event, name) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      await redditAPI.unsubscribeSubreddit(name)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Persistence: save columns
  ipcMain.handle('store:saveColumns', async (event, columns) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      store.set('columns', columns)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Persistence: load columns
  ipcMain.handle('store:loadColumns', async (event) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const columns = store.get('columns', [])
      return { success: true, columns }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Settings: save settings
  ipcMain.handle('settings:save', async (event, settings) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      store.set('settings', settings)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Settings: load settings
  ipcMain.handle('settings:load', async (event) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const settings = store.get('settings', {
        notificationsEnabled: true,
        notificationInterval: 300
      })
      return { success: true, settings }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Notifications: trigger desktop notification
  ipcMain.handle('notifications:show', async (event, options) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const { Notification } = require('electron')
      const notification = new Notification({
        title: options.title || 'RedMan',
        body: options.body || '',
        icon: undefined // macOS uses app icon automatically
      })
      notification.show()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // API: get rate limit info
  ipcMain.handle('api:getRateLimitInfo', async (event) => {
    const senderUrl = event.senderFrame?.url ?? ''
    if (!isValidSender(senderUrl)) return null

    try {
      const rateLimitInfo = redditAPI.getRateLimitInfo()
      return { success: true, rateLimitInfo }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
