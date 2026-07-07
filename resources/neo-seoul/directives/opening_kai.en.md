# Neo-Seoul Opening Variant — Kai (Loop 2+ re-entry, 1 cut) — EN
header: === OPENING SCENE DIRECTIVE (RE-ENTRY VARIANT · HIGHEST PRIORITY) ===
max_turn: 3

## ONBOARDING_SCENE1 (turn=0, label=REENTRY // BACKDOOR SIGNAL)
location_lock: Outdoors, rainy C-17 neon alley — mouth of the scrapyard-level approach
mandatory_event: Re-entry awakening + receiving Kai's backdoor signal (no encounter, foreshadow only)
forbidden: Kai appearing in person, Jung Se-rin appearing, combat, setting any met_* flag, piling on new mystery bait
flags: 
start_combat: 
---
ONBOARDING_SCENE1 (REENTRY // BACKDOOR SIGNAL): This is a loop re-entry scene. The unregistered '{archetype}' signal — the protagonist — wakes again in a rainy C-17 alley, this time not with the shock of a fall but with the déjà vu of REPETITION. They can move, and they know this city is not new to them (recall one or two afterimages of past loops through the senses only — no exposition dump). The scene's mandatory event: a dead public terminal at the end of the alley **switches itself on**, and a scrambled voice leaks briefly through the static — a backdoor signal punched in from outside the control grid. The voice gives no name; it leaves only a single coordinate fragment pointing toward the scrapyard level and a warning on the order of "remember this if you don't want to be erased," then cuts out. Important: the signal's owner (Kai) does **not** appear in this scene. Do not complete any encounter, recruitment, or rescue — this scene only plants the hook. Jung Se-rin does not appear either. Focus on filmable sensations: the terminal's flicker, letters smearing in the rainwater, the afterhum of a severed signal. All narration and choices for this scene must be written in English.
Choice generation guide (no combat):
 1) A trusting choice like "Commit the coordinate fragment to memory"
 2) An investigative choice like "Scan the terminal's residual logs"
 3) A wary choice like "It could be a trap — ignore the signal and stay low"
Important: this is an awakening/hook beat — never start combat. world_delta.start_combat must be null, and do not set met_kai or any meeting flag (the meeting is completed by its arc on the operation map).

## REENTRY_SCENE2 (turn=1, label=REENTRY // TRACE)
location_lock: Outdoors, neon alley — moving along the coordinate bearing
mandatory_event: While moving toward the coordinates, receive a second signal with the same signature (a short rebroadcast; sender undisclosed)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat, Kai's name or appearance
flags:
start_combat:
---
REENTRY_SCENE2 (TRACE): You fold through the alleys along the coordinate bearing. A dead billboard flickers only in the moment you pass, and the deletion mark on your wrist reacts like a low fever — the signal recognizes you. The second rebroadcast is shorter and closer. Do not show the sender; render the presence only as the rhythm of the city's dead machines waking in one direction.
Choice generation guide (no combat): 1) Move on the rebroadcast's rhythm 2) Ignore the signal and detour by the main road 3) Pick one dead terminal and trace the signal back

## REENTRY_SCENE3 (turn=2, label=REENTRY // THRESHOLD)
location_lock: Outdoors, mouth of the disposal tier — where the signal dies
mandatory_event: Arrive at the coordinate point + the signal ends; confirm only the backdoor's entrance (sender's identity undisclosed)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat
flags:
start_combat:
---
REENTRY_SCENE3 (THRESHOLD): The coordinates end at a mouth descending into the disposal tier. The signal cuts off exactly here — the hand that left the door open never shows itself. What is open is a path, not the invitation's owner. If Jung Se-rin appears, distant sighting or rumor only. Hand the flow off to the operation map's route choices.
Choice generation guide: 1) Take in the mouth and step back 2) Examine the traces around the entrance 3) Memorize the coordinates and move by another route
