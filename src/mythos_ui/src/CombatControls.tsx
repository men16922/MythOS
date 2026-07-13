import { useState } from "react";

import { enemyIntentLabel } from "./combatText";
import { Popover } from "./Popover";
import { useLang } from "./i18n/lang";
import type { StringKey } from "./i18n/strings.ko";
import type { CombatAction, CombatConsumable, CombatSkillInfo, CombatState } from "./types";

/** Roles whose skills the engine directs at a friendly (heal / defense_bonus). */
const SUPPORT_ROLES = new Set(["healing", "defense"]);

type TFn = (key: StringKey) => string;

// M3 (mobile clarity): the skill button's cost/range/cooldown detail was a
// hover-only `title=` on the whole (already-tappable) button, dead on touch.
// DS1b: now a thin wrapper over the shared Popover (top-right anchor), so a
// tap previews the detail without casting the skill.
function SkillInfoTooltip({ tooltip }: { tooltip: string }) {
  return (
    <Popover className="cc-skill-info" anchor="top-right" tooltip={tooltip} ariaLabel={tooltip}>
      <span className="cc-skill-info-icon" aria-hidden="true">ⓘ</span>
    </Popover>
  );
}

interface CombatControlsProps {
  combat: CombatState;
  scenarioId: string;
  selectedTargetId: string | null;
  onSelectTarget: (targetId: string) => void;
  onAction: (action: CombatAction) => void;
  onReturnToMain: () => void;
  onContinue: () => void;
  // A2 first-combat tutorial: which control to spotlight ("attack"/"skill"/"defend").
  tutorialHighlight?: string | null;
  // XCOM-style ground-target throwables (EMP 수류탄): arm/disarm the board cell
  // picker instead of firing the item blind. `armedItemId` echoes the armed one.
  onItemTarget?: (item: CombatConsumable) => void;
  armedItemId?: string | null;
  // Aimed skills (🎯 on push/pull/aoe/stun skills): arm the board unit picker
  // with an outcome preview; the plain skill button keeps the auto-target flow.
  onSkillTarget?: (skill: CombatSkillInfo) => void;
  armedSkillId?: string | null;
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
  control: "cc.role.control",
  buff: "cc.role.buff",
};

/** Compose a one-line expected-effect summary from the skill's structured
 * `effect` dict (D1 skill legibility — "신호 도약: 이동 4칸"). Only facts the
 * engine actually applies; unknown keys are skipped rather than guessed. */
function formatEffect(
  effect: Record<string, number | string | boolean> | undefined,
  t: TFn
): string {
  if (!effect) return "";
  const parts: string[] = [];
  if (effect.damage != null) parts.push(`${t("cc.fx.damage")} ${effect.damage}`);
  if (effect.damage_bonus != null) parts.push(`${t("cc.fx.bonusDamage")} ${effect.damage_bonus}`);
  if (effect.armor_pen != null) parts.push(`${t("cc.fx.armorPen")} ${effect.armor_pen}`);
  if (typeof effect.to_hit_bonus === "number")
    parts.push(`${t("cc.fx.toHit")} +${effect.to_hit_bonus}`);
  if (effect.move != null) parts.push(`${t("cc.fx.move")} ${effect.move}${t("cc.fx.tilesSuffix")}`);
  if (typeof effect.push === "number") parts.push(`${t("cc.fx.push")} ${effect.push}${t("cc.fx.tilesSuffix")}`);
  if (typeof effect.pull === "number") parts.push(`${t("cc.fx.pull")} ${effect.pull}${t("cc.fx.tilesSuffix")}`);
  if (typeof effect.defense_bonus === "number")
    parts.push(`${t("cc.fx.defense")} +${effect.defense_bonus}`);
  if (effect.heal != null) parts.push(`${t("cc.fx.heal")} ${effect.heal}`);
  if (effect.stun) parts.push(t("cc.fx.stun"));
  if (typeof effect.speed_bonus === "number") parts.push(`${t("cc.fx.speed")} +${effect.speed_bonus}`);
  if (typeof effect.crit_bonus === "number") parts.push(`${t("cc.fx.crit")} +${effect.crit_bonus}`);
  if (effect.spawn_decoy) parts.push(t("cc.fx.decoy"));
  if (effect.damage_scale_clues) parts.push(t("cc.fx.clueScale"));
  if (effect.hack_control) parts.push(t("cc.fx.hack"));
  if (typeof effect.duration === "number" && parts.length > 0)
    parts.push(`${effect.duration}${t("cc.fx.turnsSuffix")}`);
  return parts.join(" · ");
}

