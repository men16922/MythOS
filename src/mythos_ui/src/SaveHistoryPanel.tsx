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
  return (
    <div className="panel" id="save-load-panel">
      <p className="panel-title">세션 저장 / 로드</p>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="설명 (선택)"
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
                <div className="save-slot-label">{slot.label || "오토세이브"}</div>
                <div className="save-slot-meta">
                  루프: {slot.loop_id.slice(0, 10)}… · {localDate(slot.saved_at)}
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
          <div style={{ color: "var(--ink-dim)" }}>저장된 세션이 없습니다.</div>
        )}
      </div>
    </div>
  );
}

export function RunHistoryPanel({ runsHistory }: { runsHistory: RunSummary[] }) {
  return (
    <div className="panel" id="history-panel">
      <p className="panel-title">기록 보관소 (지난 루프)</p>
      <div className="run-history-hint">
        여정 종료, 붕괴, 강제 정정으로 끝난 루프가 여기에 남습니다.
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
                <div className="save-slot-label">{run.ending_label || "종결된 루프"}</div>
                <div className="save-slot-meta">
                  루프: {run.loop_id.slice(0, 10)}… · 턴: {run.turns} ·{" "}
                  {localDate(run.ended_at)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: "var(--ink-dim)" }}>
            아직 종료된 루프 기록이 없습니다. 엔딩, 붕괴, 강제 정정 후 지난 루프 요약이 여기에 남습니다.
          </div>
        )}
      </div>
    </div>
  );
}
