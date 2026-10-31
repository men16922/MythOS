// What each companion is good at. Their cards scale off these numbers, not the connector's, and a level raises the top
// two (engine/companionLevel.ts). Sum 18 each: at level 1 a companion is about as sharp as a fresh connector.
import type { Stats } from '../engine/types.ts'

export const COMPANION_STATS: Record<string, Stats> = {
  se_rin: { str: 2, agi: 7, int: 2, cha: 4, obs: 3 },
  tae_o: { str: 7, agi: 3, int: 1, cha: 3, obs: 4 },
  han: { str: 1, agi: 3, int: 7, cha: 2, obs: 5 },
  su_ah: { str: 5, agi: 2, int: 6, cha: 3, obs: 2 },
  kai: { str: 3, agi: 4, int: 3, cha: 1, obs: 7 },
  lin_yue: { str: 1, agi: 3, int: 3, cha: 7, obs: 4 },
  io: { str: 1, agi: 2, int: 7, cha: 3, obs: 5 },
  miro: { str: 1, agi: 7, int: 2, cha: 3, obs: 5 },
  doyun: { str: 6, agi: 3, int: 2, cha: 5, obs: 2 },
  bel: { str: 2, agi: 4, int: 6, cha: 1, obs: 5 },
  rem: { str: 2, agi: 2, int: 7, cha: 4, obs: 3 },
}
