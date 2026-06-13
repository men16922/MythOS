import { CharacterPanel } from "./CharacterPanel";
import type { CodexLists } from "./viewModels";
import type { RuntimeSnapshot } from "./types";

interface CharacterTabPanelProps {
  codexLists: CodexLists;
  snapshot?: RuntimeSnapshot | null;
  onEquip?: (itemId: string, equipped: boolean) => void;
}

export function CharacterTabPanel({
  codexLists,
  snapshot,
  onEquip,
}: CharacterTabPanelProps) {
  return (
    <div id="character-tab-content">
      <div className="panel">
        <h2 className="tab-panel-title">CHARACTER</h2>
        <div className="character-tab-grid">
          <div className="codex-sec codex-character-sec">
            <CharacterPanel snapshot={snapshot ?? null} onEquip={onEquip} />
          </div>
          <div className="codex-sec">
            <div className="codex-sec-title">등장인물 (Characters)</div>
            <div className="codex-list">
              {codexLists.characters.length > 0 ? (
                codexLists.characters.map((character, idx) => (
                  <div className="codex-item" key={idx}>
                    <div className="codex-item-head">{character.symbol}</div>
                    <div className="codex-item-desc">{character.text}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--ink-dim)" }}>
                  기록된 인물이 없습니다. 대화에 등장한 인물은 이 화면에 누적됩니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
