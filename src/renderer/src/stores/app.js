import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    authStatus: 'checking', // 'checking' | 'authenticated' | 'unauthenticated' | 'error'
    username: null,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => state.authStatus === 'authenticated'
  },

  actions: {
    setAuthStatus(status) {
      this.authStatus = status
    },

    setUsername(username) {
      this.username = username
    },

    setError(error) {
      this.error = error
    },

    async login() {
      this.authStatus = 'checking'
      try {
        const result = await window.electronAPI.login()
        if (result.success) {
          this.authStatus = 'authenticated'
          this.username = result.username
          this.error = null
        } else {
          this.authStatus = 'error'
          this.error = result.error
        }
      } catch (error) {
        this.authStatus = 'error'
        this.error = error.message
      }
    },

    async logout() {
      try {
        await window.electronAPI.logout()
        this.authStatus = 'unauthenticated'
        this.username = null
        this.error = null
      } catch (error) {
        this.error = error.message
      }
    },

    async checkStatus() {
      try {
        const result = await window.electronAPI.checkStatus()
        if (result.authenticated) {
          this.authStatus = 'authenticated'
          this.username = result.username
        } else {
          this.authStatus = 'unauthenticated'
          this.username = null
        }
        this.error = null
      } catch (error) {
        this.authStatus = 'error'
        this.error = error.message
      }
    }
  }
})
