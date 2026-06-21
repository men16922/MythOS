import { useState } from "react";
import type { ResumeSessionData } from "./sessionStorage";
import type { ScenarioInfo } from "./types";

interface OnboardingPanelProps {
  displayName: string;
  selectedScenarioId: string;
  selectedArchetype: string | null;
  scenarios: ScenarioInfo[];
  isBusy: boolean;
  obStatus: string;
  resumeSessionData: ResumeSessionData | null;
  onDisplayNameChange: (value: string) => void;
  onScenarioChange: (value: string) => void;
  onArchetypeChange: (value: string) => void;
  onStartGame: () => void;
  onResumeGame: (data: ResumeSessionData) => void;
  onSimulateCombat: (encounterId: string, allyIds: string[]) => void;
}

export function OnboardingPanel({
  displayName,
  selectedScenarioId,
  selectedArchetype,
  scenarios,
  isBusy,
  obStatus,
  resumeSessionData,
  onDisplayNameChange,
  onScenarioChange,
  onArchetypeChange,
  onStartGame,
  onResumeGame,
  onSimulateCombat,
}: OnboardingPanelProps) {
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
      <h2>접속 단말 · 캐릭터 설정</h2>
      <div className="ob-row">
        <input
          type="text"
          id="display-name"
          name="display-name"
          placeholder="플레이어 이름"
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
              {s.unlocked === false ? " · 🔒 잠김" : ""}
            </option>
          ))}
        </select>
      </div>
      {scenario?.unlocked === false && scenario.unlock_hint && (
        <p className="ob-scenario-lock">🔒 {scenario.unlock_hint}</p>
      )}

      <p className="panel-title">아키타입</p>
      <div className="arch-grid" id="archetypes">
        {archetypes.map((archetype) => {
          const unlocked = archetype.unlocked !== false;
          return (
            <button
              type="button"
              key={archetype.name}
              className={`arch-card ${selectedArchetype === archetype.name ? "sel" : ""} ${
                unlocked ? "" : "locked"
              }`}
              disabled={!unlocked}
              onClick={() => onArchetypeChange(archetype.name)}
            >
              <div className="arch-name">{archetype.name}</div>
              <div className="arch-attrs">
                {(archetype.attributes || []).join(" ")}
              </div>
              {archetype.starting_item && (
                <div className="arch-item">소지품 · {archetype.starting_item}</div>
              )}
              {(archetype.base_skills || []).length > 0 && (
                <div className="arch-item">
                  기본 스킬 · {(archetype.base_skills || []).join(" / ")}
                </div>
              )}
              {!unlocked && (
                <div className="arch-lock">LOCKED · {archetype.unlock_hint || "진행도 필요"}</div>
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
          접속 · 루프 시작
        </button>
        {resumeSessionData && (
          <button
            disabled={isBusy}
            onClick={() => onResumeGame(resumeSessionData)}
            id="resume"
          >
            이어하기 · {resumeSessionData.playerId.slice(0, 14)}…
          </button>
        )}
        <span className="sub" id="ob-status">
          {obStatus}
        </span>
      </div>

      {encounters.length > 0 && (
        <details className="combat-sim" id="combat-simulator">
          <summary>⚔️ 전투 시뮬레이터 (개발용)</summary>
          <p className="sub">
            서사를 거치지 않고 선택한 조우로 바로 진입합니다. 전투/이펙트 점검용.
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
              <span className="sub">동료 참전:</span>
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
            ⚔️ 전투 시뮬레이션 진입
          </button>
        </details>
      )}
    </section>
  );
}
