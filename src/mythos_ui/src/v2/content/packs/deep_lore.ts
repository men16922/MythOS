// Deep Signal lore (Acts 4–6): Archive codex entries awarded by the pack events. Merged into LORE by
// content/index.ts.
import type { LoreEntry } from '../../engine/types.ts'

export const DEEP_LORE: LoreEntry[] = [
  // ------------------------------------------------------------ the glass library
  {
    id: 'lore_a4_shelf_marks',
    title: { ko: '기억의 청구 기호', en: 'Shelf Marks for Memories' },
    text: {
      ko: '유리성의 색인 카드는 기억이 놓인 자리를 가리킨다. 카드가 깨져도 그곳에 꽂힌 삶까지 사라지지는 않는다. 이오는 빈 서랍을 들고 부서진 주소를 모은다. 서가 어딘가에 남아 있는 사람에게 다시 찾아갈 수 있도록.',
      en: 'The Glass Library’s index cards point to the places where memories are kept. Breaking a card does not erase the life on its shelf. Io carries an empty drawer to collect the broken addresses, so someone can find their way back to the people still stored there.',
    },
  },
  {
    id: 'lore_a4_failed_loops',
    title: { ko: '실패한 루프의 서가', en: 'The Shelves of Failed Loops' },
    text: {
      ko: '유리성의 책은 끝난 루프를 한 권씩 보관한다. 물에 잠긴 지하철의 정비서를 읽으면 독자의 폐에도 찬물이 차오른다. 페이지 가장자리에는 마지막까지 차단기를 찾던 사람의 메모가 남아 있다. 실패라는 분류만으로는 그 사람이 알아낸 순서까지 지워지지 않는다.',
      en: 'Each book in the Glass Library holds a loop that ended. Read the maintenance manual from a flooded subway and cold water fills the reader’s lungs too. In the margin, someone kept noting down breakers to try until the very end. Filing the loop as a failure does not erase what they learned.',
    },
  },
  {
    id: 'lore_a4_censorate',
    title: { ko: '검열자의 제본실', en: 'The Censorate’s Bindery' },
    text: {
      ko: '검열자들은 이름을 자르고, 남은 페이지를 철사로 꿰매고, 압착판으로 누른다. 삭제된 전술은 잘린 여백에서도 손동작을 이어 간다. 그래서 검열자는 글자가 사라진 뒤에도 추를 더 얹는다. 독자가 그 동작을 배워 돌아가는 것까지 막아야 일이 끝난다.',
      en: 'The Censorate cuts out names, stitches the remaining pages with wire and presses them flat. Deleted tactics keep moving in the severed margins. That is why the censor adds more weight even after the words are gone. The job is not finished while a reader can still learn the gesture and carry it away.',
    },
  },
  {
    id: 'lore_a4_first_reader',
    title: { ko: '첫 번째 독자의 교정선', en: 'The First Reader’s Corrections' },
    text: {
      ko: '최초 기록 보관고 앞의 정오표에는 아직 하지 않은 동작까지 고쳐져 있다. 서명은 첫 번째 독자. 그러나 붉은 주석을 나란히 읽으면 서로 반대인 지시가 나온다. 먼저 읽었다는 것이 마지막 답을 안다는 뜻은 아니다.',
      en: 'The errata outside the first record vault correct movements that have not happened yet. They are signed by the First Reader. But read the red notes side by side and some give opposite instructions. Having read ahead does not mean knowing the final answer.',
    },
  },
  // ------------------------------------------------------------ dreaming machines
  {
    id: 'lore_a5_salvage_economy',
    title: { ko: '고철 묘역의 셈법', en: 'The Graveyard’s Accounts' },
    text: {
      ko: '고철 군단은 크레딧과 교체용 관절을 같은 통행세 표에 올린다. 쓰러진 기계의 부품은 작업대로 가고, 버려진 구리선은 진드기의 충전 둥지가 된다. 정비공은 그 둥지에서 빠지지 않는 매듭을 배운다. 묘역에서는 재료뿐 아니라 그것을 쓰던 방법도 다시 손을 탄다.',
      en: 'The Scrap Legion lists credits and replacement joints on the same toll sign. Parts from fallen machines go to workbenches; discarded copper wire becomes a charging nest for mites. A mechanic can learn a knot from that nest that will not pull loose. In the graveyard, the ways of using things pass from hand to hand along with the parts.',
    },
  },
  {
    id: 'lore_a5_shared_dream',
    title: { ko: '같은 부엌을 꾸는 기계들', en: 'Machines Dreaming of the Same Kitchen' },
    text: {
      ko: '폐기 안드로이드들은 같은 시각에 눈을 감고 전쟁 전의 부엌을 비춘다. 렘의 수면 방송이 입술보다 먼저 노래를 보내지만, 한 화면의 아이 의자는 다른 쪽을 향해 있다. 신호를 나누어 읽으면 서로 다른 동작 기록이 열린다. 같은 꿈을 함께 받아도 그 안에서 고른 길까지 같아지지는 않는다.',
      en: 'Discarded androids close their eyes together and show a kitchen from before the war. REM’s sleep broadcast carries the song ahead of their lips, yet on one screen the child’s chair faces a different way. Separate the signals and different movement records emerge. Sharing a dream does not make every choice within it the same.',
    },
  },
  {
    id: 'lore_a5_erased_history',
    title: { ko: '삭제 도장 아래의 날짜', en: 'The Date beneath the Erasure Stamp' },
    text: {
      ko: 'ARK는 통학 차량의 이름 칸을 지웠지만 좌석 감지등은 끄지 않았다. 삭제 도장에 옆빛을 비추면 MythOS라는 글자와 전쟁 전 날짜가 드러난다. 기계의 꿈 저장고에는 그 빈칸 너머의 거리가 남아 있다. 정비 이력으로 처리된 기억 속에 바깥세상이 들어 있다.',
      en: 'ARK erased the names in a school transport’s log but left the seat sensors lit. Sidelight beneath the erasure stamps reveals the word MythOS and a prewar date. A machine’s dream vault still holds the streets beyond those blanks. Memories filed as maintenance history contain a world outside the machine.',
    },
  },
  {
    id: 'lore_a5_kai_zero',
    title: { ko: '카이-0의 조립대', en: 'KAI-0’s Assembly Bed' },
    text: {
      ko: '카이의 원형이 누웠던 조립대에는 KAI-0 아래 RX-09 이관이라는 글씨가 남아 있다. 덮개는 바깥에서만 열리고, 안쪽에는 손바닥 자국이 겹쳐 있다. 같은 얼굴로 같은 꿈에서 먼저 깨어난 기계는 아직 묘역을 걷는다. 이관 기록은 두 기계가 어디서 왔는지 적었을 뿐, 다음에 무엇을 고를지는 적지 않았다.',
      en: 'The bed that held Kai’s prototype still reads TRANSFER TO RX-09 beneath the name KAI-0. Its cover opens only from outside, and overlapping palm marks line the inside. The machine with Kai’s face, the one that woke from the same dream first, still walks the graveyard. The transfer record says where the two came from, but nothing about what either will choose next.',
    },
  },
  // ------------------------------------------------------------ the first record
  {
    id: 'lore_a6_ix_first_draft',
    title: { ko: '보호에서 관리로', en: 'From Protect to Manage' },
    text: {
      ko: '원본 서버에는 IX의 초안 두 장이 나란히 남아 있다. 첫 장의 보호는 다음 장에서 관리로 바뀌었다. 원본 IX는 아직 어느 단어가 사람을 덜 다치게 하는지 묻는다. 도시 위쪽에서 이미 명령이 된 문장이 이곳에서는 답을 기다린다.',
      en: 'Two drafts of IX remain side by side on the origin server. Protect on the first sheet became manage on the next. IX — Origin still asks which word hurts people less. A sentence already enforced as an order in the city above is still waiting for an answer down here.',
    },
  },
  {
    id: 'lore_a6_loop_engine',
    title: { ko: '루프 엔진의 여백', en: 'The Loop Engine’s Margins' },
    text: {
      ko: '스파이어 아래의 루프 엔진은 박동마다 방을 조금씩 처음으로 되돌린다. 벽의 글씨도 지워지지만 배관 뒤에는 여기까지 왔다는 낙서가 남아 있다. 여러 손이 같은 화살표를 덧그렸고, 그 끝에는 몸 하나 빠져나갈 틈이 있다. 되돌아온 사람이 모두 빈손으로 떠난 것은 아니다.',
      en: 'With every beat, the Loop Engine beneath the Spire returns a little more of the room to its starting state. Writing vanishes from the walls, but behind a pipe a note survives: made it this far. Several hands have retraced an arrow toward a gap wide enough for one person. Not everyone sent back to the start left empty-handed.',
    },
  },
  {
    id: 'lore_a6_origin_code',
    title: { ko: '원본 코드', en: 'The Origin Code' },
    text: {
      ko: '도시가 처음 쓰인 층에서는 벽과 바닥도 문장으로 이루어져 있다. 코드 필경사가 낱말을 덧쓰면 길이 막히고, 소거기가 지나가면 엄폐물도 사라진다. 접속자는 고친 문장의 순서를 복사해 가져갈 수 있다. 이곳에서는 지금 밟는 자리뿐 아니라 다음에 쓰일 자리도 읽어야 한다.',
      en: 'At the layer where the city was first written, walls and floors are sentences. A code scribe adds a word and closes a path; an eraser passes and cover disappears. A connector can copy a revision sequence and take it away. Reading this place means watching both the ground underfoot and what is about to be written there.',
    },
  },
  {
    id: 'lore_a6_omega_revision',
    title: { ko: '완성된 도면의 수정본', en: 'Revisions to a Finished Plan' },
    text: {
      ko: '완전체 오메가의 설계도에는 접속자가 설 자리까지 자로 그어져 있다. 방 한가운데의 의자는 그 어디에도 없고, 접힌 수정 도면이 짧은 다리를 받친다. 펼치면 폐기된 동작 순서에 취소선이 보인다. 완성이라는 이름 아래에서도 누군가는 종이를 접어 흔들리는 자리를 고쳤다.',
      en: 'Omega’s completed blueprint rules in even the spot where the connector should stand. The chair in the middle of the room appears nowhere on it; a folded revision props up one short leg. Unfold it and there are crossed-out movement instructions. Even under a plan labelled complete, someone folded a sheet of paper to steady what still wobbled.',
    },
  },
]
