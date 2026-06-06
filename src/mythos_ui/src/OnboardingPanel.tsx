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
}: OnboardingPanelProps) {
  const archetypes =
    scenarios.find((scenario) => scenario.id === selectedScenarioId)?.archetypes || [];

  return (
    <section className="panel" id="onboarding">
      <h2>접속 단말 · 캐릭터 설정</h2>
      <div className="ob-row">
        <input
          type="text"
          id="display-name"
          placeholder="플레이어 이름"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
        />
        <select
          id="scenario-select"
          value={selectedScenarioId}
          onChange={(e) => onScenarioChange(e.target.value)}
        >
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>

      <p className="panel-title">아키타입</p>
      <div className="arch-grid" id="archetypes">
        {archetypes.map((archetype) => (
          <div
            key={archetype.name}
            className={`arch-card ${
              selectedArchetype === archetype.name ? "sel" : ""
            }`}
            onClick={() => onArchetypeChange(archetype.name)}
          >
            <div className="arch-name">{archetype.name}</div>
            <div className="arch-attrs">
              {(archetype.attributes || []).join(" ")}
            </div>
            {archetype.starting_item && (
              <div className="arch-item">소지품 · {archetype.starting_item}</div>
            )}
          </div>
        ))}
      </div>

      <div className="ob-actions">
        <button disabled={isBusy} onClick={onStartGame} id="start">
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
    </section>
  );
}
