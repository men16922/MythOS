// Mythos 2.0 — AI GM calls (narrate / improvise / companion chat / IX comms) with authored/local fallbacks.
// Never blocks the UI: callers render authored text first and swap/add the GM line when it arrives.
// Every line a model wrote is noted in ui/common/aiLines.ts so the player can report it from Settings.

import type { Improvisation, Lang, StatKey } from '../../engine/types.ts'
import * as net from '../../net/api.ts'
import { noteAiLine } from '../common/aiLines.ts'
import { pickCompanionReply } from './talkLines.ts'

type NarrateKind = 'event' | 'ix_loop_start' | 'chronicle' | 'boss' | 'bond' | 'act_intro' | 'echo'
export type Ctx = Record<string, string | number | boolean | string[] | null | undefined>
interface ImproviseReq {
  lang: Lang
  event: { title: string; text: string; options?: string[] }
  action: string
  stats: Record<StatKey, number>
  act: number
}

/** Player setting (Settings → "AI 대사 사용"): off = no model call at all, every caller takes its authored path. */
let aiEnabled = true
export function setAiEnabled(on: boolean): void {
  aiEnabled = on
}
export function aiOn(): boolean {
  return aiEnabled
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((res) => window.setTimeout(() => res(null), ms))])
}

/** Local models sometimes leak byte-fallback tokens ("<0xEC><0x87><0xB3>") instead of the character they
 *  encode. Decode runs of them back to UTF-8; drop anything that still does not decode cleanly. */
