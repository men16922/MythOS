// Mythos 2.0 — AI GM calls (narrate / improvise) with authored/local fallbacks.
// Never blocks the UI: callers render authored text first and swap/add the GM line when it arrives.

import type { Improvisation, Lang, StatKey } from '../../engine/types.ts'
import * as net from '../../net/api.ts'

type NarrateKind = 'event' | 'ix_loop_start' | 'chronicle' | 'boss' | 'bond' | 'act_intro'
type Ctx = Record<string, string | number | boolean | string[] | null | undefined>
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

/** Returns the GM's line, or null (no backend, timeout, or a server fallback when `acceptFallback` is off). */
export async function narrate(kind: NarrateKind, lang: Lang, context: Ctx, timeoutMs = 12000, acceptFallback = false): Promise<string | null> {
  try {
    const res = await withTimeout(net.narrate({ kind, lang, context }), timeoutMs)
    if (!res) return null
    if (res.source === 'fallback' && !acceptFallback) return null
    return res.text?.trim() || null
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
      successText: res.successText?.ko || res.successText?.en ? res.successText : local.successText,
      failureText: res.failureText?.ko || res.failureText?.en ? res.failureText : local.failureText,
    }
  } catch {
    return local
  }
}
