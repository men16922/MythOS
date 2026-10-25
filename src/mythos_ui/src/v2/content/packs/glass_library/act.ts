// Pack 1 — Act 4 (Deep Signal): The Glass Librarian. 1.0 scenario 02 ("유리성의 사서") brought into the run:
// MythOS keeps its failed loops and discarded world drafts in a crystal archive; the connector comes looking for
// "the first connector record".
import type { ActDef } from '../../../engine/types.ts'

export const GLASS_ACT: ActDef = {
  act: 4,
  name: { ko: '유리성의 사서', en: 'The Glass Librarian' },
  subtitle: { ko: '실패한 루프들이 잠든 곳', en: 'Where the failed loops sleep' },
  intro: {
    ko: 'IX가 쓰러졌는데도 신호가 끊기지 않는다. 화이트아웃 너머로 계단이 하나 더 이어진다.\n유리로 된 서가가 끝없이 늘어서 있다. 책은 종이가 아니라 기억이다. 모든 책장이 누군가의 삶이고, 깨진 페이지마다 세계 하나가 사라졌다.\n어딘가에 "첫 번째 접속 기록"이 있다. 당신이 누구인지 적힌 기록. 검열자들은 그것을 제본해 봉인하려 한다.',
    en: 'IX has fallen, yet the signal does not end. Past the whiteout, one more stair goes on.\nGlass shelves run forever. The books are not paper but memory. Every shelf is someone’s life; every broken page, a world that vanished.\nSomewhere is "the first connector record" — the record of who you are. The censors mean to bind it shut.',
  },
  backdrop: 'library',
  image: 'v2/art/act4.webp',
}
