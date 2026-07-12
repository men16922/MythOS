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
  magnetic_pull: {
    id: "magnetic_pull",
    nameEn: "MAGNETIC PULL",
    nameKo: "자기 견인",
    role: "CONTROLLER / FIELD",
    icon: "⥢",
    color: "#e07dff", // Neon Violet
    glitchCodes: ["MAG_FIELD: LOCK", "VECTOR: INBOUND", "GRIP_FORCE: 2T"],
    description: "자기장 그물로 적을 낚아채 내 앞까지 끌어옵니다.",
  },
  magnetic_repulse: {
    id: "magnetic_repulse",
    nameEn: "MAGNETIC REPULSE",
    nameKo: "자기 반발",
    role: "CONTROLLER / FIELD",
    icon: "⥤",
    color: "#ffb347", // Neon Amber
    glitchCodes: ["POLARITY: FLIP", "VECTOR: OUTBOUND", "SHOVE_FORCE: 2T"],
    description: "극성을 반전시켜 적을 강하게 밀쳐냅니다.",
  },
  emp_pulse: {
    id: "emp_pulse",
    nameEn: "EMP PULSE",
    nameKo: "EMP 펄스",
    role: "DISRUPTOR / AOE",
    icon: "⌁",
    color: "#ffd76a", // Neon Gold
    glitchCodes: ["EM_BURST: WIDE", "CIRCUITS: LOCKED", "STUN_FIELD: 1T"],
    description: "광역 전자기 폭발로 일대의 회로를 마비시킵니다.",
  },
  precision_emp: {
    id: "precision_emp",
    nameEn: "PRECISION EMP",
    nameKo: "정밀 EMP",
    role: "DISRUPTOR / SNIPE",
    icon: "⌁",
    color: "#fff078", // Neon Yellow
    glitchCodes: ["EM_LANCE: FOCUS", "REGEN_HALT: 2T", "COOLDOWN_FREEZE"],
    description: "정밀 전자기 창으로 대상의 회로를 지연시킵니다 (⚡감전).",
  },
  system_hack: {
    id: "system_hack",
    nameEn: "SYSTEM HACK",
    nameKo: "시스템 해킹",
    role: "HACKER / CONTROL",
    icon: "⎔",
    color: "#a78bfa", // Neon Purple
    glitchCodes: ["ROOT_ACCESS: OK", "CTRL_LOOP: HALT", "STUN: 1T"],
    description: "제어 회로에 침투해 대상을 1턴 기절시킵니다.",
  },
  system_intrusion: {
    id: "system_intrusion",
    nameEn: "SYSTEM BREACH",
    nameKo: "시스템 침투",
    role: "HACKER / DOMINATE",
    icon: "🕹",
    color: "#ff82c8", // Neon Pink
    glitchCodes: ["MIND_CTRL: SEIZED", "IFF_TABLE: FLIPPED", "TURN_STOLEN: 1"],
    description: "적의 제어권을 탈취해 다음 턴 아군을 공격하게 만듭니다.",
  },
  glitch_blink: {
    id: "glitch_blink",
    nameEn: "GLITCH BLINK",
    nameKo: "글리치 점멸",
    role: "INFILTRATOR / EVADE",
    icon: "⧉",
    color: "#c084fc",
    glitchCodes: ["FRAME_SKIP: 3", "DECOY_SPAWN: OK", "TRACE: LOST"],
    description: "프레임 사이로 미끄러지며 잔상을 남기고 재배치합니다.",
  },
  nanoshield_projector: {
    id: "nanoshield_projector",
    nameEn: "NANOSHIELD DEPLOY",
    nameKo: "나노방막 전개",
    role: "DEFENDER / SUPPORT",
    icon: "⛨",
    color: "#22d3ee",
    glitchCodes: ["NANO_WALL: UP", "DEF_BONUS: +3", "DURATION: 2T"],
    description: "나노 입자 방막을 전개해 아군을 보호합니다.",
  },
  signal_overdrive: {
    id: "signal_overdrive",
    nameEn: "SIGNAL OVERDRIVE",
    nameKo: "신호 오버드라이브",
    role: "BOOSTER / SELF",
    icon: "↯",
    color: "#f97316",
    glitchCodes: ["CLOCK_BOOST: ON", "SPD+2 / CRIT+2", "THERMAL: RISING"],
    description: "신경 신호를 과구동해 속도와 치명타를 끌어올립니다.",
  },
  memory_resonance: {
    id: "memory_resonance",
    nameEn: "MEMORY RESONANCE",
    nameKo: "기억 공명",
    role: "PSION / SCALING",
    icon: "◈",
    color: "#8be9fd",
    glitchCodes: ["ECHO_AMP: CLUES", "RESONANCE: BUILD", "DMG_SCALE: ON"],
    description: "수집한 단서의 잔향을 증폭해 공명 타격을 가합니다.",
  },
  shortcut_call: {
    id: "shortcut_call",
    nameEn: "SHORTCUT CALL",
    nameKo: "지름길 호출",
    role: "RUNNER / PARTY",
    icon: "⇶",
    color: "#7dff9b",
    glitchCodes: ["ROUTE_OPT: FOUND", "PARTY_SPD: +2", "PATH_SYNC: OK"],
    description: "숨은 경로를 공유해 파티 전체의 기동을 가속합니다.",
  },
  shield_field: {
    id: "shield_field",
    nameEn: "SHIELD FIELD",
    nameKo: "차폐 필드",
    role: "DEFENDER / AOE",
    icon: "⛨",
    color: "#8fffea",
    glitchCodes: ["FIELD_RADIUS: 1", "ALLY_DEF: +2", "PROJECTION: ON"],
    description: "반경 내 아군 전체에 차폐막을 투사합니다.",
  },
  guardian_wall: {
    id: "guardian_wall",
    nameEn: "GUARDIAN WALL",
    nameKo: "수호 방벽",
    role: "TANK / TAUNT",
    icon: "⌸",
    color: "#ffb347",
    glitchCodes: ["AGGRO_BEACON: ON", "DEF_BONUS: +2", "LINE_HELD"],
    description: "앞을 막아서며 적의 시선을 자신에게 고정합니다.",
  },
  backdoor_route: {
    id: "backdoor_route",
    nameEn: "BACKDOOR ROUTE",
    nameKo: "백도어 루트",
    role: "RUNNER / RESCUE",
    icon: "⇄",
    color: "#7dff9b",
    glitchCodes: ["EXIT_NODE: OPEN", "ALLY_WARP: OK", "SAFE_HOP: 3"],
    description: "숨겨진 신호 경로로 위험에 빠진 아군을 재배치합니다.",
  },
};

