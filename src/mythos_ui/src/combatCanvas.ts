import type { CombatBlip, CombatRadar, CombatState } from "./types";

function factionColor(faction: string): string {
  if (faction === "player") return "#8fffea";
  if (faction === "ally") return "#7dff9b";
  return "#ff6b7d";
}

const imageCache: Record<string, HTMLImageElement> = {};

// Drag & drop overlay: the blip being picked up, its current cursor position
// (in CSS px relative to the canvas), and the cell currently hovered.
export interface CombatDragOverlay {
  blipId: string;
  px: number;
  py: number;
  targetCell: [number, number] | null;
  valid: boolean;
}

// --- Animation overlay (see combatEffects.ts) ---------------------------------
// Per-blip render overrides, floating numbers, and transient effects, all in
// *cell coordinates* so the animator stays resolution-independent; this draw
// converts them to pixels using the cell size it computes for the canvas.
export interface BlipOverride {
  cellX?: number; // fractional cell index (overrides blip.x for a move tween)
  cellY?: number;
  hpRatio?: number; // overrides the drawn HP bar (drain/heal tween)
  flash?: number; // 0..1 impact flash intensity
  flashColor?: string;
  alpha?: number; // overrides blip alpha (death fade)
  scale?: number; // radius multiplier (impact pop / lunge)
}

export interface FloatText {
  cellX: number; // fractional cell coords; cellY decreases to rise
  cellY: number;
  text: string;
  color: string;
  alpha: number;
  size?: number; // px
}

export type CombatFx =
  | { kind: "tracer"; x1: number; y1: number; x2: number; y2: number; color: string; alpha: number; width?: number }
  | { kind: "ring"; cellX: number; cellY: number; cellR: number; color: string; alpha: number; width?: number }
  | { kind: "spark"; cellX: number; cellY: number; cellR: number; color: string; alpha: number };

export interface CombatOverlay {
  blips?: Record<string, BlipOverride>;
  floats?: FloatText[];
  fx?: CombatFx[];
}

