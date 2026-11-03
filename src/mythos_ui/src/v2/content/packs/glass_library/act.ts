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
  // 1.0's four Glass Library endings, kept as the four ways this act closes (W1-4).
  codas: {
    insight: {
      title: { ko: '조용한 반납', en: 'A Quiet Return' },
      text: {
        ko: '사서의 책상에 대출 카드 한 장을 올려 둔다. 반납일 칸에 오늘 날짜. 유리 서가가 한 칸씩 불을 끈다. 아무것도 가져가지 않았다. 다 읽었을 뿐이다.',
        en: 'You leave a borrowing card on the librarian’s desk, today’s date in the return box. The glass shelves go dark one by one. You took nothing. You only read it all.',
      },
      scale: 4,
    },
    humanity: {
      title: { ko: '이름의 복원', en: 'Names Restored' },
      text: {
        ko: '깨진 페이지를 하나씩 맞춘다. 맞춘 자리마다 이름 하나가 떠오른다. 사서가 그 이름들을 소리 내어 읽는다. 서가 끝까지 읽는 데 밤이 다 간다.',
        en: 'You fit the broken pages back together. A name surfaces at every seam. The librarian reads them aloud. It takes the whole night to reach the end of the shelf.',
      },
      scale: 4,
    },
    dominance: {
      title: { ko: '금서 탈취', en: 'The Stolen Book' },
      text: {
        ko: '잠긴 서가의 유리를 깬다. 금서 한 권을 코트 안에 넣는다. 경보는 울리지 않는다. 사서가 문 앞에서 비켜선다. 이제 그 책은 당신 것이다.',
        en: 'You break the glass of the locked shelf and slip a forbidden book inside your coat. No alarm sounds. The librarian steps aside at the door. The book is yours now.',
      },
      scale: 4,
    },
    resilience: {
      title: { ko: '백색 봉인', en: 'The White Seal' },
      text: {
        ko: '검열자들이 쓰러진 자리에 흰 봉인 테이프가 남아 있다. 당신은 그걸 다시 붙인다. 이번엔 안쪽에서. 유리성이 닫힌다. 다음에 올 사람을 위해.',
        en: 'Where the censors fell, white sealing tape is left behind. You put it back up, from the inside this time. The glass castle closes, for whoever comes next.',
      },
      scale: 10,
    },
  },
}
