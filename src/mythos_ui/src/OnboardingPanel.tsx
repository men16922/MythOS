import { useState } from "react";
import type { ResumeSessionData } from "./sessionStorage";
import type { ScenarioInfo } from "./types";
import { useLang } from "./i18n/lang";

interface OnboardingPanelProps {
  displayName: string;
  selectedScenarioId: string;
  selectedArchetype: string | null;
  scenarios: ScenarioInfo[];
  isBusy: boolean;
  obStatus: string;
  resumeSessionData: ResumeSessionData | null;
  hasSaves: boolean;
  onDisplayNameChange: (value: string) => void;
  onScenarioChange: (value: string) => void;
  onArchetypeChange: (value: string) => void;
  onStartGame: () => void;
  onResumeGame: (data: ResumeSessionData) => void;
  onOpenLoad: () => void;
  onSimulateCombat: (encounterId: string, allyIds: string[]) => void;
  // The combat simulator creates a REAL loop per run — on gated (CBT) installs
  // only admins may see it, so testers can't silently burn their loop cap from
  // the boot screen (triage decision 2026-07-05). Open/local installs keep it.
  showCombatSim: boolean;
}

export function OnboardingPanel({
  displayName,
  selectedScenarioId,
  selectedArchetype,
  scenarios,
  isBusy,
  obStatus,
  resumeSessionData,
  hasSaves,
  onDisplayNameChange,
  onScenarioChange,
  onArchetypeChange,
  onStartGame,
  onResumeGame,
  onOpenLoad,
  onSimulateCombat,
  showCombatSim,
}: OnboardingPanelProps) {
  const { t } = useLang();
  const scenario = scenarios.find((s) => s.id === selectedScenarioId);
  const archetypes = scenario?.archetypes || [];
  const encounters = scenario?.encounters || [];
  const allies = scenario?.allies || [];

  const [simEncounter, setSimEncounter] = useState("");
  const [simAllies, setSimAllies] = useState<string[]>([]);

  // Derive valid selections instead of resetting via an effect, so switching
  // scenarios (and thus encounter/ally pools) can't leave a stale choice.
  const effectiveEncounter = encounters.some((e) => e.id === simEncounter)
    ? simEncounter
    : encounters[0]?.id || "";
  const effectiveAllies = simAllies.filter((id) => allies.some((a) => a.id === id));

  const toggleSimAlly = (id: string) => {
    setSimAllies((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <section className="panel" id="onboarding">
      <h2>{t("ob.title")}</h2>
      <div className="ob-row">
        <input
          type="text"
          id="display-name"
          name="display-name"
          placeholder={t("ob.namePlaceholder")}
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
        />
        <select
          id="scenario-select"
          value={selectedScenarioId}
          onChange={(e) => onScenarioChange(e.target.value)}
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id} disabled={s.unlocked === false}>
              {s.name}
              {s.unlocked === false ? ` · 🔒 ${t("ob.locked")}` : ""}
            </option>
          ))}
        </select>
      </div>
      {scenario?.unlocked === false && scenario.unlock_hint && (
        <p className="ob-scenario-lock">🔒 {scenario.unlock_hint}</p>
      )}

      <p className="panel-title">{t("ob.archetypes")}</p>
      <div className="arch-grid" id="archetypes">
        {archetypes.map((archetype) => {
          const unlocked = archetype.unlocked !== false;
          return (
            <button
              type="button"
              key={archetype.id}
              className={`arch-card ${selectedArchetype === archetype.id ? "sel" : ""} ${
                unlocked ? "" : "locked"
              }`}
              disabled={!unlocked}
              onClick={() => onArchetypeChange(archetype.id)}
            >
              <div className="arch-name">{archetype.name}</div>
              <div className="arch-attrs">
                {(archetype.attributes || []).join(" ")}
              </div>
              {archetype.starting_item && (
                <div className="arch-item">{t("ob.item")} · {archetype.starting_item}</div>
              )}
              {(archetype.base_skills || []).length > 0 && (
                <div className="arch-item">
                  {t("ob.baseSkills")} · {(archetype.base_skills || []).join(" / ")}
                </div>
              )}
              {!unlocked && (
                <div className="arch-lock">LOCKED · {archetype.unlock_hint || t("ob.needProgress")}</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="ob-actions">
        <button
          disabled={isBusy || !selectedArchetype || scenario?.unlocked === false}
          onClick={onStartGame}
          id="start"
        >
          {t("ob.start")}
        </button>
        {resumeSessionData && (
          <button
            disabled={isBusy}
            onClick={() => onResumeGame(resumeSessionData)}
            id="resume"
          >
            {t("ob.resume")} · {resumeSessionData.playerId.slice(0, 14)}…
          </button>
        )}
        {hasSaves && (
          <button disabled={isBusy} onClick={onOpenLoad} id="ob-load-btn">
            {t("sl.loadBtn")}
          </button>
        )}
        <span className="sub" id="ob-status">
          {obStatus}
        </span>
      </div>

      {showCombatSim && encounters.length > 0 && (
        <details className="combat-sim" id="combat-simulator">
          <summary>{t("ob.simSummary")}</summary>
          <p className="sub">
            {t("ob.simDesc")}
          </p>
          <div className="ob-row">
            <select
              id="sim-encounter"
              value={effectiveEncounter}
              onChange={(e) => setSimEncounter(e.target.value)}
            >
              {encounters.map((enc) => (
                <option key={enc.id} value={enc.id}>
                  {enc.name} ({enc.id})
                </option>
              ))}
            </select>
          </div>
          {allies.length > 0 && (
            <div className="sim-allies">
              <span className="sub">{t("ob.simAllies")}</span>
              {allies.map((ally) => (
                <label key={ally.id} className="sim-ally">
                  <input
                    type="checkbox"
                    checked={simAllies.includes(ally.id)}
                    onChange={() => toggleSimAlly(ally.id)}
                  />
                  {ally.name}
                </label>
              ))}
            </div>
          )}
          <button
            id="sim-start"
            disabled={isBusy || !effectiveEncounter}
            onClick={() => onSimulateCombat(effectiveEncounter, effectiveAllies)}
          >
            {t("ob.simStart")}
          </button>
        </details>
      )}
    </section>
  );
}
