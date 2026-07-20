// Custom vector icon set for glyph slots (player feedback 2026-07-20: text
// glyphs like "⚔" render as a thin ✕ on platforms without the symbol, reading
// as a broken/default icon). Inline SVG + currentColor so every existing
// accent-color rule (legend chips, combat red, gold anchors) keeps working.
// Sized 1em via the `gicon` class — slots that sized glyphs via font-size
// need no layout changes. File-based icons stay in public/assets/icons/
// (combat action dock, stat PNGs); this module covers the tinted UI glyphs.

import type { ReactNode } from "react";

export type GameIconName =
  | "swords"
  | "diamond"
  | "magnifier"
  | "rings"
  | "bag"
  | "cross"
  | "spark"
  | "skull"
  | "star"
  | "checkpoint"
  | "nodeDot"
  | "bolt"
  | "flag"
  | "arrowRight"
  | "arrowUpRight"
  | "coverFull"
  | "coverHalf"
  | "droplet"
  | "triangle";

const STROKE = {
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

const FILL = { fill: "currentColor" };

const ICON_PATHS: Record<GameIconName, ReactNode> = {
  // Crossed swords: blades + tip brackets + crossguards (style of combat-attack.svg).
  swords: (
    <path
      {...STROKE}
      d="M6 26 24 8M20 8h4v4M26 26 8 8M8 12V8h4M7.5 21.5l3 3M24.5 21.5l-3 3"
    />
  ),
  // 주요 장면 ◆
  diamond: <path {...STROKE} d="M16 5 27 16 16 27 5 16Z" />,
  // 단서 ❖ → magnifying glass
  magnifier: (
    <g {...STROKE}>
      <circle cx="13.5" cy="13.5" r="7.5" />
      <path d="M19 19l8 8" />
    </g>
  ),
  // 순찰/목표 ◎ (also the learning-goal bullseye)
  rings: (
    <g {...STROKE}>
      <circle cx="16" cy="16" r="10" />
      <circle cx="16" cy="16" r="4" />
    </g>
  ),
  // 시장 ▣ → market bag
  bag: (
    <g {...STROKE}>
      <path d="M8 12h16l-1.6 14H9.6L8 12Z" />
      <path d="M12 12V9a4 4 0 0 1 8 0v3" />
    </g>
  ),
  // 정비 ✚
  cross: <path {...STROKE} d="M13 5h6v8h8v6h-8v8h-6v-8H5v-6h8V5Z" />,
  // 사건/깨달음 ✦
  spark: <path {...STROKE} d="M16 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" />,
  // 대면(보스) ❒ → skull
  skull: (
    <g>
      <path
        {...STROKE}
        d="M16 4a9.5 9.5 0 0 0-9.5 9.5c0 3.6 1.8 6.3 4 8V26h11v-4.5c2.2-1.7 4-4.4 4-8A9.5 9.5 0 0 0 16 4Z"
      />
      <circle {...FILL} cx="12.3" cy="14.5" r="2" />
      <circle {...FILL} cx="19.7" cy="14.5" r="2" />
      <path {...STROKE} strokeWidth={2} d="M13.5 26v-3M18.5 26v-3" />
    </g>
  ),
  // 고정 장면 ★ (filled — reads better at chip size)
  star: (
    <path
      {...FILL}
      d="M16 3.5l3.7 8 8.6 1-6.4 6 1.7 8.6L16 22.8l-7.6 4.3 1.7-8.6-6.4-6 8.6-1 3.7-8Z"
    />
  ),
  // 검문 ◈
  checkpoint: (
    <g {...STROKE}>
      <path d="M16 5 27 16 16 27 5 16Z" />
      <path d="M16 11.5 20.5 16 16 20.5 11.5 16Z" />
    </g>
  ),
  // 경유지 ◍
  nodeDot: (
    <g>
      <circle {...STROKE} cx="16" cy="16" r="10" />
      <circle {...FILL} cx="16" cy="16" r="4" />
    </g>
  ),
  // 최종 대면 ⚡
  bolt: <path {...STROKE} d="M18 3 6 19h7l-1 10L26 13h-7l3-10Z" />,
  // 합류 ⚑
  flag: <path {...STROKE} d="M8 27V5m0 1h14l-3.5 5L22 16H8" />,
  // 이동 →
  arrowRight: <path {...STROKE} d="M5 16h21m-7-7 7 7-7 7" />,
  // 이탈 ↗
  arrowUpRight: <path {...STROKE} d="M8 24 24 8m-12 0h12v12" />,
  // 완전 엄폐 ▣
  coverFull: (
    <g>
      <rect {...STROKE} x="6" y="6" width="20" height="20" rx="2" />
      <rect {...FILL} x="11" y="11" width="10" height="10" rx="1" />
    </g>
  ),
  // 부분 엄폐 ◧
  coverHalf: (
    <g>
      <rect {...STROKE} x="6" y="6" width="20" height="20" rx="2" />
      <path {...FILL} d="M7 7h9v18H7z" />
    </g>
  ),
  // 산성 지대 ☣ → droplet
  droplet: (
    <path {...STROKE} d="M16 4c5 6.5 8.5 10.8 8.5 15a8.5 8.5 0 0 1-17 0C7.5 14.8 11 10.5 16 4Z" />
  ),
  // 고지대 ▲
  triangle: <path {...STROKE} d="M16 6 28 26H4L16 6Z" />,
};

export function GameIcon({ name, className }: { name: GameIconName; className?: string }) {
  return (
    <svg
      className={className ? `gicon ${className}` : "gicon"}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
