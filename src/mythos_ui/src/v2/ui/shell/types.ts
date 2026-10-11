// Mythos 2.0 — props shared by run screens.
import type { ContentRegistry, Lang, MetaProfile, RunState } from '../../engine/types.ts'

export interface ScreenProps {
  run: RunState
  C: ContentRegistry
  lang: Lang
  settings: MetaProfile['settings']
  /** Commit the next run state (screens never mutate). */
  act: (next: RunState) => void
  /** Bond cutscene ids already seen (profile), and the callback that records one as seen. */
  seenCutscenes?: readonly string[]
  onCutsceneSeen?: (id: string) => void
}
