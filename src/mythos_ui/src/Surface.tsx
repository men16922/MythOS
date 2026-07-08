import type { HTMLAttributes, ReactNode } from "react";

export type SurfaceVariant = "surface" | "outline" | "ghost";
export type SurfaceSize = 1 | 2 | 3;
export type SurfaceDensity = "comfortable" | "compact";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  size?: SurfaceSize;
  density?: SurfaceDensity;
  children?: ReactNode;
}

export function Surface({
  variant = "surface",
  size = 2,
  density = "comfortable",
  className,
  children,
  // DS2-b: forward standard div attributes (id, style, onClick, data-*, aria-*,
  // role, …) so `.panel` sites that carry an id/handler migrate onto Surface
  // without the primitive having to enumerate each one. Container-primitive idiom.
  ...rest
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
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
