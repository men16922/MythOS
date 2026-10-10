// Mythos 2.0 — the shell's seam onto the run/meta engine (engine/run.ts, meta.ts).
// Screens call only these names; this file adapts them to the engine's signatures.

import { buyUnlock, canBuyUnlock, unlockedArchetypes, unlockedCompanions } from '../../engine/meta.ts'
import * as Run from '../../engine/run.ts'
import type {
  ArchetypeDef,
  CardInstance,
  CombatState,
  CompanionDef,
  Condition,
  ContentRegistry,
  EndingDef,
  Improvisation,
  MetaProfile,
  MetaUnlockDef,
  RunState,
  StatKey,
  Text,
} from '../../engine/types.ts'

type R = RunState
type C = ContentRegistry

export interface Gate {
  ok: boolean
  reason?: Text
}

const REST_SCRUB = 30

export const rx = {
  // ---------------------------------------------------------- loop start / map
  newRun: (p: MetaProfile, o: { archetype: string; companion?: string | null; paradox: number }, C: C): R => Run.newRun(p, o, C),
  continueActIntro: (r: R, C: C): R => Run.startAct(r, C),
  enterNode: (r: R, id: string, C: C): R => Run.enterNode(r, id, C),
  reachable: (r: R): string[] => (r.screen.kind === 'map' ? Run.reachableNodes(r) : []),
  updateCombat: (r: R, c: CombatState, C: C): R => Run.updateCombat(r, c, C),
  abandon: (r: R): R => Run.abandonRun(r),
  discardConsumable: (r: R, index: number, C: C): R => Run.discardConsumable(r, index, C),

  // ---------------------------------------------------------- reward
  takeCredits: (r: R, C: C): R => Run.takeRewardCredits(r, C),
  takeCard: (r: R, group: number, cardId: string | null, C: C): R => Run.takeRewardCard(r, group, cardId, C),
  takeImplant: (r: R, implantId: string, C: C): R => Run.takeRewardImplant(r, implantId, C),
  takeConsumable: (r: R, C: C): R => Run.takeRewardConsumable(r, C),
  leaveReward: (r: R, C: C): R => Run.leaveReward(r, C),
  chooseCardReward: (r: R, cardId: string | null, C: C): R => Run.pickCardReward(r, cardId, C),

  // ---------------------------------------------------------- event
  eventOptions: (r: R, C: C): Run.EventOptionView[] => Run.eventOptions(r, C),
  chooseOption: (r: R, index: number, C: C): R => Run.chooseEventOption(r, index, C),
  improvise: (r: R, imp: Improvisation, C: C): R => Run.applyImprovisation(r, imp, C),
  leaveEvent: (r: R, C: C): R => Run.continueEvent(r, C),
  optionGate: (r: R, cond: Condition | undefined, C: C): Gate => Run.conditionMet(r, cond, C),
  chance: (r: R, check: { stat: StatKey; dc: number }): number => Run.checkChance(r, check.stat, check.dc),

  // ---------------------------------------------------------- shop
  buyCard: (r: R, index: number, C: C): R => Run.shopBuyCard(r, index, C),
  buyImplant: (r: R, index: number, C: C): R => Run.shopBuyImplant(r, index, C),
  buyConsumable: (r: R, index: number, C: C): R => Run.shopBuyConsumable(r, index, C),
  shopRemove: (r: R, C: C): R => Run.shopRemove(r, C),
  shopHeal: (r: R, C: C): R => Run.shopHeal(r, C),
  shopScrub: (r: R, C: C): R => Run.shopScrub(r, C),
  leaveShop: (r: R, C: C): R => Run.leaveShop(r, C),

  // ---------------------------------------------------------- rest
  restHeal: (r: R, C: C): R => Run.restHeal(r, C),
  restUpgrade: (r: R, C: C): R => Run.restUpgrade(r, C),
  restScrub: (r: R, C: C): R => Run.restScrub(r, C),
  restBond: (r: R, companionId: string, C: C): R => Run.restBond(r, companionId, C),
  leaveRest: (r: R, C: C): R => Run.leaveRest(r, C),
  restHealAmount: (r: R, C: C): number => Math.round((r.maxHp * Run.restHealPercent(r, C)) / 100),
  restScrubAmount: (): number => REST_SCRUB,
  canUpgradeAny: (r: R, C: C): boolean => r.deck.some((c) => !c.upgraded && Run.canUpgrade(C.cards[c.defId])),

  // ---------------------------------------------------------- treasure
  openTreasure: (r: R, C: C): R => Run.openTreasure(r, C),
  leaveTreasure: (r: R, C: C): R => Run.leaveTreasure(r, C),

  // ---------------------------------------------------------- card pick
  pickable: (r: R, C: C): CardInstance[] => Run.pickableCards(r, C),
  pickCard: (r: R, cardUid: string, C: C): R => Run.pickCard(r, cardUid, C),
  /** Only a safehouse upgrade can be backed out of (nothing was spent yet). */
  canCancelPick: (r: R): boolean => r.screen.kind === 'card_pick' && r.screen.returnTo.kind === 'rest',
  cancelPick: (r: R): R => (r.screen.kind === 'card_pick' && r.screen.returnTo.kind === 'rest' ? { ...r, screen: { kind: 'rest', done: false } } : r),

  // ---------------------------------------------------------- final
  endings: (r: R, C: C): { def: EndingDef; gate: Gate }[] =>
    Run.availableEndings(r, C).map((v) => ({ def: v.ending, gate: v.reason ? { ok: v.available, reason: v.reason } : { ok: v.available } })),
  chooseEnding: (r: R, id: string, C: C): R => Run.chooseEnding(r, id, C),

  // ---------------------------------------------------------- meta
  buyUnlock: (p: MetaProfile, id: string, C: C): MetaProfile => buyUnlock(p, id, C),
  unlockGate: (p: MetaProfile, u: MetaUnlockDef, C: C): Gate => canBuyUnlock(p, u.id, C),
  archetypes: (p: MetaProfile, C: C): { def: ArchetypeDef; unlocked: boolean; unlock?: MetaUnlockDef }[] => {
    const open = new Set(unlockedArchetypes(p, C))
    return Object.values(C.archetypes).map((def) => ({
      def,
      unlocked: open.has(def.id),
      unlock: Object.values(C.unlocks).find((u) => u.kind === 'archetype' && u.grants === def.id),
    }))
  },
  companions: (p: MetaProfile, C: C): { def: CompanionDef; unlocked: boolean; unlock?: MetaUnlockDef }[] => {
    const open = new Set(unlockedCompanions(p, C))
    return Object.values(C.companions).map((def) => ({
      def,
      unlocked: open.has(def.id),
      unlock: Object.values(C.unlocks).find((u) => u.kind === 'companion' && u.grants === def.id),
    }))
  },
}
