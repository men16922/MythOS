import { useLang } from "./i18n/lang";

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
  return (
    <header>
      <div className="brand">
        <h1>세계 : 접속</h1>
        <span className="sub">MythOS React SPA · WS Streamer + Canvas Radar</span>
      </div>
      <div className="spacer"></div>
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setLang(lang === "ko" ? "en" : "ko")}
        title={t("lang.switch")}
        aria-label={t("lang.switch")}
      >
        {lang === "ko" ? "EN" : "한국어"}
      </button>
      <button
        type="button"
        className={`bgm-toggle ${bgmEnabled ? "is-on" : "is-off"}`}
        aria-pressed={bgmEnabled}
        onClick={onToggleBgm}
        title={bgmEnabled && bgmReady ? t("hdr.bgmOff") : t("hdr.bgmOn")}
      >
        BGM {bgmEnabled ? (bgmReady ? "ON" : "START") : "OFF"}
      </button>
      {connected && (
        <div className="controls" id="session-chip">
          <span className="sub" id="session-info">
            {playerName || displayName} · {selectedScenarioId} ·{" "}
            {archetype || selectedArchetype || ""}
          </span>
          <button onClick={onLeaveSession} id="leave">
            {t("hdr.leave")}
          </button>
        </div>
      )}
    </header>
  );
}
