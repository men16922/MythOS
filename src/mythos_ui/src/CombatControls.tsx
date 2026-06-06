import { enemyIntentLabel } from "./combatText";
import type { CombatAction, CombatState } from "./types";

interface CombatControlsProps {
  combat: CombatState;
  selectedTargetId: string | null;
  onSelectTarget: (targetId: string) => void;
  onAction: (action: CombatAction) => void;
  onReturnToMain: () => void;
  onContinue: () => void;
}

function outcomeLabel(outcome: string): string {
  if (outcome === "player_victory") return "승리";
  if (outcome === "player_fled") return "도주 성공";
  if (outcome === "player_defeat") return "패배";
  return outcome;
}

export function CombatControls({
  combat,
  selectedTargetId,
  onSelectTarget,
  onAction,
  onReturnToMain,
  onContinue,
}: CombatControlsProps) {
  if (combat.finished && combat.outcome) {
    return (
      <div id="combat-controls" className="active">
        <div className={`combat-outcome ${combat.outcome === "player_defeat" ? "lose" : ""}`}>
          교전 종료 — {outcomeLabel(combat.outcome)}
        </div>
        <div className="cc-row" style={{ marginTop: "10px" }}>
          {combat.outcome === "player_defeat" ? (
            <button className="cc-btn" onClick={onReturnToMain} id="cc-return-main">
              메인 화면으로 ▸
            </button>
          ) : (
            <button className="cc-btn" onClick={onContinue} id="cc-continue">
              계속 ▸
            </button>
          )}
        </div>
      </div>
    );
  }

  if (combat.finished) return null;

  const available = combat.available;
  return (
    <div id="combat-controls" className="active">
      <div className="combat-bar">
        <span className="turn">교전 · R{combat.radar?.round || 1}</span>
        <span className="focus">
          FOCUS {available?.focus ?? "—"}/{available?.max_focus ?? "—"}
        </span>
      </div>

      {!available?.can_act ? (
        <div className="cc-hint">상대 턴 진행 중…</div>
      ) : (
        <>
          {available.targets && available.targets.length > 0 && (
            <div className="cc-section">
              <div className="cc-label">표적</div>
              <div className="cc-row">
                {available.targets.map((target) => {
                  const intent = (combat.radar?.enemy_intents || []).find(
                    (item) => item.enemy_id === target.id
                  );
                  return (
                    <button
                      key={target.id}
                      className={`cc-btn tgt ${selectedTargetId === target.id ? "sel" : ""}`}
                      onClick={() => onSelectTarget(target.id)}
                    >
                      {target.name}
                      {enemyIntentLabel(intent)} · HP {target.hp}/{target.max_hp}
                      {!target.in_range && " · 사거리밖"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="cc-section">
            <div className="cc-label">행동</div>
            <div className="cc-row">
              <button
                className="cc-btn"
                onClick={() => onAction({ type: "attack", target_id: selectedTargetId || undefined })}
              >
                공격
              </button>
              <button className="cc-btn" onClick={() => onAction({ type: "defend" })}>
                방어
              </button>
              <button className="cc-btn" onClick={() => onAction({ type: "wait" })}>
                대기
              </button>
              <button className="cc-btn danger" onClick={() => onAction({ type: "flee" })}>
                도주
              </button>
            </div>
          </div>

          {available.skills && available.skills.length > 0 && (
            <div className="cc-section">
              <div className="cc-label">스킬</div>
              <div className="cc-row">
                {(() => {
                  const SKILL_NAMES: Record<string, { name: string; costStr?: string }> = {
                    signal_step: { name: "신호 도약", costStr: "◆2" },
                    overload_strike: { name: "과부하 일격", costStr: "◆2" },
                    packet_shot: { name: "패킷 사격", costStr: "◆2" },
                    covering_noise: { name: "엄호 노이즈", costStr: "◆2" },
                    patch_protocol: { name: "패치 프로토콜", costStr: "nanopatch" },
                  };
                  return available.skills.map((skill) => {
                    const onCooldown = skill.cooldown > 0;
                    const meta = SKILL_NAMES[skill.id] || { name: skill.id };
                    const costStr = meta.costStr ? ` (${meta.costStr})` : "";
                    return (
                      <button
                        key={skill.id}
                        className="cc-btn"
                        disabled={onCooldown}
                        onClick={() =>
                          onAction({
                            type: "skill",
                            skill_id: skill.id,
                            target_id: selectedTargetId || undefined,
                          })
                        }
                      >
                        {meta.name}
                        {costStr}
                        {onCooldown && ` (CD ${skill.cooldown})`}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          <div className="cc-hint">
            좌측 전술 보드에서 내 캐릭터를 끌어(drag) 밝게 표시된 칸에 놓으면(drop) 그 위치로 이동합니다.
          </div>
        </>
      )}
    </div>
  );
}
