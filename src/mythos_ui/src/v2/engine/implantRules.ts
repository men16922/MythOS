// Mythos 2.0 — forbidden implants: boss-rarity implants that bend a rule of the fight instead of adding a number.
//
// A rule lives here as data on `ImplantDef.rules`; the combat engine asks `implantRules(c, C)` at the few places a
// rule can change. Every rule pairs a real upside with a real cost, and both must show in the previews: card
// outcomes come from `previewPlay` running the real rules, enemy damage goes through `scaling.dmg` so the
// telegraphs stay honest. A forbidden implant never hides a telegraph.

import type { ContentRegistry, ImplantRules } from './types.ts'

const NONE: ImplantRules = {}

function merge(a: ImplantRules, b: ImplantRules): ImplantRules {
  const out: ImplantRules = { ...a }
  for (const [key, value] of Object.entries(b) as [keyof ImplantRules, number | boolean][]) {
    const cur = out[key]
    if (typeof value === 'number') (out[key] as number) = (typeof cur === 'number' ? cur : 0) + value
    else (out[key] as boolean) = value || !!cur
  }
  return out
}

/** The rules of the implants held (a run or a fight; several add up). */
export function implantRules(h: { implants: readonly string[] }, C: Pick<ContentRegistry, 'implants'>): ImplantRules {
  let out = NONE
  for (const id of h.implants) {
    const rules = C.implants[id]?.rules
    if (rules) out = out === NONE ? rules : merge(out, rules)
  }
  return out
}
