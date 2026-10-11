// Mythos 2.0 — AI GM calls (narrate / improvise / companion chat / IX comms) with authored/local fallbacks.
// Never blocks the UI: callers render authored text first and swap/add the GM line when it arrives.

import type { Improvisation, Lang, StatKey } from '../../engine/types.ts'
import * as net from '../../net/api.ts'
import { pickCompanionReply } from './talkLines.ts'

type NarrateKind = 'event' | 'ix_loop_start' | 'chronicle' | 'boss' | 'bond' | 'act_intro'
export type Ctx = Record<string, string | number | boolean | string[] | null | undefined>
interface ImproviseReq {
  lang: Lang
  event: { title: string; text: string; options?: string[] }
  action: string
  stats: Record<StatKey, number>
  act: number
}


function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((res) => window.setTimeout(() => res(null), ms))])
}

/** Local models sometimes leak byte-fallback tokens ("<0xEC><0x87><0xB3>") instead of the character they
 *  encode. Decode runs of them back to UTF-8; drop anything that still does not decode cleanly. */
export function cleanGmText(text: string): string {
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

/** Returns the GM's line, or null (no backend, timeout, or a server fallback when `acceptFallback` is off). */
export async function narrate(kind: NarrateKind, lang: Lang, context: Ctx, timeoutMs = 12000, acceptFallback = false): Promise<string | null> {
  try {
    const res = await withTimeout(net.narrate({ kind, lang, context }), timeoutMs)
    if (!res) return null
    if (res.source === 'fallback' && !acceptFallback) return null
    return res.text ? cleanGmText(res.text) || null : null
  } catch {
    return null
  }
}

export interface CompanionReplyReq {
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
    const res = await withTimeout(net.talk({ mode: 'companion', ...req }, { signal }), 11500)
    const text = res ? cleanGmText(res.text) : ''
    if (res && text) return { text, source: res.source }
  } catch {
    /* fall through to the local pool */
  }
  const said = req.history.filter((t) => t.role === 'companion').map((t) => t.text)
  return { text: pickCompanionReply(req.companion, req.lang, said, req.history.length + req.message.length), source: 'local' }
}

/** IX's LLM comms line for a combat moment, or null (timeout, no backend, server fallback). The caller is
 *  already showing an authored line and swaps this in once. */
export async function ixLine(trigger: net.IxTrigger, lang: Lang, context: Ctx, timeoutMs = 4000, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await withTimeout(net.talk({ mode: 'ix', lang, trigger, context }, { signal, timeoutMs }), timeoutMs)
    if (!res || res.source !== 'llm') return null
    return cleanGmText(res.text) || null
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

export function localImprovise(action: string): Improvisation {
  const stat = KEYWORDS.find(([, re]) => re.test(action))?.[0] ?? 'obs'
  return {
    action,
    stat,
    dc: 6,
    reward: REWARD_BY_STAT[stat],
    risk: RISK_BY_STAT[stat],
    successText: { ko: '계획대로 풀렸다. 틈이 생겼고, 당신은 그 틈을 놓치지 않았다.', en: 'It works. A gap opens, and you take it.' },
    failureText: { ko: '어긋났다. 대가를 치르고 물러선다.', en: 'It goes wrong. You pay for it and back off.' },
  }
}

const VALID_STATS: StatKey[] = ['str', 'agi', 'int', 'cha', 'obs']
const VALID_REWARD: Improvisation['reward'][] = ['credits', 'heal', 'card', 'trace_down', 'implant']
const VALID_RISK: Improvisation['risk'][] = ['hp', 'trace', 'credits']

/** Ask the GM to adjudicate a free action; falls back to the local keyword judge. Always resolves. */
export async function improvise(req: ImproviseReq): Promise<Improvisation> {
  const local = localImprovise(req.action)
  try {
    const res: Partial<Improvisation> | null = await withTimeout(net.improvise(req), 16000)
    if (!res) return local
    const stat = VALID_STATS.includes(res.stat as StatKey) ? (res.stat as StatKey) : local.stat
    const dc = Math.max(3, Math.min(9, Math.round(Number(res.dc) || local.dc)))
    let reward = VALID_REWARD.includes(res.reward as Improvisation['reward']) ? (res.reward as Improvisation['reward']) : local.reward
    if (reward === 'implant' && dc < 7) reward = 'credits'
    const risk = VALID_RISK.includes(res.risk as Improvisation['risk']) ? (res.risk as Improvisation['risk']) : local.risk
    return {
      action: req.action,
      stat,
      dc,
      reward,
      risk,
      successText: res.successText?.ko || res.successText?.en ? cleanText(res.successText) : local.successText,
      failureText: res.failureText?.ko || res.failureText?.en ? cleanText(res.failureText) : local.failureText,
    }
  } catch {
    return local
  }
}
