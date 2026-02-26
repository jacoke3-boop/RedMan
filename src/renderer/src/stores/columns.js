import { defineStore } from 'pinia'

const MAX_COLUMNS = 6

export const useColumnsStore = defineStore('columns', {
  state: () => ({
    columns: [] // Array of { id, type, subreddit?, sortBy, title }
  }),

  getters: {
    canAddColumn: (state) => state.columns.length < MAX_COLUMNS,
    maxColumnsReached: (state) => state.columns.length >= MAX_COLUMNS
  },

  actions: {
    /**
     * Add a new column
     * @param {string} type - 'home' | 'subreddit' | 'search' | 'saved' | 'profile'
     * @param {object} options - type-specific options (subreddit, query, etc.)
     */
    addColumn(type, options = {}) {
      if (!this.canAddColumn) return null

      const id = `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const sortBy = options.sortBy || 'hot'

      let column = {
        id,
        type,
        sortBy,
        title: this.getColumnTitle(type, options)
      }

      // Add type-specific fields
      if (type === 'subreddit') {
        column.subreddit = options.subreddit || 'programming'
        column.title = `r/${column.subreddit}`
      } else if (type === 'search') {
        column.query = options.query || ''
        column.title = `Search: ${column.query}`
      } else if (type === 'home') {
        column.title = 'Home'
      } else if (type === 'saved') {
        column.title = 'Saved'
      } else if (type === 'profile') {
        column.title = 'Profile'
      }

      this.columns.push(column)
      return column
    },

    /**
     * Remove a column by ID
     */
    removeColumn(columnId) {
      const index = this.columns.findIndex(c => c.id === columnId)
      if (index !== -1) {
        this.columns.splice(index, 1)
      }
    },

    /**
     * Reorder columns
     */
    reorderColumns(fromIndex, toIndex) {
      if (fromIndex < 0 || fromIndex >= this.columns.length) return
      if (toIndex < 0 || toIndex >= this.columns.length) return

      const [column] = this.columns.splice(fromIndex, 1)
      this.columns.splice(toIndex, 0, column)
    },

    /**
     * Update column sort
     */
    updateSort(columnId, sortBy, timeFilter = null) {
      const column = this.columns.find(c => c.id === columnId)
      if (column) {
        column.sortBy = sortBy
        if (timeFilter) {
          column.timeFilter = timeFilter
        }
      }
    },

    /**
     * Clear all columns
     */
    clearColumns() {
      this.columns = []
    },

    /**
     * Get human-readable title for column type
     */
    getColumnTitle(type, options = {}) {
      const titles = {
        home: 'Home',
        subreddit: `r/${options.subreddit || 'programming'}`,
        search: `Search: ${options.query || ''}`,
        saved: 'Saved',
        profile: 'Profile'
      }
      return titles[type] || 'Column'
    },

    /**
     * Load columns from electron-store
     */
    loadFromStore(data) {
      if (data && Array.isArray(data.columns)) {
        this.columns = data.columns
      }
    },

    /**
     * Get state for persistence
     */
    getStateForStore() {
      return {
        columns: this.columns
      }
    }
  }
})
