"""Bilingual combat-log templates (KO/EN).

Combat-log lines are generated *prose* (like narration), not data — so they must be
produced in the player's language at the source. The engine/narrator format these
templates with named kwargs; the names interpolated in (skills/enemies/weapons) are
already English in EN mode via the serving-boundary glossary, so EN here is authored
as full natural sentences (no Korean-particle hacks). ``CombatState.language`` carries
the active language so both the structured log and the narrated prose stay in sync.

``ko`` is the default/fallback. An unknown key returns the key (visible-but-safe).
"""

from __future__ import annotations

# --- per-line templates (engine + narrator move/start) ---------------------
_LINES: dict[str, dict[str, str]] = {
    "start": {"ko": "전투 개시.", "en": "Combat begins."},
    "defend": {
        "ko": "{name}이(가) 방어 태세를 취하며 집중을 가다듬는다.",
        "en": "{name} takes a defensive stance and steadies focus.",
    },
    "cannot_leave": {
        "ko": "{name}은(는) 전열을 이탈할 수 없다.",
        "en": "{name} can't break formation.",
    },
    "observe": {"ko": "{name}은(는) 상황을 살핀다.", "en": "{name} surveys the situation."},
    "target_gone": {"ko": "{name}의 표적이 사라졌다.", "en": "{name}'s target is gone."},
    "no_weapon": {"ko": "{name}에게 무기가 없다.", "en": "{name} has no weapon."},
    "out_of_range": {
        "ko": "{target}은(는) {weapon}의 사거리 밖에 있다.",
        "en": "{target} is out of range of {weapon}.",
    },
    "attack_miss": {
        "ko": "{attacker}의 {weapon} 공격이 {defender}을(를) 빗나갔다.",
        "en": "{attacker}'s {weapon} attack misses {defender}.",
    },
    # F stun (EMP pulse skill / EMP grenade item).
    "stun_applied": {
        "ko": "{actor}의 전자 충격이 {target}의 회로를 마비시켰다! (기절 {turns}턴)",
        "en": "{actor}'s electric shock locks up {target}'s circuits! (stunned {turns}T)",
    },
    "stunned_skip": {
        "ko": "{name}은(는) 기절 상태로 움직이지 못한다.",
        "en": "{name} is stunned and cannot act.",
    },
    # Boss consecutive-stun resistance (owner call 2026-07-14).
    "stun_resisted": {
        "ko": "{target}의 코어가 재차 마비를 거부한다 — 기절 저항!",
        "en": "{target}'s core refuses a second lockup — stun resisted!",
    },
    # Boss stack resistance (2026-09-07, DECISIONS).
    "status_stack_resisted": {
        "ko": "{target}의 코어가 과부하를 억제한다 — 중첩 저항!",
        "en": "{target}'s core damps the overload — stacking resisted!",
    },
    # Persistent status effects (2026-07-12 design — 세계관명: 과열/부식 프로토콜).
    "status_burn_applied": {
        "ko": "{target}의 외장이 과열되기 시작한다 — 🔥 연소!",
        "en": "{target}'s plating starts to overheat — 🔥 burning!",
    },
    "status_burn_tick": {
        "ko": "🔥 {name}이(가) 과열로 {damage} 피해를 입는다.",
        "en": "🔥 {name} takes {damage} overheat damage.",
    },
    "status_burn_kill": {
        "ko": "🔥 {name}이(가) 과열을 견디지 못하고 쓰러진다! ({damage} 피해)",
        "en": "🔥 {name} succumbs to the overheat! ({damage} dmg)",
    },
    "status_burn_expired": {
        "ko": "{name}의 과열이 가라앉는다.",
        "en": "{name}'s overheat subsides.",
    },
    "status_corrode_applied": {
        "ko": "{target}의 장갑이 부식되기 시작한다 — 🧪 방어 약화!",
        "en": "{target}'s armor starts to corrode — 🧪 defense weakened!",
    },
    "status_corrode_expired": {
        "ko": "{name}의 부식이 멎는다.",
        "en": "{name}'s corrosion stops.",
    },
    "status_acid_applied": {
        "ko": "{target}의 피막이 산에 녹아내린다 — 💧 방어 약화!",
        "en": "{target}'s plating dissolves in acid — 💧 defense weakened!",
    },
    "status_acid_expired": {
        "ko": "{name}의 피막 용해가 멎는다.",
        "en": "{name}'s plating stops dissolving.",
    },
    "status_freeze_applied": {
        "ko": "{target}의 구동계가 얼어붙는다 — ❄ 이동 불가!",
        "en": "{target}'s actuators freeze over — ❄ cannot move!",
    },
    "status_freeze_expired": {
        "ko": "{name}의 구동계가 다시 돌기 시작한다.",
        "en": "{name}'s actuators grind back to life.",
    },
    "status_freeze_hold": {
        "ko": "❄ {name}이(가) 얼어붙어 움직이지 못한다!",
        "en": "❄ {name} is frozen in place and cannot move!",
    },
    "status_shock_applied": {
        "ko": "{target}의 회로가 지연된다 — ⚡ 감전!",
        "en": "{target}'s circuits lag — ⚡ shocked!",
    },
    "status_shock_expired": {
        "ko": "{name}의 회로가 안정을 되찾는다.",
        "en": "{name}'s circuits stabilize.",
    },
    "status_hacked_applied": {
        "ko": "{target}의 제어권이 탈취당한다 — 🕹 다음 턴 아군 오인 공격!",
        "en": "{target}'s control is seized — 🕹 it will turn on its own side!",
    },
    "status_stack_suffix": {
        "ko": " (중첩 ×{stacks})",
        "en": " (×{stacks})",
    },
    "hacked_turn": {
        "ko": "🕹 {name}이(가) 조종당해 {target}을(를) 공격한다!",
        "en": "🕹 {name}, under hacked control, attacks {target}!",
    },
    "hacked_idle": {
        "ko": "🕹 {name}이(가) 조종당했지만 공격할 동료가 없다 — 시스템 재부팅.",
        "en": "🕹 {name} is hacked but has no ally to strike — systems reboot.",
    },
    "item_status_aoe": {
        "ko": "{actor}의 {item}이(가) ({x}, {y}) 일대를 뒤덮는다 — 적 {count}기 피격!",
        "en": "{actor}'s {item} blankets the area around ({x}, {y}) — {count} enemies caught!",
    },
    "item_stun_aoe": {
        "ko": "{actor}의 {item}이(가) ({x}, {y}) 일대를 뒤덮는다 — 적 {count}기 회로 마비!",
        "en": "{actor}'s {item} blankets the area around ({x}, {y}) — {count} enemies short-circuit!",
    },
    "item_stun": {
        "ko": "{actor}이(가) {item}을(를) 투척한다 — {target}을(를) 향해 전자기 폭발!",
        "en": "{actor} throws {item} — an electromagnetic burst engulfs {target}!",
    },
    # E2 boss-exclusive mechanics.
    "boss_telegraph": {
        "ko": "{actor}이(가) {skill}을(를) 준비한다 — {target} 주변 구역이 표적으로 지정됐다. 표시된 구역을 벗어나라!",
        "en": "{actor} charges {skill} — the zone around {target} is marked. Get out of the marked tiles!",
    },
    "telegraph_hit": {
        "ko": "{skill}이(가) 낙뢰처럼 떨어진다 — {target}에게 {damage} 피해!",
        "en": "{skill} comes down like a thunderbolt — {target} takes {damage}!",
    },
    "telegraph_evaded": {
        "ko": "{actor}의 {skill}이(가) 빈 자리를 태운다 — 회피 성공!",
        "en": "{actor}'s {skill} scorches empty ground — evaded!",
    },
    "tiles_sealed": {
        "ko": "{actor}이(가) 구역을 봉쇄한다 — 전기장 타일 {count}칸 생성.",
        "en": "{actor} seals the zone — {count} electrified tiles created.",
    },
    # E1 companion signature effects.
    "focus_drained": {
        "ko": "{actor}이(가) {target}의 제어 회로에 침투했다 — 집중 -{drained}.",
        "en": "{actor} breaches {target}'s control circuits — focus -{drained}.",
    },
    "party_speed": {
        "ko": "{actor}이(가) 지름길을 외친다 — 파티 이동 +{bonus}!",
        "en": "{actor} calls out a shortcut — party movement +{bonus}!",
    },
    "taunt": {
        "ko": "{actor}이(가) 앞을 막아선다 — 적들의 시선이 그에게 쏠린다.",
        "en": "{actor} plants themselves in the way — every enemy turns toward them.",
    },
    "relocated": {
        "ko": "{actor}의 신호 경로를 타고 {target}이(가) 순간 재배치된다.",
        "en": "{target} blinks along {actor}'s signal route to safer ground.",
    },
    # D4 cover legibility: when cover turned the hit into a miss, SAY so —
    # the +3/+6 bonus was invisible ("엄폐가 뭘 하는지 모름").
    "attack_miss_cover": {
        "ko": "{attacker}의 {weapon} 사격이 {defender}의 엄폐물에 막혔다. (엄폐 +{cover})",
        "en": "{attacker}'s {weapon} shot is stopped by {defender}'s cover. (cover +{cover})",
    },
    "attack_kill": {
        "ko": "{attacker}이(가) {defender}을(를) 쓰러뜨렸다! ({damage} 피해)",
        "en": "{attacker} takes down {defender}! ({damage} dmg)",
    },
    "attack_hit": {
        "ko": "{tag}{attacker}의 {weapon}이(가) {defender}에게 {damage} 피해.",
        "en": "{tag}{attacker}'s {weapon} hits {defender} for {damage}.",
    },
    "flee_success": {
        "ko": "{name}이(가) 전장을 이탈했다.",
        "en": "{name} breaks off and escapes the battlefield.",
    },
    "flee_fail": {
        "ko": "{name}이(가) 이탈에 실패했다. 적이 길을 막는다.",
        "en": "{name} fails to disengage — the enemy blocks the way.",
    },
    "unknown_skill": {"ko": "{name}: 알 수 없는 스킬이다.", "en": "{name}: unknown skill."},
    "skill_recharge": {
        "ko": "{name}은(는) 재충전 중이다. (R-{remaining})",
        "en": "{name} is recharging. (R-{remaining})",
    },
    "skill_no_focus": {
        "ko": "{name}을(를) 발동할 집중이 부족하다.",
        "en": "Not enough focus to use {name}.",
    },
    "skill_no_resource": {
        "ko": "{name}에 필요한 자원이 없다.",
        "en": "No resources to use {name}.",
    },
    "skill_no_target": {
        "ko": "{name}: 사거리 안에 표적이 없다.",
        "en": "{name}: no target in range.",
    },
    "skill_activate": {
        "ko": "{actor}이(가) {skill}을(를) 발동한다.",
        "en": "{actor} activates {skill}.",
    },
    "boss_enrage": {
        "ko": "{name}의 코어가 과부하로 점화된다 — 최적화 의지가 한계를 넘어선다.",
        "en": "{name}'s core ignites into overload — its optimization will breaks past all limits.",
    },
    "cover_noise": {
        "ko": "{name} 주위로 엄호 노이즈가 퍼진다. (방어 +{buff})",
        "en": "Covering noise spreads around {name}. (DEF +{buff})",
    },
    "recover_hp": {"ko": "{name}이(가) {healed} 회복했다.", "en": "{name} recovers {healed} HP."},
    "item_unusable": {
        "ko": "{name}: 사용할 수 없는 아이템이다.",
        "en": "{name}: that item can't be used.",
    },
    "item_missing": {
        "ko": "{name}: 해당 아이템을 갖고 있지 않다.",
        "en": "{name}: you don't have that item.",
    },
    "item_heal": {
        "ko": "{actor}이(가) {item}을(를) 써 {healed} 회복했다.",
        "en": "{actor} uses {item} and recovers {healed} HP.",
    },
    "item_focus": {
        "ko": "{actor}이(가) {item}으로 집중을 회복했다.",
        "en": "{actor} restores focus with {item}.",
    },
    "item_combat_only": {
        "ko": "{name}은(는) 전투 중 사용할 수 없다.",
        "en": "{name} can't be used during combat.",
    },
    "item_revive": {
        "ko": "{actor}이(가) {item}을(를) 기동해 {target}을(를) 재가동시켰다! (HP {hp})",
        "en": "{actor} triggers {item} — {target} reboots back into the fight! (HP {hp})",
    },
    "item_revive_no_target": {
        "ko": "{item}: 재가동할 쓰러진 동료가 없다.",
        "en": "{item}: no downed ally to reboot.",
    },
    "signal_step_move": {
        "ko": "{name}이(가) 신호 도약으로 ({dx}, {dy})로 이동한다.",
        "en": "{name} signal-steps to ({dx}, {dy}).",
    },
    "signal_step_dive": {
        "ko": "{name}이(가) 신호 도약으로 ({x}, {y})로 파고든다.",
        "en": "{name} signal-steps deep to ({x}, {y}).",
    },
    "skill_push": {
        "ko": "{target}이(가) 충격에 밀려 ({x}, {y})로 밀려난다.",
        "en": "{target} is knocked back to ({x}, {y}).",
    },
    "skill_pull": {
        "ko": "{target}이(가) ({x}, {y})로 끌려온다.",
        "en": "{target} is dragged to ({x}, {y}).",
    },
    "skill_no_budge": {
        "ko": "{target}이(가) 버티고 서서 꿈쩍도 하지 않는다!",
        "en": "{target} braces and doesn't budge an inch!",
    },
    "slam_label": {
        "ko": "충돌",
        "en": "Slam",
    },
    "slam_hit": {
        "ko": "💥 {target}이(가) 장애물에 부딪혀 {damage} 충돌 피해!",
        "en": "💥 {target} slams into an obstacle for {damage} bonus damage!",
    },
    "displace_shock": {
        "ko": "{target}이(가) 끌려온 충격으로 {damage} 피해를 입는다!",
        "en": "{target} takes {damage} slam damage from the forced shift!",
    },
    "arrival_shock": {
        "ko": "{actor}의 도약 방전이 {target}에게 {damage} 전격 피해!",
        "en": "{actor}'s arrival discharge shocks {target} for {damage}!",
    },
    "splash_hit": {
        "ko": "폭발이 번져 {target}에게 {damage} 피해!",
        "en": "The blast spreads to {target} for {damage}!",
    },
    "skill_miss": {
        "ko": "{actor}의 {skill}이(가) {target}을(를) 빗나갔다.",
        "en": "{actor}'s {skill} misses {target}.",
    },
    "skill_kill": {
        "ko": "{actor}의 {skill}이(가) {target}을(를) 쓰러뜨렸다! ({damage} 피해)",
        "en": "{actor}'s {skill} takes down {target}! ({damage} dmg)",
    },
    "skill_hit": {
        "ko": "{tag}{actor}의 {skill}이(가) {target}에게 {damage} 피해.",
        "en": "{tag}{actor}'s {skill} hits {target} for {damage}.",
    },
    "hazard_acid": {
        "ko": "⚠️ {name}이(가) 산성 액체 지대에서 {damage} 피해를 입고 장갑이 부식됩니다! (방어력 -1)",
        "en": "⚠️ {name} takes {damage} in the acid pool — armor corrodes! (DEF -1)",
    },
    "hazard_shock": {
        "ko": "⚠️ {name}이(가) 누전 지대에서 {damage} 전기 피해를 입고 기절(과부하)하여 집중력을 잃습니다!",
        "en": "⚠️ {name} takes {damage} shock damage in the live-current zone, stunned (overload) and loses focus!",
    },
    "hazard_death": {
        "ko": "💀 {name}이(가) 지형 위험 요소로 인해 쓰러졌습니다.",
        "en": "💀 {name} is taken down by a terrain hazard.",
    },
    "heal_other": {
        "ko": "{actor}이(가) {target}의 HP를 {healed} 회복시켰다.",
        "en": "{actor} restores {healed} HP to {target}.",
    },
    "enemy_flee": {
        "ko": "{name}이(가) 겁에 질려 물러난다.",
        "en": "{name} recoils in fear and pulls back.",
    },
    "move": {"ko": "{name}이(가) ({x}, {y})로 이동한다.", "en": "{name} moves to ({x}, {y})."},
    "move_shift": {
        "ko": "{name}이(가) ({x}, {y})로 움직인다.",
        "en": "{name} shifts to ({x}, {y}).",
    },
    "crit_tag": {"ko": "치명타! ", "en": "Critical! "},
    # engine "end" log-entry outcome text
    "end_victory": {"ko": "적을 모두 제압했다.", "en": "All enemies subdued."},
    "end_defeat": {"ko": "당신은 쓰러졌다.", "en": "You have fallen."},
    "end_fled": {"ko": "당신은 전장을 벗어났다.", "en": "You left the battlefield."},
    "end_over": {"ko": "전투 종료.", "en": "Combat over."},
    # narrator move-flush + start prose
    "narrate_move": {"ko": "{names}이(가) 자리를 옮긴다.", "en": "{names} reposition."},
    "narrate_start": {"ko": "전투가 시작된다.", "en": "the fight begins."},
    # narrator post-combat outcome prose
    "outcome_victory": {
        "ko": "교전이 끝났다. 당신은 살아남았다.",
        "en": "The engagement ends. You survived.",
    },
    "outcome_defeat": {
        "ko": "시야가 흐려진다. 신호가 끊긴다…",
        "en": "Your vision blurs. The signal cuts out…",
    },
    "outcome_fled": {
        "ko": "당신은 어둠 속으로 몸을 던져 전장을 빠져나간다.",
        "en": "You hurl yourself into the dark and slip off the battlefield.",
    },
    "outcome_over": {"ko": "전투가 종료되었다.", "en": "Combat has ended."},
}

