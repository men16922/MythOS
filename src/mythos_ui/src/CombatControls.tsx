import { enemyIntentLabel } from "./combatText";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";
import type { CombatAction, CombatSkillInfo, CombatState } from "./types";

type TFn = (key: StringKey) => string;

interface CombatControlsProps {
  combat: CombatState;
  scenarioId: string;
  selectedTargetId: string | null;
  onSelectTarget: (targetId: string) => void;
  onAction: (action: CombatAction) => void;
  onReturnToMain: () => void;
  onContinue: () => void;
}

function outcomeLabel(outcome: string, t: TFn): string {
  if (outcome === "player_victory") return t("story.combat.win");
  if (outcome === "player_fled") return t("story.combat.fled");
  if (outcome === "player_defeat") return t("story.combat.defeat");
  return outcome;
}

// Human-readable item labels for skill costs (e.g. patch_protocol -> nanopatch).
const ITEM_LABEL_KEYS: Record<string, StringKey> = {
  nanopatch: "cc.item.nanopatch",
};

/** Render a skill's cost dict as compact badges, e.g. {focus:2} -> "◆2". */
function formatCost(cost: Record<string, number | string> | undefined, t: TFn): string {
  if (!cost) return "";
  const parts: string[] = [];
  if (cost.focus != null) parts.push(`◆${cost.focus}`);
  if (cost.item != null) {
    const key = ITEM_LABEL_KEYS[String(cost.item)];
    parts.push(`▣${key ? t(key) : cost.item}`);
  }
  for (const [key, value] of Object.entries(cost)) {
    if (key === "focus" || key === "item") continue;
    parts.push(`${key} ${value}`);
  }
  return parts.join(" ");
}

const ROLE_LABEL_KEYS: Record<string, StringKey> = {
  damage: "cc.role.damage",
  mobility: "cc.role.mobility",
  defense: "cc.role.defense",
  healing: "cc.role.healing",
  support: "cc.role.support",
};

const SKILL_SYMBOLS: Record<string, string> = {
  signal_step: "⇄",
  overload_strike: "⚡",
  packet_shot: "⌖",
  covering_noise: "◌",
  patch_protocol: "+",
};

