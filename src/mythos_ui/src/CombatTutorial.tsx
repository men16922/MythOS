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
  // Manual page-through (owner 2026-07-12 "다음 버튼이 없고 건너뛰기밖에 없어서
  // 2,3,4번 못 봄"): the steps still auto-advance when the matching action is
  // performed, but the player can now also read ahead without acting.
  onNext: () => void;
}

export function CombatTutorial({ stepIndex, onSkip, onNext }: CombatTutorialProps) {
  const { t } = useLang();
  const step = COMBAT_TUTORIAL_STEPS[stepIndex];
  if (!step) return null;
  const isLast = stepIndex >= COMBAT_TUTORIAL_STEPS.length - 1;
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
      <button type="button" className="ct-next" id="ct-next" onClick={onNext}>
        {isLast ? t("combat.tutorial.done") : t("combat.tutorial.next")}
      </button>
    </div>
  );
}
