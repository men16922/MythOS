import { Fragment, useEffect, useRef, useState } from "react";
import type { PointerEventHandler, RefObject } from "react";
import { CharacterPanel } from "./CharacterPanel";
import { detectSceneCharacter, segmentParagraph, speakerForParagraph } from "./sceneCharacter";
import { STAT_CANON, STAT_NAMES } from "./statVoice";
import { ChoicePanel } from "./ChoicePanel";
import { CombatControls } from "./CombatControls";
import { CombatLog } from "./CombatLog";
import { CombatRoster } from "./CombatRoster";
import { OperationMapPanel, StatusPanel } from "./GameAside";
import { RotateOverlay } from "./RotateOverlay";
import { SaveHistoryPanel } from "./SaveHistoryPanel";
import { Surface } from "./Surface";
import { useConciseMode } from "./conciseMode";
import { useOrientation } from "./hooks/useOrientation";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";
import type { CombatAction, CombatBlip, CombatState, RuntimeSnapshot, ScenarioCharacter } from "./types";

type TFn = (key: StringKey) => string;

type NarrativeHistoryItem = {
  sceneId: string;
  title: string;
  text: string;
  action?: string | null;
  result?: string | null;
};

const TACTICAL_LEGEND_SEEN_KEY = "mythos_tactical_legend_seen";

