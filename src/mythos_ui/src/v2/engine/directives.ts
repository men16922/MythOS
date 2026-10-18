// Mythos 2.0 — Chapter Tactical Directives (작전 지령): per-act optional sub-objectives that give the player
// a strategic goal across the chapter's map route and combat encounters.
//
// Pure & deterministic: the 3 offered directives for an act are derived from (run.seed, run.act) without mutating
// `run.rng`, and state is stored in `run.flags` ONLY after the player selects a directive (`directive_act_<act>_*`),
// so existing deterministic run tests that don't select a directive see zero state diff.

import { hashSeed } from './rng.ts'
import type { CombatState, NodeKind, RunState, Text } from './types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })
const clone = <T>(x: T): T => structuredClone(x)

export interface DirectiveDef {
  id: string
  code: string
  name: Text
  desc: Text
  rewardText: Text
  target: number
  reward: {
    credits?: number
    growth?: number
    maxHp?: number
    heal?: number
    trace?: number
    bond?: number
    echoes?: number
  }
}

export const DIRECTIVES: readonly DirectiveDef[] = [
  {
    id: 'env_hunter',
    code: 'DIR-01',
    name: t('화염·지형 유도 작전', 'Hazard & Terrain Protocol'),
    desc: t('이 막에서 환경 처치 또는 전투 보너스 목표 2회 달성', 'Get 2 environment kills or combat bonus objectives this act'),
    rewardText: t('+65₵ · 성장 포인트 +1 · ◈ +4', '+65₵ · +1 Growth Point · +4 ◈'),
    target: 2,
    reward: { credits: 65, growth: 1, echoes: 4 },
  },
  {
    id: 'blitz_sweep',
    code: 'DIR-02',
    name: t('전격 돌파 작전', 'Blitz Sweep'),
    desc: t('이 막에서 4턴 이내 전투 승리 2회 달성', 'Win 2 combats within 4 turns this act'),
    rewardText: t('+55₵ · 최대 HP +6 · 추적 −15', '+55₵ · +6 Max HP · −15 Trace'),
    target: 2,
    reward: { credits: 55, maxHp: 6, heal: 6, trace: -15 },
  },
  {
    id: 'iron_formation',
    code: 'DIR-03',
    name: t('무결점 방진', 'Iron Formation'),
    desc: t('이 막에서 받은 피해 5 이하로 전투 승리 2회', 'Win 2 combats taking 5 or less damage this act'),
    rewardText: t('+50₵ · 동료 유대 +1 · 파티 회복 +12', '+50₵ · +1 Companion Bond · Party Heal +12'),
    target: 2,
    reward: { credits: 50, bond: 1, heal: 12 },
  },
  {
    id: 'elite_bounty',
    code: 'DIR-04',
    name: t('고가치 표적 사냥', 'High-Value Bounty'),
    desc: t('정예 1회 처치 (또는 일반 교전 3회 승리)', 'Defeat 1 Elite (or win 3 normal combats) this act'),
    rewardText: t('+80₵ · 성장 포인트 +1 · ◈ +5', '+80₵ · +1 Growth Point · +5 ◈'),
    target: 3,
    reward: { credits: 80, growth: 1, echoes: 5 },
  },
  {
    id: 'ghost_signal',
    code: 'DIR-05',
    name: t('유령 주파수 유지', 'Ghost Frequency'),
    desc: t('추적도 50 미만 상태로 교전 2회 승리', 'Win 2 combats while Trace is below 50'),
    rewardText: t('+60₵ · 추적 −20 · 성장 포인트 +1', '+60₵ · −20 Trace · +1 Growth Point'),
    target: 2,
    reward: { credits: 60, trace: -20, growth: 1 },
  },
  {
    id: 'overclock_surge',
    code: 'DIR-06',
    name: t('과부하 섬멸전', 'Overclock Annihilation'),
    desc: t('이 막에서 적 유닛 5기 이상 격파', 'Destroy 5 or more enemy units this act'),
    rewardText: t('+70₵ · 최대 HP +5 · ◈ +4', '+70₵ · +5 Max HP · +4 ◈'),
    target: 5,
    reward: { credits: 70, maxHp: 5, heal: 5, echoes: 4 },
  },
]

const choiceKey = (act: number) => `dir_a${act}_choice`
const progKey = (act: number) => `dir_a${act}_prog`
const claimKey = (act: number) => `dir_a${act}_claimed`

