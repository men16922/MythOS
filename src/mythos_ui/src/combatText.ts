import type { StringKey } from "./i18n/strings.ko";
import type { CombatIntent } from "./types";

type TFn = (key: StringKey) => string;

// First-combat tutorial step order (A2): each step advances only when the
// player actually performs that action. Shared by App (action matching) and
// CombatTutorial (card rendering); lives here so component files stay
// component-only (react-refresh).
export const COMBAT_TUTORIAL_STEPS = ["move", "attack", "skill", "defend"] as const;
export type CombatTutorialStep = (typeof COMBAT_TUTORIAL_STEPS)[number];

export function enemyIntentLabel(intent: CombatIntent | undefined, t: TFn): string {
  if (!intent) return "";
  if (intent.action === "attack") {
    return ` (⚔️ ${intent.target_name || t("ci.intent.attack")})`;
  }
  if (intent.action === "move") {
    return ` (👣 ${t("ci.intent.move")})`;
  }
  if (intent.action === "flee") {
    return ` (🏃 ${t("ci.intent.flee")})`;
  }
  return "";
}
