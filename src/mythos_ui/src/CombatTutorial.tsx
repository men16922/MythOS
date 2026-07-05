import { COMBAT_TUTORIAL_STEPS } from "./combatText";
import type { CombatTutorialStep } from "./combatText";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";

// First-combat interactive tutorial (A2, CBT feedback #1 "no combat tutorial"):
// four steps — move → attack → skill → defend — each advanced only when the
// player actually performs that action (App wraps onCombatAction and matches
// the dispatched action against the current step). Shown once, gated by
// localStorage + meta combat counts in App.

const STEP_TITLE_KEYS: Record<CombatTutorialStep, StringKey> = {
  move: "combat.tutorial.move.title",
  attack: "combat.tutorial.attack.title",
  skill: "combat.tutorial.skill.title",
  defend: "combat.tutorial.defend.title",
};

const STEP_BODY_KEYS: Record<CombatTutorialStep, StringKey> = {
  move: "combat.tutorial.move.body",
  attack: "combat.tutorial.attack.body",
  skill: "combat.tutorial.skill.body",
  defend: "combat.tutorial.defend.body",
};

interface CombatTutorialProps {
  stepIndex: number;
  onSkip: () => void;
}

export function CombatTutorial({ stepIndex, onSkip }: CombatTutorialProps) {
  const { t } = useLang();
  const step = COMBAT_TUTORIAL_STEPS[stepIndex];
  if (!step) return null;
  return (
    <div className="combat-tutorial-card" id="combat-tutorial">
      <div className="ct-head">
        <span className="ct-title">{t("combat.tutorial.title")}</span>
        <button type="button" className="ct-skip" id="ct-skip" onClick={onSkip}>
          {t("combat.tutorial.skip")}
        </button>
      </div>
      <div className="ct-steps">
        {COMBAT_TUTORIAL_STEPS.map((s, i) => (
          <span
            key={s}
            className={`ct-step ${i < stepIndex ? "done" : ""} ${i === stepIndex ? "current" : ""}`}
          >
            {i < stepIndex ? "✓" : i + 1}
          </span>
        ))}
      </div>
      <div className="ct-step-title">{t(STEP_TITLE_KEYS[step])}</div>
      <div className="ct-step-body">{t(STEP_BODY_KEYS[step])}</div>
    </div>
  );
}
