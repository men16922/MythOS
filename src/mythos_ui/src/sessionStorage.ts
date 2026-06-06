export const LS_KEY = "mythos.session";

export interface ResumeSessionData {
  playerId: string;
  scenarioId: string;
  loopId?: string;
}

export function parseResumeSession(raw: string | null): ResumeSessionData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ResumeSessionData>;
    if (typeof parsed.playerId !== "string" || parsed.playerId.length === 0) {
      return null;
    }
    return {
      playerId: parsed.playerId,
      scenarioId: typeof parsed.scenarioId === "string" ? parsed.scenarioId : "neo-seoul",
      loopId: typeof parsed.loopId === "string" ? parsed.loopId : undefined,
    };
  } catch {
    return null;
  }
}
