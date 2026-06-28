import type { Dispatch, SetStateAction } from "react";
import {
  apiGetSlots,
  apiGetRuns,
  apiGetMemory,
  apiGetSkillTree,
  apiLearnSkill,
} from "../api";
import { useLang } from "../i18n/lang";
import type {
  MemoryOverview,
  SaveSlot,
  RunSummary,
  SkillTreeResponse,
} from "../types";

type UseDataLoadersArgs = {
  // Identity / scenario selection.
  playerId: string | null;
  selectedScenarioId: string;
  // Skill-tree state read by the learn handler.
  skillTree: SkillTreeResponse | null;
  learningSkillId: string | null;
  // Save/run/memory setters.
  setSaveSlots: Dispatch<SetStateAction<SaveSlot[]>>;
  setRunsHistory: Dispatch<SetStateAction<RunSummary[]>>;
  setMemoryOverview: Dispatch<SetStateAction<MemoryOverview | null>>;
  // Skill-tree setters.
  setSkillTree: Dispatch<SetStateAction<SkillTreeResponse | null>>;
  setLearningSkillId: Dispatch<SetStateAction<string | null>>;
  setSkillError: Dispatch<SetStateAction<string | null>>;
  setSkillNotice: Dispatch<SetStateAction<string | null>>;
  // Logging.
  logToConsole: (line: string) => void;
};

/**
 * Owns the read-side API loaders that hydrate save/run/memory and skill-tree
 * state: `loadSlotsAndRuns` (save slots + run history + memory overview),
 * `loadCodex` (memory overview + skill tree), `loadSkillTree`, and the
 * `handleLearnSkill` insight-investment mutation. Each function is a plain
 * (non-memoized) function — identical to its prior in-`App` form — so behavior
 * is preserved; all cross-cutting state and setters are supplied via props.
 */
export function useDataLoaders(args: UseDataLoadersArgs) {
  const { t } = useLang();
  const {
    playerId,
    selectedScenarioId,
    skillTree,
    learningSkillId,
    setSaveSlots,
    setRunsHistory,
    setMemoryOverview,
    setSkillTree,
    setLearningSkillId,
    setSkillError,
    setSkillNotice,
    logToConsole,
  } = args;

  const loadSlotsAndRuns = async (pId: string) => {
    if (!pId) return;
    try {
      const slotsData = await apiGetSlots(pId);
      const runsData = await apiGetRuns(pId);
      const overview = await apiGetMemory(pId);
      setSaveSlots(slotsData.slots || []);
      setRunsHistory(runsData.runs || []);
      setMemoryOverview(overview);
    } catch (e) {
      logToConsole("세션/런 데이터 로드 실패: " + (e as Error).message);
    }
  };

  const loadCodex = async () => {
    if (!playerId) return;
    try {
      const overview = await apiGetMemory(playerId);
      setMemoryOverview(overview);
    } catch (e) {
      logToConsole("Codex 데이터 로드 실패: " + (e as Error).message);
    }
    await loadSkillTree();
  };

  const loadSkillTree = async () => {
    if (!playerId) return;
    try {
      const tree = await apiGetSkillTree(playerId, selectedScenarioId);
      setSkillTree(tree);
    } catch (e) {
      logToConsole("스킬 트리 로드 실패: " + (e as Error).message);
    }
  };

  const handleLearnSkill = async (skillId: string) => {
    if (!playerId || learningSkillId) return;
    setLearningSkillId(skillId);
    setSkillError(null);
    setSkillNotice(null);
    const before = skillTree?.skills.find((skill) => skill.id === skillId);
    try {
      const tree = await apiLearnSkill({
        player_id: playerId,
        scenario_id: selectedScenarioId,
        skill_id: skillId,
      });
      setSkillTree(tree);
      const after = tree.skills.find((skill) => skill.id === skillId);
      const name = after?.name || before?.name || skillId;
      if (before && after && after.rank > before.rank) {
        setSkillNotice(`${name} ${t("sk.upgradeDone")}: Rank ${before.rank} → ${after.rank}. ${t("sk.insightBal")} ${tree.insight_points}p`);
      } else if (after?.status === "learned") {
        setSkillNotice(`${name} ${t("sk.learnDone")}. ${t("sk.insightBal")} ${tree.insight_points}p`);
      } else {
        setSkillNotice(`${name} ${t("sk.updateDone")}. ${t("sk.insightBal")} ${tree.insight_points}p`);
      }
      logToConsole(`스킬 갱신: ${skillId} (통찰 잔액 ${tree.insight_points}p)`);
    } catch (e) {
      setSkillError((e as Error).message);
    } finally {
      setLearningSkillId(null);
    }
  };

  return { loadSlotsAndRuns, loadCodex, loadSkillTree, handleLearnSkill };
}
