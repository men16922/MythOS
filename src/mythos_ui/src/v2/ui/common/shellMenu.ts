// Mythos 2.0 — lets in-run screens (the combat top strip) open the shell's pause menu without threading
// callbacks through every screen. GameShell provides it while a run is live; null elsewhere.
import { createContext } from 'react'

export const ShellMenu = createContext<(() => void) | null>(null)
