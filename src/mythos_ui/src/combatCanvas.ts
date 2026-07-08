import type { CombatBlip, CombatRadar, CombatState } from "./types";

function factionColor(faction: string): string {
  if (faction === "player") return "#8fffea";
  if (faction === "ally") return "#7dff9b";
  return "#ff6b7d";
}

const imageCache: Record<string, HTMLImageElement> = {};

// --- 2.5D Isometric Projection Helpers ---
export interface IsoConfig {
  centerX: number;
  centerY: number;
  stepX: number;
  stepY: number;
}

// T5b: minimum iso half-step (px) a tile may shrink to, so its diamond
// footprint (~2x this) stays tappable on small viewports / large arenas.
export const MIN_ISO_STEP_PX = 26;

export function getIsoConfig(cssW: number, cssH: number, cols: number, rows: number): IsoConfig {
  // Fit to width safely, keeping 2:1 isometric ratio
  const stepX = (cssW / (cols + rows)) * 0.92;
  const stepY = stepX * 0.5;
  const centerX = cssW / 2;
  const totalH = (cols + rows) * stepY;
  const centerY = Math.max(20, (cssH - totalH) / 2);
  return { centerX, centerY, stepX, stepY };
}

export function toIso(x: number, y: number, cfg: IsoConfig): [number, number] {
  const sx = cfg.centerX + (x - y) * cfg.stepX;
  const sy = cfg.centerY + (x + y) * cfg.stepY;
  return [sx, sy];
}

export function fromIso(sx: number, sy: number, cfg: IsoConfig): [number, number] {
  const dx = (sx - cfg.centerX) / cfg.stepX;
  const dy = (sy - cfg.centerY) / cfg.stepY;
  const x = 0.5 * (dy + dx);
  const y = 0.5 * (dy - dx);
  return [x, y];
}

function drawIsoTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cfg: IsoConfig,
  fillColor: string,
  strokeColor?: string,
  lineWidth?: number
): void {
  const p0 = toIso(x, y, cfg);
  const p1 = toIso(x + 1, y, cfg);
  const p2 = toIso(x + 1, y + 1, cfg);
  const p3 = toIso(x, y + 1, cfg);

  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.lineTo(p3[0], p3[1]);
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth || 1;
    ctx.stroke();
  }
}

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
  pose?: "idle" | "attack" | "skill" | "hit" | "guard";
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
  shakeX?: number;
  shakeY?: number;
}

function loadImage(url: string, onLoad: () => void): HTMLImageElement {
  let img = imageCache[url];
  if (!img) {
    img = new Image();
    img.src = url;
    img.onload = onLoad;
    imageCache[url] = img;
  }
  return img;
}

function combatImagePath(b: CombatBlip, pose: BlipOverride["pose"]): string {
  const images = b.combat_images || {};
  const currentPose = pose || "idle";
  return images[currentPose] || images.idle || "";
}

