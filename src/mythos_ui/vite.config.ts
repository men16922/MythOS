import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Production API the Android app talks to when `VITE_API_BASE` is not set (app build only). */
const DEFAULT_APP_API_BASE = 'https://mythos-api-k62nky5rrq-uc.a.run.app'

/**
 * App build (`vite build --mode app`, scripts/android/build-web.sh): the Mythos 2.0 client bundled into the
 * Android APK by Capacitor. It boots from its own entry (src/v2/native/main.tsx: 2.0 + native hooks, no 1.x
 * router), uses a relative base, and talks to `VITE_API_BASE` instead of same-origin `/api`. Game art and
 * music are copied next to it (dist-app/resources/neo-seoul/) by the build script, not served by the API.
 */
function appEntry(): Plugin {
  return {
    name: 'mythos-app-entry',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const web = '/src/main.tsx'
        if (!html.includes(web)) throw new Error(`[mythos-app-entry] index.html no longer loads ${web}; update vite.config.ts`)
        return html.replace(web, '/src/v2/native/main.tsx')
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'app') {
    // Vite reads VITE_* from process.env after this function runs, so these defaults reach `import.meta.env`.
    process.env.VITE_API_BASE ||= DEFAULT_APP_API_BASE
    process.env.VITE_ASSET_BASE ||= './resources/neo-seoul/'
    return {
      plugins: [react(), appEntry()],
      base: './',
      build: {
        outDir: 'dist-app',
        emptyOutDir: true,
        // Keep the game art as files (the APK serves them locally); only tiny icons get inlined.
        assetsInlineLimit: 4096,
      },
    }
  }
  return {
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
        },
      },
    },
  }
})
