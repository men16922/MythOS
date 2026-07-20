import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { buildGaugeConfig } from "./gauges";
import { GameIcon, type GameIconName } from "./icons";
import { Popover } from "./Popover";
import { SaveHistoryPanel } from "./SaveHistoryPanel";
import { Surface } from "./Surface";
import { useConciseMode } from "./conciseMode";
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
  onOpenCodex?: () => void;
}

/** Route-map node type → icon (mirrors scenario.json node_types glyphs). */
const NODE_TYPE_ICON: Record<string, GameIconName> = {
  story: "diamond",
  clue: "magnifier",
  combat: "swords",
  patrol: "rings",
  market: "bag",
  rest: "cross",
  event: "spark",
  boss: "skull",
};

const TILE_ICON: Record<string, GameIconName> = {
  node: "nodeDot",
  checkpoint: "checkpoint",
  clue: "magnifier",
  player: "diamond",
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

// M3 (mobile clarity): several GameAside info sites (route node, fog stub,
// minimap cells) were plain divs with a hover-only `title=`, invisible on
// touch since they have no click handler at all. DS1b: now a thin wrapper
// over the shared Popover (top-center anchor, block element).
function InfoPopover({
  className,
  tooltip,
  ariaLabel,
  children,
}: {
  className: string;
  tooltip: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover as="div" className={`${className} aside-info-hint`} anchor="top-center" tooltip={tooltip} ariaLabel={ariaLabel}>
      {children}
    </Popover>
  );
}

type RouteGraphMode = "compact" | "detail";

function RouteMapPanel({
  routeMap,
  playerFlags,
  onOpenCodex,
}: {
  routeMap: RouteMap;
  playerFlags: string[];
  onOpenCodex?: () => void;
}) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  // Drag-to-pan the expanded map (owner 2026-07-11): grab empty space and drag to
  // move a large map, esp. on touch. No pointer capture / preventDefault so a plain
  // tap on a node still fires its tooltip; only a button-held move scrolls.
  const panRef = useRef<HTMLDivElement>(null);
  const panStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const onPanPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = panRef.current;
    if (!el) return;
    panStart.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.classList.add("is-panning");
  };
  const onPanPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = panRef.current;
    if (!el || !panStart.current) return;
    el.scrollLeft = panStart.current.left - (e.clientX - panStart.current.x);
    el.scrollTop = panStart.current.top - (e.clientY - panStart.current.y);
  };
  const endPan = () => {
    panStart.current = null;
    panRef.current?.classList.remove("is-panning");
  };
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
      <InfoPopover key={id} className={cls} tooltip={title} ariaLabel={label}>
        {choiceLinkIndex >= 0 && <span className="route-link-marker">{choiceLinkIndex + 1}</span>}
        <span className="route-glyph">
          {isLocked ? (
            "🔒"
          ) : NODE_TYPE_ICON[node.type] ? (
            <GameIcon name={NODE_TYPE_ICON[node.type]} />
          ) : (
            node.glyph || "?"
          )}
        </span>
        <span className="route-label">
          {node.anchor && (
            <span className="route-anchor">
              <GameIcon name="star" />
            </span>
          )}
          {label}
        </span>
        {mode === "detail" && perspectives.length > 1 && (
          <span className="route-lenses">⑂ {t("aside.route.perspectives")} {perspectives.length}</span>
        )}
        {mode === "detail" && reward && <span className="route-reward">{reward}</span>}
      </InfoPopover>
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
              <InfoPopover className="route-fog" tooltip={t("aside.route.fogTitle")}>
                {t("aside.route.fog")}
              </InfoPopover>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Legend entries as chips: the symbol carries the accent color (combat keeps
  // the map's red) so the row reads at a glance (owner 2026-07-11: too dim).
  const legendEntries: Array<{ key: string; icon: GameIconName; label: string }> = [
    { key: "fixed", icon: "star", label: t("aside.route.legend.fixed") },
    { key: "scene", icon: "diamond", label: t("aside.route.legend.scene") },
    { key: "clue", icon: "magnifier", label: t("aside.route.legend.clue") },
    { key: "combat", icon: "swords", label: t("aside.route.legend.combat") },
    { key: "patrol", icon: "rings", label: t("aside.route.legend.patrol") },
    { key: "market", icon: "bag", label: t("aside.route.legend.market") },
    { key: "maintenance", icon: "cross", label: t("aside.route.legend.maintenance") },
    { key: "event", icon: "spark", label: t("aside.route.legend.event") },
    { key: "confront", icon: "skull", label: t("aside.route.legend.confront") },
  ];
  const legend = (
    <div className="route-legend">
      {legendEntries.map((e) => (
        <div key={e.key} className={`route-legend-item route-legend-${e.key}`}>
          <span className="route-legend-sym">
            <GameIcon name={e.icon} />
          </span>
          <span className="route-legend-label">{e.label}</span>
        </div>
      ))}
      <div className="route-legend-item route-legend-fog">
        <span className="route-legend-label">{t("aside.route.fog")}</span>
      </div>
      <p>{t("aside.route.legend.help1")}</p>
      <p>{t("aside.route.legend.help2")}</p>
      <p>{t("aside.route.legend.help3")}</p>
      {onOpenCodex && (
        <button
          type="button"
          className="codex-term-link"
          onClick={() => {
            setExpanded(false);
            onOpenCodex();
          }}
        >
          {t("tab.codex")}
        </button>
      )}
    </div>
  );

  return (
    <Surface variant="surface" className="minimap-panel" id="operation-map">
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
            <div
              className="route-map-modal-graph"
              ref={panRef}
              onPointerDown={onPanPointerDown}
              onPointerMove={onPanPointerMove}
              onPointerUp={endPan}
              onPointerLeave={endPan}
              onPointerCancel={endPan}
            >
              {renderGraph("detail")}
            </div>
            {legend}
          </div>
        </div>
      )}
    </Surface>
  );
}

