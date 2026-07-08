import { useEffect, useId, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

type PopoverAnchor = "bottom-left" | "top-right" | "top-center";

interface PopoverProps {
  as?: "span" | "div";
  className: string;
  anchor: PopoverAnchor;
  tooltip?: string;
  ariaLabel?: string;
  children: ReactNode;
}

// DS1b: the M3 axis chip / combat skill info / aside info-div sites each
// hand-rolled the same tap-toggle-with-hover-fallback shape (pointerdown-
// outside-close, aria-expanded). One shared primitive now backs all three.
export function Popover({ as = "span", className, anchor, tooltip, ariaLabel, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement & HTMLDivElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    setOpen((prev) => !prev);
  };

  const sharedClassName = `${className} popover-anchor popover-${anchor}${open ? " popover-open" : ""}`;
  const bubble = tooltip && (
    <span id={tooltipId} className="popover-tooltip" role="tooltip">
      {tooltip}
    </span>
  );

  if (as === "div") {
    return (
      <div
        ref={ref}
        className={sharedClassName}
        aria-label={ariaLabel}
        aria-expanded={tooltip ? open : undefined}
        aria-controls={tooltip ? tooltipId : undefined}
        onClick={tooltip ? handleClick : undefined}
      >
        {children}
        {bubble}
      </div>
    );
  }
  return (
    <span
      ref={ref}
      className={sharedClassName}
      aria-label={ariaLabel}
      aria-expanded={tooltip ? open : undefined}
      aria-controls={tooltip ? tooltipId : undefined}
      onClick={tooltip ? handleClick : undefined}
    >
      {children}
      {bubble}
    </span>
  );
}

// Passive hover-only detail (aria-describedby) for a control that is already
// interactive on its own (e.g. a button that acts on click) — no tap-toggle
// state, so it stays desktop-hover-only by design. Ships unused, matching the
// DS1a Surface precedent: this is the primitive a future human call would
// convert the remaining supplementary title= sites onto (CombatControls
// attack/item buttons, StoryPanel, HeaderBar) — DS1b itself only migrates the
// three tap-toggle sites onto Popover above.
export function Tooltip({ id, text }: { id: string; text: string }) {
  return (
    <span id={id} className="tooltip-bubble" role="tooltip">
      {text}
    </span>
  );
}