function drawBlipSprite(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  combat: CombatState,
  scenarioId: string,
  b: CombatBlip,
  cx: number,
  cy: number,
  r: number,
  pose: BlipOverride["pose"]
): boolean {
  const spritePath = combatImagePath(b, pose);
  if (!spritePath) return false;

  const imgUrl = `/resources/${scenarioId}/${spritePath}`;
  const img = loadImage(imgUrl, () => {
    drawCombatCanvas(canvas, combat, scenarioId);
  });
  if (!img.complete || img.naturalWidth <= 0) return false;

  const w = r * 2.35;
  const h = w * 1.5;
  const x = cx - w / 2;
  const y = cy - h + r * 0.76;

  ctx.save();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
  return true;
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
    const img = loadImage(imgUrl, () => drawCombatCanvas(canvas, combat, scenarioId));
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

function draw3DIsoBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  el: number,
  cfg: IsoConfig,
  fillColor: string,
  strokeColor: string
): void {
  const h = -el * cfg.stepY * 1.2;
  
  const p0 = toIso(x, y, cfg);
  const p1 = toIso(x + 1, y, cfg);
  const p2 = toIso(x + 1, y + 1, cfg);
  const p3 = toIso(x, y + 1, cfg);

  const tp0 = [p0[0], p0[1] + h];
  const tp1 = [p1[0], p1[1] + h];
  const tp2 = [p2[0], p2[1] + h];
  const tp3 = [p3[0], p3[1] + h];

  if (el > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    
    // Front-Right Wall
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(tp2[0], tp2[1]);
    ctx.lineTo(tp1[0], tp1[1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(41,255,198,0.05)";
    ctx.fill();
    ctx.stroke();

    // Front-Left Wall
    ctx.beginPath();
    ctx.moveTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.lineTo(tp3[0], tp3[1]);
    ctx.lineTo(tp2[0], tp2[1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(41,255,198,0.03)";
    ctx.fill();
    ctx.stroke();
  }

  // Top Diamond face
  ctx.beginPath();
  ctx.moveTo(tp0[0], tp0[1]);
  ctx.lineTo(tp1[0], tp1[1]);
  ctx.lineTo(tp2[0], tp2[1]);
  ctx.lineTo(tp3[0], tp3[1]);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCoverObject(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  coverType: string,
  r: number
): void {
  const h = coverType === "full" ? r * 1.4 : r * 0.75;
  const w = r * 0.52;
  const col = coverType === "full" ? "rgba(41,255,198,0.36)" : "rgba(255,180,50,0.32)";
  const stroke = coverType === "full" ? "rgba(41,255,198,0.9)" : "rgba(255,180,50,0.8)";
  
  ctx.save();
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 6;
  ctx.fillStyle = col;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  
  // Top face of cover prism
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - h);
  ctx.lineTo(cx, cy - h - w * 0.5);
  ctx.lineTo(cx + w, cy - h);
  ctx.lineTo(cx, cy - h + w * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left face
  ctx.beginPath();
  ctx.moveTo(cx - w, cy);
  ctx.lineTo(cx - w, cy - h);
  ctx.lineTo(cx, cy - h + w * 0.5);
  ctx.lineTo(cx, cy + w * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right face
  ctx.beginPath();
  ctx.moveTo(cx, cy + w * 0.5);
  ctx.lineTo(cx, cy - h + w * 0.5);
  ctx.lineTo(cx + w, cy - h);
  ctx.lineTo(cx + w, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
}

function drawTerrainBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
  color: string,
  scale: number
): void {
  const padX = Math.max(3, scale * 0.12);
  const w = Math.max(18, text.length * scale * 0.62 + padX * 2);
  const h = Math.max(13, scale * 0.62);
  ctx.save();
  ctx.fillStyle = "rgba(2, 7, 6, 0.82)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `${Math.max(10, Math.round(scale * 0.42))}px SF Mono, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 0.5);
  ctx.restore();
}

function drawHazardOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hazardType: string,
  cfg: IsoConfig
): void {
  const p0 = toIso(x, y, cfg);
  const p1 = toIso(x + 1, y, cfg);
  const p2 = toIso(x + 1, y + 1, cfg);
  const p3 = toIso(x, y + 1, cfg);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.lineTo(p3[0], p3[1]);
  ctx.closePath();
  
  let glyph = "";
  let glyphColor = "";
  if (hazardType === "acid") {
    ctx.fillStyle = "rgba(125,255,155,0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(125,255,155,0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
    glyph = "☣";
    glyphColor = "rgba(180,255,200,0.9)";
  } else if (hazardType === "electro") {
    ctx.fillStyle = "rgba(255,215,106,0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,215,106,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    glyph = "⚡";
    glyphColor = "rgba(255,230,150,0.95)";
  }
  // Stamp the legend glyph onto the tile so the board reads the same symbols
  // the legend explains (colored fills alone were not intuitive).
  if (glyph) {
    const [cx, cy] = toIso(x + 0.5, y + 0.5, cfg);
    ctx.fillStyle = glyphColor;
    ctx.font = `${Math.max(11, Math.round(cfg.stepX * 0.8))}px SF Mono, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, cx, cy);
  }
  ctx.restore();
}

export function drawCombatCanvas(
  canvas: HTMLCanvasElement,
  combat: CombatState,
  scenarioId: string,
  drag?: CombatDragOverlay,
  overlay?: CombatOverlay,
  hover?: [number, number] | null
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
  // Board zoom is read from the canvas dataset so every caller (App redraw +
  // animation engine) honors it without threading a param through.
  const zoom = Math.max(1, parseFloat(canvas.dataset.boardZoom || "1") || 1);
  const baseW = Math.max(100, Math.floor(container.clientWidth - padLeft - padRight));
  // T5b: floor the on-screen tile size so a tap target stays usable even on a
  // small viewport or a large arena the player hasn't zoomed in on yet.
  const minCssW = Math.ceil((MIN_ISO_STEP_PX * (cols + rows)) / 0.92);
  let cssW = Math.max(Math.floor(baseW * zoom), minCssW);

  // LC1: the landscape split layout (index.css "LC1") bounds the board
  // panel's own height instead of just its width, so a width-only fit can
  // overflow the fixed-height row and force page scroll. Fit to whichever
  // axis is tighter, using the same cssH = cssW * rows/cols aspect used
  // below (solved for width instead of height).
  const isLandscapeCoarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(orientation: landscape)").matches &&
    window.matchMedia("(pointer: coarse)").matches;
  if (isLandscapeCoarse) {
    const padTop = parseFloat(computed.paddingTop) || 0;
    const padBottom = parseFloat(computed.paddingBottom) || 0;
    const baseH = Math.max(80, Math.floor(container.clientHeight - padTop - padBottom));
    const cssWFromHeight = Math.floor((baseH * cols) / rows);
    cssW = Math.max(minCssW, Math.min(cssW, cssWFromHeight));
  }
  const cssH = Math.round((cssW * rows) / cols);

  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  if (overlay?.shakeX || overlay?.shakeY) {
    ctx.translate(overlay.shakeX || 0, overlay.shakeY || 0);
  }

  // Calculate Isometric configuration
  const cfg = getIsoConfig(cssW, cssH, cols, rows);
  const reach = combat.available?.reachable || [];
  const blipFx = overlay?.blips || {};

  // Movement affordance (T5a): the tile currently being dragged onto, or —
  // when not dragging — the tile under the pointer. Only a reachable cell
  // gets the target highlight + ground-trail preview below.
  const previewCell = drag?.targetCell ?? hover ?? null;
  const previewReachable =
    !!previewCell && reach.some(([rx, ry]) => rx === previewCell[0] && ry === previewCell[1]);

  // Draw Ground Base (Hazards / Basic Tiles / Elevations / Gridlines)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = `${x},${y}`;
      const el = combat.elevations?.[key] || 0;
      const hazard = combat.hazards?.[key];
      const isReach = reach.some(([rx, ry]) => rx === x && ry === y);
      const isTarget = previewReachable && previewCell![0] === x && previewCell![1] === y;
      
      let fill = "rgba(41,255,198,0.012)";
      let stroke = "rgba(41,255,198,0.12)";
      if (isReach) {
        fill = isTarget ? "rgba(41,255,198,0.28)" : "rgba(41,255,198,0.08)";
        stroke = isTarget ? "rgba(41,255,198,0.85)" : "rgba(41,255,198,0.22)";
      }
      
      // Draw 3D block
      draw3DIsoBlock(ctx, x, y, el, cfg, fill, stroke);
      if (el > 0) {
        const [cx, cy] = toIso(x + 0.5, y + 0.5, cfg);
        drawTerrainBadge(
          ctx,
          cx,
          cy - el * cfg.stepY * 1.2 - cfg.stepY * 0.22,
          `▲${el}`,
          "rgba(141, 220, 255, 0.95)",
          cfg.stepX
        );
      }
      
      // Draw Hazard overlays
      if (hazard) {
        const hOffset = -el * cfg.stepY * 1.2;
        ctx.save();
        ctx.translate(0, hOffset);
        drawHazardOverlay(ctx, x, y, hazard, cfg);
        ctx.restore();
      }
    }
  }

  // Draw Cover Obstacles on top of cells
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = `${x},${y}`;
      const cover = combat.covers?.[key];
      if (cover) {
        const el = combat.elevations?.[key] || 0;
        const hOffset = -el * cfg.stepY * 1.2;
        const [cx, cy] = toIso(x + 0.5, y + 0.5, cfg);
        const r = Math.min(cfg.stepX, cfg.stepY * 2) * 0.36;
        drawCoverObject(ctx, cx, cy + hOffset, cover, r);
        // D4 cover legibility: shield-prefixed badge so a functional cover tile
        // reads instantly apart from decorative props (full=+6, half=+3).
        drawTerrainBadge(
          ctx,
          cx,
          cy + hOffset - r * 1.45,
          cover === "full" ? "🛡▣" : "🛡◧",
          cover === "full" ? "rgba(41,255,198,0.95)" : "rgba(255,180,50,0.9)",
          cfg.stepX
        );
      }
    }
  }

  // Movement affordance (T5a): dashed ground trail from the active unit to
  // the previewed target cell, so the player sees where a move lands before
  // committing to the drag gesture (important on touch, where drag itself is
  // hard to discover).
  if (previewReachable && previewCell) {
    const actor = radar.blips.find((b) => b.id === radar.current);
    if (actor && actor.alive !== false && (actor.x !== previewCell[0] || actor.y !== previewCell[1])) {
      const [ax, ay] = toIso(actor.x + 0.5, actor.y + 0.5, cfg);
      const [tx, ty] = toIso(previewCell[0] + 0.5, previewCell[1] + 0.5, cfg);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "rgba(41,255,198,0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();
    }
  }

  // E2 boss telegraphs: danger tiles — stand here and the announced strike
  // lands next boss turn. Same cell treatment as enemy intents, red + ⚠.
  for (const telegraph of radar.telegraphs || []) {
    for (const [tx, ty] of telegraph.tiles || []) {
      if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) continue;
      drawIsoTile(ctx, tx, ty, cfg, "rgba(255,82,61,0.22)", "rgba(255,122,107,0.85)", 1.6);
      const [wx, wy] = toIso(tx + 0.5, ty + 0.5, cfg);
      ctx.fillStyle = "rgba(255,122,107,0.95)";
      ctx.font = "bold 11px SF Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚠", wx, wy - 3);
    }
  }

  // Draw Enemy Intents
  const intents = radar.enemy_intents || [];
  intents.forEach((intent) => {
    const tx = intent.target_x;
    const ty = intent.target_y;
    const isAtk = intent.action === "attack";
    const fill = isAtk ? "rgba(255,107,125,0.14)" : "rgba(255,180,50,0.08)";
    const stroke = isAtk ? "rgba(255,107,125,0.55)" : "rgba(255,180,50,0.45)";
    
    drawIsoTile(ctx, tx, ty, cfg, fill, stroke, 1.5);

    const [cx, cy] = toIso(tx + 0.5, ty + 0.5, cfg);
    ctx.fillStyle = isAtk ? "#ff6b7d" : "#ffd76a";
    ctx.font = "11px SF Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isAtk ? "⚔️" : "👣", cx, cy - 3);
  });

  // Draw Transient FX (Tracers / Rings / Sparks)
  (overlay?.fx || []).forEach((fx) => {
    if (fx.kind === "tracer") {
      const p1 = toIso(fx.x1, fx.y1, cfg);
      const p2 = toIso(fx.x2, fx.y2, cfg);
      ctx.save();
      ctx.globalAlpha = fx.alpha;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = fx.width || 2;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
      ctx.restore();
    } else if (fx.kind === "ring") {
      const [cx, cy] = toIso(fx.cellX, fx.cellY, cfg);
      ctx.save();
      ctx.globalAlpha = fx.alpha;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = fx.width || 2;
      ctx.beginPath();
      // Draw isometric ring as an ellipse
      const rx = fx.cellR * cfg.stepX * 2.5;
      const ry = rx * 0.5;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (fx.kind === "spark") {
      const [cx, cy] = toIso(fx.cellX, fx.cellY, cfg);
      ctx.save();
      ctx.globalAlpha = fx.alpha;
      ctx.fillStyle = fx.color;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      const rx = fx.cellR * cfg.stepX * 2.2;
      const ry = rx * 0.5;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // Draw Blips (Units)
  radar.blips.forEach((b) => {
    const ov = blipFx[b.id];
    const bx = ov?.cellX != null ? ov.cellX : b.x;
    const by = ov?.cellY != null ? ov.cellY : b.y;
    
    const el = combat.elevations?.[`${Math.round(bx)},${Math.round(by)}`] || 0;
    const hOffset = -el * cfg.stepY * 1.2;
    
    const [cx, rawCy] = toIso(bx + 0.5, by + 0.5, cfg);
    const cy = rawCy + hOffset;
    const scale = ov?.scale != null ? ov.scale : 1;
    // Radial dimensions
    const baseR = Math.min(cfg.stepX, cfg.stepY * 2) * 0.76;
    const r = baseR * scale;
    const alive = b.alive !== false;
    const isDragged = drag != null && drag.blipId === b.id;

    if (isDragged) {
      // Draw faint dot pedestal at home cell
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "rgba(255,215,106,0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.2, r * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const baseAlpha = alive ? 1 : 0.3;
    ctx.globalAlpha = ov?.alpha != null ? ov.alpha : baseAlpha;

    // Draw active indicator (Yellow for AI/enemy, Mint for player/controllable ally)
    if (radar.current && b.id === radar.current) {
      const isActiveActor = combat.available?.active_actor_id === b.id;
      ctx.save();
      if (isActiveActor) {
        ctx.strokeStyle = "#00ffa6";
        ctx.lineWidth = 3.2;
        ctx.shadowColor = "rgba(0, 255, 170, 0.85)";
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = "rgba(255,215,106,0.95)";
        ctx.lineWidth = 2.2;
      }
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.4, r * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // --- Holographic Base Pedestal ---
    ctx.save();
    ctx.fillStyle = alive ? factionColor(b.faction) : "rgba(120,120,120,0.5)";
    ctx.globalAlpha = (ov?.alpha != null ? ov.alpha : baseAlpha) * 0.22;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.25, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = factionColor(b.faction);
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = (ov?.alpha != null ? ov.alpha : baseAlpha) * 0.85;
    ctx.stroke();
    ctx.restore();

    // --- Vertical Hologram Light Beam ---
    if (alive) {
      ctx.save();
      const beamH = r * 1.2;
      const grad = ctx.createLinearGradient(cx, cy, cx, cy - beamH);
      grad.addColorStop(0, factionColor(b.faction) + "55");
      grad.addColorStop(1, factionColor(b.faction) + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.9, cy);
      ctx.lineTo(cx - r * 0.75, cy - beamH);
      ctx.lineTo(cx + r * 0.75, cy - beamH);
      ctx.lineTo(cx + r * 0.9, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // --- Vertical Billboard Card Position ---
    const cardCy = cy - r * 1.1;

    const pose = ov?.pose || (ov?.flash && ov.flash > 0 ? "hit" : (b.defending ? "guard" : "idle"));
    const drewSprite = drawBlipSprite(ctx, canvas, combat, scenarioId, b, cx, cy, r, pose);
    if (!drewSprite) {
      drawBlipPortrait(ctx, canvas, combat, scenarioId, b, cx, cardCy, r);
    }

    // Draw active actor arrow pointer
    if (radar.current && b.id === radar.current && combat.available?.active_actor_id === b.id) {
      ctx.save();
      ctx.fillStyle = "#00ffa6";
      ctx.shadowColor = "rgba(0, 255, 170, 0.85)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const arrowY = drewSprite ? cy - r * 3.1 : cardCy - r - 12;
      ctx.moveTo(cx - 6, arrowY - 8);
      ctx.lineTo(cx + 6, arrowY - 8);
      ctx.lineTo(cx, arrowY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Flash/Stagger overlay tints
    if (ov?.flash && ov.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.7, ov.flash * 0.7);
      ctx.fillStyle = ov.flashColor || "#ff6b7d";
      ctx.beginPath();
      if (drewSprite) {
        ctx.ellipse(cx, cy - r * 1.1, r * 1.05, r * 1.5, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(cx, cardCy, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = ov?.alpha != null ? ov.alpha : baseAlpha;
    }

    if (b.defending) {
      ctx.save();
      ctx.strokeStyle = "#cfe";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, drewSprite ? cy - r * 1.05 : cardCy, r + 8, drewSprite ? r * 1.55 : r + 2.5, 0, -0.6, 3.74);
      ctx.stroke();
      ctx.restore();
    }

    // D2 status legibility: temporary DEF-buff pill above the unit (mirrors the
    // roster chip so "엄호 노이즈가 뭘 했는지" reads on the board too).
    const aliveHere = b.alive !== false;
    if (aliveHere && (b.defense_buff ?? 0) > 0) {
      const chipLabel = `DEF+${b.defense_buff}`;
      const chipY = drewSprite ? cy - r * 2.7 : cardCy - r - 20;
      ctx.save();
      ctx.font = "bold 9px SF Mono, monospace";
      const chipW = ctx.measureText(chipLabel).width + 8;
      ctx.fillStyle = "rgba(80, 190, 255, 0.85)";
      ctx.fillRect(cx - chipW / 2, chipY - 7, chipW, 13);
      ctx.fillStyle = "#021018";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(chipLabel, cx, chipY);
      ctx.restore();
    }
    // Boss enrage: dashed red ring so the phase shift is visible at a glance.
    if (aliveHere && b.enraged) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 82, 61, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(
        cx,
        drewSprite ? cy - r * 1.05 : cardCy,
        r + 11,
        drewSprite ? r * 1.65 : r + 5.5,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    if (alive && b.faction === "enemy") {
      const intent = intents.find((item) => item.enemy_id === b.id);
      if (intent) {
        ctx.fillStyle = "#020706";
        ctx.font = "bold 9px SF Mono, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          intent.action === "attack" ? "⚔️" : intent.action === "flee" ? "🏃" : "👣",
          cx,
          drewSprite ? cy - r * 1.1 : cardCy
        );
      }
    }

    // Unit Label Text
    ctx.globalAlpha = alive ? 0.95 : 0.45;
    ctx.fillStyle = "#d6fff6";
    ctx.font = `bold ${Math.max(9, Math.round(cfg.stepY * 0.4))}px "SF Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText((b.name || b.id || "").slice(0, 8), cx, (drewSprite ? cy - r * 2.85 : cardCy - r) - 4);

    // HP Bar
    if (b.max_hp) {
      const bw = r * 1.8;
      const bxp = cx - bw / 2;
      const byp = drewSprite ? cy + r * 0.76 : cardCy + r + 4;

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(bxp, byp, bw, 3);

      const baseRatio = b.hp_ratio != null ? b.hp_ratio : b.hp / b.max_hp;
      const ratio = ov?.hpRatio != null ? ov.hpRatio : baseRatio;
      ctx.fillStyle = ratio > 0.5 ? "#7dff9b" : ratio > 0.25 ? "#ffd76a" : "#ff6b7d";
      ctx.fillRect(bxp, byp, bw * Math.max(0, ratio), 3);
    }

    ctx.globalAlpha = 1;
  });

  // Draw Transient Floating Numbers (last to layer on top)
  (overlay?.floats || []).forEach((f) => {
    // Convert text floating cells to isometric
    const [fx, fy] = toIso(f.cellX, f.cellY, cfg);
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.color;
    ctx.font = `bold ${f.size || 14}px "SF Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 3;
    ctx.fillText(f.text, fx, fy);
    ctx.restore();
  });

  // Render Dragged unit (Follows mouse cursor in 2D space but draws as billboard)
  if (drag) {
    const dragged = radar.blips.find((b) => b.id === drag.blipId);
    if (dragged) {
      const r = Math.min(cfg.stepX, cfg.stepY * 2) * 0.78;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = drag.valid ? "rgba(41,255,198,0.9)" : "rgba(255,180,80,0.8)";
      ctx.shadowBlur = 16;
      ctx.strokeStyle = drag.valid ? "rgba(41,255,198,0.95)" : "rgba(255,180,80,0.9)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(drag.px, drag.py - r * 1.1, r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      drawBlipPortrait(ctx, canvas, combat, scenarioId, dragged, drag.px, drag.py - r * 1.1, r);
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
  
  // Calculate relative CSS pixels within canvas
  const px = clientX - rect.left;
  const py = clientY - rect.top;

  const cfg = getIsoConfig(rect.width, rect.height, cols, rows);
  const [x, y] = fromIso(px, py, cfg);
  return [Math.floor(x), Math.floor(y)];
}
