import { useEffect, useRef, useState } from "react";
import type { PointerEventHandler, RefObject } from "react";
import { CharacterPanel } from "./CharacterPanel";
import { ChoicePanel } from "./ChoicePanel";
import { CombatControls } from "./CombatControls";
import { CombatLog } from "./CombatLog";
import { CombatRoster } from "./CombatRoster";
import type { CombatAction, RuntimeSnapshot, ScenarioCharacter } from "./types";

interface StoryPanelProps {
  status: string;
  snapshot: RuntimeSnapshot | null;
  displayedNarration: string;
  isStreaming: boolean;
  combatTarget: string | null;
  combatLog: string;
  sceneImageUrl: string | null;
  imagePlaceholderText: string;
  glitchActive: boolean;
  kenBurnsActive: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onChoose: (choiceId: string) => void;
  onLeaveSession: () => void;
  onSelectCombatTarget: (targetId: string) => void;
  onCombatAction: (action: CombatAction) => void;
  onReturnToMain: () => void;
  onContinueAfterCombat: () => void;
  onCanvasPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onCanvasPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onCanvasPointerUp: PointerEventHandler<HTMLCanvasElement>;
  onCanvasPointerCancel: PointerEventHandler<HTMLCanvasElement>;
  scenarioId: string;
  narrativeHistory: { sceneId: string; title: string; text: string; action?: string | null }[];
  scenarioCharacters?: ScenarioCharacter[];
}

