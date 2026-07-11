import { useRef } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import type { ActiveTab } from "../TabNav";

// Horizontal swipe to move between tabs on touch devices (owner 2026-07-11).
// Guarded so a swipe that begins inside a horizontally-pannable region — the
// combat board's `touch-action: pan-x` wrapper, the operation map, a wide table —
// pans/scrolls that element instead of switching tabs. A tab change needs a
// deliberate, mostly-horizontal, reasonably quick drag so it never fires on a
// vertical read-scroll.
const SWIPE_MIN_PX = 60;
const SWIPE_MAX_MS = 600;
const HORIZONTAL_RATIO = 1.8;

function startedOnPannableRegion(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null;
  while (node && node !== document.body) {
    // The combat board owns horizontal drags for board panning — never hijack it.
    if (node.classList?.contains("tactical-board-canvas-wrapper")) return true;
    if (node.scrollWidth > node.clientWidth + 4) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function useTabSwipe(
  tabs: ActiveTab[],
  activeTab: ActiveTab,
  setActiveTab: (tab: ActiveTab) => void
): {
  onTouchStart: (e: ReactTouchEvent<HTMLElement>) => void;
  onTouchEnd: (e: ReactTouchEvent<HTMLElement>) => void;
} {
  const start = useRef<{ x: number; y: number; t: number; armed: boolean } | null>(null);

  const onTouchStart = (e: ReactTouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) {
      start.current = null;
      return;
    }
    const touch = e.touches[0];
    start.current = {
      x: touch.clientX,
      y: touch.clientY,
      t: performance.now(),
      armed: !startedOnPannableRegion(e.target),
    };
  };

  const onTouchEnd = (e: ReactTouchEvent<HTMLElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.armed) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - s.x;
    const dy = touch.clientY - s.y;
    if (performance.now() - s.t > SWIPE_MAX_MS) return;
    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;
    const idx = tabs.indexOf(activeTab);
    if (idx < 0 || tabs.length < 2) return;
    // Swipe left (dx < 0) advances to the next tab; swipe right goes back. Wrap
    // around at the ends (owner 2026-07-11: swiping outward at the first/last tab
    // dead-ended) so an edge swipe cycles to the opposite end.
    const nextIdx = (idx + (dx < 0 ? 1 : -1) + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIdx]);
  };

  return { onTouchStart, onTouchEnd };
}
