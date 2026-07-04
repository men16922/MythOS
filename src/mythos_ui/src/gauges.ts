import type { RuntimeSnapshot } from "./types";

export interface GaugeConfig {
  stability: number;
  stabColor: string;
  tension: number;
  tensColor: string;
  decay_percent: number;
  decayColor: string;
  riskVal: string;
  riskPercent: number;
  riskColor: string;
  clueCount: number;
  cluePercent: number;
}

function clockColor(value: number, warnAt: number, dangerAt: number): string {
  if (value >= dangerAt) return "var(--danger)";
  if (value >= warnAt) return "var(--warn)";
  return "var(--term)";
}

export function buildGaugeConfig(snapshot: RuntimeSnapshot): GaugeConfig {
  const { stability, tension, decay_percent, zone_risk, clues_collected } = snapshot;
  const riskVal = zone_risk || "—";
  let riskPercent = 25;
  let riskColor = "var(--term)";

  if (riskVal.includes("Critical") || riskVal.includes("경보")) {
    riskPercent = 100;
    riskColor = "var(--danger)";
  } else if (riskVal.includes("High") || riskVal.includes("위험")) {
    riskPercent = 75;
    riskColor = "var(--danger)";
  } else if (riskVal.includes("Medium") || riskVal.includes("경계")) {
    riskPercent = 50;
    riskColor = "var(--warn)";
  }

  const clueCount = clues_collected || 0;
  return {
    stability,
    stabColor: stability <= 30 ? "var(--danger)" : "var(--term)",
    tension,
    tensColor: clockColor(tension, 45, 70),
    decay_percent,
    decayColor: clockColor(decay_percent, 45, 70),
    riskVal,
    riskPercent,
    riskColor,
    clueCount,
    cluePercent: Math.min(100, Math.round((clueCount / 16.0) * 100)),
  };
}

export interface AffectionGauge {
  name: string;
  label: string;
  value: number;
  percent: number;
  color: string;
}

// Affection values are unbounded ints; cutscene unlock thresholds sit at small
// positive numbers (se_rin 2/4). Map a sensible display window to 0-100% so the
// shared GaugeBar fill reads naturally; out-of-window values are clamped by the bar.
const AFFECTION_FLOOR = -5;
const AFFECTION_CEIL = 10;

function humanizeName(name: string): string {
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// 양수=따뜻한색(호감 상승), 음수=차가운색(거리감), 0=중립. 정확한 색감은 manual feel QA 대상.
export function affectionColor(value: number): string {
  if (value > 0) return "var(--warn)";
  if (value < 0) return "var(--term)";
  return "var(--ink-dim)";
}

export function buildAffectionGauges(
  relationships?: Record<string, number>,
  visibleCompanions: string[] = [],
): AffectionGauge[] {
  const values = { ...(relationships || {}) };
  visibleCompanions.forEach((companion) => { values[companion] ??= 0; });
  return Object.entries(values)
    .filter(([, value]) => typeof value === "number")
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      label: humanizeName(name),
      value,
      percent: Math.round(
        ((value - AFFECTION_FLOOR) / (AFFECTION_CEIL - AFFECTION_FLOOR)) * 100,
      ),
      color: affectionColor(value),
    }));
}
