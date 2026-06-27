import { useMemo, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ActiveTab } from "../TabNav";
import type {
  MemoryOverview,
  RuntimeSnapshot,
  RunSummary,
  ScenarioInfo,
} from "../types";
import {
  buildCodexLists,
  buildDevConsoleData,
  buildEpiphanyNotice,
} from "../viewModels";

type UseViewModelsArgs = {
  // Codex / dev-console source state.
  memoryOverview: MemoryOverview | null;
  finalizedSnapshot: RuntimeSnapshot | null;
  currentScenario: ScenarioInfo | undefined;
  scenarios: ScenarioInfo[];
  selectedScenarioId: string;
  runsHistory: RunSummary[];
  // Epiphany dismissal.
  dismissedEpiphany: string | null;
  setDismissedEpiphany: Dispatch<SetStateAction<string | null>>;
  // Tab-notice inputs surfaced from sibling hooks/state.
  showInGameNotice: string | null;
  skillNotice: string | null;
  // Tab switching (codex/character/skills/dev lazy-load).
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>;
  loadCodex: () => void;
};

/**
 * Owns the codex/dev/tab view-model derivations that App renders from:
 * `codexLists` and `devConsoleData` (memoized builder projections),
 * `epiphanyNotice` (latest-run unlock banner, suppressed once dismissed),
 * `dismissEpiphany` (persist the dismissal to localStorage), `tabNotices`
 * (per-tab "new content" hints), and `handleTabClick` (switch tab + lazily
 * reload codex data for the read-only tabs). Behavior-preserving extraction —
 * the memo dependency arrays and handler bodies are identical to their prior
 * in-`App` form; all source state is supplied via props.
 */
export function useViewModels(args: UseViewModelsArgs) {
  const {
    memoryOverview,
    finalizedSnapshot,
    currentScenario,
    scenarios,
    selectedScenarioId,
    runsHistory,
    dismissedEpiphany,
    setDismissedEpiphany,
    showInGameNotice,
    skillNotice,
    setActiveTab,
    loadCodex,
  } = args;

  // --- Codex list rendering data mapping ---
  const codexLists = useMemo(() => {
    return buildCodexLists(memoryOverview, finalizedSnapshot, currentScenario);
  }, [memoryOverview, finalizedSnapshot, currentScenario]);

  const epiphanyNotice = useMemo(() => {
    const notice = buildEpiphanyNotice(runsHistory, scenarios);
    return notice && notice.loopId !== dismissedEpiphany ? notice : null;
  }, [runsHistory, scenarios, dismissedEpiphany]);

  const dismissEpiphany = useCallback(
    (loopId: string) => {
      setDismissedEpiphany(loopId);
      try {
        localStorage.setItem("mythos_epiphany_seen", loopId);
      } catch {
        /* ignore storage failures */
      }
    },
    [setDismissedEpiphany]
  );

  // --- Dev Console calculation ---
  const devConsoleData = useMemo(() => {
    return buildDevConsoleData(
      finalizedSnapshot,
      memoryOverview,
      scenarios,
      selectedScenarioId
    );
  }, [finalizedSnapshot, memoryOverview, scenarios, selectedScenarioId]);

  // Sync tab loading
  const tabNotices = useMemo<Partial<Record<ActiveTab, string>>>(() => {
    const notices: Partial<Record<ActiveTab, string>> = {};
    if ((finalizedSnapshot?.active_echoes || []).length > 0 || runsHistory.length > 0) {
      notices.codex = "Echo, Shard, 지난 루프 기록 확인";
    }
    if ((codexLists?.characters || []).length > 0) {
      notices.character = "새 인물 기록 또는 장비 상태 확인";
    }
    if (showInGameNotice || epiphanyNotice || skillNotice) {
      notices.skills = "새 스킬 해금 또는 통찰 투자 가능";
    }
    return notices;
  }, [codexLists?.characters, epiphanyNotice, finalizedSnapshot?.active_echoes, runsHistory.length, showInGameNotice, skillNotice]);

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === "codex" || tab === "character" || tab === "skills" || tab === "dev") {
      loadCodex();
    }
  };

  return {
    codexLists,
    epiphanyNotice,
    dismissEpiphany,
    devConsoleData,
    tabNotices,
    handleTabClick,
  };
}
