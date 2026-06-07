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
  return (
    <header>
      <div className="brand">
        <h1>세계 : 접속</h1>
        <span className="sub">MythOS React SPA · WS Streamer + Canvas Radar</span>
      </div>
      <div className="spacer"></div>
      <button
        type="button"
        className={`bgm-toggle ${bgmEnabled ? "is-on" : "is-off"}`}
        aria-pressed={bgmEnabled}
        onClick={onToggleBgm}
        title={bgmEnabled && bgmReady ? "BGM 끄기" : "BGM 켜기"}
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
            접속 종료
          </button>
        </div>
      )}
    </header>
  );
}
