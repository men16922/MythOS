import { useCallback, useEffect, useState } from "react";

import { apiGetSlots, apiLoadSlot } from "../api";
import type { SaveSlot } from "../types";

type ResumeTarget = {
  playerId: string;
  scenarioId: string;
  loopId?: string;
};

type LoadSlotTarget = ResumeTarget & {
  loopId: string;
  slotId?: string;
};

type UseSaveLoadArgs = {
  inviteGate: "checking" | "blocked" | "ok";
  connected: boolean;
  startScreenPlayerId: string | null;
  onResume: (target: ResumeTarget) => void | Promise<void>;
};

/**
 * Owns the save/load UI state and the ordering-sensitive load path.
 *
 * Manual slots must be restored server-side before the ordinary resume path
 * reads the active loop. Bookmark slots have no snapshot and resume directly.
 */
export function useSaveLoad({
  inviteGate,
  connected,
  startScreenPlayerId,
  onResume,
}: UseSaveLoadArgs) {
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [saveLoadModal, setSaveLoadModal] = useState<"save" | "load" | null>(null);
  const [saveLabelInput, setSaveLabelInput] = useState("");

  // Pre-connect, fetch this identity's save slots so the start screen can
  // offer a LOAD picker. In-game refreshes stay owned by useDataLoaders.
  useEffect(() => {
    if (inviteGate !== "ok" || connected || !startScreenPlayerId) return;
    let cancelled = false;
    apiGetSlots(startScreenPlayerId)
      .then((data) => {
        if (!cancelled) setSaveSlots(data.slots || []);
      })
      .catch(() => {
        /* no saves / gated: leave the picker empty */
      });
    return () => {
      cancelled = true;
    };
  }, [startScreenPlayerId, connected, inviteGate]);

  const openSave = useCallback(() => setSaveLoadModal("save"), []);
  const openLoad = useCallback(() => setSaveLoadModal("load"), []);
  const closeModal = useCallback(() => setSaveLoadModal(null), []);

  const loadSlot = useCallback(
    async (data: LoadSlotTarget) => {
      setSaveLoadModal(null);
      if (data.slotId) {
        try {
          await apiLoadSlot({
            player_id: data.playerId,
            slot_id: data.slotId,
            scenario_id: data.scenarioId,
          });
        } catch {
          /* fall through — resume still loads the live loop */
        }
      }
      onResume(data);
    },
    [onResume]
  );

  return {
    saveLoadModal,
    openSave,
    openLoad,
    closeModal,
    saveSlots,
    setSaveSlots,
    saveLabelInput,
    setSaveLabelInput,
    loadSlot,
  };
}
