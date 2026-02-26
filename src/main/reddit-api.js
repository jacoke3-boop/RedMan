import axios from 'axios'

export class RedditAPI {
  constructor(oauthManager) {
    this.oauthManager = oauthManager
    this.rateLimitInfo = {
      remaining: 60,
      reset: Math.floor(Date.now() / 1000) + 60,
      used: 0
    }
    this.client = axios.create({
      baseURL: 'https://api.reddit.com',
      timeout: 10000,
      headers: {
        'User-Agent': 'RedMan/0.1.0'
      }
    })

    // Add token injection middleware
    this.client.interceptors.request.use(async (config) => {
      const token = await this.oauthManager.getStoredToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token.accessToken}`
      }
      return config
    })

    // Handle 401 → refresh token → retry, and track rate limits
    this.client.interceptors.response.use(
      response => {
        this.updateRateLimit(response)
        return response
      },
      async (error) => {
        if (error.response) {
          this.updateRateLimit(error.response)
        }
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          const token = await this.oauthManager.getStoredToken()
          if (token?.refreshToken) {
            try {
              await this.oauthManager.refreshToken(token.refreshToken)
              return this.client(originalRequest)
            } catch (refreshError) {
              return Promise.reject(new Error('Authentication required'))
            }
          }
        }
        return Promise.reject(error)
      }
    )
  }

  updateRateLimit(response) {
    const remaining = response.headers['x-ratelimit-remaining']
    const reset = response.headers['x-ratelimit-reset']
    const used = response.headers['x-ratelimit-used']

    if (remaining !== undefined || reset !== undefined) {
      this.rateLimitInfo = {
        remaining: parseInt(remaining || 60, 10),
        reset: parseInt(reset || Math.floor(Date.now() / 1000) + 60, 10),
        used: parseInt(used || 0, 10)
      }
    }
  }

  getRateLimitInfo() {
    return this.rateLimitInfo
  }

  async getMe() {
    try {
      const response = await this.client.get('/api/v1/me')
      return response.data
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async getFrontPage(options = {}) {
    try {
      const params = {
        sort: options.sort || 'hot',
        limit: options.limit || 25,
        ...options
      }
      const response = await this.client.get('/', { params })
      return this.parsePosts(response.data)
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async getSubreddit(subreddit, options = {}) {
    try {
      const params = {
        sort: options.sort || 'hot',
        t: options.timeFilter || 'all',
        limit: options.limit || 25,
        ...options
      }
      const response = await this.client.get(`/r/${subreddit}`, { params })
      return this.parsePosts(response.data)
    } catch (error) {
      if (error.response?.status === 404) {
        throw { message: `Subreddit r/${subreddit} not found`, code: 'NOT_FOUND' }
      }
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async getPost(postId, options = {}) {
    try {
      const response = await this.client.get(`/r/${postId.split('_')[1]}/comments/${postId}`)
      return response.data
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async upvote(postId) {
    try {
      await this.client.post('/api/vote', { id: postId, dir: 1 })
      return { success: true }
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async downvote(postId) {
    try {
      await this.client.post('/api/vote', { id: postId, dir: -1 })
      return { success: true }
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async removeVote(postId) {
    try {
      await this.client.post('/api/vote', { id: postId, dir: 0 })
      return { success: true }
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async save(postId) {
    try {
      await this.client.post('/api/save', { id: postId })
      return { success: true }
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async unsave(postId) {
    try {
      await this.client.post('/api/unsave', { id: postId })
      return { success: true }
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async submitReply(parentId, text) {
    try {
      const response = await this.client.post('/api/comment', {
        api_type: 'json',
        text,
        thing_id: parentId
      })
      if (response.data.json?.errors?.length) {
        throw new Error(response.data.json.errors[0][1])
      }
      return { success: true, commentId: response.data.json?.data?.things[0]?.data?.name }
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async getSubreddits(options = {}) {
    try {
      const params = {
        limit: options.limit || 50
      }
      const response = await this.client.get('/subreddits/mine/subscriber', { params })
      return response.data.data.children.map(child => ({
        name: child.data.display_name,
        id: child.data.name
      }))
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async subscribeSubreddit(name) {
    try {
      await this.client.post('/api/subscribe', { action: 'sub', sr_name: name })
      return { success: true }
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  async unsubscribeSubreddit(name) {
    try {
      await this.client.post('/api/subscribe', { action: 'unsub', sr_name: name })
      return { success: true }
    } catch (error) {
      throw { message: error.message, code: 'API_ERROR' }
    }
  }

  parsePosts(data) {
    if (!data?.data?.children) return []
    return data.data.children
      .filter(child => child.kind === 't3')
      .map(child => this.parsePost(child.data))
  }

  parsePost(data) {
    return {
      id: data.name,
      title: data.title,
      author: data.author,
      subreddit: data.subreddit,
      score: data.score,
      commentCount: data.num_comments,
      createdAt: data.created_utc * 1000,
      selftext: data.selftext,
      url: data.url,
      userVote: data.likes === true ? 1 : data.likes === false ? -1 : 0,
      saved: data.saved,
      isNsfw: data.over_18,
      isSpoiler: data.spoiler
    }
  }
}
