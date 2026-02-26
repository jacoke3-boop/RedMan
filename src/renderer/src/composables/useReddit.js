/**
 * Composable for Reddit API calls via IPC
 */

export function useReddit() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available')
  }

  return {
    // Posts
    getFrontPage: (options) => window.electronAPI.getFrontPage?.(options) || Promise.reject('Not implemented'),
    getSubreddit: (subreddit, options) => window.electronAPI.getSubreddit?.(subreddit, options) || Promise.reject('Not implemented'),
    getPost: (postId) => window.electronAPI.getPost?.(postId) || Promise.reject('Not implemented'),

    // Votes
    upvote: (postId) => window.electronAPI.upvote?.(postId) || Promise.reject('Not implemented'),
    downvote: (postId) => window.electronAPI.downvote?.(postId) || Promise.reject('Not implemented'),
    removeVote: (postId) => window.electronAPI.removeVote?.(postId) || Promise.reject('Not implemented'),

    // Save
    save: (postId) => window.electronAPI.save?.(postId) || Promise.reject('Not implemented'),
    unsave: (postId) => window.electronAPI.unsave?.(postId) || Promise.reject('Not implemented'),

    // Comments
    submitReply: (parentId, text) => window.electronAPI.submitReply?.(parentId, text) || Promise.reject('Not implemented'),

    // Subreddits
    getSubreddits: () => window.electronAPI.getSubreddits?.() || Promise.reject('Not implemented'),
    subscribeSubreddit: (name) => window.electronAPI.subscribeSubreddit?.(name) || Promise.reject('Not implemented'),
    unsubscribeSubreddit: (name) => window.electronAPI.unsubscribeSubreddit?.(name) || Promise.reject('Not implemented')
  }
}
