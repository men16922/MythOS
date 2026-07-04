import { useState } from "react";
import { apiChooseBoon, apiInscribeEcho } from "./api";
import type { BoonCard, EchoInscription, RuntimeSnapshot } from "./types";
import { useLang } from "./i18n/lang";

const STAT_LABEL: Record<string, { ko: string; en: string }> = {
  strength: { ko: "근력", en: "STR" },
  agility: { ko: "민첩", en: "AGI" },
  perception: { ko: "지각", en: "PER" },
};

function statLine(stats: Record<string, number>, lang: "ko" | "en"): string {
  return Object.entries(stats)
    .map(([k, v]) => `${STAT_LABEL[k]?.[lang] ?? k} +${v}`)
    .join(" · ");
}

/**
 * In-run build pick. Shown as a blocking overlay whenever the snapshot carries a
 * pending boon offer (loop start + after each combat victory). Choosing one calls
 * the backend and hands the resulting snapshot back to the app's normal apply path.
 */
export function BoonOffer({
  snapshot,
  scenarioId,
  onChosen,
}: {
  snapshot: RuntimeSnapshot | null;
  scenarioId: string;
  onChosen: (next: RuntimeSnapshot) => void;
}) {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const boonOffer = snapshot?.boons?.offer;
  const echoOffer = snapshot?.boons?.echoOffer;
  // Boon pick takes priority; the Echo-inscription offer surfaces once boons are done.
  const mode: "boon" | "echo" | null =
    boonOffer && boonOffer.length > 0 ? "boon" : echoOffer && echoOffer.length > 0 ? "echo" : null;
  // A pending offer can outlive the run (e.g. an un-picked loop-start boon when a
  // boss combat ends the loop) — the backend rejects choices on ended loops, so
  // never block the ENDED screen with a dead offer.
  if (!mode || !snapshot || snapshot.phase === "ended") return null;

  const run = async (call: () => Promise<RuntimeSnapshot>) => {
    if (busy) return;
    setBusy(true);
    try {
      onChosen(await call());
    } finally {
      setBusy(false);
    }
  };

  const pickBoon = (boon: BoonCard) =>
    run(() => apiChooseBoon({ loop_id: snapshot.loop_id, scenario_id: scenarioId, boon_id: boon.id }));
  const inscribe = (echo: EchoInscription) =>
    run(() => apiInscribeEcho({ loop_id: snapshot.loop_id, scenario_id: scenarioId, echo_id: echo.id }));

  return (
    <div className="boon-overlay" role="dialog" aria-modal="true">
      <div className="boon-modal">
        <div className="boon-modal-head">{mode === "boon" ? t("boon.title") : t("echo.title")}</div>
        <div className="boon-modal-sub">{mode === "boon" ? t("boon.subtitle") : t("echo.subtitle")}</div>
        <div className="boon-cards">
          {mode === "boon"
            ? boonOffer!.map((boon) => (
                <button key={boon.id} type="button" className="boon-card" disabled={busy} onClick={() => pickBoon(boon)}>
                  <div className="boon-card-name">{boon.name}</div>
                  <div className="boon-card-stats">{statLine(boon.stats, lang)}</div>
                  <div className="boon-card-desc">{boon.desc}</div>
                </button>
              ))
            : echoOffer!.map((echo) => (
                <button key={echo.id} type="button" className="boon-card" disabled={busy} onClick={() => inscribe(echo)}>
                  <div className="boon-card-name">{echo.symbol || "◈"} {echo.effect || t("echo.card")}</div>
                  <div className="boon-card-stats">{statLine(echo.stats, lang)}</div>
                  <div className="boon-card-desc">{echo.desc || echo.text}</div>
                </button>
              ))}
        </div>
      </div>
    </div>
  );
}
