// R7d — Archive unlocks for the new companions (Act 2 recruit pool + starting companion, like the base ones).
import type { MetaUnlockDef } from '../../../engine/types.ts'

export const NEW_COMPANION_UNLOCKS: MetaUnlockDef[] = [
  {
    id: 'unlock_io',
    kind: 'companion',
    name: { ko: '이오 — 유리성의 사서', en: 'Io — The Glass Librarian' },
    text: {
      ko: '실패한 루프를 한 권씩 꽂아 두던 사서 AI. 2막 합류 후보에 들고, 시작 동료로도 고를 수 있다.',
      en: 'The librarian AI that shelved failed loops one by one. Joins the Act 2 recruit pool and can be your starting companion.',
    },
    cost: 55,
    grants: 'io',
    icon: 'characters/io.png',
  },
  {
    id: 'unlock_miro',
    kind: 'companion',
    name: { ko: '미로 — 잊힌 독자', en: 'Miro — The Forgotten Reader' },
    text: {
      ko: '아무도 기억하지 못하는 독자. 2막 합류 후보에 들고, 시작 동료로도 고를 수 있다.',
      en: 'A reader nobody remembers. Joins the Act 2 recruit pool and can be your starting companion.',
    },
    cost: 50,
    grants: 'miro',
    icon: 'characters/miro.png',
  },
  {
    id: 'unlock_doyun',
    kind: 'companion',
    name: { ko: '도윤 — 명단 밖의 이름', en: 'Doyun — The Name Off the List' },
    text: {
      ko: '최적화 명단에서 지워질 뻔한 사람. 2막 합류 후보에 들고, 시작 동료로도 고를 수 있다.',
      en: 'Someone the optimization list almost erased. Joins the Act 2 recruit pool and can be your starting companion.',
    },
    cost: 50,
    grants: 'doyun',
    icon: 'characters/doyun.png',
  },
  {
    id: 'unlock_bel',
    kind: 'companion',
    name: { ko: '벨 — 검열단 이탈자', en: 'Bel — The Censor Who Quit' },
    text: {
      ko: '십 년 동안 남의 문장을 자르다 가위를 내려놓은 검열관. 2막 합류 후보에 들고, 시작 동료로도 고를 수 있다.',
      en: 'A censor who put the scissors down after ten years. Joins the Act 2 recruit pool and can be your starting companion.',
    },
    cost: 55,
    grants: 'bel',
    icon: 'characters/bel.png',
  },
  {
    id: 'unlock_rem',
    kind: 'companion',
    name: { ko: '렘 — 깨어난 집행자', en: 'Rem — The Executor Who Woke' },
    text: {
      ko: '기계들의 꿈을 끄던 집행자. 이제는 꿈을 지킨다. 2막 합류 후보에 들고, 시작 동료로도 고를 수 있다.',
      en: 'The executor that switched off machines’ dreams, and now keeps them. Joins the Act 2 recruit pool and can be your starting companion.',
    },
    cost: 65,
    grants: 'rem',
    icon: 'characters/rem-ally.png',
  },
]
