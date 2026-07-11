# Persistent status effects — 부식/연소/산성/냉동/감전 (2026-07-12, design)

Owner directive: keyword-mapped persistent statuses (evasion down / DoT / immobilize /
damage-amp …) with maximized board VFX. Builds on the existing status channel
(`Combatant.status` list + `stunned_turns` pattern + D2 status chips + 💫 badge precedent).

## Effect mapping (proposal — Neo-Seoul flavored names in parens)

| id | 한글 (세계관명) | Mechanical keyword | Duration | Stacking |
|---|---|---|---|---|
| `burn` | 연소 (과열 프로토콜) | DoT: 1d4 at turn start | 2T | refresh, no stack |
| `shock` | 감전 (회로 지연) | focus regen 정지 + cooldown tick 정지 | 1T | refresh |
| `corrode` | 부식 (장갑 부식) | armor -2 (floor 0) → "받는 피해 증가" | 2T | stacks to -4 |
| `acid` | 산성 (피막 용해) | effective_defense -2 → "회피/방어 감소" | 2T | refresh |
| `freeze` | 냉동 (구동계 동결) | 이동 불가 (행동은 가능 — 스턴의 반쪽) | 1T | refresh |

Machine-heavy enemy roster: names lean "protocol/actuator" (과열/동결) so 서사 결 유지;
KO/EN strings via log_i18n + status chip labels.

## Engine shape (mirror the stun pattern — smallest structural change)

- `Combatant.status_effects: dict[str, int]` (id → remaining turns) beside `stunned_turns`
  (stun stays as-is; do NOT migrate it in the same slice).
- Application: skill/weapon effect key `applies: {"burn": 2}` (+ optional `apply_chance`);
  processed in `_skill_attack`/`_apply_shock_damage` on hit.
- Tick: at the unit's turn start (same place `_consume_stun` runs): DoT damage, decrement
  turns, emit `status_tick`/`status_expired` logs with detail `{status, damage?}` so the
  frontend can animate deterministically.
- Stat hooks: `effective_defense` (acid), armor lookup (corrode), `_move_to_band`/reachable
  (freeze), focus regen + cooldown tick (shock). Each is a 1-2 line read-through.
- Validator: clamp durations 1-3, whitelist ids in `validate_content`.

## Board legibility (the owner's "시각적 임팩트 극대화")

- **Badge**: colored pill above unit (mirror 💫): 🔥 연소 / ⚡ 감전 / 🧪 부식 / 💧 산성 / ❄ 동결,
  color-coded; stacked statuses render as a compact row (max 3 + "+n").
- **Apply moment**: burst FX in the status color (ring + sparks) + log line.
- **Tick moment**: DoT floats (-N in status color) during the board animation phase.
- **Aura**: subtle per-status tint/particle on the unit sprite while active (e.g. freeze =
  cyan-white desaturation, burn = ember sparks) — canvas-only, no sprite art needed.

## Grants (initial content pass — small, owner-tunable)

- 연소: 소각로 계열 적 공격 + (신규 아이템) 소이 수류탄(ground-target, radius 1 — reuses
  XCOM throw path).
- 감전: 누전 지대 타일(이미 존재)로 통일 + EMP 계열의 약화 부가효과.
- 부식: 산성 계열 적(물거미?) 공격 · 산탄형 스킬.
- 냉동: 신규 적 변종 or 아이템 1종 (콘텐츠는 `[auto:codex]` 시나리오 레인과 협의).
- 산성: acid 계열 적 전용 (플레이어 획득은 2차).

## Slices

1. `[auto:claude]` engine framework + burn/corrode only + badges + tick logs + tests.
2. `[auto:claude]` acid/freeze/shock hooks + apply FX + aura pass.
3. content mapping (who applies what) — needs owner balance pass, then `[auto:codex]` for
   scenario.json wiring + `[manual]` feel check.

Done-criteria per slice: `make check` green + deterministic replay preserved (statuses are
seed-stable) + AGY post-commit screen.
