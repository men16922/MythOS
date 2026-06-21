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

  // Combat board animation: the animator diffs prev→next combat states and
  // tweens movement / damage / death; the dispatched action lets it draw the
  // attack/cast connector the snapshot diff can't recover.
  const prevCombatRef = useRef<CombatState | null>(null);
  const dispatchedActionRef = useRef<CombatAction | null>(null);

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

        newLogs.forEach((entry: CombatLogEntry) => {
          if (entry.action === "skill") {
            const skillId = typeof entry.detail?.skill === "string" ? entry.detail.skill : undefined;
            const skillName = entry.detail?.skill_name || skillId || "SKILL";
            latestSkillByActor.set(entry.actor, skillName);

            // If this actor has no follow-up hit/defend/miss logs in this turn, trigger utility skill cinema immediately
            if (!hasFollowUpActors.has(entry.actor)) {
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
            });
          }
        });

        if (queueItems.length > 0) {
          pendingTransitionRef.current = { prev, next: combat };
          setCinemaQueue(queueItems);
          setCinemaContext(queueItems[0]);

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

  return {
    cinemaContext,
    cinemaQueue,
    prevCombatRef,
    dispatchedActionRef,
    onCinemaImpact,
    onCinemaFinish,
  };
}
