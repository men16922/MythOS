import { drawCombatCanvas } from "./combatCanvas";
import type { CombatOverlay } from "./combatCanvas";
import { diffCombat } from "./combatDiff";
import type { CombatEvent } from "./combatDiff";
import type { CombatAction, CombatState } from "./types";
import { getSkillFx, LOCAL_SKILL_REGISTRY } from "./combatAnim";

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

const MOVE_DUR = 260;
const HIT_DUR = 440;
const DEATH_DUR = 520;
const TOTAL_CAP = 1500;

interface AnimateOptions {
  dispatched?: CombatAction | null;
  instant?: boolean;
  onSfx?: (key: string) => void;
}

interface Scheduled {
  ev: CombatEvent;
  start: number;
  dur: number;
}

interface SfxTrigger {
  at: number;
  key: string;
  fired?: boolean;
}

// An inferred attack: attacker -> target. Every damage event gets one so the
// aggressor is visible (a melee lunge or a ranged tracer), not just the victim.
interface Attack {
  aId: string;
  tId: string;
  start: number; // tracer/lunge lead-in
  impactAt: number; // aligns with the damage event start
  melee: boolean;
  color: string;
  skill: boolean;
  hitStopTriggered?: boolean;
  role?: string;
  tags?: string[];
}

function partySide(faction: string): "enemy" | "party" {
  return faction === "enemy" ? "enemy" : "party";
}

