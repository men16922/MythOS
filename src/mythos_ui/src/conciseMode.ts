import { createContext, useContext } from "react";

const STORAGE_KEY = "mythos_concise_mode";
const COARSE_POINTER_QUERY = "(pointer: coarse)";
const SMALL_VIEWPORT_QUERY = "(max-width: 600px)";

function prefersConciseByDevice(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      (window.matchMedia(COARSE_POINTER_QUERY).matches ||
        window.matchMedia(SMALL_VIEWPORT_QUERY).matches)
    );
  } catch {
    return false;
  }
}

/**
 * Resolve the initial concise-mode flag: an explicit stored user choice wins;
 * otherwise default ON for coarse-pointer/small-viewport devices (T6a — mobile
 * is UX-degraded by info density, per `docs/plans/2026-07-08-cbt-feedback3-clarity-plan.md`).
 */
export function resolveInitialConciseMode(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "on") return true;
    if (stored === "off") return false;
  } catch {
    /* localStorage unavailable — fall through to the device default */
  }
  return prefersConciseByDevice();
}

export function persistConciseMode(value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
  } catch {
    /* localStorage unavailable (private mode) — selection just won't persist */
  }
}

export interface ConciseModeContextValue {
  conciseMode: boolean;
  setConciseMode: (value: boolean) => void;
  toggleConciseMode: () => void;
}

export const ConciseModeContext = createContext<ConciseModeContextValue | null>(null);

export function useConciseMode(): ConciseModeContextValue {
  const ctx = useContext(ConciseModeContext);
  if (!ctx) {
    throw new Error("useConciseMode must be used within a ConciseModeProvider");
  }
  return ctx;
}
