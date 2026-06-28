# Neo-Seoul Encounter Directives (English)
#
# English variant of encounters.md: travel-encounter and resource-threshold emergency
# directive prose. scenario_context detects travel keywords and stability/tension
# thresholds (gating logic stays in code), then fills the templates below
# (decay_pct/stability/tension/player_action) into the narrative notes. Loaded for
# language="en" via load_scenario_directives(..., "en"); falls back to encounters.md
# (Korean) when absent. Tune the prose only here.

travel_header: === TRAVEL ENCOUNTER (mid-travel encounter event) ===
emergency_header: === EMERGENCY ENCOUNTERS (resource-threshold crisis) ===

## travel_template
---
Directive: the player has declared an action to move between zones or travel ('{player_action}'). Taking into account the current spacetime collapse ({decay_pct}%), stealth stability ({stability}/100), and control-grid pursuit ({tension}/100), describe a mid-travel interception event encountered en route — a glitch anomaly, a guard-patrol encounter, or surrounding environmental collapse — and generate at least one choice for breaking through or evading it (e.g. bypassing the alarm with a computation hack, quietly finding a detour).

## emergency_low_stability
---
Warning: the [stealth stability] is now at a very dangerous level (currently: {stability}/100). Narrate an Emergency in which a glitch physics phenomenon on the verge of connection collapse, a spacetime distortion, or a forced-disconnect broadcast bears down, and force on the player an emergency choice with a heavy cost to recover stability.

## emergency_high_tension
---
Warning: the [control-grid pursuit] is now extremely high (currently: {tension}/100). Narrate the cordon tightening — the control grid's Enforcers directly closing their pursuit line, a drone chase, or a direct correction notice from Administrator IX. The choice that follows must demand a heavy cost (a stats check or stability expenditure) to evade or break through.
