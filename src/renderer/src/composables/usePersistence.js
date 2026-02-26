import { useColumnsStore } from '../stores/columns'

export function usePersistence() {
  const columnsStore = useColumnsStore()

  return {
    async loadColumns() {
      try {
        const result = await window.electronAPI.loadColumns()
        if (result.success) {
          columnsStore.columns = result.columns || []
        }
      } catch (error) {
        console.error('Failed to load columns:', error)
      }
    },

    async saveColumns() {
      try {
        await window.electronAPI.saveColumns(columnsStore.columns)
      } catch (error) {
        console.error('Failed to save columns:', error)
      }
    }
  }
}
