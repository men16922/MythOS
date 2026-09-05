import { useLang } from "./i18n/lang";
import type { CombatState } from "./types";
import { blipImageUrl, factionCssColor, hpBandCssColor, hpRatio, isAlive } from "./combatView";

interface CombatRosterProps {
  combat: CombatState;
  scenarioId: string;
}

export function CombatRoster({ combat, scenarioId }: CombatRosterProps) {
  const { t } = useLang();
  const blips = combat.radar?.blips || [];
  const party = blips.filter((b) => b.faction === "player" || b.faction === "ally");
  const enemies = blips.filter((b) => b.faction === "enemy");

  const renderCard = (b: typeof blips[0]) => {
    const alive = isAlive(b);
    const ratio = hpRatio(b);
    const hpPercent = Math.max(0, Math.min(100, ratio * 100));

    const focusVal = b.focus ?? 0;
    const maxFocusVal = b.max_focus ?? 0;

    // Transparent combat sprite before the bestiary `portrait` (a busy scene box
    // in a small avatar), then the player placeholder — see combatView.
    const portraitUrl = blipImageUrl(scenarioId, b, "idle", { playerFallback: true }) || null;
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
            <div className="roster-avatar-placeholder" style={{ background: factionCssColor(b.faction) }}>
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
            {b.defending && <span className="roster-status-badge">{t("roster.defending")}</span>}
            {(b.defense_buff ?? 0) > 0 && (
              <span className="roster-status-badge buff">
                DEF+{b.defense_buff}
                {(b.defense_buff_turns ?? 0) > 0 &&
                  ` · ${b.defense_buff_turns}${t("roster.turnsSuffix")}`}
              </span>
            )}
            {b.enraged && <span className="roster-status-badge enraged">{t("roster.enraged")}</span>}
            {(b.status || []).map((st) => (
              <span key={st} className="roster-status-badge debuff">
                {st === "stunned" ? t("roster.stunned") : st}
              </span>
            ))}
          </div>

          {alive ? (
            <>
              <div className="roster-hp-bar-container">
                <div
                  className="roster-hp-bar-fill"
                  style={{
                    width: `${hpPercent}%`,
                    background: hpBandCssColor(ratio)
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
            <div className="roster-dead-text">{t("roster.down")}</div>
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
      <div className="roster-section roster-section--enemy">
        <div className="roster-section-title">ENEMY</div>
        <div className="roster-list">
          {enemies.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