export function CombatControls({
  combat,
  selectedTargetId,
  onSelectTarget,
  onAction,
  onReturnToMain,
  onContinue,
}: CombatControlsProps) {
  const { t } = useLang();
  if (combat.finished && combat.outcome) {
    const canContinue = combat.outcome !== "player_defeat" || combat.defeat_soft;
    return (
      <div id="combat-controls" className="active">
        <div className={`combat-outcome ${combat.outcome === "player_defeat" ? "lose" : ""}`}>
          {t("story.combat.end")} — {outcomeLabel(combat.outcome, t)}
        </div>
        <div className="cc-row" style={{ marginTop: "10px" }}>
          {canContinue ? (
            <button className="cc-btn" onClick={onContinue} id="cc-continue">
              {t("story.combat.continue")}
            </button>
          ) : (
            <button className="cc-btn" onClick={onReturnToMain} id="cc-return-main">
              {t("story.combat.toMain")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (combat.finished) return null;

  const available = combat.available;
  const focus = available?.focus ?? null;
  const isPlayerTurn = available?.is_player !== false;
  const activeName = available?.active_actor_name;
  const targets = available?.targets || [];
  const defaultTargetId =
    selectedTargetId ||
    targets.find((target) => target.in_range)?.id ||
    targets[0]?.id ||
    null;

  const renderSkill = (skill: CombatSkillInfo) => {
    const onCooldown = skill.cooldown > 0;
    const name = skill.name || skill.id;
    const focusCost = typeof skill.cost?.focus === "number" ? skill.cost.focus : 0;
    const lowFocus = focus != null && focusCost > focus;
    const disabled = onCooldown || lowFocus;
    const costStr = formatCost(skill.cost, t);
    const roleKey = skill.role ? ROLE_LABEL_KEYS[skill.role] : undefined;
    const roleLabel = roleKey ? t(roleKey) : skill.role ?? "";
    const iconSymbol = SKILL_SYMBOLS[skill.id] || roleLabel.slice(0, 1) || "✦";

    const tooltipParts = [name];
    if (roleLabel) tooltipParts.push(roleLabel);
    if (skill.range != null) tooltipParts.push(`${t("cc.range")} ${skill.range}`);
    if (costStr) tooltipParts.push(`${t("cc.cost")} ${costStr}`);
    if (onCooldown) tooltipParts.push(`${t("cc.cooldown")} ${skill.cooldown}T`);
    else if (lowFocus) tooltipParts.push(t("cc.lowFocus"));
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
            target_id: defaultTargetId || undefined,
          })
        }
      >
        <span className="cc-skill-icon">
          <span className="cc-skill-symbol" aria-hidden="true">{iconSymbol}</span>
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
        <span className="turn">
          {t("cc.round")}{combat.radar?.round || 1}
          {available?.can_act && activeName && (
            <span className={`active-actor ${isPlayerTurn ? "" : "ally"}`}>
              {" "}· {isPlayerTurn ? activeName : `${activeName} (${t("cc.ally")})`}{t("cc.turnOf")}
            </span>
          )}
        </span>
        <span className="focus">
          FOCUS {available?.focus ?? "—"}/{available?.max_focus ?? "—"}
        </span>
      </div>

      {!available?.can_act ? (
        <div className="cc-hint">{t("cc.oppTurn")}</div>
      ) : (
        <>
          {available.targets && available.targets.length > 0 && (
            <div className="cc-section">
              <div className="cc-label">{t("cc.targets")}</div>
              <div className="cc-row">
                {available.targets.map((target) => {
                  const intent = (combat.radar?.enemy_intents || []).find(
                    (item) => item.enemy_id === target.id
                  );
                  return (
                    <button
                      key={target.id}
                      className={`cc-btn tgt ${defaultTargetId === target.id ? "sel" : ""}`}
                      onClick={() => onSelectTarget(target.id)}
                    >
                      {target.name}
                      {enemyIntentLabel(intent, t)} · HP {target.hp}/{target.max_hp}
                      {!target.in_range && ` · ${t("cc.outOfRange")}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="cc-section">
            <div className="cc-label">{t("cc.actions")}</div>
            <div className="cc-row">
              <button
                className="cc-btn"
                disabled={!defaultTargetId}
                title={defaultTargetId ? t("cc.attackOk") : t("cc.attackNone")}
                onClick={() => onAction({ type: "attack", target_id: defaultTargetId || undefined })}
              >
                {t("cc.attack")}
              </button>
              <button className="cc-btn" onClick={() => onAction({ type: "defend" })}>
                {t("cc.defend")}
              </button>
              <button className="cc-btn" onClick={() => onAction({ type: "wait" })}>
                {t("cc.wait")}
              </button>
              {isPlayerTurn && (
                <button className="cc-btn danger" onClick={() => onAction({ type: "flee" })}>
                  {t("cc.flee")}
                </button>
              )}
            </div>
          </div>

          {available.skills && available.skills.length > 0 && (
            <div className="cc-section">
              <div className="cc-label">{t("cc.skills")}</div>
              <div className="cc-skill-bar">{available.skills.map(renderSkill)}</div>
            </div>
          )}

          <div className="cc-section">
            <div className="cc-label">{t("cc.consumables")}</div>
            {combat.consumables && combat.consumables.length > 0 ? (
              <div className="cc-skill-bar">
                {combat.consumables.map((item) => (
                  <button
                    key={item.item_id}
                    type="button"
                    className="cc-item-btn"
                    disabled={!isPlayerTurn}
                    title={item.effect === "heal" ? t("cc.healHp") : item.effect === "focus" ? t("cc.healFocus") : item.name}
                    onClick={() => onAction({ type: "item", item_id: item.item_id })}
                  >
                    <span className="cc-item-name">{item.name}</span>
                    <span className="cc-item-count">×{item.count}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="cc-empty">{t("cc.noConsumables")}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
