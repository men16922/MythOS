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
  /** Runs each event appeared in before (profile), for the GM's déjà-vu opening on a revisited scene. */
  eventsSeen?: Readonly<Record<string, number>>
  /** Earlier loops each companion was in (loopMemory.loopsWith), for their faint déjà vu in the safehouse chat. */
  loopsWith?: (companion: string) => number
}