/** Deterministically offer 3 directives for the current act without touching `run.rng`. */
export function offeredDirectives(run: Pick<RunState, 'seed' | 'act'>): DirectiveDef[] {
  const h = hashSeed(`${run.seed}:directive:${run.act}`)
  const pool = [...DIRECTIVES]
  const out: DirectiveDef[] = []
  let s = h || 1
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const idx = s % pool.length
    out.push(pool.splice(idx, 1)[0]!)
  }
  return out
}

export interface ActiveDirectiveView {
  offered: DirectiveDef[]
  selected: DirectiveDef | null
  progress: number
  target: number
  completed: boolean
  claimed: boolean
}

export function directiveState(run: Pick<RunState, 'seed' | 'act' | 'flags'>): ActiveDirectiveView {
  const offered = offeredDirectives(run)
  const choiceIdx = run.flags[choiceKey(run.act)] ?? 0
  const selected = choiceIdx >= 1 && choiceIdx <= offered.length ? (offered[choiceIdx - 1] ?? null) : null
  const progress = selected ? Math.min(selected.target, Math.max(0, run.flags[progKey(run.act)] ?? 0)) : 0
  const target = selected?.target ?? 1
  const completed = !!selected && progress >= target
  const claimed = (run.flags[claimKey(run.act)] ?? 0) > 0
  return { offered, selected, progress, target, completed, claimed }
}

/** Select one of the 3 offered directives (1-indexed: 1, 2, or 3) for the current act. */
export function selectDirective(run: RunState, choiceOneIndexed: number): RunState {
  const offered = offeredDirectives(run)
  if (choiceOneIndexed < 1 || choiceOneIndexed > offered.length) return run
  if (run.flags[choiceKey(run.act)]) return run
  const next = clone(run)
  next.flags[choiceKey(next.act)] = choiceOneIndexed
  next.flags[progKey(next.act)] = 0
  return next
}

/** Update directive progress when a combat is won (called from `updateCombat` only if a directive is active). */
export function advanceDirectiveOnWin(next: RunState, combat: CombatState, nodeKind: NodeKind): void {
  const st = directiveState(next)
  if (!st.selected || st.claimed) return
  const bonusMet =
    !!combat.bonus &&
    !combat.bonus.failed &&
    (combat.bonus.def.kind === 'environment'
      ? combat.bonus.progress >= combat.bonus.def.count
      : combat.bonus.def.kind === 'turn_limit'
        ? combat.turn <= combat.bonus.def.turns
        : true)

  let delta = 0
  switch (st.selected.id) {
    case 'env_hunter':
      delta = combat.stats.environmentKills + (bonusMet ? 1 : 0)
      break
    case 'blitz_sweep':
      delta = combat.turn <= 4 ? 1 : 0
      break
    case 'iron_formation':
      delta = combat.stats.damageTaken <= 5 || bonusMet ? 1 : 0
      break
    case 'elite_bounty':
      delta = nodeKind === 'elite' || nodeKind === 'boss' ? 3 : 1
      break
    case 'ghost_signal':
      delta = next.trace < 50 ? 1 : 0
      break
    case 'overclock_surge':
      delta = Math.max(1, combat.stats.enemiesKilled)
      break
  }
  if (delta > 0) {
    next.flags[progKey(next.act)] = Math.min(st.selected.target, (next.flags[progKey(next.act)] ?? 0) + delta)
  }
}

/** Claim the completed directive's reward cache. */
export function claimDirective(run: RunState): RunState {
  const st = directiveState(run)
  if (!st.selected || !st.completed || st.claimed) return run
  const next = clone(run)
  const r = st.selected.reward
  if (r.credits) next.credits += r.credits
  if (r.growth) next.growth = (next.growth ?? 0) + r.growth
  if (r.maxHp) {
    next.maxHp += r.maxHp
    next.hp = Math.min(next.maxHp, next.hp + r.maxHp)
  }
  if (r.heal) {
    next.hp = Math.min(next.maxHp, next.hp + r.heal)
    for (const m of next.party) m.hp = Math.min(m.maxHp, m.hp + r.heal)
  }
  if (r.trace) next.trace = Math.max(0, Math.min(100, next.trace + r.trace))
  if (r.bond && next.party[0]) {
    next.party[0].bond = Math.min(3, next.party[0].bond + r.bond)
  }
  if (r.echoes) next.echoes += r.echoes
  next.flags[claimKey(next.act)] = 1
  return next
}
