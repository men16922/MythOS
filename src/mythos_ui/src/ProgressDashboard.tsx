import type { EchoItem, MemoryOverview, RunSummary, RuntimeSnapshot } from "./types";

function stringCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function activeEchoes(snapshot: RuntimeSnapshot | null): EchoItem[] {
  const echoes = snapshot?.active_echoes;
  return Array.isArray(echoes) ? echoes : [];
}

export function ProgressDashboard({
  snapshot,
  memoryOverview,
  runs,
}: {
  snapshot: RuntimeSnapshot | null;
  memoryOverview: MemoryOverview | null;
  runs: RunSummary[];
}) {
  const shards = memoryOverview?.narrative_shards || [];
  const clueCount = shards.filter((s) => s.kind === "clue").length || snapshot?.clues_collected || 0;
  const loreCount = shards.filter((s) => s.kind === "lore").length + (memoryOverview?.unlocked_lore?.length || 0);
  const characterCount = shards.filter((s) => s.kind === "character").length;
  const echoes = activeEchoes(snapshot);
  const meta = memoryOverview?.meta_progression || {};
  const insight = Number(meta.insight_points || 0);
  const learnedSkills = stringCount(meta.learned_skills);
  const unlockedSkills = stringCount(meta.unlocked_skills);
  const latestRun = runs[0];
  const softDefeat = Boolean(snapshot?.state?._soft_defeat_pending);

  return (
    <div className="panel progress-dashboard-panel">
      <p className="panel-title">진행도 현황</p>
      <div className="progress-grid">
        <div className="progress-stat">
          <span>RUNS</span>
          <strong>{runs.length}</strong>
        </div>
        <div className="progress-stat">
          <span>ECHO</span>
          <strong>{echoes.length}</strong>
        </div>
        <div className="progress-stat">
          <span>SHARD</span>
          <strong>{shards.length}</strong>
        </div>
        <div className="progress-stat">
          <span>INSIGHT</span>
          <strong>{insight}</strong>
        </div>
      </div>
      <div className="progress-detail">
        <span>단서 {clueCount}</span>
        <span>로어 {loreCount}</span>
        <span>인물 {characterCount}</span>
        <span>스킬 {learnedSkills}/{unlockedSkills}</span>
      </div>
      {softDefeat && (
        <div className="progress-alert">
          포획 후 회복 루트 진행 중: 다음 선택에서 탈출, 재정비, 추적 회피가 이어집니다.
        </div>
      )}
      {latestRun ? (
        <div className="progress-latest-run">
          <span>최근 기록</span>
          <strong>{latestRun.ending_label || latestRun.final_title || "종결된 루프"}</strong>
          <small>
            턴 {latestRun.turns}
            {latestRun.combats_won != null ? ` · 승 ${latestRun.combats_won}` : ""}
            {latestRun.combats_lost != null ? ` · 패 ${latestRun.combats_lost}` : ""}
          </small>
        </div>
      ) : (
        <div className="progress-empty">
          아직 보관된 런은 없습니다. 현재 루프의 Echo/Shard 현황은 위 카운터에 누적됩니다.
        </div>
      )}
      {echoes.length > 0 && (
        <div className="progress-echo-list">
          {echoes.slice(0, 2).map((echo, idx) => (
            <div key={echo.echo_id || `${echo.symbol}-${idx}`} className="progress-echo">
              <span>{echo.symbol}</span>
              <small>{echo.text}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