// Every player-facing skill id gets a glyph — missing entries used to fall
// back to the role label's first letter, so 제어/강화 skills rendered as bare
// "제"/"강" tiles (visual overhaul 2026-07-12).
const SKILL_SYMBOLS: Record<string, string> = {
  signal_step: "⇄",
  overload_strike: "💥",
  packet_shot: "⌖",
  covering_noise: "◌",
  patch_protocol: "✚",
  magnetic_pull: "⇤",
  magnetic_repulse: "⇥",
  emp_pulse: "◎",
  precision_emp: "⚡",
  system_hack: "💫",
  system_intrusion: "🕹",
  shortcut_call: "»",
  signal_overdrive: "↯",
  glitch_blink: "⟡",
  backdoor_route: "⌘",
  guardian_wall: "▣",
  shield_field: "⛨",
  memory_resonance: "♒",
  nanoshield_projector: "◈",
};

// Quick-slot skill bar (owner 2026-07-13): the action bar shows at most six
// skills; each slot has a ⇄ affordance that opens a picker of the remaining
// learned skills, so deep builds stay one row tall. Assignments persist per
// scenario+actor in localStorage (cosmetic client state — the engine still
// accepts any learned skill id).
const MAX_SKILL_SLOTS = 6;

function loadSlotIds(storageKey: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function CombatControls({
  combat,
  scenarioId,
  selectedTargetId,
  onSelectTarget,
  onAction,
  onReturnToMain,
  onContinue,
  tutorialHighlight,
  onItemTarget,
  armedItemId,
  onSkillTarget,
  armedSkillId,
}: CombatControlsProps) {
  const { t } = useLang();
  // Direction target for heal/shield support skills (self + allies). Kept local:
  // it resets naturally when the controls remount between fights.
  const [supportTargetId, setSupportTargetId] = useState<string | null>(null);
  // Quick-slot state: per-actor slot assignments (mirrored to localStorage) and
  // which slot's swap picker is open. Keyed by storage key so control handoffs
  // between party members mid-fight each keep their own bar.
  const [slotOverrides, setSlotOverrides] = useState<Record<string, string[]>>({});
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
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
  const friendlies = available?.friendly_targets || [];
  const hasSupportSkill = (available?.skills || []).some(
    (skill) => skill.role && SUPPORT_ROLES.has(skill.role)
  );
  // Default the support direction to the most wounded friendly (ties → self last),
  // so "heal" does the intuitive thing without an extra click.
  const defaultSupportId =
    (supportTargetId && friendlies.some((f) => f.id === supportTargetId) && supportTargetId) ||
    [...friendlies].sort(
      (a, b) => a.hp / Math.max(1, a.max_hp) - b.hp / Math.max(1, b.max_hp)
    )[0]?.id ||
    null;

  const renderSkill = (skill: CombatSkillInfo) => {
    const onCooldown = skill.cooldown > 0;
    const name = skill.name || skill.id;
    const focusCost = typeof skill.cost?.focus === "number" ? skill.cost.focus : 0;
    const lowFocus = focus != null && focusCost > focus;
    // Item-gated skill with the consumable missing (e.g. patch_protocol needs a
    // nanopatch): disable so pressing it can't silently no-op.
    const noItem = skill.item_available === false;
    const disabled = onCooldown || lowFocus || noItem;
    const costStr = formatCost(skill.cost, t);
    const roleKey = skill.role ? ROLE_LABEL_KEYS[skill.role] : undefined;
    const roleLabel = roleKey ? t(roleKey) : skill.role ?? "";
    const iconSymbol = SKILL_SYMBOLS[skill.id] || roleLabel.slice(0, 1) || "✦";

    const fxStr = formatEffect(skill.effect, t);
    const tooltipParts = [name];
    if (roleLabel) tooltipParts.push(roleLabel);
    if (fxStr) tooltipParts.push(fxStr);
    if (skill.range != null) tooltipParts.push(`${t("cc.range")} ${skill.range}`);
    if (costStr) tooltipParts.push(`${t("cc.cost")} ${costStr}`);
    if (onCooldown) tooltipParts.push(`${t("cc.cooldown")} ${skill.cooldown}T`);
    else if (lowFocus) tooltipParts.push(t("cc.lowFocus"));
    if (noItem) {
      const itemKey = ITEM_LABEL_KEYS[String(skill.cost?.item)];
      const itemLabel = itemKey ? t(itemKey) : String(skill.cost?.item ?? "");
      tooltipParts.push(`${itemLabel} ${t("cc.needItem")}`);
    }
    const tags = (skill.tags || []).join(" · ");
    const tooltip = tooltipParts.join(" · ") + (tags ? `\n${tags}` : "");

    // Two-tier slice 1-ext: skills whose outcome depends on WHERE (push/pull
    // displacement, splash, stun) get an opt-in 🎯 aim toggle — board pick with
    // outcome preview. The main button keeps the casual auto-target flow.
    const effect = skill.effect || {};
    const aimable =
      !!onSkillTarget &&
      !disabled &&
      (skill.range ?? 0) > 0 &&
      (effect.push != null || effect.pull != null || effect.aoe_radius != null || !!effect.stun);
    const armed = aimable && armedSkillId === skill.id;

    const mainButton = (
      <button
        key={aimable ? undefined : skill.id}
        className={`cc-skill ${skill.role ? `role-${skill.role}` : ""} ${
          (lowFocus || noItem) && !onCooldown ? "low-focus" : ""
        }${armed ? " cc-skill-armed" : ""}`}
        disabled={disabled}
        onClick={() =>
          onAction({
            type: "skill",
            skill_id: skill.id,
            // Support skills (heal/shield) are directed at the chosen friendly;
            // the engine falls back to self when the pick is out of range.
            target_id:
              (skill.role && SUPPORT_ROLES.has(skill.role)
                ? defaultSupportId
                : defaultTargetId) || undefined,
          })
        }
      >
        <span className="cc-skill-icon">
          <span className="cc-skill-symbol" aria-hidden="true">{iconSymbol}</span>
          {onCooldown && <span className="cc-cd-overlay">CD {skill.cooldown}</span>}
        </span>
        <span className="cc-skill-name">{name}</span>
        <span className="cc-skill-badges">
          {roleLabel && (
            <span className={`cc-badge role ${skill.role ? `role-${skill.role}` : ""}`}>
              {roleLabel}
            </span>
          )}
          {costStr && <span className="cc-badge cost">{costStr}</span>}
          {skill.range != null && <span className="cc-badge range">⌖{skill.range}</span>}
        </span>
        {fxStr && <span className="cc-skill-fx">{fxStr}</span>}
        <SkillInfoTooltip tooltip={tooltip} />
      </button>
    );

    if (!aimable) return mainButton;
    return (
      <span key={skill.id} className="cc-skill-wrap">
        {mainButton}
        <button
          type="button"
          className={`cc-skill-aim${armed ? " armed" : ""}`}
          aria-pressed={armed || undefined}
          title={t("cc.aimSkill")}
          onClick={() => onSkillTarget!(skill)}
        >
          🎯
        </button>
      </span>
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
                  // Two-tier slice 2: deterministic shot forecast (server-computed
                  // to mirror the exact attack math) — the XCOM HUD in one line.
                  const forecast =
                    target.in_range && target.hit_chance != null
                      ? ` · 🎯${target.hit_chance}% ⚔${target.damage_min}-${target.damage_max}${
                          (target.cover_bonus ?? 0) > 0 ? " 🛡" : ""
                        }`
                      : "";
                  return (
                    <button
                      key={target.id}
                      className={`cc-btn tgt ${defaultTargetId === target.id ? "sel" : ""}`}
                      onClick={() => onSelectTarget(target.id)}
                    >
                      {target.name}
                      {enemyIntentLabel(intent, t)} · HP {target.hp}/{target.max_hp}
                      {forecast}
                      {!target.in_range && ` · ${t("cc.outOfRange")}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasSupportSkill && friendlies.length > 1 && (
            <div className="cc-section">
              <div className="cc-label">{t("cc.supportTargets")}</div>
              <div className="cc-row">
                {friendlies.map((friendly) => (
                  <button
                    key={friendly.id}
                    className={`cc-btn tgt friendly ${defaultSupportId === friendly.id ? "sel" : ""}`}
                    onClick={() => setSupportTargetId(friendly.id)}
                  >
                    {friendly.is_self ? t("cc.supportSelf") : friendly.name} · HP {friendly.hp}/
                    {friendly.max_hp}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="cc-section">
            <div className="cc-label">{t("cc.actions")}</div>
            <div className="cc-row">
              <button
                className={`cc-btn${tutorialHighlight === "attack" ? " tut-glow" : ""}`}
                disabled={!defaultTargetId}
                title={defaultTargetId ? t("cc.attackOk") : t("cc.attackNone")}
                onClick={() => onAction({ type: "attack", target_id: defaultTargetId || undefined })}
              >
                {t("cc.attack")}
              </button>
              <button
                className={`cc-btn${tutorialHighlight === "defend" ? " tut-glow" : ""}`}
                onClick={() => onAction({ type: "defend" })}
              >
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

          {available.skills && available.skills.length > 0 && (() => {
            const allSkills = available.skills;
            const skillById = new Map(allSkills.map((s) => [s.id, s]));
            const storageKey = `mythos-skill-slots:${scenarioId}:${available.active_actor_id || "player"}`;
            const stored = slotOverrides[storageKey] ?? loadSlotIds(storageKey);
            const slotIds: string[] = [];
            for (const id of stored) {
              if (skillById.has(id) && !slotIds.includes(id)) slotIds.push(id);
            }
            for (const skill of allSkills) {
              if (slotIds.length >= MAX_SKILL_SLOTS) break;
              if (!slotIds.includes(skill.id)) slotIds.push(skill.id);
            }
            const visibleIds = slotIds.slice(0, MAX_SKILL_SLOTS);
            const bench = allSkills.filter((s) => !visibleIds.includes(s.id));
            const assignSlot = (slotIdx: number, skillId: string) => {
              const next = [...visibleIds];
              next[slotIdx] = skillId;
              setSlotOverrides((prev) => ({ ...prev, [storageKey]: next }));
              try {
                localStorage.setItem(storageKey, JSON.stringify(next));
              } catch {
                /* private mode etc. — the in-memory override still applies */
              }
              setSwapSlot(null);
            };
            return (
              <div className="cc-section">
                <div className="cc-label">{t("cc.skills")}</div>
                <div className={`cc-skill-bar${tutorialHighlight === "skill" ? " tut-glow" : ""}`}>
                  {visibleIds.map((id, idx) => {
                    const skill = skillById.get(id)!;
                    return (
                      <span key={id} className="cc-slot">
                        {renderSkill(skill)}
                        {bench.length > 0 && (
                          <button
                            type="button"
                            className={`cc-slot-swap${swapSlot === idx ? " open" : ""}`}
                            title={t("cc.swapSkill")}
                            aria-label={t("cc.swapSkill")}
                            aria-expanded={swapSlot === idx}
                            onClick={() => setSwapSlot(swapSlot === idx ? null : idx)}
                          >
                            ⇄
                          </button>
                        )}
                        {swapSlot === idx && bench.length > 0 && (
                          <div className="cc-slot-menu" role="menu">
                            <div className="cc-slot-menu-title">{t("cc.swapPick")}</div>
                            {bench.map((benchSkill) => (
                              <button
                                key={benchSkill.id}
                                type="button"
                                className="cc-slot-menu-item"
                                role="menuitem"
                                onClick={() => assignSlot(idx, benchSkill.id)}
                              >
                                <span className="cc-skill-symbol" aria-hidden="true">
                                  {SKILL_SYMBOLS[benchSkill.id] || "✦"}
                                </span>
                                <span>{benchSkill.name || benchSkill.id}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="cc-section">
            <div className="cc-label">{t("cc.consumables")}</div>
            {combat.consumables && combat.consumables.length > 0 ? (
              <div className="cc-skill-bar">
                {combat.consumables.map((item) => {
                  // Ground-targeted throwable (radius set): arm the XCOM-style
                  // board cell picker instead of firing blind at the nearest enemy.
                  const groundTargeted = item.radius != null && !!onItemTarget;
                  const armed = groundTargeted && armedItemId === item.item_id;
                  return (
                    <button
                      key={item.item_id}
                      type="button"
                      className={`cc-item-btn${armed ? " cc-item-armed" : ""}`}
                      aria-pressed={armed || undefined}
                      // Party-shared consumables: the engine applies items to the ACTIVE
                      // actor (take_player_turn → _player_item(actor)), and the inventory
                      // is loop-level, so a controlled ally's turn can spend them too.
                      title={
                        groundTargeted
                          ? t("cc.throwAtCell")
                          : item.effect === "heal"
                            ? t("cc.healHp")
                            : item.effect === "focus"
                              ? t("cc.healFocus")
                              : item.name
                      }
                      onClick={() =>
                        groundTargeted
                          ? onItemTarget!(item)
                          : onAction({ type: "item", item_id: item.item_id })
                      }
                    >
                      {/* Item art thumbnail (grenade/nanopatch PNGs already exist);
                          hides itself on 404 so text-only stays the fallback. */}
                      <img
                        className="cc-item-icon"
                        src={`/resources/${scenarioId}/items/${item.item_id}.png`}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="cc-item-name">{armed ? `🎯 ${item.name}` : item.name}</span>
                      <span className="cc-item-count">×{item.count}</span>
                    </button>
                  );
                })}
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
