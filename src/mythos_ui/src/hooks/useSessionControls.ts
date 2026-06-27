import type { Dispatch, SetStateAction } from "react";
import { apiGetScenarios, apiSaveSlot } from "../api";
import { firstUnlockedArchetype } from "../archetypes";
import { LS_KEY, parseResumeSession } from "../sessionStorage";
import type { ResumeSessionData } from "../sessionStorage";
import type { ActiveTab } from "../TabNav";
import type { ScenarioInfo, RuntimeSnapshot } from "../types";
import type { NarrativeHistoryItem } from "../App";

type UseSessionControlsArgs = {
  // Scenario selection + connection / audio readiness.
  scenarios: ScenarioInfo[];
  connected: boolean;
  bgmEnabled: boolean;
  bgmReady: boolean;
  // Save-slot submit inputs.
  loopId: string | null;
  playerId: string | null;
  isBusy: boolean;
  saveLabelInput: string;
  // Scenario / onboarding setters.
  setSelectedScenarioId: Dispatch<SetStateAction<string>>;
  setSelectedArchetype: Dispatch<SetStateAction<string | null>>;
  setScenarios: Dispatch<SetStateAction<ScenarioInfo[]>>;
  setResumeSessionData: Dispatch<SetStateAction<ResumeSessionData | null>>;
  // Run-teardown setters.
  setLoopId: Dispatch<SetStateAction<string | null>>;
  setConnected: Dispatch<SetStateAction<boolean>>;
  setLastSnapshot: Dispatch<SetStateAction<RuntimeSnapshot | null>>;
  setFinalizedSnapshot: Dispatch<SetStateAction<RuntimeSnapshot | null>>;
  setDisplayedNarration: Dispatch<SetStateAction<string>>;
  setSceneImageUrl: Dispatch<SetStateAction<string | null>>;
  setNarrativeHistory: Dispatch<SetStateAction<NarrativeHistoryItem[]>>;
  setCombatLog: Dispatch<SetStateAction<string>>;
  setCombatTarget: Dispatch<SetStateAction<string | null>>;
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>;
  // Save-slot submit setters.
  setSaveLabelInput: Dispatch<SetStateAction<string>>;
  setIsBusy: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<string>>;
  // Socket / audio teardown helpers.
  closeSocket: () => void;
  pauseBgm: () => void;
  resetAudioRefs: () => void;
  playBgm: (bgmPath: string, forceEnabled?: boolean) => void;
  mainBgmPath: () => string;
  // Read-side reload after save.
  loadSlotsAndRuns: (pId: string) => Promise<void>;
  // Logging.
  logToConsole: (line: string) => void;
};

/**
 * Owns the session/UI control handlers that aren't part of the lifecycle entry
 * points: `handleScenarioChange` (re-default the archetype + preview BGM on the
 * onboarding screen), `handleLeaveSession` (tear the active run down and refresh
 * the scenario list), and `handleSaveSlotSubmit` (persist a save slot). Each
 * handler is a plain (non-memoized) function — identical to its prior in-`App`
 * form — so behavior is preserved; all cross-cutting state and helpers are
 * supplied via props.
 */
export function useSessionControls(args: UseSessionControlsArgs) {
  const {
    scenarios,
    connected,
    bgmEnabled,
    bgmReady,
    loopId,
    playerId,
    isBusy,
    saveLabelInput,
    setSelectedScenarioId,
    setSelectedArchetype,
    setScenarios,
    setResumeSessionData,
    setLoopId,
    setConnected,
    setLastSnapshot,
    setFinalizedSnapshot,
    setDisplayedNarration,
    setSceneImageUrl,
    setNarrativeHistory,
    setCombatLog,
    setCombatTarget,
    setActiveTab,
    setSaveLabelInput,
    setIsBusy,
    setStatus,
    closeSocket,
    pauseBgm,
    resetAudioRefs,
    playBgm,
    mainBgmPath,
    loadSlotsAndRuns,
    logToConsole,
  } = args;

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    const archs = scenarios.find((s) => s.id === scenarioId)?.archetypes || [];
    setSelectedArchetype(firstUnlockedArchetype(archs));
    if (!connected && bgmEnabled && bgmReady) {
      playBgm(`resources/${scenarioId}/audio/bgm_main.wav`);
    }
  };

  const handleLeaveSession = () => {
    closeSocket();
    pauseBgm();
    resetAudioRefs();
    setLoopId(null);
    setConnected(false);
    setLastSnapshot(null);
    setFinalizedSnapshot(null);
    setDisplayedNarration("");
    setSceneImageUrl(null);
    setNarrativeHistory([]);
    setCombatLog("");
    setCombatTarget(null);
    setActiveTab("story");

    // Refresh scenarios
    const storedResume = parseResumeSession(localStorage.getItem(LS_KEY));
    apiGetScenarios(storedResume?.playerId)
      .then((data) => {
        setScenarios(data.scenarios || []);
        setResumeSessionData(storedResume);
      })
      .catch((err: unknown) => {
        logToConsole("시나리오 목록 갱신 실패: " + (err as Error).message);
      });
    if (bgmEnabled) {
      playBgm(mainBgmPath());
    }
  };

  const handleSaveSlotSubmit = async () => {
    if (!loopId || isBusy) return;
    setIsBusy(true);
    setStatus("세션 저장 중…");
    try {
      await apiSaveSlot({ loop_id: loopId, label: saveLabelInput.trim() || null });
      setSaveLabelInput("");
      setStatus("세션 저장 성공.");
      if (playerId) {
        await loadSlotsAndRuns(playerId);
      }
    } catch (e) {
      setStatus("세션 저장 실패: " + (e as Error).message);
    } finally {
      setIsBusy(false);
    }
  };

  return { handleScenarioChange, handleLeaveSession, handleSaveSlotSubmit };
}
