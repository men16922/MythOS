import { choiceCostLabel, choiceRequirementLabel, isChoiceDisabled, cleanChoiceLabel } from "./choices";
import type { SceneChoice } from "./types";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";

interface ChoicePanelProps {
  choices: SceneChoice[];
  stability: number;
  tension: number;
  onChoose: (choiceId: string) => void;
}

const intentKey = (intent?: string): StringKey | null => {
  if (!intent) return null;
  const cleanIntent = intent.trim().toLowerCase();
  if (cleanIntent.includes("explore")) return "choice.intent.explore";
  if (cleanIntent.includes("interact")) return "choice.intent.interact";
  if (cleanIntent.includes("rewrite")) return "choice.intent.rewrite";
  if (cleanIntent.includes("archive")) return "choice.intent.archive";
  return null;
};

export function ChoicePanel({ choices, stability, tension, onChoose }: ChoicePanelProps) {
  const { t } = useLang();
  return (
    <div id="choices">
      {choices.map((choice, index) => {
        const disabled = isChoiceDisabled(choice, stability, tension);
        const iKey = intentKey(choice.intent);
        const intentLabel = iKey ? t(iKey) : null;
        return (
          <button
            key={choice.choice_id}
            className="command-card"
            disabled={disabled}
            onClick={() => onChoose(choice.choice_id)}
            style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            <div className="cmd-hotkey">{t("choice.pick")} {index + 1}</div>
            <div className="cmd-label">
              {cleanChoiceLabel(choice.label)}
              {choiceCostLabel(choice, t)}
              {choiceRequirementLabel(choice, t)}
            </div>
            <div className="cmd-meta-row">
              {choice.axis_label && <span className="cmd-chip">{choice.axis_label}</span>}
              {intentLabel && <span className="cmd-chip muted">{intentLabel}</span>}
              {choice.stakes?.slice(1).map((stake) => (
                <span key={stake} className="cmd-chip muted">
                  {stake}
                </span>
              ))}
            </div>
            {choice.result_preview && (
              <div className="cmd-preview">{t("choice.preview")}: {choice.result_preview}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
