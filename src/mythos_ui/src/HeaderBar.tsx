import { useLang } from "./i18n/lang";
import { useConciseMode } from "./conciseMode";

interface HeaderBarProps {
  connected: boolean;
  displayName: string;
  selectedScenarioId: string;
  playerName?: string;
  archetype?: string;
  selectedArchetype?: string | null;
  bgmEnabled: boolean;
  bgmReady: boolean;
  onToggleBgm: () => void;
  onLeaveSession: () => void;
}

export function HeaderBar({
  connected,
  displayName,
  selectedScenarioId,
  playerName,
  archetype,
  selectedArchetype,
  bgmEnabled,
  bgmReady,
  onToggleBgm,
  onLeaveSession,
}: HeaderBarProps) {
  const { lang, setLang, t } = useLang();
  const { conciseMode, toggleConciseMode } = useConciseMode();
  return (
    <header>
      <div className="brand">
        <h1>{t("hdr.brand")}</h1>
        {/* Dev/flavor subtitle — hidden on mobile (CSS) to keep the header one row. */}
        <span className="sub brand-sub">MythOS React SPA · WS Streamer + Canvas Radar</span>
      </div>
      <div className="spacer"></div>
      {/* The three toggles carry both a full label (desktop) and a compact glyph
          (mobile); CSS swaps which shows so the header collapses to icons on phones
          without changing the desktop text or the test-locked classNames. */}
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setLang(lang === "ko" ? "en" : "ko")}
        title={t("lang.switch")}
        aria-label={t("lang.switch")}
      >
        {lang === "ko" ? "EN" : "KO"}
      </button>
      <button
        type="button"
        className={`concise-toggle ${conciseMode ? "is-on" : "is-off"}`}
        aria-pressed={conciseMode}
        onClick={toggleConciseMode}
        title={conciseMode ? t("hdr.conciseOff") : t("hdr.conciseOn")}
      >
        <span className="ctl-ico" aria-hidden="true">▤</span>
        <span className="ctl-lbl">COMPACT {conciseMode ? "ON" : "OFF"}</span>
      </button>
      <button
        type="button"
        className={`bgm-toggle ${bgmEnabled ? "is-on" : "is-off"}`}
        aria-pressed={bgmEnabled}
        onClick={onToggleBgm}
        title={bgmEnabled && bgmReady ? t("hdr.bgmOff") : t("hdr.bgmOn")}
      >
        <span className="ctl-ico" aria-hidden="true">♪</span>
        <span className="ctl-lbl">BGM {bgmEnabled ? (bgmReady ? "ON" : "START") : "OFF"}</span>
      </button>
      {connected && (
        <>
          {/* Desktop: inline session chip. */}
          <div className="controls" id="session-chip">
            <span className="sub" id="session-info">
              {playerName || displayName} · {selectedScenarioId} ·{" "}
              {archetype || selectedArchetype || ""}
            </span>
            <button onClick={onLeaveSession} id="leave">
              {t("hdr.leave")}
            </button>
          </div>
          {/* Mobile: overflow menu (native details) holding the session info + leave. */}
          <details className="hdr-overflow">
            <summary aria-label={t("hdr.leave")}>⋯</summary>
            <div className="hdr-overflow-menu">
              <span className="sub">
                {playerName || displayName} · {selectedScenarioId}
                {archetype || selectedArchetype ? ` · ${archetype || selectedArchetype}` : ""}
              </span>
              <button onClick={onLeaveSession} className="leave-btn">
                {t("hdr.leave")}
              </button>
            </div>
          </details>
        </>
      )}
    </header>
  );
}
