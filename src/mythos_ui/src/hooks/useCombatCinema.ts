import { useState } from "react";
import type { CombatBlip } from "../types";
import { resolveCombatSkill } from "../combatCinemaSkills";
import { useCombatCinemaTimeline } from "./useCombatCinemaTimeline";

export interface ActionSignal {
  type: "ATTACK" | "DEFEND" | "EVADE";
  icon: string;
  color: string;
  code: string;
}

export const ACTION_SIGNALS: Record<string, ActionSignal> = {
  attack: {
    type: "ATTACK",
    icon: "⚔️",
    color: "#ff6b7d",
    code: "CMD: STRIKE_LINE",
  },
  defend: {
    type: "DEFEND",
    icon: "🛡️",
    color: "#8fffea",
    code: "CMD: INT_SHIELD",
  },
  evade: {
    type: "EVADE",
    icon: "⇄",
    color: "#eab308",
    code: "CMD: EVADE_STEP",
  },
};

export function useCombatCinema(
  scenarioId: string,
  attacker: CombatBlip,
  defender: CombatBlip,
  damage: number,
  kind?: "attack" | "skill" | "defend",
  skillName?: string,
  miss?: boolean,
  onFinish?: () => void,
  onImpact?: (defenderId: string, damage: number) => void,
  onCue?: (cue: "enter" | "windup" | "impact" | "exit") => void
) {
  const [imgError, setImgError] = useState(false);

  // Reset the image-error flag when the skill changes
  const [prevSkillName, setPrevSkillName] = useState(skillName);
  if (prevSkillName !== skillName) {
    setPrevSkillName(skillName);
    setImgError(false);
  }

  const mode = skillName ? "skill" : (kind || "attack");
  const isDefend = mode === "defend";
  const isSelfTarget = attacker.id === defender.id;

  // 빠른 속도 진행 조건 (적의 일반공격, 회피, 방어)
  const isFast = attacker.faction === "enemy" || miss || isDefend;
  const phase = useCombatCinemaTimeline({
    isFast,
    defenderId: defender.id,
    damage,
    onFinish,
    onImpact,
    onCue,
  });

  const factionCol = (faction: string) => (faction === "enemy" ? "#ff6b7d" : "#8fffea");

  const imageFor = (b: CombatBlip, pose: "idle" | "attack" | "skill" | "hit" | "guard") => {
    const images = b.combat_images || {};
    const path = images[pose]
      || (pose === "guard" ? images.skill : "")
      || images.idle
      || b.portrait
      || (b.faction === "player" ? "characters/player-noise.png" : "");
    return path ? `/resources/${scenarioId}/${path}` : "";
  };

  const attackerPose = phase === "attack" || phase === "impact" ? (mode === "attack" ? "attack" : (isDefend ? "guard" : "skill")) : "idle";
  const defenderPose = isDefend ? attackerPose : (phase === "impact" && !miss ? "hit" : "idle");
  const attackerSrc = imageFor(attacker, attackerPose);
  const defenderSrc = imageFor(defender, defenderPose);

  const { id: skillId, metadata: skillMeta } = resolveCombatSkill(skillName);
  const skillImgSrc = skillId ? `/resources/${scenarioId}/skills/${skillId}.png` : "";

  const hasSkillCard = mode === "skill" && !!skillMeta;

  let actionSignalKey = "";
  if (mode === "skill") {
    // Skill uses skill card
  } else if (miss) {
    actionSignalKey = "evade";
  } else if (isDefend) {
    actionSignalKey = "defend";
  } else {
    actionSignalKey = "attack";
  }
  const actionSignal = ACTION_SIGNALS[actionSignalKey] || null;
  const hasSignal = !hasSkillCard && !!actionSignal;

  return {
    phase,
    imgError,
    setImgError,
    mode,
    isDefend,
    isSelfTarget,
    isFast,
    attackerPose,
    defenderPose,
    attackerSrc,
    defenderSrc,
    skillId,
    skillMeta,
    skillImgSrc,
    hasSkillCard,
    actionSignal,
    hasSignal,
    factionCol,
  };
}
