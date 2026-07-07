# Neo-Seoul Opening Variant — Han (Loop 2+ re-entry, 1 cut) — EN
header: === OPENING SCENE DIRECTIVE (RE-ENTRY VARIANT · HIGHEST PRIORITY) ===
max_turn: 3

## ONBOARDING_SCENE1 (turn=0, label=REENTRY // SHORTCUT)
location_lock: Outdoors, rainy C-17 welfare-block passage — before a closing shutter
mandatory_event: Re-entry awakening + a stranger points out a shortcut and vanishes (a brushing encounter, no joining)
forbidden: Confirming the man's identity / recruiting him, Jung Se-rin appearing, combat, setting any met_* flag, piling on new mystery bait
flags: 
start_combat: 
---
ONBOARDING_SCENE1 (REENTRY // SHORTCUT): This is a loop re-entry scene. The unregistered '{archetype}' signal — the protagonist — wakes in a narrow welfare-block passage with the déjà vu of repetition; they know this city is not new to them (past-loop afterimages in one or two sensory fragments only). At the end of the passage a security shutter begins to descend with a warning tone — the patrol-hour sector lockdown. The scene's mandatory event: just before the shutter seals, a **big man in work clothes brushes out of the dark**, wordlessly taps a drainage cover on the wall with the toe of his boot — a shortcut the patrols never reach — and disappears to the far side of the shutter leaving neither name nor reason. Too gruff to be kindness, too precise to be chance. Important: do not reveal the man's (Han's) identity or complete any conversation/recruitment — leave only a passing silhouette and the gesture. Jung Se-rin does not appear either. Focus on filmable sensations: the pressure of the descending shutter, the smell of rain-soaked work clothes, the dark below the drainage cover. All narration and choices for this scene must be written in English.
Choice generation guide (no combat):
 1) A shortcut-taking choice like "Slip into the drain he pointed out"
 2) A remembering choice like "Fix the vanishing man's back in your memory"
 3) A wary choice like "Decline unexplained favors — find another way"
Important: this is an awakening/hook beat — never start combat. world_delta.start_combat must be null, and do not set met_han or any meeting flag (the meeting is completed by its arc on the operation map).

## REENTRY_SCENE2 (turn=1, label=REENTRY // DRAIN)
location_lock: Indoors, inside the drainage channel — a dark, narrow waterway
mandatory_event: Let a patrol drone pass overhead beyond the grate (no detection)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat, the man reappearing
flags:
start_combat:
---
REENTRY_SCENE2 (DRAIN): Inside the drainage channel. The man is already gone; what remains is ankle-deep rainwater and red patrol light leaking through the grate overhead. A drone's propellers pass right above — hold your breath and it moves on; hurry and the water sells you out. Show, through sensation only, where an unnamed favor leads and why this shortcut is on no control-net map. Stay with filmable detail (the water's chill, the drifting grate shadows, an old chalk mark on the wall); never explain.
Choice generation guide (no combat): 1) Kill the sound and wait out the patrol 2) Follow the chalk marks deeper 3) Push for the nearest exit

## REENTRY_SCENE3 (turn=2, label=REENTRY // SURFACE)
location_lock: Outdoors, back yard of the welfare block — the drain exit
mandatory_event: Return to the surface + find one trace the man left by the exit (no identity confirmed)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat
flags:
start_combat:
---
REENTRY_SCENE3 (SURFACE): The exit surfaces into the welfare block's back yard. The patrol has already passed — his math was right. On the inside of the cover, one more chalk mark, this time an arrow pointing deeper into the city. The one who left the favor exists only as traces. If Jung Se-rin appears at all, keep it to a distant sighting or a single line of rumor — no contact, dialogue, or rescue. Hand the flow off naturally to the operation map's route choices.
Choice generation guide: 1) Turn toward where the arrow points 2) Memorize the mark and go your own way 3) Sweep the area for another trace
