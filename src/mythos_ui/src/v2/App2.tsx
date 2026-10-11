// Mythos 2.0 entry: mounts the game shell (ui/shell/GameShell.tsx).
import { StrictMode } from 'react'
import { createRoot, type RootOptions } from 'react-dom/client'
import { GameShell } from './ui/shell/GameShell.tsx'
// Latin display / mono faces ship with the bundle (the Android app plays offline). Korean text uses Noto Sans KR from
// Google Fonts online and the platform's Noto Sans CJK offline.
import '@fontsource/chakra-petch/latin-400.css'
import '@fontsource/chakra-petch/latin-500.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import '@fontsource/jetbrains-mono/latin-700.css'

/** `options`: the Android app entry (native/main.tsx) passes React error hooks for crash reports. */
export function mountApp2(rootElement: HTMLElement, options?: RootOptions): void {
  createRoot(rootElement, options).render(
    <StrictMode>
      <GameShell />
    </StrictMode>,
  )
}
