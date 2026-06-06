import { useState } from "react";
import { enemyIntentLabel } from "./combatText";
import type { CombatAction, CombatSkillInfo, CombatState } from "./types";

interface CombatControlsProps {
  combat: CombatState;
  scenarioId: string;
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

// Human-readable item labels for skill costs (e.g. patch_protocol -> nanopatch).
const ITEM_LABELS: Record<string, string> = {
  nanopatch: "나노패치",
};

/** Render a skill's cost dict as compact badges, e.g. {focus:2} -> "◆2". */
function formatCost(cost?: Record<string, number | string>): string {
  if (!cost) return "";
  const parts: string[] = [];
  if (cost.focus != null) parts.push(`◆${cost.focus}`);
  if (cost.item != null) parts.push(`▣${ITEM_LABELS[String(cost.item)] ?? cost.item}`);
  for (const [key, value] of Object.entries(cost)) {
    if (key === "focus" || key === "item") continue;
    parts.push(`${key} ${value}`);
  }
  return parts.join(" ");
}

const ROLE_LABELS: Record<string, string> = {
  damage: "공격",
  mobility: "기동",
  defense: "방어",
  healing: "회복",
  support: "지원",
};

export function CombatControls({
  combat,
  scenarioId,
  selectedTargetId,
  onSelectTarget,
  onAction,
  onReturnToMain,
  onContinue,
}: CombatControlsProps) {
  const [iconError, setIconError] = useState<Record<string, boolean>>({});

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
  const focus = available?.focus ?? null;

  const renderSkill = (skill: CombatSkillInfo) => {
    const onCooldown = skill.cooldown > 0;
    const name = skill.name || skill.id;
    const focusCost = typeof skill.cost?.focus === "number" ? skill.cost.focus : 0;
    const lowFocus = focus != null && focusCost > focus;
    const disabled = onCooldown || lowFocus;
    const costStr = formatCost(skill.cost);
    const roleLabel = skill.role ? ROLE_LABELS[skill.role] ?? skill.role : "";
    const iconSrc = `/resources/${scenarioId}/skills/${skill.id}.png`;

    const tooltipParts = [name];
    if (roleLabel) tooltipParts.push(roleLabel);
    if (skill.range != null) tooltipParts.push(`사거리 ${skill.range}`);
    if (costStr) tooltipParts.push(`코스트 ${costStr}`);
    if (onCooldown) tooltipParts.push(`재사용 ${skill.cooldown}T`);
    else if (lowFocus) tooltipParts.push("FOCUS 부족");
    const tags = (skill.tags || []).join(" · ");
    const tooltip = tooltipParts.join(" · ") + (tags ? `\n${tags}` : "");

    return (
      <button
        key={skill.id}
        className={`cc-skill ${skill.role ? `role-${skill.role}` : ""} ${
          lowFocus && !onCooldown ? "low-focus" : ""
        }`}
        disabled={disabled}
        title={tooltip}
        onClick={() =>
          onAction({
            type: "skill",
            skill_id: skill.id,
            target_id: selectedTargetId || undefined,
          })
        }
      >
        <span className="cc-skill-icon">
          {iconError[skill.id] ? (
            <span className="cc-skill-glyph">{roleLabel.slice(0, 1) || "✦"}</span>
          ) : (
            <img
              src={iconSrc}
              alt={name}
              onError={() => setIconError((prev) => ({ ...prev, [skill.id]: true }))}
            />
          )}
          {onCooldown && <span className="cc-cd-overlay">CD {skill.cooldown}</span>}
        </span>
        <span className="cc-skill-name">{name}</span>
        <span className="cc-skill-badges">
          {costStr && <span className="cc-badge cost">{costStr}</span>}
          {skill.range != null && <span className="cc-badge range">⌖{skill.range}</span>}
        </span>
      </button>
    );
  };

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
                ⚔ 공격
              </button>
              <button className="cc-btn" onClick={() => onAction({ type: "defend" })}>
                🛡 방어
              </button>
              <button className="cc-btn" onClick={() => onAction({ type: "wait" })}>
                ⌛ 대기
              </button>
              <button className="cc-btn danger" onClick={() => onAction({ type: "flee" })}>
                ✦ 도주
              </button>
            </div>
          </div>

          {available.skills && available.skills.length > 0 && (
            <div className="cc-section">
              <div className="cc-label">스킬</div>
              <div className="cc-skill-bar">{available.skills.map(renderSkill)}</div>
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
