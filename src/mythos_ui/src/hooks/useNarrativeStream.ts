import { useCallback } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { NarrativeHistoryItem } from "../App";
import type { RuntimeSnapshot, WebSocketMessage } from "../types";
import { useGameSocket } from "./useGameSocket";

type ImageOpts = {
  with_image: boolean;
  visual_async: boolean;
  image_every_turn: boolean;
};

type UseNarrativeStreamArgs = {
  // Run identity / mode read by the streaming send + receive handlers.
  finalizedSnapshot: RuntimeSnapshot | null;
  withImage: boolean;
  isStreaming: boolean;
  loopId: string | null;
  selectedScenarioId: string;
  fallbackMode: boolean;
  // Refs: the action just taken (folded into history on the next stream) and the
  // typewriter's token queue / done-flag / pending-snapshot stash (written
  // directly by the inbound frame handler).
  pendingActionRef: RefObject<string | null>;
  narrationQueueRef: RefObject<string>;
  streamDoneRef: RefObject<boolean>;
  pendingSnapshotRef: RefObject<RuntimeSnapshot | null>;
  // Setters.
  setStatus: Dispatch<SetStateAction<string>>;
  setNarrativeHistory: Dispatch<SetStateAction<NarrativeHistoryItem[]>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  setImagePlaceholderText: Dispatch<SetStateAction<string>>;
  // Helpers from sibling hooks.
  resetStreamBuffers: () => void;
  startTyper: () => void;
  clearVisualTimeout: () => void;
  onVisualStatus: (msg: WebSocketMessage) => void;
  handleReceivedSnapshot: (snap: RuntimeSnapshot) => void;
  logToConsole: (line: string) => void;
};

/**
 * Owns the gameplay narrative stream: the inbound-frame type switch
 * (`handleSocketMessage` — token append / snapshot finalize / visual-status /
 * error), the WebSocket lifecycle (delegated to `useGameSocket`, exposing
 * `websocketRef`/`openSocket`/`closeSocket`), and the outbound streaming send
 * (`beginStream` folds the prior scene into history then arms the typewriter,
 * `imageOpts` builds the image flags, `sendChoose` emits a `choose` event).
 * `handleSocketMessage` stays a plain function (identical to its prior in-`App`
 * form); `beginStream`/`imageOpts`/`sendChoose` keep their original `useCallback`
 * memoization. All cross-cutting state, setters, refs and helpers are supplied
 * via props, so behavior is preserved.
 */
export function useNarrativeStream(args: UseNarrativeStreamArgs) {
  const {
    finalizedSnapshot,
    withImage,
    isStreaming,
    loopId,
    selectedScenarioId,
    fallbackMode,
    pendingActionRef,
    narrationQueueRef,
    streamDoneRef,
    pendingSnapshotRef,
    setStatus,
    setNarrativeHistory,
    setIsStreaming,
    setImagePlaceholderText,
    resetStreamBuffers,
    startTyper,
    clearVisualTimeout,
    onVisualStatus,
    handleReceivedSnapshot,
    logToConsole,
  } = args;

  // WebSocket connect + auto-reconnect lifecycle lives in `useGameSocket`; it
  // parses each inbound frame and hands it to `handleSocketMessage` (the type
  // switch stays here), and exposes `openSocket`/`closeSocket` plus the live
  // `websocketRef`.
  const handleSocketMessage = (msg: WebSocketMessage) => {
    if (msg.type === "token" && msg.content) {
      narrationQueueRef.current += msg.content;
    } else if (msg.type === "snapshot" && msg.data) {
      streamDoneRef.current = true;
      pendingSnapshotRef.current = msg.data;
      setStatus("장면 확정.");
      handleReceivedSnapshot(msg.data);
    } else if (msg.type === "visual_status") {
      onVisualStatus(msg);
    } else if (msg.type === "error") {
      streamDoneRef.current = true;
      setIsStreaming(false);
      setStatus("오류: " + (msg.detail || "알 수 없음"));
      logToConsole("WS error: " + (msg.detail || ""));
    }
  };

  const { websocketRef, openSocket, closeSocket } = useGameSocket({
    onMessage: handleSocketMessage,
    logToConsole,
  });

  // --- WebSocket Streaming logic ---
  const beginStream = useCallback((statusLabel: string) => {
    const prevScene = finalizedSnapshot?.active_scene;
    if (prevScene) {
      const takenAction = pendingActionRef.current;
      setNarrativeHistory((prev) => {
        if (prev.some((h) => h.sceneId === prevScene.scene_id)) return prev;
        return [
          ...prev,
          {
            sceneId: prevScene.scene_id,
            title: prevScene.title,
            text: prevScene.narration,
            action: takenAction,
          },
        ];
      });
    }
    pendingActionRef.current = null;

    resetStreamBuffers();
    setStatus(statusLabel);
    startTyper();
  }, [resetStreamBuffers, startTyper, finalizedSnapshot, pendingActionRef, setNarrativeHistory, setStatus]);

  const imageOpts = useCallback((): ImageOpts => {
    return {
      with_image: withImage,
      visual_async: withImage,
      image_every_turn: withImage,
    };
  }, [withImage]);

  const sendChoose = useCallback((choiceId: string) => {
    if (isStreaming) return;
    // Remember the chosen label so it can be recorded against the scene it was
    // taken in once that scene scrolls into history.
    const chosen = finalizedSnapshot?.active_scene?.choices?.find(
      (c) => c.choice_id === choiceId
    );
    pendingActionRef.current = chosen?.label ?? null;
    // Keep previous image visible until the new one is generated asynchronously
    clearVisualTimeout();
    setImagePlaceholderText("그림 생성 준비 중…");
    beginStream("선택 적용 · 스트리밍…");
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          event: "choose",
          loop_id: loopId,
          choice_id: choiceId,
          scenario_id: selectedScenarioId,
          fallback: fallbackMode,
          ...imageOpts(),
        })
      );
    }
  }, [beginStream, clearVisualTimeout, fallbackMode, finalizedSnapshot, imageOpts, isStreaming, loopId, pendingActionRef, selectedScenarioId, setImagePlaceholderText, websocketRef]);

  return { websocketRef, openSocket, closeSocket, beginStream, imageOpts, sendChoose };
}
