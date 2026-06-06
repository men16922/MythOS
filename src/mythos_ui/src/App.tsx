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
  apiBegin,
  apiCombatBegin,
  getWebSocketUrl,
} from "./api";
import { isChoiceDisabled } from "./choices";
import { CodexPanel } from "./CodexPanel";
import { DevConsolePanel } from "./DevConsolePanel";
import { GameAside } from "./GameAside";
import { BootIntro } from "./BootIntro";
import { HeaderBar } from "./HeaderBar";
import { OnboardingPanel } from "./OnboardingPanel";
import { StoryPanel } from "./StoryPanel";
import { TabNav } from "./TabNav";
import { IntroPanel } from "./IntroPanel";
import type { IntroData } from "./IntroPanel";
import type {
  ScenarioInfo,
  RuntimeSnapshot,
  MemoryOverview,
  SaveSlot,
  RunSummary,
  WebSocketMessage,
  AssetInfo,
  CombatAction,
  CombatState,
} from "./types";
import { drawCombatCanvas, combatCellFromPoint } from "./combatCanvas";
import type { CombatDragOverlay } from "./combatCanvas";
import { CombatAnimator, prefersReducedMotion } from "./combatEffects";
import { LS_KEY, parseResumeSession } from "./sessionStorage";
import type { ResumeSessionData } from "./sessionStorage";
import { buildCodexLists, buildDevConsoleData } from "./viewModels";

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
  const [activeTab, setActiveTab] = useState<"story" | "codex" | "dev">("story");
  const [consoleLogs, setConsoleLogs] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [runsHistory, setRunsHistory] = useState<RunSummary[]>([]);
  const [memoryOverview, setMemoryOverview] = useState<MemoryOverview | null>(null);
  const [saveLabelInput, setSaveLabelInput] = useState("");

  // --- Typewriter / Narration State ---
  const [displayedNarration, setDisplayedNarration] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [finalizedSnapshot, setFinalizedSnapshot] = useState<RuntimeSnapshot | null>(null);

  // Typewriter Refs
  const narrationQueueRef = useRef("");
  const narrationTypedRef = useRef("");
  const streamDoneRef = useRef(false);
  const pendingSnapshotRef = useRef<RuntimeSnapshot | null>(null);

  // --- Asset / Audio / Cinematic States ---
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [narrativeHistory, setNarrativeHistory] = useState<{ sceneId: string; title: string; text: string; action?: string | null }[]>([]);
  // Action the player just took; attached to the scene as it moves into history.
  const pendingActionRef = useRef<string | null>(null);
  const [imagePlaceholderText, setImagePlaceholderText] = useState(
    "이미지 토글을 켜고 접속하면 장면 이미지가 생성됩니다."
  );
  const [kenBurnsActive, setKenBurnsActive] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);

  // Audio Refs
  const audioContextActive = useRef(false);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmSrc = useRef("");

  // --- Combat Control State ---
  const [combatTarget, setCombatTarget] = useState<string | null>(null);
  const [combatLog, setCombatLog] = useState<string>("");

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Combat board animation: the animator diffs prev→next combat states and
  // tweens movement / damage / death; the dispatched action lets it draw the
  // attack/cast connector the snapshot diff can't recover.
  const animatorRef = useRef<CombatAnimator | null>(null);
  const prevCombatRef = useRef<CombatState | null>(null);
  const dispatchedActionRef = useRef<CombatAction | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExplicitCloseRef = useRef(false);

  // --- Utility logging ---
  const logToConsole = (line: string) => {
    setConsoleLogs((prev) => prev + line + "\n");
  };

  // --- Audio Engine Helpers ---
  const initAudio = () => {
    if (audioContextActive.current) return;
    audioContextActive.current = true;
    logToConsole("오디오 장치가 활성화되었습니다.");
    if (lastSnapshot?.bgm_path) {
      playBgm(lastSnapshot.bgm_path);
    }
  };

  const playBgm = (bgmPath: string) => {
    if (!audioContextActive.current || !bgmPath) return;

    let srcUrl = bgmPath;
    if (!bgmPath.startsWith("http") && !bgmPath.startsWith("/")) {
      srcUrl = "/" + bgmPath;
    }

    if (srcUrl.includes("resources/")) {
      srcUrl = "/resources/" + srcUrl.substring(srcUrl.indexOf("resources/") + 10);
    }

    if (currentBgmSrc.current === srcUrl) return;
    currentBgmSrc.current = srcUrl;

    if (bgmAudioRef.current) {
      try {
        bgmAudioRef.current.pause();
      } catch {
        logToConsole("기존 BGM 정지 중 오류가 발생했습니다.");
      }
    }

    logToConsole("배경 음악(BGM) 로드: " + srcUrl);
    const audio = new Audio(srcUrl);
    audio.loop = true;
    audio.volume = 0.45;
    bgmAudioRef.current = audio;
    audio.play().catch(() => {
      logToConsole("BGM 자동재생이 차단되었습니다. 상호작용 후 재생됩니다.");
    });
  };

  const playSfx = (key: string) => {
    if (!audioContextActive.current) return;
    const scenario = finalizedSnapshot?.player?.traits?.scenario_id || selectedScenarioId;
    const srcUrl = `/resources/${scenario}/audio/sfx/${key}.wav`;
    const audio = new Audio(srcUrl);
    audio.volume = 0.55;
    audio.play().catch(() => {
      logToConsole("SFX 재생이 차단되었거나 파일을 찾을 수 없습니다.");
    });
  };

  // --- Onboarding & Setup effect ---
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const data = await apiGetScenarios();
        setScenarios(data.scenarios || []);
        if (data.scenarios.length > 0) {
          setSelectedScenarioId(data.scenarios[0].id);
          const archs = data.scenarios[0].archetypes || [];
          if (archs.length > 0) {
            setSelectedArchetype(archs[0].name);
          }
        }
      } catch (e) {
        logToConsole("시나리오 목록 로드 실패: " + (e as Error).message);
      }
    };
    loadScenarios();
  }, []);

  // --- WebSocket Streaming logic ---
  const startTyper = useCallback(() => {
    setIsStreaming(true);
  }, []);

  // Typewriter Loop
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      if (narrationQueueRef.current.length > 0) {
        // Drain the queue quickly so the typewriter keeps pace with the token
        // stream and doesn't add a trailing delay once generation is done.
        const step = Math.max(3, Math.ceil(narrationQueueRef.current.length / 24));
        const sliceStr = narrationQueueRef.current.slice(0, step);
        narrationQueueRef.current = narrationQueueRef.current.slice(step);
        narrationTypedRef.current += sliceStr;
        setDisplayedNarration(narrationTypedRef.current);
      } else if (streamDoneRef.current) {
        clearInterval(interval);
        setIsStreaming(false);
        setDisplayedNarration(narrationTypedRef.current);
        if (pendingSnapshotRef.current) {
          setFinalizedSnapshot(pendingSnapshotRef.current);
        }
      }
    }, 12);
    return () => clearInterval(interval);
  }, [isStreaming]);

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

    streamDoneRef.current = false;
    pendingSnapshotRef.current = null;
    narrationQueueRef.current = "";
    narrationTypedRef.current = "";
    setDisplayedNarration("");
    setStatus(statusLabel);
    startTyper();
  }, [startTyper, finalizedSnapshot]);

  const onVisualStatus = (msg: WebSocketMessage) => {
    if (msg.status === "pending" || msg.status === "processing") {
      setImagePlaceholderText(`그림 생성 중… (${msg.status})`);
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
  }, [beginStream, fallbackMode, finalizedSnapshot, imageOpts, isStreaming, loopId, selectedScenarioId]);

  const openSocket = (): Promise<WebSocket> => {
    isExplicitCloseRef.current = false;
    return new Promise((resolve, reject) => {
      const url = getWebSocketUrl();
      logToConsole("WS 소켓 연결 시도: " + url);
      const ws = new WebSocket(url);
      websocketRef.current = ws;

      ws.onopen = () => {
        logToConsole("WS 소켓 연결 완료.");
        reconnectAttemptsRef.current = 0; // Reset reconnection attempts on success
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WebSocketMessage;
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
        } catch (e) {
          logToConsole("WS 수신 패킷 파싱 실패: " + (e as Error).message);
        }
      };

      ws.onerror = (err) => {
        logToConsole("WS 소켓 오류 발생.");
        reject(err);
      };

      ws.onclose = () => {
        logToConsole("WS 연결 종료.");
        websocketRef.current = null;

        // Auto reconnect logic
        if (!isExplicitCloseRef.current) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(5000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
            logToConsole(`WS 연결이 유실되었습니다. ${delay / 1000}초 후 재접속을 시도합니다. (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              openSocket().catch((err) => {
                logToConsole("WS 재접속 실패: " + (err as Error).message);
              });
            }, delay);
          } else {
            logToConsole("WS 최대 재접속 시도 횟수를 초과했습니다. 새로고침이 필요할 수 있습니다.");
          }
        }
      };
    });
  };

  const handleReceivedSnapshot = (snap: RuntimeSnapshot) => {
    setLoopId(snap.loop_id);
    setLastSnapshot(snap);
    resolveImage(snap.assets || []);
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
      setSaveSlots(slotsData.slots || []);
      setRunsHistory(runsData.runs || []);
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
    setSelectedArchetype(archs.length > 0 ? archs[0].name : null);
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
      playBgm(`resources/${selectedScenarioId}/audio/bgm_main.wav`);
      logToConsole(`접속: ${player.player_id} (${selectedArchetype || "-"})`);

      const ws = await openSocket();
      // Wait slightly for websocket
      setTimeout(() => {
        // Send begin event
         setSceneImageUrl(null);
        setNarrativeHistory([]);
        setImagePlaceholderText("그림 생성 준비 중…");
        streamDoneRef.current = false;
        pendingSnapshotRef.current = null;
        narrationQueueRef.current = "";
        narrationTypedRef.current = "";
        setDisplayedNarration("");
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

      const combatSnap = { ...snap, combat };
      initAudio();
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
    isExplicitCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (websocketRef.current) {
      try {
        websocketRef.current.close();
      } catch {
        logToConsole("WS 종료 중 오류가 발생했습니다.");
      }
      websocketRef.current = null;
    }
    if (bgmAudioRef.current) {
      try {
        bgmAudioRef.current.pause();
      } catch {
        logToConsole("BGM 정지 중 오류가 발생했습니다.");
      }
      bgmAudioRef.current = null;
    }
    currentBgmSrc.current = "";
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
    apiGetScenarios()
      .then((data) => {
        setScenarios(data.scenarios || []);
        setResumeSessionData(parseResumeSession(localStorage.getItem(LS_KEY)));
      })
      .catch((err: unknown) => {
        logToConsole("시나리오 목록 갱신 실패: " + (err as Error).message);
      });
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

  const continueAfterCombat = () => {
    if (isStreaming) return;
    setCombatLog("");
    setCombatTarget(null);
    pendingActionRef.current = "전투의 여파를 살피고 다음 행동을 준비한다";
    // Keep previous image visible until the new one is generated asynchronously
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
    if (!canvasRef.current || !combat) {
      prevCombatRef.current = combat;
      return;
    }
    const prev = prevCombatRef.current;
    const dispatched = dispatchedActionRef.current;
    dispatchedActionRef.current = null;
    if (prev && prev !== combat) {
      animator.animate(prev, combat, {
        dispatched,
        instant: fallbackMode || prefersReducedMotion(),
        onSfx: playSfx,
      });
    } else {
      animator.drawStatic(combat);
    }
    prevCombatRef.current = combat;
    // playSfx is intentionally omitted: this effect must fire only on combat
    // state changes, not on every render that recreates the SFX closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalizedSnapshot, selectedScenarioId, fallbackMode]);

  // Combat board drag & drop: pick up the current actor's blip, drag it to a
  // reachable tile, and drop to move. A plain click no longer teleports the unit.
  const dragRef = useRef<{ blipId: string; origin: [number, number] } | null>(null);

  const redrawCombat = (drag?: CombatDragOverlay) => {
    const canvas = canvasRef.current;
    const combat = finalizedSnapshot?.combat;
    if (!canvas || !combat) return;
    drawCombatCanvas(canvas, combat, selectedScenarioId, drag);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const combat = finalizedSnapshot?.combat;
    const canvas = canvasRef.current;
    if (!combat?.radar || !canvas || isBusy || animatorRef.current?.isAnimating()) return;
    const av = combat.available;
    if (!av || !av.can_act) return;

    const [cx, cy] = combatCellFromPoint(canvas, combat.radar, e.clientX, e.clientY);
    const actor = combat.radar.blips.find((b) => b.id === combat.radar!.current);
    if (!actor || actor.x !== cx || actor.y !== cy) return; // must grab the active unit

    dragRef.current = { blipId: actor.id, origin: [cx, cy] };
    canvas.setPointerCapture?.(e.pointerId);
    canvas.style.cursor = "grabbing";
    const rect = canvas.getBoundingClientRect();
    redrawCombat({
      blipId: actor.id,
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      targetCell: [cx, cy],
      valid: false,
    });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const combat = finalizedSnapshot?.combat;
    const canvas = canvasRef.current;
    if (!combat?.radar || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const [cx, cy] = combatCellFromPoint(canvas, combat.radar, e.clientX, e.clientY);

    if (!dragRef.current) {
      // Hover affordance: show "grab" cursor over the active, controllable unit.
      const av = combat.available;
      const actor = combat.radar.blips.find((b) => b.id === combat.radar!.current);
      const overActor = !!actor && actor.x === cx && actor.y === cy;
      canvas.style.cursor = overActor && av?.can_act && !isBusy ? "grab" : "default";
      return;
    }

    const reachable = combat.available?.reachable || [];
    const valid = reachable.some(([x, y]: [number, number]) => x === cx && y === cy);
    redrawCombat({
      blipId: dragRef.current.blipId,
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      targetCell: [cx, cy],
      valid,
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const combat = finalizedSnapshot?.combat;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = "default";
    if (!canvas || !combat?.radar) {
      redrawCombat();
      return;
    }
    const [cx, cy] = combatCellFromPoint(canvas, combat.radar, e.clientX, e.clientY);
    const reachable = combat.available?.reachable || [];
    const moved =
      (cx !== drag.origin[0] || cy !== drag.origin[1]) &&
      reachable.some(([x, y]: [number, number]) => x === cx && y === cy);
    redrawCombat(); // clear the drag overlay
    if (moved) handleCombatAction({ type: "wait", x: cx, y: cy });
  };

  const handleCanvasPointerCancel = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = "default";
    redrawCombat();
  };

  // --- Codex list rendering data mapping ---
  const codexLists = useMemo(() => {
    return buildCodexLists(memoryOverview, finalizedSnapshot);
  }, [memoryOverview, finalizedSnapshot]);

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
  const handleTabClick = (tab: "story" | "codex" | "dev") => {
    setActiveTab(tab);
    if (tab === "codex" || tab === "dev") {
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
        onLeaveSession={handleLeaveSession}
      />

      {!connected && showBoot && (
        <BootIntro
          uiCopy={currentScenario?.ui_copy}
          scenarioId={selectedScenarioId}
          onEnter={() => setShowBoot(false)}
        />
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
            if (finalizedSnapshot?.bgm_path) {
              playBgm(finalizedSnapshot.bgm_path);
            } else if (lastSnapshot?.bgm_path) {
              playBgm(lastSnapshot.bgm_path);
            }
          }}
        />
      ) : connected && (
        <main id="play">
          <section>
            <TabNav activeTab={activeTab} onTabClick={handleTabClick} />

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
                scenarioId={selectedScenarioId}
                narrativeHistory={narrativeHistory}
                scenarioCharacters={currentScenario?.characters}
              />
            )}

            {activeTab === "codex" && codexLists && (
              <CodexPanel codexLists={codexLists} />
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
            runsHistory={runsHistory}
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
      )}
    </>
  );
}
