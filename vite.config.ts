import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // 允許透過 IP 訪問
    port: 5173,
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/_variables.scss" as *;`
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // 手動分割代碼塊，提升快取效率
        manualChunks: {
          // Firebase 相關（通常是最大的依賴）
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore'
          ],
          // React 核心庫
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // 狀態管理
          'vendor-state': ['zustand'],
          // UI 組件庫
          'vendor-ui': ['lucide-react', 'qrcode.react']
        }
      }
    },
    // 提高 chunk 大小警告的閾值（Firebase 本身就很大）
    chunkSizeWarningLimit: 1000,
    // 啟用壓縮（使用 esbuild，比 terser 更快）
    minify: 'esbuild'
  }
})
