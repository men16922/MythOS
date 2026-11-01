// Pack 5 — The Unwritten Sea (DLC 3): three parallel acts at the same place in the run as Acts 4 to 6, taken on the third
// depth. Setting: docs/plans/2026-11-01-dlc3-bible.md.
import type { ActDef } from '../../../engine/types.ts'

export const SEA_ACTS: Record<string, ActDef> = {
  sea_4: {
    act: 4,
    name: { ko: '마른 항구', en: 'The Dry Harbor' },
    subtitle: { ko: '지도 남쪽 끝의 빈칸', en: 'The blank at the south edge of the map' },
    intro: {
      ko: '탑이 무너진 밤, 낡은 노선도 맨 아래에 번호 없는 칸이 하나 보였다. 화물선로는 그 칸까지 이어져 있었다.\n열차가 멈춘 곳은 항구였다. 크레인이 서 있고, 부두가 있고, 배를 묶는 쇠기둥이 줄지어 있다. 물만 없다.\n항구 바닥은 말라서 갈라졌고, 그 위로 작업복을 입은 사람들이 교대 시간을 지켜 걸어간다.\n"배가 언제 오냐고요?" 노인이 웃는다. "그런데 배가 뭡니까?"',
      en: 'The night the Spire fell, an unnumbered square showed at the bottom of an old route map. A freight line ran all the way to it.\nThe train stopped at a harbor. Cranes, wharves, iron bollards in a row. No water.\nThe harbor floor has dried and split, and people in work clothes cross it, keeping their shift times.\n“When’s the ship due?” An old man laughs. “What’s a ship?”',
    },
    backdrop: 'industrial',
    image: 'v2/art/sea4.webp',
  },
  sea_5: {
    act: 5,
    name: { ko: '밀물선', en: 'The Tide Line' },
    subtitle: { ko: '기록에 없는 물이 돌아온다', en: 'Water that no record mentions is coming back' },
    intro: {
      ko: '세관장의 서류철 마지막 장에는 시간표가 있었다. 하루 두 번, 빠짐없이.\n항구 바닥 저쪽에서 회색 줄이 다가온다. 파도 소리는 없다. 웅성거림이 있을 뿐이다.\n물이 발목에 닿자 당신은 모르는 사람의 부엌을 떠올린다. 끓는 냄비, 누군가의 이름, 비 오는 창문.\n기억이 내 것이 아니라는 걸 알아채는 데 한참 걸린다.',
      en: 'The last page of the Commissioner’s file was a timetable. Twice a day, without fail.\nFar across the harbor floor, a gray line is approaching. No sound of waves. Only murmuring.\nWhen the water touches your ankle you remember a kitchen you have never seen. A pot boiling, someone’s name, rain on a window.\nIt takes a long while to notice the memory is not yours.',
    },
    backdrop: 'scrapyard',
    image: 'v2/art/sea5.webp',
  },
  sea_6: {
    act: 6,
    name: { ko: '마지막 등대', en: 'The Last Lighthouse' },
    subtitle: { ko: '수평선을 숨긴 불빛', en: 'The light that hides the horizon' },
    intro: {
      ko: '방파제 끝에서 철탑 길이 시작된다. 안개 속으로 곧게 뻗은 길 양쪽이 온통 물이다.\n멀리서 불빛이 돈다. 한 바퀴에 열두 초. 네오서울의 어떤 기록에도 없는 빛이다.\n불빛이 지나갈 때마다 물이 한 뼘씩 물러난다.\n등대까지는 하룻밤 거리다. 일행 누구도 돌아가자고 말하지 않는다.',
      en: 'At the end of the breakwater a road of steel towers begins. It runs straight into the fog, with water on both sides.\nFar off, a light is turning. Twelve seconds to a sweep. No record in Neo-Seoul mentions it.\nEach time it passes, the water falls back a handspan.\nThe lighthouse is one night’s walk. Nobody in the crew says turn back.',
    },
    backdrop: 'origin',
    image: 'v2/art/sea6.webp',
  },
}
