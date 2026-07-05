import { useState } from "react";
import { buildGaugeConfig } from "./gauges";
import { SaveHistoryPanel } from "./SaveHistoryPanel";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";
import type {
  RouteMap,
  RouteNode,
  RuntimeSnapshot,
} from "./types";

type TFn = (key: StringKey) => string;

interface GameAsideProps {
  isBusy: boolean;
  canSave: boolean;
  finalizedSnapshot: RuntimeSnapshot | null;
  consoleLogs: string;
  // A3 progressive disclosure: first-loop opening turns render gauges only;
  // revealNudge pulses the operation map once when the full aside appears.
  minimal?: boolean;
  revealNudge?: boolean;
  onOpenSave: () => void;
  onOpenLoad: () => void;
}

const TILE_GLYPH: Record<string, string> = {
  node: "◍",
  checkpoint: "◈",
  clue: "❖",
  player: "◆",
};

const TILE_LABEL_KEYS: Record<string, StringKey> = {
  node: "amap.tile.node",
  checkpoint: "amap.tile.checkpoint",
  clue: "amap.tile.clue",
  player: "amap.tile.player",
};

function contactDistance(contact: { x?: number; y?: number }, cx: number, cy: number): number {
  return Math.max(Math.abs(Number(contact.x || 0) - cx), Math.abs(Number(contact.y || 0) - cy));
}

function rewardSummary(reward: Record<string, number> | undefined, t: TFn): string {
  if (!reward) return "";
  const parts: string[] = [];
  if (reward.insight) parts.push(`${t("aside.reward.insight")} +${reward.insight}`);
  if (reward.stability) parts.push(`${t("aside.reward.stability")} +${reward.stability}`);
  if (reward.tension) parts.push(`${t("aside.reward.tension")} +${reward.tension}`);
  return parts.join(" · ");
}

type RouteGraphMode = "compact" | "detail";

