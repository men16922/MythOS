import { useCallback, useRef, useState } from "react";
import { apiResolveAsset, getLang } from "../api";
import { DICTS } from "../i18n/lang";
import type { AssetInfo, WebSocketMessage } from "../types";

/**
 * Owns the scene-image / visual-status concern: the displayed `sceneImageUrl`,
 * the placeholder text shown while no image is ready, and the watchdog timeout
 * that flips the placeholder to a "worker may be down" hint if a pending visual
 * job never reports a terminal status. Exposes the state setters plus
 * `clearVisualTimeout` (callers reset the watchdog before each new turn),
 * `onVisualStatus` (drains a `visual_status` WS frame), and `resolveImage`
 * (resolves a succeeded asset's storage URI into a presigned URL).
 */
export function useSceneVisuals(logToConsole: (line: string) => void) {
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [imagePlaceholderText, setImagePlaceholderText] = useState(
    DICTS[getLang()]["img.toggleHint"]
  );

  // Fires if a pending/processing visual job never reports a terminal status
  // (worker died mid-flight) so the placeholder doesn't spin forever.
  const visualTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable identity so callers can list it in their useCallback dep arrays
  // without forcing a re-create each render.
  const clearVisualTimeout = useCallback(() => {
    if (visualTimeoutRef.current) {
      clearTimeout(visualTimeoutRef.current);
      visualTimeoutRef.current = null;
    }
  }, []);

  const onVisualStatus = (msg: WebSocketMessage) => {
    clearVisualTimeout();
    if (msg.status === "pending" || msg.status === "processing") {
      setImagePlaceholderText(`${DICTS[getLang()]["img.generating"]} (${msg.status})`);
      // No terminal status within the budget ⇒ worker is likely down or stalled.
      visualTimeoutRef.current = setTimeout(() => {
        setImagePlaceholderText(DICTS[getLang()]["img.workerStalled"]);
        logToConsole("visual_status timeout: worker 무응답(90s)");
      }, 90000);
    } else if (msg.status === "succeeded" && msg.url) {
      setSceneImageUrl(msg.url);
    } else {
      setImagePlaceholderText(DICTS[getLang()]["img.failed"] + msg.status);
      logToConsole("visual_status: " + msg.status);
    }
  };

  const resolveImage = async (assets: AssetInfo[]) => {
    const ok = assets.find((a) => a.status === "succeeded" && a.storage_uri);
    if (!ok) return;
    try {
      const { url } = await apiResolveAsset(ok.storage_uri);
      setSceneImageUrl(url);
    } catch (err) {
      logToConsole("이미지 resolve 실패: " + (err as Error).message);
    }
  };

  return {
    sceneImageUrl,
    setSceneImageUrl,
    imagePlaceholderText,
    setImagePlaceholderText,
    clearVisualTimeout,
    onVisualStatus,
    resolveImage,
  };
}
