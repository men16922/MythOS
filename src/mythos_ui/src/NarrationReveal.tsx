import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import type { NarrationSource } from "./narrationStore";

/**
 * The one component that re-renders on every typewriter tick. It subscribes to
 * the narration store and hands the current text to `render` (StoryPanel's
 * speaker-aware renderer); `onTextChange` lets the panel keep its bottom-stick
 * scroll without depending on the text itself.
 */
export function NarrationReveal({
  source,
  render,
  onTextChange,
}: {
  source: NarrationSource;
  render: (text: string) => ReactNode;
  onTextChange?: () => void;
}) {
  const text = useSyncExternalStore(source.subscribe, source.get, source.get);
  useEffect(() => {
    onTextChange?.();
  }, [text, onTextChange]);
  return <>{render(text)}</>;
}
