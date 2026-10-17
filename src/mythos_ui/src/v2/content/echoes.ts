// Echoes a loop can inscribe at its start (engine/legacy.ts): the last normal loop offers up to three, most specific
// first. Small, concrete run-start effects; the companion echo bonds whoever walked beside you last time if they are
// with you again (the effect names a placeholder id replaced in newRun). Never on a daily.
import { ECHO_COMPANION } from '../engine/legacy.ts'
import type { EchoDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const ECHOES: EchoDef[] = [
  {
    id: 'echo_scar',
    source: 'fell',
    name: t('남은 흉터', 'The Scar'),
    text: t('지난번에 쓰러진 자리가 아직 욱신거린다. 몸이 먼저 기억한다. (최대 HP +5)', 'Where you fell last time still aches. The body remembers first. (+5 max HP)'),
    effects: [{ kind: 'maxHp', amount: 5 }, { kind: 'hp', amount: 5 }],
  },
  {
    id: 'echo_summit',
    source: 'won',
    name: t('정상의 공기', 'Summit Air'),
    text: t('끝까지 가 본 손은 망설이지 않는다. (무작위 카드 1장 강화)', 'Hands that went all the way don’t hesitate. (Upgrade one random card)'),
    effects: [{ kind: 'upgrade_card', count: 1, random: true }],
  },
  {
    id: 'echo_cut',
    source: 'abandoned',
    name: t('끊어 낸 선', 'The Cut Line'),
    text: t('스스로 끊은 접속에서 무언가 하나를 들고 나왔다. (소모품 1개)', 'You walked out of the cut connection holding something. (One consumable)'),
    effects: [{ kind: 'consumable' }],
  },
  {
    id: 'echo_together',
    source: 'companion',
    name: t('같이 걸은 길', 'The Road Walked Together'),
    text: t('지난번 옆에 있던 사람이 이번에도 옆에 있다면, 처음 같지 않다. (그 동료의 유대 +1)', 'If the one beside you last time is beside you again, it doesn’t feel like the first time. (That companion: bond +1)'),
    effects: [{ kind: 'bond', id: ECHO_COMPANION, amount: 1 }],
  },
  {
    id: 'echo_depth',
    source: 'deep',
    name: t('깊은 곳의 지도', 'A Map of the Deep'),
    text: t('어디서 무엇을 팔고 사는지, 대충은 안다. (크레딧 +40)', 'You roughly know where things are bought and sold down there. (+40 credits)'),
    effects: [{ kind: 'credits', amount: 40 }],
  },
  {
    id: 'echo_faint',
    source: 'any',
    name: t('희미한 잔향', 'A Faint Echo'),
    text: t('이 골목을 본 적이 있다. 언제였는지는 모른다. (관찰 +1)', 'You have seen this alley before. You don’t know when. (+1 OBS)'),
    effects: [{ kind: 'stat', stat: 'obs', amount: 1 }],
  },
]
