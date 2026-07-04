import { useState, type CSSProperties } from "react";

import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";
import type { RuntimeSnapshot } from "./types";
import type { DevConsoleData } from "./viewModels";

interface DevConsolePanelProps {
  data: DevConsoleData;
  snapshot: RuntimeSnapshot | null;
}

const scoreColors = ["#4ade80", "#60a5fa", "#f472b6", "#fbbf24"];
const activeEndingStyle: CSSProperties = {
  color: "#4ade80",
  fontWeight: "bold",
};
const inactiveEndingStyle: CSSProperties = { color: "#6b7280" };

const devPanelStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: 0,
};

const devStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  width: "100%",
};

// Local infrastructure console links (Streamlit Developer sidebar parity).
const INFRA_LINKS: { label: string; port: number; descKey: StringKey }[] = [
  { label: "Adminer", port: 8080, descKey: "dev.infra.adminer" },
  { label: "MinIO", port: 9001, descKey: "dev.infra.minio" },
  { label: "Redis", port: 8081, descKey: "dev.infra.redis" },
  { label: "Jaeger", port: 16686, descKey: "dev.infra.jaeger" },
];

function InfraLinks() {
  const { t } = useLang();
  const host = window.location.hostname || "localhost";
  const dashboardUrl = `/admin/dashboard?invite=${new URLSearchParams(window.location.search).get("invite") || localStorage.getItem("mythos_invite_key") || ""}`;
  return (
    <div className="panel" style={{ ...devPanelStyle, marginTop: 0 }}>
      <div className="cc-label" style={{ marginBottom: "12px", borderBottom: "1px solid var(--line-soft)", paddingBottom: "6px" }}>
        {t("dev.infra.title")}
      </div>
      <div
        className="infra-links"
        style={devStackStyle}
      >
        {/* Tester Dashboard — standalone admin page */}
        <a
          className="infra-link"
          style={{ width: "100%" }}
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="infra-link-name">Tester Dashboard ▸</span>
          <span className="infra-link-url">/admin/dashboard</span>
          <span className="infra-link-desc">Per-key player status & activity</span>
        </a>
        {INFRA_LINKS.map((l) => (
          <a
            key={l.label}
            className="infra-link"
            style={{ width: "100%" }}
            href={`http://${host}:${l.port}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="infra-link-name">{l.label} ▸</span>
            <span className="infra-link-url">{`${host}:${l.port}`}</span>
            <span className="infra-link-desc">{t(l.descKey)}</span>
          </a>
        ))}
      </div>
      <div className="infra-hint" style={{ marginTop: "12px", fontSize: "11px", color: "var(--ink-dim)" }}>
        {t("dev.infra.hint")}
      </div>
    </div>
  );
}

export function DevConsolePanel({ data, snapshot }: DevConsolePanelProps) {
  const { t } = useLang();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      <div
        id="dev-tab-content"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
          alignItems: "start",
          width: "100%",
        }}
      >
        {/* Left Column Stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
          {/* Card 1: 로컬 인프라 */}
          <InfraLinks />
          
          {/* Card 3: AI GM 품질 지표 */}
          <NarrativeMetricsPanel data={data} />
        </div>

        {/* Right Column Stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
          {/* Card 2: 인과율 메트릭 */}
          <div className="panel" style={{ ...devPanelStyle, marginTop: 0 }}>
            <div className="cc-label" style={{ marginBottom: "12px", borderBottom: "1px solid var(--line-soft)", paddingBottom: "6px" }}>
              {t("dev.causalityMetrics")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {Object.entries(data.scores).map(([key, value], idx) => {
                const color = scoreColors[idx % scoreColors.length];
                return (
                  <div
                    key={key}
                    style={{
                      background: "rgba(0, 20, 17, 0.4)",
                      border: `1px solid ${color}33`,
                      borderRadius: "6px",
                      padding: "10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        color,
                        fontWeight: "bold",
                        fontSize: "11px",
                        textTransform: "uppercase",
                      }}
                    >
                      {key}
                    </span>
                    <span
                      style={{
                        fontSize: "24px",
                        fontFamily: "var(--mono)",
                        color: "#d6fff6",
                        lineHeight: 1,
                      }}
                    >
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 4: 분기 및 엔딩 도달 가능성 */}
          <div className="panel" style={{ ...devPanelStyle, marginTop: 0 }}>
            <div className="cc-label" style={{ marginBottom: "12px", borderBottom: "1px solid var(--line-soft)", paddingBottom: "6px" }}>
              {t("dev.causalityEndings")}
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Active Flags */}
              <div>
                <div style={{ color: "var(--term-dim)", fontSize: "11px", textTransform: "uppercase", marginBottom: "6px", fontWeight: "bold" }}>
                  Active Flags & Butterfly Effects
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    maxHeight: "100px",
                    overflowY: "auto",
                    padding: "8px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "4px",
                    border: "1px solid var(--line-soft)",
                  }}
                >
                  {data.flags.length > 0 ? (
                    data.flags.map((flag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "11px",
                          background: "rgba(96, 165, 250, 0.15)",
                          border: "1px solid rgba(96, 165, 250, 0.3)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          color: "#60a5fa",
                          fontFamily: "var(--mono)",
                        }}
                      >
                        {flag}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "var(--ink-dim)", fontSize: "11px" }}>
                      {t("dev.noFlags")}
                    </span>
                  )}
                </div>
              </div>

              {/* Scenario Endings */}
              <div>
                <div style={{ color: "var(--term-dim)", fontSize: "11px", textTransform: "uppercase", marginBottom: "6px", fontWeight: "bold" }}>
                  Scenario Endings
                </div>
                <div
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    padding: "8px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "4px",
                    border: "1px solid var(--line-soft)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {data.endings.length > 0 ? (
                    data.endings.map((ending) => {
                      const isActive = data.activeEndingId === ending.id;
                      return (
                        <div
                          key={ending.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            paddingBottom: "6px",
                          }}
                        >
                          <span
                            style={
                              isActive ? activeEndingStyle : inactiveEndingStyle
                            }
                          >
                            • {ending.title} ({ending.id})
                            {isActive ? " [Active]" : ""}
                          </span>
                          <br />
                          <code
                            style={{
                              fontSize: "10px",
                              color: "var(--ink-dim)",
                              marginLeft: "12px",
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            Condition: {ending.condition}
                          </code>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: "var(--ink-dim)", fontSize: "11px" }}>
                      {t("dev.noEndings")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: 원시 게임상태 스냅샷 (전체 너비 차지 & 탭 기반 구조화) */}
        <SnapshotPanel snapshot={snapshot} />
      </div>
    </div>
  );
}

function NarrativeMetricsPanel({ data }: { data: DevConsoleData }) {
  const { t } = useLang();
  const metrics = data.narrativeMetrics;

  return (
    <div className="panel" style={{ ...devPanelStyle, marginTop: 0 }}>
      <div className="cc-label" style={{ marginBottom: "12px", borderBottom: "1px solid var(--line-soft)", paddingBottom: "6px" }}>
        {t("dev.aiGmTitle")}
      </div>
      {metrics ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "4px", border: "1px solid var(--line-soft)" }}>
              <div style={{ color: "var(--ink-dim)", fontSize: "11px" }}>Total Requests</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#d6fff6", fontFamily: "var(--mono)" }}>{metrics.total || 0}</div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "4px", border: "1px solid var(--line-soft)" }}>
              <div style={{ color: "var(--ink-dim)", fontSize: "11px" }}>Success Rate</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: (metrics.success_ratio ?? 0) > 0.8 ? "#4ade80" : "#fbbf24", fontFamily: "var(--mono)" }}>
                {Math.round((metrics.success_ratio || 0) * 100)}%
              </div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "4px", border: "1px solid var(--line-soft)" }}>
              <div style={{ color: "var(--ink-dim)", fontSize: "11px" }}>Degraded / Retries</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: (metrics.degraded ?? 0) > 0 ? "#f472b6" : "var(--ink-dim)", fontFamily: "var(--mono)" }}>
                {metrics.degraded || 0}
              </div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "4px", border: "1px solid var(--line-soft)", minWidth: 0 }}>
              <div style={{ color: "var(--ink-dim)", fontSize: "11px" }}>Last Outcome</div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "bold",
                  color: "#60a5fa",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={metrics.last_outcome}
              >
                {metrics.last_outcome || "n/a"}
              </div>
            </div>
          </div>

          {/* Detailed counts */}
          <div>
            <div style={{ color: "var(--term-dim)", fontSize: "11px", marginBottom: "6px", fontWeight: "bold" }}>
              Detail Counts
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
                padding: "8px",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "4px",
                border: "1px solid var(--line-soft)",
              }}
            >
              {Object.entries(metrics.counts || {}).map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    fontSize: "10.5px",
                    background: "rgba(0, 255, 170, 0.1)",
                    border: "1px solid rgba(0, 255, 170, 0.2)",
                    padding: "2px 6px",
                    borderRadius: "12px",
                    color: "var(--term)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--ink-dim)", fontSize: "12px" }}>
          {t("dev.noMetrics")}
        </div>
      )}
    </div>
  );
}

type SnapshotTab = "overview" | "player" | "combat" | "raw";

function SnapshotPanel({ snapshot }: { snapshot: RuntimeSnapshot | null }) {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<SnapshotTab>("overview");

  if (!snapshot) {
    return (
      <div className="panel" style={{ ...devPanelStyle, gridColumn: "1 / -1", marginTop: 0 }}>
        <div className="cc-label" style={{ marginBottom: "8px", borderBottom: "1px solid var(--line-soft)", paddingBottom: "6px" }}>
          {t("dev.rawGameState")}
        </div>
        <div style={{ color: "var(--ink-dim)", fontSize: "12px", padding: "16px", textAlign: "center" }}>
          {t("dev.noSession")}
        </div>
      </div>
    );
  }

  const tabStyle = (tab: SnapshotTab): CSSProperties => ({
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: "11px",
    background: activeTab === tab ? "rgba(0, 255, 170, 0.12)" : "transparent",
    border: "1px solid",
    borderColor: activeTab === tab ? "var(--term)" : "rgba(255, 255, 255, 0.1)",
    color: activeTab === tab ? "var(--term)" : "var(--ink-dim)",
    borderRadius: "4px",
    fontFamily: "var(--mono)",
    transition: "all 0.15s ease",
  });

  return (
    <div className="panel" style={{ ...devPanelStyle, gridColumn: "1 / -1", marginTop: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "12px",
          borderBottom: "1px solid var(--line-soft)",
          paddingBottom: "8px",
        }}
      >
        <div className="cc-label" style={{ margin: 0 }}>
          {t("dev.rawGameState")}
        </div>
        
        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={tabStyle("overview")} onClick={() => setActiveTab("overview")}>OVERVIEW</button>
          <button style={tabStyle("player")} onClick={() => setActiveTab("player")}>PLAYER</button>
          <button style={tabStyle("combat")} onClick={() => setActiveTab("combat")}>COMBAT</button>
          <button style={tabStyle("raw")} onClick={() => setActiveTab("raw")}>RAW JSON</button>
        </div>
      </div>

      {/* Tab Contents */}
      <div style={{ background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", border: "1px solid var(--line-soft)", padding: "12px", minHeight: "150px" }}>
        {activeTab === "overview" && <SnapshotOverviewTab snapshot={snapshot} />}
        {activeTab === "player" && <SnapshotPlayerTab snapshot={snapshot} />}
        {activeTab === "combat" && <SnapshotCombatTab snapshot={snapshot} />}
        {activeTab === "raw" && (
          <pre
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              maxHeight: "350px",
              width: "100%",
              boxSizing: "border-box",
              overflow: "auto",
              margin: 0,
              fontFamily: "var(--mono)",
              background: "rgba(0,0,0,0.3)",
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function SnapshotOverviewTab({ snapshot }: { snapshot: RuntimeSnapshot }) {
  const rowStyle: CSSProperties = {
    display: "flex",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    padding: "6px 0",
    fontSize: "12px",
  };
  const labelStyle: CSSProperties = {
    width: "180px",
    color: "var(--ink-dim)",
    fontFamily: "var(--mono)",
    fontWeight: "bold",
  };
  const valStyle: CSSProperties = {
    flex: 1,
    color: "#d6fff6",
    wordBreak: "break-all",
  };

  const fields = [
    { label: "Loop ID", value: snapshot.loop_id },
    { label: "Current Phase", value: snapshot.phase },
    { label: "Current Location", value: snapshot.location },
    { label: "Zone Risk", value: snapshot.zone_risk },
    { label: "Stability", value: snapshot.stability },
    { label: "Tension", value: snapshot.tension },
    { label: "Decay Percent", value: `${snapshot.decay_percent}%` },
    { label: "Clues Collected", value: snapshot.clues_collected },
    { label: "Active Scene ID", value: snapshot.active_scene?.scene_id || "None" },
    { label: "Active Scene Type", value: snapshot.active_scene?.scene_type || "None" },
    { label: "BGM Asset", value: snapshot.bgm_path || "None" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {fields.map((f, idx) => (
        <div key={idx} style={rowStyle}>
          <div style={labelStyle}>{f.label}</div>
          <div style={valStyle}>{f.value}</div>
        </div>
      ))}
    </div>
  );
}

function SnapshotPlayerTab({ snapshot }: { snapshot: RuntimeSnapshot }) {
  const { t } = useLang();
  const player = snapshot.player;
  if (!player) {
    return <div style={{ color: "var(--ink-dim)", fontSize: "12px" }}>{t("dev.noPlayer")}</div>;
  }

  const traitsObj = player.traits || {};
  const stats = (traitsObj.stats as Record<string, number>) || {};
  const inventory = (traitsObj.inventory as string[]) || [];
  const attributes = (traitsObj.attributes as string[]) || [];
  const archetype = (traitsObj.archetype as string) || "Unknown";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <div style={{ color: "var(--term-dim)", fontWeight: "bold", marginBottom: "4px" }}>PROFILE</div>
          <div style={{ padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "4px", border: "1px solid var(--line-soft)" }}>
            <div><strong>Player ID:</strong> <span style={{ fontFamily: "var(--mono)", fontSize: "11px" }}>{player.player_id}</span></div>
            <div style={{ marginTop: "4px" }}><strong>Display Name:</strong> {player.display_name}</div>
            <div style={{ marginTop: "4px" }}><strong>Archetype:</strong> {archetype}</div>
          </div>
        </div>
        <div>
          <div style={{ color: "var(--term-dim)", fontWeight: "bold", marginBottom: "4px" }}>STATS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "4px", border: "1px solid var(--line-soft)" }}>
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-dim)", textTransform: "uppercase" }}>{k}</span>
                <strong style={{ color: "var(--term)" }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <div style={{ color: "var(--term-dim)", fontWeight: "bold", marginBottom: "4px" }}>ATTRIBUTES / TRAITS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "4px", border: "1px solid var(--line-soft)", minHeight: "50px" }}>
            {attributes.length > 0 ? (
              attributes.map((attr: string, idx: number) => (
                <span key={idx} style={{ fontSize: "11px", background: "rgba(96, 165, 250, 0.15)", border: "1px solid rgba(96, 165, 250, 0.3)", padding: "2px 6px", borderRadius: "4px", color: "#60a5fa" }}>
                  {attr}
                </span>
              ))
            ) : (
              <span style={{ color: "var(--ink-dim)" }}>{t("dev.noAttrs")}</span>
            )}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--term-dim)", fontWeight: "bold", marginBottom: "4px" }}>INVENTORY</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "4px", border: "1px solid var(--line-soft)", minHeight: "50px" }}>
            {inventory.length > 0 ? (
              inventory.map((item: string, idx: number) => (
                <span key={idx} style={{ fontSize: "11px", background: "rgba(251, 191, 36, 0.15)", border: "1px solid rgba(251, 191, 36, 0.3)", padding: "2px 6px", borderRadius: "4px", color: "#fbbf24" }}>
                  {item}
                </span>
              ))
            ) : (
              <span style={{ color: "var(--ink-dim)" }}>{t("dev.emptyInventory")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotCombatTab({ snapshot }: { snapshot: RuntimeSnapshot }) {
  const { t } = useLang();
  const combat = snapshot.combat;
  if (!combat) {
    return <div style={{ color: "var(--ink-dim)", fontSize: "12px" }}>{t("dev.notInCombat")}</div>;
  }

  const radar = combat.radar;
  const blips = radar?.blips || [];
  const round = radar?.round || 1;
  const finished = combat.finished;
  const outcome = combat.outcome;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <div style={{ color: "var(--term-dim)", fontWeight: "bold", marginBottom: "4px" }}>COMBAT OVERVIEW</div>
          <div style={{ padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "4px", border: "1px solid var(--line-soft)" }}>
            <div><strong>Round:</strong> {round}</div>
            <div style={{ marginTop: "4px" }}><strong>Status:</strong> {finished ? "Finished" : "Active"}</div>
            {outcome && <div style={{ marginTop: "4px" }}><strong>Outcome:</strong> <span style={{ color: "var(--term)" }}>{outcome}</span></div>}
            {radar?.arena && <div style={{ marginTop: "4px" }}><strong>Arena Size:</strong> {radar.arena.w} x {radar.arena.h}</div>}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--term-dim)", fontWeight: "bold", marginBottom: "4px" }}>COMBATANTS ROSTER</div>
          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              padding: "8px",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "4px",
              border: "1px solid var(--line-soft)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {blips.length > 0 ? (
              blips.map((blip, idx) => {
                const factionColors: Record<string, string> = {
                  player: "#4ade80",
                  ally: "#60a5fa",
                  enemy: "#f472b6",
                };
                const color = factionColors[blip.faction] || "#fff";
                const isCurrent = radar.current === blip.id;

                return (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "2px" }}>
                    <span style={{ color, fontWeight: isCurrent ? "bold" : "normal" }}>
                      {isCurrent ? "▸ " : ""}{blip.name} ({blip.faction})
                    </span>
                    <span style={{ fontFamily: "var(--mono)" }}>
                      HP: {blip.hp}/{blip.max_hp} | Position: ({blip.x}, {blip.y})
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "var(--ink-dim)" }}>{t("dev.noUnits")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