function RouteMapPanel({ routeMap, playerFlags }: { routeMap: RouteMap; playerFlags: string[] }) {
  const { t } = useLang();
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
    const choiceLinkIndex = isNext ? (edges[currentId] || []).indexOf(id) : -1;

    const gate = node.gate || [];
    const isLocked = gate.length > 0 && !gate.every((f) => playerFlags.includes(f));

    const cls = [
      "route-node",
      `route-node-${mode}`,
      `route-${node.type}`,
      isCurrent ? "route-current" : "",
      isNext ? "route-next" : "",
      choiceLinkIndex >= 0 ? `route-choice-link route-choice-link-${choiceLinkIndex % 4}` : "",
      isVisited ? "route-visited" : "",
      node.combat ? "route-combat" : "",
      isLocked ? "route-node-locked" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const reward = rewardSummary(node.reward, t);
    const perspectives = node.perspectives || [];
    const lensLines = perspectives.map((p) => `· ${p.lens || p.id}`);
    const lockText = isLocked ? `🔒 [${t("aside.route.lockedFlags")}: ${gate.join(", ")}]` : "";
    const title = [
      lockText,
      node.title || node.label,
      `${t("aside.route.type")}: ${node.label}`,
      node.risk ? `${t("aside.route.risk")} ${node.risk}` : "",
      reward,
      node.anchor ? t("aside.route.fixedScene") : t("aside.route.dynamicScene"),
      perspectives.length > 1
        ? `${t("aside.route.perspectives")} ${perspectives.length} (${t("aside.route.splitByRoute")}):`
        : "",
      ...lensLines,
    ]
      .filter(Boolean)
      .join("\n");
    const label = mode === "detail" ? node.title || node.label : node.label;
    return (
      <div key={id} className={cls} title={title}>
        {choiceLinkIndex >= 0 && <span className="route-link-marker">{choiceLinkIndex + 1}</span>}
        <span className="route-glyph">{isLocked ? "🔒" : (node.glyph || "?")}</span>
        <span className="route-label">
          {node.anchor && <span className="route-anchor">★</span>}
          {label}
        </span>
        {mode === "detail" && perspectives.length > 1 && (
          <span className="route-lenses">⑂ {t("aside.route.perspectives")} {perspectives.length}</span>
        )}
        {mode === "detail" && reward && <span className="route-reward">{reward}</span>}
      </div>
    );
  };

  // Lookahead horizon: dynamic maps only reveal the next HORIZON layers ahead of
  // the current one (the road past that is fog). Static maps show everything.
  const HORIZON = 2;
  const isDynamic = routeMap.mode === "dynamic";
  // The window must use the node's position IN THE RENDERED ARRAY, not the
  // node.layer field: dynamic growth (extend_route) can leave the field and the
  // array index disagreeing for grown/side nodes, which shifted the compact
  // window off the expanded view (live 2026-07-04: mini map ≠ expand map).
  const arrayIdx = layers.findIndex((ids) => ids.includes(currentId));
  const currentLayerIdx =
    arrayIdx >= 0
      ? arrayIdx
      : typeof nodes[currentId]?.layer === "number"
        ? (nodes[currentId]!.layer as number)
        : 0;

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
              <div className="route-fog" title={t("aside.route.fogTitle")}>
                {t("aside.route.fog")}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const legend = (
    <div className="route-legend">
      <div>★ {t("aside.route.legend.fixed")}</div>
      <div>◆ {t("aside.route.legend.scene")}</div>
      <div>❖ {t("aside.route.legend.clue")}</div>
      <div>⚔ {t("aside.route.legend.combat")}</div>
      <div>◎ {t("aside.route.legend.patrol")}</div>
      <div>▣ {t("aside.route.legend.market")}</div>
      <div>✚ {t("aside.route.legend.maintenance")}</div>
      <div>✦ {t("aside.route.legend.event")}</div>
      <div>❒ {t("aside.route.legend.confront")}</div>
      <div>{t("aside.route.fog")}</div>
      <p>{t("aside.route.legend.help1")}</p>
      <p>{t("aside.route.legend.help2")}</p>
      <p>{t("aside.route.legend.help3")}</p>
    </div>
  );

  return (
    <div className="panel minimap-panel" id="operation-map">
      <div className="panel-title-row">
        <p className="panel-title">{t("aside.route.title")}</p>
        <button
          type="button"
          className="panel-info-toggle"
          title={t("aside.route.expandTitle")}
          onClick={() => setExpanded(true)}
        >
          {t("aside.route.expand")}
        </button>
      </div>
      {/* Minimal by default: graph + a one-line movement cue (choice → move). */}
      {renderGraph("compact")}
      <div className="route-move-cue">
        <span className="route-cue-dot cur" /> {t("aside.route.curPosition")}
        <span className="route-cue-arrow">→</span>
        {t("aside.route.cuePick")} <span className="route-cue-dot next" /> {t("aside.route.cueMove")}
      </div>

      {expanded && (
        <div className="route-map-modal-backdrop" onClick={() => setExpanded(false)}>
          <div
            className="route-map-modal"
            role="dialog"
            aria-label={t("aside.route.title")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-title-row">
              <p className="panel-title">{t("aside.route.detailTitle")}</p>
              <button
                type="button"
                className="panel-info-toggle"
                onClick={() => setExpanded(false)}
              >
                {t("aside.route.close")}
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
  const { t } = useLang();
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
      <p className="panel-title">{t("aside.route.title")}</p>
      <div className="minimap">{rows}</div>
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
        {t("aside.route.curPosition")}: {cur.name || t("amap.unknownSpot")} ({cx}, {cy})
      </div>
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "6px" }}>
        {t("amap.legend")}
      </div>
      {nearestContacts.length > 0 && (
        <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "6px" }}>
          {t("amap.approaching")}:{" "}
          {nearestContacts.map((contact) => (
            `${contact.glyph || "!"} ${contact.name || t("amap.unknown")} ${contact.distance}${t("amap.tiles")}`
          )).join(" · ")}
        </div>
      )}
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "6px" }}>
        {t("amap.explored")} {Object.keys(tiles).length}{t("amap.places")} · {t("amap.contacts")} {liveContacts.length} · {t("amap.spotType")} {TILE_LABEL_KEYS[cur.kind || "node"] ? t(TILE_LABEL_KEYS[cur.kind || "node"]) : (cur.kind || t("amap.tile.node"))}
      </div>
    </div>
  );
}

