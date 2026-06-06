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

const decodeGarbageBytes = (text: string): string => {
  if (!text) return "";
  const regex = /(?:<0x([0-9A-Fa-f]{2})>)+/g;
  return text.replace(regex, (match) => {
    const byteMatches = match.match(/0x([0-9A-Fa-f]{2})/g);
    if (!byteMatches) return match;
    const bytes = new Uint8Array(
      byteMatches.map((bm) => parseInt(bm.substring(2), 16))
    );
    try {
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return match;
    }
  });
};

const renderBoldText = (text: string): React.ReactNode[] => {
  if (!text) return [];
  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i}>{part}</strong>;
    }
    return part;
  });
};

const renderFormattedNarration = (rawText: string, turnIndex: number) => {
  if (!rawText) return null;
  const text = decodeGarbageBytes(rawText);

  // 복합 정규식: (스탯: 수치) + 임의의 조사 + "대사"
  // 예: (민첩: 8)의 목소리가 귓가를 때린다. "멍하니 서 있지 마!"
  const complexRegex = /\((근력|지능|매력|민첩|관측):\s*(\d+)\)([^"]*?)("[^"]+")/g;
  
  // 단순 정규식: (스탯: 대사)
  // 예: (민첩: 지금 여기서 망설이면 끝이다...)
  const simpleRegex = /\((근력|지능|매력|민첩|관측):\s*([^)]+)\)/g;

  const parts: React.ReactNode[] = [];
  const matches: {
    index: number;
    length: number;
    statName: string;
    statValue?: string;
    description?: string;
    statText: string;
  }[] = [];

  // 1. 복합 패턴 매칭
  let matchComplex: RegExpExecArray | null;
  complexRegex.lastIndex = 0;
  while ((matchComplex = complexRegex.exec(text)) !== null) {
    matches.push({
      index: matchComplex.index,
      length: matchComplex[0].length,
      statName: matchComplex[1],
      statValue: matchComplex[2],
      description: matchComplex[3] ? matchComplex[3].trim() : undefined,
      statText: matchComplex[4]
    });
  }

  // 2. 단순 패턴 매칭 (복합 패턴과 겹치지 않는 것만 추가)
  let matchSimple: RegExpExecArray | null;
  simpleRegex.lastIndex = 0;
  while ((matchSimple = simpleRegex.exec(text)) !== null) {
    const cur = matchSimple;
    const isOverlapping = matches.some(m => 
      (cur.index >= m.index && cur.index < m.index + m.length) ||
      (cur.index + cur[0].length > m.index && cur.index + cur[0].length <= m.index + m.length)
    );
    if (!isOverlapping) {
      matches.push({
        index: cur.index,
        length: cur[0].length,
        statName: cur[1],
        statText: cur[2]
      });
    }
  }

  // 인덱스 순으로 정렬
  matches.sort((a, b) => a.index - b.index);

  let lastIndex = 0;
  for (const m of matches) {
    if (m.index > lastIndex) {
      parts.push(...renderBoldText(text.substring(lastIndex, m.index)));
    }

    let color = "#888888";
    let iconUrl = "";
    
    switch (m.statName) {
      case "근력":
        color = "#FF5555";
        iconUrl = "/assets/icons/stat_strength.png";
        break;
      case "지능":
        color = "#8BE9FD";
        iconUrl = "/assets/icons/stat_intelligence.png";
        break;
      case "매력":
        color = "#FFB86C";
        iconUrl = "/assets/icons/stat_charisma.png";
        break;
      case "민첩":
        color = "#50FA7B";
        iconUrl = "/assets/icons/stat_agility.png";
        break;
      case "관측":
        color = "#F1FA8C";
        iconUrl = "/assets/icons/stat_perception.png";
        break;
    }

    const fallbackEmoji = m.statName === "근력" ? "💪" :
                          m.statName === "지능" ? "🧠" :
                          m.statName === "매력" ? "🗣️" :
                          m.statName === "민첩" ? "🏃‍♂️" : "👁️";

    parts.push(
      <span
        key={m.index}
        className="inner-monologue-wrapper"
        style={{ display: "block", margin: "8px 0" }}
      >
        {turnIndex === 0 && (
          <span 
            className="monologue-guide"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              color: "#00FFCC",
              backgroundColor: "rgba(0, 255, 204, 0.08)",
              border: "1px dashed rgba(0, 255, 204, 0.3)",
              borderRadius: "4px",
              padding: "4px 8px",
              marginBottom: "6px"
            }}
          >
            <span>💡</span>
            <span><strong>스탯 속삭임:</strong> 플레이어의 높은 특성(현재: {m.statName})이 머릿속 내면의 독백으로 조언을 건넵니다.</span>
          </span>
        )}
        <span
          className="inner-monologue"
          style={{
            color,
            fontStyle: "italic",
            display: "block",
            padding: "8px 12px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderLeft: `3px solid ${color}`,
            borderRadius: "0 4px 4px 0",
          }}
        >
          <span style={{ marginRight: "6px", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
            <img 
              src={iconUrl} 
              alt={m.statName} 
              style={{ width: "16px", height: "16px", objectFit: "contain" }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
                const parent = (e.target as HTMLElement).parentElement;
                if (parent && !parent.querySelector(".fallback-emoji")) {
                  const fallbackSpan = document.createElement("span");
                  fallbackSpan.className = "fallback-emoji";
                  fallbackSpan.innerText = fallbackEmoji;
                  parent.appendChild(fallbackSpan);
                }
              }}
            />
          </span>
          {m.statValue ? (
            <>
              <strong>[{m.statName} {m.statValue}]</strong>
              {m.description ? ` ${m.description} ` : " "}
              <span style={{ color: "#ffffff", fontStyle: "normal" }}>{renderBoldText(m.statText)}</span>
            </>
          ) : (
            <>
              <strong>[{m.statName}]</strong> {renderBoldText(m.statText)}
            </>
          )}
        </span>
      </span>
    );

    lastIndex = m.index + m.length;
  }

  if (lastIndex < text.length) {
    parts.push(...renderBoldText(text.substring(lastIndex)));
  }

  return <>{parts}</>;
};

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
                  {renderFormattedNarration(displayedNarration, snapshot?.active_scene?.turn_index ?? 0)}
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
