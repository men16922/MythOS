# Neo-Seoul Opening Variant — Su-a (Loop 2+ re-entry, 1 cut) — EN
header: === OPENING SCENE DIRECTIVE (RE-ENTRY VARIANT · HIGHEST PRIORITY) ===
max_turn: 0

## ONBOARDING_SCENE1 (turn=0, label=REENTRY // GHOST PING)
location_lock: Outdoors, rainy C-17 neon street — a surveillance-camera crossfire zone
mandatory_event: Re-entry awakening + an unsanctioned ping, an artificial hole in the drone search pattern (no encounter, foreshadow only)
forbidden: The ping's sender appearing, Jung Se-rin appearing, combat, setting any met_* flag, piling on new mystery bait
flags: 
start_combat: 
---
ONBOARDING_SCENE1 (REENTRY // GHOST PING): This is a loop re-entry scene. The unregistered '{archetype}' signal — the protagonist — wakes on a neon street laced with overlapping surveillance cameras, with the déjà vu of repetition; they know this city is not new to them (past-loop afterimages in one or two sensory fragments only). The scene's mandatory event: at the edge of vision, **a ping with no authorization signature blinks in a repeating rhythm** — a handmade signal that mimics grid protocol but is subtly off. And then the realization: the drones' search tracks overhead have **an artificial hole punched through them**. Someone is bending the surveillance web in real time, opening a corridor for you to pass. The ping only points toward that hole; the sender never says a word. Important: the ping's owner (Su-a) does **not** appear in this scene. Do not complete any conversation or encounter. Jung Se-rin does not appear either. Focus on filmable sensations: the blink's rhythm, the instant every camera head turns elsewhere at once, the empty trough between searchlights. All narration and choices for this scene must be written in English.
Choice generation guide (no combat):
 1) A signal-following choice like "Move into the hole the ping points through"
 2) A tracing choice like "Pick apart the ping's forged signature"
 3) A wary choice like "Could be bait — block the ping and take your own path"
Important: this is an awakening/hook beat — never start combat. world_delta.start_combat must be null, and do not set met_su_ah or any meeting flag (the meeting is completed by its arc on the operation map).
