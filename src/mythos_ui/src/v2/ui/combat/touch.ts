// Touch vs mouse for the combat screen. A tap makes the browser fire *emulated* mouseenter / mousemove right
// after it; read as hover they would stick (no mouseleave until the next tap elsewhere). The combat UI asks
// `isTouch()` in its hover handlers and drives inspect / aim from taps instead. Mouse input is untouched.

let touch = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches

/** The last real pointer was a finger or a pen (not a mouse). */
export function isTouch(): boolean {
  return touch
}

/** Window-level (capture) listener: pointer events carry the input type; the emulated mouse events after a tap don't. */
export function watchPointer(onChange: (touch: boolean) => void): () => void {
  const note = (e: PointerEvent) => {
    const t = e.pointerType !== 'mouse'
    if (t !== touch) {
      touch = t
      onChange(t)
    }
  }
  window.addEventListener('pointerdown', note, true)
  window.addEventListener('pointermove', note, true)
  return () => {
    window.removeEventListener('pointerdown', note, true)
    window.removeEventListener('pointermove', note, true)
  }
}
