import { useState } from "react";
import { apiMarketExchange } from "./api";
import { GameIcon } from "./icons";
import type { MarketOffer, RuntimeSnapshot } from "./types";
import { useLang } from "./i18n/lang";

/**
 * Scrap→item exchange, shown as a compact docked card only while the player is
 * standing on a market route node (snapshot.market non-null). Non-blocking —
 * the story continues normally; trading is optional while the route lingers here.
 */
export function MarketExchange({
  snapshot,
  scenarioId,
  onExchanged,
}: {
  snapshot: RuntimeSnapshot | null;
  scenarioId: string;
  onExchanged: (next: RuntimeSnapshot) => void;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  // On touch/mobile the fixed dock floated over the narration ("물물 교환창이 메인
  // 대본을 가림"), so start collapsed there and let the player open it on demand;
  // desktop (fine pointer) keeps the dock open as before. Trading stays optional.
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return !window.matchMedia("(pointer: coarse)").matches;
  });
  const market = snapshot?.market;
  if (!market || !snapshot || snapshot.combat?.finished === false) return null;

  const trade = async (offer: MarketOffer) => {
    if (busy || !offer.affordable) return;
    setBusy(true);
    try {
      const next = await apiMarketExchange({
        loop_id: snapshot.loop_id,
        scenario_id: scenarioId,
        give: offer.give,
        get: offer.get,
      });
      onExchanged(next);
    } finally {
      setBusy(false);
    }
  };

  const heldScrap = Object.entries(market.held)
    .map(([, n]) => n)
    .reduce((a, b) => a + b, 0);

  const dockLabel = market.vendor ? `${market.vendor.name} · ${t("market.title")}` : t("market.title");

  if (!open) {
    return (
      <button type="button" className="market-launcher" onClick={() => setOpen(true)}>
        <GameIcon name="bag" /> {market.vendor ? market.vendor.name : t("market.title")}
      </button>
    );
  }

  return (
    <div className="market-dock">
      <div className="market-head">
        <span className="market-title">{dockLabel}</span>
        <span className="market-held">
          {market.offers[0]?.give_name}: {market.held[market.offers[0]?.give] ?? heldScrap}
        </span>
        <button
          type="button"
          className="market-close"
          onClick={() => setOpen(false)}
          aria-label={t("market.close")}
        >
          ✕
        </button>
      </div>
      <div className="market-offers">
        {market.offers.map((offer) => (
          <button
            key={`${offer.give}-${offer.get}`}
            type="button"
            className="market-offer"
            disabled={busy || !offer.affordable}
            onClick={() => trade(offer)}
          >
            <span className="mo-cost">
              {offer.give_name} ×{offer.count}
            </span>
            <span className="mo-arrow">→</span>
            <span className="mo-get">{offer.get_name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
