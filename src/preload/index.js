import { contextBridge, ipcRenderer } from 'electron'

/**
 * Expose a named, specific API surface via contextBridge.
 * Channel strings are hidden inside preload — renderer never knows channel names.
 * This defeats attempts to discover and call hidden IPC channels.
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // System
  ping: () => ipcRenderer.invoke('app:ping'),

  // Auth
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  checkStatus: () => ipcRenderer.invoke('auth:checkStatus'),

  // Auth events from main process
  onAuthChange: (callback) => {
    const unsubscribe = () => ipcRenderer.removeAllListeners('auth:changed')
    ipcRenderer.on('auth:changed', (event, authData) => callback(authData))
    return unsubscribe
  },

  // Reddit API
  getFrontPage: (options) => ipcRenderer.invoke('reddit:getFrontPage', options),
  getSubreddit: (subreddit, options) => ipcRenderer.invoke('reddit:getSubreddit', subreddit, options),
  getPost: (postId) => ipcRenderer.invoke('reddit:getPost', postId),
  upvote: (postId) => ipcRenderer.invoke('reddit:upvote', postId),
  downvote: (postId) => ipcRenderer.invoke('reddit:downvote', postId),
  removeVote: (postId) => ipcRenderer.invoke('reddit:removeVote', postId),
  save: (postId) => ipcRenderer.invoke('reddit:save', postId),
  unsave: (postId) => ipcRenderer.invoke('reddit:unsave', postId),
  submitReply: (parentId, text) => ipcRenderer.invoke('reddit:submitReply', parentId, text),
  getSubreddits: () => ipcRenderer.invoke('reddit:getSubreddits'),
  subscribeSubreddit: (name) => ipcRenderer.invoke('reddit:subscribeSubreddit', name),
  unsubscribeSubreddit: (name) => ipcRenderer.invoke('reddit:unsubscribeSubreddit', name),

  // Store (persistence)
  saveColumns: (columns) => ipcRenderer.invoke('store:saveColumns', columns),
  loadColumns: () => ipcRenderer.invoke('store:loadColumns'),

  // Settings
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  loadSettings: () => ipcRenderer.invoke('settings:load'),

  // Notifications
  showNotification: (options) => ipcRenderer.invoke('notifications:show', options),

  // API
  getRateLimitInfo: () => ipcRenderer.invoke('api:getRateLimitInfo')
})
