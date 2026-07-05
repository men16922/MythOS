import { useState } from "react";
import type { RuntimeSnapshot } from "./types";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";

interface CombatInterstitialProps {
  snapshot: RuntimeSnapshot | null;
}

const KIND_TITLE_KEYS: Record<string, StringKey> = {
  route: "combat.interstitial.title.route",
  boss: "combat.interstitial.title.boss",
  ambient: "combat.interstitial.title.ambient",
};

// 1-beat combat-entry transition (CBT feedback #1 "combat jump-scare"): when the
// server stages `_combat_interstitial` alongside a freshly begun fight, hold the
// tactical board behind a click-through beat — encounter name / place / authored
// hook line — so the fight announces itself instead of ambushing by UI.
export function CombatInterstitial({ snapshot }: CombatInterstitialProps) {
  const { t } = useLang();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const combat = snapshot?.combat;
  const beat = snapshot?.state?._combat_interstitial;
  if (!combat || combat.finished || !beat?.encounter) return null;
  const beatKey = `${snapshot?.loop_id ?? ""}:${beat.encounter}`;
  if (beatKey === dismissedKey) return null;

  const kind = beat.kind && KIND_TITLE_KEYS[beat.kind] ? beat.kind : "ambient";
  return (
    <div className="combat-interstitial-backdrop" id="combat-interstitial">
      <div className={`combat-interstitial kind-${kind}`}>
        <div className="ci-kind">{t(KIND_TITLE_KEYS[kind])}</div>
        {beat.name && <h2 className="ci-name">{beat.name}</h2>}
        {beat.location && <div className="ci-location">{beat.location}</div>}
        <p className="ci-line">{beat.line || t("combat.interstitial.line.default")}</p>
        {(beat.joining?.length ?? 0) > 0 && (
          <div className="ci-joining">
            ⚑ {t("combat.interstitial.joining")}:{" "}
            {(beat.joining ?? []).map((ally) => ally.name || ally.id).join(" · ")}
          </div>
        )}
        <button id="ci-begin" className="ci-begin" onClick={() => setDismissedKey(beatKey)}>
          {t("combat.interstitial.begin")}
        </button>
      </div>
    </div>
  );
}