export function StoryPanel({
  status,
  snapshot,
  displayedNarration,
  isStreaming,
  combatTarget,
  combatLog,
  sceneImageUrl,
  imagePlaceholderText,
  glitchActive,
  kenBurnsActive,
  canvasRef,
  onChoose,
  onLeaveSession,
  onSelectCombatTarget,
  onCombatAction,
  onReturnToMain,
  onContinueAfterCombat,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onCanvasPointerCancel,
  scenarioId,
  narrativeHistory,
  scenarioCharacters,
}: StoryPanelProps) {
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Keep only the most recent past scene inline for narrative flow; the full
  // log lives in a separate overlay so the main view stays uncluttered.
  const INLINE_HISTORY_LIMIT = 1;
  const inlineHistory = narrativeHistory.slice(-INLINE_HISTORY_LIMIT);
  const hasNarrativeHistory = narrativeHistory.length > 0;

  // Auto scroll to bottom when new streaming text arrives or history updates
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedNarration, narrativeHistory]);

  const canChoose =
    !isStreaming &&
    snapshot &&
    snapshot.phase !== "ended" &&
    (!snapshot.combat || snapshot.combat.finished);

  // 전투 진행 중인 경우, 가로 분할(Streamlit 스타일) 레이아웃 출력
  if (snapshot?.combat && !snapshot.combat.finished) {
    return (
      <div id="story-tab-content" className="combat-layout">
        <div className="combat-grid">
          {/* 좌측 열: Tactical Board + Combat Log */}
          <div className="combat-left-col">
            <div className="panel tactical-board-panel">
              <div className="panel-title">
                TACTICAL BOARD :: ROUND {String(snapshot.combat.radar?.round || 1).padStart(2, "0")}
              </div>
              <div className="tactical-board-canvas-wrapper" style={{ marginTop: "12px" }}>
                <canvas
                  id="combat"
                  ref={canvasRef}
                  onPointerDown={onCanvasPointerDown}
                  onPointerMove={onCanvasPointerMove}
                  onPointerUp={onCanvasPointerUp}
                  onPointerCancel={onCanvasPointerCancel}
                  style={{ display: "block", touchAction: "none" }}
                ></canvas>
              </div>
            </div>

            <CombatLog log={combatLog} />
          </div>

          {/* 우측 열: Party/Enemy Roster + Command Console */}
          <div className="combat-right-col">
            <div className="panel roster-panel">
              <CombatRoster combat={snapshot.combat} scenarioId={scenarioId} />
            </div>

            <CombatControls
              combat={snapshot.combat}
              selectedTargetId={combatTarget}
              onSelectTarget={onSelectCombatTarget}
              onAction={onCombatAction}
              onReturnToMain={onReturnToMain}
              onContinue={onContinueAfterCombat}
            />
          </div>
        </div>
      </div>
    );
  }

  // 비전투(내러티브) 상태 레이아웃
  // 상단 행: 좌측 장면 이미지 + 우측 Character 창 / 하단: 전체 폭 대화 스크립트
  return (
    <div id="story-tab-content" className="narrative-layout">
      <div className="narrative-top-row">
        {/* 좌측: 장면 이미지 */}
        <div className="panel scene-image-panel">
          <div className="panel-title">장면 이미지</div>
          <div className="story-visuals" style={{ marginTop: "12px" }}>
            <div className={`image-frame ${glitchActive ? "glitch-active" : ""}`}>
              {!sceneImageUrl && <div className="image-ph">{imagePlaceholderText}</div>}
              {sceneImageUrl && (
                <img
                  src={sceneImageUrl}
                  className={`shown ${kenBurnsActive ? "kenburns-active" : ""}`}
                  alt="scene"
                />
              )}
            </div>
          </div>
        </div>

        {/* 우측: Character 창 */}
        <CharacterPanel snapshot={snapshot} characters={scenarioCharacters} />
      </div>

      {/* 하단: 전체 폭 대화 기록 스크롤 영역 & 제어 패널 */}
      <div className="narrative-script-row">
        <div className="panel narrative-script-panel">
            <div className="narrative-scroll-area">
              {/* 전체 기록은 별도 화면(오버레이)에서. 인라인은 직전 장면만 유지 */}
              {hasNarrativeHistory && (
                <button
                  className="history-open-btn"
                  onClick={() => setShowHistory(true)}
                >
                  📜 서사 기록 전체 보기 ({narrativeHistory.length})
                </button>
              )}

              {/* 직전 장면(맥락 유지용) */}
              {inlineHistory.map((h, idx) => (
                <div key={`${h.sceneId}-${idx}`} className="history-scene-block">
                  <h3 className="history-scene-title">
                    {h.title}
                  </h3>
                  <div className="history-scene-text">
                    {h.text}
                  </div>
                  {h.action && (
                    <div className="history-scene-action">▸ 내 행동: {h.action}</div>
                  )}
                </div>
              ))}

              {/* 현재 지문 스트리밍 */}
              <div className="current-scene-block">
                <div id="status">{status}</div>
                <h2 id="scene-title" style={{ marginTop: "8px" }}>
                  {snapshot?.active_scene?.title || ""}
                </h2>
                <div id="narration">
                  {displayedNarration}
                  {isStreaming && <span className="caret">▌</span>}
                </div>
              </div>

              {/* 자동 스크롤용 앵커 */}
              <div ref={scrollBottomRef} style={{ height: "1px" }} />
            </div>

            {/* 선택지 영역 */}
            {canChoose && (
              <div className="choice-panel-wrapper">
                <ChoicePanel
                  choices={snapshot?.active_scene?.choices || []}
                  stability={snapshot?.stability ?? 100}
                  tension={snapshot?.tension ?? 0}
                  onChoose={onChoose}
                />
              </div>
            )}

            {!isStreaming && snapshot?.phase === "ended" && (
              <div style={{ marginTop: "16px" }}>
                <EndedPanel snapshot={snapshot} onLeaveSession={onLeaveSession} />
              </div>
            )}

            {!isStreaming && snapshot?.combat && (
              <div style={{ marginTop: "16px" }}>
                <CombatControls
                  combat={snapshot.combat}
                  selectedTargetId={combatTarget}
                  onSelectTarget={onSelectCombatTarget}
                  onAction={onCombatAction}
                  onReturnToMain={onReturnToMain}
                  onContinue={onContinueAfterCombat}
                />
              </div>
            )}
          </div>
        </div>

      {/* 별도 화면: 전체 서사 기록 (스크립트 + 내 행동) */}
      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-head">
              <span>서사 기록 · {narrativeHistory.length}장면</span>
              <button className="history-close-btn" onClick={() => setShowHistory(false)}>
                닫기 ✕
              </button>
            </div>
            <div className="history-modal-body">
              {narrativeHistory.length === 0 && (
                <div className="char-empty">아직 기록된 장면이 없습니다.</div>
              )}
              {narrativeHistory.map((h, idx) => (
                <div key={`${h.sceneId}-${idx}`} className="history-scene-block">
                  <h3 className="history-scene-title">
                    {String(idx + 1).padStart(2, "0")} · {h.title}
                  </h3>
                  <div className="history-scene-text">{h.text}</div>
                  {h.action && (
                    <div className="history-scene-action">▸ 내 행동: {h.action}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EndedPanel({
  snapshot,
  onLeaveSession,
}: {
  snapshot: RuntimeSnapshot;
  onLeaveSession: () => void;
}) {
  const endingLabel = snapshot.state?.ending_label || snapshot.state?.ending_id;

  return (
    <div>
      <div className="ended-banner">
        <div className="et">여정 종료</div>
        {endingLabel ? <div className="el">엔딩 · {endingLabel}</div> : null}
      </div>
      <div style={{ marginTop: "12px" }}>
        <button className="cc-btn" onClick={onLeaveSession}>
          새 접속 ▸
        </button>
      </div>
    </div>
  );
}
