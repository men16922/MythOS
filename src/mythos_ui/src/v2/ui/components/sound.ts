// Mythos 2.0 — shell sound seam over the procedural WebAudio set (common/sfx.ts). Never throws.
import { setMusicDuck, sfx, type SfxName, type SfxOpts } from '../common/sfx.ts'

type UiSound = SfxName

export function sound(name: UiSound, opts?: SfxOpts): void {
  try {
    sfx(name, opts)
  } catch {
    /* audio must never break the UI */
  }
}

export function duckMusic(on: boolean): void {
  try {
    setMusicDuck(on)
  } catch {
    /* ignore */
  }
}