function StatusPanel({ snapshot }: { snapshot: RuntimeSnapshot | null }) {
  const { t } = useLang();
  const gaugesConfig = snapshot ? buildGaugeConfig(snapshot) : null;
  const [showHints, setShowHints] = useState(false);

  return (
    <div className={`panel status-panel ${showHints ? "hints-on" : ""}`}>
      <div className="panel-title-row">
        <p className="panel-title">{t("aside.status.title")}</p>
        <button
          type="button"
          className="panel-info-toggle"
          aria-pressed={showHints}
          title={showHints ? t("aside.status.hideHints") : t("aside.status.showHintsTitle")}
          onClick={() => setShowHints((v) => !v)}
        >
          {showHints ? t("aside.status.hideHints") : t("aside.status.showHints")}
        </button>
      </div>
      {snapshot && gaugesConfig && (
        <>
          <div className="hud-meta">
            {t("aside.status.loop")} <b>{snapshot.loop_id || "—"}</b> · {t("aside.status.phase")}{" "}
            <b>{snapshot.phase || "—"}</b> · {t("aside.status.location")}{" "}
            <b>{snapshot.location || "—"}</b>
          </div>

          {snapshot.state?._loop_modifier?.name && (
            <div className="loop-modifier-banner" id="loop-modifier-banner">
              <span className="lm-label">{t("aside.modifier.label")}</span>
              <b className="lm-name">{snapshot.state._loop_modifier.name}</b>
              {snapshot.state._loop_modifier.desc && (
                <span className="lm-desc">{snapshot.state._loop_modifier.desc}</span>
              )}
            </div>
          )}

          <GaugeBar
            label="STABILITY"
            value={gaugesConfig.stability}
            percent={gaugesConfig.stability}
            color={gaugesConfig.stabColor}
            hint={t("aside.gauge.stability")}
          />
          <GaugeBar
            label="TENSION"
            value={gaugesConfig.tension}
            percent={gaugesConfig.tension}
            color={gaugesConfig.tensColor}
            hint={t("aside.gauge.tension")}
          />
          <GaugeBar
            label="TEMPORAL DECAY"
            value={gaugesConfig.decay_percent}
            percent={gaugesConfig.decay_percent}
            color={gaugesConfig.decayColor}
            hint={t("aside.gauge.decay")}
          />
          <GaugeBar
            label="ZONE RISK"
            value={gaugesConfig.riskVal}
            percent={gaugesConfig.riskPercent}
            color={gaugesConfig.riskColor}
            hint={t("aside.gauge.risk")}
          />
          <GaugeBar
            label="CLUE MATRIX"
            value={`${gaugesConfig.clueCount} / 16`}
            percent={gaugesConfig.cluePercent}
            color="var(--term)"
            hint={t("aside.gauge.clue")}
          />
        </>
      )}
    </div>
  );
}

export function GaugeBar({
  label,
  value,
  percent,
  color,
  hint,
  avatarUrl,
}: {
  label: string;
  value: number | string;
  percent: number;
  color: string;
  hint?: string;
  avatarUrl?: string;
}) {
  return (
    <div className="gauge">
      <div className="gauge-head">
        <span className="k" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={label}
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid var(--line-soft)",
              }}
            />
          )}
          {label}
        </span>
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
  const { t } = useLang();
  return (
    <details className="panel" id="log-panel">
      <summary
        className="panel-title"
        style={{ cursor: "pointer", listStyle: "none" }}
      >
        {t("aside.log.title")}
      </summary>
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)", marginBottom: "8px" }}>
        {t("aside.log.desc")}
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
  isBusy,
  canSave,
  finalizedSnapshot,
  consoleLogs,
  minimal,
  revealNudge,
  onOpenSave,
  onOpenLoad,
}: GameAsideProps) {
  if (minimal) {
    return (
      <aside>
        <StatusPanel snapshot={finalizedSnapshot} />
      </aside>
    );
  }
  return (
    <aside>
      <SaveHistoryPanel
        isBusy={isBusy}
        canSave={canSave}
        onOpenSave={onOpenSave}
        onOpenLoad={onOpenLoad}
      />
      <div className={revealNudge ? "aside-reveal-nudge" : undefined}>
        <OperationMapPanel snapshot={finalizedSnapshot} />
      </div>
      <StatusPanel snapshot={finalizedSnapshot} />
      <LogPanel consoleLogs={consoleLogs} />
    </aside>
  );
}
