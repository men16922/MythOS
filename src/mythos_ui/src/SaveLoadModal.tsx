import { useState } from "react";
import { useLang } from "./i18n/lang";
import type { SaveSlot, ScenarioInfo } from "./types";

const PAGE_SIZE = 6;

interface SaveLoadModalProps {
  mode: "save" | "load";
  slots: SaveSlot[];
  scenarios: ScenarioInfo[];
  playerId: string | null;
  currentLoopId?: string | null;
  isBusy: boolean;
  canSave: boolean;
  saveLabelInput: string;
  onSaveLabelChange: (value: string) => void;
  onSave: () => void;
  onLoadSlot: (data: {
    playerId: string;
    scenarioId: string;
    loopId: string;
    slotId?: string;
  }) => void;
  // Overwrite an existing MANUAL slot with the current moment (save mode only).
  onOverwriteSlot: (slot: SaveSlot) => void;
  // Delete a slot (manual or autosave — autosaves just reappear next turn).
  onDeleteSlot: (slot: SaveSlot) => void;
  onClose: () => void;
}

function slotDate(value: string, lang: string): string {
  const locale = lang === "en" ? "en-US" : "ko-KR";
  return new Date(value).toLocaleString(locale, { hour12: false });
}

export function SaveLoadModal({
  mode,
  slots,
  scenarios,
  playerId,
  currentLoopId,
  isBusy,
  canSave,
  saveLabelInput,
  onSaveLabelChange,
  onSave,
  onLoadSlot,
  onOverwriteSlot,
  onDeleteSlot,
  onClose,
}: SaveLoadModalProps) {
  const { t, lang } = useLang();

  const pageCount = Math.max(1, Math.ceil(slots.length / PAGE_SIZE));
  // The modal remounts on each open (conditionally rendered), so page starts at 0
  // per open. `safePage` clamps if the list shrinks (e.g. after a save reload).
  const [page, setPage] = useState(0);
  // Two-click destructive confirm (no browser dialogs): first click arms the
  // slot's button ("확인?"), second click executes; arming resets on other clicks.
  const [confirmSlotId, setConfirmSlotId] = useState<string | null>(null);
  const safePage = Math.min(page, pageCount - 1);
  const pageSlots = slots.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const scenarioName = (id?: string): string =>
    scenarios.find((s) => s.id === id)?.name || id || "";

  // The slot stores the archetype's display name (already glossary-localized at the
  // serving boundary), so render it directly.
  const archetypeName = (slot: SaveSlot): string => slot.archetype || "";

  const loadMode = mode === "load";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel sl-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sl-modal-head">
          <h2>{loadMode ? t("sl.loadTitle") : t("sl.saveTitle")}</h2>
          <button className="sl-close" onClick={onClose} aria-label={t("sl.close")}>
            ✕
          </button>
        </div>

        {!loadMode && canSave && (
          <div className="sl-save-row">
            <input
              type="text"
              placeholder={t("save.descPlaceholder")}
              value={saveLabelInput}
              onChange={(e) => onSaveLabelChange(e.target.value)}
            />
            <button onClick={onSave} disabled={isBusy}>
              {t("sl.saveBtn")}
            </button>
          </div>
        )}

        <div className="sl-grid">
          {slots.length === 0 && <div className="sl-empty">{t("save.none")}</div>}
          {pageSlots.map((slot) => {
            const isCurrent = !!currentLoopId && slot.loop_id === currentLoopId;
            const character = [slot.display_name, archetypeName(slot)]
              .filter(Boolean)
              .join(" · ");
            const clickable = loadMode && !!playerId && !isBusy;
            return (
              <div
                key={slot.slot_id || slot.loop_id}
                className={`sl-card ${isCurrent ? "current" : ""} ${clickable ? "clickable" : ""}`}
                onClick={
                  clickable
                    ? () =>
                        onLoadSlot({
                          playerId: playerId as string,
                          scenarioId: slot.scenario_id || "neo-seoul",
                          loopId: slot.loop_id,
                          slotId: slot.slot_id,
                        })
                    : undefined
                }
              >
                <div className="sl-thumb">
                  {slot.thumb_url ? (
                    <img src={slot.thumb_url} alt="" loading="lazy" />
                  ) : (
                    <span className="sl-thumb-ph">◍</span>
                  )}
                  {slot.in_combat && <span className="sl-thumb-combat">⚔</span>}
                </div>

                <div className="sl-body">
                  <div className="sl-card-top">
                    <span className="sl-scenario">{scenarioName(slot.scenario_id)}</span>
                    {isCurrent && <span className="sl-current">{t("sl.current")}</span>}
                  </div>

                  <div className="sl-title">
                    {slot.label || slot.scene_title || t("save.autosave")}
                  </div>
                  {slot.scene_title && slot.scene_title !== slot.label && (
                    <div className="sl-scene">{slot.scene_title}</div>
                  )}

                  <div className="sl-meta">
                    {character && <span className="sl-char">👤 {character}</span>}
                    <span>
                      {t("sl.turn")} {slot.turn_index ?? 0} · {slot.phase || "—"}
                    </span>
                  </div>

                  <div className="sl-stats">
                    <span>
                      {t("sl.stability")} {slot.stability ?? 0}
                    </span>
                    <span>
                      {t("sl.tension")} {slot.tension ?? 0}
                    </span>
                  </div>

                  <div className="sl-foot">
                    <span className="sl-date">{slotDate(slot.saved_at, lang)}</span>
                    {loadMode && (
                      <button
                        className="sl-load-btn"
                        disabled={!clickable}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (playerId) {
                            onLoadSlot({
                              playerId,
                              scenarioId: slot.scenario_id || "neo-seoul",
                              loopId: slot.loop_id,
                              slotId: slot.slot_id,
                            });
                          }
                        }}
                      >
                        {t("sl.loadBtn")}
                      </button>
                    )}
                    {!loadMode && canSave && slot.metadata?.manual && slot.slot_id && (
                      <button
                        className="sl-load-btn"
                        disabled={isBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirmSlotId === `ow:${slot.slot_id}`) {
                            setConfirmSlotId(null);
                            onOverwriteSlot(slot);
                          } else {
                            setConfirmSlotId(`ow:${slot.slot_id}`);
                          }
                        }}
                      >
                        {confirmSlotId === `ow:${slot.slot_id}`
                          ? t("sl.confirmBtn")
                          : t("sl.overwriteBtn")}
                      </button>
                    )}
                    {slot.slot_id && (
                      <button
                        className="sl-load-btn sl-delete-btn"
                        disabled={isBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirmSlotId === `del:${slot.slot_id}`) {
                            setConfirmSlotId(null);
                            onDeleteSlot(slot);
                          } else {
                            setConfirmSlotId(`del:${slot.slot_id}`);
                          }
                        }}
                      >
                        {confirmSlotId === `del:${slot.slot_id}`
                          ? t("sl.confirmBtn")
                          : t("sl.deleteBtn")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {pageCount > 1 && (
          <div className="sl-pager">
            <button
              className="sl-page-btn"
              disabled={safePage <= 0}
              onClick={() => setPage(safePage - 1)}
              aria-label={t("sl.prev")}
            >
              ‹
            </button>
            <span className="sl-page-ind">
              {safePage + 1} / {pageCount}
            </span>
            <button
              className="sl-page-btn"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              aria-label={t("sl.next")}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
