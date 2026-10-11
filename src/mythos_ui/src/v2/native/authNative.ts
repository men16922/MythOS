// Native Google sign-in for the Android app (net/auth.ts platform), via @capacitor-firebase/authentication with
// `skipNativeAuth: false` (capacitor.config.ts): the native Firebase SDK signs in and hands out ID tokens.
//
// Google sign-in works only when the bundled google-services.json carries a Google web client id, i.e. after the
// owner enabled the Google provider in the Firebase console, registered the signing key's SHA-1 and re-ran
// `make android-firebase`. scripts/android/build-web.sh detects that and sets VITE_NATIVE_GOOGLE_SIGNIN=1; without it
// the account UI says sign-in is not open yet instead of calling the plugin (whose placeholder client id would fail).
import { FirebaseAuthentication, type User } from '@capacitor-firebase/authentication'
import type { AuthBackend, AuthPlatform, AuthUser } from '../net/auth.ts'

const GOOGLE_READY = import.meta.env.VITE_NATIVE_GOOGLE_SIGNIN === '1'

function toUser(u: User): AuthUser {
  const email = u.email ?? ''
  return { name: u.displayName?.trim() || email.split('@')[0] || 'Google', email, photoUrl: u.photoUrl || null }
}

function createNativeBackend(): AuthBackend {
  return {
    onChange(listener) {
      let alive = true
      // The initial report: the session the native SDK restored (or none).
      void FirebaseAuthentication.getCurrentUser()
        .then(({ user }) => alive && listener(user ? toUser(user) : null))
        .catch(() => alive && listener(null))
      const handle = FirebaseAuthentication.addListener('authStateChange', ({ user }) => listener(user ? toUser(user) : null))
      return () => {
        alive = false
        void handle.then((h) => h.remove())
      }
    },
    async signIn() {
      const { user } = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: false })
      if (!user) throw new Error('no user')
      return toUser(user)
    },
    signOut: () => FirebaseAuthentication.signOut(),
    async getIdToken(force) {
      const { token } = await FirebaseAuthentication.getIdToken({ forceRefresh: force })
      return token || null
    },
  }
}

export const nativeAuthPlatform: AuthPlatform = {
  knownUnavailable: () => (GOOGLE_READY ? null : 'not-configured'),
  restoreAlways: GOOGLE_READY,
  loadBackend: () => Promise.resolve(GOOGLE_READY ? createNativeBackend() : 'not-configured'),
}
