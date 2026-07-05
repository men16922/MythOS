import { useState } from "react";
import { CharacterPanel, InventoryPanel, StatBars } from "./CharacterPanel";
import { GaugeBar } from "./GameAside";
import { buildAffectionGauges } from "./gauges";
import { useLang } from "./i18n/lang";
import type { CodexLists } from "./viewModels";
import type { CompanionSheet, RuntimeSnapshot } from "./types";

interface CharacterTabPanelProps {
  codexLists: CodexLists;
  snapshot?: RuntimeSnapshot | null;
  onEquip?: (itemId: string, equipped: boolean, wearer?: string) => void;
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
  const { t, lang } = useLang();
  const partyCompanions = (snapshot?.companions || [])
    .filter((companion) => companion.in_party)
    .map((companion) => companion.id);
  const affectionGauges = buildAffectionGauges(
    snapshot?.state?.relationships,
    partyCompanions,
  );
  const scenarioId = snapshot?.state?.scenario_id || "neo-seoul";
  // Companion focus: clicking a bond row swaps the left CHARACTER card to that
  // companion's portrait; clicking again (or the back button) returns to the player.
  const [selected, setSelected] = useState<string | null>(null);
  const selectedGauge = affectionGauges.find((g) => g.name === selected) || null;
  // Growth-folded sheet from the snapshot (base stats + amber bonuses + skills);
  // falls back to the bare portrait card when the roster lacks the companion.
  const sheet: CompanionSheet | null =
    (selected && snapshot?.companions?.find((c) => c.id === selected)) || null;

  return (
    <div id="character-tab-content">
      <div className="panel">
        <h2 className="tab-panel-title">CHARACTER</h2>
        <div className="character-tab-grid">
          <div className="codex-sec codex-character-sec">
            {selectedGauge ? (
              <div className="panel character-panel companion-card">
                <button
                  type="button"
                  className="companion-back"
                  onClick={() => setSelected(null)}
                >
                  ← {t("ctab.backToPlayer")}
                </button>
                <div className="char-portrait-frame">
                  <img
                    className="char-portrait"
                    src={
                      sheet?.image
                        ? `/resources/${scenarioId}/${sheet.image}`
                        : getAvatarUrl(selectedGauge.name, scenarioId)
                    }
                    alt={sheet?.name || selectedGauge.label}
                  />
                </div>
                <div className="char-id">
                  {sheet?.alias && <div className="char-alias">{sheet.alias}</div>}
                  <div className="char-name">{sheet?.name || selectedGauge.label}</div>
                  <div className="char-arch">
                    {t("ctab.bondTier")} {sheet?.bond_tier ?? 0} · {t("ctab.bonds")} ·{" "}
                    {sheet?.affection ?? selectedGauge.value}
                    {sheet?.in_party ? ` · ${t("ctab.inParty")}` : ""}
                  </div>
                </div>
                {sheet && (
                  <>
                    <div className="companion-bond-line">
                      HP {sheet.hp} / {sheet.max_hp}
                    </div>
                    <div className="char-section-title">{t("char.stats")}</div>
                    <StatBars stats={sheet.stats} bonus={sheet.stat_bonus} />
                    {/* Gear this companion is wearing — unequip here; equipping
                        happens in the inventory column (pre-targeted at this
                        companion while their card is focused). */}
                    <div className="char-section-title">{t("ctab.companionGear")}</div>
                    {(() => {
                      const worn = (snapshot?.inventory || []).filter(
                        (item) => item.equipped && item.equipped_by === sheet.id
                      );
                      if (worn.length === 0) {
                        return (
                          <div className="char-empty">
                            {sheet.in_party
                              ? t("ctab.companionGearHint")
                              : t("ctab.companionGearNotInParty")}
                          </div>
                        );
                      }
                      return (
                        <ul className="inv-group-list">
                          {worn.map((item) => (
                            <li key={item.id} className="inv-item inv-equipped">
                              <span className="inv-main">
                                <span className="inv-name">{item.name}</span>
                              </span>
                              {onEquip && (
                                <button
                                  type="button"
                                  className="inv-equip-btn on"
                                  onClick={() => onEquip(item.id, false, sheet.id)}
                                >
                                  {t("char.unequip")}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                    {sheet.skills.length > 0 && (
                      <>
                        <div className="char-section-title">{t("ctab.skills")}</div>
                        <div className="char-chips">
                          {sheet.skills.map((skill) => (
                            <span key={skill.id} className="char-chip">
                              {skill.name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {sheet.upgrades.length > 0 && (
                      <>
                        <div className="char-section-title">{t("ctab.growth")}</div>
                        <div className="char-chips">
                          {sheet.upgrades.map((upgrade) => (
                            <span key={upgrade.id} className="char-chip">
                              {lang === "en" ? upgrade.name_en : upgrade.name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
              <CharacterPanel snapshot={snapshot ?? null} onEquip={onEquip} />
            )}
          </div>
          <div className="codex-sec">
            {/* Inventory promoted ABOVE the bond list (user request 2026-07-05):
                equipping is the tab's main verb. While a party companion's card
                is focused, equip controls pre-target that companion. */}
            <InventoryPanel
              snapshot={snapshot ?? null}
              onEquip={onEquip}
              defaultWearer={sheet?.in_party ? sheet.id : "player"}
            />
            <div className="codex-sec-title" style={{ marginTop: "16px" }}>{t("ctab.bonds")}</div>
            {affectionGauges.length > 0 ? (
              <div>
                {affectionGauges.map((gauge) => {
                  const companion = snapshot?.companions?.find(
                    (item) => item.id === gauge.name,
                  );
                  return (
                  <div
                    key={gauge.name}
                    className={`bond-row ${selected === gauge.name ? "bond-row--selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSelected(selected === gauge.name ? null : gauge.name)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelected(selected === gauge.name ? null : gauge.name);
                      }
                    }}
                  >
                    <GaugeBar
                      label={`${gauge.label}${companion?.in_party ? ` · ${t("ctab.inParty")}` : ""}`}
                      value={gauge.value}
                      percent={gauge.percent}
                      color={gauge.color}
                      avatarUrl={getAvatarUrl(gauge.name, scenarioId)}
                    />
                  </div>
                  );
                })}
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
