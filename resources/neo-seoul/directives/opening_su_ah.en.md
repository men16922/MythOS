# Neo-Seoul Opening Variant — Su-a (Loop 2+ re-entry, 1 cut) — EN
header: === OPENING SCENE DIRECTIVE (RE-ENTRY VARIANT · HIGHEST PRIORITY) ===
max_turn: 3

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

## REENTRY_SCENE2 (turn=1, label=REENTRY // CORRIDOR)
location_lock: Outdoors, camera-crossed junction — the corridor of emptied blind spots
mandatory_event: The blind spot slips once (one camera returns early) — the feeling of being tested (no detection)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat, Su-ah's name or appearance
flags:
start_combat:
---
REENTRY_SCENE2 (CORRIDOR): You walk the emptied blind spots. The lenses all watch, in rhythm, the places you are not — then one swings back half a beat early. Three seconds counted flat against a wall. The gap opens again. Do not say whether it was a mistake or a test. Draw the unseen guide only as the choreography of cameras, and let the received ping's coordinates decide where your feet point.
Choice generation guide (no combat): 1) Trust the choreography and pass on its rhythm 2) Remember the half-beat slip and change your pace 3) Measure a route outside the blind spots by eye

## REENTRY_SCENE3 (turn=2, label=REENTRY // EDGE)
location_lock: Outdoors, past the junction — the surveillance grid's edge
mandatory_event: Leave the sector + receive the ping's last echo (a short termination signal; sender undisclosed)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat
flags:
start_combat:
---
REENTRY_SCENE3 (EDGE): Past the junction the camera density thins. The ping sounds once more — short, like a confirmation — and goes silent, as if the watching eyes had finished their shift. Do not settle who cleared the way, or why. If Jung Se-rin appears, distant sighting or rumor only. Hand the flow off to the operation map's route choices.
Choice generation guide: 1) Memorize the echo's bearing and move 2) Keep a safe margin along the grid's edge 3) Tally the price of the favor you were given
