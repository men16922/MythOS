import { CharacterPanel } from "./CharacterPanel";
import { GaugeBar } from "./GameAside";
import { buildAffectionGauges } from "./gauges";
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
  const affectionGauges = buildAffectionGauges(snapshot?.state?.relationships);
  return (
    <div id="character-tab-content">
      <div className="panel">
        <h2 className="tab-panel-title">CHARACTER</h2>
        <div className="character-tab-grid">
          <div className="codex-sec codex-character-sec">
            <CharacterPanel snapshot={snapshot ?? null} onEquip={onEquip} />
          </div>
          <div className="codex-sec">
            <div className="codex-sec-title">동료 관계도 (Bonds)</div>
            {affectionGauges.length > 0 ? (
              <div>
                {affectionGauges.map((gauge) => (
                  <GaugeBar
                    key={gauge.name}
                    label={gauge.label}
                    value={gauge.value}
                    percent={gauge.percent}
                    color={gauge.color}
                  />
                ))}
                <div className="gauge-hint">
                  관계도. 높을수록 특별한 장면·엔딩이 열립니다.
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--ink-dim)" }}>
                아직 형성된 관계가 없습니다. 동료와의 선택이 이 화면에 누적됩니다.
              </div>
            )}
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
