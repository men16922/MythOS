import { useEffect, useRef, useState } from "react";
import type { PointerEventHandler, RefObject } from "react";
import { CharacterPanel } from "./CharacterPanel";
import { detectSceneCharacter } from "./sceneCharacter";
import { ChoicePanel } from "./ChoicePanel";
import { CombatControls } from "./CombatControls";
import { CombatLog } from "./CombatLog";
import { CombatRoster } from "./CombatRoster";
import type { CombatAction, CombatBlip, CombatState, RuntimeSnapshot, ScenarioCharacter } from "./types";

type NarrativeHistoryItem = {
  sceneId: string;
  title: string;
  text: string;
  action?: string | null;
  result?: string | null;
};

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
  onCanvasPointerLeave: PointerEventHandler<HTMLCanvasElement>;
  combatInspectCell: [number, number] | null;
  scenarioId: string;
  narrativeHistory: NarrativeHistoryItem[];
  scenarioCharacters?: ScenarioCharacter[];
  onEquip?: (itemId: string, equipped: boolean) => void;
  boardZoom?: number;
  onBoardZoom?: (next: number) => void;
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

const combatOutcomeLabel = (outcome?: string): string => {
  if (outcome === "player_victory") return "승리";
  if (outcome === "player_fled") return "도주 성공";
  if (outcome === "player_defeat") return "패배";
  return outcome || "종료";
};

const combatOutcomeCopy = (outcome?: string, defeatSoft?: boolean): string => {
  if (outcome === "player_victory") {
    return "위협 신호가 침묵하고, 살아남은 접속자들의 윤곽이 잔광 속에 고정됩니다.";
  }
  if (outcome === "player_fled") {
    return "교전망을 벗어났습니다. 다음 장면으로 이동하기 전 재정비가 필요합니다.";
  }
  if (outcome === "player_defeat") {
    if (defeatSoft) {
      return "신호가 완전히 끊기기 전, 세린의 우회 경로가 마지막 패킷을 붙잡습니다. 패배는 기록되지만 루프는 아직 끝나지 않았습니다.";
    }
    return "접속이 붕괴했습니다. 이 루프는 기록으로 남고, 다음 접속의 잔향이 됩니다.";
  }
  return "교전이 종료되었습니다.";
};

const combatImageSrc = (scenarioId: string, blip: CombatBlip): string => {
  const images = blip.combat_images || {};
  const path = images.idle || images.guard || images.skill || blip.portrait || "";
  return path ? `/resources/${scenarioId}/${path}` : "";
};

