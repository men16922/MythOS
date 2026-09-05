import { useState, useRef, useEffect, useCallback } from "react";
import { prefersReducedMotion } from "../combatEffects";
import { createNarrationStore } from "../narrationStore";
import type { RuntimeSnapshot } from "../types";

// Typewriter narration reveal: tokens arrive on the WS stream and are pushed
// onto `narrationQueueRef`; this hook drains that queue character-by-character
// into `displayedNarration` while `isStreaming` is true. When the stream is
// marked done (`streamDoneRef`) and the queue empties, it stops and finalizes
// the pending snapshot via `onFinalizeSnapshot`. Under prefers-reduced-motion
// the queue is flushed whole each tick (no per-character reveal).
//
// The streaming refs are returned so the WS message handler can append tokens
// / mark done / stash the pending snapshot directly, and `resetStreamBuffers`
// clears them before a new generation begins.
export function useTypewriter(onFinalizeSnapshot: (snap: RuntimeSnapshot) => void) {
  // Revealed text lives OUTSIDE React state: a tick must not re-render App.
  const [narration] = useState(createNarrationStore);
  const setDisplayedNarration = narration.set;
  const [isStreaming, setIsStreaming] = useState(false);

  const narrationQueueRef = useRef("");
  const narrationTypedRef = useRef("");
  const streamDoneRef = useRef(false);
  const pendingSnapshotRef = useRef<RuntimeSnapshot | null>(null);

  const startTyper = useCallback(() => {
    setIsStreaming(true);
  }, []);

  // Reset the streaming buffers before a new generation begins.
  const resetStreamBuffers = useCallback(() => {
    streamDoneRef.current = false;
    pendingSnapshotRef.current = null;
    narrationQueueRef.current = "";
    narrationTypedRef.current = "";
    setDisplayedNarration("");
  }, [setDisplayedNarration]);

  // Typewriter Loop
  useEffect(() => {
    if (!isStreaming) return;
    // Accessibility: under prefers-reduced-motion, skip the per-character reveal
    // and flush the queued narration immediately on each tick.
    const reduceMotion = prefersReducedMotion();
    const interval = setInterval(() => {
      if (narrationQueueRef.current.length > 0) {
        // Drain the queue quickly so the typewriter keeps pace with the token
        // stream and doesn't add a trailing delay once generation is done.
        const step = reduceMotion
          ? narrationQueueRef.current.length
          : Math.max(3, Math.ceil(narrationQueueRef.current.length / 24));
        const sliceStr = narrationQueueRef.current.slice(0, step);
        narrationQueueRef.current = narrationQueueRef.current.slice(step);
        narrationTypedRef.current += sliceStr;
        setDisplayedNarration(narrationTypedRef.current);
      } else if (streamDoneRef.current) {
        clearInterval(interval);
        setIsStreaming(false);
        setDisplayedNarration(narrationTypedRef.current);
        if (pendingSnapshotRef.current) {
          onFinalizeSnapshot(pendingSnapshotRef.current);
        }
      }
    }, 12);
    return () => clearInterval(interval);
  }, [isStreaming, onFinalizeSnapshot, setDisplayedNarration]);

  return {
    narration,
    setDisplayedNarration,
    isStreaming,
    setIsStreaming,
    startTyper,
    resetStreamBuffers,
    narrationQueueRef,
    narrationTypedRef,
    streamDoneRef,
    pendingSnapshotRef,
  };
}
