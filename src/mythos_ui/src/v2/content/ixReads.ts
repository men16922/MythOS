// Paradox 10 "IX Learns" (W2-1): at the start of every act from Act 2, IX reads what the deck leans on (its
// non-starter cards' synergy tags) and answers with one counter for that act. The table is authored; the engine only
// counts tags and picks (engine/run.ts ixReadFor, IX_READ_MIN). Each counter uses a mechanic the player already knows.
import type { IxReadDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const IX_READS: IxReadDef[] = [
  {
    id: 'read_block',
    tags: ['block'],
    read: t('방패', 'shields'),
    text: t('적이 분노 1을 안고 전투를 시작한다.', 'Enemies start every fight with 1 Rage.'),
    combat: { enemyStatus: ['rage', 1] },
  },
  {
    id: 'read_push',
    tags: ['push'],
    read: t('밀치기', 'shoves'),
    text: t('적의 장갑 +1.', 'Enemies have +1 armor.'),
    combat: { enemyArmor: 1 },
  },
  {
    id: 'read_companion',
    tags: ['companion'],
    read: t('동료', 'companions'),
    text: t('동료가 약화 1을 안고 전투를 시작한다.', 'Companions start every fight with 1 Weak.'),
    combat: { companionStatus: ['weak', 1] },
  },
  {
    id: 'read_aim',
    tags: ['mark', 'move'],
    read: t('조준과 발놀림', 'aim and footwork'),
    text: t('적이 회피 1을 안고 전투를 시작한다.', 'Enemies start every fight with 1 Evade.'),
    combat: { enemyStatus: ['evade', 1] },
  },
  {
    id: 'read_hack',
    tags: ['hack', 'draw', 'energy'],
    read: t('해킹과 계산', 'hacks and sums'),
    text: t('전투마다 접속자의 첫 카드 비용 +1.', 'The connector’s first card each fight costs +1.'),
    combat: { connectorStatus: ['redact', 1] },
  },
  {
    id: 'read_rot',
    tags: ['burn', 'bleed', 'corrode'],
    read: t('지속 피해', 'damage over time'),
    text: t('적의 체력 +15%.', 'Enemies have +15% HP.'),
    combat: { enemyHpPct: 15 },
  },
]
