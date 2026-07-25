import { useCallback, useMemo, useState } from "react";

import type { RunSummary, ScenarioInfo } from "../types";
import { buildEpiphanyNotice } from "../viewModels";

const EPIPHANY_SEEN_KEY = "mythos_epiphany_seen";

type UseEpiphanyBannerArgs = {
  runsHistory: RunSummary[];
  scenarios: ScenarioInfo[];
};

/**
 * Owns past-loop epiphany derivation and per-loop dismissal persistence.
 * Storage failures stay fail-open so a notice can still be dismissed in-memory.
 */
export function useEpiphanyBanner({ runsHistory, scenarios }: UseEpiphanyBannerArgs) {
  const [dismissedLoopId, setDismissedLoopId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(EPIPHANY_SEEN_KEY);
    } catch {
      return null;
    }
  });

  const notice = useMemo(() => {
    const nextNotice = buildEpiphanyNotice(runsHistory, scenarios);
    return nextNotice && nextNotice.loopId !== dismissedLoopId ? nextNotice : null;
  }, [runsHistory, scenarios, dismissedLoopId]);

  const dismiss = useCallback(() => {
    if (!notice) return;
    setDismissedLoopId(notice.loopId);
    try {
      localStorage.setItem(EPIPHANY_SEEN_KEY, notice.loopId);
    } catch {
      /* ignore storage failures */
    }
  }, [notice]);

  return { notice, dismiss };
}
