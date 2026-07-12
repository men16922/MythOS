import { drawCombatCanvas, STATUS_BADGES } from "./combatCanvas";
import type { CombatOverlay } from "./combatCanvas";
import { diffCombat } from "./combatDiff";
import type { CombatEvent } from "./combatDiff";
import type { CombatAction, CombatState } from "./types";
import { getSkillFx, LOCAL_SKILL_REGISTRY } from "./combatAnim";

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

const MOVE_DUR = 260;
const YANK_DUR = 230; // forced movement (밀기/당기기): a snatch, not a stroll
const YANK_IMPACT = 320; // arrival crunch window after the snatch lands
const STATUS_POP_DUR = 620; // status-apply burst (rings + icon float)
const HIT_DUR = 440;
const DEATH_DUR = 520;
const TOTAL_CAP = 1500;

// Forced-movement metadata mined from the engine log (detail.forced): lets the
// animator style a push/pull as a YANK — accelerating snatch + drag trail +
// arrival crunch — instead of the default walk tween that made the owner ask
// "발동이 된 건지도 모르겠다".
interface Yank {
  mode: "push" | "pull";
  from: [number, number];
  actorAt?: [number, number];
}

const easeIn = (t: number): number => t * t * t;

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

    // Mine this turn's new log entries for forced-movement (push/pull) marks.
    const newLog = (next.log || []).slice(prev?.log?.length ?? 0);
    const yanks = new Map<string, Yank>();
    for (const entry of newLog) {
      const d = entry.detail || {};
      if (
        (d.forced === "push" || d.forced === "pull") &&
        typeof d.target === "string" &&
        Array.isArray(d.from) &&
        (d.tiles as number) > 0
      ) {
        yanks.set(d.target, {
          mode: d.forced,
          from: d.from as [number, number],
          actorAt: Array.isArray(d.actor_at) ? (d.actor_at as [number, number]) : undefined,
        });
      }
    }

    // Status-apply pops (owner 2026-07-12 "시각적으로 강렬해야"): every applied
    // status gets a board burst — expanding rings in the status color + a big
    // floating badge — scheduled after the blow that caused it.
    const statusPops: { id: string; status: string; at: number }[] = [];
    {
      let popIndex = 0;
      for (const entry of newLog) {
        const d = entry.detail || {};
        if (typeof d.status === "string" && d.turns != null && typeof d.target === "string") {
          if (STATUS_BADGES[d.status]) {
            statusPops.push({
              id: d.target,
              status: d.status,
              at: (hasMove ? 200 : 60) + 180 + popIndex * 160,
            });
            popIndex += 1;
          }
        }
      }
    }

    const sched: Scheduled[] = [];
    moveEvents.forEach((ev) =>
      sched.push({ ev, start: 0, dur: yanks.has(ev.id) ? YANK_DUR : MOVE_DUR })
    );
    hitEvents.forEach((ev, i) => sched.push({ ev, start: hitBase + i * 130, dur: HIT_DUR }));
    const deathBase = hitBase + hitEvents.length * 130;
    deathEvents.forEach((ev, i) => sched.push({ ev, start: deathBase + i * 90, dur: DEATH_DUR }));

    const firstHitStart = hitEvents.length ? hitBase : 0;
    const attacks = this.buildAttacks(next, hitEvents, hitBase, opts.dispatched);

    let total = 0;
    sched.forEach((s) => (total = Math.max(total, s.start + s.dur)));
    attacks.forEach((a) => (total = Math.max(total, a.impactAt + 160)));
    statusPops.forEach((p) => (total = Math.max(total, p.at + STATUS_POP_DUR)));
    sched.forEach((s) => {
      if (s.ev.kind === "move" && yanks.has(s.ev.id)) {
        total = Math.max(total, s.start + s.dur + YANK_IMPACT);
      }
    });
    total = Math.min(TOTAL_CAP + 600, total);

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
          const yank = yanks.get(ev.id);
          if (local < 1) {
            // Yanks ACCELERATE into the destination (snatch); walks decelerate.
            const p = yank ? easeIn(clamp01(local)) : easeOut(clamp01(local));
            const ov = ovFor(ev.id);
            ov.cellX = ev.from[0] + (ev.to[0] - ev.from[0]) * p;
            ov.cellY = ev.from[1] + (ev.to[1] - ev.from[1]) * p;
            if (yank) {
              ov.pose = "hit";
              const color = yank.mode === "pull" ? "#e07dff" : "#ffb347";
              // Drag trail: a fading streak from the origin to the unit.
              overlay.fx!.push({
                kind: "tracer",
                x1: ev.from[0] + 0.5,
                y1: ev.from[1] + 0.5,
                x2: ov.cellX + 0.5,
                y2: ov.cellY + 0.5,
                color,
                alpha: 0.85,
                width: 5 * (1 - clamp01(local) * 0.5),
              });
              // Pull shows the magnet line from the caster while dragging.
              if (yank.mode === "pull" && yank.actorAt) {
                overlay.fx!.push({
                  kind: "tracer",
                  x1: yank.actorAt[0] + 0.5,
                  y1: yank.actorAt[1] + 0.5,
                  x2: ov.cellX + 0.5,
                  y2: ov.cellY + 0.5,
                  color,
                  alpha: 0.5,
                  width: 2,
                });
              }
            }
          } else if (yank) {
            // Arrival crunch: a BIG double shockwave + white flash + sparks +
            // a brief hit pose right where the unit slammed down (owner
            // 2026-07-12 "밀려나는 게 안 보임" — this has to be unmissable).
            const age = t - (s.start + s.dur);
            if (age >= 0 && age <= YANK_IMPACT) {
              const ip = age / YANK_IMPACT;
              const color = yank.mode === "pull" ? "#e07dff" : "#ffb347";
              const ov = ovFor(ev.id);
              ov.pose = "hit";
              ov.flash = Math.max(ov.flash || 0, 0.9 * (1 - ip));
              ov.flashColor = color;
              overlay.fx!.push({
                kind: "ring",
                cellX: ev.to[0] + 0.5,
                cellY: ev.to[1] + 0.5,
                cellR: 0.15 + 0.95 * ip,
                color,
                alpha: 0.9 * (1 - ip),
                width: 5 * (1 - ip) + 1,
              });
              overlay.fx!.push({
                kind: "ring",
                cellX: ev.to[0] + 0.5,
                cellY: ev.to[1] + 0.5,
                cellR: 0.1 + 0.55 * ip,
                color: "#ffffff",
                alpha: 0.7 * (1 - ip),
                width: 2.5,
              });
              overlay.fx!.push({
                kind: "spark",
                cellX: ev.to[0] + 0.5,
                cellY: ev.to[1] + 0.5,
                cellR: 0.14 + 0.34 * (1 - ip),
                color: "#ffffff",
                alpha: 0.95 * (1 - ip),
              });
              overlay.floats!.push({
                cellX: ev.to[0] + 0.5,
                cellY: ev.to[1] - 0.1 - 0.55 * ip,
                text: yank.mode === "pull" ? "끌려옴!" : "밀려남!",
                color,
                alpha: 1 - ip * 0.7,
                size: 18,
              });
            }
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

      // Status-apply pops: double shockwave in the status color + the badge
      // floating up + a flash tint on the afflicted unit.
      for (const pop of statusPops) {
        const local = (t - pop.at) / STATUS_POP_DUR;
        if (local < 0 || local > 1) continue;
        const meta = STATUS_BADGES[pop.status];
        const [px, py] = curPos(overlay, pop.id);
        const ov = ovFor(pop.id);
        if (local < 0.35) {
          ov.flash = Math.max(ov.flash || 0, 1 - local / 0.35);
          ov.flashColor = meta.bg;
        }
        overlay.fx!.push({
          kind: "ring",
          cellX: px + 0.5,
          cellY: py + 0.5,
          cellR: 0.15 + 1.05 * local,
          color: meta.bg,
          alpha: 0.85 * (1 - local),
          width: 4.5 * (1 - local) + 1,
        });
        overlay.fx!.push({
          kind: "ring",
          cellX: px + 0.5,
          cellY: py + 0.5,
          cellR: 0.1 + 0.6 * local,
          color: "#ffffff",
          alpha: 0.55 * (1 - local),
          width: 2,
        });
        overlay.floats!.push({
          cellX: px + 0.5,
          cellY: py - 0.2 - 0.8 * local,
          text: meta.label,
          color: meta.bg,
          alpha: 1 - local * 0.6,
          size: 22,
        });
      }

      // Screen shake calculation
      let shakeX = 0;
      let shakeY = 0;
      for (const atk of attacks) {
        if (t >= atk.impactAt && t < atk.impactAt + 240) {
          const age = t - atk.impactAt;
          const ratio = 1 - age / 240;
          // AoE blasts (스플래시) rattle the board harder than single hits.
          const aoeBoost = atk.tags?.includes("aoe") ? 1.7 : 1;
          const amp = (atk.skill ? 8.5 : 4.5) * ratio * aoeBoost;
          shakeX += Math.sin(age * 0.18) * amp;
          shakeY += Math.cos(age * 0.22) * amp;
        }
      }
      // Yank arrivals thump the board too — the crunch is what sells the drag.
      for (const s of sched) {
        if (s.ev.kind !== "move" || !yanks.has(s.ev.id)) continue;
        const impactAt = s.start + s.dur;
        if (t >= impactAt && t < impactAt + 220) {
          const age = t - impactAt;
          const ratio = 1 - age / 220;
          shakeX += Math.sin(age * 0.2) * 12 * ratio;
          shakeY += Math.cos(age * 0.24) * 12 * ratio;
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
