import { Surface } from "./Surface";
import { useLang } from "./i18n/lang";
import type { RunSummary } from "./types";

interface SaveHistoryPanelProps {
  isBusy: boolean;
  canSave: boolean;
  onOpenSave: () => void;
  onOpenLoad: () => void;
}

function localDate(value: string, lang: string): string {
  const locale = lang === "en" ? "en-US" : "ko-KR";
  return new Date(value).toLocaleString(locale, { hour12: false });
}

export function SaveHistoryPanel({
  isBusy,
  canSave,
  onOpenSave,
  onOpenLoad,
}: SaveHistoryPanelProps) {
  const { t } = useLang();
  return (
    <Surface variant="surface" id="save-load-panel">
      <p className="panel-title">{t("save.title")}</p>
      <div className="sl-launch">
        <button onClick={onOpenSave} disabled={isBusy || !canSave}>
          {t("sl.saveBtn")}
        </button>
        <button onClick={onOpenLoad} disabled={isBusy}>
          {t("sl.loadBtn")}
        </button>
      </div>
    </Surface>
  );
}

export function RunHistoryPanel({ runsHistory }: { runsHistory: RunSummary[] }) {
  const { t, lang } = useLang();
  const outcomeGroups = [
    { key: "saved" as const, label: t("save.outcome.saved") },
    { key: "lost" as const, label: t("save.outcome.lost") },
    { key: "carried" as const, label: t("save.outcome.carried") },
  ];

  return (
    <Surface variant="surface" id="history-panel">
      <p className="panel-title">{t("save.archiveTitle")}</p>
      <div className="run-history-hint">
        {t("save.archiveDesc")}
      </div>
      <div className="run-history-list">
        {runsHistory.length > 0 ? (
          runsHistory.map((run) => {
            const visibleOutcomes = outcomeGroups.filter(
              ({ key }) => (run.outcome?.[key]?.length ?? 0) > 0
            );
            return (
              <div
                className="save-slot-item run-history-item"
                key={run.loop_id}
              >
                <div className="save-slot-info">
                  <div className="save-slot-label">
                    {run.ending_label || t("save.endedLoop")}
                  </div>
                  <div className="save-slot-meta">
                    {t("save.loop")}: {run.loop_id.slice(0, 10)}… · {t("save.turns")}:{" "}
                    {run.turns} · {localDate(run.ended_at, lang)}
                  </div>
                  {run.ending_narration ? (
                    <div className="run-ending-narration">{run.ending_narration}</div>
                  ) : null}
                  {visibleOutcomes.length > 0 ? (
                    <dl className="run-outcome">
                      {visibleOutcomes.map(({ key, label }) => (
                        <div className={`run-outcome-row run-outcome-${key}`} key={key}>
                          <dt>{label}</dt>
                          <dd>{run.outcome?.[key]?.join(" · ")}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ color: "var(--ink-dim)" }}>
            {t("save.archiveEmpty")}
          </div>
        )}
      </div>
    </Surface>
  );
}
