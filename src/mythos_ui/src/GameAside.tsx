import { useState } from "react";
import { buildGaugeConfig } from "./gauges";
import { SaveHistoryPanel } from "./SaveHistoryPanel";
import type {
  RouteMap,
  RouteNode,
  RuntimeSnapshot,
  SaveSlot,
} from "./types";

interface GameAsideProps {
  saveLabelInput: string;
  saveSlots: SaveSlot[];
  isBusy: boolean;
  canSave: boolean;
  playerId: string;
  scenarioId: string;
  finalizedSnapshot: RuntimeSnapshot | null;
  consoleLogs: string;
  onSaveLabelChange: (value: string) => void;
  onSave: () => void;
  onLoad: (params: { playerId: string; scenarioId: string; loopId?: string }) => void;
}

const TILE_GLYPH: Record<string, string> = {
  node: "◍",
  checkpoint: "◈",
  clue: "❖",
  player: "◆",
};

const TILE_LABEL: Record<string, string> = {
  node: "경유지",
  checkpoint: "검문/관문",
  clue: "단서 지점",
  player: "현재 위치",
};

function contactDistance(contact: { x?: number; y?: number }, cx: number, cy: number): number {
  return Math.max(Math.abs(Number(contact.x || 0) - cx), Math.abs(Number(contact.y || 0) - cy));
}

function rewardSummary(reward?: Record<string, number>): string {
  if (!reward) return "";
  const parts: string[] = [];
  if (reward.insight) parts.push(`통찰 +${reward.insight}`);
  if (reward.stability) parts.push(`안정 +${reward.stability}`);
  if (reward.tension) parts.push(`추적 +${reward.tension}`);
  return parts.join(" · ");
}

type RouteGraphMode = "compact" | "detail";

