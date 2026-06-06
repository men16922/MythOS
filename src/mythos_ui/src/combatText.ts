import type { CombatIntent } from "./types";

export function enemyIntentLabel(intent: CombatIntent | undefined): string {
  if (!intent) return "";
  if (intent.action === "attack") {
    return ` (⚔️ ${intent.target_name || "공격"})`;
  }
  if (intent.action === "move") {
    return " (👣 이동)";
  }
  if (intent.action === "flee") {
    return " (🏃 도주)";
  }
  return "";
}
