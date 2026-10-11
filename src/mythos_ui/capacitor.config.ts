// Capacitor (Android only) — packages the Mythos 2.0 app build (`vite build --mode app` → dist-app/) into an APK.
// Build steps: scripts/android/*.sh, docs/android.md. The appId is permanent once uploaded to Google Play.
import type { CapacitorConfig } from '@capacitor/cli'

// Debug builds aimed at a plain-http local API (e.g. VITE_API_BASE=http://10.0.2.2:8010 from the emulator)
// need mixed content: the app page itself is https://localhost. Never set for a release build.
const apiBase = process.env.VITE_API_BASE ?? ''
const allowMixedContent = apiBase.startsWith('http://')

const config: CapacitorConfig = {
  appId: 'com.projectmythos.signalrun',
  appName: 'MythOS',
  webDir: 'dist-app',
  // The game's near-black: no white flash before the first paint.
  backgroundColor: '#030307',
  android: {
    allowMixedContent,
  },
  plugins: {
    // Immersive play: MainActivity.java hides the bars (swipe to peek); this keeps Capacitor's SystemBars from
    // re-showing them on load. Dark style = light icons whenever they are peeked.
    SystemBars: { hidden: true, style: 'DARK' },
  },
  server: {
    // Same origin for every build: localStorage saves and the API CORS allow-list key on it.
    androidScheme: 'https',
    hostname: 'localhost',
  },
}

export default config