// LC2: also reused by StoryPanel's combat-bottom-row in landscape+coarse-pointer
// combat, where it's folded into the right column instead of the separate
// aside (bin/docs/plans/2026-07-08-design-system.md "Landscape Combat").
export function OperationMapPanel({
  snapshot,
  onOpenCodex,
}: {
  snapshot: RuntimeSnapshot | null;
  onOpenCodex?: () => void;
}) {
  const { t } = useLang();
  if (!snapshot || !snapshot.state) return null;
  const routeMap = snapshot.state._route_map;
  const playerFlags = snapshot.state.flags || [];
  if (routeMap && (routeMap.layers || []).length > 0) {
    return <RouteMapPanel routeMap={routeMap} playerFlags={playerFlags} onOpenCodex={onOpenCodex} />;
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
          <InfoPopover key={coordKey} className="mm-cell mm-enemy" tooltip={name}>
            {glyph}
          </InfoPopover>
        );
      } else if (!tileKey) {
        cells.push(<div key={coordKey} className="mm-cell mm-empty"></div>);
      } else {
        const tile = tiles[tileKey];
        const tileIcon = <GameIcon name={TILE_ICON[tile.kind || "node"] || "nodeDot"} />;
        const cls = tileKey === curKey ? "mm-cell mm-current" : "mm-cell mm-visited";
        const tileName = tile.name || "";
        cells.push(
          tileName ? (
            <InfoPopover key={coordKey} className={cls} tooltip={tileName}>
              {tileIcon}
            </InfoPopover>
          ) : (
            <div key={coordKey} className={cls}>
              {tileIcon}
            </div>
          )
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
    <Surface variant="surface" className="minimap-panel" id="operation-map">
      <p className="panel-title">{t("aside.route.title")}</p>
      <div className="minimap">{rows}</div>
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
        {t("aside.route.curPosition")}: {cur.name || t("amap.unknownSpot")} ({cx}, {cy})
      </div>
      <div className="sub amap-legend" style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "6px" }}>
        {(["player", "node", "checkpoint", "clue"] as const).map((kind) => (
          <span key={kind} className="amap-legend-item">
            <GameIcon name={TILE_ICON[kind]} /> {t(TILE_LABEL_KEYS[kind])}
          </span>
        ))}
        <span className="amap-legend-item">{t("amap.legend.contacts")}</span>
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
    </Surface>
  );
}