function CombatResultPanel({
  combat,
  scenarioId,
  onReturnToMain,
  onContinue,
}: {
  combat: CombatState;
  scenarioId: string;
  onReturnToMain: () => void;
  onContinue: () => void;
}) {
  const outcome = combat.outcome;
  const isVictory = outcome === "player_victory";
  const isDefeat = outcome === "player_defeat";
  const isSoftDefeat = isDefeat && Boolean(combat.defeat_soft);
  const blips = combat.radar?.blips || [];
  const party = blips.filter((b) => b.faction !== "enemy" && b.alive !== false).slice(0, 3);
  const enemies = blips.filter((b) => b.faction === "enemy").slice(0, 3);
  const reward = combat.rewards?.encounter_reward || {};
  const rewardEntries = Object.entries(reward).filter(([, value]) => value !== 0 && value !== "");
  const items = combat.rewards?.items || [];

  const renderBlip = (blip: CombatBlip, role: "hero" | "enemy") => {
    const src = combatImageSrc(scenarioId, blip);
    return (
      <div key={blip.id} className={`combat-result-actor ${role}`}>
        {src ? (
          <img src={src} alt={blip.name || blip.id} draggable={false} />
        ) : (
          <span>{blip.name?.slice(0, 1) || blip.id.slice(0, 1)}</span>
        )}
        <small>{blip.name || blip.id}</small>
      </div>
    );
  };

  return (
    <div className={`combat-result-panel ${isVictory ? "victory" : ""} ${isDefeat ? "defeat" : ""}`}>
      <div className={`combat-outcome ${isDefeat ? "lose" : ""}`}>
        교전 종료 — {combatOutcomeLabel(outcome)}
      </div>

      <div className="combat-result-visual">
        <div className="combat-result-composite" aria-label="전투 결과 이미지">
          <div className="combat-result-grid" />
          <div className="combat-result-party">
            {party.length > 0 ? (
              party.map((b) => renderBlip(b, "hero"))
            ) : (
              <div className="combat-result-empty">NO PARTY SIGNAL</div>
            )}
          </div>
          <div className="combat-result-enemies">
            {enemies.map((b) => renderBlip(b, "enemy"))}
          </div>
          <div className="combat-result-stamp">
            {isVictory ? "VICTORY" : isSoftDefeat ? "CAPTURED" : isDefeat ? "LOOP COLLAPSE" : "DISENGAGED"}
          </div>
        </div>
      </div>

      <p className="combat-result-copy">{combatOutcomeCopy(outcome, isSoftDefeat)}</p>
      {(rewardEntries.length > 0 || items.length > 0) && (
        <div className="combat-reward-summary">
          <div className="combat-reward-title">획득 / 변화</div>
          {rewardEntries.length > 0 && (
            <div className="combat-reward-row">
              {rewardEntries.map(([key, value]) => (
                <span key={key} className="combat-reward-chip">
                  {key === "insight" ? "통찰" : key === "tension" ? "추적도" : key === "stability" ? "안정도" : key} {Number(value) > 0 ? "+" : ""}{String(value)}
                </span>
              ))}
            </div>
          )}
          {items.length > 0 && (
            <div className="combat-reward-row">
              {items.map((item, idx) => (
                <span key={`${item}-${idx}`} className="combat-reward-chip item">
                  전리품 {item}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="cc-row combat-result-actions">
        {!isDefeat || isSoftDefeat ? (
          <button className="cc-btn" onClick={onContinue} id="cc-continue">
            계속 ▸
          </button>
        ) : (
          <button className="cc-btn" onClick={onReturnToMain} id="cc-return-main">
            메인 화면으로 ▸
          </button>
        )}
      </div>
    </div>
  );
}

function TacticalLegend({ combat }: { combat: CombatState }) {
  const covers = Object.values(combat.covers || {});
  const hazards = Object.values(combat.hazards || {});
  const hasElevation = Object.values(combat.elevations || {}).some((v) => Number(v) > 0);
  const intents = combat.radar?.enemy_intents || [];

  const rows: { sym: string; text: string }[] = [];
  rows.push({ sym: "⚔️/🏃/👣", text: "적 의도: 공격 예고 / 도주 / 이동" });
  if (covers.includes("full")) rows.push({ sym: "▣", text: "엄호(강): 사선 차단 · 방어 보너스 큼" });
  if (covers.includes("half")) rows.push({ sym: "◧", text: "엄호(약): 부분 방어 보너스" });
  if (hazards.includes("acid")) rows.push({ sym: "☣", text: "산성 지대: 턴 종료 시 피해" });
  if (hazards.includes("electro")) rows.push({ sym: "⚡", text: "전자 지대: 집중/방어 교란" });
  if (hasElevation) rows.push({ sym: "▲n", text: "고지: 숫자만큼 높은 위치 · 명중/시야 유리" });
  const [open, setOpen] = useState(false);

  if (intents.length === 0 && covers.length === 0 && hazards.length === 0 && !hasElevation) {
    return null;
  }

  return (
    <div className="tactical-legend-wrap">
      <button
        type="button"
        className="tactical-legend-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "범례 닫기 ✕" : "보드 범례 ⓘ"}
      </button>
      {open && (
        <div className="tactical-legend tactical-legend-popup" role="dialog" aria-label="보드 범례">
          <div className="tactical-legend-title">보드 범례</div>
          {rows.map((r, i) => (
            <div key={i} className="tactical-legend-row">
              <span className="tactical-legend-sym">{r.sym}</span>
              <span className="tactical-legend-text">{r.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LearningGoalBanner({ combat }: { combat: CombatState }) {
  const encounter = combat.encounter;
  const goal = encounter?.learning_goal;
  const trigger = encounter?.narrative_trigger;
  const reward = encounter?.reward_intent;
  const [dismissed, setDismissed] = useState(false);
  if ((!goal && !trigger && !reward) || dismissed) return null;
  return (
    <div className="combat-learning-goal" role="note">
      <span className="combat-learning-goal-icon">🎯</span>
      <div className="combat-learning-goal-body">
        <span className="combat-learning-goal-label">
          교전 배경{encounter?.name ? ` · ${encounter.name}` : ""}
        </span>
        {trigger && <span className="combat-learning-goal-text">⚑ 배경 · {trigger}</span>}
        {goal && <span className="combat-learning-goal-text">🎯 학습 · {goal}</span>}
        {reward && <span className="combat-learning-goal-text">🎁 승리 보상 · {reward}</span>}
      </div>
      <button
        className="combat-learning-goal-close"
        onClick={() => setDismissed(true)}
        aria-label="학습 목표 닫기"
      >
        ✕
      </button>
    </div>
  );
}

function TileInspector({
  combat,
  cell,
}: {
  combat: CombatState;
  cell: [number, number] | null;
}) {
  if (!cell) {
    return (
      <div className="tile-inspector empty">
        <span className="tile-inspector-hint">보드 위 타일을 가리키면 상세가 표시됩니다.</span>
      </div>
    );
  }
  const [x, y] = cell;
  const key = `${x},${y}`;
  const elevation = Number(combat.elevations?.[key] || 0);
  const cover = combat.covers?.[key];
  const hazard = combat.hazards?.[key];
  const occupant = (combat.radar?.blips || []).find(
    (b) => b.x === x && b.y === y && b.alive !== false
  );
  const reachable = (combat.available?.reachable || []).some(
    ([rx, ry]) => rx === x && ry === y
  );
  const intent = (combat.radar?.enemy_intents || []).find(
    (i) => i.target_x === x && i.target_y === y
  );

  const factionLabel = (faction?: string) =>
    faction === "enemy" ? "적" : faction === "ally" ? "동맹" : "아군";
  const coverLabel = cover === "full" ? "엄호(강)" : cover === "half" ? "엄호(약)" : null;
  const hazardLabel =
    hazard === "acid" ? "산성 지대" : hazard === "electro" ? "전자 지대" : hazard || null;

  const rows: { label: string; value: string }[] = [];
  if (occupant) {
    rows.push({
      label: factionLabel(occupant.faction),
      value: `${occupant.name || occupant.id} · HP ${occupant.hp}/${occupant.max_hp}`,
    });
  }
  if (coverLabel) rows.push({ label: "지형", value: coverLabel });
  if (elevation > 0) rows.push({ label: "고지", value: `+${elevation}` });
  if (hazardLabel) rows.push({ label: "위험", value: hazardLabel });
  if (intent) {
    rows.push({
      label: "적 의도",
      value: intent.action === "attack" ? "공격 예고" : intent.action === "flee" ? "도주" : "이동",
    });
  }
  if (reachable) rows.push({ label: "이동", value: "현재 유닛 이동 가능" });
  if (rows.length === 0) rows.push({ label: "지형", value: "빈 타일" });

  return (
    <div className="tile-inspector">
      <div className="tile-inspector-coord">타일 ({x}, {y})</div>
      <div className="tile-inspector-rows">
        {rows.map((r, i) => (
          <div key={i} className="tile-inspector-row">
            <span className="tile-inspector-key">{r.label}</span>
            <span className="tile-inspector-val">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectiveStrip({ snapshot }: { snapshot: RuntimeSnapshot | null }) {
  const scene = snapshot?.active_scene;
  if (!scene) return null;
  const stakes = scene.stakes_summary || [];
  const result = scene.choice_result?.summary || scene.action_result;
  if (!scene.objective && !scene.chapter_goal && stakes.length === 0 && !result) return null;

  return (
    <div className="objective-strip">
      {scene.chapter_goal && (
        <div className="objective-main objective-chapter">
          <span className="objective-kicker">이번 막</span>
          <span className="objective-text">{scene.chapter_goal}</span>
        </div>
      )}
      {scene.objective && (
        <div className="objective-main">
          <span className="objective-kicker">현재 목표</span>
          <span className="objective-text">{scene.objective}</span>
        </div>
      )}
      {stakes.length > 0 && (
        <div className="objective-stakes">
          {stakes.map((stake) => (
            <span key={stake} className="objective-chip">
              {stake}
            </span>
          ))}
        </div>
      )}
      {result && (
        <div className="objective-result">
          <span className="objective-kicker">직전 결과</span>
          <span>{result}</span>
        </div>
      )}
    </div>
  );
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
  onCanvasPointerLeave,
  combatInspectCell,
  scenarioId,
  narrativeHistory,
  scenarioCharacters,
  onEquip,
  boardZoom = 1,
  onBoardZoom,
}: StoryPanelProps) {
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // On an anchor (pre-authored impact beat), prefer its curated high-quality
  // image; fall back to the async-generated scene image if it isn't placed yet.
  const routeMap = snapshot?.state?._route_map;
  const currentNode = routeMap?.current ? routeMap?.nodes?.[routeMap.current] : undefined;
  // Some anchors stage a pre-reveal still (`image_pre`, protagonist-focus) that
  // is shown until the beat's partner steps into the scene, then swap to the
  // main `image`. Key it on the same scene-character detection that drives the
  // CHARACTER portrait so the image and portrait stay in sync (opening: lone
  // protagonist still until Se-rin is named, then her rescue still).
  const scenePartner = detectSceneCharacter(snapshot, scenarioCharacters);
  // Multi-scene anchors (the opening: awakening → arrival → approach → first-contact
  // → chase) carry a per-beat image_sequence indexed by the scene's turn; it takes priority.
  // Otherwise fall back to the pre-reveal still (before the partner is named) → main.
  const sceneTurn = snapshot?.active_scene?.turn_index ?? 0;
  const imageSeq = currentNode?.image_sequence;
  let anchorImageName: string | undefined;
  if (currentNode?.anchor && Array.isArray(imageSeq) && imageSeq.length > 0) {
    anchorImageName = imageSeq[Math.min(sceneTurn, imageSeq.length - 1)];
  } else {
    anchorImageName =
      currentNode?.image_pre && !scenePartner ? currentNode.image_pre : currentNode?.image;
  }
  const anchorImageUrl =
    currentNode?.anchor && anchorImageName
      ? `/resources/${scenarioId}/${anchorImageName}`
      : "";
  const anchorImageOk = anchorImageUrl && !brokenImages.has(anchorImageUrl);
  const displayImageUrl = anchorImageOk ? anchorImageUrl : sceneImageUrl;

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
  const finishedCombat = snapshot?.combat?.finished ? snapshot.combat : null;

  // 전투 진행 중인 경우, 가로 분할(Streamlit 스타일) 레이아웃 출력
  if (snapshot?.combat && !snapshot.combat.finished) {
    return (
      <div id="story-tab-content" className="combat-layout">
        <div className="combat-grid">
          {/* 좌측 열: Tactical Board + Combat Log */}
          <div className="combat-left-col">
            <div className="panel tactical-board-panel">
              <div className="panel-title-row">
                <div className="panel-title">
                  TACTICAL BOARD :: ROUND {String(snapshot.combat.radar?.round || 1).padStart(2, "0")}
                </div>
                {onBoardZoom && (
                  <div
                    className="board-zoom"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="board-zoom-btn"
                      title="축소"
                      aria-label="전술 보드 축소"
                      disabled={boardZoom <= 1}
                      onClick={() => onBoardZoom(boardZoom - 0.25)}
                    >
                      −
                    </button>
                    <span className="board-zoom-val">{Math.round(boardZoom * 100)}%</span>
                    <button
                      type="button"
                      className="board-zoom-btn"
                      title="확대"
                      aria-label="전술 보드 확대"
                      disabled={boardZoom >= 2.5}
                      onClick={() => onBoardZoom(boardZoom + 0.25)}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
              <LearningGoalBanner
                key={snapshot.combat.encounter?.id || "encounter"}
                combat={snapshot.combat}
              />
              <div className="tactical-board-canvas-wrapper" style={{ marginTop: "12px" }}>
                <canvas
                  id="combat"
                  ref={canvasRef}
                  onPointerDown={onCanvasPointerDown}
                  onPointerMove={onCanvasPointerMove}
                  onPointerUp={onCanvasPointerUp}
                  onPointerCancel={onCanvasPointerCancel}
                  onPointerLeave={onCanvasPointerLeave}
                  style={{ display: "block", touchAction: "none" }}
                ></canvas>
              </div>
              <TacticalLegend combat={snapshot.combat} />
              <TileInspector combat={snapshot.combat} cell={combatInspectCell} />
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
              scenarioId={scenarioId}
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
      {finishedCombat && !isStreaming && (
        <CombatResultPanel
          combat={finishedCombat}
          scenarioId={scenarioId}
          onReturnToMain={onReturnToMain}
          onContinue={onContinueAfterCombat}
        />
      )}

      <div className="narrative-top-row">
        {/* 좌측: 장면 이미지 */}
        <div className="panel scene-image-panel">
          <div className="panel-title">
            {anchorImageOk && currentNode?.title ? `장면 · ${currentNode.title}` : "장면 이미지"}
          </div>
          <div className="story-visuals" style={{ marginTop: "12px" }}>
            <div className={`image-frame ${glitchActive ? "glitch-active" : ""}`}>
              {!displayImageUrl && <div className="image-ph">{imagePlaceholderText}</div>}
              {displayImageUrl && (
                <img
                  src={displayImageUrl}
                  className={`shown ${kenBurnsActive ? "kenburns-active" : ""} ${anchorImageOk ? "anchor-scene" : ""}`}
                  alt="scene"
                  onError={() => {
                    if (anchorImageUrl && displayImageUrl === anchorImageUrl) {
                      setBrokenImages((prev) => new Set(prev).add(anchorImageUrl));
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* 우측: Character 창 */}
        <CharacterPanel snapshot={snapshot} characters={scenarioCharacters} onEquip={onEquip} />
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
                  {h.result && (
                    <div className="history-scene-result">↳ 결과: {h.result}</div>
                  )}
                </div>
              ))}

              {/* 현재 지문 스트리밍 */}
              <div className="current-scene-block">
                <div id="status">{status}</div>
                <h2 id="scene-title" style={{ marginTop: "8px" }}>
                  {snapshot?.active_scene?.title || ""}
                </h2>
                <ObjectiveStrip snapshot={snapshot} />
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

            {!isStreaming && snapshot?.combat && !snapshot.combat.finished && (
              <div style={{ marginTop: "16px" }}>
                <CombatControls
                  combat={snapshot.combat}
                  scenarioId={scenarioId}
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
      {showHistory && (() => {
        const recentHistory = narrativeHistory.slice(-20);
        const offset = Math.max(0, narrativeHistory.length - 20);
        const headerText = narrativeHistory.length > 20
          ? `서사 기록 · 최근 20개 장면 (총 ${narrativeHistory.length}장면 중)`
          : `서사 기록 · ${narrativeHistory.length}장면`;

        return (
          <div className="history-overlay" onClick={() => setShowHistory(false)}>
            <div className="history-modal" onClick={(e) => e.stopPropagation()}>
              <div className="history-modal-head">
                <span>{headerText}</span>
                <button className="history-close-btn" onClick={() => setShowHistory(false)}>
                  닫기 ✕
                </button>
              </div>
              <div className="history-modal-body">
                {narrativeHistory.length === 0 && (
                  <div className="char-empty">아직 기록된 장면이 없습니다.</div>
                )}
                {recentHistory.map((h, index) => {
                  const idx = offset + index;
                  return (
                    <div key={`${h.sceneId}-${idx}`} className="history-scene-block">
                      <h3 className="history-scene-title">
                        {String(idx + 1).padStart(2, "0")} · {h.title}
                      </h3>
                      <div className="history-scene-text">{h.text}</div>
                      {h.action && (
                        <div className="history-scene-action">▸ 내 행동: {h.action}</div>
                      )}
                      {h.result && (
                        <div className="history-scene-result">↳ 결과: {h.result}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
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
  const reason = (() => {
    // Prefer the backend's narrative cause (authored ending narration, or a
    // story-framed reason for a threshold archive) so the end screen reads as a
    // beat, not a bare mechanical number.
    const narration = snapshot.state?.ending_narration;
    if (narration) return narration;
    if (snapshot.state?._soft_defeat_recovered) {
      return "전투 패배 후 회복 루트가 열렸지만, 이후 선택의 누적 결과로 이번 루프가 기록 보관소로 넘어갔습니다.";
    }
    if (snapshot.tension >= 90) {
      return "관리망의 추적이 임계에 다다라, 집행부대가 끝내 당신의 신호를 따라잡았습니다.";
    }
    if (snapshot.stability <= 10) {
      return "신호가 더는 형상을 유지하지 못하고 접속이 풀렸습니다.";
    }
    if (endingLabel) {
      return "이번 루프의 선택과 상태가 엔딩 조건을 만족했습니다.";
    }
    return "이번 루프가 종료 조건에 도달했습니다.";
  })();

  return (
    <div>
      <div className="ended-banner">
        <div className="et">여정 종료</div>
        {endingLabel ? <div className="el">엔딩 · {endingLabel}</div> : null}
        <div className="el">{reason}</div>
      </div>
      <div style={{ marginTop: "12px" }}>
        <button className="cc-btn" onClick={onLeaveSession}>
          새 접속 ▸
        </button>
      </div>
    </div>
  );
}
