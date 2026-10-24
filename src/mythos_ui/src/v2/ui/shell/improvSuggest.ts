// Mythos 2.0 — one-tap Improvise ideas: three ready actions for the player's strongest stats, so a free action never
// starts from an empty box. Authored and instant (no model call); each phrase is worded so the local keyword judge
// (gm.ts) reads the same stat the chip names — the model GM may still rule differently on the actual words.
import type { Lang, StatKey } from '../../engine/types.ts'

type Phrase = { ko: string; en: string }

const IDEAS: Record<StatKey, Phrase[]> = {
  int: [
    { ko: '단말기를 해킹해 경보를 끈다', en: 'Hack the terminal and kill the alarm' },
    { ko: '보안 코드를 분석해 우회로를 연다', en: 'Analyze the security code and open a bypass' },
    { ko: '회로에 접속해 잠금을 푼다', en: 'Jack into the circuit and override the lock' },
  ],
  cha: [
    { ko: '상대를 설득해 길을 비키게 한다', en: 'Persuade them to step aside' },
    { ko: '그럴듯한 거짓말로 속인다', en: 'Bluff with a convincing story' },
    { ko: '크레딧을 쥐여 주고 매수한다', en: 'Bribe them with a few credits' },
  ],
  obs: [
    { ko: '주변을 살피며 빈틈을 찾는다', en: 'Look around for an opening' },
    { ko: '숨죽이고 기다리며 귀를 기울인다', en: 'Wait quietly and listen' },
    { ko: '흔적을 조사해 단서를 찾는다', en: 'Inspect the traces for a clue' },
  ],
  agi: [
    { ko: '그림자에 숨어 몰래 빠져나간다', en: 'Slip away through the shadows' },
    { ko: '배관을 타고 기어올라 피한다', en: 'Climb the pipes and dodge past' },
    { ko: '경비 몰래 잠입한다', en: 'Sneak past the guards' },
  ],
  str: [
    { ko: '문을 힘으로 부수고 들어간다', en: 'Smash the door in' },
    { ko: '정면으로 밀어붙여 위협한다', en: 'Push forward and threaten them' },
    { ko: '장애물을 들어 올려 치운다', en: 'Lift the barrier out of the way' },
  ],
}

const ORDER: StatKey[] = ['int', 'cha', 'obs', 'agi', 'str']

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export interface ImprovIdea {
  stat: StatKey
  text: string
}

/** Up to `n` ideas for this event: the player's highest stats first (ties broken per event), one phrasing each. */
export function improvSuggestions(eventId: string, stats: Readonly<Record<StatKey, number>>, lang: Lang, n = 3): ImprovIdea[] {
  const ranked = [...ORDER].sort((a, b) => (stats[b] ?? 0) - (stats[a] ?? 0) || hash(eventId + a) - hash(eventId + b))
  return ranked.slice(0, n).map((stat) => {
    const pool = IDEAS[stat]
    const p = pool[hash(`${eventId}:${stat}`) % pool.length] ?? pool[0]!
    return { stat, text: lang === 'ko' ? p.ko : p.en }
  })
}

/** Every phrase (tests: each must read as its own stat to the local judge). */
export const ALL_IDEAS: readonly { stat: StatKey; phrase: Phrase }[] = ORDER.flatMap((stat) => IDEAS[stat].map((phrase) => ({ stat, phrase })))
