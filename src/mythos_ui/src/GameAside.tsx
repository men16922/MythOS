import { buildGaugeConfig } from "./gauges";
import { SaveHistoryPanel } from "./SaveHistoryPanel";
import type { RunSummary, RuntimeSnapshot, SaveSlot } from "./types";

interface GameAsideProps {
  saveLabelInput: string;
  saveSlots: SaveSlot[];
  runsHistory: RunSummary[];
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

function OperationMapPanel({ snapshot }: { snapshot: RuntimeSnapshot | null }) {
  if (!snapshot || !snapshot.state) return null;
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

  return (
    <div className="panel minimap-panel" id="operation-map">
      <p className="panel-title">작전 지도</p>
      <div className="minimap">{rows}</div>
      <div className="sub" style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
        좌표 {cx}, {cy} · 탐사 {Object.keys(tiles).length}곳 · 접촉 {liveContacts.length} · {cur.name || ""}
      </div>
    </div>
  );
}

function StatusPanel({ snapshot }: { snapshot: RuntimeSnapshot | null }) {
  const gaugesConfig = snapshot ? buildGaugeConfig(snapshot) : null;

  return (
    <div className="panel">
      <p className="panel-title">상태</p>
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
          />
          <GaugeBar
            label="TENSION"
            value={gaugesConfig.tension}
            percent={gaugesConfig.tension}
            color={gaugesConfig.tensColor}
          />
          <GaugeBar
            label="TEMPORAL DECAY"
            value={gaugesConfig.decay_percent}
            percent={gaugesConfig.decay_percent}
            color={gaugesConfig.decayColor}
          />
          <GaugeBar
            label="ZONE RISK"
            value={gaugesConfig.riskVal}
            percent={gaugesConfig.riskPercent}
            color={gaugesConfig.riskColor}
          />
          <GaugeBar
            label="CLUE MATRIX"
            value={`${gaugesConfig.clueCount} / 16`}
            percent={gaugesConfig.cluePercent}
            color="var(--term)"
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
}: {
  label: string;
  value: number | string;
  percent: number;
  color: string;
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
        로그 ▾
      </summary>
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
  runsHistory,
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
        runsHistory={runsHistory}
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
