import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ConciseModeContext,
  persistConciseMode,
  resolveInitialConciseMode,
} from "./conciseMode";

/** Provides the global concise(간결)-mode flag to the tree. Also toggles a
 * `concise-mode` class on `<body>` so future CSS-only slices (T6b/T6c) can key
 * off it without prop-drilling every consumer. */
export function ConciseModeProvider({ children }: { children: ReactNode }) {
  const [conciseMode, setConciseModeState] = useState<boolean>(resolveInitialConciseMode);

  const setConciseMode = useCallback((next: boolean) => {
    setConciseModeState(next);
    persistConciseMode(next);
  }, []);

  const toggleConciseMode = useCallback(() => {
    setConciseModeState((prev) => {
      const next = !prev;
      persistConciseMode(next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.body.classList.toggle("concise-mode", conciseMode);
  }, [conciseMode]);

  const value = useMemo(
    () => ({ conciseMode, setConciseMode, toggleConciseMode }),
    [conciseMode, setConciseMode, toggleConciseMode],
  );

  return (
    <ConciseModeContext.Provider value={value}>{children}</ConciseModeContext.Provider>
  );
}