function cheb(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

// Drives combat board animation: diffs the previous board against the next one,
// builds a short staggered timeline, and runs a rAF loop that re-renders the
// board with a per-frame overlay (movement tweens, damage flashes / numbers,
// HP-bar drain, death fades, skill cast cue). Honors an instant path for
// reduced-motion / deterministic E2E so the final state settles synchronously.
export class CombatAnimator {
  private raf = 0;
  private animating = false;
  private getCanvas: () => HTMLCanvasElement | null;
  private scenarioId: string;

  constructor(getCanvas: () => HTMLCanvasElement | null, scenarioId: string) {
    this.getCanvas = getCanvas;
    this.scenarioId = scenarioId;
  }

  setScenario(id: string): void {
    this.scenarioId = id;
  }

  isAnimating(): boolean {
    return this.animating;
  }

  cancel(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.animating = false;
  }

  drawStatic(state: CombatState): void {
    const canvas = this.getCanvas();
    if (canvas) drawCombatCanvas(canvas, state, this.scenarioId);
  }

  animate(prev: CombatState | null, next: CombatState, opts: AnimateOptions = {}): void {
    this.cancel();
    const canvas = this.getCanvas();
    if (!canvas) return;

    const events = diffCombat(prev, next);
    const endSfx = (): void => {
      if (next.finished) {
        opts.onSfx?.(next.outcome === "player_defeat" ? "sfx_defeat" : "sfx_victory");
      }
    };

    const hasDispatchedSkill = opts.dispatched?.type === "skill";
    if (opts.instant || (events.length === 0 && !hasDispatchedSkill)) {
      drawCombatCanvas(canvas, next, this.scenarioId);
      if (events.some((e) => e.kind === "move") && !events.some((e) => e.kind === "damage")) {
        opts.onSfx?.("sfx_move");
      }
      if (events.some((e) => e.kind === "damage")) opts.onSfx?.("sfx_attack");
      if (events.some((e) => e.kind === "defend" && e.on)) opts.onSfx?.("sfx_defend");
      endSfx();
      return;
    }

    // --- Build the timeline --------------------------------------------------
    const moveEvents = events.filter((e) => e.kind === "move");
    const hitEvents = events.filter((e) => e.kind === "damage" || e.kind === "heal");
    const deathEvents = events.filter((e) => e.kind === "death");
    const hasMove = moveEvents.length > 0;
    const hitBase = hasMove ? 200 : 60;

    const sched: Scheduled[] = [];
    moveEvents.forEach((ev) => sched.push({ ev, start: 0, dur: MOVE_DUR }));
    hitEvents.forEach((ev, i) => sched.push({ ev, start: hitBase + i * 130, dur: HIT_DUR }));
    const deathBase = hitBase + hitEvents.length * 130;
    deathEvents.forEach((ev, i) => sched.push({ ev, start: deathBase + i * 90, dur: DEATH_DUR }));

    const firstHitStart = hitEvents.length ? hitBase : 0;
    const attacks = this.buildAttacks(next, hitEvents, hitBase, opts.dispatched);

    let total = 0;
    sched.forEach((s) => (total = Math.max(total, s.start + s.dur)));
    attacks.forEach((a) => (total = Math.max(total, a.impactAt + 160)));
    total = Math.min(TOTAL_CAP, total);

    // --- Sfx triggers --------------------------------------------------------
    const sfx: SfxTrigger[] = [];
    if (hasMove && hitEvents.length === 0) sfx.push({ at: 0, key: "sfx_move" });
    if (events.some((e) => e.kind === "defend" && e.on)) sfx.push({ at: hitBase, key: "sfx_defend" });
    if (hitEvents.length) sfx.push({ at: firstHitStart, key: "sfx_attack" });

    const blipPos = (id: string): [number, number] => {
      const b = next.radar.blips.find((x) => x.id === id);
      return b ? [b.x, b.y] : [0, 0];
    };

    // Current rendered cell position of a blip: its move-tween override if any,
    // else its settled position.
    const curPos = (overlay: CombatOverlay, id: string): [number, number] => {
      const ov = overlay.blips?.[id];
      if (ov?.cellX != null && ov.cellY != null) return [ov.cellX, ov.cellY];
      return blipPos(id);
    };

    const computeOverlay = (t: number): CombatOverlay => {
      const overlay: CombatOverlay = { blips: {}, floats: [], fx: [], shakeX: 0, shakeY: 0 };
      const ovFor = (id: string) => overlay.blips![id] || (overlay.blips![id] = {});

      for (const s of sched) {
        const local = (t - s.start) / s.dur;
        const ev = s.ev;

        if (ev.kind === "move") {
          if (local < 1) {
            const p = easeOut(clamp01(local));
            const ov = ovFor(ev.id);
            ov.cellX = ev.from[0] + (ev.to[0] - ev.from[0]) * p;
            ov.cellY = ev.from[1] + (ev.to[1] - ev.from[1]) * p;
          }
        } else if (ev.kind === "damage" || ev.kind === "heal") {
          const ov = ovFor(ev.id);
          const isDmg = ev.kind === "damage";
          const col = isDmg ? "#ff5566" : "#7dff9b";

          if (local < 1) {
            ov.hpRatio =
              local <= 0
                ? ev.fromRatio
                : ev.fromRatio + (ev.toRatio - ev.fromRatio) * easeOut(clamp01(local));
          }

          if (local >= 0 && local <= 1) {
            if (local <= 0.3) {
              const fp = 1 - local / 0.3;
              ov.flash = Math.max(ov.flash || 0, fp);
              ov.flashColor = col;
              ov.scale = Math.max(ov.scale || 1, 1 + (isDmg ? 0.16 : 0.1) * fp);
            }
            const [px, py] = ov.cellX != null && ov.cellY != null ? [ov.cellX, ov.cellY] : blipPos(ev.id);
            if (isDmg && local <= 0.4) {
              const sp = 1 - local / 0.4;
              overlay.fx!.push({
                kind: "spark",
                cellX: px + 0.5,
                cellY: py + 0.5,
                cellR: 0.12 + 0.22 * sp,
                color: "#ffd0d0",
                alpha: 0.8 * sp,
              });
            }
            overlay.floats!.push({
              cellX: px + 0.5,
              cellY: py + 0.15 - 0.7 * local,
              text: (isDmg ? "-" : "+") + ev.amount,
              color: col,
              alpha: clamp01(1 - (local - 0.4) / 0.6),
              size: 15,
            });
          }
        } else if (ev.kind === "death") {
          if (local > 0) {
            const ov = ovFor(ev.id);
            ov.alpha = 1 + (0.28 - 1) * easeOut(clamp01(local));
          }
        }
      }

      // Attacker & Defender effects
      for (const atk of attacks) {
        const winEnd = atk.impactAt + 150;
        if (t < atk.start || t > winEnd) continue;
        const [ax, ay] = curPos(overlay, atk.aId);
        const [tx, ty] = curPos(overlay, atk.tId);
        const lead = Math.max(1, atk.impactAt - atk.start);
        const pulse =
          t <= atk.impactAt
            ? easeOut(clamp01((t - atk.start) / lead))
            : 1 - clamp01((t - atk.impactAt) / 150);

        if (atk.melee) {
          const dx = tx - ax;
          const dy = ty - ay;
          const len = Math.hypot(dx, dy) || 1;
          const ov = ovFor(atk.aId);
          if (ov.cellX == null) ov.cellX = ax;
          if (ov.cellY == null) ov.cellY = ay;
          ov.cellX += (dx / len) * 0.42 * pulse;
          ov.cellY += (dy / len) * 0.42 * pulse;
          ov.pose = atk.skill ? "skill" : "attack";
        } else {
          const ov = ovFor(atk.aId);
          ov.pose = atk.skill ? "skill" : "attack";
          overlay.fx!.push({
            kind: "tracer",
            x1: ax + 0.5,
            y1: ay + 0.5,
            x2: tx + 0.5,
            y2: ty + 0.5,
            color: atk.color,
            alpha: 0.85 * pulse,
            width: atk.skill ? 2.6 : 1.8,
          });
        }

        // Stagger the target on impact: 150ms starting from impactAt
        if (t >= atk.impactAt) {
          const stagDur = 150;
          const stagProgress = clamp01((t - atk.impactAt) / stagDur);
          const stagPulse = Math.sin(stagProgress * Math.PI); // 0 -> 1 -> 0
          const dx = tx - ax;
          const dy = ty - ay;
          const len = Math.hypot(dx, dy) || 1;
          const tOv = ovFor(atk.tId);
          if (tOv.cellX == null) tOv.cellX = tx;
          if (tOv.cellY == null) tOv.cellY = ty;
          const pushAmt = (atk.skill ? 0.32 : 0.18) * stagPulse;
          tOv.cellX += (dx / len) * pushAmt;
          tOv.cellY += (dy / len) * pushAmt;
          tOv.pose = "hit";
        }

        if (atk.skill && t < atk.start + 320) {
          const localT = t - atk.start;
          const dur = 320;
          const skillFx = getSkillFx(
            atk.role || "fallback",
            atk.tags || [],
            localT,
            dur,
            ax,
            ay,
            tx,
            ty,
            atk.color
          );
          overlay.fx!.push(...skillFx);
        }
      }

      // Screen shake calculation
      let shakeX = 0;
      let shakeY = 0;
      for (const atk of attacks) {
        if (t >= atk.impactAt && t < atk.impactAt + 240) {
          const age = t - atk.impactAt;
          const ratio = 1 - age / 240;
          const amp = (atk.skill ? 8.5 : 4.5) * ratio;
          shakeX += Math.sin(age * 0.18) * amp;
          shakeY += Math.cos(age * 0.22) * amp;
        }
      }
      overlay.shakeX = shakeX;
      overlay.shakeY = shakeY;

      return overlay;
    };

    let lastTime = performance.now();
    let accumT = 0;
    let hitStopRemaining = 0;
    this.animating = true;

    const frame = (): void => {
      const now = performance.now();
      let dt = now - lastTime;
      lastTime = now;

      // Hit-stop logic: freeze timeline progress
      if (hitStopRemaining > 0) {
        hitStopRemaining -= dt;
        if (hitStopRemaining < 0) {
          dt = -hitStopRemaining;
          hitStopRemaining = 0;
        } else {
          dt = 0;
        }
      }

      accumT += dt;
      const t = accumT;

      // Trigger hit-stop on impact
      for (const atk of attacks) {
        if (!atk.hitStopTriggered && t >= atk.impactAt) {
          atk.hitStopTriggered = true;
          hitStopRemaining = atk.skill ? 55 : 35; // Brief freeze (55ms / 35ms)
        }
      }

      sfx.forEach((tr) => {
        if (!tr.fired && t >= tr.at) {
          tr.fired = true;
          opts.onSfx?.(tr.key);
        }
      });
      drawCombatCanvas(canvas, next, this.scenarioId, undefined, computeOverlay(t));
      if (t < total) {
        this.raf = requestAnimationFrame(frame);
      } else {
        this.raf = 0;
        this.animating = false;
        drawCombatCanvas(canvas, next, this.scenarioId);
        endSfx();
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  // One attack per damage event so every aggressor is visible. The snapshot
  // diff can't say who hit whom, so we infer the attacker: the player's
  // dispatched target is exact; otherwise the nearest living opposite-side unit.
  private buildAttacks(
    next: CombatState,
    hitEvents: CombatEvent[],
    hitBase: number,
    dispatched?: CombatAction | null
  ): Attack[] {
    const blips = next.radar.blips;
    const byId = (id: string) => blips.find((b) => b.id === id);
    const attacks: Attack[] = [];

    // Manually register dispatched or log-based utility skills (like mobility or defense buffs)
    // that don't trigger direct damage/heal events, ensuring their canvas FX render.
    let utilityRegistered = false;

    // A. Dispatched player utility skill
    if (dispatched && dispatched.type === "skill" && dispatched.skill_id) {
      const caster = blips.find((b) => b.faction === "player");
      const target = dispatched.target_id ? byId(dispatched.target_id) : caster;
      if (caster && target) {
        const staticMeta = LOCAL_SKILL_REGISTRY[dispatched.skill_id];
        const role = staticMeta?.role || "fallback";
        const tags = staticMeta?.tags || [];
        
        const alreadyCovered = hitEvents.some(ev => ev.id === target.id && (ev.kind === "damage" || ev.kind === "heal"));
        if (!alreadyCovered) {
          const impactAt = hitBase;
          attacks.push({
            aId: caster.id,
            tId: target.id,
            start: Math.max(0, impactAt - 120),
            impactAt,
            melee: false,
            color: "#8fffea",
            skill: true,
            role,
            tags,
          });
          utilityRegistered = true;
        }
      }
    }

    // B. NPC / Log-based utility skill (for AI turns or fallback)
    if (!utilityRegistered && next.log) {
      const lastActorEntry = next.log.slice().reverse().find(entry => entry.actor !== "system");
      if (lastActorEntry) {
        const actorLogs = next.log.filter(entry => entry.actor === lastActorEntry.actor);
        const lastLog = actorLogs[actorLogs.length - 1];
        const prevLog = actorLogs[actorLogs.length - 2];
        let skillLog = null;
        if (lastLog && lastLog.action === "skill") {
          skillLog = lastLog;
        } else if (prevLog && prevLog.action === "skill") {
          const validFollowUps = ["hit", "info", "defend", "miss", "defeat"];
          if (lastLog && validFollowUps.includes(lastLog.action)) {
            skillLog = prevLog;
          }
        }
        if (skillLog) {
          const caster = blips.find(b => b.id === lastActorEntry.actor);
          let targetId = skillLog.detail.target || skillLog.detail.target_id;
          if (!targetId && lastLog && lastLog.action === "hit") {
            targetId = lastLog.detail.target;
          }
          if (!targetId && lastLog && lastLog.action === "defend") {
            targetId = lastLog.actor; // self-target
          }
          const target = targetId ? byId(targetId) : caster;
          if (caster && target) {
            const skillId = skillLog.detail.skill_id || skillLog.detail.skill || "";
            const staticMeta = LOCAL_SKILL_REGISTRY[skillId];
            const role = staticMeta?.role || "fallback";
            const tags = staticMeta?.tags || [];
            
            const alreadyCovered = hitEvents.some(ev => ev.id === target.id);
            if (!alreadyCovered) {
              const impactAt = hitBase;
              attacks.push({
                aId: caster.id,
                tId: target.id,
                start: Math.max(0, impactAt - 120),
                impactAt,
                melee: false,
                color: caster.faction === "enemy" ? "#ff6b7d" : (caster.faction === "player" ? "#8fffea" : "#7dff9b"),
                skill: true,
                role,
                tags,
              });
            }
          }
        }
      }
    }

    hitEvents.forEach((ev, i) => {
      if (ev.kind !== "damage" && ev.kind !== "heal") return;
      const isHeal = ev.kind === "heal";
      const target = byId(ev.id);
      if (!target) return;
      const tSide = partySide(target.faction);

      let attacker = null as (typeof blips)[number] | null;
      let skill = false;
      let role: string | undefined = undefined;
      let tags: string[] | undefined = undefined;

      if (
        dispatched &&
        dispatched.target_id === ev.id &&
        (dispatched.type === "attack" || dispatched.type === "skill")
      ) {
        attacker = blips.find((b) => b.faction === "player") || null;
        skill = dispatched.type === "skill";
        if (skill && dispatched.skill_id) {
          const skInfo = next.available?.skills?.find(sk => sk.id === dispatched.skill_id);
          if (skInfo) {
            role = skInfo.role;
            tags = skInfo.tags;
          } else {
            const staticMeta = LOCAL_SKILL_REGISTRY[dispatched.skill_id];
            if (staticMeta) {
              role = staticMeta.role;
              tags = staticMeta.tags;
            }
          }
        }
      }
      // 2. Try to find the exact attacker from the combat log history
      if (!attacker && next.log) {
        const lastActorEntry = next.log.slice().reverse().find(entry => entry.actor !== "system");
        if (lastActorEntry) {
          attacker = blips.find(b => b.id === lastActorEntry.actor) || null;
        }
      }

      // 3. Fallback to proximity-based matching if still not found
      if (!attacker) {
        const cands = blips.filter(
          (b) => b.alive !== false && b.id !== ev.id && (isHeal ? partySide(b.faction) === tSide : partySide(b.faction) !== tSide)
        );
        attacker = cands.reduce<(typeof blips)[number] | null>((best, b) => {
          if (!best) return b;
          return cheb(b.x, b.y, target.x, target.y) < cheb(best.x, best.y, target.x, target.y)
            ? b
            : best;
        }, null);
      }

      // For AI and fallback matching, check log history to detect skill details
      if (attacker) {
        const actorLogs = next.log?.filter(entry => entry.actor === attacker?.id) || [];
        const lastLog = actorLogs[actorLogs.length - 1];
        const prevLog = actorLogs[actorLogs.length - 2];
        let skillLog = null;
        if (lastLog && lastLog.action === "skill") {
          skillLog = lastLog;
        } else if (prevLog && prevLog.action === "skill") {
          const validFollowUps = ["hit", "info", "defend", "miss", "defeat"];
          if (lastLog && validFollowUps.includes(lastLog.action)) {
            skillLog = prevLog;
          }
        }
        if (skillLog) {
          skill = true;
          const skillId = skillLog.detail.skill_id || skillLog.detail.skill || "";
          if (skillId) {
            const staticMeta = LOCAL_SKILL_REGISTRY[skillId];
            if (staticMeta) {
              role = staticMeta.role;
              tags = staticMeta.tags;
            }
          }
        }
      }

      const impactAt = hitBase + i * 130;
      attacks.push({
        aId: attacker ? attacker.id : ev.id,
        tId: target.id,
        start: Math.max(0, impactAt - 120),
        impactAt,
        melee: isHeal ? false : (attacker ? cheb(attacker.x, attacker.y, target.x, target.y) <= 1 : false),
        color: isHeal ? "#7dff9b" : (attacker && attacker.faction === "enemy" ? "#ff6b7d" : "#8fffea"),
        skill,
        role,
        tags,
      });
    });

    return attacks;
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
