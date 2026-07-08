import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type SurfaceVariant = "surface" | "outline" | "ghost";
export type SurfaceSize = 1 | 2 | 3;
export type SurfaceDensity = "comfortable" | "compact";

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  variant?: SurfaceVariant;
  size?: SurfaceSize;
  density?: SurfaceDensity;
  // DS2-d: render a semantic element instead of <div> (e.g. as="section" for the
  // onboarding landmark, as="details" for the later disclosure chips) while keeping
  // the same token-based container chrome. Container-primitive idiom (Radix asChild
  // / MUI component=).
  as?: ElementType;
  children?: ReactNode;
}

export function Surface({
  as: Tag = "div",
  variant = "surface",
  size = 2,
  density = "comfortable",
  className,
  children,
  // DS2-b: forward standard element attributes (id, style, onClick, data-*, aria-*,
  // role, …) so `.panel` sites that carry an id/handler migrate without the
  // primitive having to enumerate each one.
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
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
