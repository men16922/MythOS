// Window keyboard for the combat screen: one listener bound for the screen's lifetime, calling the latest
// handler (a latest-handler ref, so the handler can read this render's state). Releasing Alt or leaving the
// window ends the hold-Alt threat view.

import { useEffect, useRef } from 'react'

export function useCombatKeys(onKey: (e: KeyboardEvent) => void, setAltHeld: (held: boolean) => void): void {
  const keyRef = useRef(onKey)
  useEffect(() => {
    keyRef.current = onKey
  })
  useEffect(() => {
    const down = (e: KeyboardEvent) => keyRef.current(e)
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltHeld(false)
    }
    const blur = () => setAltHeld(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [setAltHeld])
}
