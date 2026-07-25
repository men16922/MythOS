import { useEffect, useRef, useState } from "react";

export type CombatCinemaPhase = "enter" | "attack" | "impact" | "exit";
export type CombatCinemaCue = "enter" | "windup" | "impact" | "exit";

interface CombatCinemaTimelineOptions {
  isFast: boolean;
  defenderId: string;
  damage: number;
  onFinish?: () => void;
  onImpact?: (defenderId: string, damage: number) => void;
  onCue?: (cue: CombatCinemaCue) => void;
}

const FAST_TIMELINE = { windup: 200, impact: 650, exit: 950, finish: 1200 };
const STANDARD_TIMELINE = { windup: 400, impact: 1050, exit: 1750, finish: 2100 };

export function useCombatCinemaTimeline({
  isFast,
  defenderId,
  damage,
  onFinish,
  onImpact,
  onCue,
}: CombatCinemaTimelineOptions): CombatCinemaPhase {
  const [phase, setPhase] = useState<CombatCinemaPhase>("enter");
  const onFinishRef = useRef(onFinish);
  const onImpactRef = useRef(onImpact);
  const onCueRef = useRef(onCue);

  useEffect(() => {
    onFinishRef.current = onFinish;
    onImpactRef.current = onImpact;
    onCueRef.current = onCue;
  });

  useEffect(() => {
    const timing = isFast ? FAST_TIMELINE : STANDARD_TIMELINE;
    onCueRef.current?.("enter");

    const windupTimer = setTimeout(() => {
      setPhase("attack");
      onCueRef.current?.("windup");
    }, timing.windup);
    const impactTimer = setTimeout(() => {
      setPhase("impact");
      onCueRef.current?.("impact");
      onImpactRef.current?.(defenderId, damage);
    }, timing.impact);
    const exitTimer = setTimeout(() => {
      setPhase("exit");
      onCueRef.current?.("exit");
    }, timing.exit);
    const finishTimer = setTimeout(() => {
      onFinishRef.current?.();
    }, timing.finish);

    return () => {
      clearTimeout(windupTimer);
      clearTimeout(impactTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [isFast, defenderId, damage]);

  return phase;
}
