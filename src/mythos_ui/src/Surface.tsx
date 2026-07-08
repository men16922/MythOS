import type { CSSProperties, ReactNode } from "react";

export type SurfaceVariant = "surface" | "outline" | "ghost";
export type SurfaceSize = 1 | 2 | 3;
export type SurfaceDensity = "comfortable" | "compact";

interface SurfaceProps {
  variant?: SurfaceVariant;
  size?: SurfaceSize;
  density?: SurfaceDensity;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Surface({
  variant = "surface",
  size = 2,
  density = "comfortable",
  className,
  style,
  children,
}: SurfaceProps) {
  const classes = [
    "surface",
    `surface-${variant}`,
    `surface-size-${size}`,
    `surface-density-${density}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
