import type { CSSProperties } from "react";

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
const devPanelStyle: CSSProperties = { maxWidth: "392px" };
const devStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  maxWidth: "360px",
};

// 로컬 인프라 콘솔 링크 (Streamlit Developer 사이드바 패리티).
// 브라우저 호스트 기준으로 URL을 만들어 원격 접속 시에도 동작.
const INFRA_LINKS: { label: string; port: number; desc: string }[] = [
  { label: "Adminer", port: 8080, desc: "PostgreSQL DB 뷰어" },
  { label: "MinIO", port: 9001, desc: "오브젝트 스토리지 콘솔 (이미지 자산)" },
  { label: "Redis", port: 8081, desc: "Redis Commander (visual job 큐)" },
  { label: "Jaeger", port: 16686, desc: "분산 트레이스 (OTel)" },
];

function InfraLinks() {
  const host = window.location.hostname || "localhost";
  return (
    <div className="panel" style={devPanelStyle}>
      <div className="cc-label" style={{ marginBottom: "10px" }}>
        로컬 인프라 콘솔 (Local Infrastructure)
      </div>
      <div
        className="infra-links"
        style={devStackStyle}
      >
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
            <span className="infra-link-desc">{l.desc}</span>
          </a>
        ))}
      </div>
      <div className="infra-hint">
        링크가 열리지 않으면 `make infra-up`으로 도커 인프라를 먼저 기동하세요.
      </div>
    </div>
  );
}

export function DevConsolePanel({ data, snapshot }: DevConsolePanelProps) {
  return (
    <div
      id="dev-tab-content"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 392px))",
        gap: "16px",
        alignItems: "start",
      }}
    >
      <InfraLinks />
      <div className="panel" style={devPanelStyle}>
        <h2
          style={{
            color: "var(--term)",
            fontSize: "16px",
            margin: "0 0 16px",
          }}
        >
          개발자 콘솔
        </h2>

        <div className="cc-label" style={{ marginBottom: "8px" }}>
          Butterfly Effect Metrics (인과율 메트릭)
        </div>
        <div
          style={{
            ...devStackStyle,
            marginBottom: "20px",
          }}
        >
          {Object.entries(data.scores).map(([key, value], idx) => {
            const color = scoreColors[idx % scoreColors.length];
            return (
              <div
                key={key}
                style={{
                  background: "rgba(0, 20, 17, 0.78)",
                  border: `1px solid ${color}33`,
                  borderRadius: "6px",
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    color,
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                >
                  {key}
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontFamily: "var(--mono)",
                    color: "#d6fff6",
                  }}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>

        <NarrativeMetricsPanel data={data} />

        <div
          className="codex-grid"
          style={{ gridTemplateColumns: "1fr", maxWidth: "360px" }}
        >
          <div className="codex-sec">
            <div className="codex-sec-title">
              Active Flags & Butterfly Effects
            </div>
            <div
              className="codex-list"
              style={{ fontFamily: "var(--mono)", fontSize: "11.5px" }}
            >
              {data.flags.length > 0 ? (
                data.flags.map((flag, idx) => (
                  <div className="codex-item" key={idx}>
                    {flag}
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  활성 플래그가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="codex-sec">
            <div className="codex-sec-title">시나리오 엔딩 및 도달 가능성</div>
            <div className="codex-list" style={{ fontSize: "11.5px" }}>
              {data.endings.length > 0 ? (
                data.endings.map((ending) => {
                  const isActive = data.activeEndingId === ending.id;
                  return (
                    <div
                      className="codex-item"
                      style={{ padding: "4px 0" }}
                      key={ending.id}
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
                <div style={{ color: "var(--ink-dim)" }}>
                  조회 가능한 엔딩 리스트가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="codex-sec" style={{ marginTop: "16px" }}>
          <div className="codex-sec-title">
            Raw GameState Snapshot (원시 JSON 데이터)
          </div>
          <pre
            style={{
              fontSize: "10.5px",
              color: "var(--ink-dim)",
              background: "rgba(0,0,0,0.5)",
              border: "1px solid var(--line-soft)",
              padding: "10px",
              borderRadius: "4px",
              maxHeight: "240px",
              maxWidth: "100%",
              overflow: "auto",
              margin: 0,
              fontFamily: "var(--mono)",
            }}
          >
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function NarrativeMetricsPanel({ data }: { data: DevConsoleData }) {
  const metrics = data.narrativeMetrics;

  return (
    <div className="codex-sec" style={{ marginBottom: "16px" }}>
      <div className="codex-sec-title">AI GM Outcome Ratio</div>
      {metrics ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "12px",
            maxWidth: "360px",
          }}
        >
          <div>
            <div style={{ color: "var(--ink-dim)" }}>Total</div>
            <strong>{metrics.total || 0}</strong>
          </div>
          <div>
            <div style={{ color: "var(--ink-dim)" }}>Success</div>
            <strong>{Math.round((metrics.success_ratio || 0) * 100)}%</strong>
          </div>
          <div>
            <div style={{ color: "var(--ink-dim)" }}>Degraded</div>
            <strong>
              {metrics.degraded || 0} (
              {Math.round((metrics.degraded_ratio || 0) * 100)}%)
            </strong>
          </div>
          <div>
            <div style={{ color: "var(--ink-dim)" }}>Last Outcome</div>
            <strong>{metrics.last_outcome || "n/a"}</strong>
          </div>
          <div>
            <div style={{ color: "var(--ink-dim)" }}>Counts</div>
            <code style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
              {JSON.stringify(metrics.counts || {})}
            </code>
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--ink-dim)", fontSize: "12px" }}>
          아직 기록된 AI GM outcome 지표가 없습니다.
        </div>
      )}
    </div>
  );
}
