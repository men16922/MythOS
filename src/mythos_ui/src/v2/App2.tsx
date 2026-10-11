// Mythos 2.0 entry: mounts the game shell (ui/shell/GameShell.tsx).
import { StrictMode } from 'react'
import { createRoot, type RootOptions } from 'react-dom/client'
import { GameShell } from './ui/shell/GameShell.tsx'
import './fonts.ts'

/** `options`: the Android app entry (native/main.tsx) passes React error hooks for crash reports. */
export function mountApp2(rootElement: HTMLElement, options?: RootOptions): void {
  createRoot(rootElement, options).render(
    <StrictMode>
      <GameShell />
    </StrictMode>,
  )
}
