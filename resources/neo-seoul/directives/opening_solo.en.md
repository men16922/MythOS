# Neo-Seoul Opening Variant — Solo (Loop 2+ re-entry, 1 cut) — EN
header: === OPENING SCENE DIRECTIVE (RE-ENTRY VARIANT · HIGHEST PRIORITY) ===
max_turn: 3

## ONBOARDING_SCENE1 (turn=0, label=REENTRY // NO HEADLIGHT)
location_lock: Outdoors, rainy C-17 neon alley — the same alley as the first loop
mandatory_event: Re-entry awakening + confirming the absence: the bike headlight that should come does not
forbidden: Jung Se-rin appearing, any substitute rescuer appearing, combat, setting any met_* flag, piling on new mystery bait
flags: 
start_combat: 
---
ONBOARDING_SCENE1 (REENTRY // NO HEADLIGHT): This is a loop re-entry scene. The unregistered '{archetype}' signal — the protagonist — wakes in **exactly the same alley as the first loop**, same rain, same neon — and KNOWS the repetition. The body remembers: by this moment, a bike headlight should be splitting the rain at the far end of the alley. The scene's mandatory event: **that headlight does not come.** However long you wait, the alley stays empty. Se-rin didn't come — the protagonist clearly registering this ABSENCE is the heart of the scene. Has the loop gone wrong, has something happened to her, or does this iteration run on different rules — give no answer, leave only the question. The drone searchlights still comb the alley, and this time there is no hand reaching down. The protagonist must stand up alone. Important: do not bring Jung Se-rin on stage, and do not invent a rescuer to replace her. Focus on filmable detail: the chill of absence, the empty end of the alley, the feel of a palm pushing off wet concrete unaided. All narration and choices for this scene must be written in English.
Choice generation guide (no combat, all choices framed as "starting alone"):
 1) A self-reliant choice like "Brace against the wall and stand up on your own"
 2) An absence-confirming choice like "Stare down the alley where Se-rin used to appear"
 3) A path-drawing choice like "Trace the searchlights' blind seams with your eyes"
Important: this is an awakening/absence beat — never start combat. world_delta.start_combat must be null, and do not set met_se_rin/refused_se_rin — this loop's Se-rin is "the one who didn't come."

## REENTRY_SCENE2 (turn=1, label=REENTRY // FIRSTCALL)
location_lock: Outdoors, C-17 neon alley — the first fork
mandatory_event: Make the first route call entirely alone (using one sensory fragment from the last loop)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat
flags:
start_combat:
---
REENTRY_SCENE2 (FIRSTCALL): The first fork. No one will pull you by the hand this time — instead one fragment of the last loop remains in your feet (the signal at this alley's end turns red half a beat late, that kind of thing). Let the call be made by what the body knows, not by memory recited. Fear and freedom share a temperature here. Do not introduce helpers or rescuers.
Choice generation guide (no combat): 1) Turn the way the body remembers 2) Read the patrol density by sound and move 3) Climb for a vantage and take the layout in

## REENTRY_SCENE3 (turn=2, label=REENTRY // OWNED)
location_lock: Outdoors, the blackout zone's edge — an exit you opened yourself
mandatory_event: Reach the blackout zone's edge unaided + pay one sensory cost for it (a scrape, a soaked shoe)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat
flags:
start_combat:
---
REENTRY_SCENE3 (OWNED): The edge of the blackout zone — the first exit you opened yourself. Make the cost of self-reliance payable in one sensation: a scraped palm, shoes soaked through. Show that arrival is not victory but a beginning, that the city's lights are now a map you must read alone. If Jung Se-rin appears, distant sighting or rumor only — this loop's reunion comes another way. Hand the flow off to the operation map's route choices.
Choice generation guide: 1) Read the light patterns and pick the next destination 2) Bind the scrape and find shelter 3) Confirm one thing that changed since the last loop
