import type { RunSummary } from "./types";

export function mergedRuns(primary: RunSummary[], fallback?: RunSummary[]): RunSummary[] {
  const seen = new Set<string>();
  return [...primary, ...(fallback || [])]
    .filter((run) => {
      if (!run.loop_id || seen.has(run.loop_id)) return false;
      seen.add(run.loop_id);
      return true;
    })
    .sort((a, b) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime());
}
