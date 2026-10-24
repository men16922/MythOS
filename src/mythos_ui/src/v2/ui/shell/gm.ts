// Mythos 2.0 — AI GM calls (narrate / improvise / companion chat / IX comms) with authored/local fallbacks.
// Never blocks the UI: callers render authored text first and swap/add the GM line when it arrives.
// Every line a model wrote is noted in ui/common/aiLines.ts so the player can report it from Settings.

import type { Improvisation, Lang, StatKey } from '../../engine/types.ts'
import * as net from '../../net/api.ts'
import { noteAiLine } from '../common/aiLines.ts'
import { pickCompanionReply } from './talkLines.ts'
import { localNarrate } from './localGm.ts'

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

/** A GM line and whether a model wrote it (`ai`); false for the local contextual narration and server fallbacks. */
export interface GmLine {
  text: string
  ai: boolean
}

function localLine(kind: NarrateKind, lang: Lang, context: Ctx): GmLine | null {
  const text = localNarrate(kind, lang, context)
  return text ? { text, ai: false } : null
}

/** The GM's line with its provenance, or contextual local GM narration when the backend is skipped/unreachable. */
export async function narrateLine(kind: NarrateKind, lang: Lang, context: Ctx, timeoutMs = 16000, acceptFallback = false): Promise<GmLine | null> {
  if (!aiEnabled) return null
  try {
    const res = await withTimeout(net.narrate({ kind, lang, context }), timeoutMs)
    if (!res) return localLine(kind, lang, context)
    if (res.source === 'fallback' && !acceptFallback) return localLine(kind, lang, context)
    const text = res.text ? cleanGmText(res.text) || null : null
    if (!text) return localLine(kind, lang, context)
    const ai = res.source === 'llm'
    if (ai) noteAiLine({ route: 'narrate', kind, lang, text })
    return { text, ai }
  } catch {
    return localLine(kind, lang, context)
  }
}

/** `narrateLine` for callers that only need the text. */
export async function narrate(kind: NarrateKind, lang: Lang, context: Ctx, timeoutMs = 16000, acceptFallback = false): Promise<string | null> {
  return (await narrateLine(kind, lang, context, timeoutMs, acceptFallback))?.text ?? null
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
