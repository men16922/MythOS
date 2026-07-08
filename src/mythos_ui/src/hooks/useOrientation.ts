import { useEffect, useState } from "react";

const LANDSCAPE_QUERY = "(orientation: landscape)";
const COARSE_POINTER_QUERY = "(pointer: coarse)";

export interface OrientationState {
  isLandscape: boolean;
  isCoarsePointer: boolean;
}

function readOrientationState(): OrientationState {
  try {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return { isLandscape: true, isCoarsePointer: false };
    }
    return {
      isLandscape: window.matchMedia(LANDSCAPE_QUERY).matches,
      isCoarsePointer: window.matchMedia(COARSE_POINTER_QUERY).matches,
    };
  } catch {
    return { isLandscape: true, isCoarsePointer: false };
  }
}

// LC0: live orientation + pointer-type signal for the combat rotate-to-landscape
// prompt (docs/plans/2026-07-08-design-system.md "Landscape Combat" — portrait
// combat is cramped and concise mode barely helps, ~10%). Desktop/mouse users
// (fine pointer) are never affected; only coarse-pointer (touch) portrait
// matters. Tracks live orientation changes via matchMedia listeners rather than
// resize, since rotation doesn't always fire a resize event on every device.
export function useOrientation(): OrientationState {
  const [state, setState] = useState<OrientationState>(readOrientationState);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const landscapeQuery = window.matchMedia(LANDSCAPE_QUERY);
    const coarseQuery = window.matchMedia(COARSE_POINTER_QUERY);
    const update = () => setState(readOrientationState());
    landscapeQuery.addEventListener("change", update);
    coarseQuery.addEventListener("change", update);
    return () => {
      landscapeQuery.removeEventListener("change", update);
      coarseQuery.removeEventListener("change", update);
    };
  }, []);

  return state;
}
