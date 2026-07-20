import { useEffect, useState } from "react";

import type { IntroData } from "../IntroPanel";
import type { RuntimeSnapshot, ScenarioInfo } from "../types";

/**
 * B2 loop2+ opening-variant sequencer: resolves the race between the early
 * `loop_meta` WS frame (arrives ~1s after `begin`) and the snapshot that also
 * carries `_opening_variant` (8-20s later, after first-scene generation). The
 * meta frame is the AUTHORITATIVE per-loop source — relying on the snapshot
 * alone flashed the default Se-rin cut then swapped. `openingVariant` (fed by
 * the caller's `onLoopMeta`) is primary; the snapshots are a fallback for an
 * older server that predates the meta frame.
 *
 * Until a variant arrives the intro holds on a signal-alignment skeleton
 * (`introData === null`); a 12s dead-stream timer is the last-resort reveal so a
 * broken stream can't hang the intro forever. On intro close the variant signal
 * resets so the next loop's intro holds again with no leak from the loop just
 * finished. The caller passes the returned `setOpeningVariant` to its
 * `onLoopMeta` callback and keys the IntroPanel remount off `introVariantKey`.
 */
export function useIntroSequencer({
  showIntro,
  currentScenario,
  finalizedSnapshot,
  lastSnapshot,
}: {
  showIntro: boolean;
  currentScenario: ScenarioInfo | undefined;
  finalizedSnapshot: RuntimeSnapshot | null;
  lastSnapshot: RuntimeSnapshot | null;
}) {
  // Opening variant delivered by the server's early `loop_meta` frame — set via
  // the returned setter from the caller's onLoopMeta. Reset per loop on intro
  // close so a prior loop's variant can never leak in.
  const [openingVariant, setOpeningVariant] = useState<string | null>(null);

  const introVariantKey =
    openingVariant ??
    finalizedSnapshot?.state?._opening_variant ??
    lastSnapshot?.state?._opening_variant ??
    "default";
  const introVariantArrived = Boolean(
    openingVariant ??
      finalizedSnapshot?.state?._opening_variant ??
      lastSnapshot?.state?._opening_variant
  );

  const [introWaitExpired, setIntroWaitExpired] = useState(false);
  useEffect(() => {
    if (!showIntro || introVariantArrived) return;
    // Last-resort reveal only if the meta frame never lands (dead stream): the
    // happy-path frame arrives in ~1s, so this timer normally never fires.
    const timer = setTimeout(() => setIntroWaitExpired(true), 12000);
    return () => clearTimeout(timer);
  }, [showIntro, introVariantArrived]);
  useEffect(() => {
    if (!showIntro) return;
    // Reset on intro close so the next loop's intro holds again with a clean
    // per-loop variant signal (no leak from the loop just finished).
    return () => {
      setIntroWaitExpired(false);
      setOpeningVariant(null);
    };
  }, [showIntro]);

  const introPending = !introVariantArrived && !introWaitExpired;
  const introVariants = currentScenario?.ui_copy?.session_intro_variants as
    | Record<string, IntroData>
    | undefined;
  const introData = introPending
    ? null
    : ((introVariantKey !== "default" && introVariants?.[introVariantKey]
        ? introVariants[introVariantKey]
        : currentScenario?.ui_copy?.session_intro) as IntroData);

  return { introData, introVariantKey, setOpeningVariant };
}
