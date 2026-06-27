import type { ScenarioArchetype } from "./types";

/**
 * The id of the first archetype that isn't explicitly locked, or null when none
 * are available. Used both by onboarding (initial selection) and on scenario
 * change to default the archetype picker to a playable option.
 */
export const firstUnlockedArchetype = (archetypes: ScenarioArchetype[]) =>
  archetypes.find((archetype) => archetype.unlocked !== false)?.id || null;
