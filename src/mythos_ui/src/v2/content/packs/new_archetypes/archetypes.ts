// R7e — two new connectors (plan §5.1): the Archivist, who woke in the Glass Library (Pack 1), and the Scrapborn,
// a discarded android who started to dream (Pack 2). Archive unlocks; same starter basics as the base three.
//   Archivist — Recall: exhaust cards for value, then bring them back (`recall` effect) · draw and mark
//   Scrapborn — Deploy: walls, live-wire traps and bumps into them · overload (energy for HP) · self-repair on kills
import type { ArchetypeDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

const BASICS = ['packet_shot', 'packet_shot', 'packet_shot', 'covering_noise', 'covering_noise', 'covering_noise', 'shove']

export const NEW_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'archivist',
    name: t('사서', 'Archivist'),
    tagline: t('한 번 쓴 문장은 다시 읽을 수 있다.', 'A sentence once written can be read again.'),
    description: t(
      '유리성의 서가 사이에서 깨어난 접속자. 카드를 태워 없애고, 각주처럼 다시 불러와 한 번 더 쓴다.',
      'A connector who woke between the Glass Library’s shelves. Burns cards for effect, then recalls them like footnotes and plays them again.',
    ),
    stats: { str: 2, agi: 3, int: 7, cha: 3, obs: 5 },
    maxHp: 30,
    startingDeck: [...BASICS, 'archivist_footnote', 'archivist_recall', 'archivist_catalog_strike'],
    startingImplant: 'returned_slip',
    startingCredits: 75,
    sprite: 'archivist',
    burst: {
      name: t('총서 낭독', 'The Complete Reading'),
      text: t('소멸한 카드 2장을 손으로 되돌리고, 카드 2장을 뽑고, 에너지 +1.', 'Recall 2 exhausted cards, draw 2 and gain 1 energy.'),
      effects: [{ kind: 'recall', count: 2 }, { kind: 'draw', amount: 2 }, { kind: 'energy', amount: 1 }],
    },
  },
  {
    id: 'scrapborn',
    name: t('폐기체', 'Scrapborn'),
    tagline: t('버려진 것으로 벽을 세운다.', 'I build walls out of what was thrown away.'),
    description: t(
      '꿈을 꾸게 된 폐기 안드로이드. 고철 벽과 전선 덫을 깔고, 적을 그 위로 밀어 넣는다. 과열을 각오하면 더 빨리 움직인다.',
      'A discarded android that began to dream. Lays scrap walls and live-wire traps, then shoves enemies into them. Runs hot when it has to.',
    ),
    stats: { str: 5, agi: 3, int: 4, cha: 3, obs: 5 },
    maxHp: 37,
    startingDeck: [...BASICS, 'scrapborn_scrap_wall', 'scrapborn_wire_trap', 'scrapborn_overload'],
    startingImplant: 'self_repair',
    startingCredits: 70,
    sprite: 'scrapborn',
    burst: {
      name: t('폐품 폭풍', 'Junk Storm'),
      text: t('모든 적에게 피해 5, 모든 아군 방어막 6.', 'Deal 5 to every enemy. Every ally gains 6 block.'),
      effects: [
        { kind: 'damage', amount: 5, to: 'all_enemies' },
        { kind: 'block', amount: 6, to: 'all_allies' },
      ],
    },
  },
]
