import { CharacterPanel } from "./CharacterPanel";
import { GaugeBar } from "./GameAside";
import { buildAffectionGauges } from "./gauges";
import { useLang } from "./i18n/lang";
import type { CodexLists } from "./viewModels";
import type { RuntimeSnapshot } from "./types";

interface CharacterTabPanelProps {
  codexLists: CodexLists;
  snapshot?: RuntimeSnapshot | null;
  onEquip?: (itemId: string, equipped: boolean) => void;
}

function getAvatarUrl(name: string, scenarioId?: string): string | undefined {
  if (!scenarioId) return undefined;
  let filename = name.replace(/_/g, "-");
  if (filename === "su-a") {
    filename = "su-ah";
  }
  return `/resources/${scenarioId}/characters/${filename}.png`;
}

export function CharacterTabPanel({
  codexLists,
  snapshot,
  onEquip,
}: CharacterTabPanelProps) {
  const { t } = useLang();
  const affectionGauges = buildAffectionGauges(snapshot?.state?.relationships);
  const scenarioId = snapshot?.state?.scenario_id || "neo-seoul";

  return (
    <div id="character-tab-content">
      <div className="panel">
        <h2 className="tab-panel-title">CHARACTER</h2>
        <div className="character-tab-grid">
          <div className="codex-sec codex-character-sec">
            <CharacterPanel snapshot={snapshot ?? null} onEquip={onEquip} />
          </div>
          <div className="codex-sec">
            <div className="codex-sec-title">{t("ctab.bonds")}</div>
            {affectionGauges.length > 0 ? (
              <div>
                {affectionGauges.map((gauge) => (
                  <GaugeBar
                    key={gauge.name}
                    label={gauge.label}
                    value={gauge.value}
                    percent={gauge.percent}
                    color={gauge.color}
                    avatarUrl={getAvatarUrl(gauge.name, scenarioId)}
                  />
                ))}
                <div className="gauge-hint">
                  {t("ctab.bondHint")}
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--ink-dim)" }}>
                {t("ctab.noBonds")}
              </div>
            )}
          </div>
          <div className="codex-sec">
            <div className="codex-sec-title">{t("ctab.characters")}</div>
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
                  {t("ctab.noChars")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
