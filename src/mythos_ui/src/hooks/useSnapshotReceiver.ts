import type { Dispatch, SetStateAction } from "react";
import type { NarrativeHistoryItem } from "../App";
import { prefersReducedMotion } from "../combatEffects";
import { getLang } from "../api";
import { DICTS } from "../i18n/lang";
import type { AssetInfo, RuntimeSnapshot } from "../types";

type UseSnapshotReceiverArgs = {
  // Run identity / mode read while applying a snapshot.
  withImage: boolean;
  playerId: string | null;
  // Setters patched as a confirmed snapshot lands.
  setLoopId: Dispatch<SetStateAction<string | null>>;
  setLastSnapshot: Dispatch<SetStateAction<RuntimeSnapshot | null>>;
  setNarrativeHistory: Dispatch<SetStateAction<NarrativeHistoryItem[]>>;
  setImagePlaceholderText: Dispatch<SetStateAction<string | null>>;
  setKenBurnsActive: Dispatch<SetStateAction<boolean>>;
  setGlitchActive: Dispatch<SetStateAction<boolean>>;
  // Helpers from sibling hooks.
  resolveImage: (assets: AssetInfo[]) => Promise<void>;
  loadSlotsAndRuns: (pId: string) => Promise<void>;
  playBgm: (bgmPath: string, forceEnabled?: boolean) => void;
  playSfx: (key: string, scenarioId?: string, volume?: number) => void;
  logToConsole: (line: string) => void;
  // Item-gain toast: fired when the applied snapshot's choice_result reports
  // items gained this turn (salvage grants would otherwise be invisible).
  onItemsGained?: (items: { id: string; name: string; count: number }[]) => void;
};

/**
 * Owns the snapshot-receive cluster: `handleReceivedSnapshot` (apply a confirmed
 * runtime snapshot — patch loop id / last snapshot, fold the choice-result into
 * history, resolve the scene image or pick the right placeholder, reload
 * save/run state, swap BGM) and its internal `triggerCinematicEffects` (the
 * turn-0 Ken Burns + glitch entry motion, reduced-motion-gated). Both are plain
 * (non-memoized) functions — identical to their prior in-`App` form — so
 * behavior is preserved; all cross-cutting state, setters and helpers are
 * supplied via props. `triggerCinematicEffects` is internal (only
 * `handleReceivedSnapshot` calls it) so it is not re-exported.
 */
export function useSnapshotReceiver(args: UseSnapshotReceiverArgs) {
  const {
    withImage,
    playerId,
    setLoopId,
    setLastSnapshot,
    setNarrativeHistory,
    setImagePlaceholderText,
    setKenBurnsActive,
    setGlitchActive,
    resolveImage,
    loadSlotsAndRuns,
    playBgm,
    playSfx,
    logToConsole,
    onItemsGained,
  } = args;

  const handleReceivedSnapshot = (snap: RuntimeSnapshot) => {
    setLoopId(snap.loop_id);
    setLastSnapshot(snap);
    const gained = snap.active_scene?.choice_result?.items_gained;
    if (gained && gained.length > 0 && onItemsGained) {
      onItemsGained(gained);
    }
    const resultSummary = snap.active_scene?.choice_result?.summary;
    if (resultSummary) {
      setNarrativeHistory((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.result) return prev;
        return [...prev.slice(0, -1), { ...last, result: resultSummary }];
      });
    }
    resolveImage(snap.assets || []);
    if (withImage && !(snap.assets || []).some((a) => a.status === "pending" || a.status === "processing" || a.status === "succeeded")) {
      const currentNode = snap.state?._route_map?.current
        ? snap.state._route_map.nodes?.[snap.state._route_map.current]
        : null;
      const hasCuratedImage = Boolean(
        snap.state?._active_cutscene?.image || (currentNode?.anchor && currentNode?.image)
      );
      setImagePlaceholderText(
        hasCuratedImage
          ? DICTS[getLang()]["img.curatedPreferred"]
          : DICTS[getLang()]["img.notGenerated"]
      );
    }
    loadSlotsAndRuns(snap.player?.player_id || playerId || "");
    playBgm(snap.bgm_path || "");
    triggerCinematicEffects(snap);
  };

  const triggerCinematicEffects = (snap: RuntimeSnapshot) => {
    setKenBurnsActive(false);
    setGlitchActive(false);

    // Accessibility: skip the entry glitch/Ken Burns motion under reduced-motion.
    if (prefersReducedMotion()) return;

    if (snap.active_scene && snap.active_scene.turn_index === 0) {
      logToConsole("시네마틱 효과 기동 (turn_index = 0)");
      setKenBurnsActive(true);
      setGlitchActive(true);

      setTimeout(() => {
        playSfx("sfx_move");
      }, 200);

      setTimeout(() => {
        setGlitchActive(false);
      }, 3200);
    }
  };

  return { handleReceivedSnapshot };
}
