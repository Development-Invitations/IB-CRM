import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Рекомендованные Tauri настройки: fixed port, без очистки консоли,
// таргет под встроенный WebView, а не под старые браузеры.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  base: './',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    watch: {
      ignored: ['**/docs/**', '**/*.md', '**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
