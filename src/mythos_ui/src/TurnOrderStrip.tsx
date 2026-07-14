import type { CombatRadar } from "./types";
import { useLang } from "./i18n/lang";

interface TurnOrderStripProps {
  radar: CombatRadar;
  scenarioId: string;
}

/**
 * Two-tier slice 4 (owner GO 2026-07-14): XCOM2-style turn-order strip.
 *
 * Renders the engine's initiative order (radar.turn_order, already in the
 * payload) rotated so the acting unit leads, one compact chip per living
 * combatant: sprite thumb + faction ring + 💫 stun marker + the enemy's
 * telegraphed intent (⚔ damage dice / 👣 move). Passive lens only — no new
 * interactions, so the casual tier can ignore it entirely. Hidden in
 * landscape-coarse combat via CSS to preserve the LC one-screen bar.
 */
export function TurnOrderStrip({ radar, scenarioId }: TurnOrderStripProps) {
  const { t } = useLang();
  const order = radar.turn_order || [];
  if (order.length < 2) return null;
  const blipById = new Map(radar.blips.map((b) => [b.id, b]));
  const currentIdx = Math.max(0, order.indexOf(radar.current || ""));
  const rotated = [...order.slice(currentIdx), ...order.slice(0, currentIdx)];
  const upcoming = rotated
    .map((id) => blipById.get(id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b && b.alive !== false));
  if (upcoming.length < 2) return null;
  const intentByEnemy = new Map(
    (radar.enemy_intents || []).map((i) => [i.enemy_id, i]),
  );

  return (
    <div className="turn-order-strip" aria-label={t("story.board.turnOrder")}>
      <span className="turn-order-label">{t("story.board.turnOrder")}</span>
      <div className="turn-order-chips">
        {upcoming.map((b, i) => {
          const img = b.combat_images?.idle || b.portrait;
          const url = img ? `/resources/${scenarioId}/${img}` : null;
          const stunned = (b.status || []).includes("stunned");
          const intent = b.faction === "enemy" ? intentByEnemy.get(b.id) : undefined;
          const intentMark =
            intent?.action === "attack"
              ? `⚔${intent.damage_hint || ""}`
              : intent?.action === "move"
                ? "👣"
                : intent?.action === "flee"
                  ? "🏃"
                  : null;
          const title = [
            b.name || b.id,
            stunned ? t("story.board.turnOrderStunned") : null,
            intent?.action === "attack" && intent.target_name
              ? `⚔ ${intent.damage_hint || ""} → ${intent.target_name}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <span
              key={`${b.id}-${i}`}
              className={`turn-chip faction-${b.faction}${i === 0 ? " turn-chip-active" : ""}${
                stunned ? " turn-chip-stunned" : ""
              }`}
              title={title}
            >
              {url ? (
                <img src={url} className="turn-chip-img" alt="" loading="lazy" />
              ) : (
                <span className="turn-chip-glyph">{(b.name || b.id).slice(0, 1)}</span>
              )}
              {stunned && <span className="turn-chip-badge">💫</span>}
              {!stunned && intentMark && (
                <span className="turn-chip-badge turn-chip-intent">{intentMark}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
