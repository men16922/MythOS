import type { Dispatch, SetStateAction } from "react";
import {
  apiConnect,
  apiActive,
  apiBegin,
  apiCombatBegin,
  apiGetLoopScenes,
  getLang,
} from "../api";
import { DICTS } from "../i18n/lang";
import { LS_KEY } from "../sessionStorage";
import type { ResumeSessionData } from "../sessionStorage";
import type { ActiveTab } from "../TabNav";
import type { CombatState, RuntimeSnapshot } from "../types";
import type { NarrativeHistoryItem } from "../App";

type ImageOpts = {
  with_image: boolean;
  visual_async: boolean;
  image_every_turn: boolean;
};

type UseSessionLifecycleArgs = {
  // Onboarding selections + run modifiers.
  displayName: string;
  selectedArchetype: string | null;
  selectedScenarioId: string;
  fallbackMode: boolean;
  imageOpts: () => ImageOpts;
  // Run / onboarding state setters.
  setSelectedScenarioId: Dispatch<SetStateAction<string>>;
  setPlayerId: Dispatch<SetStateAction<string | null>>;
  setLoopId: Dispatch<SetStateAction<string | null>>;
  setConnected: Dispatch<SetStateAction<boolean>>;
  setShowIntro: Dispatch<SetStateAction<boolean>>;
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>;
  setIsBusy: Dispatch<SetStateAction<boolean>>;
  setObStatus: Dispatch<SetStateAction<string>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setResumeSessionData: Dispatch<SetStateAction<ResumeSessionData | null>>;
  // Narration / snapshot state.
  setLastSnapshot: Dispatch<SetStateAction<RuntimeSnapshot | null>>;
  setFinalizedSnapshot: Dispatch<SetStateAction<RuntimeSnapshot | null>>;
  setNarrativeHistory: Dispatch<SetStateAction<NarrativeHistoryItem[]>>;
  setDisplayedNarration: Dispatch<SetStateAction<string>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  resetStreamBuffers: () => void;
  // Scene-visual state.
  setSceneImageUrl: Dispatch<SetStateAction<string | null>>;
  setImagePlaceholderText: Dispatch<SetStateAction<string>>;
  clearVisualTimeout: () => void;
  // Audio.
  initAudio: () => void;
  playBgm: (bgmPath: string, forceEnabled?: boolean) => void;
  mainBgmPath: () => string;
  // Socket / combat-cinema baseline.
  openSocket: () => Promise<WebSocket>;
  prevCombatRef: { current: CombatState | null };
  // Snapshot ingestion (owned by App's WS type-switch).
  handleReceivedSnapshot: (snap: RuntimeSnapshot) => void;
  // Logging.
  logToConsole: (line: string) => void;
};

/**
 * Owns the session lifecycle entry points used by onboarding and save/load:
 * starting a fresh run (`handleStartGame`), the fallback combat sandbox
 * (`handleSimulateCombat`), and resuming an existing loop (`handleResumeGame`),
 * plus the shared `saveSessionMetadata` resume-token writer. Each handler is a
 * plain (non-memoized) function — identical to its prior in-`App` form — so
 * behavior is preserved; all cross-cutting state setters and hook helpers are
 * supplied via props.
 */
