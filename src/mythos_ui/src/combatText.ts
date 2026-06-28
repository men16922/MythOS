import type { StringKey } from "./i18n/strings.ko";
import type { CombatIntent } from "./types";

type TFn = (key: StringKey) => string;

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
