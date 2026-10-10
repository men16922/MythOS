// Mythos 2.0 entry: mounts the game shell (ui/shell/GameShell.tsx).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GameShell } from './ui/shell/GameShell.tsx'

export function mountApp2(rootElement: HTMLElement): void {
  createRoot(rootElement).render(
    <StrictMode>
      <GameShell />
    </StrictMode>,
  )
}
