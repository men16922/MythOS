interface HeaderBarProps {
  connected: boolean;
  displayName: string;
  selectedScenarioId: string;
  playerName?: string;
  archetype?: string;
  selectedArchetype?: string | null;
  onLeaveSession: () => void;
}

export function HeaderBar({
  connected,
  displayName,
  selectedScenarioId,
  playerName,
  archetype,
  selectedArchetype,
  onLeaveSession,
}: HeaderBarProps) {
  return (
    <header>
      <div className="brand">
        <h1>세계 : 접속</h1>
        <span className="sub">MythOS React SPA · WS Streamer + Canvas Radar</span>
      </div>
      <div className="spacer"></div>
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
