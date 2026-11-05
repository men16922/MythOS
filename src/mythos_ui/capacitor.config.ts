// Capacitor (Android only) — packages the Mythos 2.0 app build (`vite build --mode app` → dist-app/) into an APK.
// Build steps: scripts/android/*.sh, docs/android.md. The appId is permanent once uploaded to Google Play.
import type { CapacitorConfig } from '@capacitor/cli'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ANDROID_WEBVIEW_MIN_VERSION } from './android-webview.ts'

// Debug builds aimed at a plain-http local API (e.g. VITE_API_BASE=http://10.0.2.2:8010 from the emulator)
// need mixed content: the app page itself is https://localhost. Never set for a release build.
const apiBase = process.env.VITE_API_BASE ?? ''
const allowMixedContent = apiBase.startsWith('http://')

// Firebase Auth's native SDK aborts the app at plugin load when the build has no Firebase config, so a build without
// android/app/google-services.json (scripts/android/fetch-firebase-config.sh) leaves the sign-in and push plugins out
// (`cap sync` runs from src/mythos_ui). Crashlytics stays: it only touches Firebase when called.
const FIREBASE_ONLY = ['@capacitor-firebase/authentication', '@capacitor-firebase/messaging']
const hasFirebase = existsSync(resolve(process.cwd(), 'android/app/google-services.json'))
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as { dependencies?: Record<string, string> }
const nativePlugins = Object.keys(pkg.dependencies ?? {}).filter(
  (name) => /^@capacitor(-firebase)?\//.test(name) && !['@capacitor/core', '@capacitor/android', '@capacitor/cli'].includes(name),
)

const config: CapacitorConfig = {
  appId: 'com.projectmythos.signalrun',
  appName: 'MythOS',
  webDir: 'dist-app',
  // The game's near-black: no white flash before the first paint.
  backgroundColor: '#030307',
  android: {
    allowMixedContent,
    minWebViewVersion: ANDROID_WEBVIEW_MIN_VERSION,
    ...(hasFirebase ? {} : { includePlugins: nativePlugins.filter((name) => !FIREBASE_ONLY.includes(name)) }),
  },
  plugins: {
    // Immersive play: MainActivity.java hides the bars (swipe to peek); this keeps Capacitor's SystemBars from
    // re-showing them on load. Dark style = light icons whenever they are peeked.
    // Keep native inset/keyboard padding. The app uses env() rather than the optional --safe-area-inset-*
    // variables, whose injection can run before documentElement exists on a cold Android launch.
    SystemBars: { hidden: true, style: 'DARK', insetsHandling: 'native' },
    // Native Google sign-in (src/v2/native/authNative.ts): the native Firebase SDK signs in and issues the ID tokens.
    FirebaseAuthentication: { skipNativeAuth: false, providers: ['google.com'] },
  },
  server: {
    // Same origin for every build: localStorage saves and the API CORS allow-list key on it.
    androidScheme: 'https',
    hostname: 'localhost',
    // Plain HTML copied by build-web.sh: readable even when the game's JS cannot run.
    errorPath: 'app-unavailable.html',
  },
}

export default config
