import { createApp, computed, onMounted, ref } from 'vue'
import { createPinia } from 'pinia'
import { useAppStore } from './stores/app'
import { useColumnsStore } from './stores/columns'
import { usePersistence } from './composables/usePersistence'
import { useReddit } from './composables/useReddit'
import { useMarkdown } from './composables/useMarkdown'
import { useSettings } from './composables/useSettings'
import './assets/styles/base.css'

const PostCard = {
  props: ['post'],
  emits: ['click'],
  template: `
    <div class="post-card" @click="$emit('click')">
      <div class="post-header">
        <span class="post-subreddit">r/{{ post.subreddit }}</span>
        <span class="post-author">by {{ post.author }}</span>
        <span class="post-time">{{ relativeTime }}</span>
      </div>
      <h3 class="post-title">{{ post.title }}</h3>
      <div class="post-meta">
        <span class="post-score" :class="{ upvoted: post.userVote === 1, downvoted: post.userVote === -1 }">
          ⬆ {{ formatNumber(post.score) }}
        </span>
        <span class="post-comments">💬 {{ formatNumber(post.commentCount) }}</span>
        <span v-if="post.saved" class="post-saved">⭐</span>
      </div>
    </div>
  `,
  setup(props) {
    const relativeTime = computed(() => {
      const now = Date.now()
      const diff = now - props.post.createdAt
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`
      return 'old'
    })
    const formatNumber = (num) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }
    return { relativeTime, formatNumber }
  }
}

const ColumnView = {
  props: ['column', 'index'],
  emits: ['close', 'selectPost'],
  components: { PostCard },
  template: `
    <div class="column" draggable="true" @dragstart="handleDragStart" @dragend="handleDragEnd">
      <div class="column-header" :class="{ dragging: isDragging }">
        <h2 class="column-title">{{ column.title }}</h2>
        <div class="column-actions">
          <select v-model="selectedSort" @change="handleSortChange" class="sort-select" @dragstart.stop>
            <option value="hot">Hot</option>
            <option value="new">New</option>
            <option value="top">Top</option>
            <option value="rising">Rising</option>
          </select>
          <button @click="$emit('close')" class="btn-close">✕</button>
        </div>
      </div>
      <div class="column-content">
        <div v-if="loading" class="loading">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
        <div v-else-if="error" class="column-error-state">
          <div class="error-icon">⚠️</div>
          <p class="error-title">Failed to load posts</p>
          <p class="error-message">{{ error }}</p>
          <button @click="loadPosts" class="btn-retry">Try again</button>
        </div>
        <div v-else-if="posts.length === 0" class="column-empty-state">
          <div class="column-empty-icon">🚫</div>
          <p class="column-empty-text">No posts found</p>
        </div>
        <div v-else class="posts-list">
          <PostCard v-for="post in posts" :key="post.id" :post="post" @click="$emit('selectPost', post)" />
        </div>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const reddit = useReddit()
    const columnsStore = useColumnsStore()
    const posts = ref([])
    const loading = ref(false)
    const error = ref(null)
    const selectedSort = ref(props.column.sortBy || 'hot')
    const persistence = usePersistence()
    const isDragging = ref(false)

    const loadPosts = async () => {
      loading.value = true
      error.value = null
      try {
        let result
        if (props.column.type === 'subreddit') {
          result = await reddit.getSubreddit(props.column.subreddit, { sort: selectedSort.value })
        } else if (props.column.type === 'home') {
          result = await reddit.getFrontPage({ sort: selectedSort.value })
        } else {
          error.value = 'Column type not yet implemented'
          return
        }
        if (result.success) {
          posts.value = result.posts
        } else {
          error.value = result.error || 'Failed to load posts'
        }
      } catch (err) {
        error.value = err.message || 'Failed to load posts'
      } finally {
        loading.value = false
      }
    }

    const handleSortChange = async () => {
      columnsStore.updateSort(props.column.id, selectedSort.value)
      await persistence.saveColumns()
      loadPosts()
    }

    const handleDragStart = (e) => {
      isDragging.value = true
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('columnIndex', props.index.toString())
    }

    const handleDragEnd = () => {
      isDragging.value = false
    }

    onMounted(() => {
      loadPosts()
    })

    return { posts, loading, error, selectedSort, loadPosts, handleSortChange, isDragging, handleDragStart, handleDragEnd }
  }
}

const PostModal = {
  props: ['post', 'visible'],
  emits: ['close'],
  template: `
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title-section">
            <span class="modal-subreddit">r/{{ post.subreddit }}</span>
            <button class="modal-close" @click="$emit('close')">✕</button>
          </div>
        </div>
        <div class="modal-body">
          <h2 class="modal-post-title">{{ post.title }}</h2>
          <div class="modal-meta">
            <span>by {{ post.author }}</span>
            <span>{{ createdTime }}</span>
          </div>
          <div v-if="post.selftext" class="modal-selftext" v-html="renderedText"></div>
          <div v-else-if="post.url" class="modal-link">
            <a :href="post.url" target="_blank" class="external-link">{{ post.url }}</a>
          </div>
          <div class="modal-actions">
            <button @click="handleUpvote" class="action-btn upvote" :class="{ active: post.userVote === 1 }">⬆ {{ post.score }}</button>
            <button @click="handleDownvote" class="action-btn downvote" :class="{ active: post.userVote === -1 }">⬇</button>
            <button @click="handleSave" class="action-btn save" :class="{ active: post.saved }">⭐ Save</button>
          </div>
          <div class="modal-comments">
            <h3>Comments (coming soon in Step 8)</h3>
            <p class="text-muted">Reply functionality will be added next</p>
          </div>
          <div class="modal-footer">
            <span>{{ post.score }} upvotes • {{ post.commentCount }} comments</span>
          </div>
        </div>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const { renderMarkdown } = useMarkdown()
    const reddit = useReddit()

    const createdTime = computed(() => {
      const now = Date.now()
      const diff = now - props.post.createdAt
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`
      return 'old'
    })
    const renderedText = computed(() => {
      return renderMarkdown(props.post.selftext)
    })

    const handleUpvote = async () => {
      const oldVote = props.post.userVote
      const oldScore = props.post.score

      // Optimistic update
      if (oldVote === 1) {
        props.post.userVote = 0
        props.post.score = oldScore - 1
      } else {
        props.post.userVote = 1
        props.post.score = oldScore + (oldVote === -1 ? 2 : 1)
      }

      try {
        if (oldVote === 1) {
          await reddit.removeVote(props.post.id)
        } else {
          await reddit.upvote(props.post.id)
        }
      } catch (err) {
        // Rollback on error
        props.post.userVote = oldVote
        props.post.score = oldScore
      }
    }

    const handleDownvote = async () => {
      const oldVote = props.post.userVote
      const oldScore = props.post.score

      // Optimistic update
      if (oldVote === -1) {
        props.post.userVote = 0
        props.post.score = oldScore + 1
      } else {
        props.post.userVote = -1
        props.post.score = oldScore - (oldVote === 1 ? 2 : 1)
      }

      try {
        if (oldVote === -1) {
          await reddit.removeVote(props.post.id)
        } else {
          await reddit.downvote(props.post.id)
        }
      } catch (err) {
        // Rollback on error
        props.post.userVote = oldVote
        props.post.score = oldScore
      }
    }

    const handleSave = async () => {
      const oldSaved = props.post.saved
      props.post.saved = !oldSaved

      try {
        if (oldSaved) {
          await reddit.unsave(props.post.id)
        } else {
          await reddit.save(props.post.id)
        }
      } catch (err) {
        props.post.saved = oldSaved
      }
    }

    return { createdTime, renderedText, handleUpvote, handleDownvote, handleSave }
  }
}

