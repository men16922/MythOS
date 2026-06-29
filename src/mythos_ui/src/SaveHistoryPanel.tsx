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
    <div className="panel" id="save-load-panel">
      <p className="panel-title">{t("save.title")}</p>
      <div className="sl-launch">
        <button onClick={onOpenSave} disabled={isBusy || !canSave}>
          {t("sl.saveBtn")}
        </button>
        <button onClick={onOpenLoad} disabled={isBusy}>
          {t("sl.loadBtn")}
        </button>
      </div>
    </div>
  );
}

export function RunHistoryPanel({ runsHistory }: { runsHistory: RunSummary[] }) {
  const { t, lang } = useLang();
  return (
    <div className="panel" id="history-panel">
      <p className="panel-title">{t("save.archiveTitle")}</p>
      <div className="run-history-hint">
        {t("save.archiveDesc")}
      </div>
      <div
        style={{
          fontSize: "11px",
          maxHeight: "180px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {runsHistory.length > 0 ? (
          runsHistory.map((run) => (
            <div
              className="save-slot-item"
              style={{ borderStyle: "dashed" }}
              key={run.loop_id}
            >
              <div className="save-slot-info">
                <div className="save-slot-label">{run.ending_label || t("save.endedLoop")}</div>
                <div className="save-slot-meta">
                  {t("save.loop")}: {run.loop_id.slice(0, 10)}… · {t("save.turns")}: {run.turns} ·{" "}
                  {localDate(run.ended_at, lang)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: "var(--ink-dim)" }}>
            {t("save.archiveEmpty")}
          </div>
        )}
      </div>
    </div>
  );
}
