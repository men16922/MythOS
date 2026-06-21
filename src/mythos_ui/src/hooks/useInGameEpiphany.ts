import { useState, useRef, useEffect } from "react";
import type {
  RuntimeSnapshot,
  ScenarioInfo,
  CombatSkillInfo,
  ScenarioSkill,
} from "../types";

// In-run epiphany surfacing: when the active loop unlocks a new skill mid-run,
// flash a one-time notice (auto-hides after 5s). Resets the seen-set when the
// loop changes so a fresh run re-announces. `getSkillName` resolves a skill id
// to its display name from the active combat pool, falling back to scenario data.
export function useInGameEpiphany(
  finalizedSnapshot: RuntimeSnapshot | null,
  currentScenario: ScenarioInfo | undefined
) {
  const [showInGameNotice, setShowInGameNotice] = useState<string | null>(null);
  const inGameEpiphaniesRef = useRef<{ loopId: string | null; seen: Set<string> }>({
    loopId: null,
    seen: new Set(),
  });
  const epiphaniesUnlocked = finalizedSnapshot?.epiphanies_unlocked;

  // Sync epiphany mid-run
  useEffect(() => {
    const activeLoopId = finalizedSnapshot?.loop_id || null;
    if (inGameEpiphaniesRef.current.loopId !== activeLoopId) {
      inGameEpiphaniesRef.current = { loopId: activeLoopId, seen: new Set() };
    }
    const epiphanies = epiphaniesUnlocked || [];
    const newEpiphanies = epiphanies.filter(id => !inGameEpiphaniesRef.current.seen.has(id));
    if (newEpiphanies.length === 0) return;

    newEpiphanies.forEach(id => inGameEpiphaniesRef.current.seen.add(id));
    const noticeId = newEpiphanies[0];
    const showTimer = window.setTimeout(() => {
      setShowInGameNotice(noticeId);
    }, 0);
    const hideTimer = window.setTimeout(() => {
      setShowInGameNotice(null);
    }, 5000);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [finalizedSnapshot?.loop_id, epiphaniesUnlocked]);

  const getSkillName = (skillId: string) => {
    const skillPool = finalizedSnapshot?.combat?.available?.skills || [];
    const skill = skillPool.find((s: CombatSkillInfo) => s.id === skillId);
    if (skill?.name) return skill.name;
    const scenarioSkill = currentScenario?.skills?.find((s: ScenarioSkill) => s.id === skillId);
    return scenarioSkill?.name || skillId;
  };

  return { showInGameNotice, setShowInGameNotice, getSkillName };
}
