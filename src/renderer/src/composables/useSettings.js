export function useSettings() {
  const loadSettings = async () => {
    return window.electronAPI.loadSettings()
  }

  const saveSettings = async (settings) => {
    return window.electronAPI.saveSettings(settings)
  }

  return {
    loadSettings,
    saveSettings
  }
}
