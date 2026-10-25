// Pack 2 — Act 5 (Deep Signal): Dreaming Machines. 1.0 Act 4 "꿈꾸는 기계": the android graveyard where discarded
// machines dream, and where Kai's past and the fragments of MythOS that ARK erased are buried.
import type { ActDef } from '../../../engine/types.ts'

export const MACHINE_ACT: ActDef = {
  act: 5,
  name: { ko: '꿈꾸는 기계', en: 'Dreaming Machines' },
  subtitle: { ko: '버려진 것들이 꿈꾸는 묘역', en: 'A graveyard where the discarded dream' },
  intro: {
    ko: '유리성의 마지막 책장이 열리자 바람이 들어온다. 쇳가루와 기름 냄새. 끝없는 고철 묘역 위로 녹슨 크레인들이 고개를 숙이고 있다.\n버려진 안드로이드들이 눈을 감은 채 같은 꿈을 꾼다. 전쟁 이전의 아이, 비 오는 소리.\n카이가 걸음을 멈춘다. "여기, 와 본 적이 있어."',
    en: 'When the last shelf of the Glass Library opens, wind comes in: iron dust and oil. Over an endless scrap graveyard, rusted cranes bow their heads.\nDiscarded androids dream the same dream with their eyes closed. A child from before the war. The sound of rain.\nKai stops walking. "I have been here before."',
  },
  backdrop: 'scrapyard',
  image: 'v2/art/act5.webp',
}
