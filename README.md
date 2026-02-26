# RedMan - Personal Reddit Desktop Client

A TweetDeck-style native macOS desktop client for managing Reddit feeds in a multi-column layout.

## Overview

RedMan is a personal productivity tool that helps me efficiently consume and interact with Reddit content by organizing multiple feeds side-by-side, similar to how TweetDeck organizes Twitter feeds.

## Features

- **Multi-column layout**: View home feed and multiple subreddits simultaneously
- **Drag-to-reorder**: Reorganize columns with drag-and-drop
- **Post interactions**: Upvote, downvote, and save posts
- **Flexible sorting**: Hot, New, Top, Rising sort options per column
- **Persistent state**: Saves column configuration between sessions
- **Desktop notifications**: Optional notifications for new content
- **Rate limit tracking**: Real-time API quota display

## Technology Stack

- **Framework**: Electron (native macOS desktop app)
- **UI**: Vue 3 + Vite
- **API Client**: axios (direct REST calls to Reddit API)
- **Authentication**: OAuth 2.0 with macOS Keychain token storage
- **State Management**: Pinia
- **Persistence**: electron-store (for column config, settings)
- **Security**:
  - Content Security Policy (CSP) headers
  - contextIsolation enabled
  - Sandbox mode enabled
  - No credentials stored in app data (Keychain only)

## API Usage

### Read-Only Operations
- `GET /best` - Home feed
- `GET /r/{subreddit}/hot|new|top|rising` - Subreddit posts
- `GET /api/v1/me` - User info

### Interactive Operations
- `POST /api/v1/me/vote` - Upvote/downvote posts
- `POST /api/v1/me/saved` - Save posts
- `DELETE /api/v1/me/saved` - Unsave posts

### Expected Usage Volume
- **Requests per session**: 10-20 API calls (5-10 minutes of active use)
- **Typical daily usage**: 30-60 minutes
- **Monthly estimate**: ~50,000 requests
- **Rate limit impact**: Minimal (well below Reddit's standard limits)

## Architecture

```
Main Process (Node.js)
  ├── OAuth flow (Reddit authorization)
  ├── Reddit API client (axios requests)
  ├── Token management (macOS Keychain)
  └── IPC handlers (renderer communication)

Renderer Process (Vue 3)
  ├── UI components (columns, posts, modals)
  ├── State management (Pinia)
  └── IPC dispatches (to main process)
```

All API calls happen in the main process only. The renderer never touches credentials or makes direct API calls.

## Security Notes

- **nodeIntegration**: false
- **contextIsolation**: true
- **sandbox**: true
- **webSecurity**: true
- **CSP Headers**: Enabled in production
- **Token Storage**: macOS Keychain (never in app files)
- **Credentials**: Never logged or exposed

## Setup

1. Clone the repository
2. Create `.env.local`:
   ```
   REDDIT_CLIENT_ID=your_client_id
   REDDIT_CLIENT_SECRET=your_client_secret
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   ```

## File Structure

```
redman/
├── src/
│   ├── main/
│   │   ├── index.js           # Electron main process, window creation
│   │   ├── oauth.js           # OAuth 2.0 flow with state validation
│   │   ├── reddit-api.js      # Reddit API client with token refresh
│   │   └── ipc.js             # IPC handler registry (22 handlers)
│   ├── preload/
│   │   └── index.js           # contextBridge API (no generic passthrough)
│   └── renderer/
│       ├── index.html         # HTML entry point
│       ├── src/
│       │   ├── main.js        # Vue app + inline components
│       │   ├── stores/        # Pinia stores (auth, columns)
│       │   ├── composables/   # Vue composables (useReddit, usePersistence, etc)
│       │   └── assets/        # CSS, fonts, design tokens
├── .env.example               # Template for credentials
├── .gitignore                 # Ignore node_modules, .env.local, etc
├── package.json               # Dependencies
└── electron-vite.config.js    # Build configuration
```

## Development Notes

- This is a personal-use application built for my own content consumption
- All interactions are initiated by the user (no automated posting/commenting)
- Read-only operations are primary; voting/saving are secondary interactions
- No public-facing bot functionality; purely a client for personal use

## License

Personal use only.
