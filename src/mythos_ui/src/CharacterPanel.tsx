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
import type { RuntimeSnapshot, ScenarioCharacter } from "./types";

// 스탯 키 → 한글 표기 (Streamlit Codex 캐릭터 뷰와 일치)
const STAT_NAMES: Record<string, string> = {
  strength: "근력",
  intelligence: "연산",
  charisma: "공명",
  agility: "반사",
  perception: "관측",
};

const STAT_MAX = 10;
const ITEM_CATEGORY_ORDER = ["weapon", "armor", "consumable", "material", "key", "data", "item"];
const ITEM_CATEGORY_LABELS: Record<string, string> = {
  weapon: "무기",
  armor: "방어구",
  consumable: "소모품",
  material: "재료",
  key: "키",
  data: "데이터",
  item: "기타",
};
const SLOT_LABELS: Record<string, string> = {
  weapon: "무기",
  armor: "방어구",
  accessory: "장신구",
};
const KIND_LABELS: Record<string, string> = {
  consumable: "소모품",
  equipment: "장비",
  material: "재료",
  key: "키",
  data: "데이터",
  item: "기타",
};

interface CharacterPanelProps {
  snapshot: RuntimeSnapshot | null;
  characters?: ScenarioCharacter[];
  onEquip?: (itemId: string, equipped: boolean) => void;
}

// 현재 장면에 등장한 대화 상대를 키워드로 탐지한다 (Streamlit _scene_characters와 동일 규칙).
function detectSceneCharacter(
  snapshot: RuntimeSnapshot | null,
  characters?: ScenarioCharacter[]
): ScenarioCharacter | null {
  if (!characters || characters.length === 0) return null;
  const scene = snapshot?.active_scene;
  if (!scene) return null;
  const haystack = `${scene.title} ${scene.location} ${scene.narration} ${
    scene.visual_brief || ""
  }`.toLowerCase();
  for (const character of characters) {
    if (!character.portrait) continue;
    if (character.keywords.some((kw) => kw && haystack.includes(kw.toLowerCase()))) {
      return character;
    }
  }
  return null;
}

function statBonusLabel(stats?: Record<string, number> | null): string {
  if (!stats) return "";
  return Object.entries(stats)
    .map(([k, v]) => `${STAT_NAMES[k] || k} +${v}`)
    .join(", ");
}

function itemCategory(item: { kind?: string; slot?: string | null }): string {
  if (item.kind === "equipment") {
    if (item.slot === "weapon" || item.slot === "armor") return item.slot;
    return "item";
  }
  return item.kind && ITEM_CATEGORY_LABELS[item.kind] ? item.kind : "item";
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

export function CharacterPanel({ snapshot, characters, onEquip }: CharacterPanelProps) {
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
  const attributes = Array.isArray(traits.attributes) ? traits.attributes : [];
  // Combat loot lands in loop.state._inventory and is resolved server-side into
  // snapshot.inventory; prefer that over the static traits.inventory.
  const inventory = snapshot?.inventory && snapshot.inventory.length > 0 ? snapshot.inventory : [];
  const inventoryGroups = ITEM_CATEGORY_ORDER.map((category) => ({
    category,
    items: inventory.filter((item) => itemCategory(item) === category),
  })).filter((group) => group.items.length > 0);
  const autonomy = traits.autonomy_level;

  return (
    <div className="panel character-panel">
      <div className="panel-title">CHARACTER</div>

      <div className="char-id">
        <div className="char-name">{player?.display_name || "—"}</div>
        <div className="char-arch">
          소질 · {archetype}
          {typeof autonomy === "number" ? ` · 자율성 LV${autonomy}` : ""}
        </div>
      </div>

      <div className="char-section-title">스탯</div>
      {Object.keys(stats).length > 0 ? (
        <div className="char-stats">
          {Object.entries(stats).map(([key, value]) => {
            const v = Number(value) || 0;
            return (
              <div key={key} className="char-stat">
                <div className="char-stat-head">
                  <span className="k">{STAT_NAMES[key] || key}</span>
                  <span className="v">
                    {v} / {STAT_MAX}
                  </span>
                </div>
                <div className="char-stat-bar">
                  <div
                    className="char-stat-fill"
                    style={{
                      width: `${Math.max(0, Math.min(100, (v / STAT_MAX) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="char-empty">저장된 스탯이 없습니다.</div>
      )}

      {attributes.length > 0 && (
        <>
          <div className="char-section-title">속성</div>
          <div className="char-chips">
            {attributes.map((attr, idx) => (
              <span key={`${attr}-${idx}`} className="char-chip">
                {String(attr)}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="char-section-title">인벤토리 · {inventory.length}</div>
      {inventory.length > 0 ? (
        <div className="char-inventory">
          {inventoryGroups.map((group) => (
            <div key={group.category} className="inv-group">
              <div className="inv-group-title">{ITEM_CATEGORY_LABELS[group.category]}</div>
              <ul className="inv-group-list">
                {group.items.map((item, idx) => {
                  const category = itemCategory(item);
                  const bonus = statBonusLabel(item.stats);
                  const slotLabel = item.slot ? SLOT_LABELS[item.slot] || item.slot : "장비";
                  return (
                    <li
                      key={`${item.id}-${idx}`}
                      className={`inv-item inv-${item.kind || "item"} inv-cat-${category}${
                        item.equipped ? " inv-equipped" : ""
                      }`}
                    >
                      <span className="inv-icon" title={ITEM_CATEGORY_LABELS[category]}>
                        <ItemIcon category={category} />
                      </span>
                      <span className="inv-main">
                        <span className="inv-name-row">
                          <span className="inv-name">{item.name}</span>
                          {item.count > 1 && <span className="inv-count">×{item.count}</span>}
                        </span>
                        <span className="inv-meta">
                          {item.kind === "equipment"
                            ? `${slotLabel}${bonus ? ` · ${bonus}` : ""}`
                            : item.effect || KIND_LABELS[item.kind] || "보유품"}
                        </span>
                      </span>
                      {item.kind === "equipment" && onEquip && (
                        <button
                          type="button"
                          className={`inv-equip-btn${item.equipped ? " on" : ""}`}
                          onClick={() => onEquip(item.id, !item.equipped)}
                        >
                          {item.equipped ? "해제" : "착용"}
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
        <div className="char-empty">보유한 물품이 없습니다.</div>
      )}
    </div>
  );
}
