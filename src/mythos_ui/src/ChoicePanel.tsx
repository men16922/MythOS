import { choiceCostLabel, choiceRequirementLabel, isChoiceDisabled, cleanChoiceLabel } from "./choices";
import type { SceneChoice } from "./types";

interface ChoicePanelProps {
  choices: SceneChoice[];
  stability: number;
  tension: number;
  onChoose: (choiceId: string) => void;
}

const getIntentLabel = (intent?: string): string | null => {
  if (!intent) return null;
  const cleanIntent = intent.trim().toLowerCase();
  if (cleanIntent.includes("explore")) return "🧭 탐색";
  if (cleanIntent.includes("interact")) return "💬 상호작용";
  if (cleanIntent.includes("rewrite")) return "⚡ 시스템 개입";
  if (cleanIntent.includes("archive")) return "🗄️ 기록 보관";
  return null;
};

export function ChoicePanel({ choices, stability, tension, onChoose }: ChoicePanelProps) {
  return (
    <div id="choices">
      {choices.map((choice, index) => {
        const disabled = isChoiceDisabled(choice, stability, tension);
        const intentLabel = getIntentLabel(choice.intent);
        return (
          <button
            key={choice.choice_id}
            className="command-card"
            disabled={disabled}
            onClick={() => onChoose(choice.choice_id)}
            style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            <div className="cmd-hotkey">선택 {index + 1}</div>
            <div className="cmd-label">
              {cleanChoiceLabel(choice.label)}
              {choiceCostLabel(choice)}
              {choiceRequirementLabel(choice)}
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
              <div className="cmd-preview">예상 변화: {choice.result_preview}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
