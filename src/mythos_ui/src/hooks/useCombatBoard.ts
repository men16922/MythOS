import { useRef, useState } from "react";
import { drawCombatCanvas, combatCellFromPoint } from "../combatCanvas";
import type { CombatDragOverlay } from "../combatCanvas";
import type { CombatAnimator } from "../combatEffects";
import type { RuntimeSnapshot, CombatAction } from "../types";

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

  const redrawCombat = (drag?: CombatDragOverlay) => {
    const canvas = canvasRef.current;
    const combat = finalizedSnapshot?.combat;
    if (!canvas || !combat) return;
    drawCombatCanvas(canvas, combat, selectedScenarioId, drag);
  };

  const [boardZoom, setBoardZoom] = useState(1);
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
    const actor = combat.radar.blips.find((b) => b.id === combat.radar!.current);
    if (!actor || actor.x !== cx || actor.y !== cy) return; // must grab the active unit

    dragRef.current = { blipId: actor.id, origin: [cx, cy] };
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
      // Hover affordance: show "grab" cursor over the active, controllable unit.
      const av = combat.available;
      const actor = combat.radar.blips.find((b) => b.id === combat.radar!.current);
      const overActor = !!actor && actor.x === cx && actor.y === cy;
      canvas.style.cursor = overActor && av?.can_act && !isBusy ? "grab" : "default";
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
  };
}
