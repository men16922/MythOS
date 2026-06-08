import type { RouteMap } from "./types";

// Ending id -> player-facing label.
const ENDING_LABELS: Record<string, string> = {
  ending_safe_refuge: "안정적 귀환",
  ending_code_rewrite: "시스템 각성",
  ending_noble_sacrifice: "고결한 희생",
  ending_erasure: "강제 최적화",
};

/**
 * Narrative-meta view of the current route: which lens (perspective) the player
 * is living right now and which ending their accumulated choices lean toward.
 * Lives in the 기억의 별자리(Codex) tab so the operation map stays a clean graph.
 */
export function RouteNarrative({ routeMap }: { routeMap?: RouteMap | null }) {
  const layers = routeMap?.layers || [];
  if (!routeMap || layers.length === 0) return null;

  const nodes = routeMap.nodes || {};
  const currentId = routeMap.current || (layers[0] || [])[0];
  const activePerspectives = routeMap.active_perspectives || {};
  const leaderboard = routeMap.ending_leaderboard || [];
  const currentNode = nodes[currentId];
  const activeLensId = activePerspectives[currentId];
  const activeLens = (currentNode?.perspectives || []).find((p) => p.id === activeLensId);
  const topEndingScore = leaderboard.length ? leaderboard[0][1] : 0;

  if (!activeLens && leaderboard.length === 0) return null;

  return (
    <div className="codex-sec route-narrative">
      <div className="codex-sec-title">루트 흐름 (Route)</div>

      {activeLens && (
        <div className="route-active-lens">
          <span className="route-active-tag">현재 시점</span> {activeLens.lens}
          {activeLens.summary && <div className="route-active-summary">{activeLens.summary}</div>}
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="route-ending-lead">
          <div className="route-ending-title">
            이 루트가 향하는 결말
            <span
              className="route-ending-help-icon"
              title="지금까지 내린 선택이 어느 결말로 기울고 있는지 보여주는 누적 경향입니다. 확정이 아니라, 앞으로의 선택으로 바뀔 수 있는 가중치입니다."
            >
              ⓘ
            </span>
          </div>
          <div className="route-ending-help">
            지금까지의 선택이 기울고 있는 결말 경향(확정 아님).
          </div>
          {leaderboard.slice(0, 3).map(([id, score]) => (
            <div key={id} className="route-ending-row">
              <span className="route-ending-name">{ENDING_LABELS[id] || id}</span>
              <span className="route-ending-bar">
                <span
                  className="route-ending-fill"
                  style={{ width: `${topEndingScore ? (score / topEndingScore) * 100 : 0}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
