// Authored GM lines for when no model answers (signed out, AI off, timeout, server fallback).
// Every signed-out player reads these on each act intro and event, so they follow the narrative
// register rule: short screenplay action lines, concrete things, no repeated abstract SF words.
// The pick is seeded by the scene (title, choice, loop, act) — the same scene reads the same, the
// next one reads differently — and Korean particles follow the name (이/가, 은/는, 과/와).

import type { Lang } from '../../engine/types.ts'
import { hashSeed } from '../../engine/rng.ts'
import { josa } from '../common/lang.ts'

export type LocalNarrateKind = 'event' | 'ix_loop_start' | 'chronicle' | 'boss' | 'bond' | 'act_intro' | 'echo' | 'agenda'
type Ctx = Record<string, string | number | boolean | string[] | null | undefined>

interface Names {
  /** subject: 세린이 / Se-rin */
  ga: string
  /** topic: 세린은 */
  neun: string
  /** with: 세린과 */
  wa: string
  /** plain name */
  name: string
}

type Line = (n: Names | null) => string | null

function names(comp: string | undefined): Names | null {
  if (!comp) return null
  return { ga: josa(comp, '이', '가'), neun: josa(comp, '은', '는'), wa: josa(comp, '과', '와'), name: comp }
}

/** First line in seeded order that has what it needs (lines needing a companion return null without one). */
function pickLine(pool: readonly Line[], n: Names | null, seedKey: string): string | null {
  if (pool.length === 0) return null
  const start = hashSeed(seedKey) % pool.length
  for (let i = 0; i < pool.length; i++) {
    const line = (pool[(start + i) % pool.length] as Line)(n)
    if (line) return line
  }
  return null
}

const ordinalKo = (loop: number): string => (loop <= 1 ? '첫' : `${loop}번째`)

/**
 * Acts 4–6 of the Deep Signal and of the Unwritten Sea: concrete lines for the place itself (one prop each, no
 * abstract SF words), keyed by route then act. Unknown routes / later acts fall back to the generic pool below.
 */
function deepIntro(ko: boolean, act: number, route: string, at: string): Line[] | null {
  const key = route.startsWith('sea_') ? route : `deep_${act}`
  const POOLS: Record<string, [Line[], Line[]]> = {
    deep_4: [
      [
        () => `${at}유리 서가 사이로 발소리가 울린다. 책등의 번호가 하나씩 불을 켠다.`,
        () => `${at}색인 카드 한 장이 발밑에 떨어져 있다. 이름 칸이 비어 있다.`,
        (n) => (n ? `${at}${n.ga} 서가에 손을 대려다 멈춘다. “여긴 조용히 걷자.”` : null),
      ],
      [
        () => `${at}Footsteps echo between the glass shelves. The numbers on the spines light up one by one.`,
        () => `${at}An index card lies at your feet. The name field is blank.`,
        (n) => (n ? `${at}${n.name} reaches for a shelf, then stops. “Let’s walk quietly here.”` : null),
      ],
    ],
    deep_5: [
      [
        () => `${at}바람에 쇳가루가 섞여 온다. 녹슨 크레인들이 고개를 숙이고 있다.`,
        () => `${at}버려진 기계들이 눈을 감은 채 같은 꿈을 꾼다. 어디선가 빗소리가 난다.`,
        (n) => (n ? `${at}${n.ga} 고철 더미 사이로 길을 고른다. “밟지 마. 자고 있어.”` : null),
      ],
      [
        () => `${at}The wind carries iron dust. Rusted cranes bow their heads.`,
        () => `${at}Discarded machines dream the same dream with their eyes shut. Somewhere, the sound of rain.`,
        (n) => (n ? `${at}${n.name} picks a way between the scrap heaps. “Don’t step on them. They’re asleep.”` : null),
      ],
    ],
    deep_6: [
      [
        () => `${at}발밑 타일 하나하나가 문장이다. 밟을 때마다 글자가 조금씩 번진다.`,
        () => `${at}본문 옆 여백이 넓다. 누군가 먼저 적어 둔 손글씨가 보인다.`,
        (n) => (n ? `${at}${n.ga} 바닥 글자를 읽다 고개를 든다. “우리 얘기도 여기 있을까.”` : null),
      ],
      [
        () => `${at}Every tile underfoot is a sentence. The letters smear a little with each step.`,
        () => `${at}The margin beside the text is wide. Someone’s handwriting is already there.`,
        (n) => (n ? `${at}${n.name} looks up from the words on the floor. “Are we in here too?”` : null),
      ],
    ],
    sea_4: [
      [
        () => `${at}물 없는 항구. 배를 묶는 쇠기둥만 줄지어 서 있다.`,
        () => `${at}갈라진 항구 바닥 위로 작업복 차림의 사람들이 교대 시간을 지켜 걷는다.`,
        (n) => (n ? `${at}${n.ga} 마른 부두 끝을 내려다본다. “물이 있던 자리야.”` : null),
      ],
      [
        () => `${at}A harbor without water. Only the iron mooring posts stand in a row.`,
        () => `${at}Across the cracked harbor floor, people in work clothes walk to the shift change on time.`,
        (n) => (n ? `${at}${n.name} looks down from the end of the dry wharf. “This is where the water was.”` : null),
      ],
    ],
    sea_5: [
      [
        () => `${at}항구 바닥 저쪽에서 회색 줄이 다가온다. 파도 소리는 없다. 웅성거림뿐이다.`,
        () => `${at}발목에 물이 닿자 모르는 사람의 부엌이 떠오른다. 끓는 냄비, 비 오는 창문.`,
        (n) => (n ? `${at}${n.ga} 밀물을 피해 한 걸음 물러선다. “저 물, 닿지 마.”` : null),
      ],
      [
        () => `${at}Far across the harbor floor, a gray line approaches. No sound of waves. Only murmuring.`,
        () => `${at}When the water touches your ankle, a stranger’s kitchen comes back to you. A pot boiling, a rainy window.`,
        (n) => (n ? `${at}${n.name} steps back from the flood. “Don’t let that water touch you.”` : null),
      ],
    ],
    sea_6: [
      [
        () => `${at}안개 속 철탑 길. 멀리서 무적이 길게 두 번, 짧게 한 번 운다.`,
        () => `${at}등대 빛이 안개를 한 바퀴 쓸고 지나간다. 빛이 지나간 자리에서 조수가 물러난다.`,
        (n) => (n ? `${at}${n.ga} 등대 쪽을 오래 본다. “저기까지 가야 해.”` : null),
      ],
      [
        () => `${at}A steel causeway in the fog. Far off, a foghorn sounds: two long, one short.`,
        () => `${at}The lighthouse beam sweeps the fog once. Where it passes, the tide falls back.`,
        (n) => (n ? `${at}${n.name} looks toward the lighthouse a long time. “That’s where we have to go.”` : null),
      ],
    ],
  }
  const pool = POOLS[key]
  return pool ? (ko ? pool[0] : pool[1]) : null
}

