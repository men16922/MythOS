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
