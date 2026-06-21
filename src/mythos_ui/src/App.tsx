import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  apiGetScenarios,
  apiConnect,
  apiActive,
  apiCombatAction,
  apiResolveAsset,
  apiGetMemory,
  apiGetSlots,
  apiSaveSlot,
  apiGetRuns,
  apiGetLoopScenes,
  apiGetSkillTree,
  apiLearnSkill,
  apiBegin,
  apiCombatBegin,
  apiEquip,
} from "./api";
import { isChoiceDisabled } from "./choices";
import { CodexPanel } from "./CodexPanel";
import { CharacterTabPanel } from "./CharacterTabPanel";
import { DevConsolePanel } from "./DevConsolePanel";
import { GameAside } from "./GameAside";
import { BootIntro } from "./BootIntro";
import { HeaderBar } from "./HeaderBar";
import { OnboardingPanel } from "./OnboardingPanel";
import { StoryPanel } from "./StoryPanel";
import { TabNav } from "./TabNav";
import type { ActiveTab } from "./TabNav";
import { SkillTreePanel } from "./SkillTreePanel";
import { IntroPanel } from "./IntroPanel";
import type { IntroData } from "./IntroPanel";
import type {
  ScenarioInfo,
  ScenarioArchetype,
  RuntimeSnapshot,
  MemoryOverview,
  SaveSlot,
  RunSummary,
  WebSocketMessage,
  AssetInfo,
  CombatAction,
  SkillTreeResponse,
} from "./types";
import { CombatAnimator, prefersReducedMotion } from "./combatEffects";
import { CombatCinema } from "./CombatCinema";
import { LS_KEY, parseResumeSession } from "./sessionStorage";
import type { ResumeSessionData } from "./sessionStorage";
import { buildCodexLists, buildDevConsoleData, buildEpiphanyNotice } from "./viewModels";
import { useAudio } from "./hooks/useAudio";
import { useInGameEpiphany } from "./hooks/useInGameEpiphany";
import { useCombatBoard } from "./hooks/useCombatBoard";
import { useCombatCinemaQueue } from "./hooks/useCombatCinemaQueue";
import { useTypewriter } from "./hooks/useTypewriter";
import { useGameSocket } from "./hooks/useGameSocket";

const firstUnlockedArchetype = (archetypes: ScenarioArchetype[]) =>
  archetypes.find((archetype) => archetype.unlocked !== false)?.name || null;

type NarrativeHistoryItem = {
  sceneId: string;
  title: string;
  text: string;
  action?: string | null;
  result?: string | null;
};

