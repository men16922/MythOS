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

interface CharacterPanelProps {
  snapshot: RuntimeSnapshot | null;
  characters?: ScenarioCharacter[];
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

export function CharacterPanel({ snapshot, characters }: CharacterPanelProps) {
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
        <ul className="char-inventory">
          {inventory.map((item, idx) => (
            <li key={`${item.id}-${idx}`} className={`inv-item inv-${item.kind}`}>
              <span className="inv-name">{item.name}</span>
              {item.count > 1 && <span className="inv-count">×{item.count}</span>}
              {item.kind === "consumable" && <span className="inv-tag">소모품</span>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="char-empty">보유한 물품이 없습니다.</div>
      )}
    </div>
  );
}
