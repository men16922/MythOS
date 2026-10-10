// Dev-only combat sandbox entry at /?sandbox=combat (see SandboxApp.tsx).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CombatSandbox } from './SandboxApp.tsx'

export function mountCombatSandbox(rootElement: HTMLElement): void {
  createRoot(rootElement).render(
    <StrictMode>
      <CombatSandbox />
    </StrictMode>,
  )
}
