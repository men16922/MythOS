// Pack 3 — Act 6 (Deep Signal): First Record. Beneath the Spire, MythOS's core: where the board is text and the
// question "who made the connector, and why does it repeat?" is answered. Gift: the Rewrite starter cards.
import type { ActDef } from '../../../engine/types.ts'

export const ORIGIN_ACT: ActDef = {
  act: 6,
  name: { ko: '최초 접속 기록', en: 'First Record' },
  subtitle: { ko: '모든 루프가 시작된 곳', en: 'Where every loop began' },
  intro: {
    ko: '묘역의 가장 깊은 기계가 눈을 뜨자 바닥이 글자로 풀린다. 스파이어 아래, 도시가 처음 쓰인 자리.\n발밑의 타일 하나하나가 문장이다. 지울 수 있고, 다시 쓸 수 있다.\n손끝에 낯선 명령 두 줄이 떠오른다. 지우기. 벽 쓰기.',
    en: 'When the deepest machine in the graveyard opens its eyes, the floor unravels into letters. Beneath the Spire: the place the city was first written.\nEvery tile underfoot is a sentence. It can be erased. It can be rewritten.\nTwo unfamiliar commands surface at your fingertips. Erase. Write Wall.',
  },
  backdrop: 'origin',
  image: 'v2/art/act6.webp',
  gift: ['rewrite_erase', 'rewrite_wall'],
}
