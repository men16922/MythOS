import { useState } from "react";
import { useOrientation } from "./hooks/useOrientation";
import { useLang } from "./i18n/lang";

// LC0: nudge coarse-pointer (touch) players to rotate into landscape when
// combat starts in portrait (docs/plans/2026-07-08-design-system.md "Landscape
// Combat"). Desktop/mouse players never see it. Dismissible per mount; the
// actual landscape split layout is LC1/LC2, built on top of this signal.
export function RotateOverlay() {
  const { isLandscape, isCoarsePointer } = useOrientation();
  const { t } = useLang();
  const [dismissed, setDismissed] = useState(false);

  if (isLandscape || !isCoarsePointer || dismissed) return null;

  return (
    <div className="rotate-overlay" id="rotate-overlay" role="status">
      <span className="rotate-overlay-icon" aria-hidden="true">
        ⟳
      </span>
      <span className="rotate-overlay-text">{t("combat.rotate.prompt")}</span>
      <button
        type="button"
        className="rotate-overlay-dismiss"
        id="rotate-overlay-dismiss"
        onClick={() => setDismissed(true)}
      >
        {t("combat.rotate.dismiss")}
      </button>
    </div>
  );
}
