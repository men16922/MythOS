// R7e — Archive unlocks for the new connectors.
import type { MetaUnlockDef } from '../../../engine/types.ts'

export const NEW_ARCHETYPE_UNLOCKS: MetaUnlockDef[] = [
  {
    id: 'unlock_archivist',
    kind: 'archetype',
    name: { ko: '사서', en: 'Archivist' },
    text: {
      ko: '태운 카드를 다시 불러오는 접속자. 이 아키타입으로 루프를 시작할 수 있다.',
      en: 'A connector who recalls burned cards. Start loops as this archetype.',
    },
    cost: 70,
    grants: 'archivist',
    icon: 'v2/implants/returned_slip.webp',
  },
  {
    id: 'unlock_scrapborn',
    kind: 'archetype',
    name: { ko: '폐기체', en: 'Scrapborn' },
    text: {
      ko: '고철 벽과 전선 덫으로 싸우는 폐기 안드로이드. 이 아키타입으로 루프를 시작할 수 있다.',
      en: 'A discarded android that fights with scrap walls and live-wire traps. Start loops as this archetype.',
    },
    cost: 70,
    grants: 'scrapborn',
    icon: 'v2/implants/self_repair.webp',
  },
]
