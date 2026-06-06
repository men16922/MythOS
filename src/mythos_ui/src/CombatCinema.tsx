import React, { useEffect, useRef, useState } from "react";
import type { CombatBlip } from "./types";

interface CombatCinemaProps {
  attacker: CombatBlip;
  defender: CombatBlip;
  damage: number;
  crit?: boolean;
  skillName?: string;
  miss?: boolean;
  onFinish?: () => void;
  onImpact?: (defenderId: string, damage: number) => void; // HP 실시간 동기화 콜백
}

export const CombatCinema: React.FC<CombatCinemaProps> = ({
  attacker,
  defender,
  damage,
  crit = false,
  skillName,
  miss = false,
  onFinish,
  onImpact,
}) => {
  const [phase, setPhase] = useState<"enter" | "attack" | "impact" | "exit">("enter");

  // 적군 공격이거나 회피(miss)인 경우 빠른 속도로 진행
  const isFast = attacker.faction === "enemy" || miss;

  // Keep the latest callbacks in refs so the timeline effect can stay
  // mounted-once: if these were effect deps, every parent re-render would
  // recreate the inline callbacks, reset the timers, and onFinish could
  // never fire — leaving the full-screen overlay stuck (a blank screen).
  const onFinishRef = useRef(onFinish);
  const onImpactRef = useRef(onImpact);
  useEffect(() => {
    onFinishRef.current = onFinish;
    onImpactRef.current = onImpact;
  });

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;
    let t4: ReturnType<typeof setTimeout>;

    if (isFast) {
      // 1.0초 빠른 타임라인
      t1 = setTimeout(() => setPhase("attack"), 200);
      t2 = setTimeout(() => {
        setPhase("impact");
        onImpactRef.current?.(defender.id, damage);
      }, 400);
      t3 = setTimeout(() => setPhase("exit"), 800);
      t4 = setTimeout(() => {
        onFinishRef.current?.();
      }, 1000);
    } else {
      // 1.95초 표준 타임라인
      t1 = setTimeout(() => setPhase("attack"), 400);
      t2 = setTimeout(() => {
        setPhase("impact");
        onImpactRef.current?.(defender.id, damage);
      }, 750);
      t3 = setTimeout(() => setPhase("exit"), 1650);
      t4 = setTimeout(() => {
        onFinishRef.current?.();
      }, 1950);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isFast, defender.id, damage]);

  const factionCol = (faction: string) => (faction === "enemy" ? "#ff6b7d" : "#8fffea");

  const detectWeaponType = (b: CombatBlip, skill?: string): "blade" | "ranged" | "tech" | "pulse" => {
    const name = (b.name || b.id).toLowerCase();
    const skillNameLower = (skill || "").toLowerCase();
    
    if (
      skillNameLower.includes("해킹") || 
      skillNameLower.includes("노이즈") || 
      skillNameLower.includes("system") || 
      skillNameLower.includes("hack") || 
      skillNameLower.includes("overload") ||
      skillNameLower.includes("프로토콜")
    ) {
      return "tech";
    }
    if (
      name.includes("드론") || 
      name.includes("drone") || 
      name.includes("터렛") || 
      name.includes("turret") || 
      name.includes("경비") || 
      name.includes("guard") || 
      name.includes("gun") || 
      name.includes("sniper") ||
      name.includes("초소")
    ) {
      return "ranged";
    }
    if (
      name.includes("검") || 
      name.includes("blade") || 
      name.includes("saber") || 
      name.includes("용병") || 
      name.includes("mercenary") || 
      skillNameLower.includes("베기") || 
      skillNameLower.includes("slash") ||
      skillNameLower.includes("격투")
    ) {
      return "blade";
    }
    if (b.faction === "enemy") return "ranged";
    return "blade";
  };

  const renderHologram = (type: "blade" | "ranged" | "tech" | "pulse", color: string) => {
    switch (type) {
      case "blade":
        return (
          <svg viewBox="0 0 100 100" className="hologram-svg" style={{ width: "85%", height: "85%" }}>
            <circle cx="50" cy="50" r="42" stroke={color} strokeWidth="0.75" strokeDasharray="3 3" fill="none" opacity="0.25" />
            <path d="M 10 10 H 90 V 90 H 10 Z" stroke={color} strokeWidth="0.5" fill="none" opacity="0.3" />
            <line x1="15" y1="85" x2="85" y2="15" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="15" y1="85" x2="85" y2="15" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="28" y1="90" x2="10" y2="72" stroke={color} strokeWidth="6" strokeLinecap="round" />
            <line x1="30" y1="20" x2="35" y2="15" stroke={color} strokeWidth="1.5" />
            <line x1="65" y1="85" x2="70" y2="80" stroke={color} strokeWidth="1.5" />
          </svg>
        );
      case "ranged":
        return (
          <svg viewBox="0 0 100 100" className="hologram-svg" style={{ width: "85%", height: "85%" }}>
            <circle cx="50" cy="50" r="32" stroke={color} strokeWidth="2.5" fill="none" />
            <circle cx="50" cy="50" r="8" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" fill="none" />
            <line x1="50" y1="8" x2="50" y2="92" stroke={color} strokeWidth="1" strokeDasharray="4 4" />
            <line x1="8" y1="50" x2="92" y2="50" stroke={color} strokeWidth="1" strokeDasharray="4 4" />
            <path d="M 28 28 L 36 28 M 28 28 L 28 36 M 72 28 L 64 28 M 72 28 L 72 36 M 28 72 L 36 72 M 28 72 L 28 64 M 72 72 L 64 72 M 72 72 L 72 64" stroke={color} strokeWidth="3" fill="none" />
          </svg>
        );
      case "tech":
        return (
          <svg viewBox="0 0 100 100" className="hologram-svg" style={{ width: "85%", height: "85%" }}>
            <polygon points="50,12 85,32 85,68 50,88 15,68 15,32" stroke={color} strokeWidth="2.5" fill="none" />
            <polygon points="50,22 75,37 75,63 50,78 25,63 25,37" stroke={color} strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.5" />
            <line x1="50" y1="12" x2="50" y2="88" stroke={color} strokeWidth="1" opacity="0.3" />
            <line x1="15" y1="32" x2="85" y2="68" stroke={color} strokeWidth="1" opacity="0.3" />
            <line x1="15" y1="68" x2="85" y2="32" stroke={color} strokeWidth="1" opacity="0.3" />
            <circle cx="50" cy="50" r="6" fill="#fff" />
            <circle cx="50" cy="12" r="5.5" fill={color} />
            <circle cx="85" cy="32" r="5.5" fill={color} />
            <circle cx="85" cy="68" r="5.5" fill={color} />
            <circle cx="15" cy="32" r="5.5" fill={color} />
            <circle cx="15" cy="68" r="5.5" fill={color} />
          </svg>
        );
      case "pulse":
      default:
        return (
          <svg viewBox="0 0 100 100" className="hologram-svg" style={{ width: "90%", height: "90%" }}>
            <path d="M 10 50 L 25 50 L 33 15 L 43 85 L 51 38 L 57 65 L 65 50 L 90 50" stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 10 50 L 25 50 L 33 15 L 43 85 L 51 38 L 57 65 L 65 50 L 90 50" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="5" y="5" width="90" height="90" stroke={color} strokeWidth="0.75" strokeDasharray="5 5" fill="none" opacity="0.2" />
          </svg>
        );
    }
  };

  const renderDefenderHologram = (b: CombatBlip, color: string) => {
    if (b.faction === "enemy") {
      return (
        <svg viewBox="0 0 100 100" className="hologram-svg" style={{ width: "85%", height: "85%" }}>
          <circle cx="50" cy="50" r="36" stroke={color} strokeWidth="2.5" strokeDasharray="6 3" fill="none" />
          <polygon points="50,40 58,58 42,58" fill={color} opacity="0.9" />
          <line x1="50" y1="50" x2="50" y2="20" stroke={color} strokeWidth="1.5" />
          <path d="M 18 18 L 30 18 M 18 18 L 18 30 M 82 18 L 70 18 M 82 18 L 82 30 M 18 82 L 30 82 M 18 82 L 18 70 M 82 82 L 70 82 M 82 82 L 82 70" stroke={color} strokeWidth="2.5" fill="none" />
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 100 100" className="hologram-svg" style={{ width: "85%", height: "85%" }}>
          <polygon points="50,12 88,28 88,62 50,88 12,62 12,28" stroke={color} strokeWidth="2.5" fill="none" />
          <path d="M 50 12 L 50 88" stroke={color} strokeWidth="1.2" opacity="0.5" />
          <path d="M 12 28 L 88 28" stroke={color} strokeWidth="1" opacity="0.3" />
          <path d="M 12 62 L 88 62" stroke={color} strokeWidth="1" opacity="0.3" />
          <circle cx="50" cy="45" r="12" stroke={color} strokeWidth="1.5" fill="none" opacity="0.75" />
          <path d="M 40 45 H 60" stroke={color} strokeWidth="2.5" opacity="0.8" />
        </svg>
      );
    }
  };

  const attWeaponType = detectWeaponType(attacker, skillName);

  return (
    <div className={`cinema-overlay phase-${phase} ${isFast ? "fast-speed" : ""}`}>
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
          height: 250px;
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
        
        .actor-side.left {
          transition: transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .actor-side.right {
          transition: transform 0.12s ease-out;
        }

        /* Tactical Hologram Panel */
        .cinema-card {
          width: 130px;
          height: 160px;
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

        /* Technical crosshair lines in corner of the panel */
        .cinema-card::before {
          content: "";
          position: absolute;
          top: 4px; left: 4px; right: 4px; bottom: 4px;
          border: 0.5px solid rgba(255,255,255,0.06);
          pointer-events: none;
        }

        /* Neon Base light scan lines inside cards */
        .cinema-card::after {
          content: "";
          position: absolute;
          top: -100%; left: 0; width: 100%; height: 100%;
          background: linear-gradient(180deg, transparent, rgba(41,255,198,0.12), transparent);
          animation: scanLine 2s infinite linear;
          pointer-events: none;
        }

        .hologram-svg {
          animation: hologramFloat 3s ease-in-out infinite alternate;
        }

        /* Lunge Actions */
        .phase-attack .actor-side.left {
          transform: translateX(110px) scale(1.15);
        }
        
        /* Glitch Stagger and Crash on defender */
        .phase-impact .actor-side.right {
          animation: staggerShake 0.45s ease-out forwards;
        }
        .phase-impact .actor-side.right .cinema-card {
          animation: cardGlitchCrash 0.42s ease-out forwards;
        }
        .phase-impact {
          animation: globalFlash 0.3s ease-out forwards;
        }
        .phase-exit {
          opacity: 0;
        }

        /* Diagonal Slash text */
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
        .phase-attack .slash-banner {
          animation: slashAppear 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        /* Floating Damage Text */
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
        .phase-impact .damage-number {
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

        /* Fast speed overrides for enemy turn or misses */
        .cinema-overlay.fast-speed .cinema-strip {
          animation-duration: 0.18s;
          height: 220px;
        }
        .cinema-overlay.fast-speed .actor-side.left {
          transition-duration: 0.08s;
        }
        .cinema-overlay.fast-speed .actor-side.right {
          transition-duration: 0.06s;
        }
        .phase-attack.fast-speed .actor-side.left {
          transform: translateX(110px) scale(1.1);
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

        /* Keyframes */
        @keyframes stripEnter {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        @keyframes scanLine {
          from { top: -100%; }
          to { top: 100%; }
        }
        @keyframes hologramFloat {
          0% { transform: translateY(2px) scale(0.98); }
          100% { transform: translateY(-3px) scale(1.02); }
        }
        @keyframes slashAppear {
          0% { transform: translate(-50%, -50%) rotate(-6deg) scaleX(0); opacity: 0; }
          45% { transform: translate(-50%, -50%) rotate(-6deg) scaleX(1.15); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(-6deg) scaleX(1); opacity: 0.95; }
        }
        @keyframes staggerShake {
          0% { transform: translateX(0); }
          12% { transform: translateX(25px) rotate(4deg); }
          24% { transform: translateX(-18px) rotate(-3deg); }
          36% { transform: translateX(8px) rotate(1deg); }
          50% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
        
        /* Card Glitch and Hue skewing on impact */
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
        @keyframes dmgPop {
          0% { opacity: 0; transform: translateY(20px) scale(0.6) rotate(-15deg); }
          25% { opacity: 1; transform: translateY(-30px) scale(1.15) rotate(5deg); }
          75% { opacity: 1; transform: translateY(-35px) scale(1) rotate(0deg); }
          100% { opacity: 0; transform: translateY(-52px) scale(0.85); }
        }
      `}</style>

      <div className="cinema-strip">
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
            {renderHologram(attWeaponType, factionCol(attacker.faction))}
          </div>
          <span className="actor-label" style={{ borderColor: `${factionCol(attacker.faction)}40`, color: factionCol(attacker.faction) }}>
            {attacker.faction.toUpperCase()} // WEAPON: {attWeaponType.toUpperCase()}
          </span>
        </div>

        {/* Tactical Slash Banner */}
        <div className="slash-banner" style={{
          background: factionCol(attacker.faction),
          boxShadow: `0 0 18px ${factionCol(attacker.faction)}`
        }}>
          {miss ? "⚡ EVADE" : (skillName ? `⚡ ${skillName}` : "⚔️ ATTACK")}
        </div>

        {/* Floating damage pop */}
        <div className={`damage-number ${miss ? "evade" : (crit ? "critical" : "")}`}>
          {miss ? "MISS" : (crit ? `CRIT! -${damage}` : `-${damage}`)}
        </div>

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
            {renderDefenderHologram(defender, factionCol(defender.faction))}
          </div>
          <span className="actor-label" style={{ borderColor: `${factionCol(defender.faction)}40`, color: factionCol(defender.faction) }}>
            {defender.faction.toUpperCase()} // STATUS: ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
};
