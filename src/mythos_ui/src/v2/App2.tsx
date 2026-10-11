// Mythos 2.0 entry: mounts the game shell (ui/shell/GameShell.tsx).
import { StrictMode } from 'react'
import { createRoot, type RootOptions } from 'react-dom/client'
import { startAuth, type AuthPlatform } from './net/auth.ts'
import { GameShell } from './ui/shell/GameShell.tsx'
import './fonts.ts'

/**
 * `auth`: how this build signs in (web entry: net/authWeb.ts; Android: native/authNative.ts), started before the first
 * render so the store's first loads already carry the player's identity.
 * `options`: the Android app entry (native/main.tsx) passes React error hooks for crash reports.
 */
export function mountApp2(rootElement: HTMLElement, auth: AuthPlatform, options?: RootOptions): void {
  startAuth(auth)
  createRoot(rootElement, options).render(
    <StrictMode>
      <GameShell />
    </StrictMode>,
  )
}
