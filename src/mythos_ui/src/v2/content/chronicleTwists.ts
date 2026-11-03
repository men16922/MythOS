// Chronicle twist bank (W4, 1.0 twist_bank): three truths, two drawn per campaign, revealed a beat at a time under the
// chapter titles (engine/chronicle.ts twistBeats): chapter 2 → first twist, 3 → second, 4 → first, 5 → second, 6 →
// both endings. Which two, and in what order, depends on the campaign, so a second campaign learns things differently.
import type { ChronicleTwistDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const CHRONICLE_TWISTS: ChronicleTwistDef[] = [
  {
    id: 'twist_serin',
    beats: [
      t('세린의 통신기에서 관리망 주파수가 한 번 새어 나온다. 세린은 잡음이라고 한다.', 'A grid frequency leaks once from Se-rin’s comm. She calls it static.'),
      t('세린이 IX의 순찰표를 미리 알고 있다. 어떻게 아느냐고 묻자 대답 대신 지도를 접는다.', 'Se-rin knows IX’s patrol sheet in advance. Asked how, she folds the map instead of answering.'),
      t('세린은 관리망의 연락책이었다. 매번 당신이 살아남을 만큼만 정보를 흘렸다. 오늘 처음으로 전부 넘긴다.', 'Se-rin was the grid’s contact. Each time she leaked just enough for you to live. Today, for the first time, she hands over everything.'),
    ],
  },
  {
    id: 'twist_grid',
    beats: [
      t('최적화 대기열의 숫자가 줄지 않는다. 처리된 사람은 어디로도 가지 않는다.', 'The optimization queue never shrinks. The processed go nowhere.'),
      t('처리된 이름들이 서버 깊은 곳에 그대로 남아 있다. 지운 것이 아니라 옮긴 것이다.', 'The processed names are all still there, deep in the servers. Not erased. Moved.'),
      t('관리망은 지우고 있던 게 아니었다. 도시가 무너질 날에 대비해 사람들을 기억으로 접어 두고 있었다.', 'The grid was never erasing. It was folding people into memory against the day the city falls.'),
    ],
  },
  {
    id: 'twist_self',
    beats: [
      t('당신의 접속 기록에는 첫 줄이 없다. 두 번째 줄부터 시작한다.', 'Your connection record has no first line. It begins at the second.'),
      t('IX가 당신을 부르는 번호가 명단의 마지막 번호보다 작다.', 'The number IX calls you by is lower than the last number on the list.'),
      t('당신은 접속자가 아니라 첫 번째 기록이다. 이 도시가 반복될 때마다 다시 쓰이는.', 'You are not a connector. You are the first record, rewritten every time the city repeats.'),
    ],
  },
]