interface StoryPanelProps {
  status: string;
  snapshot: RuntimeSnapshot | null;
  // A/V sync C: while a combat cinema is replaying a turn, this holds the same
  // interim board the canvas is drawing (pre-final HP). The roster/inspector use
  // it instead of the committed `snapshot.combat` so all three surfaces agree
  // mid-replay; null when no cinema is playing (roster/inspector show truth).
  replayCombat?: CombatState | null;
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
  // Choice optimistically in flight (T2) — passed through to ChoicePanel.
  pendingChoiceId?: string | null;
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
  // A2 first-combat tutorial: which combat control to spotlight
  // ("move" | "attack" | "skill" | "defend"), null when the tutorial is off.
  tutorialHighlight?: string | null;
  onOpenCodex?: () => void;
  // LC4: threaded through only for the landscape+coarse combat fold of
  // Save/Status into the combat-bottom-row right column.
  isBusy?: boolean;
  canSave?: boolean;
  onOpenSave?: () => void;
  onOpenLoad?: () => void;
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

// STAT_CANON / STAT_NAMES now live in ./statVoice (shared with the dialogue
// segmenter so it never mistakes a stat voice for spoken dialogue). Presentation
// (color/icon/emoji per canonical id) stays here.
const STAT_STYLE: Record<string, { color: string; icon: string; emoji: string }> = {
  strength: { color: "#FF5555", icon: "/assets/icons/stat_strength.png", emoji: "💪" },
  intelligence: { color: "#8BE9FD", icon: "/assets/icons/stat_intelligence.png", emoji: "🧠" },
  charisma: { color: "#FFB86C", icon: "/assets/icons/stat_charisma.png", emoji: "🗣️" },
  agility: { color: "#50FA7B", icon: "/assets/icons/stat_agility.png", emoji: "🏃‍♂️" },
  perception: { color: "#F1FA8C", icon: "/assets/icons/stat_perception.png", emoji: "👁️" },
};

const renderFormattedNarration = (rawText: string, turnIndex: number, t: TFn) => {
  if (!rawText) return null;
  const text = decodeGarbageBytes(rawText);

  // Complex: (stat: value) + arbitrary particle + "line"
  const complexRegex = new RegExp(`\\((${STAT_NAMES}):\\s*(\\d+)\\)([^"]*?)("[^"]+")`, "g");

  // Simple: (stat: line)
  const simpleRegex = new RegExp(`\\((${STAT_NAMES}):\\s*([^)]+)\\)`, "g");

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

  // 3. 줄머리 패턴 — 모델이 괄호를 생략하고 "민첩: …"로 문단을 여는 형식 드리프트
  //    (라이브 제보 2026-07-11: 같은 배포에서 (민첩: …)와 민첩: … 가 섞여 나옴).
  //    줄 시작에서만 매칭하므로 본문 산문과 충돌하지 않는다.
  const lineRegex = new RegExp(`(?:^|\\n)[ \\t]*(${STAT_NAMES}):[ \\t]*([^\\n]+)`, "g");
  let matchLine: RegExpExecArray | null;
  lineRegex.lastIndex = 0;
  while ((matchLine = lineRegex.exec(text)) !== null) {
    const cur = matchLine;
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

    const canon = STAT_CANON[m.statName];
    const style = canon ? STAT_STYLE[canon] : undefined;
    const color = style?.color ?? "#888888";
    const iconUrl = style?.icon ?? "";
    const fallbackEmoji = style?.emoji ?? "👁️";

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
            <span><strong>{t("story.statWhisper")}</strong> {t("story.statWhisperPre")}{m.statName}{t("story.statWhisperPost")}</span>
          </span>
        )}
        <span
          className="inner-monologue"
          style={{
            display: "block",
            padding: "8px 12px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderLeft: `3px solid ${color}`,
            borderRadius: "0 4px 4px 0",
          }}
        >
          {/* Always-on label so a stat voice is unmistakably an inner read, never
              confused with a character's dialogue callout (portrait + name). */}
          <span
            className="inner-monologue-tag"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color,
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            <img
              src={iconUrl}
              alt={m.statName}
              style={{ width: "15px", height: "15px", objectFit: "contain" }}
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
            <span>
              {m.statName}
              {m.statValue ? ` ${m.statValue}` : ""} · {t("story.innerVoiceLabel")}
            </span>
          </span>
          <span
            className="inner-monologue-body"
            style={{ display: "block", color, fontStyle: "italic" }}
          >
            {m.statValue ? (
              <>
                {m.description ? `${m.description} ` : ""}
                <span style={{ color: "#ffffff", fontStyle: "normal" }}>{renderBoldText(m.statText)}</span>
              </>
            ) : (
              renderBoldText(m.statText)
            )}
          </span>
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

// 대사 문단 분리 (오너 2026-07-11): 화자가 확인된 문단은 스탯 보이스처럼 별도
// 말풍선(초상 썸네일 + 이름 + 대사)으로 렌더해 지문과 구분한다. 화자 판정은
// CHARACTER 패널과 같은 sceneCharacter 로직(대사 인용문 + 지문의 이름)을 공유.
const renderNarrationWithSpeakers = (
  rawText: string,
  turnIndex: number,
  t: TFn,
  characters?: ScenarioCharacter[]
) => {
  if (!rawText) return null;
  const paragraphs = rawText.split(/\n{2,}/);
  return paragraphs.map((para, idx) => {
    const segments = segmentParagraph(para);
    const hasSpeech = segments.some((s) => s.kind === "speech");
    // 순수 지문은 그대로.
    if (!hasSpeech) {
      return (
        <div key={idx} className="narration-para">
          {renderFormattedNarration(para, turnIndex, t)}
        </div>
      );
    }
    // 따옴표 대사는 화자를 몰라도 항상 지문과 구분해 표시 (오너 2026-07-11):
    // 화자가 확인되면 초상+이름 말풍선, 확인 안 되면 익명 대사 라인(오표기 위험
    // 0). 지문/행동 묘사 세그먼트는 일반 나레이션으로, 문서 순서대로 렌더.
    const speaker = speakerForParagraph(para, characters);
    return (
      <Fragment key={idx}>
        {segments.map((seg, si) => {
          if (seg.kind !== "speech") {
            return (
              <div key={si} className="narration-para">
                {renderFormattedNarration(seg.text, turnIndex, t)}
              </div>
            );
          }
          if (speaker) {
            return (
              <div key={si} className="dialogue-callout">
                {speaker.portrait && (
                  <img
                    className="dialogue-callout-portrait"
                    src={speaker.portrait}
                    alt={speaker.name}
                    draggable={false}
                  />
                )}
                <div className="dialogue-callout-body">
                  <div className="dialogue-callout-name">{speaker.name}</div>
                  <div className="dialogue-callout-text">
                    {renderFormattedNarration(seg.text, turnIndex, t)}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={si} className="dialogue-line">
              {renderFormattedNarration(seg.text, turnIndex, t)}
            </div>
          );
        })}
      </Fragment>
    );
  });
};

const combatOutcomeLabel = (outcome: string | undefined, t: TFn): string => {
  if (outcome === "player_victory") return t("story.combat.win");
  if (outcome === "player_fled") return t("story.combat.fled");
  if (outcome === "player_defeat") return t("story.combat.defeat");
  return outcome || t("story.combat.over");
};

const combatOutcomeCopy = (outcome: string | undefined, defeatSoft: boolean | undefined, t: TFn): string => {
  if (outcome === "player_victory") return t("story.combat.copy.victory");
  if (outcome === "player_fled") return t("story.combat.copy.fled");
  if (outcome === "player_defeat") {
    return defeatSoft ? t("story.combat.copy.defeatSoft") : t("story.combat.copy.defeat");
  }
  return t("story.combat.copy.default");
};

const combatImageSrc = (scenarioId: string, blip: CombatBlip): string => {
  const images = blip.combat_images || {};
  const path = images.idle || images.guard || images.skill || blip.portrait || "";
  return path ? `/resources/${scenarioId}/${path}` : "";
};

function CombatResultPanel({
  combat,
  scenarioId,
  loopEnded,
  onReturnToMain,
  onContinue,
}: {
  combat: CombatState;
  scenarioId: string;
  loopEnded: boolean;
  onReturnToMain: () => void;
  onContinue: () => void;
}) {
  const { t } = useLang();
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
        {t("story.combat.end")} — {combatOutcomeLabel(outcome, t)}
      </div>

      <div className="combat-result-visual">
        <div className="combat-result-composite" aria-label={t("story.combat.resultImg")}>
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

      <p className="combat-result-copy">{combatOutcomeCopy(outcome, isSoftDefeat, t)}</p>
      {(rewardEntries.length > 0 || items.length > 0) && (
        <div className="combat-reward-summary">
          <div className="combat-reward-title">{t("story.combat.gains")}</div>
          {rewardEntries.length > 0 && (
            <div className="combat-reward-row">
              {rewardEntries.map(([key, value]) => (
                <span key={key} className="combat-reward-chip">
                  {key === "insight" ? t("story.combat.insight") : key === "tension" ? t("story.combat.pursuit") : key === "stability" ? t("story.combat.stability") : key} {Number(value) > 0 ? "+" : ""}{String(value)}
                </span>
              ))}
            </div>
          )}
          {items.length > 0 && (
            <div className="combat-reward-row">
              {items.map((item, idx) => (
                <span key={`${item}-${idx}`} className="combat-reward-chip item">
                  {t("story.combat.loot")} {item}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {/* A run-ending combat renders the EndedPanel (ending art/narration/
          carry-forward) right below this panel — it owns the exit, so offering
          Continue (choose() rejects ended loops) or To Main here would either
          error or skip the ending screen entirely. */}
      {!loopEnded && (
        <div className="cc-row combat-result-actions">
          {!isDefeat || isSoftDefeat ? (
            <button className="cc-btn" onClick={onContinue} id="cc-continue">
              {t("story.combat.continue")}
            </button>
          ) : (
            <button className="cc-btn" onClick={onReturnToMain} id="cc-return-main">
              {t("story.combat.toMain")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TacticalLegend({ combat }: { combat: CombatState }) {
  const { t } = useLang();
  const covers = Object.values(combat.covers || {});
  const hazards = Object.values(combat.hazards || {});
  const hasElevation = Object.values(combat.elevations || {}).some((v) => Number(v) > 0);
  const intents = combat.radar?.enemy_intents || [];
  const hasLegendContent = intents.length > 0 || covers.length > 0 || hazards.length > 0 || hasElevation;

  const rows: { sym: string; text: string }[] = [];
  rows.push({ sym: "⚔️/🏃/👣", text: t("story.legend.intents") });
  if (covers.includes("full")) rows.push({ sym: "▣", text: t("story.legend.coverFull") });
  if (covers.includes("half")) rows.push({ sym: "◧", text: t("story.legend.coverHalf") });
  if (hazards.includes("acid")) rows.push({ sym: "☣", text: t("story.legend.acid") });
  if (hazards.includes("electro")) rows.push({ sym: "⚡", text: t("story.legend.electro") });
  if (hasElevation) rows.push({ sym: "▲n", text: t("story.legend.elevation") });
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(TACTICAL_LEGEND_SEEN_KEY) !== "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!open || !hasLegendContent) return;
    try {
      localStorage.setItem(TACTICAL_LEGEND_SEEN_KEY, "1");
    } catch {
      /* ignore storage failures */
    }
  }, [hasLegendContent, open]);

  if (!hasLegendContent) {
    return null;
  }

  return (
    <div className="tactical-legend-wrap">
      <button
        type="button"
        className="tactical-legend-toggle"
        aria-expanded={open}
        aria-label={open ? t("story.legend.close") : t("story.legend.open")}
        title={t("story.legend.title")}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t("story.legend.close") : t("story.legend.open")}
      </button>
      {open && (
        <div className="tactical-legend tactical-legend-popup" role="dialog" aria-label={t("story.legend.title")}>
          <div className="tactical-legend-title">{t("story.legend.title")}</div>
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
  const { t } = useLang();
  const encounter = combat.encounter;
  const goal = encounter?.learning_goal;
  const trigger = encounter?.narrative_trigger;
  const reward = encounter?.reward_intent;
  const [dismissed, setDismissed] = useState(false);
  // Collapsed by default: one lesson line, full detail on demand (live feedback
  // 2026-07-04 — the three-paragraph banner crowded the board).
  const [expanded, setExpanded] = useState(false);
  if ((!goal && !trigger && !reward) || dismissed) return null;
  const summary = goal || trigger || reward || "";
  const firstSentence = summary.split(/(?<=[.!?。])\s/)[0] || summary;
  return (
    <div className="combat-learning-goal" role="note">
      <span className="combat-learning-goal-icon">🎯</span>
      <div className="combat-learning-goal-body">
        <span className="combat-learning-goal-label">
          {t("story.learn.bg")}{encounter?.name ? ` · ${encounter.name}` : ""}
        </span>
        {!expanded && (
          <span className="combat-learning-goal-text">
            🎯 <span className="combat-learning-goal-summary">{firstSentence}</span>
            <button className="lg-more" onClick={() => setExpanded(true)}>
              {t("story.learn.more")}
            </button>
          </span>
        )}
        {expanded && (
          <>
            {trigger && <span className="combat-learning-goal-text">⚑ {t("story.learn.trigger")} · {trigger}</span>}
            {goal && <span className="combat-learning-goal-text">🎯 {t("story.learn.goal")} · {goal}</span>}
            {reward && <span className="combat-learning-goal-text">🎁 {t("story.learn.reward")} · {reward}</span>}
          </>
        )}
      </div>
      <button
        className="combat-learning-goal-close"
        onClick={() => setDismissed(true)}
        aria-label={t("story.learn.close")}
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
  const { t } = useLang();
  // DS3b (owner-approved 2026-07-09): a single FIXED-size inspector. The three
  // decision-critical stats — HP · Enemy intent · Cover — are ALWAYS rendered
  // (as "—" when absent) so the panel keeps a stable shape and never jumps on
  // hover/select; per-tile detail (elevation/hazard/reach/terrain) fills the
  // secondary rows below. Fixes the old empty(52px)↔populated height jump.
  const dash = "—";
  let coordLabel = t("story.tile.hint");
  let hpVal = dash;
  let intentVal = dash;
  let coverVal = dash;
  const secondary: { label: string; value: string }[] = [];

  if (cell) {
    const [x, y] = cell;
    coordLabel = `${t("story.tile.coord")} (${x}, ${y})`;
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
      faction === "enemy" ? t("story.tile.enemy") : faction === "ally" ? t("story.tile.ally") : t("story.tile.friendly");
    const coverLabel = cover === "full" ? t("story.tile.coverFull") : cover === "half" ? t("story.tile.coverHalf") : null;
    const hazardLabel =
      hazard === "acid" ? t("story.tile.acid") : hazard === "electro" ? t("story.tile.electro") : hazard || null;

    // Primary trio.
    if (occupant) {
      hpVal = `${occupant.name || occupant.id} · ${occupant.hp}/${occupant.max_hp} (${factionLabel(occupant.faction)})`;
    }
    if (intent) {
      intentVal = intent.action === "attack" ? t("story.tile.attack") : intent.action === "flee" ? t("story.tile.flee") : t("story.tile.move");
    }
    if (coverLabel) coverVal = coverLabel;

    // Secondary (per-tile) detail.
    if (elevation > 0) secondary.push({ label: t("story.tile.high"), value: `+${elevation}` });
    if (hazardLabel) secondary.push({ label: t("story.tile.risk"), value: hazardLabel });
    if (reachable) secondary.push({ label: t("story.tile.move"), value: t("story.tile.moveable") });
    if (!occupant && !coverLabel && !hazardLabel && elevation === 0)
      secondary.push({ label: t("story.tile.terrain"), value: t("story.tile.empty") });
  }

  const primary = [
    { label: t("story.tile.hp"), value: hpVal },
    { label: t("story.tile.intent"), value: intentVal },
    { label: t("story.tile.cover"), value: coverVal },
  ];

  return (
    <div className="tile-inspector">
      <div className="tile-inspector-coord">{coordLabel}</div>
      <div className="tile-inspector-rows">
        {primary.map((r) => (
          <div key={r.label} className="tile-inspector-row primary">
            <span className="tile-inspector-key">{r.label}</span>
            <span className="tile-inspector-val">{r.value}</span>
          </div>
        ))}
        {secondary.map((r, i) => (
          <div key={`sec-${i}`} className="tile-inspector-row">
            <span className="tile-inspector-key">{r.label}</span>
            <span className="tile-inspector-val">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// T6c (mobile density): in concise mode, secondary combat-panel clusters
// (tile inspector / combat log) start collapsed as a one-line summary chip —
// same details/summary shape T6b introduced for the Save/Map aside panels.
// Non-concise mode renders children unwrapped, unchanged from before T6c.
function CombatChip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Surface as="details" variant="surface" className="aside-chip">
      <summary className="panel-title aside-chip-summary">{title}</summary>
      <div className="aside-chip-body">{children}</div>
    </Surface>
  );
}

// `collapsible` (mobile/coarse) renders the strip as a one-line 현재 목표 summary
// that taps open to reveal the act goal / stakes / last result — so the strip no
// longer pushes the narration (the thing the player reads every turn) far down.
// Desktop keeps the full always-open strip.
function ObjectiveStrip({
  snapshot,
  collapsible,
}: {
  snapshot: RuntimeSnapshot | null;
  collapsible?: boolean;
}) {
  const { t } = useLang();
  const scene = snapshot?.active_scene;
  if (!scene) return null;
  const stakes = scene.stakes_summary || [];
  const result = scene.choice_result?.summary || scene.action_result;
  if (!scene.objective && !scene.chapter_goal && stakes.length === 0 && !result) return null;

  // The act goal only appears in the body when the current objective already
  // owns the summary line, so the two never duplicate.
  const summaryText = scene.objective || scene.chapter_goal || "";
  const showChapterInBody = Boolean(scene.chapter_goal && scene.objective);
  const bodyBlocks = (
    <>
      {showChapterInBody && (
        <div className="objective-main objective-chapter">
          <span className="objective-kicker">{t("story.obj.chapter")}</span>
          <span className="objective-text">{scene.chapter_goal}</span>
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
          <span className="objective-kicker">{t("story.obj.lastResult")}</span>
          <span>{result}</span>
        </div>
      )}
    </>
  );

  if (collapsible) {
    const hasDetail = showChapterInBody || stakes.length > 0 || Boolean(result);
    // No extra detail → a plain one-liner (no pointless empty toggle).
    if (!hasDetail) {
      return (
        <div className="objective-strip objective-strip-oneline">
          <span className="objective-kicker">{t("story.obj.current")}</span>
          <span className="objective-text">{summaryText}</span>
        </div>
      );
    }
    return (
      <details className="objective-strip objective-strip-collapsible">
        <summary className="objective-summary">
          <span className="objective-kicker">{t("story.obj.current")}</span>
          <span className="objective-text">{summaryText}</span>
        </summary>
        <div className="objective-body">{bodyBlocks}</div>
      </details>
    );
  }

  return (
    <div className="objective-strip">
      {scene.chapter_goal && (
        <div className="objective-main objective-chapter">
          <span className="objective-kicker">{t("story.obj.chapter")}</span>
          <span className="objective-text">{scene.chapter_goal}</span>
        </div>
      )}
      {scene.objective && (
        <div className="objective-main">
          <span className="objective-kicker">{t("story.obj.current")}</span>
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
          <span className="objective-kicker">{t("story.obj.lastResult")}</span>
          <span>{result}</span>
        </div>
      )}
    </div>
  );
}

export function StoryPanel({
  status,
  snapshot,
  replayCombat,
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
  pendingChoiceId,
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
  tutorialHighlight,
  onOpenCodex,
  isBusy = false,
  canSave = false,
  onOpenSave,
  onOpenLoad,
}: StoryPanelProps) {
  const { t } = useLang();
  const { conciseMode } = useConciseMode();
  const { isLandscape, isCoarsePointer } = useOrientation();
  const isLandscapeCoarseCombat = isLandscape && isCoarsePointer;
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const scrollTopRef = useRef<HTMLDivElement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // A staged companion cutscene outranks the current route anchor; both use a
  // pre-authored image and fall back to the generated scene image if unavailable.
  const activeCutscene = snapshot?.state?._active_cutscene;
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
  if (activeCutscene?.image) {
    anchorImageName = activeCutscene.image;
  } else if (currentNode?.anchor && Array.isArray(imageSeq) && imageSeq.length > 0) {
    anchorImageName = imageSeq[Math.min(sceneTurn, imageSeq.length - 1)];
  } else {
    anchorImageName =
      currentNode?.image_pre && !scenePartner ? currentNode.image_pre : currentNode?.image;
  }
  const hasCuratedScene = Boolean(activeCutscene?.image || currentNode?.anchor);
  const anchorImageUrl =
    hasCuratedScene && anchorImageName
      ? `/resources/${scenarioId}/${anchorImageName}`
      : "";
  const anchorImageOk = anchorImageUrl && !brokenImages.has(anchorImageUrl);
  const displayImageUrl = anchorImageOk ? anchorImageUrl : sceneImageUrl;
  const curatedSceneTitle = activeCutscene?.title || currentNode?.title;

  // Keep only the most recent past scene inline for narrative flow; the full
  // log lives in a separate overlay so the main view stays uncluttered.
  const INLINE_HISTORY_LIMIT = 1;
  const inlineHistory = narrativeHistory.slice(-INLINE_HISTORY_LIMIT);
  const hasNarrativeHistory = narrativeHistory.length > 0;

  // Auto scroll to bottom when new streaming text arrives or history updates —
  // but not while a finished-combat result is showing (we surface that at the top),
  // and not while the reader has scrolled up to re-read. Real-device feedback
  // (2026-07-10, "글씨 나오는 도중 스크롤하면 드드드드"): the typewriter fires
  // `setDisplayedNarration` every ~12ms, so a per-tick *smooth* scrollIntoView
  // stacked animation frames and fought the touch gesture. Two fixes: (1)
  // `stickToBottomRef` — an IntersectionObserver on the bottom sentinel tracks
  // whether the reader is (near-)bottom, so scrolling up is never yanked back;
  // (2) during streaming use instant ("auto") scroll so ticks don't pile up.
  const combatJustFinished = Boolean(snapshot?.combat?.finished);
  const combatOutcome = snapshot?.combat?.finished ? snapshot.combat.outcome ?? null : null;
  const stickToBottomRef = useRef(true);
  useEffect(() => {
    const sentinel = scrollBottomRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        stickToBottomRef.current = entries[0]?.isIntersecting ?? true;
      },
      // "Near bottom" = the sentinel is within ~140px of the viewport bottom.
      { rootMargin: "0px 0px 140px 0px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (combatJustFinished) return;
    if (!stickToBottomRef.current) return;
    scrollBottomRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
  }, [displayedNarration, narrativeHistory, combatJustFinished, isStreaming]);

  // When a combat resolves (victory/defeat/flee), bring the result panel into
  // view at the top instead of leaving the player scrolled to the bottom.
  useEffect(() => {
    if (combatOutcome) {
      scrollTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [combatOutcome]);

  const canChoose =
    !isStreaming &&
    snapshot &&
    snapshot.phase !== "ended" &&
    (!snapshot.combat || snapshot.combat.finished);
  const finishedCombat = snapshot?.combat?.finished ? snapshot.combat : null;

  // 전투 진행 중인 경우, 가로 분할(Streamlit 스타일) 레이아웃 출력
  if (snapshot?.combat && !snapshot.combat.finished) {
    // A/V sync C: during a cinema replay the canvas draws interim (pre-final) HP
    // while `snapshot.combat` already holds the committed post-turn truth. The
    // roster + tile inspector read this interim board so they match the canvas
    // mid-replay; `replayCombat` is null when no cinema plays → truth as before.
    const rosterCombat = replayCombat ?? snapshot.combat;
    // LC6: the command console (target selection + Attack/Defend/Skills) is the
    // one cluster the player acts on every turn. Hoist it into a single element
    // so it can lead the landscape right column (actions-first, co-visible with
    // the board) while portrait/desktop keep it in its original mid-column slot.
    const controlsEl = (
      <CombatControls
        combat={snapshot.combat}
        scenarioId={scenarioId}
        selectedTargetId={combatTarget}
        onSelectTarget={onSelectCombatTarget}
        onAction={onCombatAction}
        onReturnToMain={onReturnToMain}
        onContinue={onContinueAfterCombat}
        tutorialHighlight={tutorialHighlight}
      />
    );
    return (
      <div id="story-tab-content" className="combat-layout">
        <RotateOverlay />
        {/* D3 board legibility: TACTICAL BOARD full-width on top; roster /
            command console / log as a bottom row. */}
        <div className="combat-stack">
            <Surface variant="surface" className="tactical-board-panel">
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
                      title={t("story.board.zoomOut")}
                      aria-label={t("story.board.zoomOutAria")}
                      disabled={boardZoom <= 1}
                      onClick={() => onBoardZoom(boardZoom - 0.25)}
                    >
                      −
                    </button>
                    <span className="board-zoom-val">{Math.round(boardZoom * 100)}%</span>
                    <button
                      type="button"
                      className="board-zoom-btn"
                      title={t("story.board.zoomIn")}
                      aria-label={t("story.board.zoomInAria")}
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
              <div
                className={`tactical-board-canvas-wrapper${
                  tutorialHighlight === "move" ? " tut-glow" : ""
                }`}
                style={{ marginTop: "12px" }}
              >
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
            </Surface>

          {/* 하단 행(랜드스케이프에서는 우측 컬럼): Tile Inspector · Party/Enemy
              Roster · Command Console · Combat Log · (landscape+coarse) Operation
              Map — LC2 folds all of these into one scroll column so the turn
              loop fits one screen (docs/plans/2026-07-08-design-system.md
              "Landscape Combat"). */}
          <div className="combat-bottom-row">
            {/* LC6: actions-first in landscape+coarse combat — the command
                console leads so the action bar is co-visible with the board;
                portrait/desktop keep it in its original slot below the roster. */}
            {isLandscapeCoarseCombat && controlsEl}

            {conciseMode ? (
              <CombatChip title={t("story.tile.title")}>
                <TileInspector combat={rosterCombat} cell={combatInspectCell} />
              </CombatChip>
            ) : (
              <TileInspector combat={rosterCombat} cell={combatInspectCell} />
            )}

            <Surface variant="surface" className="roster-panel">
              <CombatRoster combat={rosterCombat} scenarioId={scenarioId} />
            </Surface>

            {!isLandscapeCoarseCombat && controlsEl}

            {conciseMode && combatLog ? (
              <CombatChip title={t("combatLog.title")}>
                <CombatLog log={combatLog} />
              </CombatChip>
            ) : (
              <CombatLog log={combatLog} />
            )}

            {isLandscapeCoarseCombat && (
              <CombatChip title={t("aside.route.title")}>
                <OperationMapPanel snapshot={snapshot} onOpenCodex={onOpenCodex} />
              </CombatChip>
            )}

            {/* LC4: GameAside renders nothing in this state (folded entirely),
                so Save/Status join Map here — the right column is now the
                single scrollable surface and the page itself never scrolls. */}
            {isLandscapeCoarseCombat && onOpenSave && onOpenLoad && (
              <CombatChip title={t("save.title")}>
                <SaveHistoryPanel
                  isBusy={isBusy}
                  canSave={canSave}
                  onOpenSave={onOpenSave}
                  onOpenLoad={onOpenLoad}
                />
              </CombatChip>
            )}

            {isLandscapeCoarseCombat && (
              <CombatChip title={t("aside.status.title")}>
                <StatusPanel snapshot={snapshot} />
              </CombatChip>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 비전투(내러티브) 상태 레이아웃
  // 상단 행: 좌측 장면 이미지 + 우측 Character 창 / 하단: 전체 폭 대화 스크립트
  return (
    <div id="story-tab-content" className="narrative-layout">
      <div ref={scrollTopRef} style={{ height: "1px" }} />
      {finishedCombat && !isStreaming && (
        <CombatResultPanel
          combat={finishedCombat}
          scenarioId={scenarioId}
          loopEnded={snapshot?.phase === "ended"}
          onReturnToMain={onReturnToMain}
          onContinue={onContinueAfterCombat}
        />
      )}

      <div className="narrative-top-row">
        {/* 좌측: 장면 이미지 */}
        <Surface variant="surface" className="scene-image-panel">
          <div className="panel-title">
            {anchorImageOk && curatedSceneTitle ? `${t("story.scene")} · ${curatedSceneTitle}` : t("story.sceneImage")}
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
        </Surface>

        {/* 우측: Character 창.
            - Touch/coarse (phone): OMITTED here entirely — it is a pure duplicate
              of the 인물 tab and, even collapsed, its labelled box ate ~140px of
              vertical space above the narration. The 인물 tab is the single source.
            - Desktop concise (fine pointer): folds into a COLLAPSED chip.
            - Desktop default: renders inline. */}
        {isCoarsePointer ? null : conciseMode ? (
          <CombatChip title="CHARACTER">
            <CharacterPanel snapshot={snapshot} characters={scenarioCharacters} onEquip={onEquip} compact />
          </CombatChip>
        ) : (
          <CharacterPanel snapshot={snapshot} characters={scenarioCharacters} onEquip={onEquip} compact />
        )}
      </div>

      {/* 하단: 전체 폭 대화 기록 스크롤 영역 & 제어 패널 */}
      <div className="narrative-script-row">
        <Surface variant="surface" className="narrative-script-panel">
            <div className="narrative-scroll-area">
              {/* 전체 기록은 별도 화면(오버레이)에서. 인라인은 직전 장면만 유지 */}
              {hasNarrativeHistory && (
                <button
                  className="history-open-btn"
                  onClick={() => setShowHistory(true)}
                >
                  {t("story.history.viewAll")} ({narrativeHistory.length})
                </button>
              )}

              {/* 직전 장면(맥락 유지용) — 기본 접힘 (owner 2026-07-11): 현재 지문에
                  집중하고, 맥락이 필요할 때만 펼쳐 직전 장면을 본다. */}
              {inlineHistory.length > 0 && (
                <details className="history-inline-details">
                  <summary className="history-inline-summary">
                    {t("story.history.previousScene")}
                  </summary>
                  {inlineHistory.map((h, idx) => (
                    <div key={`${h.sceneId}-${idx}`} className="history-scene-block">
                      <h3 className="history-scene-title">
                        {h.title}
                      </h3>
                      <div className="history-scene-text">
                        {h.text}
                      </div>
                      {h.action && (
                        <div className="history-scene-action">{t("story.history.myAction")} {h.action}</div>
                      )}
                      {h.result && (
                        <div className="history-scene-result">{t("story.history.result")} {h.result}</div>
                      )}
                    </div>
                  ))}
                </details>
              )}

              {/* 현재 지문 스트리밍 */}
              <div className="current-scene-block">
                <div id="status">{status}</div>
                <h2 id="scene-title" style={{ marginTop: "8px" }}>
                  {snapshot?.active_scene?.title || ""}
                </h2>
                <ObjectiveStrip snapshot={snapshot} collapsible={isCoarsePointer} />
                <div id="narration">
                  {renderNarrationWithSpeakers(
                    displayedNarration,
                    snapshot?.active_scene?.turn_index ?? 0,
                    t,
                    scenarioCharacters
                  )}
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
                  routeMap={routeMap}
                  onChoose={onChoose}
                  pendingChoiceId={pendingChoiceId}
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
          </Surface>
        </div>

      {/* 별도 화면: 전체 서사 기록 (스크립트 + 내 행동) */}
      {showHistory && (() => {
        const recentHistory = narrativeHistory.slice(-20);
        const offset = Math.max(0, narrativeHistory.length - 20);
        const headerText = narrativeHistory.length > 20
          ? `${t("story.history.title")} · ${t("story.history.recent20")} (${narrativeHistory.length} ${t("story.history.scenesTotal")})`
          : `${t("story.history.title")} · ${narrativeHistory.length} ${t("story.history.scenes")}`;

        return (
          <div className="history-overlay" onClick={() => setShowHistory(false)}>
            <div className="history-modal" onClick={(e) => e.stopPropagation()}>
              <div className="history-modal-head">
                <span>{headerText}</span>
                <button className="history-close-btn" onClick={() => setShowHistory(false)}>
                  {t("story.history.close")}
                </button>
              </div>
              <div className="history-modal-body">
                {narrativeHistory.length === 0 && (
                  <div className="char-empty">{t("story.history.empty")}</div>
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
                        <div className="history-scene-action">{t("story.history.myAction")} {h.action}</div>
                      )}
                      {h.result && (
                        <div className="history-scene-result">{t("story.history.result")} {h.result}</div>
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
  const { t } = useLang();
  const endingLabel = snapshot.state?.ending_label || snapshot.state?.ending_id;
  const endingImage = snapshot.state?.ending_image;
  const scenarioId = snapshot.state?.scenario_id || "neo-seoul";
  const reason = (() => {
    // Prefer the backend's narrative cause (authored ending narration, or a
    // story-framed reason for a threshold archive) so the end screen reads as a
    // beat, not a bare mechanical number. The authored narration is server data
    // (already in the active language); the fallbacks below are UI chrome.
    const narration = snapshot.state?.ending_narration;
    if (narration) return narration;
    if (snapshot.state?._soft_defeat_recovered) return t("story.end.reason.soft");
    if (snapshot.tension >= 90) return t("story.end.reason.tension");
    if (snapshot.stability <= 10) return t("story.end.reason.stability");
    if (endingLabel) return t("story.end.reason.ending");
    return t("story.end.reason.default");
  })();

  // Carry-forward hook: sell what this run leaves for the next loop. Roguelite
  // meta accrues per player+scenario (insight -> skills, echoes, affection), so a
  // loss is still progress — this is the "one more loop" pull for CBT players.
  const runBoons = (snapshot.boons?.active ?? []).map((b) => b.name);
  const combatsWon = Number(snapshot.state?._combat_count ?? 0);

  return (
    <div>
      {endingImage && (
        <div className="ending-art">
          <img
            src={`/resources/${scenarioId}/${endingImage}`}
            alt={endingLabel || t("story.end.title")}
          />
        </div>
      )}
      <div className="ended-banner">
        <div className="et">{t("story.end.title")}</div>
        {endingLabel ? <div className="el">{t("story.end.ending")} · {endingLabel}</div> : null}
        <div className="el">{reason}</div>
      </div>
      <div className="carry-forward">
        <div className="cf-head">{t("story.end.carry.title")}</div>
        <ul className="cf-list">
          {combatsWon > 0 && <li>{t("story.end.carry.wins")}: {combatsWon}</li>}
          {runBoons.length > 0 && <li>{t("story.end.carry.build")}: {runBoons.join(" · ")}</li>}
          <li>{t("story.end.carry.meta")}</li>
        </ul>
      </div>
      {(() => {
        // G4 loop hooking: cliffhanger for the next run — carried echo, the
        // loudest unresolved setup, and what might await (variants/modifiers).
        const teaser = snapshot.next_loop_teaser;
        const echoText = snapshot.echo?.text || snapshot.echo?.symbol;
        if (!teaser && !echoText) return null;
        return (
          <div className="carry-forward next-loop-teaser" id="next-loop-teaser">
            <div className="cf-head">{t("story.end.next.title")}</div>
            <ul className="cf-list">
              {echoText && <li>{t("story.end.next.echo")}: {echoText}</li>}
              {teaser?.open_setup && (
                <li>{t("story.end.next.openSetup")}: {teaser.open_setup}</li>
              )}
              {(teaser?.variant_candidates?.length ?? 0) > 0 && (
                <li>
                  {t("story.end.next.variants")}: {(teaser?.variant_candidates ?? []).join(" · ")}
                </li>
              )}
              {(teaser?.modifier_names?.length ?? 0) > 0 && (
                <li>
                  {t("story.end.next.modifiers")}: {(teaser?.modifier_names ?? []).join(" · ")}
                </li>
              )}
            </ul>
          </div>
        );
      })()}
      <div style={{ marginTop: "12px" }}>
        <button className="cc-btn" id="ended-new-connect" onClick={onLeaveSession}>
          {t("story.end.newConnect")}
        </button>
      </div>
    </div>
  );
}