export const getSkillId = (name?: string): string => {
  if (!name) return "";
  const n = name.replace(/\s+/g, "").toLowerCase();
  // Exact id (the engine logs skill IDs — e.g. "magnetic_pull") wins outright.
  if (SKILL_REGISTRY[n]) return n;
  // Keyword fallbacks, MOST SPECIFIC FIRST (a bare "신호" test used to swallow
  // 신호 오버드라이브 into signal_step and knew nothing after the first 5 skills).
  if (n.includes("반발") || n.includes("repulse")) return "magnetic_repulse";
  if (n.includes("견인") || n.includes("자기") || n.includes("magnetic")) return "magnetic_pull";
  if (n.includes("정밀") || n.includes("precision")) return "precision_emp";
  if (n.includes("emp") || n.includes("펄스")) return "emp_pulse";
  if (n.includes("해킹") || n.includes("systemhack") || n.includes("hack")) return "system_hack";
  if (n.includes("침투") || n.includes("breach") || n.includes("intrusion")) return "system_intrusion";
  if (n.includes("글리치") || n.includes("glitch")) return "glitch_blink";
  if (n.includes("나노") || n.includes("nano")) return "nanoshield_projector";
  if (n.includes("오버드라이브") || n.includes("overdrive")) return "signal_overdrive";
  if (n.includes("공명") || n.includes("resonance")) return "memory_resonance";
  if (n.includes("지름길") || n.includes("shortcut")) return "shortcut_call";
  if (n.includes("차폐") || n.includes("shieldfield")) return "shield_field";
  if (n.includes("방벽") || n.includes("guardian")) return "guardian_wall";
  if (n.includes("백도어") || n.includes("backdoor")) return "backdoor_route";
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