export function StatusPanel({ snapshot }: { snapshot: RuntimeSnapshot | null }) {
  const { t } = useLang();
  const gaugesConfig = snapshot ? buildGaugeConfig(snapshot) : null;
  const [showHints, setShowHints] = useState(false);

  return (
    // DS2-a sample migration (bin/docs/plans/2026-07-08-ds2-sample-migration.md §5):
    // the base `.panel` container styling now comes from <Surface variant="surface">
    // (bg/border/radius/16px pad/glow); `.status-panel` stays as a passthrough for
    // its two behavior-only rules (gauge-hint show/hide, hints-on margin). Pixel-
    // identical to the pre-DS2 `.panel` look given the DS2-api defaults.
    <Surface variant="surface" className={`status-panel ${showHints ? "hints-on" : ""}`}>
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
            {/* The raw loop UUID + English phase enum are dev/tester context; on a
               phone they read as noise (real-device feedback 2026-07-10 "UI 난해").
               Hidden on coarse pointer, kept on desktop. Location stays for players. */}
            <span className="hud-meta-dev">
              {t("aside.status.loop")} <b>{snapshot.loop_id || "—"}</b> · {t("aside.status.phase")}{" "}
              <b>{snapshot.phase || "—"}</b> ·{" "}
            </span>
            {t("aside.status.location")} <b>{snapshot.location || "—"}</b>
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
    </Surface>
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

// T6b (mobile density): in concise mode, secondary aside panels (Save/Map)
// start collapsed as a one-line summary chip (native <details>/<summary>,
// same tap-to-expand shape LogPanel already used) instead of full-height
// cards. Non-concise mode renders children unwrapped, unchanged from before.
function AsideChip({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Surface as="details" variant="surface" className="aside-chip">
      <summary className="panel-title aside-chip-summary">{title}</summary>
      <div className="aside-chip-body">{children}</div>
    </Surface>
  );
}

function LogPanel({ consoleLogs }: { consoleLogs: string }) {
  const { t } = useLang();
  return (
    <Surface as="details" variant="surface" id="log-panel">
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
    </Surface>
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
  onOpenCodex,
}: GameAsideProps) {
  const { t } = useLang();
  const { conciseMode } = useConciseMode();
  // Combat folds this page-level aside away on EVERY form factor (owner
  // 2026-07-13: no Save/Map/Status menus during combat — the freed right column
  // hosts the roster + command console instead, see the desktop combat split in
  // index.css). Landscape+coarse already relied on this (LC4); StoryPanel folds
  // the Operation Map back in as a combat-bottom-row chip there.
  const combatActive = Boolean(finalizedSnapshot?.combat && !finalizedSnapshot.combat.finished);
  if (combatActive) {
    return null;
  }
  if (minimal) {
    return (
      <aside>
        <StatusPanel snapshot={finalizedSnapshot} />
      </aside>
    );
  }
  const saveHistory = (
    <SaveHistoryPanel
      isBusy={isBusy}
      canSave={canSave}
      onOpenSave={onOpenSave}
      onOpenLoad={onOpenLoad}
    />
  );
  const operationMap = <OperationMapPanel snapshot={finalizedSnapshot} onOpenCodex={onOpenCodex} />;
  return (
    <aside>
      {conciseMode ? (
        <AsideChip title={t("save.title")}>{saveHistory}</AsideChip>
      ) : (
        saveHistory
      )}
      <div className={revealNudge ? "aside-reveal-nudge" : undefined}>
        {conciseMode ? (
          <AsideChip title={t("aside.route.title")}>{operationMap}</AsideChip>
        ) : (
          operationMap
        )}
      </div>
      {conciseMode ? (
        <AsideChip title={t("aside.status.title")}>
          <StatusPanel snapshot={finalizedSnapshot} />
        </AsideChip>
      ) : (
        <StatusPanel snapshot={finalizedSnapshot} />
      )}
      <LogPanel consoleLogs={consoleLogs} />
    </aside>
  );
}
