import type { ReactNode } from "react";

/**
 * Codex sections are collapsible so the mobile 도감 reads as a scannable table of
 * contents (tap a header to expand) instead of one long scroll. On a fine-pointer
 * desktop the sections default open; on coarse-pointer / small viewports they
 * default collapsed (see `isCoarseOrSmallViewport` in `viewport.ts`). The `open`
 * attribute is only the INITIAL state — React leaves the user's manual toggles
 * alone as long as `defaultOpen` stays stable per mount.
 */
interface CodexSectionProps {
  title: string;
  hint?: string;
  /** Item count shown as a pill on the header; omit for sections without a list. */
  count?: number;
  defaultOpen: boolean;
  className?: string;
  children: ReactNode;
}

export function CodexSection({
  title,
  hint,
  count,
  defaultOpen,
  className,
  children,
}: CodexSectionProps) {
  return (
    <details className={`codex-sec${className ? ` ${className}` : ""}`} open={defaultOpen}>
      <summary className="codex-sec-summary">
        <span className="codex-sec-title">{title}</span>
        {typeof count === "number" && <span className="codex-sec-count">{count}</span>}
        <span className="codex-sec-chevron" aria-hidden="true" />
      </summary>
      {hint && <div className="codex-section-hint">{hint}</div>}
      <div className="codex-sec-body">{children}</div>
    </details>
  );
}
