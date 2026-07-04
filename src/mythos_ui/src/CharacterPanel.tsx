import { useState } from "react";

import {
  BadgeQuestionMark,
  Database,
  KeyRound,
  Package,
  Pill,
  Shield,
  Swords,
  Wrench,
} from "lucide-react";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";
import type { RuntimeSnapshot, ScenarioCharacter } from "./types";
import { detectSceneCharacter } from "./sceneCharacter";

type TFn = (key: StringKey) => string;

// Stat key → localized display name (neo-seoul flavored).
const STAT_NAME_KEYS: Record<string, StringKey> = {
  strength: "char.stat.strength",
  intelligence: "char.stat.intelligence",
  charisma: "char.stat.charisma",
  agility: "char.stat.agility",
  perception: "char.stat.perception",
};

// Display scale for stat bars. Raised 10→20 so in-run growth (boons/echo
// inscriptions stacking over a long run) stays visible on the scale instead of
// clamping at a full bar. Display-only — the backend has no stat cap.
const STAT_MAX = 20;
const ITEM_CATEGORY_ORDER = ["weapon", "armor", "consumable", "material", "key", "data", "item"];
const ITEM_CATEGORY_KEYS: Record<string, StringKey> = {
  weapon: "char.cat.weapon",
  armor: "char.cat.armor",
  consumable: "char.cat.consumable",
  material: "char.cat.material",
  key: "char.cat.key",
  data: "char.cat.data",
  item: "char.cat.item",
};
const SLOT_KEYS: Record<string, StringKey> = {
  weapon: "char.cat.weapon",
  armor: "char.cat.armor",
  accessory: "char.cat.accessory",
};
const KIND_KEYS: Record<string, StringKey> = {
  consumable: "char.cat.consumable",
  equipment: "char.cat.equipment",
  material: "char.cat.material",
  key: "char.cat.key",
  data: "char.cat.data",
  item: "char.cat.item",
};

interface CharacterPanelProps {
  snapshot: RuntimeSnapshot | null;
  characters?: ScenarioCharacter[];
  onEquip?: (itemId: string, equipped: boolean) => void;
}

