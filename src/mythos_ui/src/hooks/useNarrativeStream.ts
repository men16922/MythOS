import { useCallback, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { NarrativeHistoryItem } from "../App";
import type { RuntimeSnapshot, WebSocketMessage } from "../types";
import { getLang } from "../api";
import { DICTS } from "../i18n/lang";
import { useGameSocket } from "./useGameSocket";

type ImageOpts = {
  with_image: boolean;
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
  setImagePlaceholderText: Dispatch<SetStateAction<string | null>>;
  // Helpers from sibling hooks.
  resetStreamBuffers: () => void;
  startTyper: () => void;
  clearVisualTimeout: () => void;
  onVisualStatus: (msg: WebSocketMessage) => void;
  handleReceivedSnapshot: (snap: RuntimeSnapshot) => void;
  // Early opening-variant frame (begin only): fired before the first-scene
  // generation so the intro can reveal the correct sequence without a timeout.
  onLoopMeta: (variant: string, runsCompleted: number) => void;
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
    onLoopMeta,
    logToConsole,
  } = args;
  // React state does not update synchronously, so two clicks in one event turn
  // can both observe isStreaming=false. This ref closes that gap immediately.
  const choiceInFlightRef = useRef(false);
  // The choice optimistically marked "전송 중" the instant it was clicked —
  // rendered as a spinner on that card with its siblings disabled, so a click
  // on a dead socket still gives feedback (T2: no more triple-clicking).
  const [pendingChoiceId, setPendingChoiceId] = useState<string | null>(null);

  // WebSocket connect + auto-reconnect lifecycle lives in `useGameSocket`; it
  // parses each inbound frame and hands it to `handleSocketMessage` (the type
  // switch stays here), and exposes `openSocket`/`closeSocket` plus the live
  // `websocketRef`.
  const handleSocketMessage = (msg: WebSocketMessage) => {
    if (msg.type === "token" && msg.content) {
      narrationQueueRef.current += msg.content;
    } else if (msg.type === "loop_meta") {
      onLoopMeta(msg.opening_variant || "default", msg.runs_completed || 0);
    } else if (msg.type === "snapshot" && msg.data) {
      choiceInFlightRef.current = false;
      setPendingChoiceId(null);
      streamDoneRef.current = true;
      pendingSnapshotRef.current = msg.data;
      setStatus(DICTS[getLang()]["sess.sceneConfirmed"]);
      handleReceivedSnapshot(msg.data);
    } else if (msg.type === "visual_status") {
      onVisualStatus(msg);
    } else if (msg.type === "error") {
      choiceInFlightRef.current = false;
      setPendingChoiceId(null);
      streamDoneRef.current = true;
      setIsStreaming(false);
      setStatus(DICTS[getLang()]["sess.error"] + (msg.detail || DICTS[getLang()]["sess.unknown"]));
      logToConsole("WS error: " + (msg.detail || ""));
    }
  };

  const { websocketRef, openSocket, ensureOpenSocket, closeSocket } = useGameSocket({
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
      image_every_turn: withImage,
    };
  }, [withImage]);

  const sendChoose = useCallback((choiceId: string) => {
    if (isStreaming || choiceInFlightRef.current) return;
    choiceInFlightRef.current = true;
    setPendingChoiceId(choiceId);
    // Remember the chosen label so it can be recorded against the scene it was
    // taken in once that scene scrolls into history.
    const chosen = finalizedSnapshot?.active_scene?.choices?.find(
      (c) => c.choice_id === choiceId
    );
    pendingActionRef.current = chosen?.label ?? null;
    const payload = JSON.stringify({
      event: "choose",
      loop_id: loopId,
      scene_id: finalizedSnapshot?.active_scene?.scene_id,
      choice_id: choiceId,
      scenario_id: selectedScenarioId,
      fallback: fallbackMode,
      lang: getLang(),
      ...imageOpts(),
    });
    const dispatch = (ws: WebSocket) => {
      // Keep previous image visible until the new one is generated asynchronously
      clearVisualTimeout();
      setImagePlaceholderText(DICTS[getLang()]["img.preparing"]);
      beginStream(DICTS[getLang()]["sess.streamChoice"]);
      ws.send(payload);
    };
    const live = websocketRef.current;
    if (live && live.readyState === WebSocket.OPEN) {
      dispatch(live);
      return;
    }
    // Dead/absent socket: the click stays visible as the pending card while we
    // reconnect, then the choice is re-sent exactly once (the server treats a
    // duplicate choose as "return current snapshot", so this cannot double-run).
    setStatus(DICTS[getLang()]["sess.reconnecting"]);
    ensureOpenSocket()
      .then((ws) => dispatch(ws))
      .catch(() => {
        choiceInFlightRef.current = false;
        setPendingChoiceId(null);
        pendingActionRef.current = null;
        setStatus(DICTS[getLang()]["sess.reconnectFail"]);
      });
  }, [beginStream, clearVisualTimeout, ensureOpenSocket, fallbackMode, finalizedSnapshot, imageOpts, isStreaming, loopId, pendingActionRef, selectedScenarioId, setImagePlaceholderText, setStatus, websocketRef]);

  return { websocketRef, openSocket, closeSocket, beginStream, imageOpts, sendChoose, pendingChoiceId };
}
