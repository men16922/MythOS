import { drawCombatCanvas } from "./combatCanvas";
import type { CombatOverlay } from "./combatCanvas";
import { diffCombat } from "./combatDiff";
import type { CombatEvent } from "./combatDiff";
import type { CombatAction, CombatState } from "./types";

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

interface Connector {
  ax: number;
  ay: number;
  tx: number;
  ty: number;
  color: string;
  skill: boolean;
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

    if (opts.instant || events.length === 0) {
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
    const connector = this.buildConnector(next, events, opts.dispatched);
    const connectorEnd = connector ? firstHitStart + 220 : 0;

    let total = 0;
    sched.forEach((s) => (total = Math.max(total, s.start + s.dur)));
    total = Math.min(TOTAL_CAP, Math.max(total, connectorEnd));

    // --- Sfx triggers --------------------------------------------------------
    const sfx: SfxTrigger[] = [];
    if (hasMove && hitEvents.length === 0) sfx.push({ at: 0, key: "sfx_move" });
    if (events.some((e) => e.kind === "defend" && e.on)) sfx.push({ at: hitBase, key: "sfx_defend" });
    if (hitEvents.length) sfx.push({ at: firstHitStart, key: "sfx_attack" });

    const blipPos = (id: string): [number, number] => {
      const b = next.radar.blips.find((x) => x.id === id);
      return b ? [b.x, b.y] : [0, 0];
    };

    const computeOverlay = (t: number): CombatOverlay => {
      const overlay: CombatOverlay = { blips: {}, floats: [], fx: [] };
      const ovFor = (id: string) => overlay.blips![id] || (overlay.blips![id] = {});

      if (connector && t < connectorEnd) {
        const cl = clamp01(t / Math.max(1, connectorEnd));
        overlay.fx!.push({
          kind: "tracer",
          x1: connector.ax,
          y1: connector.ay,
          x2: connector.tx,
          y2: connector.ty,
          color: connector.color,
          alpha: 0.85 * (1 - cl),
          width: connector.skill ? 2.6 : 1.8,
        });
        if (connector.skill && t < 320) {
          const cp = clamp01(t / 320);
          overlay.fx!.push({
            kind: "ring",
            cellX: connector.ax,
            cellY: connector.ay,
            cellR: 0.28 + 0.2 * cp,
            color: connector.color,
            alpha: 0.7 * (1 - cp),
            width: 2,
          });
        }
      }

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

      return overlay;
    };

    const t0 = performance.now();
    this.animating = true;
    const frame = (): void => {
      const t = performance.now() - t0;
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

  // Derive a cast / attack connector from the player's dispatched action (the
  // one thing the snapshot diff can't recover: who acted on whom).
  private buildConnector(
    next: CombatState,
    events: CombatEvent[],
    dispatched?: CombatAction | null
  ): Connector | null {
    if (!dispatched || !dispatched.target_id) return null;
    if (dispatched.type !== "attack" && dispatched.type !== "skill") return null;
    const actor = next.radar.blips.find((b) => b.faction === "player");
    const target = next.radar.blips.find((b) => b.id === dispatched.target_id);
    if (!actor || !target) return null;
    const tEv = events.find(
      (e) => e.id === target.id && (e.kind === "damage" || e.kind === "heal")
    );
    const color = tEv?.kind === "heal" ? "#7dff9b" : "#ff8a98";
    return {
      ax: actor.x + 0.5,
      ay: actor.y + 0.5,
      tx: target.x + 0.5,
      ty: target.y + 0.5,
      color,
      skill: dispatched.type === "skill",
    };
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
