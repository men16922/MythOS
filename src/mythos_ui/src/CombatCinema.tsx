import React, { useEffect, useRef, useState } from "react";
import type { CombatBlip } from "./types";

interface CombatCinemaProps {
  scenarioId: string;
  attacker: CombatBlip;
  defender: CombatBlip;
  damage: number;
  kind?: "attack" | "skill" | "defend";
  crit?: boolean;
  skillName?: string;
  miss?: boolean;
  onFinish?: () => void;
  onImpact?: (defenderId: string, damage: number) => void; // HP 실시간 동기화 콜백
  onCue?: (cue: "enter" | "windup" | "impact" | "exit") => void;
}

// Cyberpunk Skill Registry and Metadata
interface SkillMetadata {
  id: string;
  nameEn: string;
  nameKo: string;
  role: string;
  icon: string;
  color: string;
  glitchCodes: string[];
  description: string;
}

const SKILL_REGISTRY: Record<string, SkillMetadata> = {
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

const getSkillId = (name?: string): string => {
  if (!name) return "";
  const n = name.replace(/\s+/g, "").toLowerCase();
  if (n.includes("신호") || n.includes("signal")) return "signal_step";
  if (n.includes("과부하") || n.includes("overload")) return "overload_strike";
  if (n.includes("패킷") || n.includes("packet")) return "packet_shot";
  if (n.includes("엄호") || n.includes("covering")) return "covering_noise";
  if (n.includes("패치") || n.includes("patch")) return "patch_protocol";
  return "";
};

const getSkillMeta = (skillId: string): SkillMetadata | null => {
  return SKILL_REGISTRY[skillId] || null;
};

interface ActionSignal {
  type: "ATTACK" | "DEFEND" | "EVADE";
  icon: string;
  color: string;
  code: string;
}

const ACTION_SIGNALS: Record<string, ActionSignal> = {
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

export const CombatCinema: React.FC<CombatCinemaProps> = ({
  scenarioId,
  attacker,
  defender,
  damage,
  kind,
  crit = false,
  skillName,
  miss = false,
  onFinish,
  onImpact,
  onCue,
}) => {
  const [phase, setPhase] = useState<"enter" | "attack" | "impact" | "exit">("enter");
  const [imgError, setImgError] = useState(false);

  // Reset the image-error flag when the skill changes by adjusting state during
  // render (React's recommended alternative to a setState-in-effect, which would
  // trigger an extra cascading render).
  const [prevSkillName, setPrevSkillName] = useState(skillName);
  if (prevSkillName !== skillName) {
    setPrevSkillName(skillName);
    setImgError(false);
  }

  const mode = skillName ? "skill" : (kind || "attack");
  const isDefend = mode === "defend";
  const isSelfTarget = attacker.id === defender.id;

  // 적군 공격이거나 회피(miss)인 경우 빠른 속도로 진행
  const isFast = attacker.faction === "enemy" || miss || isDefend;

  // Keep the latest callbacks in refs so the timeline effect can stay
  // mounted-once: if these were effect deps, every parent re-render would
  // recreate the inline callbacks, reset the timers, and onFinish could
  // never fire — leaving the full-screen overlay stuck (a blank screen).
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
      // 2.1초 표준 타임라인. The windup is intentionally readable because
      // skill cards now carry dedicated audio cues.
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

  const renderActorImage = (b: CombatBlip, src: string, side: "left" | "right") => {
    if (!src) {
      return <div className="cinema-fallback-glyph">{b.name?.slice(0, 1) || b.id.slice(0, 1)}</div>;
    }
    return (
      <img
        className={`cinema-portrait ${side === "right" ? "defender" : "attacker"}`}
        src={src}
        alt={b.name || b.id}
        draggable={false}
      />
    );
  };

  const hasSkillCard = mode === "skill" && skillMeta;

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

  return (
    <div className={`cinema-overlay mode-${mode} phase-${phase} ${isFast ? "fast-speed" : ""} ${isSelfTarget ? "self-target" : ""}`}>
      <style>{`
        .cinema-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(2, 7, 6, 0.88);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          font-family: "SF Mono", Courier, monospace;
          overflow: hidden;
          transition: opacity 0.25s ease-in-out;
        }

        .cinema-strip {
          width: 100%;
          height: 360px;
          background: linear-gradient(180deg, #071210 0%, #010403 100%);
          border-top: 2px solid #29ffc6;
          border-bottom: 2px solid #29ffc6;
          box-shadow: 0 0 38px rgba(41, 255, 198, 0.25);
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 12%;
          animation: stripEnter 0.35s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        .cinema-strip.has-skill {
          padding: 0 5%;
        }

        .cinema-strip.has-defend,
        .cinema-strip.self-target-strip {
          justify-content: center;
          padding: 0;
          gap: 60px;
        }

        .cinema-strip::before {
          content: "";
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.04), rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.04));
          background-size: 100% 4px, 6px 100%;
          opacity: 0.5;
          pointer-events: none;
        }

        .actor-side {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 32%;
          position: relative;
          height: 100%;
          justify-content: center;
        }

        .cinema-strip.has-skill .actor-side,
        .cinema-strip.has-signal .actor-side {
          width: 26%;
        }

        .cinema-strip.has-defend .actor-side.left,
        .cinema-strip.self-target-strip .actor-side.left {
          width: 26%;
        }

        .cinema-strip.has-defend .action-signal-side,
        .cinema-strip.self-target-strip .action-signal-side,
        .cinema-strip.self-target-strip .skill-side {
          width: 26%;
        }
        
        .actor-side.left {
          transition: transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .actor-side.right {
          transition: transform 0.12s ease-out;
        }

        .skill-side {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 30%;
          position: relative;
          height: 100%;
          justify-content: center;
          transition: transform 0.22s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.2s;
          animation: skillCardEnter 0.45s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        .cinema-card {
          width: 220px;
          height: 292px;
          background: rgba(2, 7, 6, 0.9);
          border: 1.5px solid;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .cinema-card.skill-card {
          width: 240px;
          background: #020706;
        }

        .cinema-card::before {
          content: "";
          position: absolute;
          top: 4px; left: 4px; right: 4px; bottom: 4px;
          border: 0.5px solid rgba(255,255,255,0.06);
          pointer-events: none;
        }

        .cinema-card::after {
          content: "";
          position: absolute;
          top: -100%; left: 0; width: 100%; height: 100%;
          background: linear-gradient(180deg, transparent, rgba(41,255,198,0.12), transparent);
          animation: scanLine 2s infinite linear;
          pointer-events: none;
        }

        .cinema-portrait {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center bottom;
          user-select: none;
          pointer-events: none;
          filter: drop-shadow(0 0 12px rgba(143,255,234,0.24));
          animation: portraitIdle 2.4s ease-in-out infinite alternate;
        }
        .cinema-portrait.defender {
          filter: drop-shadow(0 0 12px rgba(255,107,125,0.20));
        }
        .cinema-fallback-glyph {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8fffea;
          font-size: 64px;
          font-weight: 900;
        }

        .skill-illustration {
          width: 100%;
          height: 100%;
          object-fit: cover;
          user-select: none;
          pointer-events: none;
          filter: brightness(0.95) contrast(1.1);
          animation: skillImgPulse 3s ease-in-out infinite alternate;
        }

        .procedural-skill-bg {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at center, rgba(10,18,15,0.95) 0%, rgba(1,4,3,1) 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 24px 16px;
          overflow: hidden;
        }

        .tech-grid {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 16px 16px;
          background-position: center;
          pointer-events: none;
        }
        .tech-grid::before {
          content: "";
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.65) 100%);
        }

        .skill-icon-huge {
          font-size: 58px;
          color: var(--skill-color);
          filter: drop-shadow(0 0 14px var(--skill-color));
          animation: iconGlitchBlink 3.2s infinite steps(1);
          margin-top: 10px;
          z-index: 2;
        }

        .glitch-code-specs {
          width: 100%;
          font-size: 8.5px;
          color: rgba(214, 255, 246, 0.45);
          font-family: "SF Mono", Courier, monospace;
          border-top: 1px dashed rgba(41, 255, 198, 0.15);
          padding-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          z-index: 2;
        }

        .spec-line {
          display: flex;
          justify-content: flex-start;
          letter-spacing: 0.5px;
        }
        .spec-line::before {
          content: "> ";
          color: var(--skill-color);
          margin-right: 4px;
        }

        .tech-corner {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 2px solid transparent;
          pointer-events: none;
          z-index: 3;
        }
        .tech-corner.top-left { top: 6px; left: 6px; border-top-color: inherit; border-left-color: inherit; }
        .tech-corner.top-right { top: 6px; right: 6px; border-top-color: inherit; border-right-color: inherit; }
        .tech-corner.bottom-left { bottom: 6px; left: 6px; border-bottom-color: inherit; border-left-color: inherit; }
        .tech-corner.bottom-right { bottom: 6px; right: 6px; border-bottom-color: inherit; border-right-color: inherit; }

        .skill-role-tag {
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: 1.5px;
          text-shadow: 0 0 6px currentColor;
        }

        .skill-title-tag {
          margin-top: 8px;
          font-size: 12px;
          font-weight: 800;
          background: rgba(0,0,0,0.9);
          padding: 4px 10px;
          border-radius: 2px;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
          text-shadow: 0 0 8px currentColor;
        }

        .cinema-projectile {
          position: absolute;
          left: 28%;
          top: 52%;
          width: 80px;
          height: 6px;
          background: linear-gradient(90deg, transparent, var(--proj-color) 30%, #ffffff 100%);
          box-shadow: 0 0 16px var(--proj-color), 0 0 28px var(--proj-color);
          border-radius: 3px;
          transform: translateY(-50%);
          z-index: 25;
          pointer-events: none;
          animation: projectileFly 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .cinema-overlay.fast-speed .cinema-projectile {
          animation-duration: 0.2s;
        }

        @keyframes projectileFly {
          0% {
            left: 28%;
            width: 10px;
            opacity: 0.4;
            transform: translateY(-50%) scaleY(0.4);
          }
          20% {
            width: 110px;
            opacity: 1;
            transform: translateY(-50%) scaleY(1.2);
          }
          80% {
            opacity: 1;
          }
          100% {
            left: 72%;
            width: 15px;
            opacity: 0;
            transform: translateY(-50%) scaleY(0.3);
          }
        }

        .cinema-overlay.phase-attack .actor-side.left {
          transform: translateX(128px) scale(1.16);
        }
        /* Attack Mode Recoil (Projectile cast) */
        .cinema-overlay.mode-attack.phase-attack .actor-side.left {
          transform: translateX(35px) scale(1.08);
          transition: transform 0.08s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .cinema-overlay.phase-attack .cinema-strip.has-skill .actor-side.left {
          transform: scale(0.9);
        }
        
        .cinema-overlay.phase-attack .actor-side.left .cinema-portrait {
          animation: actionPosePop 0.38s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }
        .cinema-overlay.mode-defend.phase-attack .actor-side.left {
          transform: scale(1.15) translateY(-6px);
          transition: transform 0.22s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .cinema-overlay.mode-defend.phase-attack .actor-side.left .cinema-portrait {
          animation: guardPosePulse 0.44s ease-out forwards;
        }

        /* Cinematic Background Focus Dimming during Skill Zoom */
        .cinema-overlay.phase-attack .cinema-strip.has-skill .actor-side.left,
        .cinema-overlay.phase-attack .cinema-strip.has-skill .actor-side.right {
          filter: brightness(0.28) blur(3px) grayscale(0.5);
          transform: scale(0.85);
          transition: filter 0.28s ease, transform 0.28s ease;
        }

        /* Skill Card Ultra 3D Zoom & Glow Highlight */
        .cinema-overlay.phase-attack .skill-side {
          transform: perspective(800px) rotateX(12deg) rotateY(-10deg) scale(1.75) translateY(-12px);
          z-index: 100;
          filter: drop-shadow(0 0 30px var(--skill-color)) drop-shadow(0 0 60px var(--skill-color));
        }
        .cinema-overlay.phase-attack .skill-side .skill-card {
          border-color: #ffffff !important;
          box-shadow: 
            0 0 40px #ffffff, 
            0 0 80px var(--skill-color), 
            0 0 150px var(--skill-color), 
            inset 0 0 30px var(--skill-color) !important;
          animation: skillHyperZoomFlash 0.35s ease-out forwards, skillHighGlitch 0.25s infinite alternate;
        }
        .cinema-overlay.phase-impact .skill-side {
          transform: scale(1.1) translateY(0);
          z-index: 5;
          animation: cardGlitchCrash 0.38s ease-out forwards;
        }
        
        .cinema-overlay.phase-impact .actor-side.right {
          animation: staggerShake 0.48s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .cinema-overlay.phase-impact .actor-side.right .cinema-card {
          animation: cardGlitchCrash 0.38s ease-out forwards;
        }
        .cinema-overlay.phase-impact .actor-side.right .cinema-portrait {
          animation: hitPoseCrash 0.38s ease-out forwards;
        }
        .cinema-overlay.mode-defend .actor-side.right,
        .cinema-overlay.self-target .actor-side.right {
          display: none !important;
        }
        .cinema-overlay.mode-defend.phase-impact .actor-side.left {
          transform: scale(1.06) translateY(0);
          transition: transform 0.22s ease-out;
        }
        .cinema-overlay.phase-impact {
          animation: globalFlash 0.25s ease-out forwards;
        }
        .cinema-overlay.mode-defend.phase-impact {
          animation: guardFlash 0.25s ease-out forwards;
        }
        .phase-exit {
          opacity: 0;
        }

        .slash-banner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(-6deg);
          background: #ff6b7d;
          color: #020706;
          font-weight: 900;
          font-size: 19px;
          padding: 8px 36px;
          box-shadow: 0 0 18px #ff6b7d;
          text-shadow: 0 0 2px #fff;
          opacity: 0;
          pointer-events: none;
          z-index: 10;
        }
        .cinema-overlay.phase-attack .slash-banner {
          animation: slashAppear 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        .damage-number {
          position: absolute;
          right: 22%;
          top: 30%;
          font-size: 46px;
          font-weight: 900;
          color: #ff5566;
          text-shadow: 0 0 8px rgba(255,85,102,0.85), 0 0 16px rgba(0,0,0,0.9);
          opacity: 0;
          z-index: 15;
          pointer-events: none;
        }
        
        .cinema-strip.has-skill .damage-number {
          right: 16%;
        }

        .cinema-overlay.phase-impact .damage-number {
          animation: dmgPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .damage-number.critical {
          color: #ffd76a;
          text-shadow: 0 0 12px #ffd76a, 0 0 24px rgba(0,0,0,0.95);
          font-size: 56px;
        }
        .damage-number.evade {
          color: #8fffea;
          text-shadow: 0 0 8px rgba(143,255,234,0.85), 0 0 16px rgba(0,0,0,0.9);
          font-size: 38px;
        }
        .damage-number.guard {
          color: #8fffea;
          text-shadow: 0 0 12px rgba(143,255,234,0.9), 0 0 24px rgba(0,0,0,0.95);
          font-size: 40px;
        }

        .actor-name-tag {
          font-size: 13px;
          font-weight: 700;
          color: #d6fff6;
          margin-bottom: 8px;
          letter-spacing: 1px;
          text-shadow: 0 0 4px rgba(214, 255, 246, 0.5);
        }

        .actor-label {
          margin-top: 8px;
          font-size: 10px;
          background: rgba(0,0,0,0.85);
          padding: 3px 8px;
          border-radius: 2px;
          border: 1px solid rgba(41,255,198,0.25);
          color: #8fffea;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .cinema-overlay.fast-speed .cinema-strip {
          animation-duration: 0.18s;
          height: 330px;
        }
        .cinema-overlay.fast-speed .actor-side.left {
          transition-duration: 0.08s;
        }
        .cinema-overlay.fast-speed .actor-side.right {
          transition-duration: 0.06s;
        }
        .cinema-overlay.fast-speed.phase-attack .actor-side.left {
          transform: translateX(110px) scale(1.1);
        }
        .cinema-overlay.fast-speed.phase-attack .cinema-strip.has-skill .actor-side.left {
          transform: translateX(70px) scale(1.06);
        }
        .cinema-overlay.fast-speed .slash-banner {
          animation-duration: 0.22s;
          font-size: 17px;
          padding: 6px 28px;
        }
        .cinema-overlay.fast-speed .damage-number {
          animation-duration: 0.45s;
          font-size: 38px;
        }
        .cinema-overlay.fast-speed .damage-number.critical {
          font-size: 46px;
        }

        @keyframes stripEnter {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        @keyframes scanLine {
          from { top: -100%; }
          to { top: 100%; }
        }
        @keyframes portraitIdle {
          0% { transform: translateY(2px) scale(0.98); }
          100% { transform: translateY(-3px) scale(1.02); }
        }
        @keyframes actionPosePop {
          0% { transform: translateX(-24px) scale(0.96); filter: brightness(1) drop-shadow(0 0 8px rgba(143,255,234,0.28)); }
          40% { transform: translateX(28px) scale(1.15); filter: brightness(1.5) drop-shadow(0 0 26px rgba(143,255,234,0.8)); }
          100% { transform: translateX(0) scale(1.04); filter: brightness(1.1) drop-shadow(0 0 14px rgba(143,255,234,0.38)); }
        }
        @keyframes hitPoseCrash {
          0% { transform: translateX(0) rotate(0deg); filter: brightness(1); }
          15% { transform: translateX(36px) rotate(4deg); filter: brightness(2) saturate(1.4); }
          35% { transform: translateX(-18px) rotate(-3deg); filter: brightness(0.6) saturate(1.8); }
          60% { transform: translateX(8px) rotate(1deg); filter: brightness(1.2); }
          100% { transform: translateX(0) rotate(0deg); filter: brightness(1); }
        }
        @keyframes guardPosePulse {
          0% { transform: scale(0.96); filter: brightness(1) drop-shadow(0 0 8px rgba(143,255,234,0.25)); }
          40% { transform: scale(1.12); filter: brightness(1.5) drop-shadow(0 0 32px rgba(143,255,234,0.85)); }
          100% { transform: scale(1.03); filter: brightness(1.1) drop-shadow(0 0 16px rgba(143,255,234,0.45)); }
        }
        @keyframes slashAppear {
          0% { transform: translate(-50%, -50%) rotate(-6deg) scaleX(0); opacity: 0; }
          40% { transform: translate(-50%, -50%) rotate(-6deg) scaleX(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(-6deg) scaleX(1); opacity: 0.95; }
        }
        @keyframes staggerShake {
          0% { transform: translateX(0); }
          10% { transform: translateX(45px) rotate(5deg) scale(0.95); }
          25% { transform: translateX(-18px) rotate(-3deg); }
          45% { transform: translateX(8px) rotate(1deg); }
          70% { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
        
        @keyframes cardGlitchCrash {
          0% { filter: hue-rotate(0deg) skewX(0deg) brightness(1); }
          15% { filter: hue-rotate(90deg) skewX(14deg) brightness(1.8); }
          30% { filter: hue-rotate(-90deg) skewX(-16deg) brightness(0.5); }
          45% { filter: hue-rotate(180deg) skewX(8deg) brightness(1.2); }
          60% { filter: hue-rotate(0deg) skewX(-4deg) brightness(1); }
          100% { filter: hue-rotate(0deg) skewX(0deg) brightness(1); }
        }

        @keyframes globalFlash {
          0% { background: rgba(2, 7, 6, 0.88); }
          8% { background: rgba(255, 107, 125, 0.4); }
          100% { background: rgba(2, 7, 6, 0.88); }
        }
        @keyframes guardFlash {
          0% { background: rgba(2, 7, 6, 0.88); }
          8% { background: rgba(143, 255, 234, 0.24); }
          100% { background: rgba(2, 7, 6, 0.88); }
        }
        @keyframes dmgPop {
          0% { opacity: 0; transform: translateY(20px) scale(0.6) rotate(-15deg); }
          25% { opacity: 1; transform: translateY(-30px) scale(1.15) rotate(5deg); }
          75% { opacity: 1; transform: translateY(-35px) scale(1) rotate(0deg); }
          100% { opacity: 0; transform: translateY(-52px) scale(0.85); }
        }

        @keyframes skillCardEnter {
          from { transform: translateY(-50px) scale(0.85); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        @keyframes skillImgPulse {
          0% { filter: brightness(0.9) contrast(1.05); }
          100% { filter: brightness(1.1) contrast(1.15); }
        }

        @keyframes iconGlitchBlink {
          0%, 94%, 98% { opacity: 1; transform: scale(1) skewX(0); }
          95% { opacity: 0.25; transform: scale(1.15) skewX(-20deg); filter: hue-rotate(90deg); }
          96% { opacity: 0.8; transform: scale(0.9) skewX(15deg); }
          97% { opacity: 0.4; transform: scale(1.05) skewX(5deg); filter: hue-rotate(-90deg); }
          99% { opacity: 0.6; transform: scale(0.95) skewX(-5deg); }
        }

        .cinema-strip.has-signal {
          padding: 0 5%;
        }

        .action-signal-side {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 30%;
          position: relative;
          height: 100%;
          justify-content: center;
          transition: transform 0.22s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.2s;
          animation: skillCardEnter 0.45s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        /* Signal Card styling: very simple and compact */
        .cinema-card.signal-card {
          width: 170px;
          height: 220px;
          background: radial-gradient(circle at center, rgba(10, 18, 15, 0.98) 0%, rgba(1, 4, 3, 1) 100%);
          border: 2px solid;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 20px 12px;
          position: relative;
          overflow: hidden;
        }

        .signal-grid {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
          background-size: 12px 12px;
          pointer-events: none;
          z-index: 1;
        }

        .signal-icon { 
          font-size: 44px;
          color: var(--signal-color);
          filter: drop-shadow(0 0 8px var(--signal-color));
          z-index: 2;
          margin-top: 15px;
          animation: signalIconPulse 2s ease-in-out infinite alternate;
        }

        .signal-code {
          font-size: 9px;
          color: rgba(214, 255, 246, 0.4);
          font-family: "SF Mono", Courier, monospace;
          letter-spacing: 0.5px;
          z-index: 2;
          border-top: 1px dashed rgba(41, 255, 198, 0.15);
          width: 100%;
          text-align: center;
          padding-top: 8px;
        }

        .signal-label {
          font-size: 14px;
          font-weight: 800;
          color: var(--signal-color);
          text-shadow: 0 0 6px var(--signal-color);
          letter-spacing: 2px;
          z-index: 2;
          background: rgba(0,0,0,0.85);
          padding: 2px 12px;
          border-radius: 2px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        @keyframes signalIconPulse {
          0% { transform: scale(0.95); filter: drop-shadow(0 0 6px var(--signal-color)); }
          100% { transform: scale(1.05); filter: drop-shadow(0 0 14px var(--signal-color)); }
        }

        /* Zoom transition for signal card during attack phase */
        .cinema-overlay.phase-attack .action-signal-side {
          transform: perspective(800px) rotateX(10deg) scale(1.5) translateY(-8px);
          z-index: 100;
          filter: drop-shadow(0 0 20px var(--signal-color)) drop-shadow(0 0 40px var(--signal-color));
        }

        .cinema-overlay.phase-attack .action-signal-side .signal-card {
          border-color: #ffffff !important;
          box-shadow: 
            0 0 25px #ffffff, 
            0 0 50px var(--signal-color),
            inset 0 0 15px var(--signal-color) !important;
        }

        .cinema-overlay.phase-impact .action-signal-side {
          transform: scale(1.05) translateY(0);
          z-index: 5;
        }

        @keyframes skillZoomFlash {
          0% { filter: brightness(1) contrast(1); }
          30% { filter: brightness(1.8) contrast(1.3); }
          100% { filter: brightness(1.2) contrast(1.1); }
        }
      `}</style>

      <div className={`cinema-strip ${hasSkillCard ? "has-skill" : ""} ${isDefend ? "has-defend" : ""} ${hasSignal ? "has-signal" : ""} ${isSelfTarget ? "self-target-strip" : ""}`}>
        {/* Attacker (Left Side) */}
        <div className="actor-side left">
          <span className="actor-name-tag" style={{ color: factionCol(attacker.faction) }}>
            {attacker.name || attacker.id}
          </span>
          <div
            className="cinema-card"
            style={{
              borderColor: factionCol(attacker.faction),
              boxShadow: `0 0 14px ${factionCol(attacker.faction)}, inset 0 0 10px ${factionCol(attacker.faction)}`,
            }}
          >
            {renderActorImage(attacker, attackerSrc, "left")}
          </div>
          <span className="actor-label" style={{ borderColor: `${factionCol(attacker.faction)}40`, color: factionCol(attacker.faction) }}>
            {attacker.faction.toUpperCase()} // {attackerPose.toUpperCase()}
          </span>
        </div>

        {/* Projectile (Only in basic attack mode during the attack phase) */}
        {mode === "attack" && phase === "attack" && (
          <div
            className="cinema-projectile"
            style={{ "--proj-color": factionCol(attacker.faction) } as React.CSSProperties}
          />
        )}

        {/* Skill Card (Center Poster) */}
        {hasSkillCard && skillMeta && (
          <div className="skill-side">
            <span className="skill-role-tag" style={{ color: skillMeta.color }}>
              {skillMeta.role}
            </span>
            <div
              className="cinema-card skill-card"
              style={{
                borderColor: skillMeta.color,
                boxShadow: `0 0 16px ${skillMeta.color}, inset 0 0 12px ${skillMeta.color}`,
              }}
            >
              {!imgError && skillImgSrc ? (
                <img
                  className="skill-illustration"
                  src={skillImgSrc}
                  alt={skillMeta.nameKo}
                  onError={() => setImgError(true)}
                  draggable={false}
                />
              ) : (
                /* Procedural Neon Glitch Card Fallback */
                <div className="procedural-skill-bg" style={{ "--skill-color": skillMeta.color } as React.CSSProperties}>
                  <div className="tech-grid"></div>
                  <div className="skill-icon-huge">{skillMeta.icon}</div>
                  <div className="glitch-code-specs">
                    {skillMeta.glitchCodes.map((code, idx) => (
                      <div key={idx} className="spec-line">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Tech corner frame inside card */}
              <div className="tech-corner top-left" style={{ borderColor: skillMeta.color }}></div>
              <div className="tech-corner top-right" style={{ borderColor: skillMeta.color }}></div>
              <div className="tech-corner bottom-left" style={{ borderColor: skillMeta.color }}></div>
              <div className="tech-corner bottom-right" style={{ borderColor: skillMeta.color }}></div>
            </div>
            <span className="skill-title-tag" style={{ color: skillMeta.color, borderColor: `${skillMeta.color}60`, borderStyle: 'solid', borderWidth: '1px' }}>
              {skillMeta.icon} {skillMeta.nameKo} / {skillMeta.nameEn}
            </span>
          </div>
        )}

        {/* Action Signal Card (Center Poster for basic actions) */}
        {!hasSkillCard && actionSignal && (
          <div className="action-signal-side" style={{ "--signal-color": actionSignal.color } as React.CSSProperties}>
            <div
              className="cinema-card signal-card"
              style={{
                borderColor: actionSignal.color,
                boxShadow: `0 0 12px ${actionSignal.color}, inset 0 0 8px ${actionSignal.color}`,
              }}
            >
              <div className="signal-grid"></div>
              <div className="signal-icon">{actionSignal.icon}</div>
              <div className="signal-code">{actionSignal.code}</div>
              <div className="signal-label">{actionSignal.type}</div>
            </div>
          </div>
        )}

        {/* Floating damage pop (hidden during DEFEND to prevent duplicates) */}
        {!isDefend && (
          <div className={`damage-number ${(miss ? "evade" : (crit ? "critical" : ""))}`}>
            {miss ? "MISS" : (crit ? `CRIT! -${damage}` : `-${damage}`)}
          </div>
        )}

        {/* Defender (Right Side) */}
        <div className="actor-side right">
          <span className="actor-name-tag" style={{ color: factionCol(defender.faction) }}>
            {defender.name || defender.id}
          </span>
          <div
            className="cinema-card"
            style={{
              borderColor: factionCol(defender.faction),
              boxShadow: `0 0 14px ${defender.faction === "enemy" ? "#ff6b7d" : "#8fffea"}, inset 0 0 10px ${defender.faction === "enemy" ? "#ff6b7d" : "#8fffea"}`,
            }}
          >
            {renderActorImage(defender, defenderSrc, "right")}
          </div>
          <span className="actor-label" style={{ borderColor: `${factionCol(defender.faction)}40`, color: factionCol(defender.faction) }}>
            {defender.faction.toUpperCase()} // {defenderPose.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};
