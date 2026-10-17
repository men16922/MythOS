// Signal+ backgrounds (engine/crpg.ts): picked at run setup. +2 on d20 checks with the proficient stats, unique
// dialogue options (`requires.background`), and inspiration when the player acts in character.
import type { BackgroundDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const BACKGROUNDS: BackgroundDef[] = [
  {
    id: 'enforcer',
    name: t('전직 단속관', 'Former Enforcer'),
    text: t(
      '단속국 제복을 반납한 지 일 년. 순찰 수신호와 검문 순서는 아직 몸이 기억한다. 사람을 겁주는 법도.',
      'A year since you handed back the Enforcement uniform. Your body still remembers the patrol signs and the checkpoint drill. And how to scare people.',
    ),
    proficient: ['str', 'obs'],
    inspires: ['intimidate', 'fight'],
  },
  {
    id: 'broker',
    name: t('브로커', 'Broker'),
    text: t(
      '빚, 정보, 사람. 네오서울에서 거래되지 않는 것은 없고, 당신은 늘 그 중간에 있었다. 웃는 얼굴로.',
      'Debts, information, people. Nothing in Neo-Seoul goes untraded, and you were always in the middle. Smiling.',
    ),
    proficient: ['cha', 'int'],
    inspires: ['persuade', 'offer'],
  },
  {
    id: 'medic',
    name: t('무면허 의사', 'Unlicensed Medic'),
    text: t(
      '면허는 IX가 가져갔다. 손은 남았다. 골목 진료소에서 꿰맨 상처가 몇 개인지 이제 세지 않는다.',
      'IX took the license. It left the hands. You stopped counting the wounds you stitched in back-alley clinics.',
    ),
    proficient: ['int', 'obs'],
    inspires: ['ask', 'insight'],
  },
  {
    id: 'runner',
    name: t('러너', 'Runner'),
    text: t(
      '배달 가방 하나로 구역 경계를 넘나들었다. 어디로 숨는지, 무엇을 둘러대는지 다 안다.',
      'You crossed district lines with nothing but a courier bag. You know where to hide and what to say when caught.',
    ),
    proficient: ['agi', 'cha'],
    inspires: ['sneak', 'deceive'],
  },
]
