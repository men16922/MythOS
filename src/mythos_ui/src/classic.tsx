// Mythos 1.x ("classic") entry, kept reachable at /?classic=1 for comparison.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LangProvider } from './i18n/LangProvider'
import { ConciseModeProvider } from './ConciseModeProvider'

export function mountClassic(rootElement: HTMLElement): void {
  createRoot(rootElement).render(
    <StrictMode>
      <LangProvider>
        <ConciseModeProvider>
          <App />
        </ConciseModeProvider>
      </LangProvider>
    </StrictMode>,
  )
}
