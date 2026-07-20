import { useCallback, useState } from "react";

import { COMBAT_TUTORIAL_STEPS } from "../combatText";
import type { CombatAction, RuntimeSnapshot } from "../types";

/**
 * A2 first-combat interactive tutorial: 4 steps (move → attack → skill →
 * defend), each advanced only when the player actually performs that action.
 * Shown once — gated by localStorage (this device) + meta combat counts
 * (this player has never fought before). The visible step is DERIVED from
 * combat state + progress (no effect), so it disappears with the fight and
 * resumes if an unfinished first combat recurs. Both dispatch paths (board
 * drag-move via useCombatBoard and the action-bar buttons) flow through the
 * returned wrapper; App must pass that wrapper — not the raw handler — to both.
 */
export function useCombatTutorial({
  finalizedSnapshot,
  combatLive,
  onCombatAction,
}: {
  finalizedSnapshot: RuntimeSnapshot | null;
  combatLive: boolean;
  onCombatAction: (action: CombatAction) => void;
}) {
  const [done, setDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem("mythos_combat_tutorial_seen") === "1";
    } catch {
      return false;
    }
  });
  const [progress, setProgress] = useState(0);

  const combatMeta = finalizedSnapshot?.state?.meta_progression as
    | { total_combats_won?: number; total_combats_lost?: number }
    | undefined;
  const isFirstCombat =
    Number(combatMeta?.total_combats_won ?? 0) + Number(combatMeta?.total_combats_lost ?? 0) === 0;
  const tutorialStep =
    combatLive && !done && isFirstCombat && progress < COMBAT_TUTORIAL_STEPS.length
      ? progress
      : null;

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem("mythos_combat_tutorial_seen", "1");
    } catch {
      /* ignore storage failures */
    }
    setDone(true);
  }, []);

  /** Overlay "next" button: finish on the last step, otherwise step forward. */
  const advance = useCallback(() => {
    if (tutorialStep == null) return;
    if (tutorialStep >= COMBAT_TUTORIAL_STEPS.length - 1) {
      markSeen();
    } else {
      setProgress(tutorialStep + 1);
    }
  }, [tutorialStep, markSeen]);

  const onCombatActionTutored = useCallback(
    (action: CombatAction) => {
      if (tutorialStep != null) {
        const goal = COMBAT_TUTORIAL_STEPS[tutorialStep];
        // A board move is dispatched as `wait` WITH coordinates; the plain wait
        // button carries none — only the former satisfies the "move" step.
        const matched =
          goal === "move" ? action.type === "wait" && action.x != null : action.type === goal;
        if (matched) {
          if (tutorialStep >= COMBAT_TUTORIAL_STEPS.length - 1) markSeen();
          setProgress(tutorialStep + 1);
        }
      }
      onCombatAction(action);
    },
    [tutorialStep, onCombatAction, markSeen]
  );

  const tutorialHighlight = tutorialStep != null ? COMBAT_TUTORIAL_STEPS[tutorialStep] : null;

  return { tutorialStep, tutorialHighlight, markSeen, advance, onCombatActionTutored };
}
