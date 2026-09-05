// Blocking surfaces. Mirrors the `body:has(...)` scroll-lock list in index.css:
// while any of these is mounted the page behind it must not react to input.
export const BLOCKING_OVERLAY_SELECTORS = [
  ".boot-intro",
  ".invite-gate",
  ".modal-overlay",
  ".history-overlay",
  ".route-map-modal-backdrop",
  ".boon-overlay",
  ".combat-interstitial-backdrop",
  ".cinema-overlay",
  ".cc-loadout-backdrop",
] as const;

export function blockingOverlayOpen(): boolean {
  try {
    return document.querySelector(BLOCKING_OVERLAY_SELECTORS.join(",")) !== null;
  } catch {
    return false;
  }
}
