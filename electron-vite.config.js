import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import vue from '@vitejs/plugin-vue'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {},
  renderer: {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    },
    optimizeDeps: {
      exclude: ['vue']
    }
  }
})