function actIntro(ko: boolean, act: number, loop: number, actName: string, route = ''): Line[] {
  // Deep Signal / the Sea (Act 4+): the ARK Spire lines below belong to Act 3 only, so these name the act itself.
  if (act >= 4) {
    const at = actName ? `${actName}. ` : ''
    const place = deepIntro(ko, act, route, at)
    if (place) return place
    return ko
      ? [
          () => `${at}신호가 한 층 더 깊어진다. 지난 막의 소음이 발밑에서 멀어진다.`,
          () => `${at}여기서부터 지도는 손으로 그려야 한다.`,
          (n) => (n ? `${at}${n.ga} 앞을 본다. “아직 끝이 아니네.”` : null),
        ]
      : [
          () => `${at}The signal goes one layer deeper. The noise of the last act fades under your feet.`,
          () => `${at}From here on, the map is drawn by hand.`,
          (n) => (n ? `${at}${n.name} looks ahead. “Not the end yet.”` : null),
        ]
  }
  if (act === 1) {
    return ko
      ? [
          (n) => (n ? `간판 모서리에서 빗물이 끊어져 떨어진다. ${n.ga} 먼저 골목 끝 드론을 본다. 손가락 두 개 — 왼쪽으로.` : null),
          (n) => `정전 구역의 밤. 불 꺼진 창 사이로 탐조등만 움직인다.${n ? ` ${n.ga} 후드를 깊게 눌러 쓴다.` : ' 아직 아무도 당신 이름을 모른다. 지금은 그게 무기다.'}`,
          (n) => (loop > 1 ? `${ordinalKo(loop)} 접속. 젖은 콘크리트 냄새가 지난번과 똑같다.${n ? ` ${n.neun} 그걸 모른다.` : ''}` : null),
          (n) => `${ordinalKo(loop)} 접속. 발밑 하수구에서 김이 오른다.${n ? ` ${n.ga} 낮게 말한다. “조용히. 저기 순찰.”` : ' 멀리서 순찰 사이렌이 한 번 울리고 끊긴다.'}`,
        ]
      : [
          (n) => (n ? `Rain snaps off the edge of a sign. ${n.name} spots the drone at the end of the alley first. Two fingers — left.` : null),
          (n) => `Night in the blackout zone. Only the searchlights move between the dead windows.${n ? ` ${n.name} pulls the hood lower.` : ' Nobody knows your name yet. For now, that is a weapon.'}`,
          (n) => (loop > 1 ? `Connection ${loop}. The wet concrete smells exactly like last time.${n ? ` ${n.name} doesn't know that.` : ''}` : null),
          (n) => `Connection ${loop}. Steam rises from the drain at your feet.${n ? ` ${n.name}, low: “Quiet. Patrol.”` : ' A patrol siren whoops once in the distance and cuts out.'}`,
        ]
  }
  if (act === 2) {
    return ko
      ? [
          (n) => `데이터 스파이어의 냉각풍이 옷깃을 파고든다. 계단마다 카메라가 하나씩.${n ? ` ${n.ga} 고개를 숙인 채 숫자를 센다.` : ''}`,
          (n) => `여기서부터는 걸음마다 기록이 남는다.${n ? ` ${n.wa} 당신, 둘 다 같은 생각이다 — 빨리 지나가자.` : ' 빨리 지나가는 수밖에 없다.'}`,
          (n) => `유리 난간 너머로 하층부의 불빛이 가라앉아 있다. 위로는 끝이 안 보인다.${n ? ` ${n.ga} 장갑을 고쳐 낀다.` : ''}`,
        ]
      : [
          (n) => `Cooling wind from the Data Spire knifes through your collar. One camera per stair.${n ? ` ${n.name} counts them, head down.` : ''}`,
          (n) => `From here on, every step is logged.${n ? ` You and ${n.name} think the same thing — keep moving.` : ' The only answer is to keep moving.'}`,
          (n) => `Past the glass railing the undercity lights sink out of sight. Above, no end in view.${n ? ` ${n.name} tightens a glove.` : ''}`,
        ]
  }
  return ko
    ? [
        () => 'ARK 첨탑. 빗소리가 끊긴다. 흰 복도 끝에서 붉은 점 하나가 깜박인다.',
        () => '엘리베이터 문이 열린다. 흰 바닥에 발자국 하나 없다. 지금부터 남는 건 당신 것뿐이다.',
        (n) => (n ? `흰 계단, 흰 복도. ${n.ga} 처음으로 당신 뒤에 선다. “여기선 네가 앞이야.”` : null),
      ]
    : [
        () => 'The ARK Spire. The rain goes silent. At the end of a white corridor, a single red dot blinks.',
        () => 'The elevator opens. Not one footprint on the white floor. From here on, the only tracks are yours.',
        (n) => (n ? `White stairs, white halls. For the first time ${n.name} falls in behind you. “You lead here.”` : null),
      ]
}

function eventLines(ko: boolean, ctx: Ctx): Line[] {
  const title = String(ctx.title ?? '')
  const choice = typeof ctx.choice === 'string' ? ctx.choice : ''
  const trace = Number(ctx.trace ?? 0)
  const seenBefore = Number(ctx.seenBefore ?? 0)
  const at = title ? (ko ? `‘${title}’. ` : `“${title}.” `) : ''
  if (choice) {
    if (ctx.success === true) {
      return ko
        ? [
            () => `“${choice}” — 통했다. 상대의 어깨에서 힘이 빠진다.`,
            (n) => (n ? `“${choice}” — 한 박자 빨랐다. ${n.ga} 짧게 고개를 끄덕인다.` : null),
            () => `“${choice}” — 맞아떨어졌다. 아무도 다치지 않았다. 이 동네에선 드문 일이다.`,
          ]
        : [
            () => `“${choice}” — it lands. The tension drains out of their shoulders.`,
            (n) => (n ? `“${choice}” — half a beat ahead. ${n.name} gives a short nod.` : null),
            () => `“${choice}” — it fits. Nobody got hurt. Rare, around here.`,
          ]
    }
    if (ctx.success === false) {
      return ko
        ? [
            () => `“${choice}” — 빗나갔다. 멀리서 경보가 한 번 울리고 끊긴다.`,
            (n) => (n ? `“${choice}” — 어긋났다. ${n.ga} 혀를 찬다. “다음엔 내가 할게.”` : null),
            () => `“${choice}” — 일이 꼬였다. 그래도 아직 서 있다.`,
          ]
        : [
            () => `“${choice}” — it misses. Somewhere an alarm whoops once and dies.`,
            (n) => (n ? `“${choice}” — off. ${n.name} clicks their tongue. “I’ll do it next time.”` : null),
            () => `“${choice}” — it goes sideways. You are still standing.`,
          ]
    }
    return ko
      ? [
          () => `“${choice}” — 정했다. 뒤돌아볼 시간은 없다.`,
          (n) => (n ? `“${choice}.” ${n.neun} 아무 말 없이 따라온다.` : null),
          () => `“${choice}.” 빗물이 발자국을 금방 지운다.`,
        ]
      : [
          () => `“${choice}” — decided. No time to look back.`,
          (n) => (n ? `“${choice}.” ${n.name} follows without a word.` : null),
          () => `“${choice}.” The rain fills your footprints almost at once.`,
        ]
  }
  // A procedural event's cast person (eventOpening.ts proceduralPerson): AI-off players meet them too.
  const person = typeof ctx.person === 'string' ? ctx.person : ''
  if (person) {
    const Person = person.charAt(0).toUpperCase() + person.slice(1)
    return ko
      ? [
          () => `${at}${josa(person, '이', '가')} 먼저 당신을 알아본다.`,
          () => `${at}길 끝에 ${josa(person, '이', '가')} 서 있다. 당신을 기다린 눈치다.`,
        ]
      : [() => `${at}${Person} spots you first.`, () => `${at}Down the way stands ${person}, as if waiting for you.`]
  }
  if (seenBefore > 0) {
    return ko
      ? [
          () => `${at}이 장면, 본 적이 있다. 빗물이 고인 자리까지 똑같다.`,
          (n) => `${at}지난 루프에 여기서 무엇을 골랐는지, 손이 먼저 기억한다.${n ? ` ${n.neun} 그걸 모른다.` : ''}`,
        ]
      : [
          () => `${at}You have seen this. Even the puddles sit in the same places.`,
          (n) => `${at}Your hands remember what you chose here last loop.${n ? ` ${n.name} doesn't.` : ''}`,
        ]
  }
  if (trace >= 45) {
    return ko
      ? [
          (n) => `${at}머리 위로 드론 소리가 두 번 지나간다.${n ? ` ${n.ga} 손바닥을 아래로 내린다 — 낮게.` : ' 고개를 숙인다.'}`,
          () => `${at}가로등이 하나씩 켜진다. 누군가 이 구역을 다시 훑고 있다.`,
        ]
      : [
          (n) => `${at}A drone passes overhead, twice.${n ? ` ${n.name} lowers a palm — stay low.` : ' You keep your head down.'}`,
          () => `${at}Street lamps flick on one by one. Someone is sweeping this block again.`,
        ]
  }
  return ko
    ? [
        (n) => (n ? `${at}${n.ga} 벽에 등을 붙이고 당신을 본다. 결정은 당신 몫이다.` : null),
        () => `${at}비가 그친 틈. 오래 머물 곳은 아니다.`,
        () => `${at}네온 간판 하나가 깜박이다 꺼진다. 주변이 조용해진다.`,
        (n) => `${at}어디선가 발전기가 털털거린다.${n ? ` ${n.ga} 주변을 한 번 훑고 고개를 끄덕인다.` : ''}`,
      ]
    : [
        (n) => (n ? `${at}${n.name} puts their back to the wall and looks at you. Your call.` : null),
        () => `${at}A break in the rain. Not a place to linger.`,
        () => `${at}A neon sign stutters and dies. The street goes quiet.`,
        (n) => `${at}Somewhere a generator coughs.${n ? ` ${n.name} sweeps the area once and nods.` : ''}`,
      ]
}

/** The authored GM line for `kind`, or null when this kind has no local line. */
export function localNarrate(kind: LocalNarrateKind, lang: Lang, context: Ctx): string | null {
  const ko = lang === 'ko'
  const party = Array.isArray(context.party) ? context.party.filter(Boolean) : []
  const n = names(party[0])
  // Chronicle agenda: the authored stage line is the local line (the screen already shows it).
  if (kind === 'agenda') return typeof context.stage === 'string' && context.stage ? context.stage : null
  if (kind === 'act_intro') {
    const act = Number(context.act ?? 1)
    const loop = Number(context.loop ?? 1)
    const route = String(context.route ?? '')
    return pickLine(actIntro(ko, act, loop, String(context.actName ?? ''), route), n, `act|${act}|${route}|${loop}|${n?.name ?? ''}`)
  }
  if (kind === 'event') {
    const key = `event|${String(context.title ?? '')}|${String(context.choice ?? '')}|${String(context.success ?? '')}|${String(context.loop ?? '')}`
    return pickLine(eventLines(ko, context), n, key)
  }
  if (kind === 'ix_loop_start') {
    const loop = Number(context.loop ?? 1)
    return ko
      ? `[IX // 루프 ${loop}] “다시 접속하셨군요. 이번에는 조금 더 오래 버티시길.”`
      : `[IX // Loop ${loop}] “Connected again. Do try to last a little longer this time.”`
  }
  return null
}
