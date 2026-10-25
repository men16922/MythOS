// R7e — the new connectors' starting implants.
import type { ImplantDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const NEW_ARCHETYPE_IMPLANTS: ImplantDef[] = [
  {
    id: 'returned_slip',
    name: t('반납 전표', 'Return Slip'),
    text: t('손패 +1. 턴마다 첫 기술 카드를 쓰면 방어막 2.', 'Hand size +1. The first skill each turn gives 2 block.'),
    rarity: 'starter',
    icon: 'v2/implants/returned_slip.webp',
    passive: { handSize: 1 },
    triggers: [{ on: 'play_skill', effects: [{ kind: 'block', amount: 2, to: 'connector' }], limit: 'turn' }],
  },
  {
    id: 'self_repair',
    name: t('자가 수리', 'Self-Repair'),
    text: t('턴마다 첫 처치 시 HP 2 회복.', 'First kill each turn: heal 2.'),
    rarity: 'starter',
    icon: 'v2/implants/self_repair.webp',
    triggers: [{ on: 'enemy_killed', effects: [{ kind: 'heal', amount: 2, to: 'connector' }], limit: 'turn' }],
  },
]
