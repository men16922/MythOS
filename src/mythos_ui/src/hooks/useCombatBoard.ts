import { useEffect, useRef, useState } from "react";
import { drawCombatCanvas, combatCellFromPoint, getIsoConfig, toIso, canvasPan } from "../combatCanvas";
import type { CombatDragOverlay, CombatOverlay } from "../combatCanvas";
import type { CombatAnimator } from "../combatEffects";
import { isAlive } from "../combatView";
import type { RuntimeSnapshot, CombatAction, CombatConsumable } from "../types";

// XCOM-style ground targeting (2026-07-12): an armed throwable (EMP 수류탄)
// or an aimed skill (🎯 on push/pull/aoe/stun skills) turns the board into a
// picker — hover previews the outcome (blast radius / displacement arrow /
// stun mark), a tap dispatches. Items target CELLS; skills target ENEMY UNITS.
export interface GroundTargeting {
  kind: "item" | "skill";
  id: string;
  name: string;
  range: number;
  radius: number; // blast ring radius (0 = unit-only)
  push?: number;
  pull?: number;
  stun?: boolean;
}

// Client-side mirror of the engine's _skill_displace stepping (line toward/away
// from the caster, stop at board edge, a full-cover structure, or an occupied
// tile) — preview only; the server remains authoritative.
function displaceDest(
  actor: { x: number; y: number },
  victim: { x: number; y: number; id: string },
  tiles: number,
  toward: boolean,
  blips: { id: string; x: number; y: number; alive?: boolean }[],
  cols: number,
  rows: number,
  covers?: Record<string, string>
): [number, number] {
  let sx = Math.sign(victim.x - actor.x);
  let sy = Math.sign(victim.y - actor.y);
  if (toward) {
    sx = -sx;
    sy = -sy;
  }
  if (!sx && !sy) return [victim.x, victim.y];
  let vx = victim.x;
  let vy = victim.y;
  for (let i = 0; i < tiles; i++) {
    const nx = vx + sx;
    const ny = vy + sy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) break;
    if (covers?.[`${nx},${ny}`] === "full") break;
    if (blips.some((b) => isAlive(b) && b.id !== victim.id && b.x === nx && b.y === ny)) break;
    vx = nx;
    vy = ny;
  }
  return [vx, vy];
}

const COARSE_POINTER_QUERY = "(pointer: coarse)";
const SMALL_VIEWPORT_QUERY = "(max-width: 600px)";

// T5b: start coarse-pointer/small-viewport devices zoomed in, so tiles begin
// at a tappable size instead of making the player find the zoom-in button
// first (the MIN_ISO_STEP_PX floor in combatCanvas.ts backstops the rest).
function resolveInitialBoardZoom(): number {
  try {
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      (window.matchMedia(COARSE_POINTER_QUERY).matches ||
        window.matchMedia(SMALL_VIEWPORT_QUERY).matches)
    ) {
      return 1.5;
    }
  } catch {
    /* matchMedia unavailable — fall back to the desktop default */
  }
  return 1;
}