export function useSessionLifecycle(args: UseSessionLifecycleArgs) {
  const {
    displayName,
    selectedArchetype,
    selectedScenarioId,
    fallbackMode,
    imageOpts,
    setSelectedScenarioId,
    setPlayerId,
    setLoopId,
    setConnected,
    setShowIntro,
    setActiveTab,
    setIsBusy,
    setObStatus,
    setStatus,
    setResumeSessionData,
    setLastSnapshot,
    setFinalizedSnapshot,
    setNarrativeHistory,
    setDisplayedNarration,
    setIsStreaming,
    resetStreamBuffers,
    setSceneImageUrl,
    setImagePlaceholderText,
    clearVisualTimeout,
    initAudio,
    playBgm,
    mainBgmPath,
    openSocket,
    prevCombatRef,
    handleReceivedSnapshot,
    logToConsole,
  } = args;

  const saveSessionMetadata = (pId: string, sId: string) => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ playerId: pId, scenarioId: sId })
      );
    } catch {
      logToConsole("로컬 세션 메타데이터 저장 실패.");
    }
  };

  const handleStartGame = async () => {
    setIsBusy(true);
    setObStatus("접속 중…");
    try {
      const player = await apiConnect({
        display_name: displayName,
        archetype: selectedArchetype,
        scenario_id: selectedScenarioId,
      });

      setPlayerId(player.player_id);
      saveSessionMetadata(player.player_id, selectedScenarioId);
      setConnected(true);
      setShowIntro(true);
      initAudio();
      playBgm(mainBgmPath());
      logToConsole(`접속: ${player.player_id} (${selectedArchetype || "-"})`);

      const ws = await openSocket();
      // Wait slightly for websocket
      setTimeout(() => {
        // Send begin event
         setSceneImageUrl(null);
        setNarrativeHistory([]);
        clearVisualTimeout();
        setImagePlaceholderText(DICTS[getLang()]["img.preparing"]);
        resetStreamBuffers();
        setStatus(DICTS[getLang()]["sess.loopCreating"]);
        setIsStreaming(true);

        ws.send(
          JSON.stringify({
            event: "begin",
            player_id: player.player_id,
            scenario_id: selectedScenarioId,
            fallback: fallbackMode,
            lang: getLang(),
            ...imageOpts(),
          })
        );
      }, 300);
      setObStatus("");
    } catch (err) {
      setObStatus("실패: " + (err as Error).message);
      logToConsole("Auth 실패: " + (err as Error).message);
    } finally {
      setIsBusy(false);
    }
  };

  // Combat simulator: spin up a player + loop in fallback mode and drop straight
  // into a chosen encounter, skipping the narrative path. Mirrors the Streamlit
  // `_render_combat_simulator_inline` sandbox — used to exercise combat / VFX.
  const handleSimulateCombat = async (encounterId: string, allyIds: string[]) => {
    setIsBusy(true);
    setObStatus("전투 시뮬레이션 준비 중…");
    try {
      const player = await apiConnect({
        display_name: displayName || "시뮬레이터",
        archetype: selectedArchetype,
        scenario_id: selectedScenarioId,
      });
      setPlayerId(player.player_id);
      saveSessionMetadata(player.player_id, selectedScenarioId);

      const snap = await apiBegin({
        player_id: player.player_id,
        scenario_id: selectedScenarioId,
        fallback: true,
      });
      const { combat } = await apiCombatBegin({
        loop_id: snap.loop_id,
        scenario_id: selectedScenarioId,
        encounter_id: encounterId,
        party_members: allyIds.map((id) => ({ id })),
      });

      const combatBgmPath = snap.bgm_path?.includes("bgm_combat")
        ? snap.bgm_path
        : `resources/${selectedScenarioId}/audio/bgm_combat_normal.wav`;
      const combatSnap = { ...snap, combat, bgm_path: combatBgmPath };
      initAudio();
      playBgm(combatBgmPath);
      // Reset the animator baseline so the opening board draws statically
      // (no spurious transition animation from a stale previous state).
      prevCombatRef.current = null;
      setLoopId(snap.loop_id);
      setConnected(true);
      setShowIntro(false);
      setActiveTab("story");
      setFinalizedSnapshot(combatSnap);
      setLastSnapshot(combatSnap);
      setObStatus("");
      setStatus(`${DICTS[getLang()]["sess.combatSimEnter"]}${encounterId}`);
      logToConsole(`전투 시뮬: ${encounterId} (allies=${allyIds.join(",") || "none"})`);
    } catch (err) {
      setObStatus("시뮬레이션 실패: " + (err as Error).message);
      logToConsole("전투 시뮬 실패: " + (err as Error).message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleResumeGame = async (saved: {
    playerId: string;
    scenarioId: string;
    loopId?: string;
  }) => {
    setIsBusy(true);
    setObStatus("이어하는 중…");
    setSceneImageUrl(null);
    setNarrativeHistory([]);
    try {
      setPlayerId(saved.playerId);
      setSelectedScenarioId(saved.scenarioId || selectedScenarioId);

      const snap = await apiActive({
        player_id: saved.playerId,
        loop_id: saved.loopId,
        scenario_id: saved.scenarioId || selectedScenarioId,
      });

      setConnected(true);
      initAudio();
      await openSocket();

      handleReceivedSnapshot(snap);
      setDisplayedNarration(snap.active_scene?.narration || "");
      setFinalizedSnapshot(snap);
      setStatus(DICTS[getLang()]["sess.resumeDone"]);
      setObStatus("");

      if (snap.loop_id) {
        try {
          const { scenes } = await apiGetLoopScenes(snap.loop_id);
          const historyScenes = scenes
            .filter((s) => s.sceneId !== snap.active_scene?.scene_id)
            .map((s) => ({
              sceneId: s.sceneId,
              title: s.title,
              text: s.text,
              action: s.action ?? null,
            }));
          setNarrativeHistory(historyScenes);
        } catch (e) {
          logToConsole("이전 대화 이력 로드 실패: " + (e as Error).message);
        }
      }
    } catch (err) {
      const message = (err as Error).message;
      // The last loop already ended (archived to run history): there is nothing
      // to resume, so clear the stale session and fall back to fresh onboarding.
      if (message.includes("no active loop") || message.includes("archived in run history")) {
        localStorage.removeItem(LS_KEY);
        setResumeSessionData(null);
        setConnected(false);
        setObStatus("이전 세션이 종료되어 기록 보관소로 이동했습니다. 새 게임을 시작하세요.");
      } else {
        setObStatus("이어하기 실패: " + message);
      }
    } finally {
      setIsBusy(false);
    }
  };

  return {
    saveSessionMetadata,
    handleStartGame,
    handleSimulateCombat,
    handleResumeGame,
  };
}
