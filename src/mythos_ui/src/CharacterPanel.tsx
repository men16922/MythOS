import { useState } from "react";
import { Surface } from "./Surface";

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
// Raw item `effect` keywords (scenario.json consumables) → readable copy; the
// bare keyword ("stun") leaked into the inventory meta line (owner 2026-07-11).
const ITEM_EFFECT_KEYS: Record<string, StringKey> = {
  stun: "char.effect.stun",
  heal: "char.effect.heal",
  focus: "char.effect.focus",
  revive: "char.effect.revive",
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
  onEquip?: (itemId: string, equipped: boolean, wearer?: string) => void;
  /** Main story view renders the short card (portrait→stats→attributes); the
   * CHARACTER tab renders the full sheet with equipment slots + inventory. */
  compact?: boolean;
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

/** Equip/unequip with a wearer picker — companions in the party wear gear too.
 * `defaultWearer` pre-targets the picker (e.g. the companion currently focused
 * in the CHARACTER tab), so "give gear to a companion" is one click. */
function EquipControls({
  item,
  wearers,
  onEquip,
  t,
  defaultWearer,
}: {
  item: { id: string; equipped?: boolean; equipped_by?: string | null };
  wearers: { id: string; name: string }[];
  onEquip: (itemId: string, equipped: boolean, wearer?: string) => void;
  t: TFn;
  defaultWearer?: string;
}) {
  // Callers key this component by `defaultWearer`, so a target change remounts
  // it and the picker follows without an effect.
  const [wearer, setWearer] = useState(defaultWearer || "player");
  if (item.equipped) {
    const holderId = item.equipped_by || "player";
    const holder = wearers.find((w) => w.id === holderId);
    return (
      <span className="inv-equip-controls">
        {holderId !== "player" && (
          <span className="inv-worn-by">{holder?.name || holderId}</span>
        )}
        <button
          type="button"
          className="inv-equip-btn on"
          onClick={() => onEquip(item.id, false, holderId)}
        >
          {t("char.unequip")}
        </button>
      </span>
    );
  }
  return (
    <span className="inv-equip-controls">
      {wearers.length > 1 && (
        <select
          className="inv-wearer-select"
          value={wearer}
          onChange={(event) => setWearer(event.target.value)}
        >
          {wearers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="inv-equip-btn"
        onClick={() => onEquip(item.id, true, wearer)}
      >
        {t("char.equip")}
      </button>
    </span>
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

export function CharacterPanel({ snapshot, characters, onEquip, compact }: CharacterPanelProps) {
  const { t } = useLang();
  const partner = detectSceneCharacter(snapshot, characters);

  // 대화 상대가 장면에 있으면 그 인물의 portrait/정보를 보여준다.
  if (partner) {
    return (
      <Surface variant="surface" className="character-panel">
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
      </Surface>
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
  const autonomy = traits.autonomy_level;
  const scenarioId =
    typeof snapshot?.state?.scenario_id === "string" ? snapshot.state.scenario_id : "neo-seoul";
  // Inventory grid + wearer picker live in `InventoryPanel` (promoted to the
  // CHARACTER tab column, above the bond list); this card keeps the paper-doll
  // slots for the player's own worn gear.

  return (
    <Surface variant="surface" className="character-panel">
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

      {compact ? null : (
        <>
      {/* Always-visible equipment slots (one item per slot, RPG paper-doll style)
          so the equip system is discoverable even with an empty inventory. */}
      <div className="char-section-title">{t("char.equipmentSlots")}</div>
      <div className="equip-slots">
        {(["weapon", "armor"] as const).map((slot) => {
          const worn = inventory.find(
            (item) =>
              item.kind === "equipment" &&
              item.slot === slot &&
              item.equipped &&
              (!item.equipped_by || item.equipped_by === "player")
          );
          return (
            <div key={slot} className={`equip-slot${worn ? " filled" : ""}`}>
              <span className="equip-slot-icon">
                {worn ? (
                  <ItemArt itemId={worn.id} scenarioId={scenarioId} category={slot} />
                ) : (
                  <ItemIcon category={slot} />
                )}
              </span>
              <span className="equip-slot-main">
                <span className="equip-slot-label">
                  {SLOT_KEYS[slot] ? t(SLOT_KEYS[slot]) : slot}
                </span>
                <span className="equip-slot-value">
                  {worn
                    ? `${worn.name}${statBonusLabel(worn.stats, t) ? ` · ${statBonusLabel(worn.stats, t)}` : ""}`
                    : t("char.slotEmpty")}
                </span>
              </span>
              {worn && onEquip && (
                <button
                  type="button"
                  className="inv-equip-btn on"
                  onClick={() => onEquip(worn.id, false)}
                >
                  {t("char.unequip")}
                </button>
              )}
            </div>
          );
        })}
      </div>

        </>
      )}
    </Surface>
  );
}

/** Standalone inventory grid (extracted from the character card so the CHARACTER
 * tab can promote it above the bond list). `defaultWearer` pre-targets equip
 * controls at the focused companion. */
export function InventoryPanel({
  snapshot,
  onEquip,
  defaultWearer,
}: {
  snapshot: RuntimeSnapshot | null;
  onEquip?: (itemId: string, equipped: boolean, wearer?: string) => void;
  defaultWearer?: string;
}) {
  const { t } = useLang();
  const inventory = snapshot?.inventory && snapshot.inventory.length > 0 ? snapshot.inventory : [];
  const inventoryGroups = ITEM_CATEGORY_ORDER.map((category) => ({
    category,
    items: inventory.filter((item) => itemCategory(item) === category),
  })).filter((group) => group.items.length > 0);
  const scenarioId =
    typeof snapshot?.state?.scenario_id === "string" ? snapshot.state.scenario_id : "neo-seoul";
  const wearers = [
    { id: "player", name: snapshot?.player?.display_name || t("char.player") },
    ...(snapshot?.companions ?? [])
      .filter((companion) => companion.in_party)
      .map((companion) => ({ id: companion.id, name: companion.name })),
  ];

  return (
    <>
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
                            : (item.effect && ITEM_EFFECT_KEYS[item.effect] ? t(ITEM_EFFECT_KEYS[item.effect]) : item.effect) || (item.kind && KIND_KEYS[item.kind] ? t(KIND_KEYS[item.kind]) : t("char.owned"))}
                        </span>
                      </span>
                      {item.kind === "equipment" && onEquip && (
                        <EquipControls
                          key={defaultWearer || "player"}
                          item={item}
                          wearers={wearers}
                          onEquip={onEquip}
                          t={t}
                          defaultWearer={defaultWearer}
                        />
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
    </>
  );
}
