import { useEffect, useRef, useState } from "react";
import { drawCombatCanvas, combatCellFromPoint, getIsoConfig, toIso } from "../combatCanvas";
import type { CombatDragOverlay, CombatOverlay } from "../combatCanvas";
import type { CombatAnimator } from "../combatEffects";
import type { RuntimeSnapshot, CombatAction, CombatConsumable } from "../types";

// XCOM-style ground targeting (2026-07-12): an armed throwable (EMP 수류탄)
// turns the board into a cell picker — hover previews the blast radius, a tap
// inside throw range dispatches the item at that cell.
export interface ItemTargeting {
  itemId: string;
  name: string;
  range: number;
  radius: number;
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

  // Tile inspector: the board cell currently under the pointer (when not
  // dragging), surfaced to StoryPanel so it can show terrain/occupant/effects.
  const [combatInspectCell, setCombatInspectCell] = useState<[number, number] | null>(null);

  // Armed ground-target item (EMP 수류탄): while set, board taps throw instead
  // of inspecting/dragging, and hover paints the blast-radius preview. The
  // handlers below are recreated every render, so they close over fresh state.
  const [itemTargeting, setItemTargeting] = useState<ItemTargeting | null>(null);

  // Last hovered cell drawn as the movement-preview target, so pointer moves
  // over the same cell don't trigger redundant canvas redraws.
  const hoverRef = useRef<[number, number] | null>(null);

  const blastPreview = (cell: [number, number], tg: ItemTargeting): CombatOverlay => ({
    fx: [
      {
        kind: "ring",
        cellX: cell[0] + 0.5,
        cellY: cell[1] + 0.5,
        cellR: tg.radius + 0.5,
        color: "#ffd76a",
        alpha: 0.8,
        width: 2.5,
      },
      {
        kind: "spark",
        cellX: cell[0] + 0.5,
        cellY: cell[1] + 0.5,
        cellR: 0.14,
        color: "#ffd76a",
        alpha: 0.9,
      },
    ],
  });

  const redrawCombat = (drag?: CombatDragOverlay, hover?: [number, number] | null) => {
    const canvas = canvasRef.current;
    const combat = finalizedSnapshot?.combat;
    if (!canvas || !combat) return;
    const tg = itemTargeting;
    const overlay = tg && hover ? blastPreview(hover, tg) : undefined;
    drawCombatCanvas(canvas, combat, selectedScenarioId, drag, overlay, hover, combatInspectCell);
  };

  const startItemTargeting = (item: CombatConsumable) => {
    setItemTargeting((prev) =>
      prev?.itemId === item.item_id
        ? null // pressing the armed item again disarms it
        : {
            itemId: item.item_id,
            name: item.name,
            range: Number(item.range ?? 4),
            radius: Number(item.radius ?? 1),
          }
    );
  };

  const cancelItemTargeting = () => setItemTargeting(null);

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
    const cfg = getIsoConfig(canvas.clientWidth, canvas.clientHeight, cols, rows);
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
    if (!combat?.radar || !canvas || isBusy || animatorRef.current?.isAnimating()) return;
    const av = combat.available;
    if (!av || !av.can_act) return;

    const [cx, cy] = combatCellFromPoint(canvas, combat.radar, e.clientX, e.clientY);

    // Armed throwable: this tap IS the throw. In-bounds + in-range → dispatch
    // the item at the cell; out-of-bounds → disarm (escape hatch).
    const tg = itemTargeting;
    if (tg) {
      const cols = combat.radar.arena?.w || 8;
      const rows = combat.radar.arena?.h || 6;
      const inBounds = cx >= 0 && cy >= 0 && cx < cols && cy < rows;
      if (!inBounds) {
        setItemTargeting(null);
        redrawCombat();
        return;
      }
      const actor = combat.radar.blips.find((b) => b.id === combat.radar!.current);
      const dist = actor ? Math.max(Math.abs(actor.x - cx), Math.abs(actor.y - cy)) : 0;
      if (dist > tg.range) return; // out of throw range — keep aiming
      setItemTargeting(null);
      onCombatAction({ type: "item", item_id: tg.itemId, target_cell: [cx, cy] });
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
      const cfg = getIsoConfig(rect.width, rect.height, cols, rows);
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
      }
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
    const rect = canvas.getBoundingClientRect();
    const [cx, cy] = combatCellFromPoint(canvas, combat.radar, e.clientX, e.clientY);

    if (!dragRef.current) {
      // Hover affordance: crosshair while a throwable is armed, else "grab"
      // over the active, controllable unit.
      const av = combat.available;
      const actor = combat.radar.blips.find((b) => b.id === combat.radar!.current);
      const overActor = !!actor && actor.x === cx && actor.y === cy;
      canvas.style.cursor = itemTargeting
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
    itemTargeting,
    startItemTargeting,
    cancelItemTargeting,
  };
}
