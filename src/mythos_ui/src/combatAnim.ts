import type { CombatFx } from "./combatCanvas";

export interface SkillAnimationProfile {
  role: string;
  tags: string[];
  color: string;
  fxCount: number;
}

export const LOCAL_SKILL_REGISTRY: Record<string, { role: string; tags: string[] }> = {
  "signal_step": { role: "mobility", tags: ["movement", "escape"] },
  "overload_strike": { role: "damage", tags: ["melee", "burst", "aoe"] },
  "packet_shot": { role: "damage", tags: ["ranged"] },
  "covering_noise": { role: "defense", tags: ["support", "evasion"] },
  "patch_protocol": { role: "healing", tags: ["item", "heal"] },
  "magnetic_pull": { role: "control", tags: ["ranged", "control"] },
  "magnetic_repulse": { role: "control", tags: ["ranged", "control"] },
  "emp_pulse": { role: "control", tags: ["debuff", "aoe", "disable"] },
  "system_hack": { role: "control", tags: ["hack", "debuff", "disable"] },
};

/**
 * Returns the animation profile and custom effects based on skill role and tags.
 */
export function getSkillFx(
  role: string,
  tags: string[],
  t: number, // local time since skill start (0 to duration)
  dur: number, // total skill effect duration (e.g., 320ms)
  ax: number, // source cell X
  ay: number, // source cell Y
  tx: number, // target cell X
  ty: number, // target cell Y
  baseColor: string
): CombatFx[] {
  const fx: CombatFx[] = [];
  const p = Math.max(0, Math.min(1, t / dur));
  
  if (role === "healing" || tags.includes("heal")) {
    // Healing Animation: Soft expanding green recovery aura ring + spark particles at target
    const green = "#7dff9b";
    
    // Expanding bottom ring
    fx.push({
      kind: "ring",
      cellX: tx + 0.5,
      cellY: ty + 0.5,
      cellR: 0.2 + 0.38 * p,
      color: green,
      alpha: 0.8 * (1 - p),
      width: 2.5,
    });
    
    // Rising sparkle aura (represented by small expanding spark particles)
    if (p > 0.1) {
      fx.push({
        kind: "spark",
        cellX: tx + 0.5 + Math.sin(p * 10) * 0.15,
        cellY: ty + 0.5 - 0.4 * p, // rise up
        cellR: 0.08 + 0.08 * (1 - p),
        color: "#ffffff",
        alpha: 0.9 * (1 - p),
      });
    }
  } 
  else if (role === "mobility" || tags.includes("movement")) {
    // Mobility/Blink: Purple teleport ring collapsing at source, expanding at target
    const violet = "#e07dff";
    
    // Collapse at source
    if (p < 0.5) {
      fx.push({
        kind: "ring",
        cellX: ax + 0.5,
        cellY: ay + 0.5,
        cellR: 0.45 * (1 - p * 2),
        color: violet,
        alpha: 0.85 * (1 - p * 2),
        width: 3,
      });
    } 
    // Expand at target
    else {
      const tp = (p - 0.5) * 2;
      fx.push({
        kind: "ring",
        cellX: tx + 0.5,
        cellY: ty + 0.5,
        cellR: 0.15 + 0.35 * tp,
        color: violet,
        alpha: 0.9 * (1 - tp),
        width: 2,
      });
      fx.push({
        kind: "spark",
        cellX: tx + 0.5,
        cellY: ty + 0.5,
        cellR: 0.08 + 0.12 * (1 - tp),
        color: "#ffffff",
        alpha: 0.8 * (1 - tp),
      });
    }
  } 
  else if (role === "control" || tags.includes("control") || tags.includes("disable")) {
    // Control (자기 견인 / EMP / 해킹): rings COLLAPSE onto the target — a
    // suction/seize cue, visually opposite of the outward damage burst.
    const violet = "#e07dff";
    fx.push({
      kind: "ring",
      cellX: tx + 0.5,
      cellY: ty + 0.5,
      cellR: 0.55 * (1 - p) + 0.1,
      color: violet,
      alpha: 0.85 * (0.4 + 0.6 * p),
      width: 3,
    });
    fx.push({
      kind: "ring",
      cellX: tx + 0.5,
      cellY: ty + 0.5,
      cellR: 0.8 * (1 - p) + 0.15,
      color: "#ffffff",
      alpha: 0.4 * (1 - p),
      width: 1.5,
    });
    // Caster-to-target seize line while the grip closes.
    if (p < 0.6) {
      fx.push({
        kind: "tracer",
        x1: ax + 0.5,
        y1: ay + 0.5,
        x2: tx + 0.5,
        y2: ty + 0.5,
        color: violet,
        alpha: 0.7 * (1 - p / 0.6),
        width: 2.2,
      });
    }
  }
  else if (role === "defense" || tags.includes("evasion") || tags.includes("support")) {
    // Defensive barrier: Dual layered blue protective shielding rings. When the
    // ward is cast on a different ally (target != source), shield the target;
    // otherwise it settles on the caster.
    const cyan = "#8fffea";
    const onAlly = tx !== ax || ty !== ay;
    const cx = (onAlly ? tx : ax) + 0.5;
    const cy = (onAlly ? ty : ay) + 0.5;

    // A travelling pulse from caster to ally telegraphs a granted ward.
    if (onAlly && p < 0.5) {
      const tp = p * 2;
      fx.push({
        kind: "spark",
        cellX: ax + 0.5 + (tx - ax) * tp,
        cellY: ay + 0.5 + (ty - ay) * tp,
        cellR: 0.1,
        color: cyan,
        alpha: 0.8 * (1 - tp),
      });
    }

    // Outer shield ring
    fx.push({
      kind: "ring",
      cellX: cx,
      cellY: cy,
      cellR: 0.38 + 0.08 * Math.sin(p * Math.PI * 2),
      color: cyan,
      alpha: 0.7 * (1 - p),
      width: 2,
    });

    // Inner pulse ring
    fx.push({
      kind: "ring",
      cellX: cx,
      cellY: cy,
      cellR: 0.22 + 0.2 * p,
      color: "#ffffff",
      alpha: 0.55 * (1 - p),
      width: 1.5,
    });
  }
  else if (role === "damage" && tags.includes("ranged")) {
    // Ranged Skill: Red muzzle flash at source + thick tracer beam + target spark splash
    const red = baseColor;
    
    // Tracer beam spanning from source to target
    fx.push({
      kind: "tracer",
      x1: ax + 0.5,
      y1: ay + 0.5,
      x2: tx + 0.5,
      y2: ty + 0.5,
      color: "#ffffff",
      alpha: 0.95 * (1 - p),
      width: 4.2 * (1 - p),
    });
    
    // Outer glow of tracer beam
    fx.push({
      kind: "tracer",
      x1: ax + 0.5,
      y1: ay + 0.5,
      x2: tx + 0.5,
      y2: ty + 0.5,
      color: red,
      alpha: 0.65 * (1 - p),
      width: 7.5 * (1 - p),
    });

    // Muzzle blast at source
    if (p < 0.3) {
      fx.push({
        kind: "spark",
        cellX: ax + 0.5,
        cellY: ay + 0.5,
        cellR: 0.1 + 0.18 * (1 - p / 0.3),
        color: "#ffd76a",
        alpha: 0.9,
      });
    }

    // AoE (펄스 폭발): the impact blooms into a blast wave that visibly covers
    // the splash radius, so "범위 피해" reads on the board.
    if (tags.includes("aoe") && p > 0.35) {
      const bp = (p - 0.35) / 0.65;
      fx.push({
        kind: "ring",
        cellX: tx + 0.5,
        cellY: ty + 0.5,
        cellR: 0.2 + 1.3 * bp,
        color: red,
        alpha: 0.75 * (1 - bp),
        width: 4 * (1 - bp) + 1,
      });
      fx.push({
        kind: "ring",
        cellX: tx + 0.5,
        cellY: ty + 0.5,
        cellR: 0.1 + 1.0 * bp,
        color: "#ffd76a",
        alpha: 0.5 * (1 - bp),
        width: 2,
      });
    }
  }
  else if (role === "damage" && tags.includes("melee")) {
    // Melee Burst: Massive spark slash explosion on target
    const yellow = "#ffd76a";
    if (p > 0.1 && p < 0.7) {
      const sp = (p - 0.1) / 0.6;
      fx.push({
        kind: "spark",
        cellX: tx + 0.5,
        cellY: ty + 0.5,
        cellR: 0.15 + 0.45 * (1 - sp),
        color: yellow,
        alpha: 0.9 * (1 - sp),
      });
      fx.push({
        kind: "spark",
        cellX: tx + 0.5,
        cellY: ty + 0.5,
        cellR: 0.28 + 0.2 * (1 - sp),
        color: baseColor,
        alpha: 0.7 * (1 - sp),
      });
    }
    // "burst" tag gets an extra outward shockwave ring for heavier impact;
    // an "aoe" burst (과부하 일격 splash) blooms out to the full blast radius.
    if (tags.includes("burst")) {
      fx.push({
        kind: "ring",
        cellX: tx + 0.5,
        cellY: ty + 0.5,
        cellR: 0.1 + (tags.includes("aoe") ? 1.4 : 0.6) * p,
        color: baseColor,
        alpha: 0.6 * (1 - p),
        width: 3 * (1 - p),
      });
    }
  }
  else {
    // Fallback: Standard skill expanding ring
    fx.push({
      kind: "ring",
      cellX: ax + 0.5,
      cellY: ay + 0.5,
      cellR: 0.28 + 0.2 * p,
      color: baseColor,
      alpha: 0.7 * (1 - p),
      width: 2,
    });
  }

  return fx;
}
