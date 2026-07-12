import React from "react";
import type { CombatBlip } from "./types";
import { useCombatCinema } from "./hooks/useCombatCinema";
import { useLang } from "./i18n/lang";

interface CombatCinemaProps {
  scenarioId: string;
  attacker: CombatBlip;
  defender: CombatBlip;
  damage: number;
  kind?: "attack" | "skill" | "defend";
  crit?: boolean;
  skillName?: string;
  itemId?: string;
  miss?: boolean;
  onFinish?: () => void;
  onImpact?: (defenderId: string, damage: number) => void; // HP 실시간 동기화 콜백
  onCue?: (cue: "enter" | "windup" | "impact" | "exit") => void;
  // Tap-to-skip: flush this and every queued cinema, settle to the board.
  onSkip?: () => void;
}

export const CombatCinema: React.FC<CombatCinemaProps> = ({
  scenarioId,
  attacker,
  defender,
  damage,
  kind,
  crit = false,
  skillName,
  itemId,
  miss = false,
  onFinish,
  onImpact,
  onCue,
  onSkip,
}) => {
  const [itemImgError, setItemImgError] = React.useState(false);
  // Skip grace: a double-click on the action button lands its second press on
  // this overlay and used to flush the whole queue instantly — the cut-in
  // "never appeared". Ignore skips in the first 350ms after mount.
  const mountedAtRef = React.useRef(0);
  React.useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);
  const handleSkip = onSkip
    ? () => {
        if (mountedAtRef.current !== 0 && Date.now() - mountedAtRef.current > 350) onSkip();
      }
    : undefined;
  const { lang } = useLang();
  const {
    phase,
    imgError,
    setImgError,
    mode,
    isDefend,
    isSelfTarget,
    isFast,
    attackerPose,
    defenderPose,
    attackerSrc,
    defenderSrc,
    skillMeta,
    skillImgSrc,
    hasSkillCard,
    actionSignal,
    hasSignal,
    factionCol,
  } = useCombatCinema(
    scenarioId,
    attacker,
    defender,
    damage,
    kind,
    skillName,
    miss,
    onFinish,
    onImpact,
    onCue
  );

  const renderActorImage = (b: CombatBlip, src: string, side: "left" | "right") => {
    if (!src) {
      return <div className="cinema-fallback-glyph">{b.name?.slice(0, 1) || b.id.slice(0, 1)}</div>;
    }
    return (
      <img
        className={`cinema-portrait ${side === "right" ? "defender" : "attacker"}`}
        src={src}
        alt={b.name || b.id}
        draggable={false}
      />
    );
  };

  return (
    <div
      className={`cinema-overlay mode-${mode} phase-${phase} ${isFast ? "fast-speed" : ""} ${isSelfTarget ? "self-target" : ""}`}
      onPointerDown={handleSkip}
    >
      {onSkip && (
        <div className="cinema-skip-hint">{lang === "en" ? "TAP TO SKIP ▸▸" : "탭하여 스킵 ▸▸"}</div>
      )}
      <div className={`cinema-strip ${hasSkillCard ? "has-skill" : ""} ${isDefend ? "has-defend" : ""} ${hasSignal ? "has-signal" : ""} ${isSelfTarget ? "self-target-strip" : ""}`}>
        {/* Attacker (Left Side) */}
        <div className="actor-side left">
          <span className="actor-name-tag" style={{ color: factionCol(attacker.faction) }}>
            {attacker.name || attacker.id}
          </span>
          <div
            className="cinema-card"
            style={{
              borderColor: factionCol(attacker.faction),
              boxShadow: `0 0 14px ${factionCol(attacker.faction)}, inset 0 0 10px ${factionCol(attacker.faction)}`,
            }}
          >
            {renderActorImage(attacker, attackerSrc, "left")}
          </div>
          <span className="actor-label" style={{ borderColor: `${factionCol(attacker.faction)}40`, color: factionCol(attacker.faction) }}>
            {attacker.faction.toUpperCase()} // {attackerPose.toUpperCase()}
          </span>
        </div>

        {/* Projectile (Only in basic attack mode during the attack phase) */}
        {mode === "attack" && phase === "attack" && (
          <div
            className="cinema-projectile"
            style={{ "--proj-color": factionCol(attacker.faction) } as React.CSSProperties}
          />
        )}

        {/* Skill Card (Center Poster) */}
        {hasSkillCard && skillMeta && (
          <div className="skill-side">
            <span className="skill-role-tag" style={{ color: skillMeta.color }}>
              {skillMeta.role}
            </span>
            <div
              className="cinema-card skill-card"
              style={{
                borderColor: skillMeta.color,
                boxShadow: `0 0 16px ${skillMeta.color}, inset 0 0 12px ${skillMeta.color}`,
              }}
            >
              {!imgError && skillImgSrc ? (
                <img
                  className="skill-illustration"
                  src={skillImgSrc}
                  alt={lang === "en" ? skillMeta.nameEn : skillMeta.nameKo}
                  onError={() => setImgError(true)}
                  draggable={false}
                />
              ) : (
                /* Procedural Neon Glitch Card Fallback */
                <div className="procedural-skill-bg" style={{ "--skill-color": skillMeta.color } as React.CSSProperties}>
                  <div className="tech-grid"></div>
                  <div className="skill-icon-huge">{skillMeta.icon}</div>
                  <div className="glitch-code-specs">
                    {skillMeta.glitchCodes.map((code, idx) => (
                      <div key={idx} className="spec-line">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Tech corner frame inside card */}
              <div className="tech-corner top-left" style={{ borderColor: skillMeta.color }}></div>
              <div className="tech-corner top-right" style={{ borderColor: skillMeta.color }}></div>
              <div className="tech-corner bottom-left" style={{ borderColor: skillMeta.color }}></div>
              <div className="tech-corner bottom-right" style={{ borderColor: skillMeta.color }}></div>
            </div>
            <span className="skill-title-tag" style={{ color: skillMeta.color, borderColor: `${skillMeta.color}60`, borderStyle: 'solid', borderWidth: '1px' }}>
              {skillMeta.icon} {lang === "en" ? skillMeta.nameEn : skillMeta.nameKo}
            </span>
          </div>
        )}

        {/* Thrown item card: grenade art beats the generic ATTACK widget. */}
        {!hasSkillCard && itemId && !itemImgError && (
          <div className="action-signal-side item-card-side" style={{ "--signal-color": "#ffd76a" } as React.CSSProperties}>
            <div
              className="cinema-card signal-card item-card"
              style={{
                borderColor: "#ffd76a",
                boxShadow: "0 0 14px #ffd76a, inset 0 0 10px rgba(255,215,106,0.5)",
              }}
            >
              <img
                className="item-illustration"
                src={`/resources/${scenarioId}/items/${itemId}.png`}
                alt={itemId}
                draggable={false}
                onError={() => setItemImgError(true)}
              />
              <div className="signal-code">CMD: ORDNANCE_OUT</div>
            </div>
          </div>
        )}

        {/* Action Signal Card (Center Poster for basic actions) */}
        {!hasSkillCard && (!itemId || itemImgError) && actionSignal && (
          <div className="action-signal-side" style={{ "--signal-color": actionSignal.color } as React.CSSProperties}>
            <div
              className="cinema-card signal-card"
              style={{
                borderColor: actionSignal.color,
                boxShadow: `0 0 12px ${actionSignal.color}, inset 0 0 8px ${actionSignal.color}`,
              }}
            >
              <div className="signal-grid"></div>
              <div className="signal-icon">{actionSignal.icon}</div>
              <div className="signal-code">{actionSignal.code}</div>
              <div className="signal-label">{actionSignal.type}</div>
            </div>
          </div>
        )}

        {/* Floating damage pop (hidden during DEFEND to prevent duplicates).
            Zero-damage non-miss blows (EMP stun, buffs) render no number — the
            skill card is the feedback; "-0" read as a broken hit (owner 2026-07-11). */}
        {!isDefend && (miss || damage > 0) && (
          <div className={`damage-number ${(miss ? "evade" : (crit ? "critical" : ""))}`}>
            {miss ? "MISS" : (crit ? `CRIT! -${damage}` : `-${damage}`)}
          </div>
        )}

        {/* Defender (Right Side) */}
        <div className="actor-side right">
          <span className="actor-name-tag" style={{ color: factionCol(defender.faction) }}>
            {defender.name || defender.id}
          </span>
          <div
            className="cinema-card"
            style={{
              borderColor: factionCol(defender.faction),
              boxShadow: `0 0 14px ${defender.faction === "enemy" ? "#ff6b7d" : "#8fffea"}, inset 0 0 10px ${defender.faction === "enemy" ? "#ff6b7d" : "#8fffea"}`,
            }}
          >
            {renderActorImage(defender, defenderSrc, "right")}
            {/* Impact linkage: energy slashes sweep ACROSS the target card on
                the impact frame so the blow visibly lands (vs. shake alone). */}
            {!isDefend && !miss && (
              <>
                <div className="impact-slash a" aria-hidden="true" />
                <div className="impact-slash b" aria-hidden="true" />
              </>
            )}
          </div>
          <span className="actor-label" style={{ borderColor: `${factionCol(defender.faction)}40`, color: factionCol(defender.faction) }}>
            {defender.faction.toUpperCase()} // {defenderPose.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};
