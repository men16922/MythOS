import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { apiGetScenarios, stablePlayerId } from "./api";
import { firstUnlockedArchetype } from "./archetypes";
import { CharacterTabPanel } from "./CharacterTabPanel";
import { GameAside } from "./GameAside";
import { GameIcon } from "./icons";
import { BootIntro } from "./BootIntro";
import { HeaderBar } from "./HeaderBar";
import { OnboardingPanel } from "./OnboardingPanel";
import { InviteGate } from "./InviteGate";
import { BoonOffer } from "./BoonOffer";
import { MarketExchange } from "./MarketExchange";
import { StoryPanel } from "./StoryPanel";
import { TabNav } from "./TabNav";
import type { ActiveTab } from "./TabNav";
import { useTabSwipe } from "./hooks/useTabSwipe";
import { IntroPanel } from "./IntroPanel";
import type {
  ScenarioInfo,
  RuntimeSnapshot,
  MemoryOverview,
  RunSummary,
  SkillTreeResponse,
} from "./types";
import { CombatAnimator } from "./combatEffects";
import { CombatInterstitial } from "./CombatInterstitial";
import { CombatTutorial } from "./CombatTutorial";
import { LS_KEY, parseResumeSession } from "./sessionStorage";
import type { ResumeSessionData } from "./sessionStorage";
import { buildCodexLists, buildDevConsoleData } from "./viewModels";
import { useAudio } from "./hooks/useAudio";
import { useInGameEpiphany } from "./hooks/useInGameEpiphany";
import { useCombatBoard } from "./hooks/useCombatBoard";
import { useCombatCinemaQueue } from "./hooks/useCombatCinemaQueue";
import { useTypewriter } from "./hooks/useTypewriter";
import { useSceneVisuals } from "./hooks/useSceneVisuals";
import { useSessionLifecycle } from "./hooks/useSessionLifecycle";
import { useDataLoaders } from "./hooks/useDataLoaders";
import { useCombatRest } from "./hooks/useCombatRest";
import { useCombatTutorial } from "./hooks/useCombatTutorial";
import { useSessionControls } from "./hooks/useSessionControls";
import { useSnapshotReceiver } from "./hooks/useSnapshotReceiver";
import { useNarrativeStream } from "./hooks/useNarrativeStream";
import { useKeyboardChoice } from "./hooks/useKeyboardChoice";
import { usePresentationCues } from "./hooks/usePresentationCues";
import { useIntroSequencer } from "./hooks/useIntroSequencer";
import { useInviteGate } from "./hooks/useInviteGate";
import { useSaveLoad } from "./hooks/useSaveLoad";
import { useEpiphanyBanner } from "./hooks/useEpiphanyBanner";
import { useLang } from "./i18n/lang";

// Off the story path: loaded on first use so the initial bundle carries only
// the play surface (the admin console alone is ~650 lines).
const CodexPanel = lazy(() => import("./CodexPanel").then((m) => ({ default: m.CodexPanel })));
const SkillTreePanel = lazy(() =>
  import("./SkillTreePanel").then((m) => ({ default: m.SkillTreePanel }))
);
const DevConsolePanel = lazy(() =>
  import("./DevConsolePanel").then((m) => ({ default: m.DevConsolePanel }))
);
const SaveLoadModal = lazy(() => import("./SaveLoadModal").then((m) => ({ default: m.SaveLoadModal })));
const CombatCinema = lazy(() => import("./CombatCinema").then((m) => ({ default: m.CombatCinema })));


export type NarrativeHistoryItem = {
  sceneId: string;
  title: string;
  text: string;
  action?: string | null;
  result?: string | null;
};

