import { useLang } from "./i18n/lang";
import type { EchoItem, MemoryOverview, RunSummary, RuntimeSnapshot } from "./types";

type AchievementMetric = "runs_completed" | "total_clues" | "total_combats_won";

interface CompanionMilestone {
  id: string;
  nameKo: string;
  nameEn: string;
  metric: AchievementMetric;
  target: number;
}

const RECRUITMENT_MILESTONES: CompanionMilestone[] = [
  { id: "han", nameKo: "한", nameEn: "Han", metric: "total_combats_won", target: 3 },
  { id: "su_ah", nameKo: "수아", nameEn: "Su-ah", metric: "runs_completed", target: 2 },
  { id: "lin_yue", nameKo: "린위에", nameEn: "Lin Yue", metric: "total_clues", target: 5 },
  { id: "tae_o", nameKo: "태오", nameEn: "Tae-o", metric: "total_combats_won", target: 6 },
];

const UPGRADE_MILESTONES: CompanionMilestone[] = [
  { id: "se_rin_practiced_maneuvers", nameKo: "세린 · 합 맞춘 기동", nameEn: "Se-rin · Practiced Maneuvers", metric: "total_combats_won", target: 4 },
  { id: "kai_guardian_frame", nameKo: "카이 · 수호 프레임", nameEn: "Kai · Guardian Frame", metric: "total_combats_won", target: 5 },
  { id: "han_overdrive_intrusion", nameKo: "한 · 과부하 침투", nameEn: "Han · Overdrive Intrusion", metric: "total_combats_won", target: 6 },
  { id: "tae_o_battle_scarred", nameKo: "태오 · 전장 각인", nameEn: "Tae-o · Battle-Scarred", metric: "total_combats_won", target: 8 },
  { id: "su_ah_resonance_reach", nameKo: "수아 · 공명 확장", nameEn: "Su-ah · Resonance Reach", metric: "runs_completed", target: 3 },
  { id: "lin_yue_undernet_broker", nameKo: "린위에 · 지하망 정보상", nameEn: "Lin Yue · Undernet Broker", metric: "total_clues", target: 8 },
];

function metaNumber(meta: Record<string, unknown>, key: AchievementMetric): number {
  const value = Number(meta[key] || 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

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
  const { lang, t } = useLang();
  const shards = memoryOverview?.narrative_shards || [];
  const clueCount = shards.filter((s) => s.kind === "clue").length || snapshot?.clues_collected || 0;
  const loreCount = shards.filter((s) => s.kind === "lore").length + (memoryOverview?.unlocked_lore?.length || 0);
  const characterCount = shards.filter((s) => s.kind === "character").length;
  const echoes = activeEchoes(snapshot);
  const meta = (memoryOverview?.meta_progression || snapshot?.state?.meta_progression || {}) as Record<string, unknown>;
  const insight = Number(meta.insight_points || 0);
  const learnedSkills = stringCount(meta.learned_skills);
  const unlockedSkills = stringCount(meta.unlocked_skills);
  const achievementTotals = {
    runs_completed: metaNumber(meta, "runs_completed"),
    total_combats_won: metaNumber(meta, "total_combats_won"),
    total_clues: metaNumber(meta, "total_clues"),
  };
  const unlockedTraits = stringList(meta.unlocked_traits);
  const latestRun = runs[0];
  const softDefeat = Boolean(snapshot?.state?._soft_defeat_pending);

  const milestoneRow = (milestone: CompanionMilestone) => {
    const current = achievementTotals[milestone.metric];
    const complete = current >= milestone.target;
    const name = lang === "ko" ? milestone.nameKo : milestone.nameEn;
    return (
      <div className={`achievement-row${complete ? " complete" : ""}`} key={milestone.id}>
        <div className="achievement-row-head">
          <span>{name}</span>
          <small>{complete ? t("prog.complete") : `${current}/${milestone.target}`}</small>
        </div>
        <progress
          aria-label={`${name} ${current}/${milestone.target}`}
          max={milestone.target}
          value={Math.min(current, milestone.target)}
        />
      </div>
    );
  };

  const traitLabel = (trait: string) => {
    if (trait === "loop_veteran") return t("prog.traitLoopVeteran");
    if (trait === "ix_vanquisher") return t("prog.traitIxVanquisher");
    return trait.replaceAll("_", " ");
  };

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
      <section className="achievements-section" aria-labelledby="achievements-heading">
        <div className="achievements-heading">
          <span id="achievements-heading">{t("prog.achievements")}</span>
          <small>{t("prog.achievementsHint")}</small>
        </div>
        <div className="achievement-totals">
          <div>
            <span>{t("prog.totalRuns")}</span>
            <strong>{achievementTotals.runs_completed}</strong>
          </div>
          <div>
            <span>{t("prog.totalWins")}</span>
            <strong>{achievementTotals.total_combats_won}</strong>
          </div>
          <div>
            <span>{t("prog.totalClues")}</span>
            <strong>{achievementTotals.total_clues}</strong>
          </div>
        </div>
        <div className="achievement-groups">
          <div className="achievement-group">
            <span className="achievement-group-title">{t("prog.recruitment")}</span>
            {RECRUITMENT_MILESTONES.map(milestoneRow)}
          </div>
          <div className="achievement-group">
            <span className="achievement-group-title">{t("prog.upgrades")}</span>
            {UPGRADE_MILESTONES.map(milestoneRow)}
          </div>
        </div>
        <div className="achievement-traits">
          <span className="achievement-group-title">{t("prog.unlockedTraits")}</span>
          <div>
            {unlockedTraits.length > 0 ? (
              unlockedTraits.map((trait) => <span key={trait}>{traitLabel(trait)}</span>)
            ) : (
              <small>{t("prog.noTraits")}</small>
            )}
          </div>
        </div>
      </section>
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
