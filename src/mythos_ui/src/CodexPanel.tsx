import { ProgressDashboard } from "./ProgressDashboard";
import { RouteNarrative } from "./RouteNarrative";
import { RunHistoryPanel } from "./SaveHistoryPanel";
import { mergedRuns } from "./runHistory";
import type { CodexLists } from "./viewModels";
import type { MemoryOverview, RouteMap, RunSummary, RuntimeSnapshot } from "./types";

interface CodexPanelProps {
  codexLists: CodexLists;
  routeMap?: RouteMap | null;
  snapshot?: RuntimeSnapshot | null;
  runsHistory?: RunSummary[];
  memoryOverview?: MemoryOverview | null;
}

export function CodexPanel({
  codexLists,
  routeMap,
  snapshot,
  runsHistory = [],
  memoryOverview = null,
}: CodexPanelProps) {
  const visibleRuns = mergedRuns(runsHistory, memoryOverview?.run_summaries);
  return (
    <div id="codex-tab-content">
      <div className="panel">
        <h2 className="tab-panel-title">기억의 별자리</h2>
        <div className="codex-grid">
          <RouteNarrative routeMap={routeMap} />
          <div className="codex-sec">
            <div className="codex-sec-title">단서 목록 (Clues)</div>
            <div className="codex-list">
              {codexLists.clues.length > 0 ? (
                codexLists.clues.map((clue, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">
                      <span>{clue.symbol}</span>
                      <span>단서</span>
                    </div>
                    <div className="codex-item-desc">{clue.text}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  획득한 단서가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="codex-sec">
            <div className="codex-sec-title">세계 아카이브 (Lore)</div>
            <div className="codex-list">
              {codexLists.allLore.length > 0 ? (
                codexLists.allLore.map((lore, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">{lore.title}</div>
                    <div className="codex-item-desc">{lore.desc}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  조회 가능한 아카이브가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="codex-sec" style={{ marginTop: "16px" }}>
          <div className="codex-sec-title">
            이전 루프 회상 잔향 (Active Echoes)
          </div>
          <div className="codex-list">
            {codexLists.echoes.length > 0 ? (
              codexLists.echoes.map((echo, idx) => (
                <div className="codex-item" key={idx}>
                  <div className="codex-item-head">{echo.symbol}</div>
                  <div className="codex-item-desc">{echo.text}</div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--ink-dim)" }}>
                감지된 회상 잔향이 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="codex-status-grid">
          <ProgressDashboard
            snapshot={snapshot ?? null}
            memoryOverview={memoryOverview}
            runs={visibleRuns}
          />
          <RunHistoryPanel runsHistory={visibleRuns} />
        </div>
      </div>
    </div>
  );
}