const SettingsPanel = {
  props: ['visible'],
  emits: ['close'],
  template: `
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')">
      <div class="settings-modal">
        <div class="modal-header">
          <h2 class="modal-title">Settings</h2>
          <button class="modal-close" @click="$emit('close')">✕</button>
        </div>
        <div class="modal-body">
          <div class="settings-section">
            <label class="settings-label">
              <input v-model="settings.notificationsEnabled" type="checkbox" class="settings-checkbox" />
              <span>Enable notifications</span>
            </label>
            <p class="settings-hint">Get notified about new posts in your subscribed subreddits</p>
          </div>
          <div class="settings-section" v-if="settings.notificationsEnabled">
            <label class="settings-label">Notification interval (seconds)</label>
            <input v-model.number="settings.notificationInterval" type="number" min="60" class="settings-input" />
            <p class="settings-hint">Check for new posts every N seconds (minimum 60)</p>
          </div>
          <div class="settings-actions">
            <button @click="saveSettings" class="btn-save">Save</button>
            <button @click="$emit('close')" class="btn-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const settingsApi = useSettings()
    const settings = ref({
      notificationsEnabled: true,
      notificationInterval: 300
    })

    onMounted(async () => {
      const result = await settingsApi.loadSettings()
      if (result.success) {
        settings.value = result.settings
      }
    })

    const saveSettings = async () => {
      await settingsApi.saveSettings(settings.value)
      emit('close')
    }

    return { settings, saveSettings }
  }
}

const App = {
  components: { ColumnView, PostModal, SettingsPanel },
  template: `
    <div class="app">
      <PostModal v-if="selectedPost" :post="selectedPost" :visible="!!selectedPost" @close="selectedPost = null" />
      <SettingsPanel :visible="showSettings" @close="showSettings = false" />
      <header class="top-bar">
        <div class="logo-placeholder">RedMan</div>
        <div class="top-bar-spacer"></div>
        <div class="auth-section">
          <button v-if="appStore.isAuthenticated" @click="showSettings = true" class="btn-settings" title="Settings">⚙</button>
          <span v-if="appStore.isAuthenticated" class="username">{{ appStore.username }}</span>
          <button v-if="!appStore.isAuthenticated" @click="handleLogin" class="btn-login" :disabled="appStore.authStatus === 'checking'">
            {{ appStore.authStatus === 'checking' ? 'Loading...' : 'Log In' }}
          </button>
          <button v-else @click="handleLogout" class="btn-logout">Log Out</button>
        </div>
      </header>
      <main class="column-area">
        <div v-if="appStore.authStatus === 'checking'" class="empty-state empty-state-loading">
          <div class="loading-spinner"></div>
          <p>Verifying authentication...</p>
        </div>
        <div v-else-if="!appStore.isAuthenticated" class="empty-state empty-state-auth">
          <div class="auth-icon">🔐</div>
          <p class="empty-title">Sign in to continue</p>
          <p class="empty-hint">Use your Reddit account to access RedMan</p>
          <button @click="handleLogin" class="btn-add-column">Sign In with Reddit</button>
        </div>
        <div v-else-if="columnsStore.columns.length === 0" class="empty-state empty-state-empty">
          <div class="empty-icon">📋</div>
          <p class="empty-title">No columns yet</p>
          <p class="empty-hint">Add your first column to see posts from Reddit</p>
          <button @click="addDefaultColumn" class="btn-add-column">+ Add Home Feed</button>
          <p class="empty-hint empty-hint-secondary">Tip: You can add multiple columns for different subreddits</p>
        </div>
        <div v-else class="columns-container" @dragover="handleDragOver" @drop="handleDrop">
          <ColumnView v-for="(column, index) in columnsStore.columns" :key="column.id" :column="column" :index="index" @close="handleCloseColumn(column.id)" @selectPost="handleSelectPost" />
        </div>
      </main>
      <footer class="status-bar">
        <div class="status-text">{{ statusText }}</div>
      </footer>
    </div>
  `,
  setup() {
    const appStore = useAppStore()
    const columnsStore = useColumnsStore()
    const persistence = usePersistence()
    const selectedPost = ref(null)
    const draggedColumnIndex = ref(null)
    const showSettings = ref(false)
    const rateLimitInfo = ref(null)

    const updateRateLimitInfo = async () => {
      if (appStore.isAuthenticated) {
        const result = await window.electronAPI.getRateLimitInfo()
        if (result?.success) {
          rateLimitInfo.value = result.rateLimitInfo
        }
      }
    }

    onMounted(async () => {
      await persistence.loadColumns()
      await updateRateLimitInfo()
      // Poll rate limit info every 10 seconds
      setInterval(updateRateLimitInfo, 10000)
    })

    const statusText = computed(() => {
      if (appStore.authStatus === 'checking') return 'Checking authentication...'
      if (appStore.error) return `Error: ${appStore.error}`
      if (appStore.isAuthenticated) {
        if (rateLimitInfo.value) {
          const remaining = rateLimitInfo.value.remaining
          const resetTime = new Date(rateLimitInfo.value.reset * 1000)
          const now = new Date()
          const minutesLeft = Math.ceil((resetTime - now) / 60000)
          return `API: ${remaining} requests remaining (reset in ${Math.max(0, minutesLeft)}m)`
        }
        return 'Ready'
      }
      return 'Not authenticated'
    })

    const emptyStateMessage = computed(() => {
      if (appStore.authStatus === 'checking') return 'Checking authentication...'
      if (appStore.error) return `Error: ${appStore.error}`
      return 'Please log in to continue'
    })

    const handleDragOver = (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = async (e) => {
      e.preventDefault()
      const toIndex = parseInt(e.dataTransfer.getData('columnIndex'), 10)
      if (draggedColumnIndex.value !== null && draggedColumnIndex.value !== toIndex) {
        columnsStore.reorderColumns(draggedColumnIndex.value, toIndex)
        await persistence.saveColumns()
      }
      draggedColumnIndex.value = null
    }

    return {
      appStore,
      columnsStore,
      persistence,
      selectedPost,
      draggedColumnIndex,
      showSettings,
      rateLimitInfo,
      statusText,
      emptyStateMessage,
      handleDragOver,
      handleDrop,
      async handleLogin() {
        await appStore.login()
      },
      async handleLogout() {
        await appStore.logout()
        columnsStore.clearColumns()
        await persistence.saveColumns()
      },
      async addDefaultColumn() {
        columnsStore.addColumn('home')
        await persistence.saveColumns()
      },
      async handleCloseColumn(columnId) {
        columnsStore.removeColumn(columnId)
        await persistence.saveColumns()
      },
      handleSelectPost(post) {
        selectedPost.value = post
      }
    }
  }
}

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)

const appStore = useAppStore()
appStore.checkStatus()

window.electronAPI.onAuthChange((authData) => {
  if (authData.authenticated) {
    appStore.setAuthStatus('authenticated')
    appStore.setUsername(authData.username)
  } else {
    appStore.setAuthStatus('unauthenticated')
    appStore.setUsername(null)
  }
})

app.mount('#app')
