import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { apiGetScenarios } from "./api";
import { firstUnlockedArchetype } from "./archetypes";
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
  RuntimeSnapshot,
  MemoryOverview,
  SaveSlot,
  RunSummary,
  SkillTreeResponse,
} from "./types";
import { CombatAnimator } from "./combatEffects";
import { CombatCinema } from "./CombatCinema";
import { LS_KEY, parseResumeSession } from "./sessionStorage";
import type { ResumeSessionData } from "./sessionStorage";
import { buildCodexLists, buildDevConsoleData, buildEpiphanyNotice } from "./viewModels";
import { useAudio } from "./hooks/useAudio";
import { useInGameEpiphany } from "./hooks/useInGameEpiphany";
import { useCombatBoard } from "./hooks/useCombatBoard";
import { useCombatCinemaQueue } from "./hooks/useCombatCinemaQueue";
import { useTypewriter } from "./hooks/useTypewriter";
import { useSceneVisuals } from "./hooks/useSceneVisuals";
import { useSessionLifecycle } from "./hooks/useSessionLifecycle";
import { useDataLoaders } from "./hooks/useDataLoaders";
import { useCombatRest } from "./hooks/useCombatRest";
import { useSessionControls } from "./hooks/useSessionControls";
import { useSnapshotReceiver } from "./hooks/useSnapshotReceiver";
import { useNarrativeStream } from "./hooks/useNarrativeStream";
import { useKeyboardChoice } from "./hooks/useKeyboardChoice";

export type NarrativeHistoryItem = {
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
    loadSlotsAndRuns,
    playBgm,
    playSfx,
    logToConsole,
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
  const { handleScenarioChange, handleLeaveSession, handleSaveSlotSubmit } =
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

  // --- Keyboard hotkeys choice select ---
  // Number-key (1-9) choice selection for the active scene lives in a hook;
  // behavior-preserving extraction.
  useKeyboardChoice(finalizedSnapshot, sendChoose);

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
