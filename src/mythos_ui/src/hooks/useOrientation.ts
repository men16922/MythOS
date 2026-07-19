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

// Live orientation + pointer-type signal shared by the portrait and landscape
// combat layouts. Tracks matchMedia changes directly because rotation does not
// consistently emit resize on every device.
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