export default function App() {
  // --- Connection / Onboarding State ---
  const [displayName, setDisplayName] = useState("테스터");
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("neo-seoul");
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const fallbackMode = urlParams.get("fallback") === "1" || urlParams.get("fallback") === "true";
  const withImage = !(urlParams.get("image") === "0" || urlParams.get("image") === "false");
  const [obStatus, setObStatus] = useState("");
  const [connected, setConnected] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // 앱 첫 진입(메인 화면) 시 1회 재생되는 부팅 오프닝.
  const [showBoot, setShowBoot] = useState(true);

  const currentScenario = useMemo(() => {
    return scenarios.find((s) => s.id === selectedScenarioId);
  }, [scenarios, selectedScenarioId]);
  const [resumeSessionData, setResumeSessionData] = useState<ResumeSessionData | null>(() =>
    parseResumeSession(localStorage.getItem(LS_KEY))
  );

  // --- Main Run State ---
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loopId, setLoopId] = useState<string | null>(null);
  const [status, setStatus] = useState("대기 중.");
  const [activeTab, setActiveTab] = useState<ActiveTab>("story");
  const [consoleLogs, setConsoleLogs] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [runsHistory, setRunsHistory] = useState<RunSummary[]>([]);
  const [memoryOverview, setMemoryOverview] = useState<MemoryOverview | null>(null);
  const [saveLabelInput, setSaveLabelInput] = useState("");
  const [skillTree, setSkillTree] = useState<SkillTreeResponse | null>(null);
  const [learningSkillId, setLearningSkillId] = useState<string | null>(null);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillNotice, setSkillNotice] = useState<string | null>(null);
  const [dismissedEpiphany, setDismissedEpiphany] = useState<string | null>(() => {
    try {
      return localStorage.getItem("mythos_epiphany_seen");
    } catch {
      return null;
    }
  });

  // --- Typewriter / Narration State ---
  const [lastSnapshot, setLastSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [finalizedSnapshot, setFinalizedSnapshot] = useState<RuntimeSnapshot | null>(null);

  // Typewriter narration reveal (state + streaming refs) lives in a hook; it
  // drains the WS token queue into `displayedNarration` and finalizes the
  // pending snapshot when the stream ends.
  const {
    displayedNarration,
    setDisplayedNarration,
    isStreaming,
    setIsStreaming,
    startTyper,
    resetStreamBuffers,
    narrationQueueRef,
    streamDoneRef,
    pendingSnapshotRef,
  } = useTypewriter(setFinalizedSnapshot);

  // Fires if a pending/processing visual job never reports a terminal status
  // (worker died mid-flight) so the placeholder doesn't spin forever.
  const visualTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Asset / Audio / Cinematic States ---
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [narrativeHistory, setNarrativeHistory] = useState<NarrativeHistoryItem[]>([]);
  // Action the player just took; attached to the scene as it moves into history.
  const pendingActionRef = useRef<string | null>(null);
  const [imagePlaceholderText, setImagePlaceholderText] = useState(
    "이미지 토글을 켜고 접속하면 장면 이미지가 생성됩니다."
  );
  const [kenBurnsActive, setKenBurnsActive] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);



  // --- Combat Control State ---
  const [combatTarget, setCombatTarget] = useState<string | null>(null);
  const [combatLog, setCombatLog] = useState<string>("");

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The combat board animator instance is shared between the cinema-queue driver
  // (which owns the prev/dispatched/pending refs + the board-draw effect) and
  // the board pointer hook.
  const animatorRef = useRef<CombatAnimator | null>(null);

  // --- Utility logging ---
  const logToConsole = (line: string) => {
    setConsoleLogs((prev) => prev + line + "\n");
  };

  // --- Audio Hook ---
  const {
    bgmEnabled,
    bgmReady,
    initAudio,
    playBgm,
    pauseBgm,
    handleToggleBgm,
    playSfx,
    playCombatCinemaCue,
    resetAudioRefs,
    mainBgmPath,
  } = useAudio(
    selectedScenarioId,
    finalizedSnapshot?.bgm_path || lastSnapshot?.bgm_path,
    logToConsole
  );

  // Combat board cinema-queue driver: diffs combat snapshots into per-blow
  // CombatCinema overlays + board tweens; owns the prev/dispatched/pending refs
  // and the board-draw effect, and exposes the overlay impact/finish callbacks.
  const {
    cinemaContext,
    cinemaQueue,
    prevCombatRef,
    dispatchedActionRef,
    onCinemaImpact,
    onCinemaFinish,
  } = useCombatCinemaQueue({
    finalizedSnapshot,
    selectedScenarioId,
    fallbackMode,
    activeTab,
    canvasRef,
    animatorRef,
    playSfx,
  });

  // WebSocket connect + auto-reconnect lifecycle lives in a hook; it parses each
  // inbound frame and hands it to `handleSocketMessage` (the type switch stays
  // here), and exposes `openSocket`/`closeSocket` plus the live `websocketRef`.
  const handleSocketMessage = (msg: WebSocketMessage) => {
    if (msg.type === "token" && msg.content) {
      narrationQueueRef.current += msg.content;
    } else if (msg.type === "snapshot" && msg.data) {
      streamDoneRef.current = true;
      pendingSnapshotRef.current = msg.data;
      setStatus("장면 확정.");
      handleReceivedSnapshot(msg.data);
    } else if (msg.type === "visual_status") {
      onVisualStatus(msg);
    } else if (msg.type === "error") {
      streamDoneRef.current = true;
      setIsStreaming(false);
      setStatus("오류: " + (msg.detail || "알 수 없음"));
      logToConsole("WS error: " + (msg.detail || ""));
    }
  };

  const { websocketRef, openSocket, closeSocket } = useGameSocket({
    onMessage: handleSocketMessage,
    logToConsole,
  });

  // --- Onboarding & Setup effect ---
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const data = await apiGetScenarios(resumeSessionData?.playerId);
        setScenarios(data.scenarios || []);
        if (data.scenarios.length > 0) {
          const firstPlayable =
            data.scenarios.find((s) => s.unlocked !== false) || data.scenarios[0];
          setSelectedScenarioId(firstPlayable.id);
          setSelectedArchetype(firstUnlockedArchetype(firstPlayable.archetypes || []));
        }
      } catch (e) {
        logToConsole("시나리오 목록 로드 실패: " + (e as Error).message);
      }
    };
    loadScenarios();
  }, [resumeSessionData?.playerId]);

  // --- WebSocket Streaming logic ---
  const beginStream = useCallback((statusLabel: string) => {
    const prevScene = finalizedSnapshot?.active_scene;
    if (prevScene) {
      const takenAction = pendingActionRef.current;
      setNarrativeHistory((prev) => {
        if (prev.some((h) => h.sceneId === prevScene.scene_id)) return prev;
        return [
          ...prev,
          {
            sceneId: prevScene.scene_id,
            title: prevScene.title,
            text: prevScene.narration,
            action: takenAction,
          },
        ];
      });
    }
    pendingActionRef.current = null;

    resetStreamBuffers();
    setStatus(statusLabel);
    startTyper();
  }, [resetStreamBuffers, startTyper, finalizedSnapshot]);

  const clearVisualTimeout = () => {
    if (visualTimeoutRef.current) {
      clearTimeout(visualTimeoutRef.current);
      visualTimeoutRef.current = null;
    }
  };

  const onVisualStatus = (msg: WebSocketMessage) => {
    clearVisualTimeout();
    if (msg.status === "pending" || msg.status === "processing") {
      setImagePlaceholderText(`그림 생성 중… (${msg.status})`);
      // No terminal status within the budget ⇒ worker is likely down or stalled.
      visualTimeoutRef.current = setTimeout(() => {
        setImagePlaceholderText(
          "이미지 생성이 지연됩니다 — visual worker가 응답하지 않을 수 있습니다. `make visual-worker-logs`로 확인하거나 `make dev-up`으로 워커와 함께 기동하세요."
        );
        logToConsole("visual_status timeout: worker 무응답(90s)");
      }, 90000);
    } else if (msg.status === "succeeded" && msg.url) {
      setSceneImageUrl(msg.url);
    } else {
      setImagePlaceholderText("그림 생성 실패: " + msg.status);
      logToConsole("visual_status: " + msg.status);
    }
  };

  const imageOpts = useCallback(() => {
    return {
      with_image: withImage,
      visual_async: withImage,
      image_every_turn: withImage,
    };
  }, [withImage]);

  const sendChoose = useCallback((choiceId: string) => {
    if (isStreaming) return;
    // Remember the chosen label so it can be recorded against the scene it was
    // taken in once that scene scrolls into history.
    const chosen = finalizedSnapshot?.active_scene?.choices?.find(
      (c) => c.choice_id === choiceId
    );
    pendingActionRef.current = chosen?.label ?? null;
    // Keep previous image visible until the new one is generated asynchronously
    clearVisualTimeout();
    setImagePlaceholderText("그림 생성 준비 중…");
    beginStream("선택 적용 · 스트리밍…");
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          event: "choose",
          loop_id: loopId,
          choice_id: choiceId,
          scenario_id: selectedScenarioId,
          fallback: fallbackMode,
          ...imageOpts(),
        })
      );
    }
  }, [beginStream, fallbackMode, finalizedSnapshot, imageOpts, isStreaming, loopId, selectedScenarioId, websocketRef]);

  const handleReceivedSnapshot = (snap: RuntimeSnapshot) => {
    setLoopId(snap.loop_id);
    setLastSnapshot(snap);
    const resultSummary = snap.active_scene?.choice_result?.summary;
    if (resultSummary) {
      setNarrativeHistory((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.result) return prev;
        return [...prev.slice(0, -1), { ...last, result: resultSummary }];
      });
    }
    resolveImage(snap.assets || []);
    if (withImage && !(snap.assets || []).some((a) => a.status === "pending" || a.status === "processing" || a.status === "succeeded")) {
      const currentNode = snap.state?._route_map?.current
        ? snap.state._route_map.nodes?.[snap.state._route_map.current]
        : null;
      const hasCuratedImage = Boolean(currentNode?.anchor && currentNode?.image);
      setImagePlaceholderText(
        hasCuratedImage
          ? "이 주요 장면은 사전 제작 이미지를 우선 표시합니다."
          : "새 장면 이미지가 아직 생성되지 않았습니다. visual worker가 꺼져 있거나 이미 처리 중인 이미지가 있으면 생성 요청을 건너뜁니다."
      );
    }
    loadSlotsAndRuns(snap.player?.player_id || playerId || "");
    playBgm(snap.bgm_path || "");
    triggerCinematicEffects(snap);
  };

  const resolveImage = async (assets: AssetInfo[]) => {
    const ok = assets.find((a) => a.status === "succeeded" && a.storage_uri);
    if (!ok) return;
    try {
      const { url } = await apiResolveAsset(ok.storage_uri);
      setSceneImageUrl(url);
    } catch (err) {
      logToConsole("이미지 resolve 실패: " + (err as Error).message);
    }
  };

  const triggerCinematicEffects = (snap: RuntimeSnapshot) => {
    setKenBurnsActive(false);
    setGlitchActive(false);

    // Accessibility: skip the entry glitch/Ken Burns motion under reduced-motion.
    if (prefersReducedMotion()) return;

    if (snap.active_scene && snap.active_scene.turn_index === 0) {
      logToConsole("시네마틱 효과 기동 (turn_index = 0)");
      setKenBurnsActive(true);
      setGlitchActive(true);

      setTimeout(() => {
        playSfx("sfx_move");
      }, 200);

      setTimeout(() => {
        setGlitchActive(false);
      }, 3200);
    }
  };

  // --- API load functions ---
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
        setSkillNotice(`${name} 강화 완료: Rank ${before.rank} → ${after.rank}. 통찰 잔액 ${tree.insight_points}p`);
      } else if (after?.status === "learned") {
        setSkillNotice(`${name} 습득 완료: 다음 전투부터 액션바에서 사용할 수 있습니다. 통찰 잔액 ${tree.insight_points}p`);
      } else {
        setSkillNotice(`${name} 갱신 완료. 통찰 잔액 ${tree.insight_points}p`);
      }
      logToConsole(`스킬 갱신: ${skillId} (통찰 잔액 ${tree.insight_points}p)`);
    } catch (e) {
      setSkillError((e as Error).message);
    } finally {
      setLearningSkillId(null);
    }
  };

  // --- Session lifecycle handlers ---
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

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    const archs = scenarios.find((s) => s.id === scenarioId)?.archetypes || [];
    setSelectedArchetype(firstUnlockedArchetype(archs));
    if (!connected && bgmEnabled && bgmReady) {
      playBgm(`resources/${scenarioId}/audio/bgm_main.wav`);
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
        setImagePlaceholderText("그림 생성 준비 중…");
        resetStreamBuffers();
        setStatus("루프 생성 · 토큰 스트리밍…");
        setIsStreaming(true);

        ws.send(
          JSON.stringify({
            event: "begin",
            player_id: player.player_id,
            scenario_id: selectedScenarioId,
            fallback: fallbackMode,
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
      setStatus(`전투 시뮬레이션 진입 · ${encounterId}`);
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
      setStatus("이어하기 완료.");
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

  // --- Combat REST Operations ---
  const handleCombatAction = async (action: CombatAction) => {
    if (isBusy || !loopId) return;
    setIsBusy(true);
    setStatus("행동 처리 중…");

    // Hand the dispatched action to the board animator (for the attack/cast
    // connector); impact SFX now fire on the animation's impact frame.
    dispatchedActionRef.current = action;

    try {
      const response = await apiCombatAction({
        loop_id: loopId,
        scenario_id: selectedScenarioId,
        action,
      });

      if (response.prose) {
        setDisplayedNarration(response.prose);
        appendCombatLog(response.prose);
      }

      const baseSnapshot = finalizedSnapshot || lastSnapshot;
      if (!baseSnapshot) {
        setStatus("행동 실패: 갱신할 스냅샷이 없습니다.");
        logToConsole("Combat 오류: 갱신할 스냅샷이 없습니다.");
        return;
      }

      // Update snapshot combat
      const updatedSnapshot = {
        ...baseSnapshot,
        combat: response.combat,
      };
      setFinalizedSnapshot(updatedSnapshot);
      setLastSnapshot(updatedSnapshot);
      // Victory/defeat SFX fire at the end of the board animation (see CombatAnimator).
      setStatus("행동 적용.");
    } catch (e) {
      setStatus("행동 실패: " + (e as Error).message);
      logToConsole("Combat 오류: " + (e as Error).message);
    } finally {
      setIsBusy(false);
    }
  };

  const appendCombatLog = (prose: string) => {
    const timeStr = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    setCombatLog((prev) => `[${timeStr}] ${prose}\n` + prev);
  };

  const handleEquip = (itemId: string, equipped: boolean) => {
    if (!loopId) return;
    apiEquip({ loop_id: loopId, item_id: itemId, equipped })
      .then((snap) => setFinalizedSnapshot(snap))
      .catch((err) => console.error("equip failed", err));
  };

  const continueAfterCombat = () => {
    if (isStreaming) return;
    setCombatLog("");
    setCombatTarget(null);
    pendingActionRef.current = "전투의 여파를 살피고 다음 행동을 준비한다";
    // Keep previous image visible until the new one is generated asynchronously
    clearVisualTimeout();
    setImagePlaceholderText("그림 생성 준비 중…");
    beginStream("전투 이후 · 스트리밍…");

    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          event: "choose",
          loop_id: loopId,
          scenario_id: selectedScenarioId,
          action: "전투의 여파를 살피고 다음 행동을 준비한다",
          fallback: fallbackMode,
          ...imageOpts(),
        })
      );
    }
  };

  // --- Keyboard hotkeys choice select ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 9 && finalizedSnapshot) {
        const choices = finalizedSnapshot.active_scene?.choices || [];
        const choice = choices[keyNum - 1];
        if (choice) {
          if (
            !isChoiceDisabled(
              choice,
              finalizedSnapshot.stability,
              finalizedSnapshot.tension
            )
          ) {
            sendChoose(choice.choice_id);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finalizedSnapshot, sendChoose]);

  // Combat board pointer interaction (drag-to-move + tile inspector + zoom)
  // lives in a hook; it draws onto the shared canvasRef and dispatches moves
  // back through handleCombatAction.
  const {
    combatInspectCell,
    boardZoom,
    handleBoardZoom,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasPointerLeave,
  } = useCombatBoard({
    finalizedSnapshot,
    canvasRef,
    animatorRef,
    isBusy,
    selectedScenarioId,
    onCombatAction: handleCombatAction,
  });

  // --- Codex list rendering data mapping ---
  const codexLists = useMemo(() => {
    return buildCodexLists(memoryOverview, finalizedSnapshot, currentScenario);
  }, [memoryOverview, finalizedSnapshot, currentScenario]);

  const epiphanyNotice = useMemo(() => {
    const notice = buildEpiphanyNotice(runsHistory, scenarios);
    return notice && notice.loopId !== dismissedEpiphany ? notice : null;
  }, [runsHistory, scenarios, dismissedEpiphany]);

  const dismissEpiphany = useCallback((loopId: string) => {
    setDismissedEpiphany(loopId);
    try {
      localStorage.setItem("mythos_epiphany_seen", loopId);
    } catch {
      /* ignore storage failures */
    }
  }, []);

  // --- In-Game Epiphany State ---
  const { showInGameNotice, setShowInGameNotice, getSkillName } = useInGameEpiphany(
    finalizedSnapshot,
    currentScenario
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

  return (
    <>
      <HeaderBar
        connected={connected}
        displayName={displayName}
        selectedScenarioId={selectedScenarioId}
        playerName={finalizedSnapshot?.player?.display_name}
        archetype={finalizedSnapshot?.player?.traits?.archetype}
        selectedArchetype={selectedArchetype}
        bgmEnabled={bgmEnabled}
        bgmReady={bgmReady}
        onToggleBgm={handleToggleBgm}
        onLeaveSession={handleLeaveSession}
      />

      {!connected && showBoot && (
        <BootIntro
          uiCopy={currentScenario?.ui_copy}
          scenarioId={selectedScenarioId}
          onEnter={() => {
            setShowBoot(false);
            if (bgmEnabled) {
              initAudio();
              playBgm(mainBgmPath(), true);
            }
          }}
        />
      )}

      {!connected && !showBoot && epiphanyNotice && (
        <div className="epiphany-banner" id="epiphany-banner">
          <div className="epiphany-head">
            <span>✦ 새로운 깨달음</span>
            <button
              type="button"
              onClick={() => dismissEpiphany(epiphanyNotice.loopId)}
              aria-label="깨달음 알림 닫기"
            >
              ✕
            </button>
          </div>
          <div className="epiphany-body">
            지난 루프의 경험으로 새로운 스킬이 해금되었습니다. SKILL TREE 탭에서 통찰을 투자해 습득하세요.
            <ul>
              {epiphanyNotice.skills.map((skill) => (
                <li key={skill.name}>
                  <strong>{skill.name}</strong>
                  {skill.hint ? ` — ${skill.hint}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!connected && !showBoot && (
        <OnboardingPanel
          displayName={displayName}
          selectedScenarioId={selectedScenarioId}
          selectedArchetype={selectedArchetype}
          scenarios={scenarios}
          isBusy={isBusy}
          obStatus={obStatus}
          resumeSessionData={resumeSessionData}
          onDisplayNameChange={setDisplayName}
          onScenarioChange={handleScenarioChange}
          onArchetypeChange={setSelectedArchetype}
          onStartGame={handleStartGame}
          onResumeGame={handleResumeGame}
          onSimulateCombat={handleSimulateCombat}
        />
      )}

      {/* --- Active Game Dashboard --- */}
      {connected && showIntro && currentScenario?.ui_copy?.session_intro ? (
        <IntroPanel
          introData={currentScenario.ui_copy.session_intro as IntroData}
          scenarioId={selectedScenarioId}
          onAccept={() => {
            setShowIntro(false);
            initAudio(); // unlock the audio context on this gesture (no-op play if BGM off)
            // Respect the BGM preference: only auto-start music if it's enabled.
            // Force-playing here regardless of bgmEnabled is what showed the toggle
            // as OFF while sound kept playing (and took two presses to actually stop).
            if (bgmEnabled) {
              if (finalizedSnapshot?.bgm_path) {
                playBgm(finalizedSnapshot.bgm_path, true);
              } else if (lastSnapshot?.bgm_path) {
                playBgm(lastSnapshot.bgm_path, true);
              } else {
                playBgm(mainBgmPath(), true);
              }
            }
          }}
        />
      ) : connected && (
        <>
          {showInGameNotice && (
            <div
              className="ingame-epiphany-banner"
              id="ingame-epiphany-banner"
              onClick={() => setShowInGameNotice(null)}
            >
              <div className="banner-title">✦ 실시간 깨달음 획득! ✦</div>
              <div className="banner-body">
                새로운 스킬이 해금되었습니다: <strong>{getSkillName(showInGameNotice)}</strong>
                <br />
                <span className="banner-hint">상단 SKILL TREE 탭에서 통찰을 투자해 습득할 수 있습니다.</span>
              </div>
            </div>
          )}
          <main id="play">
          <section>
            <TabNav activeTab={activeTab} onTabClick={handleTabClick} notices={tabNotices} />

            {activeTab === "story" && (
              <StoryPanel
                status={status}
                snapshot={finalizedSnapshot}
                displayedNarration={displayedNarration}
                isStreaming={isStreaming}
                combatTarget={combatTarget}
                combatLog={combatLog}
                sceneImageUrl={sceneImageUrl}
                imagePlaceholderText={imagePlaceholderText}
                glitchActive={glitchActive}
                kenBurnsActive={kenBurnsActive}
                canvasRef={canvasRef}
                onChoose={sendChoose}
                onLeaveSession={handleLeaveSession}
                onSelectCombatTarget={setCombatTarget}
                onCombatAction={handleCombatAction}
                onReturnToMain={handleLeaveSession}
                onContinueAfterCombat={continueAfterCombat}
                onCanvasPointerDown={handleCanvasPointerDown}
                onCanvasPointerMove={handleCanvasPointerMove}
                onCanvasPointerUp={handleCanvasPointerUp}
                onCanvasPointerCancel={handleCanvasPointerCancel}
                onCanvasPointerLeave={handleCanvasPointerLeave}
                combatInspectCell={combatInspectCell}
                scenarioId={selectedScenarioId}
                narrativeHistory={narrativeHistory}
                scenarioCharacters={currentScenario?.characters}
                onEquip={handleEquip}
                boardZoom={boardZoom}
                onBoardZoom={handleBoardZoom}
              />
            )}

            {activeTab === "codex" && codexLists && (
              <CodexPanel
                codexLists={codexLists}
                routeMap={finalizedSnapshot?.state?._route_map}
                snapshot={finalizedSnapshot}
                runsHistory={runsHistory}
                memoryOverview={memoryOverview}
                scenarioId={selectedScenarioId}
              />
            )}

            {activeTab === "character" && codexLists && (
              <CharacterTabPanel
                codexLists={codexLists}
                snapshot={finalizedSnapshot}
                onEquip={handleEquip}
              />
            )}

            {activeTab === "skills" && codexLists && (
              <SkillTreePanel
                codexLists={codexLists}
                skillTree={skillTree}
                onLearnSkill={handleLearnSkill}
                learningSkillId={learningSkillId}
                skillError={skillError}
                skillNotice={skillNotice}
              />
            )}

            {activeTab === "dev" && devConsoleData && (
              <DevConsolePanel
                data={devConsoleData}
                snapshot={finalizedSnapshot}
              />
            )}
          </section>

          <GameAside
            saveLabelInput={saveLabelInput}
            saveSlots={saveSlots}
            isBusy={isBusy}
            canSave={Boolean(loopId)}
            playerId={playerId || ""}
            scenarioId={selectedScenarioId}
            finalizedSnapshot={finalizedSnapshot}
            consoleLogs={consoleLogs}
            onSaveLabelChange={setSaveLabelInput}
            onSave={handleSaveSlotSubmit}
            onLoad={handleResumeGame}
          />
        </main>
        </>
      )}

      {cinemaContext && (
        <CombatCinema
          key={`${cinemaContext.attacker.id}->${cinemaContext.defender.id}#${cinemaQueue.length}`}
          scenarioId={selectedScenarioId}
          attacker={cinemaContext.attacker}
          defender={cinemaContext.defender}
          damage={cinemaContext.damage}
          kind={cinemaContext.kind}
          crit={cinemaContext.crit}
          skillName={cinemaContext.skillName}
          miss={cinemaContext.miss}
          onImpact={onCinemaImpact}
          onCue={(cue) => playCombatCinemaCue(cinemaContext, cue)}
          onFinish={onCinemaFinish}
        />
      )}
    </>
  );
}
