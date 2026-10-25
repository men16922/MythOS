// The three acts of a loop. Intro text is shown on the act-intro screen (authored, instant).
import type { ActDef, ActId } from '../engine/types.ts'

export const ACTS: Record<ActId, ActDef> = {
  1: {
    act: 1,
    name: { ko: 'C-17 블랙아웃', en: 'C-17 Blackout' },
    subtitle: { ko: '정전 구역의 첫날 밤', en: 'First night in the dark zone' },
    intro: {
      ko: '빗물이 목덜미를 타고 흘러든다. 젖은 콘크리트. 꺼진 간판. 드론 한 대가 붉은 불빛으로 골목을 쓸고 지나간다.\n당신은 어떤 명단에도 없다. 점수도, 이름도 없다. 도시는 당신을 오류라 부른다.\n누군가 손목을 낚아챈다. “등록 안 됐지? 그럼 아직 사람이네. 뛰어.”\n정전 구역 끝, 지하로 내려가는 입구를 해태 진압 전차가 틀어막고 있다. 거기까지 살아서 가라.',
      en: 'Rain runs down the back of your neck. Wet concrete. Dead signs. A drone sweeps the alley with red light and moves on.\nYou are on no list. No score, no name. The city calls you an error.\nSomeone grabs your wrist. “Not registered? Then you’re still a person. Run.”\nAt the edge of the blackout, a HAETAE suppression tank guards the way underground. Get there alive.',
    },
    backdrop: 'streets',
    image: 'v2/art/act1.webp',
  },
  2: {
    act: 2,
    name: { ko: '야시장 하층', en: 'Undercity Market' },
    subtitle: { ko: '빚과 기억이 거래되는 곳', en: 'Where debts and memories change hands' },
    intro: {
      ko: '환승층 계단을 내려가면 공기부터 달라진다. 기름 냄새, 향 냄새, 젖은 방수포 냄새. 한강 부교 위에서 등불 시장이 출렁인다. 흥정 소리 사이로 기억이 팔리고 빚이 오간다.\n사람들은 터널 깊은 곳의 무언가를 ‘잔향 포식자’라 부른다. 지워진 사람들이 남긴 것을 먹고 자라는 것. 그놈이 시장 밑 하나뿐인 길목에 똬리를 틀었다.\n하층을 가로질러, 첨탑으로 가는 길을 찾아라.',
      en: 'Down the transfer-level stairs, the air changes: engine oil, incense, wet tarpaulin. A lantern market sways on the Han River pontoons. Between the haggling, memories are sold and debts change hands.\nPeople call the thing deep in the tunnels the Echo Eater — something that grows fat on what the erased leave behind. It has coiled itself around the only passage under the market.\nCross the undercity. Find the way to the Spire.',
    },
    backdrop: 'undercity',
    image: 'v2/art/act2.webp',
  },
  3: {
    act: 3,
    name: { ko: 'ARK 첨탑', en: 'The ARK Spire' },
    subtitle: { ko: '백색의 정상', en: 'The white summit' },
    intro: {
      ko: '첨탑에 가까워질수록 빗소리가 지워진다. 흰 계단, 흰 복도, 흰 침묵. 아래층마다 선반이 끝없이 이어지고, 칸칸이 누군가의 기억이 잠들어 있다.\n꼭대기에서 붉은 점 하나가 기다린다. 관리자 IX. 언성을 높이는 법이 없다. 다만 아주 정중하게, 당신을 명단의 마지막 줄로 옮길 것이다.\n올라가라. 이번 루프의 끝은 당신이 정한다.',
      en: 'The closer you get to the Spire, the quieter the rain. White stairs, white corridors, white silence. Below are endless shelves, and on each one someone’s memory sleeps.\nAt the top, a single red point is waiting. Administrator IX. It does not get angry. It will simply, very politely, move you to the last line of the list.\nClimb. This time, you decide how the loop ends.',
    },
    backdrop: 'spire',
    image: 'v2/art/act3.webp',
  },
}
