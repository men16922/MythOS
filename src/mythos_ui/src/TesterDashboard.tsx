import { useEffect, useState, type CSSProperties } from "react";

/**
 * Admin-only Tester Dashboard — shows per-invite-key player status
 * fetched from /api/v1/admin/tester-status.
 */

const API_BASE = "";

function getInviteKey(): string {
  try {
    const url = new URLSearchParams(window.location.search).get("invite");
    if (url) return url;
    return window.localStorage.getItem("mythos_invite_key") || "";
  } catch {
    return "";
  }
}

interface ActiveLoop {
  loop_id: string;
  phase: string;
  stability: number;
  tension: number;
  location: string;
  turn_index: number;
  started_at: string;
}

interface EndingReached {
  ending_id: string;
  ending_label: string;
  turns: number;
}

interface TesterData {
  invite_key: string;
  player_id: string;
  // Admin/operator key — badged so operator play doesn't read as tester metrics.
  is_admin?: boolean;
  registered: boolean;
  display_name: string | null;
  archetype: string | null;
  created_at: string | null;
  last_activity: string | null;
  total_loops: number;
  active_loops: number;
  ended_loops: number;
  max_turn: number;
  active_loop: ActiveLoop | null;
  combats_won: number;
  combats_lost: number;
  endings_reached: EndingReached[];
  allies_met: string[];
  total_runs_completed: number;
}

interface TesterStatusResponse {
  testers: TesterData[];
  total_keys: number;
}

// -- Styles --

const cardStyle: CSSProperties = {
  background: "rgba(0, 20, 17, 0.6)",
  border: "1px solid rgba(0, 255, 170, 0.15)",
  borderRadius: "8px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid rgba(0, 255, 170, 0.1)",
  paddingBottom: "8px",
};

const statBoxStyle: CSSProperties = {
  background: "rgba(0, 0, 0, 0.3)",
  border: "1px solid var(--line-soft)",
  borderRadius: "4px",
  padding: "8px 12px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
  minWidth: "60px",
};

const labelStyle: CSSProperties = {
  fontSize: "10px",
  color: "var(--ink-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const valueStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  fontFamily: "var(--mono)",
  color: "#d6fff6",
  lineHeight: 1,
};

const chipStyle = (color: string): CSSProperties => ({
  fontSize: "10px",
  background: `${color}20`,
  border: `1px solid ${color}50`,
  padding: "2px 6px",
  borderRadius: "4px",
  color,
  fontFamily: "var(--mono)",
});

function formatRelativeTime(isoStr: string | null): string {
  if (!isoStr) return "—";
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: active ? "#4ade80" : "#6b7280",
        boxShadow: active ? "0 0 6px #4ade8088" : "none",
      }}
    />
  );
}

