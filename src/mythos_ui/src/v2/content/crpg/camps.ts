// Signal+ camp nights (engine/crpg.ts campScene): at a safehouse, a deployed companion whose approval reached
// `minApproval` starts their conversation (once per run). Scenes and dialogues live in camp_dialogues.ts.
import { CAMP_SCENES } from './camp_dialogues.ts'
import { SEA_CAMP_SCENES } from './camp_dialogues_sea.ts'
import { MORE_CAMP_SCENES } from './camp_dialogues_more.ts'

export const CAMPS = [...CAMP_SCENES, ...SEA_CAMP_SCENES, ...MORE_CAMP_SCENES]
