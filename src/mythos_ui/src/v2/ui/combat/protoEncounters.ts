// DLC 2 prototypes: art-free fights to judge in the sandbox (?sandbox=combat&mute=1&enc=proto_relay | proto_blackout).
// Merged into the content registry by SandboxApp only, so a run can never reach them.
import type { EncounterDef, Pos, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })
const at = (x: number, y: number): Pos => ({ x, y })
const foe = (id: string, x: number, y: number): { id: string; pos: Pos } => ({ id, pos: at(x, y) })

export const PROTO_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'proto_relay',
    act: 2,
    kind: 'normal',
    name: t('프로토타입 · 수신 대행', 'Prototype: Relay'),
    backdrop: 'streets',
    enemies: [foe('tracker_spider', 5, 1), foe('scrap_drone', 4, 3), foe('scrap_drone', 6, 2)],
    terrain: [
      { pos: at(3, 1), kind: 'cover' },
      { pos: at(3, 3), kind: 'cover' },
    ],
    neutral: { name: t('명단의 시민', 'The Listed Citizen'), sprite: 'listed-citizen', hp: 14, pos: at(2, 2) },
    bonus: { kind: 'protect' },
    proto: { relay: at(3, 2) },
    intro: t(
      '점선 칸에 누군가 서 있으면, 시민을 겨눈 직접 공격을 그 유닛이 대신 맞는다. 적도 된다.',
      'Whoever stands on the dashed tile takes direct hits meant for the citizen. An enemy counts.',
    ),
  },
  {
    id: 'proto_blackout',
    act: 2,
    kind: 'normal',
    name: t('프로토타입 · 암전', 'Prototype: Blackout'),
    backdrop: 'streets',
    enemies: [foe('tracker_spider', 5, 1), foe('scrap_drone', 4, 3), foe('scrap_drone', 6, 2)],
    neutral: { name: t('전원 콘덴서', 'Power Node'), sprite: 'maintenance-drone', hp: 1, pos: at(3, 2) },
    proto: { litFromX: 3 },
    intro: t(
      '밝은 칸은 공격 +2, 어두운 칸은 공격 −2·충돌 +2. 콘덴서를 터뜨리면 주변에 4 피해, 2턴 동안 보드 전체가 꺼진다.',
      'Lit tiles: attacks +2. Dark tiles: attacks −2, bumps +2. Pop the node: 4 to its neighbours and the whole board goes dark for 2 turns.',
    ),
  },
]