export default function App() {
  const { t, lang } = useLang();
  // --- Connection / Onboarding State ---
  const [displayName, setDisplayName] = useState(() => t("app.defaultName"));
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("neo-seoul");
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const fallbackMode = urlParams.get("fallback") === "1" || urlParams.get("fallback") === "true";
  const withImage = !(urlParams.get("image") === "0" || urlParams.get("image") === "false");
  const [obStatus, setObStatus] = useState("");
  const [connected, setConnected] = useState(false);
  // Read by the scenario-list effect without re-running it on every change.
  const connectedRef = useRef(connected);
  const selectedScenarioIdRef = useRef(selectedScenarioId);
  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);
  useEffect(() => {
    selectedScenarioIdRef.current = selectedScenarioId;
  }, [selectedScenarioId]);
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
  const [status, setStatus] = useState(() => t("app.statusWaiting"));
  const [activeTab, setActiveTab] = useState<ActiveTab>("story");
  // Item-gain toast (auto-dismisses): "잔해 수습" payouts are invisible otherwise.
  const [itemNotice, setItemNotice] = useState<string | null>(null);
  const itemNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);
  const [runsHistory, setRunsHistory] = useState<RunSummary[]>([]);
  const [memoryOverview, setMemoryOverview] = useState<MemoryOverview | null>(null);
  const [skillTree, setSkillTree] = useState<SkillTreeResponse | null>(null);
  const [learningSkillId, setLearningSkillId] = useState<string | null>(null);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillNotice, setSkillNotice] = useState<string | null>(null);
  // --- Typewriter / Narration State ---
  const [lastSnapshot, setLastSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [finalizedSnapshot, setFinalizedSnapshot] = useState<RuntimeSnapshot | null>(null);

  // Typewriter narration reveal (state + streaming refs) lives in a hook; it
  // drains the WS token queue into `displayedNarration` and finalizes the
  // pending snapshot when the stream ends.
  const {
    narration,
    setDisplayedNarration,
    isStreaming,
    setIsStreaming,
    startTyper,
    resetStreamBuffers,
    narrationQueueRef,
    streamDoneRef,
    pendingSnapshotRef,
  } = useTypewriter(setFinalizedSnapshot);

  // --- Asset / Audio / Cinematic States ---
  const [narrativeHistory, setNarrativeHistory] = useState<NarrativeHistoryItem[]>([]);
  // Action the player just took; attached to the scene as it moves into history.
  const pendingActionRef = useRef<string | null>(null);
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

  // Scene-image / visual-status concern (displayed URL + placeholder text + the
  // worker watchdog timeout) lives in a hook; it owns the `visual_status` frame
  // handler and the succeeded-asset URL resolver.
  const {
    sceneImageUrl,
    setSceneImageUrl,
    imagePlaceholderText,
    setImagePlaceholderText,
    clearVisualTimeout,
    noteScene,
    onVisualStatus,
    resolveImage,
  } = useSceneVisuals(logToConsole);

  // --- Audio Hook ---
  const {
    bgmEnabled,
    bgmReady,
    initAudio,
    playBgm,
    pauseBgm,
    handleToggleBgm,
    enableBgm,
    playSfx,
    preloadSfx,
    playCombatCinemaCue,
    resetAudioRefs,
    mainBgmPath,
  } = useAudio(
    selectedScenarioId,
    finalizedSnapshot?.bgm_path || lastSnapshot?.bgm_path,
    logToConsole
  );

  // Auto-start BGM on the first user interaction (browsers block audio autoplay
  // until a gesture). BGM is enabled by default, so this turns it ON at the very
  // first click/keypress regardless of entry path; users can still toggle it off.
  useEffect(() => {
    if (!bgmEnabled || bgmReady) return;
    const start = () => {
      initAudio();
      playBgm(mainBgmPath(), true);
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [bgmEnabled, bgmReady, initAudio, playBgm, mainBgmPath]);

  // Combat board cinema-queue driver: diffs combat snapshots into per-blow
  // CombatCinema overlays + board tweens; owns the prev/dispatched/pending refs
  // and the board-draw effect, and exposes the overlay impact/finish callbacks.
  const {
    cinemaContext,
    cinemaQueue,
    flushCinema,
    replayCombat,
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

  // --- Invite gate (closed beta) ---
  // The mount probe, the fail-open policy, key storage + re-probe, and the
  // admin/gated identity live in a hook; App reads the resolved values.
  const {
    gate: inviteGate,
    gated: inviteGated,
    isAdmin,
    submitKey: handleInviteSubmit,
  } = useInviteGate();

  // --- Onboarding & Setup effect ---
  useEffect(() => {
    if (inviteGate !== "ok") return;
    const loadScenarios = async () => {
      try {
        const data = await apiGetScenarios(resumeSessionData?.playerId, lang);
        setScenarios(data.scenarios || []);
        // This effect also re-runs on a language toggle. Mid-run (connected) the
        // list is only refreshed for its localized prose — re-picking the first
        // scenario here used to switch scenario_id (and every sprite/BGM/portrait
        // path) under a player who was in the second scenario. Off-run, keep the
        // player's current pick when it is still in the list.
        if (data.scenarios.length > 0 && !connectedRef.current) {
          const current = data.scenarios.find((s) => s.id === selectedScenarioIdRef.current);
          const firstPlayable =
            current ?? data.scenarios.find((s) => s.unlocked !== false) ?? data.scenarios[0];
          if (!current) {
            setSelectedScenarioId(firstPlayable.id);
            setSelectedArchetype(firstUnlockedArchetype(firstPlayable.archetypes || []));
          }
        }
      } catch (e) {
        logToConsole(t("app.scenarioLoadFail") + (e as Error).message);
      }
    };
    loadScenarios();
  }, [resumeSessionData?.playerId, lang, t, inviteGate]);

  // Connection-Terminal identity for the LOAD picker (Option B): prefer the stable
  // invite-derived id (saves follow the invite key across devices), else the
  // localStorage resume id. Null in local dev with no invite key + no prior session.
  const startScreenPlayerId = useMemo(
    () => stablePlayerId() ?? resumeSessionData?.playerId ?? null,
    [resumeSessionData?.playerId]
  );

  // Save/load owns the modal state, pre-connect slot prefetch, and the
  // restore-before-resume ordering. The callback closes over the lifecycle hook
  // declared below and is invoked only after render completes.
  const {
    saveLoadModal,
    openSave,
    openLoad,
    closeModal,
    saveSlots,
    setSaveSlots,
    saveLabelInput,
    setSaveLabelInput,
    loadSlot,
  } = useSaveLoad({
    inviteGate,
    connected,
    startScreenPlayerId,
    onResume: (data) => handleResumeGame(data),
  });

  // --- API load functions ---
  // Read-side loaders (save/run/memory + skill tree) and the learn-skill
  // mutation live in a hook; behavior-preserving extraction.
  const { loadSlotsAndRuns, loadCodex, handleLearnSkill } =
    useDataLoaders({
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
    });

  // --- Snapshot apply (WS-confirmed scene) ---
  // Applying a confirmed snapshot (history fold, image resolve/placeholder,
  // save/run reload, BGM swap) + the turn-0 cinematic entry motion live in a
  // hook; the WS type switch (`handleSocketMessage`, inside useNarrativeStream)
  // still calls it.
  const { handleReceivedSnapshot } = useSnapshotReceiver({
    withImage,
    playerId,
    setLoopId,
    setLastSnapshot,
    setNarrativeHistory,
    setImagePlaceholderText,
    setKenBurnsActive,
    setGlitchActive,
    resolveImage,
    noteScene,
    loadSlotsAndRuns,
    playBgm,
    playSfx,
    logToConsole,
    onItemsGained: (items) => {
      const text = items
        .map((item) => (item.count > 1 ? `${item.name} ×${item.count}` : item.name))
        .join(", ");
      setItemNotice(text);
      if (itemNoticeTimerRef.current) clearTimeout(itemNoticeTimerRef.current);
      itemNoticeTimerRef.current = setTimeout(() => setItemNotice(null), 6000);
    },
  });

  // --- Narrative stream (WS socket + token receive + choice send) ---
  // The gameplay WebSocket lifecycle, the inbound-frame type switch
  // (`handleSocketMessage`), and the outbound streaming send (`beginStream` /
  // `imageOpts` / `sendChoose`) live in a hook; behavior-preserving extraction.
  const {
    websocketRef,
    openSocket,
    closeSocket,
    beginStream,
    imageOpts,
    sendChoose,
    pendingChoiceId,
  } = useNarrativeStream({
    finalizedSnapshot,
    withImage,
    isStreaming,
    loopId,
    selectedScenarioId,
    fallbackMode,
    pendingActionRef,
    narrationQueueRef,
    streamDoneRef,
    pendingSnapshotRef,
    setStatus,
    setNarrativeHistory,
    setIsStreaming,
    setImagePlaceholderText,
    resetStreamBuffers,
    startTyper,
    clearVisualTimeout,
    onVisualStatus,
    handleReceivedSnapshot,
    onLoopMeta: (variant) => setOpeningVariant(variant),
    logToConsole,
  });

  // --- Session lifecycle handlers ---
  // Onboarding-start / combat-sandbox / resume entry points (+ the shared
  // resume-token writer) live in a hook; behavior-preserving extraction.
  const { handleStartGame, handleSimulateCombat, handleResumeGame } =
    useSessionLifecycle({
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
    });

  // --- Session / UI control handlers ---
  // Scenario change / leave-session teardown / save-slot submit live in a hook;
  // behavior-preserving extraction (handlers stay plain functions).
  const { handleScenarioChange, handleLeaveSession, handleSaveSlotSubmit, handleDeleteSlot } =
    useSessionControls({
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
    });

  // --- Combat REST Operations ---
  // Combat action POST / equip toggle / post-combat resume-stream live in a
  // hook; behavior-preserving extraction (handlers stay plain functions).
  const { handleCombatAction, handleEquip, continueAfterCombat } = useCombatRest({
    loopId,
    selectedScenarioId,
    fallbackMode,
    isBusy,
    isStreaming,
    finalizedSnapshot,
    lastSnapshot,
    setIsBusy,
    setStatus,
    setDisplayedNarration,
    setFinalizedSnapshot,
    setLastSnapshot,
    setCombatLog,
    setCombatTarget,
    setImagePlaceholderText,
    dispatchedActionRef,
    pendingActionRef,
    websocketRef,
    beginStream,
    imageOpts,
    clearVisualTimeout,
    logToConsole,
  });

  const combatLive = Boolean(finalizedSnapshot?.combat && !finalizedSnapshot.combat.finished);
  // LC5: mark <body> while a fight is live so the landscape+coarse CSS can hide
  // the tab-nav and shrink the header (scoped to combat only — narrative
  // landscape keeps its nav + full header). The board reclaims the ~215px of
  // chrome the emulator pass found it was losing.
  useEffect(() => {
    document.body.classList.toggle("combat-active", combatLive);
    return () => document.body.classList.remove("combat-active");
  }, [combatLive]);
  // Warm every combat SFX the moment a fight goes live so the first swing's
  // sound doesn't pay fetch+decode startup (A/V desync, owner 2026-07-11).
  useEffect(() => {
    if (!combatLive) return;
    preloadSfx([
      "sfx_attack",
      "sfx_defend",
      "sfx_move",
      "sfx_glitch",
      "sfx_victory",
      "sfx_defeat",
      "skills/signal_step",
      "skills/overload_strike",
      "skills/packet_shot",
      "skills/covering_noise",
      "skills/patch_protocol",
    ]);
  }, [combatLive, preloadSfx]);
  // In-session signal: on mobile the full header is hidden mid-play (its
  // controls move to a floating ⋯ menu) so the tab bar + scene sit at the top.
  // Onboarding/boot keep the header (language must be settable before playing).
  useEffect(() => {
    document.body.classList.toggle("in-session", connected);
    return () => document.body.classList.remove("in-session");
  }, [connected]);
  // A2 first-combat interactive tutorial — policy (step derivation, move/wait
  // rule, localStorage gate) lives in the hook; App wires its wrapped dispatch
  // into BOTH action paths (useCombatBoard + CombatControls).
  const {
    tutorialStep: combatTutorialStep,
    tutorialHighlight,
    markSeen: markCombatTutorialSeen,
    advance: advanceCombatTutorial,
    onCombatActionTutored: handleCombatActionTutored,
  } = useCombatTutorial({ finalizedSnapshot, combatLive, onCombatAction: handleCombatAction });

  // --- Keyboard hotkeys choice select ---
  // Number-key (1-9) choice selection for the active scene lives in a hook;
  // behavior-preserving extraction.
  useKeyboardChoice(finalizedSnapshot, sendChoose);

  // G3 cinematic cues: per-scene deterministic AV punch (shake/vignette/glitch
  // classes on the play area + mapped SFX), derived server-side — never prose.
  const cueFxClass = usePresentationCues(finalizedSnapshot, playSfx);

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
    groundTargeting,
    startItemTargeting,
    startSkillTargeting,
  } = useCombatBoard({
    finalizedSnapshot,
    canvasRef,
    animatorRef,
    isBusy,
    selectedScenarioId,
    onCombatAction: handleCombatActionTutored,
  });

  // --- Codex list rendering data mapping ---
  const codexLists = useMemo(() => {
    return buildCodexLists(memoryOverview, finalizedSnapshot, currentScenario);
  }, [memoryOverview, finalizedSnapshot, currentScenario]);

  const { notice: epiphanyNotice, dismiss: dismissEpiphany } = useEpiphanyBanner({
    runsHistory,
    scenarios,
  });

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
      notices.codex = t("app.notice.codex");
    }
    if ((codexLists?.characters || []).length > 0) {
      notices.character = t("app.notice.character");
    }
    if (showInGameNotice || epiphanyNotice || skillNotice) {
      notices.skills = t("app.notice.skills");
    }
    return notices;
  }, [codexLists?.characters, epiphanyNotice, finalizedSnapshot?.active_echoes, runsHistory.length, showInGameNotice, skillNotice, t]);

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === "codex" || tab === "character" || tab === "skills" || tab === "dev") {
      loadCodex();
    }
  };

  // Tab-swipe (touch, owner 2026-07-11): a horizontal swipe moves between tabs.
  // Routes through handleTabClick so switching to a codex-backed tab still
  // lazy-loads its data; the hook itself ignores swipes that start on the combat
  // board or any horizontal scroller.
  const swipeTabs: ActiveTab[] = [
    "story",
    "character",
    "skills",
    "codex",
    ...(isAdmin ? (["dev"] as ActiveTab[]) : []),
  ];
  const tabSwipe = useTabSwipe(swipeTabs, activeTab, handleTabClick);

  // A3 progressive disclosure (CBT feedback #1 "info-dense layout"): the very
  // first loop's opening turns show only narrative + choices + gauges; the
  // operation map / save / log aside panels appear from turn 3 with a one-time
  // reveal pulse. Later loops (runs_completed > 0) see the full layout at once.
  const introTurn = finalizedSnapshot?.active_scene?.turn_index ?? 0;
  const introFirstLoop =
    Number(
      (finalizedSnapshot?.state?.meta_progression as { runs_completed?: number } | undefined)
        ?.runs_completed ?? 0
    ) === 0;
  const asideMinimal = introFirstLoop && introTurn <= 2 && !finalizedSnapshot?.combat;
  const asideRevealNudge = introFirstLoop && introTurn === 3;

  // B2 loop2+ opening variants: the meta-frame-vs-snapshot race, the hold-until-
  // known skeleton, the 12s dead-stream fallback, and the per-loop reset live in
  // a hook. `setOpeningVariant` is fed by the WS `onLoopMeta` callback above.
  const { introData, introVariantKey, setOpeningVariant } = useIntroSequencer({
    showIntro,
    currentScenario,
    finalizedSnapshot,
    lastSnapshot,
  });

  // Hold the app behind the invite gate until the key probe resolves. "checking" shows
  // nothing (brief); "blocked" shows the key-entry screen instead of the game.
  if (inviteGate !== "ok") {
    return inviteGate === "blocked" ? <InviteGate onSubmit={handleInviteSubmit} /> : null;
  }

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
            // Entering the opening always turns BGM ON (design: a new connection
            // starts with music), even if a past session persisted it off.
            enableBgm();
          }}
        />
      )}

      {!connected && !showBoot && epiphanyNotice && (
        <div className="epiphany-banner" id="epiphany-banner">
          <div className="epiphany-head">
            <span><GameIcon name="spark" /> {t("app.epiphany.title")}</span>
            <button
              type="button"
              onClick={dismissEpiphany}
              aria-label={t("app.epiphany.close")}
            >
              ✕
            </button>
          </div>
          <div className="epiphany-body">
            {t("app.epiphany.body")}
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
          hasSaves={Boolean(startScreenPlayerId) && saveSlots.length > 0}
          onDisplayNameChange={setDisplayName}
          onScenarioChange={handleScenarioChange}
          onArchetypeChange={setSelectedArchetype}
          onStartGame={handleStartGame}
          onResumeGame={handleResumeGame}
          onOpenLoad={openLoad}
          onSimulateCombat={handleSimulateCombat}
          showCombatSim={isAdmin || !inviteGated}
        />
      )}

      {/* --- Active Game Dashboard --- */}
      {connected && showIntro && currentScenario?.ui_copy?.session_intro ? (
        <IntroPanel
          // Remount on variant arrival so the shot slider resets (with its glitch
          // transition) instead of pointing past the new, shorter shot list.
          key={introVariantKey}
          introData={introData}
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
          {itemNotice && (
            <div
              className="ingame-epiphany-banner item-gain-banner"
              id="item-gain-banner"
              onClick={() => setItemNotice(null)}
            >
              <div className="banner-title">{t("notice.itemGained")}</div>
              <div className="banner-body">{itemNotice}</div>
            </div>
          )}
          {showInGameNotice && (
            <div
              className="ingame-epiphany-banner"
              id="ingame-epiphany-banner"
              onClick={() => setShowInGameNotice(null)}
            >
              <div className="banner-title"><GameIcon name="spark" /> {t("app.epiphanyLive.title")}</div>
              <div className="banner-body">
                {t("app.epiphanyLive.body")}<strong>{getSkillName(showInGameNotice)}</strong>
                <br />
                <span className="banner-hint">{t("app.epiphanyLive.hint")}</span>
              </div>
            </div>
          )}
          <main id="play" className={cueFxClass || undefined}>
          <section onTouchStart={tabSwipe.onTouchStart} onTouchEnd={tabSwipe.onTouchEnd}>
            <TabNav activeTab={activeTab} onTabClick={handleTabClick} notices={tabNotices} showDev={isAdmin} />

            {activeTab === "story" && (
              <StoryPanel
                status={status}
                snapshot={finalizedSnapshot}
                replayCombat={replayCombat}
                narration={narration}
                isStreaming={isStreaming}
                combatTarget={combatTarget}
                combatLog={combatLog}
                sceneImageUrl={sceneImageUrl}
                imagePlaceholderText={imagePlaceholderText}
                glitchActive={glitchActive}
                kenBurnsActive={kenBurnsActive}
                canvasRef={canvasRef}
                onChoose={sendChoose}
                pendingChoiceId={pendingChoiceId}
                onLeaveSession={handleLeaveSession}
                onSelectCombatTarget={setCombatTarget}
                onCombatAction={handleCombatActionTutored}
                onCombatItemTarget={startItemTargeting}
                combatArmedItemId={groundTargeting?.kind === "item" ? groundTargeting.id : null}
                onCombatSkillTarget={startSkillTargeting}
                combatArmedSkillId={groundTargeting?.kind === "skill" ? groundTargeting.id : null}
                tutorialHighlight={tutorialHighlight}
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
                onOpenCodex={() => handleTabClick("codex")}
                isBusy={isBusy}
                canSave={Boolean(loopId)}
                onOpenSave={openSave}
                onOpenLoad={openLoad}
              />
            )}

            {activeTab === "codex" && codexLists && (
              <Suspense fallback={null}>
                <CodexPanel
                  codexLists={codexLists}
                  routeMap={finalizedSnapshot?.state?._route_map}
                  snapshot={finalizedSnapshot}
                  runsHistory={runsHistory}
                  memoryOverview={memoryOverview}
                  scenarioId={selectedScenarioId}
                />
              </Suspense>
            )}

            {activeTab === "character" && codexLists && (
              <CharacterTabPanel
                codexLists={codexLists}
                snapshot={finalizedSnapshot}
                onEquip={handleEquip}
              />
            )}

            {activeTab === "skills" && codexLists && (
              <Suspense fallback={null}>
                <SkillTreePanel
                  codexLists={codexLists}
                  scenarioId={selectedScenarioId}
                  skillTree={skillTree}
                  onLearnSkill={handleLearnSkill}
                  learningSkillId={learningSkillId}
                  skillError={skillError}
                  skillNotice={skillNotice}
                />
              </Suspense>
            )}

            {activeTab === "dev" && isAdmin && devConsoleData && (
              <Suspense fallback={null}>
                <DevConsolePanel
                  data={devConsoleData}
                  snapshot={finalizedSnapshot}
                />
              </Suspense>
            )}
          </section>

          <GameAside
            isBusy={isBusy}
            canSave={Boolean(loopId)}
            finalizedSnapshot={finalizedSnapshot}
            consoleLogs={consoleLogs}
            minimal={asideMinimal}
            revealNudge={asideRevealNudge}
            onOpenSave={openSave}
            onOpenLoad={openLoad}
            onOpenCodex={() => handleTabClick("codex")}
          />
        </main>
        </>
      )}

      {cinemaContext && (
        <Suspense fallback={null}>
          <CombatCinema
            key={`${cinemaContext.attacker.id}->${cinemaContext.defender.id}#${cinemaQueue.length}`}
            scenarioId={selectedScenarioId}
            attacker={cinemaContext.attacker}
            defender={cinemaContext.defender}
            damage={cinemaContext.damage}
            kind={cinemaContext.kind}
            crit={cinemaContext.crit}
            skillName={cinemaContext.skillName}
            itemId={cinemaContext.itemId}
            miss={cinemaContext.miss}
            onImpact={onCinemaImpact}
            onCue={(cue) => playCombatCinemaCue(cinemaContext, cue)}
            onFinish={onCinemaFinish}
            onSkip={flushCinema}
          />
        </Suspense>
      )}

      <CombatInterstitial snapshot={finalizedSnapshot ?? lastSnapshot} />

      {combatTutorialStep != null && activeTab === "story" && (
        <CombatTutorial
          stepIndex={combatTutorialStep}
          onSkip={markCombatTutorialSeen}
          onNext={advanceCombatTutorial}
        />
      )}

      {saveLoadModal && (
        <Suspense fallback={null}>
          <SaveLoadModal
            mode={saveLoadModal}
            slots={saveSlots}
            scenarios={scenarios}
            playerId={playerId || startScreenPlayerId}
            currentLoopId={loopId}
            isBusy={isBusy}
            canSave={Boolean(loopId)}
            saveLabelInput={saveLabelInput}
            onSaveLabelChange={setSaveLabelInput}
            onSave={() => handleSaveSlotSubmit()}
            onOverwriteSlot={(slot) => {
              if (slot.slot_id) handleSaveSlotSubmit(slot.slot_id);
            }}
            onDeleteSlot={(slot) => {
              if (slot.slot_id) handleDeleteSlot(slot.slot_id);
            }}
            onLoadSlot={loadSlot}
            onClose={closeModal}
          />
        </Suspense>
      )}

      <BoonOffer
        snapshot={finalizedSnapshot ?? lastSnapshot}
        scenarioId={selectedScenarioId}
        onChosen={(next) => {
          // The boon/echo REST result is the current confirmed state (same scene,
          // updated offer). Update finalizedSnapshot too — handleReceivedSnapshot
          // only sets lastSnapshot, so without this the overlay never closes.
          setFinalizedSnapshot(next);
          handleReceivedSnapshot(next);
        }}
      />

      <MarketExchange
        snapshot={finalizedSnapshot ?? lastSnapshot}
        scenarioId={selectedScenarioId}
        onExchanged={(next) => {
          setFinalizedSnapshot(next);
          handleReceivedSnapshot(next);
        }}
      />
    </>
  );
}
