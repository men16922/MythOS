/**
 * True on coarse-pointer (touch) or narrow (<=600px) viewports — the signal used
 * to default mobile UI into its compact/collapsed shape (e.g. the collapsible
 * codex sections). Mirrors the device check in `conciseMode.ts`.
 */
export function isCoarseOrSmallViewport(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        window.matchMedia("(max-width: 600px)").matches)
    );
  } catch {
    return false;
  }
}