function cleanGmText(text: string): string {
  return text
    .replace(/(?:<0x[0-9A-Fa-f]{2}>)+/g, (run) => {
      const bytes = new Uint8Array((run.match(/[0-9A-Fa-f]{2}(?=>)/g) ?? []).map((h) => parseInt(h, 16)))
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch {
        return ''
      }
    })
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function cleanText(t: Improvisation['successText']): Improvisation['successText'] {
  return { ko: cleanGmText(t.ko ?? ''), en: cleanGmText(t.en ?? '') }
}

function localNarrate(kind: NarrateKind, lang: Lang, context: Ctx): string | null {
  const ko = lang === 'ko'
  const party = Array.isArray(context.party) ? context.party.filter(Boolean) : []
  const comp = party[0]
  if (kind === 'act_intro') {
    const act = Number(context.act ?? 1)
    const loop = Number(context.loop ?? 1)
    if (act === 1) {
      return ko
        ? `${loop}번째 루프의 빗물이 네오-서울 하층부의 네온 위로 떨어진다.${comp ? ` ${comp}의 시선이 먼저 골목 끝 감시 드론을 짚어낸다.` : ' 신호는 아직 희미하지만 분명히 살아 있다.'}`
        : `Rain of Loop ${loop} hits the neon of Neo-Seoul's undercity.${comp ? ` ${comp}'s eyes lock onto the patrol drone at the end of the alley first.` : ' The signal is faint, but unmistakably alive.'}`
    }
    if (act === 2) {
      return ko
        ? `데이터 스파이어의 냉각풍이 귓가를 스친다.${comp ? ` ${comp}와(과) 나란히 선 당신 위로 IX의 감시망이 촘촘히 좁혀온다.` : ' 여기서부터는 모든 발걸음이 기록된다.'}`
        : `Cooling winds from the Data Spire cut past your ears.${comp ? ` Above you and ${comp}, IX's surveillance lattice tightens.` : ' Every step from here is logged.'}`
    }
    return ko
      ? `아크 코어 심장부. 모든 루프의 기억과 반향이 이 한 점으로 수렴한다.`
      : `The heart of the ARK Core. Every loop's memory and echo converges on this single point.`
  }
  if (kind === 'event') {
    const title = String(context.title ?? '')
    const choice = typeof context.choice === 'string' ? context.choice : ''
    const trace = Number(context.trace ?? 0)
    const seenBefore = Number(context.seenBefore ?? 0)
    if (choice) {
      const success = context.success
      if (success === true) {
        return ko
          ? `“${choice}” — 망설임 없는 판단이 스파이어의 예측 모델을 한 박자 앞질렀다.${comp ? ` ${comp}도 짧게 고개를 끄덕인다.` : ''}`
          : `“${choice}” — an unflinching call that beats the Spire's prediction model by half a beat.${comp ? ` ${comp} gives a short nod.` : ''}`
      }
      if (success === false) {
        return ko
          ? `“${choice}” — 어긋난 박자 사이로 경보 파형이 스쳤지만, 아직 숨을 고를 틈은 남아 있다.`
          : `“${choice}” — an alarm waveform grazes past the missed beat, though there is still room to steady your breath.`
      }
      return ko
        ? `선택의 여파가 빗물 고인 아스팔트 위로 잔향처럼 번진다.${comp ? ` ${comp}이(가) 주변 신호를 다시 스캔한다.` : ''}`
        : `The aftermath of your choice ripples across the rain-slick asphalt.${comp ? ` ${comp} scans the surrounding frequencies again.` : ''}`
    }
    if (seenBefore > 0) {
      return ko
        ? `이미 지난 루프에서 스쳐 간 ‘${title}’의 잔상이 겹쳐 보인다.${comp ? ` 옆에 선 ${comp}의 숨결만이 지금 이 순간이 새로운 루프임을 일깨운다.` : ' 이번에는 다른 결말을 새길 차례다.'}`
        : `An afterimage of "${title}" from an earlier loop overlaps the scene.${comp ? ` Only ${comp}'s presence beside you marks this moment as new.` : ' This time, the outcome is yours to rewrite.'}`
    }
    if (trace >= 45) {
      return ko
        ? `추적 수치(${trace})가 위험역에 가까워지며 구역 전체의 전류가 미세하게 떨린다.${comp ? ` ${comp}이(가) 낮게 경계 신호를 보낸다.` : ''}`
        : `With Trace at ${trace}, the district's current hums on edge.${comp ? ` ${comp} signals a quiet warning.` : ''}`
    }
    return ko
      ? `${title ? `‘${title}’ 현장.` : '현장 진입.'} 네온 그림자 너머로 선택의 대가가 조용히 저울질되고 있다.${comp ? ` ${comp}이(가) 당신의 다음 신호를 기다린다.` : ''}`
      : `${title ?AtScene(title) : 'On site.'} Behind the neon shadows, the weight of the next move hangs in the balance.${comp ? ` ${comp} waits on your signal.` : ''}`
  }
  if (kind === 'ix_loop_start') {
    const loop = Number(context.loop ?? 1)
    return ko
      ? `[IX // 루프 ${loop}] “다시 접속하셨군요. 이번 주파수는 이전보다 조금 더 흥미로운 파형을 그리길 기대하겠습니다.”`
      : `[IX // Loop ${loop}] “Connected again. Let us see if your frequency traces a more interesting waveform this time.”`
  }
  return null
}

function AtScene(title: string): string {
  return `At "${title}".`
}

/** Returns the GM's line, or contextual local GM narration when the backend is skipped/unreachable. */
export async function narrate(kind: NarrateKind, lang: Lang, context: Ctx, timeoutMs = 12000, acceptFallback = false): Promise<string | null> {
  if (!aiEnabled) return null
  try {
    const res = await withTimeout(net.narrate({ kind, lang, context }), timeoutMs)
    if (!res) return localNarrate(kind, lang, context)
    if (res.source === 'fallback' && !acceptFallback) return localNarrate(kind, lang, context)
    const text = res.text ? cleanGmText(res.text) || null : null
    if (text && res.source === 'llm') noteAiLine({ route: 'narrate', kind, lang, text })
    return text ?? localNarrate(kind, lang, context)
  } catch {
    return localNarrate(kind, lang, context)
  }
}

interface CompanionReplyReq {
  lang: Lang
  companion: string
  message: string
  history: net.TalkTurn[]
  context: Ctx
}

/** A companion's chat reply. Always resolves: the LLM line, the server's authored fallback, or (backend
 *  unreachable / ~11 s timeout) the client's own in-voice pool. Never changes game state. */
export async function companionReply(req: CompanionReplyReq, signal?: AbortSignal): Promise<{ text: string; source: 'llm' | 'fallback' | 'local' }> {
  try {
    if (!aiEnabled) throw new Error('ai off') // straight to the authored in-voice pool
    const res = await withTimeout(net.talk({ mode: 'companion', ...req }, { signal }), 11500)
    const text = res ? cleanGmText(res.text) : ''
    if (res && text) {
      if (res.source === 'llm') noteAiLine({ route: 'talk', kind: `companion:${req.companion}`, lang: req.lang, text })
      return { text, source: res.source }
    }
  } catch {
    /* fall through to the local pool */
  }
  const said = req.history.filter((t) => t.role === 'companion').map((t) => t.text)
  return { text: pickCompanionReply(req.companion, req.lang, said, req.history.length + req.message.length), source: 'local' }
}

/** IX's LLM comms line for a combat moment, or null (timeout, no backend, server fallback). The caller is
 *  already showing an authored line and swaps this in once. */
export async function ixLine(trigger: net.IxTrigger, lang: Lang, context: Ctx, timeoutMs = 5500, signal?: AbortSignal): Promise<string | null> {
  if (!aiEnabled) return null
  try {
    const res = await withTimeout(net.talk({ mode: 'ix', lang, trigger, context }, { signal, timeoutMs }), timeoutMs)
    if (!res || res.source !== 'llm') return null
    const text = cleanGmText(res.text) || null
    if (text) noteAiLine({ route: 'talk', kind: `ix:${trigger}`, lang, text })
    return text
  } catch {
    return null
  }
}

/** A talking enemy's AI taunt, or null (AI off, timeout, no backend, no model line). The caller already shows
 *  the authored line and swaps this in once. */
export async function enemyTaunt(enemy: string, moment: 'hurt' | 'winning', lang: Lang, timeoutMs = 3500, signal?: AbortSignal): Promise<string | null> {
  if (!aiEnabled) return null
  try {
    const res = await withTimeout(net.talk({ mode: 'enemy', lang, enemy, moment }, { signal, timeoutMs }), timeoutMs)
    if (!res || res.source !== 'llm') return null
    const text = cleanGmText(res.text) || null
    if (text) noteAiLine({ route: 'talk', kind: `enemy:${enemy}:${moment}`, lang, text })
    return text
  } catch {
    return null
  }
}

const KEYWORDS: [StatKey, RegExp][] = [
  ['int', /해킹|분석|코드|프로그램|접속|단말|회로|우회|hack|analy|code|program|terminal|circuit|decrypt|bypass|override/i],
  ['cha', /설득|말|협상|부탁|속이|거짓|웃|매수|persuade|talk|negotiat|ask|lie|bluff|bribe|charm|convince/i],
  ['obs', /살피|관찰|찾|조사|엿|기다|듣|look|search|observe|inspect|watch|listen|wait|scan|study/i],
  ['agi', /달리|도망|숨|뛰|기어|훔|피하|잠입|run|flee|hide|jump|climb|steal|dodge|sneak|slip/i],
  ['str', /부수|때리|밀|들|싸우|위협|억지|강제|smash|break|hit|punch|push|lift|fight|force|threat|kick/i],
]

const REWARD_BY_STAT: Record<StatKey, Improvisation['reward']> = { str: 'credits', agi: 'trace_down', int: 'card', cha: 'credits', obs: 'heal' }
const RISK_BY_STAT: Record<StatKey, Improvisation['risk']> = { str: 'hp', agi: 'trace', int: 'trace', cha: 'credits', obs: 'hp' }

const IMPROV_TEXT: Record<StatKey, { win: { ko: string; en: string }; lose: { ko: string; en: string } }> = {
  int: {
    win: {
      ko: '회로망의 빈틈을 정확히 파고들었다. 방화벽이 무음으로 열리며 숨겨진 데이터 패킷이 손안에 떨어진다.',
      en: 'You thread the gap in the circuit. The firewall opens silently, dropping a hidden data packet into your hands.',
    },
    lose: {
      ko: '역추적 펄스가 손끝을 스쳤다. 급히 접속을 끊었지만 IX의 감시망에 파문이 남았다.',
      en: 'A counter-trace pulse grazes your fingertips. You jack out fast, but ripples linger on the Spire grid.',
    },
  },
  cha: {
    win: {
      ko: '흔들림 없는 어조가 상대의 경계를 허물었다. 보이지 않던 거래 창구가 당신 앞에 열린다.',
      en: 'Your steady tone disarms their guard. An off-the-books channel opens in your favor.',
    },
    lose: {
      ko: '눈빛에서 의도가 읽혔다. 자리를 빠져나오느라 적잖은 대가를 치러야 했다.',
      en: 'They read the angle in your eyes. Backing out cleanly costs you more than planned.',
    },
  },
  obs: {
    win: {
      ko: '모두가 지나친 미세한 신호의 어긋남을 포착했다. 호흡을 가다듬고 가장 안전한 경로를 확보한다.',
      en: 'You catch the subtle break in the pattern everyone else missed, steadying your breath along a safe vector.',
    },
    lose: {
      ko: '미끼 신호에 시선이 묶인 사이 사각지대에서 충격파가 스쳤다.',
      en: 'A decoy signal holds your gaze a beat too long, and a shockwave grazes you from the blind spot.',
    },
  },
  agi: {
    win: {
      ko: '감시 레이저가 교차하는 찰나의 사각으로 몸을 날렸다. 흔적조차 남기지 않고 구역을 빠져나간다.',
      en: 'You slip through the split-second blind spot between sweep lasers, leaving zero trace behind.',
    },
    lose: {
      ko: '착지 순간 빗물 고인 배관이 울렸다. 센서 드론의 서치라이트가 등 뒤를 훑는다.',
      en: 'Rain-slick piping rings out on landing. A sensor drone sweeps its searchlight across your back.',
    },
  },
  str: {
    win: {
      ko: '거침없는 일격으로 봉인 장치를 단숨에 우그러뜨렸다. 파편 사이로 전리품이 쏟아진다.',
      en: 'One decisive strike buckles the lock assembly. Salvage spills out from the shattered housing.',
    },
    lose: {
      ko: '장갑판의 반동이 예상보다 거셌다. 어깨에 전해진 충격을 털어내며 물러선다.',
      en: 'The armor plate kicks back harder than expected. You shake off the jolt and step back.',
    },
  },
}

function localImprovise(action: string): Improvisation {
  const stat = KEYWORDS.find(([, re]) => re.test(action))?.[0] ?? 'obs'
  const lines = IMPROV_TEXT[stat]
  return {
    action,
    stat,
    dc: 6,
    reward: REWARD_BY_STAT[stat],
    risk: RISK_BY_STAT[stat],
    successText: lines.win,
    failureText: lines.lose,
  }
}

const VALID_STATS: StatKey[] = ['str', 'agi', 'int', 'cha', 'obs']
const VALID_REWARD: Improvisation['reward'][] = ['credits', 'heal', 'card', 'trace_down', 'implant']
const VALID_RISK: Improvisation['risk'][] = ['hp', 'trace', 'credits']

/** Ask the GM to adjudicate a free action; falls back to the local keyword judge. Always resolves.
 *  `ai`: the model wrote the outcome texts (the comms log marks them). */
export async function improvise(req: ImproviseReq): Promise<{ imp: Improvisation; ai: boolean }> {
  const local = localImprovise(req.action)
  if (!aiEnabled) return { imp: local, ai: false }
  try {
    const res: Partial<net.ImproviseResult> | null = await withTimeout(net.improvise(req), 16000)
    if (!res) return { imp: local, ai: false }
    const stat = VALID_STATS.includes(res.stat as StatKey) ? (res.stat as StatKey) : local.stat
    const dc = Math.max(3, Math.min(9, Math.round(Number(res.dc) || local.dc)))
    let reward = VALID_REWARD.includes(res.reward as Improvisation['reward']) ? (res.reward as Improvisation['reward']) : local.reward
    if (reward === 'implant' && dc < 7) reward = 'credits'
    const risk = VALID_RISK.includes(res.risk as Improvisation['risk']) ? (res.risk as Improvisation['risk']) : local.risk
    const successText = res.successText?.ko || res.successText?.en ? cleanText(res.successText) : local.successText
    const failureText = res.failureText?.ko || res.failureText?.en ? cleanText(res.failureText) : local.failureText
    if (res.source === 'llm') {
      const ko = req.lang === 'ko'
      const pick = (t: Improvisation['successText']) => (ko ? t.ko || t.en : t.en || t.ko)
      const text = `${ko ? '성공' : 'Success'}: ${pick(successText)}\n${ko ? '실패' : 'Failure'}: ${pick(failureText)}`
      noteAiLine({ route: 'improvise', kind: 'event', lang: req.lang, text })
    }
    return { imp: { action: req.action, stat, dc, reward, risk, successText, failureText }, ai: res.source === 'llm' }
  } catch {
    return { imp: local, ai: false }
  }
}
