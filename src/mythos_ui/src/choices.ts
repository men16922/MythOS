import type { SceneChoice } from "./types";

export function isChoiceDisabled(
  choice: SceneChoice,
  stability: number,
  tension: number
): boolean {
  const stabilityInvalid =
    choice.requires?.stability_min !== undefined &&
    stability < choice.requires.stability_min;
  const tensionInvalid =
    choice.requires?.tension_max !== undefined && tension > choice.requires.tension_max;
  return stabilityInvalid || tensionInvalid;
}

export function choiceRequirementLabel(choice: SceneChoice): string {
  if (!choice.requires) return "";
  const labels: string[] = [];
  if (choice.requires.stability_min !== undefined) {
    labels.push(`필요 안정성: ${choice.requires.stability_min}`);
  }
  if (choice.requires.tension_max !== undefined) {
    labels.push(`제한 긴장도: ${choice.requires.tension_max}`);
  }
  return labels.length > 0 ? ` [${labels.join("] [")}]` : "";
}

export function choiceCostLabel(choice: SceneChoice): string {
  if (!choice.cost) return "";
  const stability = choice.cost.stability || 0;
  const tension = choice.cost.tension || 0;
  const changes: string[] = [];
  if (stability !== 0) {
    changes.push(`안정성 ${stability > 0 ? "+" : ""}${stability}`);
  }
  if (tension !== 0) {
    changes.push(`긴장도 ${tension > 0 ? "+" : ""}${tension}`);
  }
  return changes.length > 0 ? ` (${changes.join(", ")})` : "";
}
