import { useState, useEffect, useRef } from "react";
import { CombatAnimator, prefersReducedMotion } from "../combatEffects";
import type {
  RuntimeSnapshot,
  CombatAction,
  CombatState,
  CombatLogEntry,
  CombatCinemaContext,
} from "../types";

interface UseCombatCinemaQueueArgs {
  finalizedSnapshot: RuntimeSnapshot | null;
  selectedScenarioId: string;
  fallbackMode: boolean;
  activeTab: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  animatorRef: React.RefObject<CombatAnimator | null>;
  playSfx: (key: string) => void;
}

// Combat board cinema driver: diffs prev→next combat states and either queues
// per-blow CombatCinema overlays (attack/skill/defend/miss) or tweens the board
// directly. Owns the cinema queue + the prev/dispatched/pending refs, and
// exposes the overlay's impact/finish callbacks (drawing the interim board on
// impact, advancing the queue and running the deferred board animation on
// finish). The dispatched-action ref is set by the caller's combat action.
export function useCombatCinemaQueue({
  finalizedSnapshot,
  selectedScenarioId,
  fallbackMode,
  activeTab,
  canvasRef,
  animatorRef,
  playSfx,
}: UseCombatCinemaQueueArgs) {
  const [cinemaContext, setCinemaContext] = useState<CombatCinemaContext | null>(null);
  const [cinemaQueue, setCinemaQueue] = useState<CombatCinemaContext[]>([]);
  const pendingTransitionRef = useRef<{ prev: CombatState; next: CombatState } | null>(null);

  // A/V sync C: while a cinema is replaying a turn, the canvas shows interim
  // (pre-final) HP but the roster/inspector read the committed snapshot (final
  // post-turn HP), so three surfaces disagree mid-replay. This holds the SAME
  // interim board the canvas is drawing (pre-turn `prev`, decremented on each
  // impact) so the caller can feed roster/inspector the replayed HP instead of
  // the truth. It is null whenever no cinema is playing → truth as before.
  const [replayCombat, setReplayCombat] = useState<CombatState | null>(null);

  // Combat board animation: the animator diffs prev→next combat states and
  // tweens movement / damage / death; the dispatched action lets it draw the
  // attack/cast connector the snapshot diff can't recover.
  const prevCombatRef = useRef<CombatState | null>(null);
  const dispatchedActionRef = useRef<CombatAction | null>(null);

  // Cinema image preload (owner 2026-07-12 "공격 이미지가 늦게 뜸"): the first
  // attack cinema fetched its pose art on demand. Warm every combatant's
  // portrait + pose set once per combat so the cut-in opens fully drawn.
  const preloadedCombatRef = useRef<string | null>(null);
  useEffect(() => {
    const combat = finalizedSnapshot?.combat;
    if (!combat?.radar?.blips || combat.finished) return;
    const key = `${selectedScenarioId}:${combat.radar.blips.map((b) => b.id).join(",")}`;
    if (preloadedCombatRef.current === key) return;
    preloadedCombatRef.current = key;
    for (const b of combat.radar.blips) {
      const paths = new Set<string>(Object.values(b.combat_images || {}));
      if (b.portrait) paths.add(b.portrait);
      for (const path of paths) {
        if (!path) continue;
        const img = new Image();
        img.src = `/resources/${selectedScenarioId}/${path}`;
      }
    }
  }, [finalizedSnapshot, selectedScenarioId]);

  const playTerminalCombatSfx = (key: string) => {
    if (key === "sfx_victory" || key === "sfx_defeat") {
      playSfx(key);
    }
  };

  // --- Canvas Combat drawing logic ---
  // When the combat state changes we diff prev→next and animate the transition;
  // when combat first appears (or under reduced-motion / fallback E2E mode) we
  // draw the final board synchronously so the settled state is never lost.
  useEffect(() => {
    if (!animatorRef.current) {
      animatorRef.current = new CombatAnimator(() => canvasRef.current, selectedScenarioId);
    } else {
      animatorRef.current.setScenario(selectedScenarioId);
    }
    const animator = animatorRef.current;
    const combat = finalizedSnapshot?.combat || null;
    if (!combat) {
      prevCombatRef.current = combat;
      return;
    }
    if (activeTab !== "story") {
      prevCombatRef.current = combat;
      return;
    }
    const prev = prevCombatRef.current;
    const dispatched = dispatchedActionRef.current;
    dispatchedActionRef.current = null;
    if (prev && prev !== combat) {
      const newLogs = (combat.log ?? []).slice(prev.log?.length ?? 0);
      const cinematicActions = new Set(["hit", "defeat", "miss", "defend"]);

      const hasFollowUpActors = new Set<string>();
      newLogs.forEach((entry: CombatLogEntry) => {
        if (cinematicActions.has(entry.action)) {
          hasFollowUpActors.add(entry.actor);
        }
      });

      const hasCinematicEvent = newLogs.some((entry: CombatLogEntry) => {
        if (cinematicActions.has(entry.action)) return true;
        if (entry.action === "skill" && !hasFollowUpActors.has(entry.actor)) return true;
        return false;
      });

      if (hasCinematicEvent && !fallbackMode && !prefersReducedMotion()) {
        const queueItems: CombatCinemaContext[] = [];
        const latestSkillByActor = new Map<string, string>();

        // Responsiveness (measured 2026-07-12): a full-screen cinema for EVERY
        // log entry serialized one click into a 7-10.5s forced watch (owner:
        // "제멋대로 진행되는 느낌"). Full-screen cinema is now reserved for the
        // beats that are about YOU — the blow of the unit the player just
        // commanded, plus any kill blow. Ally-AI and ordinary enemy attacks
        // stay on the tactical board (lunge/tracer/floats/shake, 1.5s cap).
        // The unit that just acted is the PREVIOUS snapshot's active unit —
        // the new snapshot's `current` already points at the next turn.
        const commandedActor =
          dispatched && (dispatched.type === "attack" || dispatched.type === "skill")
            ? prev.radar?.current ?? null
            : null;
        const deservesCinema = (entry: CombatLogEntry): boolean => {
          if (entry.action === "defeat") return true;
          // 🕹 hacked betrayal (owner 2026-07-12 "즉발 데미지처럼 들어감"):
          // the seized enemy attacking its own side is a beat worth a cut-in.
          if (entry.detail?.hacked_blow) return true;
          if (commandedActor) return entry.actor === commandedActor;
          // No dispatched action this transition (resume, etc.): fall back to
          // player-faction blows only.
          const blip = combat.radar.blips.find((b) => b.id === entry.actor);
          return blip?.faction === "player";
        };

        // One orphan-skill cinema per actor per transition: effect-result lines
        // that also log as "skill" (지름길 호출 etc.) must not replay the cast.
        const orphanCinemaActors = new Set<string>();

        newLogs.forEach((entry: CombatLogEntry) => {
          if (entry.action === "skill") {
            const skillId = typeof entry.detail?.skill === "string" ? entry.detail.skill : undefined;
            const skillName = entry.detail?.skill_name || skillId || "SKILL";
            latestSkillByActor.set(entry.actor, skillName);

            // If this actor has no follow-up hit/defend/miss logs in this turn, trigger utility skill cinema immediately
            if (
              !hasFollowUpActors.has(entry.actor) &&
              !orphanCinemaActors.has(entry.actor) &&
              deservesCinema(entry)
            ) {
              orphanCinemaActors.add(entry.actor);
              const attackerBlip = combat.radar.blips.find((b) => b.id === entry.actor);
              const targetId = entry.detail?.target || entry.actor;
              const defenderBlip = combat.radar.blips.find((b) => b.id === targetId);

              if (attackerBlip && defenderBlip) {
                queueItems.push({
                  attacker: attackerBlip,
                  defender: defenderBlip,
                  damage: entry.detail?.damage || 0,
                  kind: "skill",
                  crit: !!entry.detail?.crit,
                  skillName,
                  miss: false,
                });
              }
            }
            return;
          }
          if (!cinematicActions.has(entry.action)) return;
          if (!deservesCinema(entry)) return;

          const attackerBlip = combat.radar.blips.find((b) => b.id === entry.actor);
          const targetId = entry.detail?.target || (entry.action === "defend" ? entry.actor : undefined);
          const defenderBlip = combat.radar.blips.find((b) => b.id === targetId);

          if (attackerBlip && defenderBlip) {
            const isPartyActor = attackerBlip.faction === "player" || attackerBlip.faction === "ally";
            const skillName = entry.detail?.skill_name
              || latestSkillByActor.get(entry.actor)
              || (isPartyActor && dispatched?.type === "skill" ? dispatched.skill_id : undefined);
            const kind = entry.action === "defend" ? "defend" : (skillName ? "skill" : "attack");

            queueItems.push({
              attacker: attackerBlip,
              defender: defenderBlip,
              damage: entry.detail?.damage || 0,
              kind,
              crit: !!entry.detail?.crit,
              skillName,
              miss: entry.action === "miss",
              kill: entry.action === "defeat",
            });
          }
        });

        // One cut-in per attacker per transition, preferring the kill blow —
        // a splash kill used to play a SECOND full-screen cinema right after
        // the hit (owner: "한 번 쓰니 두 번 발동되는 것처럼 보임").
        const perActorIdx = new Map<string, number>();
        const dedupedItems: CombatCinemaContext[] = [];
        for (const item of queueItems) {
          const key = item.attacker.id;
          const existing = perActorIdx.get(key);
          if (existing == null) {
            perActorIdx.set(key, dedupedItems.length);
            dedupedItems.push(item);
          } else if (item.kill && !dedupedItems[existing].kill) {
            dedupedItems[existing] = item; // upgrade the hit to its kill blow
          }
        }

        if (dedupedItems.length > 0) {
          pendingTransitionRef.current = { prev, next: combat };
          // Diff-driven animation orchestration: seeding the cinema queue from
          // the prev→next combat diff is the whole point of this effect, so the
          // synchronous setState here is intentional (same pattern as the
          // pre-dedup code path).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCinemaQueue(dedupedItems);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCinemaContext(dedupedItems[0]);
          // Roster/inspector follow the canvas: at cinema start the board still
          // shows the pre-turn `prev` (no impact has landed yet), so seed the
          // interim with it and let onCinemaImpact decrement from there.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setReplayCombat(prev);

          prevCombatRef.current = combat;
          return;
        }
      }

      if (!canvasRef.current) {
        prevCombatRef.current = combat;
        return;
      }

      animator.animate(prev, combat, {
        dispatched,
        instant: fallbackMode || prefersReducedMotion(),
        onSfx: playSfx,
      });
    } else {
      if (canvasRef.current) {
        animator.drawStatic(combat);
      }
    }
    prevCombatRef.current = combat;
    // playSfx is intentionally omitted: this effect must fire only on combat
    // state changes, not on every render that recreates the SFX closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalizedSnapshot, selectedScenarioId, fallbackMode, activeTab]);

  // CombatCinema overlay reached its impact frame: draw the interim board with
  // the defender's HP decremented so the hit reads before the queue advances.
  const onCinemaImpact = (defenderId: string, dmg: number) => {
    if (!pendingTransitionRef.current) return;
    const { prev } = pendingTransitionRef.current;
    if (!prev || !prev.radar || !prev.radar.blips) return;

    const tempCombat = {
      ...prev,
      radar: {
        ...prev.radar,
        blips: prev.radar.blips.map((b) => {
          if (b.id === defenderId) {
            const nextHp = Math.max(0, b.hp - dmg);
            return {
              ...b,
              hp: nextHp,
              hp_ratio: b.max_hp ? nextHp / b.max_hp : 0,
            };
          }
          return b;
        }),
      },
    };
    animatorRef.current?.drawStatic(tempCombat);
    // Mirror the exact interim board onto the roster/inspector so all three
    // surfaces agree during the replay (not the committed post-turn HP).
    setReplayCombat(tempCombat);
  };

  // CombatCinema overlay finished: advance to the next queued blow, or once the
  // queue drains run the deferred prev→next board animation (terminal SFX only).
  const onCinemaFinish = () => {
    const nextQueue = cinemaQueue.slice(1);
    setCinemaQueue(nextQueue);
    if (nextQueue.length > 0) {
      setCinemaContext(nextQueue[0]);
    } else {
      setCinemaContext(null);
      // Queue drained: the deferred prev→next board tween now settles the canvas
      // to the committed truth, so release the interim override and let the
      // roster/inspector read the final snapshot again.
      setReplayCombat(null);
      if (pendingTransitionRef.current) {
        const { prev: p, next: n } = pendingTransitionRef.current;
        pendingTransitionRef.current = null;
        animatorRef.current?.animate(p, n, {
          dispatched: null,
          instant: false,
          onSfx: playTerminalCombatSfx,
        });
      }
    }
  };

  // Tap-to-skip (owner 2026-07-12 "제멋대로 진행"): flush the remaining cinema
  // queue on demand and settle straight into the deferred board animation, so
  // an impatient player gets control back instead of watching the whole reel.
  const flushCinema = () => {
    setCinemaQueue([]);
    setCinemaContext(null);
    setReplayCombat(null);
    if (pendingTransitionRef.current) {
      const { prev: p, next: n } = pendingTransitionRef.current;
      pendingTransitionRef.current = null;
      animatorRef.current?.animate(p, n, {
        dispatched: null,
        instant: false,
        onSfx: playTerminalCombatSfx,
      });
    }
  };

  return {
    cinemaContext,
    cinemaQueue,
    flushCinema,
    // Only surface the interim board while a cinema is actually on screen.
    // `cinemaContext` is set/cleared in lockstep with `replayCombat` (both at
    // queue start, both on drain), so gating here keeps a stale interim from a
    // prior/interrupted cinema from ever leaking onto the roster/inspector.
    replayCombat: cinemaContext ? replayCombat : null,
    prevCombatRef,
    dispatchedActionRef,
    onCinemaImpact,
    onCinemaFinish,
  };
}
