import type { CombatState } from "./types";

function factionColor(faction: string): string {
  if (faction === "player") return "var(--term)";
  if (faction === "ally") return "#7dff9b";
  return "var(--danger)";
}

interface CombatRosterProps {
  combat: CombatState;
  scenarioId: string;
}

export function CombatRoster({ combat, scenarioId }: CombatRosterProps) {
  const blips = combat.radar?.blips || [];
  const party = blips.filter((b) => b.faction === "player" || b.faction === "ally");
  const enemies = blips.filter((b) => b.faction === "enemy");

  const renderCard = (b: typeof blips[0]) => {
    const alive = b.alive !== false;
    const hpRatio = b.hp / (b.max_hp || 1);
    const hpPercent = Math.max(0, Math.min(100, hpRatio * 100));

    const focusVal = b.focus ?? 0;
    const maxFocusVal = b.max_focus ?? 0;

    let portraitUrl = b.portrait ? `/resources/${scenarioId}/${b.portrait}` : null;
    if (b.faction === "player" && !portraitUrl) {
      portraitUrl = `/resources/${scenarioId}/characters/player-noise.png`;
    }
    const isCurrent = combat.radar?.current === b.id;
    const isActiveActor = combat.available?.active_actor_id === b.id;

    return (
      <div
        key={b.id}
        className={`roster-card ${isCurrent ? "active-turn" : ""} ${
          isActiveActor ? "active-actor-turn" : ""
        } ${!alive ? "dead" : ""}`}
      >
        <div className="roster-avatar-wrapper">
          {portraitUrl ? (
            <img src={portraitUrl} className="roster-avatar-img" alt="" />
          ) : (
            <div className="roster-avatar-placeholder" style={{ background: factionColor(b.faction) }}>
               {b.name?.slice(0, 1) || "?"}
            </div>
          )}
          {isCurrent && (
            <div className={`roster-active-badge ${isActiveActor ? "active-actor" : ""}`}>
              {isActiveActor ? "ACTIVE" : "TURN"}
            </div>
          )}
        </div>
        <div className="roster-info">
          <div className="roster-header-row">
            <span className="roster-name">{b.name || b.id}</span>
            {b.defending && <span className="roster-status-badge">방어</span>}
          </div>

          {alive ? (
            <>
              <div className="roster-hp-bar-container">
                <div
                  className="roster-hp-bar-fill"
                  style={{
                    width: `${hpPercent}%`,
                    background: hpRatio > 0.5 ? "var(--term)" : hpRatio > 0.25 ? "#ffd76a" : "var(--danger)"
                  }}
                ></div>
              </div>
              <div className="roster-stats-row">
                <span>HP {b.hp}/{b.max_hp}</span>
                <span>POS {b.x},{b.y}</span>
                {maxFocusVal > 0 && <span>FOCUS {focusVal}/{maxFocusVal}</span>}
              </div>
            </>
          ) : (
            <div className="roster-dead-text">전투 불능 (KO)</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="combat-roster" className="combat-rosters-grid">
      <div className="roster-section">
        <div className="roster-section-title">PARTY</div>
        <div className="roster-list">
          {party.map(renderCard)}
        </div>
      </div>
      <div className="roster-section">
        <div className="roster-section-title">ENEMY</div>
        <div className="roster-list">
          {enemies.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
