import type { StringKey } from "./i18n/strings.ko";
import type { SceneChoice } from "./types";

type TFn = (key: StringKey) => string;

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

export function choiceRequirementLabel(choice: SceneChoice, t: TFn): string {
  if (!choice.requires) return "";
  const labels: string[] = [];
  if (choice.requires.stability_min !== undefined) {
    labels.push(`${t("choice.reqStability")}: ${choice.requires.stability_min}`);
  }
  if (choice.requires.tension_max !== undefined) {
    labels.push(`${t("choice.reqTension")}: ${choice.requires.tension_max}`);
  }
  return labels.length > 0 ? ` [${labels.join("] [")}]` : "";
}

export function choiceCostLabel(choice: SceneChoice, t: TFn): string {
  if (!choice.cost) return "";
  const stability = choice.cost.stability || 0;
  const tension = choice.cost.tension || 0;
  const changes: string[] = [];
  if (stability !== 0) {
    changes.push(`${t("choice.costStability")} ${stability > 0 ? "+" : ""}${stability}`);
  }
  if (tension !== 0) {
    changes.push(`${t("choice.costTension")} ${tension > 0 ? "+" : ""}${tension}`);
  }
  return changes.length > 0 ? ` (${changes.join(", ")})` : "";
}

// Restyles a server-authored stat tag as a narrative approach, not a mechanical
// check. The current choice pipeline does not roll or gate on these labels, so
// `(Agility 12+)` would promise a rule that does not exist; `[Approach: Agility]`
// keeps the authored intent without the false affordance. Matches KO and EN.
const _CHOICE_STAT_TAGS = [
  "근력", "지능", "매력", "민첩", "관측", "통찰",
  "Strength", "Intellect", "Intelligence", "Charisma", "Agility", "Observation", "Perception", "Insight",
];

export function cleanChoiceLabel(label: string, statApproachLabel: string): string {
  if (!label) return "";
  let cleaned = label;
  for (const stat of _CHOICE_STAT_TAGS) {
    const regex = new RegExp(`\\((${stat})[^)]*\\)`, "g");
    cleaned = cleaned.replace(regex, `[${statApproachLabel}: $1]`);
  }
  return cleaned;
}
