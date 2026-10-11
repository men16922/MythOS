// Mythos 2.0 — web sign-in platform (net/auth.ts): Firebase Auth JS SDK with a Google popup.
// This module is small and loads with the web entry; the SDK itself (`firebase/app` + `firebase/auth`) is a lazy
// chunk fetched only when a remembered session is restored or the player clicks "Google로 로그인".
// The Firebase web config comes from `GET /api/v2/config` (public by design; never hard-coded here).
import type { AuthBackend, AuthPlatform, AuthUser } from './auth.ts'
import { cachedConfig, loadConfig, type FirebaseWebConfig } from './api.ts'

interface FirebaseUserLike {
  displayName: string | null
  email: string | null
  photoURL: string | null
}

function toUser(u: FirebaseUserLike): AuthUser {
  const email = u.email ?? ''
  return { name: u.displayName?.trim() || email.split('@')[0] || 'Google', email, photoUrl: u.photoURL || null }
}

async function createWebBackend(cfg: FirebaseWebConfig): Promise<AuthBackend> {
  const [{ getApps, initializeApp }, fa] = await Promise.all([import('firebase/app'), import('firebase/auth')])
  const app = getApps()[0] ?? initializeApp(cfg)
  const auth = fa.getAuth(app)
  return {
    onChange: (listener) => fa.onAuthStateChanged(auth, (u) => listener(u ? toUser(u) : null)),
    async signIn() {
      const provider = new fa.GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      auth.languageCode = document.documentElement.lang === 'en' ? 'en' : 'ko'
      const cred = await fa.signInWithPopup(auth, provider)
      return toUser(cred.user)
    },
    signOut: () => fa.signOut(auth),
    async getIdToken(force) {
      const u = auth.currentUser
      return u ? u.getIdToken(force) : null
    },
  }
}

export const webAuthPlatform: AuthPlatform = {
  knownUnavailable() {
    const cfg = cachedConfig()
    return cfg && !cfg.firebase ? 'not-configured' : null
  },
  restoreAlways: false,
  async loadBackend() {
    const cfg = await loadConfig()
    if (!cfg) return 'offline'
    if (!cfg.firebase) return 'not-configured'
    return createWebBackend(cfg.firebase)
  },
}
