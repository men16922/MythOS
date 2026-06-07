import { useState, useEffect, useRef } from "react";
import type { CombatBlip } from "../types";

// Cyberpunk Skill Registry and Metadata
export interface SkillMetadata {
  id: string;
  nameEn: string;
  nameKo: string;
  role: string;
  icon: string;
  color: string;
  glitchCodes: string[];
  description: string;
}

export const SKILL_REGISTRY: Record<string, SkillMetadata> = {
  signal_step: {
    id: "signal_step",
    nameEn: "SIGNAL STEP",
    nameKo: "신호 도약",
    role: "INFILTRATOR / UTILITY",
    icon: "⤛⤜",
    color: "#c084fc", // Neon Purple
    glitchCodes: ["SYS_BLINK_ACTIVE", "IP_ROTATION: OK", "LOC: TEMP_DISPLACE_GRID"],
    description: "공간 신호를 왜곡해 지정 지점으로 순간 이동합니다.",
  },
  overload_strike: {
    id: "overload_strike",
    nameEn: "OVERLOAD STRIKE",
    nameKo: "과부하 일격",
    role: "STRIKER / ASSAULT",
    icon: "✸",
    color: "#f97316", // Neon Orange
    glitchCodes: ["VOLT_LIMIT: OVER", "FORCE_SHUTDOWN: ON", "AMP_BOOST: 400%"],
    description: "무기에 과전류를 흘려 대상에게 강력한 한 방을 먹입니다.",
  },
  packet_shot: {
    id: "packet_shot",
    nameEn: "PACKET SHOT",
    nameKo: "패킷 사격",
    role: "SNIPER / TACTICAL",
    icon: "⌖",
    color: "#ef4444", // Neon Red
    glitchCodes: ["PACKET_INJECT: OK", "TRACER_BEAM: TRUE", "PORTS: EXPOSED"],
    description: "데이터 패킷 탄환을 고속 발사하여 방어선을 관통합니다.",
  },
  covering_noise: {
    id: "covering_noise",
    nameEn: "COVERING NOISE",
    nameKo: "엄호 노이즈",
    role: "DEFENDER / TACTICAL",
    icon: "☵",
    color: "#22d3ee", // Neon Cyan
    glitchCodes: ["NOISE_SHIELD: 100%", "SIGNAL_DAMPEN: ACTIVE", "STATIC_DENSE"],
    description: "광대역 잡음 장막을 전개하여 아군을 엄호하고 신호를 감쇄합니다.",
  },
  patch_protocol: {
    id: "patch_protocol",
    nameEn: "PATCH PROTOCOL",
    nameKo: "패치 프로토콜",
    role: "HEALER / SUPPORT",
    icon: "✙",
    color: "#22c55e", // Neon Green
    glitchCodes: ["PATCH_VER: 9.4.2", "CLEAN_SYSTEM: YES", "BUFFER_REGEN: MAX"],
    description: "치유 코드 패키지를 주입하여 파손된 회로를 급속 복구합니다.",
  },
};

export const getSkillId = (name?: string): string => {
  if (!name) return "";
  const n = name.replace(/\s+/g, "").toLowerCase();
  if (n.includes("신호") || n.includes("signal")) return "signal_step";
  if (n.includes("과부하") || n.includes("overload")) return "overload_strike";
  if (n.includes("패킷") || n.includes("packet")) return "packet_shot";
  if (n.includes("엄호") || n.includes("covering")) return "covering_noise";
  if (n.includes("패치") || n.includes("patch")) return "patch_protocol";
  return "";
};

export const getSkillMeta = (skillId: string): SkillMetadata | null => {
  return SKILL_REGISTRY[skillId] || null;
};

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
  const [phase, setPhase] = useState<"enter" | "attack" | "impact" | "exit">("enter");
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

  const onFinishRef = useRef(onFinish);
  const onImpactRef = useRef(onImpact);
  const onCueRef = useRef(onCue);

  useEffect(() => {
    onFinishRef.current = onFinish;
    onImpactRef.current = onImpact;
    onCueRef.current = onCue;
  });

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;
    let t4: ReturnType<typeof setTimeout>;

    onCueRef.current?.("enter");

    if (isFast) {
      // 1.2초 빠른 타임라인
      t1 = setTimeout(() => {
        setPhase("attack");
        onCueRef.current?.("windup");
      }, 200);
      t2 = setTimeout(() => {
        setPhase("impact");
        onCueRef.current?.("impact");
        onImpactRef.current?.(defender.id, damage);
      }, 650);
      t3 = setTimeout(() => {
        setPhase("exit");
        onCueRef.current?.("exit");
      }, 950);
      t4 = setTimeout(() => {
        onFinishRef.current?.();
      }, 1200);
    } else {
      // 2.1초 표준 타임라인
      t1 = setTimeout(() => {
        setPhase("attack");
        onCueRef.current?.("windup");
      }, 400);
      t2 = setTimeout(() => {
        setPhase("impact");
        onCueRef.current?.("impact");
        onImpactRef.current?.(defender.id, damage);
      }, 1050);
      t3 = setTimeout(() => {
        setPhase("exit");
        onCueRef.current?.("exit");
      }, 1750);
      t4 = setTimeout(() => {
        onFinishRef.current?.();
      }, 2100);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isFast, defender.id, damage]);

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

  const skillId = getSkillId(skillName);
  const skillMeta = getSkillMeta(skillId);
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
