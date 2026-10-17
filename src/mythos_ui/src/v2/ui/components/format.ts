// Mythos 2.0 — small pure UI helpers shared by shell screens (no React here).
import type { CardDef, ContentRegistry, Lang, NodeKind, RunEffect, RunScreen, StatKey, Text } from '../../engine/types.ts'
import { L, STAT_LABEL, tr } from '../common/lang.ts'

export type TraceTier = 'quiet' | 'alert' | 'hunted' | 'purge'

export function traceTier(trace: number): TraceTier {
  if (trace >= 100) return 'purge'
  if (trace >= 66) return 'hunted'
  if (trace >= 33) return 'alert'
  return 'quiet'
}

export const TRACE_LABEL: Record<TraceTier, Text> = {
  quiet: L('잠잠', 'Quiet'),
  alert: L('경계', 'Alert'),
  hunted: L('수배', 'Hunted'),
  purge: L('숙청', 'PURGE'),
}

export const TRACE_EFFECT: Record<TraceTier, Text> = {
  quiet: L('IX가 아직 당신을 보지 못했다.', 'IX has not noticed you yet.'),
  alert: L('적 체력 +15%', 'Enemies +15% HP'),
  hunted: L('적 체력 +25%, 피해 +1', 'Enemies +25% HP, +1 damage'),
  purge: L('모든 전투에 숙청 드론 합류', 'A purge drone joins every fight'),
}

export const NODE_LABEL: Record<NodeKind, Text> = {
  combat: L('전투', 'Fight'),
  elite: L('정예 전투', 'Elite fight'),
  event: L('사건', 'Event'),
  shop: L('암시장', 'Black market'),
  rest: L('은신처', 'Safehouse'),
  treasure: L('보급 상자', 'Supply cache'),
  boss: L('보스', 'Boss'),
  district: L('구역 탐색', 'District'),
}

export const NODE_HINT: Record<NodeKind, Text> = {
  combat: L('일반 적과 교전. 승리하면 크레딧과 카드 보상.', 'Engage regular enemies. Credits and a card reward.'),
  elite: L('강력한 적. 위험하지만 임플란트를 얻을 수 있다.', 'A dangerous foe. Drops an implant.'),
  event: L('무슨 일이 기다리는지 모른다. 선택에 대가가 따른다.', 'Unknown situation. Choices have real costs.'),
  shop: L('카드, 임플란트, 소모품을 산다. 카드 제거와 추적도 낮추기.', 'Buy cards, implants, consumables. Remove a card or scrub Trace.'),
  rest: L('회복, 카드 강화, 추적도 낮추기, 또는 동료와 유대.', 'Heal, upgrade a card, scrub Trace, or bond with a companion.'),
  treasure: L('잠긴 보급 상자. 임플란트 하나가 들어 있다.', 'A locked cache with an implant inside.'),
  boss: L('이 구역의 지배자.', 'The ruler of this sector.'),
  district: L('사람과 장소가 있는 지역. 둘러보고, 말을 걸고, 판정을 굴린다. (Signal+)', 'A place with people in it. Explore, talk, roll the dice. (Signal+)'),
}