// Draw a blip's portrait (or a faction-colored disc fallback) clipped to a circle.
function drawBlipPortrait(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  combat: CombatState,
  scenarioId: string,
  b: CombatBlip,
  cx: number,
  cy: number,
  r: number
): void {
  let portraitPath = b.portrait;
  if (b.faction === "player" && !portraitPath) {
    portraitPath = "characters/player-noise.png";
  }
  if (portraitPath) {
    const imgUrl = `/resources/${scenarioId}/${portraitPath}`;
    let img = imageCache[imgUrl];
    if (!img) {
      img = new Image();
      img.src = imgUrl;
      img.onload = () => {
        drawCombatCanvas(canvas, combat, scenarioId);
      };
      imageCache[imgUrl] = img;
    }
    if (img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      return;
    }
  }
  ctx.fillStyle = factionColor(b.faction);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCombatCanvas(
  canvas: HTMLCanvasElement,
  combat: CombatState,
  scenarioId: string,
  drag?: CombatDragOverlay,
  overlay?: CombatOverlay
): void {
  const radar = combat.radar;
  if (!radar || !radar.blips || radar.blips.length === 0) return;

  const cols = radar.arena?.w || 8;
  const rows = radar.arena?.h || 6;
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  if (!container) return;

  const computed = window.getComputedStyle(container);
  const padLeft = parseFloat(computed.paddingLeft) || 0;
  const padRight = parseFloat(computed.paddingRight) || 0;
  const cssW = Math.max(100, Math.floor(container.clientWidth - padLeft - padRight));
  const cssH = Math.round((cssW * rows) / cols);

  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const cw = cssW / cols;
  const ch = cssH / rows;
  const reach = combat.available?.reachable || [];
  const blipFx = overlay?.blips || {};

  reach.forEach(([x, y]) => {
    const isTarget =
      drag && drag.targetCell && drag.targetCell[0] === x && drag.targetCell[1] === y;
    ctx.fillStyle = isTarget ? "rgba(41,255,198,0.32)" : "rgba(41,255,198,0.12)";
    ctx.fillRect(x * cw, y * ch, cw, ch);
    if (isTarget) {
      ctx.strokeStyle = "rgba(41,255,198,0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
    }
  });

  ctx.strokeStyle = "rgba(41,255,198,0.16)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cw, 0);
    ctx.lineTo(x * cw, cssH);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * ch);
    ctx.lineTo(cssW, y * ch);
    ctx.stroke();
  }

  const intents = radar.enemy_intents || [];
  intents.forEach((intent) => {
    const tx = intent.target_x;
    const ty = intent.target_y;
    if (intent.action === "attack") {
      ctx.strokeStyle = "rgba(255,107,125,0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(tx * cw + 2, ty * ch + 2, cw - 4, ch - 4);
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff6b7d";
      ctx.font = "11px SF Mono, monospace";
      ctx.fillText("⚔️", tx * cw + cw - 12, ty * ch + 12);
    } else {
      ctx.strokeStyle = "rgba(255,180,50,0.5)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(tx * cw + 4, ty * ch + 4, cw - 8, ch - 8);
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffd76a";
      ctx.font = "11px SF Mono, monospace";
      ctx.fillText("👣", tx * cw + cw - 12, ty * ch + 12);
    }
  });

  // Transient effects drawn under the blips (tracers / cast connectors).
  (overlay?.fx || []).forEach((fx) => {
    if (fx.kind === "tracer") {
      ctx.save();
      ctx.globalAlpha = fx.alpha;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = fx.width || 2;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(fx.x1 * cw, fx.y1 * ch);
      ctx.lineTo(fx.x2 * cw, fx.y2 * ch);
      ctx.stroke();
      ctx.restore();
    }
  });

  radar.blips.forEach((b) => {
    const ov = blipFx[b.id];
    const bx = ov?.cellX != null ? ov.cellX : b.x;
    const by = ov?.cellY != null ? ov.cellY : b.y;
    const cx = bx * cw + cw / 2;
    const cy = by * ch + ch / 2;
    const scale = ov?.scale != null ? ov.scale : 1;
    const r = Math.min(cw, ch) * 0.38 * scale;
    const alive = b.alive !== false;
    const isDragged = drag != null && drag.blipId === b.id;

    // The blip being dragged is rendered later as a lifted ghost at the cursor;
    // leave a faint "origin" marker in its home cell.
    if (isDragged) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,215,106,0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      return;
    }

    const baseAlpha = alive ? 1 : 0.3;
    ctx.globalAlpha = ov?.alpha != null ? ov.alpha : baseAlpha;

    if (radar.current && b.id === radar.current) {
      ctx.strokeStyle = "rgba(255,215,106,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawBlipPortrait(ctx, canvas, combat, scenarioId, b, cx, cy, r);

    // Impact flash tints the blip toward its damage/heal color.
    if (ov?.flash && ov.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.7, ov.flash * 0.7);
      ctx.fillStyle = ov.flashColor || "#ff6b7d";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = ov?.alpha != null ? ov.alpha : baseAlpha;
    }

    if (b.defending) {
      ctx.strokeStyle = "#cfe";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2, -0.6, 3.74);
      ctx.stroke();
    }

    if (alive && b.faction === "enemy") {
      const intent = intents.find((item) => item.enemy_id === b.id);
      if (intent) {
        ctx.fillStyle = "#020706";
        ctx.font = "9px SF Mono, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          intent.action === "attack" ? "⚔️" : intent.action === "flee" ? "🏃" : "👣",
          cx,
          cy
        );
      }
    }

    ctx.globalAlpha = alive ? 0.9 : 0.4;
    ctx.fillStyle = "#d6fff6";
    ctx.font = `${Math.max(8, Math.round(ch * 0.16))}px "SF Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText((b.name || b.id || "").slice(0, 8), cx, cy - r - 3);

    if (b.max_hp) {
      const bw = cw * 0.7;
      const bxp = cx - bw / 2;
      const byp = cy + r + 3;

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(bxp, byp, bw, 3);

      const baseRatio = b.hp_ratio != null ? b.hp_ratio : b.hp / b.max_hp;
      const ratio = ov?.hpRatio != null ? ov.hpRatio : baseRatio;
      ctx.fillStyle = ratio > 0.5 ? "#7dff9b" : ratio > 0.25 ? "#ffd76a" : "#ff6b7d";
      ctx.fillRect(bxp, byp, bw * Math.max(0, ratio), 3);
    }

    ctx.globalAlpha = 1;
  });

  // Transient effects drawn over the blips (impact rings / sparks).
  (overlay?.fx || []).forEach((fx) => {
    if (fx.kind === "ring") {
      ctx.save();
      ctx.globalAlpha = fx.alpha;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = fx.width || 2;
      ctx.beginPath();
      ctx.arc(fx.cellX * cw, fx.cellY * ch, fx.cellR * Math.min(cw, ch), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (fx.kind === "spark") {
      ctx.save();
      ctx.globalAlpha = fx.alpha;
      ctx.fillStyle = fx.color;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(fx.cellX * cw, fx.cellY * ch, fx.cellR * Math.min(cw, ch), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // Floating damage / heal numbers, drawn last so they sit on top of everything.
  (overlay?.floats || []).forEach((f) => {
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.size || 14}px "SF Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 3;
    ctx.fillText(f.text, f.cellX * cw, f.cellY * ch);
    ctx.restore();
  });

  // Lifted ghost: draw the dragged blip at the cursor with a glow so the pick-up
  // is visible while moving.
  if (drag) {
    const dragged = radar.blips.find((b) => b.id === drag.blipId);
    if (dragged) {
      const r = Math.min(cw, ch) * 0.42;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = drag.valid ? "rgba(41,255,198,0.9)" : "rgba(255,180,80,0.8)";
      ctx.shadowBlur = 16;
      ctx.strokeStyle = drag.valid ? "rgba(41,255,198,0.95)" : "rgba(255,180,80,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drag.px, drag.py, r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      drawBlipPortrait(ctx, canvas, combat, scenarioId, dragged, drag.px, drag.py, r);
      ctx.restore();
    }
  }
}

export function combatCellFromPoint(
  canvas: HTMLCanvasElement,
  radar: CombatRadar,
  clientX: number,
  clientY: number
): [number, number] {
  const cols = radar.arena?.w || 8;
  const rows = radar.arena?.h || 6;
  const rect = canvas.getBoundingClientRect();
  return [
    Math.floor((clientX - rect.left) / (rect.width / cols)),
    Math.floor((clientY - rect.top) / (rect.height / rows)),
  ];
}
