// Android app entry (vite build --mode app swaps index.html's /src/main.tsx for this file; see vite.config.ts).
// Mounts Mythos 2.0 directly (no dev sandbox router) and wires the Capacitor native hooks.
import { mountApp2 } from '../App2.tsx'
import { nativeAuthPlatform } from './authNative.ts'
import { reportError } from './crash.ts'
import { initNative } from './init.ts'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('MythOS root element was not found.')

// React's own error reporting (boundaries catch render errors before window.onerror sees them).
const onReactError = (where: string) => (error: unknown, info: { componentStack?: string }) => {
  console.error(error, info.componentStack)
  reportError(error, where)
}

mountApp2(rootElement, nativeAuthPlatform, {
  onCaughtError: onReactError('react.caught'),
  onUncaughtError: onReactError('react.uncaught'),
  onRecoverableError: (error: unknown) => console.warn(error),
})
initNative()
