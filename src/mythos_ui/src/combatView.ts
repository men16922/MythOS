// Shared read-only view helpers for a CombatBlip.
//
// Before this module the same four judgements — which colour a faction gets,
// whether a blip is alive, its HP ratio, and which sprite to draw — were
// re-derived inline in six surfaces (canvas, roster, cinema, VFX, story panel,
// turn-order strip), with small drifts between copies: the cinema drew allies in
// the player colour while its own VFX drew them green, and each sprite chain
// fell back in a slightly different order. One definition each, here.
//
// Deliberately NOT unified: DevConsolePanel's radar uses a separate debug
// palette (Tailwind greens/blues) so the dev tool reads as a dev tool.
import type { CombatBlip } from "./types";

export type Faction = CombatBlip["faction"];
export type CombatPose = "idle" | "attack" | "skill" | "hit" | "guard";

/** Hex palette for <canvas> and inline VFX, where CSS variables do not resolve. */
export const FACTION_HEX: Record<Faction, string> = {
  player: "#8fffea",
  ally: "#7dff9b",
  enemy: "#ff6b7d",
};

export function factionColor(faction: string): string {
  return FACTION_HEX[faction as Faction] ?? FACTION_HEX.enemy;
}

/**
 * DOM variant: player/enemy follow the theme tokens so the roster re-tints with
 * the CSS theme; ally has no token and keeps its hex.
 */
export function factionCssColor(faction: string): string {
  if (faction === "player") return "var(--term)";
  if (faction === "ally") return FACTION_HEX.ally;
  return "var(--danger)";
}

/** HP bar colour by remaining ratio (hex, for canvas). */
export function hpBandColor(ratio: number): string {
  return ratio > 0.5 ? FACTION_HEX.ally : ratio > 0.25 ? "#ffd76a" : FACTION_HEX.enemy;
}

/** HP bar colour by remaining ratio (theme tokens, for DOM). */
export function hpBandCssColor(ratio: number): string {
  return ratio > 0.5 ? "var(--term)" : ratio > 0.25 ? "#ffd76a" : "var(--danger)";
}

/** The server omits `alive` for living blips and sends `false` for the dead. */
export function isAlive(b: { alive?: boolean }): boolean {
  return b.alive !== false;
}

/**
 * Remaining HP as 0..1. A server-provided `hp_ratio` wins (it is what the
 * cinema queue projects mid-animation); otherwise hp/max_hp, and 1 when
 * max_hp is missing so a malformed blip never renders as dead or NaN.
 */
export function hpRatio(b: Pick<CombatBlip, "hp" | "max_hp" | "hp_ratio">): number {
  if (b.hp_ratio != null) return b.hp_ratio;
  if (b.max_hp > 0) return b.hp / b.max_hp;
  return 1;
}

/** Relative path of the placeholder drawn for a player with no authored art. */
export const PLAYER_FALLBACK_SPRITE = "characters/player-noise.png";

// Per-pose fallback order. Transparent combat sprites are preferred over the
// bestiary `portrait` (full scene illustrations that render as a busy box in a
// small avatar), so every chain exhausts sprites before reaching the portrait.
const POSE_FALLBACKS: Record<CombatPose, CombatPose[]> = {
  idle: ["idle", "guard", "skill"],
  attack: ["attack", "idle"],
  skill: ["skill", "idle"],
  hit: ["hit", "idle"],
  guard: ["guard", "skill", "idle"],
};

export interface BlipImageOptions {
  /** Fall back to PLAYER_FALLBACK_SPRITE for a player blip with no art. */
  playerFallback?: boolean;
}

/** Scenario-relative sprite path for a blip and pose, or "" when it has none. */
export function blipImagePath(
  b: Pick<CombatBlip, "faction" | "portrait" | "combat_images">,
  pose: CombatPose = "idle",
  opts: BlipImageOptions = {},
): string {
  const images = b.combat_images || {};
  for (const candidate of POSE_FALLBACKS[pose]) {
    const path = images[candidate];
    if (path) return path;
  }
  if (b.portrait) return b.portrait;
  if (opts.playerFallback && b.faction === "player") return PLAYER_FALLBACK_SPRITE;
  return "";
}

/** Absolute resource URL for `blipImagePath`, or "" when the blip has no art. */
export function blipImageUrl(
  scenarioId: string,
  b: Pick<CombatBlip, "faction" | "portrait" | "combat_images">,
  pose: CombatPose = "idle",
  opts: BlipImageOptions = {},
): string {
  const path = blipImagePath(b, pose, opts);
  return path ? `/resources/${scenarioId}/${path}` : "";
}