function RouteMapPanel({ routeMap, playerFlags }: { routeMap: RouteMap; playerFlags: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const nodes = routeMap.nodes || {};
  const layers = routeMap.layers || [];
  const edges = routeMap.edges || {};
  const currentId = routeMap.current || (layers[0] || [])[0];
  const visited = new Set(routeMap.visited || (currentId ? [currentId] : []));
  const nextCandidates = new Set(edges[currentId] || []);

  if (layers.length === 0) return null;

  const renderNode = (id: string, mode: RouteGraphMode) => {
    const node: RouteNode | undefined = nodes[id];
    if (!node) return null;
    const isCurrent = id === currentId;
    const isNext = nextCandidates.has(id);
    const isVisited = visited.has(id) && !isCurrent;

    const gate = node.gate || [];
    const isLocked = gate.length > 0 && !gate.every((f) => playerFlags.includes(f));

    const cls = [
      "route-node",
      `route-node-${mode}`,
      `route-${node.type}`,
      isCurrent ? "route-current" : "",
      isNext ? "route-next" : "",
      isVisited ? "route-visited" : "",
      node.combat ? "route-combat" : "",
      isLocked ? "route-node-locked" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const reward = rewardSummary(node.reward);
    const perspectives = node.perspectives || [];
    const lensLines = perspectives.map((p) => `· ${p.lens || p.id}`);
    const lockText = isLocked ? `🔒 [잠김 - 플래그 필요: ${gate.join(", ")}]` : "";
    const title = [
      lockText,
      node.title || node.label,
      `유형: ${node.label}`,
      node.risk ? `위험 ${node.risk}` : "",
      reward,
      node.anchor ? "고정 스토리 장면" : "동적 장면",
      perspectives.length > 1 ? `관점 ${perspectives.length} (루트에 따라 갈라짐):` : "",
      ...lensLines,
    ]
      .filter(Boolean)
      .join("\n");
    const label = mode === "detail" ? node.title || node.label : node.label;
    return (
      <div key={id} className={cls} title={title}>
        <span className="route-glyph">{isLocked ? "🔒" : (node.glyph || "?")}</span>
        <span className="route-label">
          {node.anchor && <span className="route-anchor">★</span>}
          {label}
        </span>
        {mode === "detail" && perspectives.length > 1 && (
          <span className="route-lenses">⑂ 관점 {perspectives.length}</span>
        )}
        {mode === "detail" && reward && <span className="route-reward">{reward}</span>}
      </div>
    );
  };

  // Lookahead horizon: dynamic maps only reveal the next HORIZON layers ahead of
  // the current one (the road past that is fog). Static maps show everything.
  const HORIZON = 2;
  const isDynamic = routeMap.mode === "dynamic";
  const currentLayerIdx =
    typeof nodes[currentId]?.layer === "number"
      ? (nodes[currentId]!.layer as number)
      : Math.max(0, layers.findIndex((ids) => ids.includes(currentId)));

  const renderGraph = (mode: RouteGraphMode) => {
    // compact: forward-only window [current .. current+HORIZON].
    // detail: visited history [0 .. current+HORIZON]. Beyond → fog stub.
    const maxVisible = currentLayerIdx + HORIZON;
    const minVisible = mode === "compact" ? currentLayerIdx : 0;
    const hasFog = isDynamic && layers.length - 1 > maxVisible;
    return (
      <div className={`route-graph route-graph-${mode}`}>
        {layers.map((layerIds, idx) => {
          if (isDynamic && (idx < minVisible || idx > maxVisible)) return null;
          return (
            <div key={idx} className="route-layer">
              <div className="route-layer-rail">
                {idx > minVisible && <div className="route-connector" />}
                <div className="route-layer-nodes">
                  {layerIds.map((id) => renderNode(id, mode))}
                </div>
              </div>
            </div>
          );
        })}
        {hasFog && (
          <div className="route-layer route-layer-fog">
            <div className="route-layer-rail">
              <div className="route-connector" />
              <div className="route-fog" title="아직 드러나지 않은 구간 — 선택에 따라 길이 생깁니다">
                ⋯ 미공개 구간
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const legend = (
    <div className="route-legend">
      <div>★ 고정 스토리</div>
      <div>◆ 장면</div>
      <div>❖ 단서</div>
      <div>⚔ 전투</div>
      <div>◎ 순찰</div>
      <div>▣ 시장</div>
      <div>✚ 정비</div>
      <div>✦ 사건</div>
      <div>❒ 대면</div>
      <div>⋯ 미공개 구간</div>
      <p>위에서 아래로 진행합니다. 강조된 노드가 현재 위치, 다음 줄이 이동 후보입니다.</p>
      <p>앞으로 2단계까지만 보이며, 그 너머는 선택에 따라 드러납니다(⋯).</p>
      <p>현재 시점과 향하는 결말은 기억의 별자리에서 확인하세요.</p>
    </div>
  );

  return (
    <div className="panel minimap-panel" id="operation-map">
      <div className="panel-title-row">
        <p className="panel-title">작전 지도</p>
        <button
          type="button"
          className="panel-info-toggle"
          title="작전 지도 확대 + 범례"
          onClick={() => setExpanded(true)}
        >
          ⤢ 확대
        </button>
      </div>
      {/* Minimal by default: graph + a one-line movement cue (choice → move). */}
      {renderGraph("compact")}
      <div className="route-move-cue">
        <span className="route-cue-dot cur" /> 현재 위치
        <span className="route-cue-arrow">→</span>
        선택지를 고르면 <span className="route-cue-dot next" /> 다음 줄로 이동합니다
      </div>

      {expanded && (
        <div className="route-map-modal-backdrop" onClick={() => setExpanded(false)}>
          <div
            className="route-map-modal"
            role="dialog"
            aria-label="작전 지도"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-title-row">
              <p className="panel-title">작전 지도 · 상세</p>
              <button
                type="button"
                className="panel-info-toggle"
                onClick={() => setExpanded(false)}
              >
                닫기 ✕
              </button>
            </div>
            <div className="route-map-modal-graph">{renderGraph("detail")}</div>
            {legend}
          </div>
        </div>
      )}
    </div>
  );
}

function OperationMapPanel({ snapshot }: { snapshot: RuntimeSnapshot | null }) {
  if (!snapshot || !snapshot.state) return null;
  const routeMap = snapshot.state._route_map;
  const playerFlags = snapshot.state.flags || [];
  if (routeMap && (routeMap.layers || []).length > 0) {
    return <RouteMapPanel routeMap={routeMap} playerFlags={playerFlags} />;
  }
  const mapState = snapshot.state._map;
  if (!mapState || !mapState.current) return null;

  const tiles = mapState.tiles || {};
  const curKey = mapState.current;
  const cur = tiles[curKey];
  if (!cur) return null;

  const cx = cur.x;
  const cy = cur.y;
  const radius = 2;

  const byCoord: Record<string, string> = {};
  Object.entries(tiles).forEach(([k, t]) => {
    byCoord[`${t.x},${t.y}`] = k;
  });

  const encounterMap = snapshot.state._encounter_map || {};
  const contacts = encounterMap.contacts || {};
  const liveContacts = Object.values(contacts).filter(
    (c) => c && c.state !== "defeated"
  );

  type ContactInfo = {
    x: number;
    y: number;
    glyph: string;
    name: string;
    state: string;
  };

  const contactsByCoord: Record<string, ContactInfo> = {};
  liveContacts.forEach((c) => {
    contactsByCoord[`${c.x || 0},${c.y || 0}`] = c;
  });

  const rows = [];
  for (let gy = cy + radius; gy >= cy - radius; gy--) {
    const cells = [];
    for (let gx = cx - radius; gx <= cx + radius; gx++) {
      const coordKey = `${gx},${gy}`;
      const contact = contactsByCoord[coordKey];
      const tileKey = byCoord[coordKey];

      if (contact) {
        const glyph = contact.glyph || "!";
        const name = contact.name || "enemy contact";
        cells.push(
          <div key={coordKey} className="mm-cell mm-enemy" title={name}>
            {glyph}
          </div>
        );
      } else if (!tileKey) {
        cells.push(<div key={coordKey} className="mm-cell mm-empty"></div>);
      } else {
        const tile = tiles[tileKey];
        const glyph = TILE_GLYPH[tile.kind || "node"] || "◍";
        const cls = tileKey === curKey ? "mm-cell mm-current" : "mm-cell mm-visited";
        cells.push(
          <div key={coordKey} className={cls} title={tile.name || ""}>
            {glyph}
          </div>
        );
      }
    }
    rows.push(
      <div key={gy} className="mm-row">
        {cells}
      </div>
    );
  }

  const nearestContacts = liveContacts
    .map((contact) => ({
      ...contact,
      distance: contactDistance(contact, cx, cy),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2);

  return (
    <div className="panel minimap-panel" id="operation-map">
      <p className="panel-title">작전 지도</p>
      <div className="minimap">{rows}</div>
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
        현재 위치: {cur.name || "미확인 지점"} ({cx}, {cy})
      </div>
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "6px" }}>
        ◆ 나 · ◍ 경유지 · ◈ 검문 · ❖ 단서 · 적색 표식은 접근 중인 접촉
      </div>
      {nearestContacts.length > 0 && (
        <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "6px" }}>
          접근 접촉:{" "}
          {nearestContacts.map((contact) => (
            `${contact.glyph || "!"} ${contact.name || "미확인"} ${contact.distance}칸`
          )).join(" · ")}
        </div>
      )}
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "6px" }}>
        탐사 {Object.keys(tiles).length}곳 · 접촉 {liveContacts.length} · 지점 유형 {TILE_LABEL[cur.kind || "node"] || cur.kind || "경유지"}
      </div>
    </div>
  );
}

function StatusPanel({ snapshot }: { snapshot: RuntimeSnapshot | null }) {
  const gaugesConfig = snapshot ? buildGaugeConfig(snapshot) : null;
  const [showHints, setShowHints] = useState(false);

  return (
    <div className={`panel status-panel ${showHints ? "hints-on" : ""}`}>
      <div className="panel-title-row">
        <p className="panel-title">상태</p>
        <button
          type="button"
          className="panel-info-toggle"
          aria-pressed={showHints}
          title={showHints ? "설명 숨기기" : "각 수치 설명 보기"}
          onClick={() => setShowHints((v) => !v)}
        >
          {showHints ? "설명 숨기기" : "ⓘ 설명"}
        </button>
      </div>
      {snapshot && gaugesConfig && (
        <>
          <div className="hud-meta">
            루프 <b>{snapshot.loop_id || "—"}</b> · 국면{" "}
            <b>{snapshot.phase || "—"}</b> · 위치{" "}
            <b>{snapshot.location || "—"}</b>
          </div>

          <GaugeBar
            label="STABILITY"
            value={gaugesConfig.stability}
            percent={gaugesConfig.stability}
            color={gaugesConfig.stabColor}
            hint="은신처와 루프 안정도. 낮을수록 붕괴/강제 종료 위험이 커집니다."
          />
          <GaugeBar
            label="TENSION"
            value={gaugesConfig.tension}
            percent={gaugesConfig.tension}
            color={gaugesConfig.tensColor}
            hint="관리망 추적도. 높을수록 순찰, 봉쇄, 강제 전투가 붙습니다."
          />
          <GaugeBar
            label="TEMPORAL DECAY"
            value={gaugesConfig.decay_percent}
            percent={gaugesConfig.decay_percent}
            color={gaugesConfig.decayColor}
            hint="이번 루프가 얼마나 진행됐는지 나타내는 시간 압력입니다."
          />
          <GaugeBar
            label="ZONE RISK"
            value={gaugesConfig.riskVal}
            percent={gaugesConfig.riskPercent}
            color={gaugesConfig.riskColor}
            hint="현재 구역 위험도. 이동과 조우 판정의 체감 난이도입니다."
          />
          <GaugeBar
            label="CLUE MATRIX"
            value={`${gaugesConfig.clueCount} / 16`}
            percent={gaugesConfig.cluePercent}
            color="var(--term)"
            hint="확보한 핵심 단서 수. Codex, 엔딩, 다음 루프 선택지를 여는 장기 진행도입니다."
          />
        </>
      )}
    </div>
  );
}

function GaugeBar({
  label,
  value,
  percent,
  color,
  hint,
}: {
  label: string;
  value: number | string;
  percent: number;
  color: string;
  hint?: string;
}) {
  return (
    <div className="gauge">
      <div className="gauge-head">
        <span className="k">{label}</span>
        <span className="v">{value}</span>
      </div>
      <div className="gauge-bar">
        <div
          className="gauge-fill"
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            background: color,
          }}
        ></div>
      </div>
      {hint && <div className="gauge-hint">{hint}</div>}
    </div>
  );
}

