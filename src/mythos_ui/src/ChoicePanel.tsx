import { choiceCostLabel, choiceRequirementLabel, isChoiceDisabled } from "./choices";
import type { SceneChoice } from "./types";

interface ChoicePanelProps {
  choices: SceneChoice[];
  stability: number;
  tension: number;
  onChoose: (choiceId: string) => void;
}

export function ChoicePanel({ choices, stability, tension, onChoose }: ChoicePanelProps) {
  return (
    <div id="choices">
      {choices.map((choice, index) => {
        const disabled = isChoiceDisabled(choice, stability, tension);
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
              {choice.label}
              {choiceCostLabel(choice)}
              {choiceRequirementLabel(choice)}
            </div>
            {choice.intent && <div className="cmd-intent">{choice.intent}</div>}
          </button>
        );
      })}
    </div>
  );
}
