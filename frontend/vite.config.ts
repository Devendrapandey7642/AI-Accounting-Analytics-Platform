import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('/react/')) {
            return 'react-vendor'
          }
          if (id.includes('recharts')) {
            return 'charts-vendor'
          }
          if (id.includes('framer-motion')) {
            return 'motion-vendor'
          }
          if (id.includes('lucide-react')) {
            return 'icons-vendor'
          }
          if (id.includes('axios')) {
            return 'network-vendor'
          }

          return undefined
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
