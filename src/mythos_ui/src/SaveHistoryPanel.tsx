import { useLang } from "./i18n/lang";
import type { RunSummary, SaveSlot } from "./types";

interface SaveHistoryPanelProps {
  saveLabelInput: string;
  saveSlots: SaveSlot[];
  isBusy: boolean;
  canSave: boolean;
  playerId: string;
  scenarioId: string;
  onSaveLabelChange: (value: string) => void;
  onSave: () => void;
  onLoad: (params: { playerId: string; scenarioId: string; loopId: string }) => void;
}

function localDate(value: string): string {
  return new Date(value).toLocaleString("ko-KR", { hour12: false });
}

export function SaveHistoryPanel({
  saveLabelInput,
  saveSlots,
  isBusy,
  canSave,
  playerId,
  scenarioId,
  onSaveLabelChange,
  onSave,
  onLoad,
}: SaveHistoryPanelProps) {
  const { t } = useLang();
  return (
    <div className="panel" id="save-load-panel">
      <p className="panel-title">{t("save.title")}</p>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <input
          type="text"
          placeholder={t("save.descPlaceholder")}
          value={saveLabelInput}
          onChange={(e) => onSaveLabelChange(e.target.value)}
          style={{ flex: 1, fontSize: "12px", padding: "6px" }}
        />
        <button
          onClick={onSave}
          disabled={isBusy || !canSave}
          style={{ fontSize: "11px", padding: "6px 10px" }}
        >
          SAVE
        </button>
      </div>
      <div
        style={{
          fontSize: "11px",
          maxHeight: "140px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {saveSlots.length > 0 ? (
          saveSlots.map((slot) => (
            <div className="save-slot-item" key={slot.loop_id}>
              <div className="save-slot-info">
                <div className="save-slot-label">{slot.label || t("save.autosave")}</div>
                <div className="save-slot-meta">
                  {t("save.loop")}: {slot.loop_id.slice(0, 10)}… · {localDate(slot.saved_at)}
                </div>
              </div>
              <button
                className="save-slot-load-btn"
                onClick={() => onLoad({ playerId, scenarioId, loopId: slot.loop_id })}
              >
                LOAD
              </button>
            </div>
          ))
        ) : (
          <div style={{ color: "var(--ink-dim)" }}>{t("save.none")}</div>
        )}
      </div>
    </div>
  );
}

export function RunHistoryPanel({ runsHistory }: { runsHistory: RunSummary[] }) {
  const { t } = useLang();
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
                  {localDate(run.ended_at)}
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
