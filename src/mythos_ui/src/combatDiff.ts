import type { CombatBlip, CombatState } from "./types";
import { hpRatio, isAlive } from "./combatView";

// A combat action response only carries the *resulting* state, not an event
// stream. We recover what happened by diffing the previous board against the
// next one, keyed on the stable blip id. Movement / damage / heal / death are
// unambiguous; who-attacked-whom is left to the caller (derived from the
// dispatched player action) and not inferred here.
export type CombatEvent =
  | { kind: "move"; id: string; faction: string; from: [number, number]; to: [number, number] }
  | { kind: "damage"; id: string; faction: string; amount: number; fromRatio: number; toRatio: number }
  | { kind: "heal"; id: string; faction: string; amount: number; fromRatio: number; toRatio: number }
  | { kind: "death"; id: string; faction: string }
  | { kind: "defend"; id: string; faction: string; on: boolean };

export function diffCombat(
  prev: CombatState | null | undefined,
  next: CombatState | null | undefined
): CombatEvent[] {
  if (!prev?.radar?.blips || !next?.radar?.blips) return [];
  const before: Record<string, CombatBlip> = {};
  prev.radar.blips.forEach((b) => {
    before[b.id] = b;
  });

  const events: CombatEvent[] = [];
  next.radar.blips.forEach((nb) => {
    const ob = before[nb.id];
    if (!ob) return; // newly spawned blip — no transition to animate

    if (ob.x !== nb.x || ob.y !== nb.y) {
      events.push({
        kind: "move",
        id: nb.id,
        faction: nb.faction,
        from: [ob.x, ob.y],
        to: [nb.x, nb.y],
      });
    }

    const oRatio = hpRatio(ob);
    const nRatio = hpRatio(nb);
    const hpDelta = ob.hp - nb.hp;
    if (hpDelta > 0) {
      events.push({
        kind: "damage",
        id: nb.id,
        faction: nb.faction,
        amount: hpDelta,
        fromRatio: oRatio,
        toRatio: nRatio,
      });
    } else if (hpDelta < 0) {
      events.push({
        kind: "heal",
        id: nb.id,
        faction: nb.faction,
        amount: -hpDelta,
        fromRatio: oRatio,
        toRatio: nRatio,
      });
    }

    const oAlive = isAlive(ob);
    const nAlive = isAlive(nb);
    if (oAlive && !nAlive) {
      events.push({ kind: "death", id: nb.id, faction: nb.faction });
    }

    if (!!ob.defending !== !!nb.defending) {
      events.push({
        kind: "defend",
        id: nb.id,
        faction: nb.faction,
        on: !!nb.defending,
      });
    }
  });

  return events;
}