# --- narrator random "lead" flavor phrases (same length per lang → seed-stable) ---
LEADS: dict[str, dict[str, list[str]]] = {
    "hit": {
        "ko": ["", "그 순간, ", "곧바로 ", "틈을 놓치지 않고 "],
        "en": ["", "In that instant, ", "At once, ", "Seizing the gap, "],
    },
    "miss": {
        "ko": ["", "하지만 ", "아쉽게도 ", "간발의 차로 "],
        "en": ["", "But ", "Unfortunately, ", "By a hair, "],
    },
    "round": {
        "ko": ["", "공기가 팽팽해진다. ", "신호가 요동친다. ", "정적이 깨지고 "],
        "en": ["", "The air tightens. ", "The signal surges. ", "The silence breaks and "],
    },
}


def clog(language: str | None, key: str, **kw: object) -> str:
    """Render a combat-log line in ``language`` (KO fallback). Unknown key → the key."""
    table = _LINES.get(key)
    if table is None:
        return key
    tmpl = table.get(language or "ko") or table["ko"]
    try:
        return tmpl.format(**kw)
    except (KeyError, IndexError):
        return tmpl


def leads(language: str | None, kind: str) -> list[str]:
    """Lead-phrase pool for a narrator line kind, in ``language`` (KO fallback)."""
    table = LEADS.get(kind, {})
    return table.get(language or "ko") or table.get("ko") or [""]