// Shared stat-bar block (player card + CHARACTER-tab companion card): base
// fill plus the amber bonus overlay segment for run/growth bonuses.
export function StatBars({
  stats,
  bonus,
}: {
  stats: Record<string, unknown>;
  bonus?: Record<string, number> | null;
}) {
  const { t } = useLang();
  return (
    <div className="char-stats">
      {Object.entries(stats).map(([key, value]) => {
        const base = Number(value) || 0;
        const extra = Number(bonus?.[key]) || 0;
        return (
          <div key={key} className="char-stat">
            <div className="char-stat-head">
              <span className="k">{STAT_NAME_KEYS[key] ? t(STAT_NAME_KEYS[key]) : key}</span>
              <span className="v">
                {base}
                {extra > 0 ? <span className="stat-bonus"> +{extra}</span> : null} / {STAT_MAX}
              </span>
            </div>
            <div className="char-stat-bar">
              <div
                className="char-stat-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, (base / STAT_MAX) * 100))}%`,
                }}
              />
              {extra > 0 && (
                <div
                  className="char-stat-fill char-stat-fill--bonus"
                  style={{
                    left: `${Math.max(0, Math.min(100, (base / STAT_MAX) * 100))}%`,
                    width: `${Math.max(0, Math.min(100 - (base / STAT_MAX) * 100, (extra / STAT_MAX) * 100))}%`,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function statBonusLabel(stats: Record<string, number> | null | undefined, t: TFn): string {
  if (!stats) return "";
  return Object.entries(stats)
    .map(([k, v]) => `${STAT_NAME_KEYS[k] ? t(STAT_NAME_KEYS[k]) : k} +${v}`)
    .join(", ");
}

function itemCategory(item: { kind?: string; slot?: string | null }): string {
  if (item.kind === "equipment") {
    if (item.slot === "weapon" || item.slot === "armor") return item.slot;
    return "item";
  }
  return item.kind && ITEM_CATEGORY_KEYS[item.kind] ? item.kind : "item";
}

function ItemIcon({ category }: { category: string }) {
  const props = { size: 15, strokeWidth: 1.8, "aria-hidden": true };
  if (category === "weapon") return <Swords {...props} />;
  if (category === "armor") return <Shield {...props} />;
  if (category === "consumable") return <Pill {...props} />;
  if (category === "material") return <Wrench {...props} />;
  if (category === "key") return <KeyRound {...props} />;
  if (category === "data") return <Database {...props} />;
  if (category === "item") return <Package {...props} />;
  return <BadgeQuestionMark {...props} />;
}

/** Curated per-item icon art (items/<id>.png) with the glyph as fallback, so the
 * inventory reads like a classic RPG grid once the art set lands. */
function ItemArt({
  itemId,
  scenarioId,
  category,
}: {
  itemId: string;
  scenarioId: string;
  category: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken || !itemId) return <ItemIcon category={category} />;
  return (
    <img
      className="inv-item-art"
      src={`/resources/${scenarioId}/items/${itemId}.png`}
      alt=""
      draggable={false}
      onError={() => setBroken(true)}
    />
  );
}

export function CharacterPanel({ snapshot, characters, onEquip }: CharacterPanelProps) {
  const { t } = useLang();
  const partner = detectSceneCharacter(snapshot, characters);

  // 대화 상대가 장면에 있으면 그 인물의 portrait/정보를 보여준다.
  if (partner) {
    return (
      <div className="panel character-panel">
        <div className="panel-title">CHARACTER</div>
        {partner.portrait && (
          <div className="char-portrait-frame">
            <img src={partner.portrait} alt={partner.name} className="char-portrait" />
          </div>
        )}
        <div className="char-id">
          {partner.alias && <div className="char-alias">{partner.alias}</div>}
          <div className="char-name">{partner.name}</div>
          {partner.role && <div className="char-arch">{partner.role}</div>}
        </div>
      </div>
    );
  }

  // 주변에 다른 인물이 없으면 내 정보를 보여준다.
  const player = snapshot?.player;
  const traits = player?.traits ?? {};
  const archetype = (traits.archetype as string) || "Unclassified";
  const stats =
    traits.stats && typeof traits.stats === "object" ? traits.stats : {};
  // This-run boon/echo stat bonuses (combat-effective) so the screen shows base + bonus.
  const statBonus: Record<string, number> = snapshot?.boons?.statBonus ?? {};
  const attributes = Array.isArray(traits.attributes) ? traits.attributes : [];
  // Combat loot lands in loop.state._inventory and is resolved server-side into
  // snapshot.inventory; prefer that over the static traits.inventory.
  const inventory = snapshot?.inventory && snapshot.inventory.length > 0 ? snapshot.inventory : [];
  const inventoryGroups = ITEM_CATEGORY_ORDER.map((category) => ({
    category,
    items: inventory.filter((item) => itemCategory(item) === category),
  })).filter((group) => group.items.length > 0);
  const autonomy = traits.autonomy_level;
  const scenarioId =
    typeof snapshot?.state?.scenario_id === "string" ? snapshot.state.scenario_id : "neo-seoul";

  return (
    <div className="panel character-panel">
      <div className="panel-title">CHARACTER</div>

      <div className="char-portrait-frame">
        <img
          src={`/resources/${scenarioId}/characters/player-noise.png`}
          alt={player?.display_name || t("char.player")}
          className="char-portrait"
        />
      </div>

      <div className="char-id">
        <div className="char-name">{player?.display_name || "—"}</div>
        <div className="char-arch">
          {t("char.aptitude")} · {archetype}
          {typeof autonomy === "number" ? ` · ${t("char.autonomy")}${autonomy}` : ""}
        </div>
      </div>

      <div className="char-section-title">{t("char.stats")}</div>
      {Object.keys(stats).length > 0 ? (
        <StatBars stats={stats} bonus={statBonus} />
      ) : (
        <div className="char-empty">{t("char.noStats")}</div>
      )}

      {attributes.length > 0 && (
        <>
          <div className="char-section-title">{t("char.attributes")}</div>
          <div className="char-chips">
            {attributes.map((attr, idx) => (
              <span key={`${attr}-${idx}`} className="char-chip">
                {String(attr)}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="char-section-title">{t("char.inventory")} · {inventory.length}</div>
      {inventory.length > 0 ? (
        <div className="char-inventory">
          {inventoryGroups.map((group) => (
            <div key={group.category} className="inv-group">
              <div className="inv-group-title">{ITEM_CATEGORY_KEYS[group.category] ? t(ITEM_CATEGORY_KEYS[group.category]) : group.category}</div>
              <ul className="inv-group-list">
                {group.items.map((item, idx) => {
                  const category = itemCategory(item);
                  const bonus = statBonusLabel(item.stats, t);
                  const slotLabel = item.slot ? (SLOT_KEYS[item.slot] ? t(SLOT_KEYS[item.slot]) : item.slot) : t("char.cat.equipment");
                  return (
                    <li
                      key={`${item.id}-${idx}`}
                      className={`inv-item inv-${item.kind || "item"} inv-cat-${category}${
                        item.equipped ? " inv-equipped" : ""
                      }`}
                    >
                      <span className="inv-icon" title={ITEM_CATEGORY_KEYS[category] ? t(ITEM_CATEGORY_KEYS[category]) : category}>
                        <ItemArt itemId={item.id} scenarioId={scenarioId} category={category} />
                      </span>
                      <span className="inv-main">
                        <span className="inv-name-row">
                          <span className="inv-name">{item.name}</span>
                          {item.count > 1 && <span className="inv-count">×{item.count}</span>}
                        </span>
                        <span className="inv-meta">
                          {item.kind === "equipment"
                            ? `${slotLabel}${bonus ? ` · ${bonus}` : ""}`
                            : item.effect || (item.kind && KIND_KEYS[item.kind] ? t(KIND_KEYS[item.kind]) : t("char.owned"))}
                        </span>
                      </span>
                      {item.kind === "equipment" && onEquip && (
                        <button
                          type="button"
                          className={`inv-equip-btn${item.equipped ? " on" : ""}`}
                          onClick={() => onEquip(item.id, !item.equipped)}
                        >
                          {item.equipped ? t("char.unequip") : t("char.equip")}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="char-empty">{t("char.noItems")}</div>
      )}
    </div>
  );
}