function LogPanel({ consoleLogs }: { consoleLogs: string }) {
  return (
    <details className="panel" id="log-panel">
      <summary
        className="panel-title"
        style={{ cursor: "pointer", listStyle: "none" }}
      >
        개발 로그 ▾
      </summary>
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)", marginBottom: "8px" }}>
        플레이 판단용이 아니라 API, BGM, WebSocket 상태 확인용입니다.
      </div>
      <div
        id="log"
        style={{
          maxHeight: "180px",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {consoleLogs}
      </div>
    </details>
  );
}

export function GameAside({
  saveLabelInput,
  saveSlots,
  isBusy,
  canSave,
  playerId,
  scenarioId,
  finalizedSnapshot,
  consoleLogs,
  onSaveLabelChange,
  onSave,
  onLoad,
}: GameAsideProps) {
  return (
    <aside>
      <SaveHistoryPanel
        saveLabelInput={saveLabelInput}
        saveSlots={saveSlots}
        isBusy={isBusy}
        canSave={canSave}
        playerId={playerId}
        scenarioId={scenarioId}
        onSaveLabelChange={onSaveLabelChange}
        onSave={onSave}
        onLoad={onLoad}
      />
      <OperationMapPanel snapshot={finalizedSnapshot} />
      <StatusPanel snapshot={finalizedSnapshot} />
      <LogPanel consoleLogs={consoleLogs} />
    </aside>
  );
}