export function statLabel(stat: StatKey, lang: Lang): string {
  return tr(STAT_LABEL[stat], lang)
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`)

export interface EffectChip {
  text: string
  tone: 'good' | 'bad' | 'warn' | 'gold' | 'echo' | 'neutral'
}

/** Human chips for run effects (event outcomes, costs). */
export function effectChips(effects: RunEffect[], C: ContentRegistry, lang: Lang): EffectChip[] {
  const s = (ko: string, en: string) => (lang === 'ko' ? ko : en)
  const out: EffectChip[] = []
  for (const e of effects) {
    switch (e.kind) {
      case 'hp':
        out.push({ text: `${sign(e.amount)} HP`, tone: e.amount >= 0 ? 'good' : 'bad' })
        break
      case 'maxHp':
        out.push({ text: s(`최대 HP ${sign(e.amount)}`, `${sign(e.amount)} Max HP`), tone: e.amount >= 0 ? 'good' : 'bad' })
        break
      case 'heal_party':
        out.push({ text: s(`파티 회복 ${e.amount}`, `Party heals ${e.amount}`), tone: 'good' })
        break
      case 'credits':
        out.push({ text: `${sign(e.amount)} ₵`, tone: e.amount >= 0 ? 'gold' : 'bad' })
        break
      case 'trace':
        out.push({ text: s(`추적 ${sign(e.amount)}`, `${sign(e.amount)} Trace`), tone: e.amount > 0 ? 'warn' : 'good' })
        break
      case 'card': {
        const def = C.cards[e.cardId]
        out.push({ text: def ? `+ ${tr(def.name, lang)}` : s('+ 카드', '+ card'), tone: 'good' })
        break
      }
      case 'card_choice':
        out.push({ text: s('카드 선택', 'Choose a card'), tone: 'good' })
        break
      case 'remove_card':
        out.push({ text: s(`카드 제거 ${e.count}`, `Remove ${e.count} card`), tone: 'good' })
        break
      case 'upgrade_card':
        out.push({ text: s(`카드 강화 ${e.count}`, `Upgrade ${e.count} card`), tone: 'good' })
        break
      case 'implant': {
        const def = e.implantId ? C.implants[e.implantId] : undefined
        out.push({ text: def ? `+ ${tr(def.name, lang)}` : s('+ 임플란트', '+ implant'), tone: 'gold' })
        break
      }
      case 'consumable': {
        const def = e.id ? C.consumables[e.id] : undefined
        out.push({ text: def ? `+ ${tr(def.name, lang)}` : s('+ 소모품', '+ consumable'), tone: 'good' })
        break
      }
      case 'companion': {
        const def = C.companions[e.id]
        out.push({ text: s(`${def ? tr(def.name, lang) : '동료'} 합류`, `${def ? tr(def.name, lang) : 'Companion'} joins`), tone: 'gold' })
        break
      }
      case 'bond': {
        const def = C.companions[e.id]
        out.push({
          text: s(`${def ? tr(def.name, lang) : ''} 유대 ${sign(e.amount)}`, `${def ? tr(def.name, lang) : ''} bond ${sign(e.amount)}`),
          tone: e.amount >= 0 ? 'good' : 'bad',
        })
        break
      }
      case 'stat':
        out.push({ text: `${statLabel(e.stat, lang)} ${sign(e.amount)}`, tone: e.amount >= 0 ? 'good' : 'bad' })
        break
      case 'codex':
        out.push({ text: s('기록 해금', 'Codex entry'), tone: 'echo' })
        break
      case 'junk': {
        const def = C.cards[e.cardId]
        out.push({ text: `+ ${def ? tr(def.name, lang) : s('정크', 'junk')}${(e.count ?? 1) > 1 ? ` ×${e.count}` : ''}`, tone: 'bad' })
        break
      }
      case 'combat':
        out.push({ text: s('전투 발생', 'Fight'), tone: 'bad' })
        break
      case 'echoes':
        out.push({ text: `${sign(e.amount)} ◈`, tone: 'echo' })
        break
      case 'flag':
        break
    }
  }
  return out
}

/** Sort for deck displays: type order, then cost, then name. */
const TYPE_ORDER = { attack: 0, skill: 1, tactic: 2, power: 3, junk: 4 } as const
export function cardSort(a: CardDef, b: CardDef, lang: Lang): number {
  return TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.cost - b.cost || tr(a.name, lang).localeCompare(tr(b.name, lang))
}

/** Companion id ('lin_yue') → sprite key ('lin-yue'). */
export function companionSprite(id: string, C: ContentRegistry): string {
  return C.companions[id]?.sprite ?? id.replaceAll('_', '-')
}

export function fmtText(t: Text | string, lang: Lang, vars: Record<string, string | number> = {}): string {
  let s = typeof t === 'string' ? t : tr(t, lang)
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/** "방금 전" / "3분 전" — how long ago the run was auto-saved. */
export function savedAgo(at: number, lang: Lang, now: number = Date.now()): string {
  const min = Math.floor(Math.max(0, now - at) / 60_000)
  if (min < 1) return lang === 'ko' ? '방금 전' : 'just now'
  if (min < 60) return lang === 'ko' ? `${min}분 전` : `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return lang === 'ko' ? `${h}시간 전` : `${h} h ago`
  const d = Math.floor(h / 24)
  return lang === 'ko' ? `${d}일 전` : `${d} d ago`
}

/** Where the saved run stands ("전투 중", "지도") for the Continue button. */
export const SCREEN_LABEL: Record<RunScreen['kind'], Text> = {
  act_intro: { ko: '막 시작', en: 'Act opening' },
  map: { ko: '지도', en: 'Map' },
  event: { ko: '사건 중', en: 'In an event' },
  combat: { ko: '전투 중', en: 'Mid-fight' },
  reward: { ko: '전리품', en: 'Rewards' },
  card_pick: { ko: '카드 선택', en: 'Picking a card' },
  card_reward: { ko: '카드 보상', en: 'Card reward' },
  shop: { ko: '암시장', en: 'Black market' },
  rest: { ko: '은신처', en: 'Safehouse' },
  treasure: { ko: '보급 상자', en: 'Supply cache' },
  final_choice: { ko: '마지막 선택', en: 'Final choice' },
  ended: { ko: '종료', en: 'Ended' },
  district: { ko: '구역 탐색', en: 'In a district' },
  dialogue: { ko: '대화 중', en: 'In a conversation' },
}
