import type { SkillTreeNode } from "./types";

/**
 * Deterministic view-state for a Codex skill-tree action button.
 *
 * `blocked` tells a first-time player *why* an action is unavailable so the
 * disabled button can carry an explanation (insight shortage vs. unmet
 * prerequisite) instead of being a silent grey box.
 */
export type SkillActionView =
  | { show: false }
  | {
      show: true;
      disabled: boolean;
      label: string;
      blocked: "insight" | "prereq" | null;
    };

/**
 * Pure derivation of the learn/rank-up button state from a skill node.
 *
 * Order of blockers is intentional: an unmet prerequisite outranks an insight
 * shortage (fixing the prereq is the player's next step regardless of points).
 * No rendering here — keeps the state machine easy to reason about and reuse.
 */
export function deriveSkillAction(
  skill: SkillTreeNode,
  interactive: boolean,
  busy: boolean,
): SkillActionView {
  if (!interactive || skill.action === null) {
    return { show: false };
  }
  const verb = skill.action === "learn" ? "습득" : "강화";
  const label = `${verb} -${skill.action_cost}p`;
  if (busy) {
    return { show: true, disabled: true, label: "처리 중...", blocked: null };
  }
  if (!skill.requires_met) {
    return { show: true, disabled: true, label, blocked: "prereq" };
  }
  if (!skill.can_afford) {
    return { show: true, disabled: true, label, blocked: "insight" };
  }
  return { show: true, disabled: false, label, blocked: null };
}
