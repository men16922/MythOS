import { useLang } from "./i18n/lang";
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
  const { t } = useLang();
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
      <p className="panel-title">{t("prog.title")}</p>
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
        <span>{t("prog.clues")} {clueCount}</span>
        <span>{t("prog.lore")} {loreCount}</span>
        <span>{t("prog.chars")} {characterCount}</span>
        <span>{t("prog.skills")} {learnedSkills}/{unlockedSkills}</span>
      </div>
      {softDefeat && (
        <div className="progress-alert">
          {t("prog.recovery")}
        </div>
      )}
      {latestRun ? (
        <div className="progress-latest-run">
          <span>{t("prog.recent")}</span>
          <strong>{latestRun.ending_label || latestRun.final_title || t("save.endedLoop")}</strong>
          <small>
            {t("prog.turn")} {latestRun.turns}
            {latestRun.combats_won != null ? ` · ${t("prog.win")} ${latestRun.combats_won}` : ""}
            {latestRun.combats_lost != null ? ` · ${t("prog.loss")} ${latestRun.combats_lost}` : ""}
          </small>
        </div>
      ) : (
        <div className="progress-empty">
          {t("prog.empty")}
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
