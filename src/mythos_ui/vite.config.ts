import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dev server (`npx vite`) proxies the API and art to a locally running `make api` (port 8010 overnight).
  server: {
    proxy: {
      '/api': { target: process.env.MYTHOS_DEV_API ?? 'http://127.0.0.1:8010', changeOrigin: true, ws: true },
      '/resources': { target: process.env.MYTHOS_DEV_API ?? 'http://127.0.0.1:8010', changeOrigin: true },
    },
  },
  build: {
    outDir: '../mythos_api/static',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        assetFileNames: 'assets/[name].[ext]',
        chunkFileNames: 'assets/[name].js',
      }
    }
  }
})
