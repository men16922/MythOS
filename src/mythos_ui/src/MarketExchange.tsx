import { useState } from "react";
import { apiMarketExchange } from "./api";
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

  return (
    <div className="market-dock">
      <div className="market-head">
        {market.vendor ? `${market.vendor.name} · ${t("market.title")}` : t("market.title")}
        <span className="market-held">
          {market.offers[0]?.give_name}: {market.held[market.offers[0]?.give] ?? heldScrap}
        </span>
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
