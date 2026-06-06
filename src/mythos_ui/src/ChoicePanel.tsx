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
  if (cleanIntent.includes("rewrite")) return "✍️ 서사 개정";
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
            <div className="cmd-hotkey">[{index + 1}] COMMAND</div>
            <div className="cmd-label">
              {cleanChoiceLabel(choice.label)}
              {choiceCostLabel(choice)}
              {choiceRequirementLabel(choice)}
            </div>
            {intentLabel && <div className="cmd-intent">{intentLabel}</div>}
          </button>
        );
      })}
    </div>
  );
}
