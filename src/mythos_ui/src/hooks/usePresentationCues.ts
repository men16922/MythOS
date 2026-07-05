import { useEffect, useRef, useState } from "react";
import type { RuntimeSnapshot } from "../types";

// G3 cue → SFX file key. Missing files fail gracefully in playSfx (console
// note); authoring the absent ones (alarm/sting/drone/pickup) is an agy
// follow-up — the visual half of each cue works regardless.
const CUE_SFX: Record<string, string> = {
  alarm: "sfx_alarm",
  sting: "sfx_sting",
  drone: "sfx_drone",
  pickup: "sfx_pickup",
  glitch: "sfx_glitch",
};

const FX_DURATION_MS = 1600;

/** G3 cinematic effect layer: fire the snapshot's deterministic
 * `presentation_cues` once per scene — transient CSS classes for the visual
 * half (shake / vignette pulse / glitch flicker) and mapped SFX for the audio
 * half. Returns the class string to apply to the play area. */
export function usePresentationCues(
  snapshot: RuntimeSnapshot | null,
  playSfx: (key: string) => void
): string {
  const [fxClass, setFxClass] = useState("");
  const lastSceneRef = useRef<string | null>(null);

  const sceneId = snapshot?.active_scene?.scene_id ?? null;
  const cues = snapshot?.active_scene?.presentation_cues;

  useEffect(() => {
    if (!sceneId || sceneId === lastSceneRef.current) return;
    lastSceneRef.current = sceneId;
    if (!cues || cues.length === 0) return;
    const classes: string[] = [];
    if (cues.includes("shake")) classes.push("fx-shake");
    if (cues.includes("vignette")) classes.push("fx-vignette");
    if (cues.includes("glitch")) classes.push("fx-glitch");
    for (const cue of cues) {
      const key = CUE_SFX[cue];
      if (key) playSfx(key);
    }
    if (classes.length === 0) return;
    // Deferred set (timeout 0) keeps the effect free of synchronous setState
    // (react-hooks cascading-render rule); the class clears itself one beat later.
    const startTimer = setTimeout(() => setFxClass(classes.join(" ")), 0);
    const endTimer = setTimeout(() => setFxClass(""), FX_DURATION_MS);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, [sceneId, cues, playSfx]);

  return fxClass;
}
