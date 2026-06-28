import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LangProvider } from './i18n/LangProvider'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('MythOS root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>,
)
