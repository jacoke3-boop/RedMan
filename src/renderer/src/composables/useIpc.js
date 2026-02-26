/**
 * Composable wrapping window.electronAPI calls.
 * Provides a reactive interface to IPC methods exposed by preload.
 */

export function useIpc() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available — preload script did not load')
  }

  return {
    ping: () => window.electronAPI.ping()
    // Add new IPC methods here in subsequent steps
  }
}
