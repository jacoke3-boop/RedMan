<template>
  <div class="app">
    <!-- Top bar: 48px, bg-0, drag region -->
    <header class="top-bar">
      <div class="logo-placeholder">RedMan</div>
    </header>

    <!-- Column area: flex fill, bg-1, contains columns -->
    <main class="column-area">
      <!-- Columns will be rendered here in Step 4+ -->
    </main>

    <!-- Status bar: 28px, bg-0 -->
    <footer class="status-bar">
      <div class="status-text">Ready</div>
    </footer>
  </div>
</template>

<script setup>
import { useAppStore } from './stores/app'
import { useColumnsStore } from './stores/columns'

const appStore = useAppStore()
const columnsStore = useColumnsStore()
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: var(--bg-0);
  color: var(--text-1);
}

.top-bar {
  height: 48px;
  background: var(--bg-0);
  border-bottom: 1px solid var(--bg-4);
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding: 0 var(--sp-4);
}

.logo-placeholder {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-0);
  -webkit-app-region: no-drag;
}

.column-area {
  flex: 1;
  overflow: hidden;
  background: var(--bg-1);
}

.status-bar {
  height: 28px;
  background: var(--bg-0);
  border-top: 1px solid var(--bg-4);
  display: flex;
  align-items: center;
  padding: 0 var(--sp-4);
}

.status-text {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-2);
}
</style>