function TesterCard({ tester }: { tester: TesterData }) {
  const hasPlayed = tester.total_loops > 0;
  const isActive = tester.active_loops > 0;

  return (
    <div style={cardStyle}>
      {/* Header: Name + Status */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StatusDot active={isActive} />
          <div>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#d6fff6" }}>
              {tester.display_name || tester.invite_key}
            </div>
            <div style={{ fontSize: "10px", color: "var(--ink-dim)", fontFamily: "var(--mono)" }}>
              {tester.invite_key}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {tester.is_admin && (
            <span style={chipStyle("#ffc107")}>ADMIN</span>
          )}
          {tester.archetype && (
            <span style={chipStyle("#60a5fa")}>{tester.archetype}</span>
          )}
          {!tester.registered && (
            <span style={chipStyle("#f472b6")}>NOT REGISTERED</span>
          )}
        </div>
      </div>

      {!hasPlayed ? (
        <div style={{ color: "var(--ink-dim)", fontSize: "12px", textAlign: "center", padding: "16px 0" }}>
          No activity yet — key distributed but unused
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <div style={statBoxStyle}>
              <span style={labelStyle}>Loops</span>
              <span style={valueStyle}>{tester.total_loops}</span>
            </div>
            <div style={statBoxStyle}>
              <span style={labelStyle}>Active</span>
              <span style={{ ...valueStyle, color: isActive ? "#4ade80" : "var(--ink-dim)" }}>
                {tester.active_loops}
              </span>
            </div>
            <div style={statBoxStyle}>
              <span style={labelStyle}>Ended</span>
              <span style={valueStyle}>{tester.ended_loops}</span>
            </div>
            <div style={statBoxStyle}>
              <span style={labelStyle}>Max Turn</span>
              <span style={valueStyle}>{tester.max_turn}</span>
            </div>
            <div style={statBoxStyle}>
              <span style={labelStyle}>Wins</span>
              <span style={{ ...valueStyle, color: "#4ade80" }}>{tester.combats_won}</span>
            </div>
            <div style={statBoxStyle}>
              <span style={labelStyle}>Losses</span>
              <span style={{ ...valueStyle, color: "#f472b6" }}>{tester.combats_lost}</span>
            </div>
            <div style={statBoxStyle}>
              <span style={labelStyle}>Runs Done</span>
              <span style={valueStyle}>{tester.total_runs_completed}</span>
            </div>
          </div>

          {/* Active Loop Detail */}
          {tester.active_loop && (
            <div style={{
              background: "rgba(74, 222, 128, 0.05)",
              border: "1px solid rgba(74, 222, 128, 0.2)",
              borderRadius: "6px",
              padding: "10px",
            }}>
              <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: "bold", marginBottom: "6px" }}>
                ▸ ACTIVE LOOP
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "11px" }}>
                <span style={{ color: "var(--ink-dim)" }}>Location:</span>
                <span style={{ color: "#d6fff6" }}>{tester.active_loop.location}</span>
                <span style={{ color: "var(--ink-dim)" }}>Turn:</span>
                <span style={{ color: "#d6fff6" }}>{tester.active_loop.turn_index}</span>
                <span style={{ color: "var(--ink-dim)" }}>Stability:</span>
                <span style={{ color: tester.active_loop.stability < 30 ? "#f472b6" : "#4ade80" }}>
                  {tester.active_loop.stability}
                </span>
                <span style={{ color: "var(--ink-dim)" }}>Tension:</span>
                <span style={{ color: tester.active_loop.tension > 70 ? "#f472b6" : "#fbbf24" }}>
                  {tester.active_loop.tension}
                </span>
                <span style={{ color: "var(--ink-dim)" }}>Phase:</span>
                <span style={{ color: "#60a5fa" }}>{tester.active_loop.phase}</span>
              </div>
            </div>
          )}

          {/* Endings & Allies */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {/* Endings */}
            <div>
              <div style={{ fontSize: "10px", color: "var(--term-dim)", fontWeight: "bold", marginBottom: "4px" }}>
                ENDINGS REACHED
              </div>
              <div style={{
                padding: "6px",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "4px",
                border: "1px solid var(--line-soft)",
                minHeight: "30px",
              }}>
                {tester.endings_reached.length > 0 ? (
                  tester.endings_reached.map((e, i) => (
                    <div key={i} style={{ fontSize: "10px", color: "#fbbf24", marginBottom: "2px" }}>
                      • {e.ending_label} ({e.turns} turns)
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: "10px", color: "var(--ink-dim)" }}>None yet</span>
                )}
              </div>
            </div>
            {/* Allies */}
            <div>
              <div style={{ fontSize: "10px", color: "var(--term-dim)", fontWeight: "bold", marginBottom: "4px" }}>
                ALLIES MET
              </div>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "3px",
                padding: "6px",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "4px",
                border: "1px solid var(--line-soft)",
                minHeight: "30px",
              }}>
                {tester.allies_met.length > 0 ? (
                  tester.allies_met.map((ally, i) => (
                    <span key={i} style={chipStyle("#60a5fa")}>{ally}</span>
                  ))
                ) : (
                  <span style={{ fontSize: "10px", color: "var(--ink-dim)" }}>None yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Last Activity */}
          <div style={{ fontSize: "10px", color: "var(--ink-dim)", textAlign: "right" }}>
            Last activity: {formatRelativeTime(tester.last_activity)}
            {tester.created_at && ` · Joined: ${new Date(tester.created_at).toLocaleDateString()}`}
          </div>
        </>
      )}
    </div>
  );
}

export function TesterDashboard() {
  const [data, setData] = useState<TesterStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const key = getInviteKey();
    fetch(`${API_BASE}/api/v1/admin/tester-status`, {
      headers: key ? { "X-Invite-Key": key } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to fetch");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tick]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="panel" style={{ padding: "24px", textAlign: "center", color: "var(--ink-dim)" }}>
        Loading tester status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel" style={{ padding: "24px", textAlign: "center", color: "#f472b6" }}>
        Error: {error}
      </div>
    );
  }

  if (!data || data.testers.length === 0) {
    return (
      <div className="panel" style={{ padding: "24px", textAlign: "center", color: "var(--ink-dim)" }}>
        No tester keys configured
      </div>
    );
  }

  // Summary stats — tester-only, so operator/admin play doesn't inflate metrics
  // (admin rows still render below with an ADMIN badge).
  const testerRows = data.testers.filter((t) => !t.is_admin);
  const totalRegistered = testerRows.filter((t) => t.registered).length;
  const totalActive = testerRows.filter((t) => t.active_loops > 0).length;
  const totalLoops = testerRows.reduce((sum, t) => sum + t.total_loops, 0);

  return (
    <div className="panel" style={{ width: "100%", padding: "16px" }}>
      {/* Section Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
        borderBottom: "1px solid var(--line-soft)",
        paddingBottom: "8px",
      }}>
        <div className="cc-label" style={{ margin: 0 }}>
          TESTER DASHBOARD
        </div>
        <div style={{ display: "flex", gap: "12px", fontSize: "11px" }}>
          <span style={{ color: "var(--ink-dim)" }}>
            Keys: <strong style={{ color: "#d6fff6" }}>{data.total_keys}</strong>
          </span>
          <span style={{ color: "var(--ink-dim)" }}>
            Registered: <strong style={{ color: "#4ade80" }}>{totalRegistered}</strong>
          </span>
          <span style={{ color: "var(--ink-dim)" }}>
            Active: <strong style={{ color: "#60a5fa" }}>{totalActive}</strong>
          </span>
          <span style={{ color: "var(--ink-dim)" }}>
            Total Loops: <strong style={{ color: "#fbbf24" }}>{totalLoops}</strong>
          </span>
          <button
            onClick={() => setTick((t) => t + 1)}
            style={{
              background: "rgba(0, 255, 170, 0.1)",
              border: "1px solid var(--term)",
              borderRadius: "4px",
              color: "var(--term)",
              fontSize: "10px",
              padding: "2px 8px",
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Tester Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
        gap: "12px",
      }}>
        {data.testers.map((tester) => (
          <TesterCard key={tester.invite_key} tester={tester} />
        ))}
      </div>
    </div>
  );
}
