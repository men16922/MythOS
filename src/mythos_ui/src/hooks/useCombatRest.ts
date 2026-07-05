import type { Dispatch, RefObject, SetStateAction } from "react";
import { apiCombatAction, apiEquip, getLang } from "../api";
import { DICTS } from "../i18n/lang";
import type { CombatAction, RuntimeSnapshot } from "../types";

type ImageOpts = {
  with_image: boolean;
  image_every_turn: boolean;
};

type UseCombatRestArgs = {
  // Run identity / mode read by the REST + WS handlers.
  loopId: string | null;
  selectedScenarioId: string;
  fallbackMode: boolean;
  isBusy: boolean;
  isStreaming: boolean;
  // Snapshots the combat handlers read + patch.
  finalizedSnapshot: RuntimeSnapshot | null;
  lastSnapshot: RuntimeSnapshot | null;
  // Setters.
  setIsBusy: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setDisplayedNarration: Dispatch<SetStateAction<string>>;
  setFinalizedSnapshot: Dispatch<SetStateAction<RuntimeSnapshot | null>>;
  setLastSnapshot: Dispatch<SetStateAction<RuntimeSnapshot | null>>;
  setCombatLog: Dispatch<SetStateAction<string>>;
  setCombatTarget: Dispatch<SetStateAction<string | null>>;
  setImagePlaceholderText: Dispatch<SetStateAction<string | null>>;
  // Refs shared with the cinema-queue / WS / scene-history concerns.
  dispatchedActionRef: RefObject<CombatAction | null>;
  pendingActionRef: RefObject<string | null>;
  websocketRef: RefObject<WebSocket | null>;
  // Helpers from sibling hooks.
  beginStream: (statusLabel: string) => void;
  imageOpts: () => ImageOpts;
  clearVisualTimeout: () => void;
  logToConsole: (line: string) => void;
};

/**
 * Owns the combat REST operations and the post-combat resume: `handleCombatAction`
 * (POST a combat action, patch the snapshot), `appendCombatLog`, `handleEquip`
 * (POST an equip toggle), and `continueAfterCombat` (resume the narrative stream
 * after a combat resolves). Each function is a plain (non-memoized) function —
 * identical to its prior in-`App` form — so behavior is preserved; all
 * cross-cutting state, setters, refs and helpers are supplied via props.
 */
export function useCombatRest(args: UseCombatRestArgs) {
  const {
    loopId,
    selectedScenarioId,
    fallbackMode,
    isBusy,
    isStreaming,
    finalizedSnapshot,
    lastSnapshot,
    setIsBusy,
    setStatus,
    setDisplayedNarration,
    setFinalizedSnapshot,
    setLastSnapshot,
    setCombatLog,
    setCombatTarget,
    setImagePlaceholderText,
    dispatchedActionRef,
    pendingActionRef,
    websocketRef,
    beginStream,
    imageOpts,
    clearVisualTimeout,
    logToConsole,
  } = args;

  const handleCombatAction = async (action: CombatAction) => {
    if (isBusy || !loopId) return;
    setIsBusy(true);
    setStatus(DICTS[getLang()]["sess.actionProcessing"]);

    // Hand the dispatched action to the board animator (for the attack/cast
    // connector); impact SFX now fire on the animation's impact frame.
    dispatchedActionRef.current = action;

    try {
      const response = await apiCombatAction({
        loop_id: loopId,
        scenario_id: selectedScenarioId,
        action,
      });

      if (response.prose) {
        setDisplayedNarration(response.prose);
        appendCombatLog(response.prose);
      }

      const baseSnapshot = finalizedSnapshot || lastSnapshot;
      if (!baseSnapshot) {
        setStatus(DICTS[getLang()]["sess.actionNoSnapshot"]);
        logToConsole("Combat 오류: 갱신할 스냅샷이 없습니다.");
        return;
      }

      // Update snapshot combat. A run-ending combat (boss climax, permadeath)
      // resolves the ending mid-combat and `resume` refuses ended loops, so the
      // action response is the only source for the ENDED screen — fold its
      // phase + ending fields in, or the stale pre-combat phase keeps the
      // EndedPanel (ending art/narration) from ever rendering.
      const updatedSnapshot = {
        ...baseSnapshot,
        combat: response.combat,
        ...(response.loop_phase ? { phase: response.loop_phase } : {}),
        ...(response.ending
          ? { state: { flags: [], ...(baseSnapshot.state || {}), ...response.ending } }
          : {}),
      };
      setFinalizedSnapshot(updatedSnapshot);
      setLastSnapshot(updatedSnapshot);
      // Victory/defeat SFX fire at the end of the board animation (see CombatAnimator).
      setStatus(DICTS[getLang()]["sess.actionApplied"]);
    } catch (e) {
      setStatus(DICTS[getLang()]["sess.actionFail"] + (e as Error).message);
      logToConsole("Combat 오류: " + (e as Error).message);
    } finally {
      setIsBusy(false);
    }
  };

  const appendCombatLog = (prose: string) => {
    const timeStr = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    setCombatLog((prev) => `[${timeStr}] ${prose}\n` + prev);
  };

  const handleEquip = (itemId: string, equipped: boolean, wearer?: string) => {
    if (!loopId) return;
    apiEquip({ loop_id: loopId, item_id: itemId, equipped, wearer })
      .then((snap) => setFinalizedSnapshot(snap))
      .catch((err) => console.error("equip failed", err));
  };

  const continueAfterCombat = () => {
    if (isStreaming) return;
    setCombatLog("");
    setCombatTarget(null);
    // The post-combat action text is fed to the Director as the player's move, so it
    // must be in the active language (a hardcoded Korean action made the LLM continue
    // in Korean even in EN mode). Also thread `lang` so the backend localizes the
    // generated scene/data (the WS default is "ko").
    const postAction = DICTS[getLang()]["sess.postCombatAction"];
    pendingActionRef.current = postAction;
    // Keep previous image visible until the new one is generated asynchronously
    clearVisualTimeout();
    setImagePlaceholderText(DICTS[getLang()]["img.preparing"]);
    beginStream(DICTS[getLang()]["sess.streamPostCombat"]);

    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          event: "choose",
          loop_id: loopId,
          scenario_id: selectedScenarioId,
          action: postAction,
          fallback: fallbackMode,
          lang: getLang(),
          ...imageOpts(),
        })
      );
    }
  };

  return { handleCombatAction, appendCombatLog, handleEquip, continueAfterCombat };
}
