import { useEffect } from "react";
import { isChoiceDisabled } from "../choices";
import { blockingOverlayOpen } from "../overlays";
import type { RuntimeSnapshot } from "../types";

// Number-key (1-9) choice hotkeys for the active scene. Pressing a digit picks
// the matching choice (when enabled by the current stability/tension gates) and
// emits it through `sendChoose`. Typing into an input is ignored. Behavior-
// preserving extraction from App.tsx; the listener is (re)bound whenever the
// finalized snapshot or the send callback identity changes.
export function useKeyboardChoice(
  finalizedSnapshot: RuntimeSnapshot | null,
  sendChoose: (choiceId: string) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      // A boon offer / save-load modal / cinema on top: the digit must not pick
      // a choice behind it (a loop-start boon then 409s as a stale offer).
      if (blockingOverlayOpen()) return;
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 9 && finalizedSnapshot) {
        const choices = finalizedSnapshot.active_scene?.choices || [];
        const choice = choices[keyNum - 1];
        if (choice) {
          if (
            !isChoiceDisabled(
              choice,
              finalizedSnapshot.stability,
              finalizedSnapshot.tension
            )
          ) {
            sendChoose(choice.choice_id);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finalizedSnapshot, sendChoose]);
}