// Combat board pointer interaction: drag-to-move for the active controllable
// unit + tile-inspector hover + board zoom. Reads the live combat from
// `finalizedSnapshot`, draws onto the shared `canvasRef` (also used by App's
// render + animator effect), and emits a move via `onCombatAction`. Keeps the
// pointer/drag wiring out of App.tsx (god-component decomposition, one slice).
export function useCombatBoard(opts: {
  finalizedSnapshot: RuntimeSnapshot | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  animatorRef: React.RefObject<CombatAnimator | null>;
  isBusy: boolean;
  selectedScenarioId: string;
  onCombatAction: (action: CombatAction) => void;
}) {
  const { finalizedSnapshot, canvasRef, animatorRef, isBusy, selectedScenarioId, onCombatAction } =
    opts;

  // Combat board drag & drop: pick up the current actor's blip, drag it to a
  // reachable tile, and drop to move. A plain click no longer teleports the unit.
  const dragRef = useRef<{ blipId: string; origin: [number, number] } | null>(null);

  // Camera pan (owner 2026-07-12 "배경을 잡고 드래그하면 뷰가 움직여야"):
  // a press that lands on empty background — not the active unit, not a
  // reachable tile, no armed targeting — drags the camera instead. The offset
  // lives on canvas.dataset (like boardZoom) so every draw path shares it.
  const panRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  } | null>(null);

  const setPan = (canvas: HTMLCanvasElement, px: number, py: number) => {
    // Clamp so the board can never be flung fully out of view.
    const maxX = canvas.clientWidth * 0.6;
    const maxY = canvas.clientHeight * 0.6;
    canvas.dataset.panX = String(Math.max(-maxX, Math.min(maxX, px)));
    canvas.dataset.panY = String(Math.max(-maxY, Math.min(maxY, py)));
  };

  // Tile inspector: the board cell currently under the pointer (when not
  // dragging), surfaced to StoryPanel so it can show terrain/occupant/effects.
  const [combatInspectCell, setCombatInspectCell] = useState<[number, number] | null>(null);

  // Armed ground-target pick (item throw or aimed skill): while set, board
  // taps dispatch instead of inspecting/dragging, and hover paints the outcome
  // preview. The handlers below are recreated every render (fresh state).
  const [groundTargeting, setGroundTargeting] = useState<GroundTargeting | null>(null);

  // Last hovered cell drawn as the movement-preview target, so pointer moves
  // over the same cell don't trigger redundant canvas redraws.
  const hoverRef = useRef<[number, number] | null>(null);

  const targetingPreview = (cell: [number, number], tg: GroundTargeting): CombatOverlay => {
    const fx: NonNullable<CombatOverlay["fx"]> = [];
    const combat = finalizedSnapshot?.combat;
    const blips = combat?.radar?.blips || [];
    const cols = combat?.radar?.arena?.w || 8;
    const rows = combat?.radar?.arena?.h || 6;
    const shooter = blips.find((b) => b.id === combat?.radar?.current);
    // Range affordance: tint every reachable cell while aiming.
    const rangeTiles: [number, number][] = [];
    if (shooter) {
      for (let ry = 0; ry < rows; ry++) {
        for (let rx = 0; rx < cols; rx++) {
          if (Math.max(Math.abs(shooter.x - rx), Math.abs(shooter.y - ry)) <= tg.range) {
            rangeTiles.push([rx, ry]);
          }
        }
      }
    }
    const inRange =
      !shooter ||
      Math.max(Math.abs(shooter.x - cell[0]), Math.abs(shooter.y - cell[1])) <= tg.range;
    const victim =
      tg.kind === "skill"
        ? blips.find(
            (b) => isAlive(b) && b.faction === "enemy" && b.x === cell[0] && b.y === cell[1]
          )
        : undefined;

    if (!inRange) {
      // Out-of-range hover: mark the cell itself red so "왜 안 던져짐" reads.
      fx.push({
        kind: "cells",
        cells: [cell],
        color: "#ff5a4d",
        alpha: 0.5,
        fillAlpha: 0.12,
      });
      return { fx, rangeTiles };
    }

    if (tg.kind === "item" || tg.radius > 0) {
      // Cell-true blast footprint (chebyshev, mirrors the engine's distance()):
      // exactly the tiles the blast will catch, not an approximating ellipse.
      const radius = tg.radius || 0;
      const blastCells: [number, number][] = [];
      for (let by = cell[1] - radius; by <= cell[1] + radius; by++) {
        for (let bx = cell[0] - radius; bx <= cell[0] + radius; bx++) {
          if (bx >= 0 && by >= 0 && bx < cols && by < rows) blastCells.push([bx, by]);
        }
      }
      fx.push({
        kind: "cells",
        cells: blastCells,
        color: "#ffd76a",
        alpha: tg.kind === "item" || victim ? 0.85 : 0.4,
        fillAlpha: tg.kind === "item" || victim ? 0.22 : 0.08,
      });
    }
    if (tg.kind === "skill") {
      // Aim marker: bright when the hovered cell holds a valid enemy.
      fx.push({
        kind: "ring",
        cellX: cell[0] + 0.5,
        cellY: cell[1] + 0.5,
        cellR: 0.42,
        color: victim ? (tg.stun ? "#ffd76a" : "#e07dff") : "#8fffea",
        alpha: victim ? 0.9 : 0.3,
        width: victim ? 3 : 1.5,
      });
      const actor = blips.find((b) => b.id === combat?.radar?.current);
      if (victim && actor && (tg.push || tg.pull)) {
        // Displacement preview: where the shove/yank would land the enemy.
        const cols = combat?.radar?.arena?.w || 8;
        const rows = combat?.radar?.arena?.h || 6;
        const toward = !!tg.pull;
        const tiles = Number(tg.pull || tg.push || 0);
        const [dx, dy] = displaceDest(actor, victim, tiles, toward, blips, cols, rows, combat?.covers);
        const color = toward ? "#e07dff" : "#ffb347";
        fx.push({
          kind: "tracer",
          x1: victim.x + 0.5,
          y1: victim.y + 0.5,
          x2: dx + 0.5,
          y2: dy + 0.5,
          color,
          alpha: 0.85,
          width: 3.5,
        });
        fx.push({
          kind: "ring",
          cellX: dx + 0.5,
          cellY: dy + 0.5,
          cellR: 0.4,
          color,
          alpha: 0.9,
          width: 2.5,
        });
      }
      if (victim && tg.stun) {
        fx.push({
          kind: "spark",
          cellX: cell[0] + 0.5,
          cellY: cell[1] - 0.2,
          cellR: 0.16,
          color: "#ffd76a",
          alpha: 0.95,
        });
      }
    }
    return { fx, rangeTiles };
  };

  const redrawCombat = (drag?: CombatDragOverlay, hover?: [number, number] | null) => {
    const canvas = canvasRef.current;
    const combat = finalizedSnapshot?.combat;
    if (!canvas || !combat) return;
    const tg = groundTargeting;
    const overlay = tg && hover ? targetingPreview(hover, tg) : undefined;
    drawCombatCanvas(canvas, combat, selectedScenarioId, drag, overlay, hover, combatInspectCell);
  };

  const startItemTargeting = (item: CombatConsumable) => {
    setGroundTargeting((prev) =>
      prev?.kind === "item" && prev.id === item.item_id
        ? null // pressing the armed item again disarms it
        : {
            kind: "item",
            id: item.item_id,
            name: item.name,
            range: Number(item.range ?? 4),
            radius: Number(item.radius ?? 1),
          }
    );
  };

  const startSkillTargeting = (skill: {
    id: string;
    name?: string;
    range?: number | null;
    effect?: Record<string, unknown>;
  }) => {
    const effect = skill.effect || {};
    setGroundTargeting((prev) =>
      prev?.kind === "skill" && prev.id === skill.id
        ? null // pressing 🎯 again disarms
        : {
            kind: "skill",
            id: skill.id,
            name: skill.name || skill.id,
            range: Number(skill.range ?? 1),
            radius: Number(effect.aoe_radius ?? 0) || 0,
            push: Number(effect.push ?? 0) || undefined,
            pull: Number(effect.pull ?? 0) || undefined,
            stun: !!effect.stun,
          }
    );
  };

  const cancelItemTargeting = () => setGroundTargeting(null);

  // Movement affordance (T5a): auto-center the scrollable board wrapper on
  // the active unit whenever the turn changes, so a zoomed-in / small
  // viewport doesn't leave the acting unit off-screen.
  const activeUnitId = finalizedSnapshot?.combat?.radar?.current;
  useEffect(() => {
    const canvas = canvasRef.current;
    const combat = finalizedSnapshot?.combat;
    const wrapper = canvas?.parentElement;
    if (!canvas || !combat?.radar || !wrapper || !activeUnitId) return;
    if (!canvas.clientWidth || !canvas.clientHeight) return;
    const actor = combat.radar.blips.find((b) => b.id === activeUnitId);
    if (!actor) return;
    const cols = combat.radar.arena?.w || 8;
    const rows = combat.radar.arena?.h || 6;
    const [apx, apy] = canvasPan(canvas);
    const cfg = getIsoConfig(canvas.clientWidth, canvas.clientHeight, cols, rows, apx, apy);
    const [px, py] = toIso(actor.x + 0.5, actor.y + 0.5, cfg);
    const maxLeft = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
    const maxTop = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
    wrapper.scrollTo({
      left: Math.min(maxLeft, Math.max(0, px - wrapper.clientWidth / 2)),
      top: Math.min(maxTop, Math.max(0, py - wrapper.clientHeight / 2)),
      behavior: "smooth",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUnitId]);

  // Camera pan resets between encounters so a new fight always opens centered.
  const hasCombat = !!finalizedSnapshot?.combat?.radar;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.dataset.panX = "0";
      canvas.dataset.panY = "0";
    }
    panRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCombat]);

  const [boardZoom, setBoardZoom] = useState(resolveInitialBoardZoom);
  const handleBoardZoom = (next: number) => {
    const z = Math.min(2.5, Math.max(1, Math.round(next * 4) / 4));
    setBoardZoom(z);
    if (canvasRef.current) {
      canvasRef.current.dataset.boardZoom = String(z);
      redrawCombat();
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const combat = finalizedSnapshot?.combat;
    const canvas = canvasRef.current;
    if (!combat?.radar || !canvas) return;
    const canAct =
      !isBusy && !animatorRef.current?.isAnimating() && !!combat.available?.can_act;

    const [cx, cy] = combatCellFromPoint(canvas, combat.radar, e.clientX, e.clientY);

    // Camera pan fallthrough: any press the action layer below doesn't consume
    // (empty background, enemy turn, mid-animation) grabs the camera instead.
    const beginPan = () => {
      // Double-press on the background recenters the camera.
      if (e.detail >= 2) {
        setPan(canvas, 0, 0);
        redrawCombat();
        return;
      }
      const [bx, by] = canvasPan(canvas);
      panRef.current = { startX: e.clientX, startY: e.clientY, baseX: bx, baseY: by, moved: false };
      canvas.setPointerCapture?.(e.pointerId);
    };

    if (!canAct) {
      beginPan();
      return;
    }

    // Armed pick: this tap IS the throw/cast. In-bounds + in-range → dispatch;
    // out-of-bounds → disarm (escape hatch).
    const tg = groundTargeting;
    if (tg) {
      const cols = combat.radar.arena?.w || 8;
      const rows = combat.radar.arena?.h || 6;
      const inBounds = cx >= 0 && cy >= 0 && cx < cols && cy < rows;
      if (!inBounds) {
        setGroundTargeting(null);
        redrawCombat();
        return;
      }
      const actor = combat.radar.blips.find((b) => b.id === combat.radar!.current);
      const dist = actor ? Math.max(Math.abs(actor.x - cx), Math.abs(actor.y - cy)) : 0;
      if (dist > tg.range) return; // out of range — keep aiming
      if (tg.kind === "item") {
        setGroundTargeting(null);
        onCombatAction({ type: "item", item_id: tg.id, target_cell: [cx, cy] });
        return;
      }
      // Aimed skill: needs an enemy UNIT on the picked cell.
      const victim = combat.radar.blips.find(
        (b) => isAlive(b) && b.faction === "enemy" && b.x === cx && b.y === cy
      );
      if (!victim) return; // empty ground — keep aiming
      setGroundTargeting(null);
      onCombatAction({ type: "skill", skill_id: tg.id, target_id: victim.id });
      return;
    }

    const actor = combat.radar.blips.find((b) => b.id === combat.radar!.current);
    // Grab the active unit by its GROUND CELL or by its SPRITE BODY — the tall
    // character art sits above its cell in iso space, so requiring an exact
    // cell hit made "드래그로 안 옮겨짐" (owner 2026-07-12): players grab the
    // art, which maps to a cell behind the unit.
    let grabbed = !!actor && actor.x === cx && actor.y === cy;
    if (!grabbed && actor) {
      const rect = canvas.getBoundingClientRect();
      const cols = combat.radar.arena?.w || 8;
      const rows = combat.radar.arena?.h || 6;
      const [panX, panY] = canvasPan(canvas);
      const cfg = getIsoConfig(rect.width, rect.height, cols, rows, panX, panY);
      const [axp, ayp] = toIso(actor.x + 0.5, actor.y + 0.5, cfg);
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      grabbed = Math.abs(px - axp) <= cfg.stepX * 1.1 && ayp - py >= -cfg.stepY && ayp - py <= cfg.stepY * 6;
    }
    if (!grabbed) {
      // Click-to-move (owner 2026-07-12 + tutorial copy "밝게 표시된 타일을
      // 클릭"): tapping a highlighted reachable tile moves there directly —
      // dragging stays available but is no longer the only way.
      const reachable = combat.available?.reachable || [];
      if (reachable.some(([rx, ry]: [number, number]) => rx === cx && ry === cy)) {
        onCombatAction({ type: "wait", x: cx, y: cy });
        return;
      }
      // Not a unit, not a reachable tile → the press grabs the camera.
      beginPan();
      return;
    }
    if (!actor) return;

    dragRef.current = { blipId: actor.id, origin: [actor.x, actor.y] };
    hoverRef.current = null;
    canvas.setPointerCapture?.(e.pointerId);
    canvas.style.cursor = "grabbing";
    const rect = canvas.getBoundingClientRect();
    redrawCombat({
      blipId: actor.id,
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      targetCell: [cx, cy],
      valid: false,
    });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const combat = finalizedSnapshot?.combat;
    const canvas = canvasRef.current;
    if (!combat?.radar || !canvas) return;

    // Camera pan in progress: follow the pointer, skip hover/drag logic.
    const pan = panRef.current;
    if (pan) {
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      if (!pan.moved && Math.hypot(dx, dy) < 4) return;
      pan.moved = true;
      canvas.style.cursor = "grabbing";
      setPan(canvas, pan.baseX + dx, pan.baseY + dy);
      redrawCombat(undefined, hoverRef.current);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const [cx, cy] = combatCellFromPoint(canvas, combat.radar, e.clientX, e.clientY);

    if (!dragRef.current) {
      // Hover affordance: crosshair while a throwable is armed, else "grab"
      // over the active, controllable unit.
      const av = combat.available;
      const actor = combat.radar.blips.find((b) => b.id === combat.radar!.current);
      const overActor = !!actor && actor.x === cx && actor.y === cy;
      canvas.style.cursor = groundTargeting
        ? "crosshair"
        : overActor && av?.can_act && !isBusy
          ? "grab"
          : "default";
      // Tile inspector hover: only track in-bounds cells, and only update state
      // when the cell actually changes to avoid per-move re-render churn.
      const cols = combat.radar.arena?.w || 8;
      const rows = combat.radar.arena?.h || 6;
      const inBounds = cx >= 0 && cy >= 0 && cx < cols && cy < rows;
      setCombatInspectCell((prev) => {
        if (!inBounds) return prev === null ? prev : null;
        if (prev && prev[0] === cx && prev[1] === cy) return prev;
        return [cx, cy];
      });
      // Movement affordance (T5a): preview the reachable-tile target + ground
      // trail on hover, before the player commits to the drag gesture.
      const prevHover = hoverRef.current;
      if (!inBounds) {
        if (prevHover) {
          hoverRef.current = null;
          redrawCombat();
        }
      } else if (!prevHover || prevHover[0] !== cx || prevHover[1] !== cy) {
        hoverRef.current = [cx, cy];
        redrawCombat(undefined, [cx, cy]);
      }
      return;
    }

    const reachable = combat.available?.reachable || [];
    const valid = reachable.some(([x, y]: [number, number]) => x === cx && y === cy);
    redrawCombat({
      blipId: dragRef.current.blipId,
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      targetCell: [cx, cy],
      valid,
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panRef.current) {
      panRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = "default";
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const combat = finalizedSnapshot?.combat;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = "default";
    if (!canvas || !combat?.radar) {
      redrawCombat();
      return;
    }
    const [cx, cy] = combatCellFromPoint(canvas, combat.radar, e.clientX, e.clientY);
    const reachable = combat.available?.reachable || [];
    const moved =
      (cx !== drag.origin[0] || cy !== drag.origin[1]) &&
      reachable.some(([x, y]: [number, number]) => x === cx && y === cy);
    redrawCombat(); // clear the drag overlay
    if (moved) onCombatAction({ type: "wait", x: cx, y: cy });
  };

  const handleCanvasPointerCancel = () => {
    panRef.current = null;
    if (!dragRef.current) return;
    dragRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = "default";
    redrawCombat();
  };

  const handleCanvasPointerLeave = () => {
    setCombatInspectCell((prev) => (prev === null ? prev : null));
    if (hoverRef.current) {
      hoverRef.current = null;
      redrawCombat();
    }
  };

  return {
    combatInspectCell,
    boardZoom,
    handleBoardZoom,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasPointerLeave,
    groundTargeting,
    startItemTargeting,
    startSkillTargeting,
    cancelItemTargeting,
  };
}
