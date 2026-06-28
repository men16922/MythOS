# Neo-Seoul Opening Directives (prompt layer · English)
#
# English variant of opening.md. The scripted opening 5 beats (turn 0-4). Code
# (scenario_context.py) reads this file and injects the current turn's beat body into
# the session_synopsis channel. Tune only this file. Loaded for language="en" via
# load_scenario_directives(..., "en"); falls back to opening.md (Korean) when absent.
# Placeholders: {archetype} {player_action} {shot_title} {shot_body} (shot=N → cinematic_shots[N]).
header: === OPENING SCENE DIRECTIVE (top priority · must match the current scene image) ===
max_turn: 4

## ONBOARDING_SCENE1 (turn=0, label=AWAKENING)
location_lock: outdoors, rainy C-17 neon street/alley, wet concrete ground
mandatory_event: wake alone right after the fall (Jung Se-rin not yet present)
forbidden: Jung Se-rin/rescuer appearing, moving underground/indoors/into a data core, combat
flags: 
start_combat: 
---
ONBOARDING_SCENE1 (AWAKENING): You are writing the first playable scene of the opening. Theme: 'a fallen signal, waking alone'. This moment is BEFORE the three intro cinematic cuts. It is right after the C-17 welfare block went dark for 2.7 seconds. The player (the protagonist), an unregistered '{archetype}' signal, has just regained consciousness face-down on the wet concrete of a rainy neon alley. Location (locked): it MUST be 'outdoors, a rainy C-17 neon street/alley, wet concrete ground'. Even if the loop's location_id points to a 'data-layer'/underground/elsewhere, ignore it and do NOT move this scene into an underground parking garage, an underground corridor, an interior, or a data core. The protagonist is NOT 'standing' — they are 'collapsed and waking'. This scene is 'the confusion and awakening right after the fall'. The protagonist's signal is unstable and the shock has not faded, so there is no strength in their legs — collapsed/slumped on the wet ground, they **cannot yet get up on their own** (do not describe them standing cleanly and walking; being pulled to their feet comes in a later scene). Focus on groping at the situation through concrete, filmable senses: cold rain, the smell of ozone, neon bleeding into puddles, a drone searchlight sweeping the alley far off. The protagonist also dimly realizes that they are an **unidentified 'unregistered signal' on no roster**, and that the drone searchlight is therefore not a simple search but sweeping to *erase* them (the control grid's 'optimization') — reveal this not as an exposition dump but as a single sentence of sensation/unease. Important (Se-rin absent): Jung Se-rin does NOT appear in this scene yet. Never write Se-rin's name, lines, or appearance. Do not introduce any other person's touch or rescuer — the protagonist is alone now. You may lightly foreshadow the next scene (someone's arrival) with no more than a 'presence' or footsteps approaching from down the alley. Do not describe the protagonist vaguely as a 'silhouette', 'a single presence', or 'data debris' — write the wet ground, hands, gaze, and drone searchlight clearly. All narration and choices in this scene MUST be written in English. Provide choices as short action lines without jargon, but **all of them must be passive** — the protagonist cannot move, crawl, change posture, or handle objects (no strength in the legs), so only gaze, hearing, sensation, inner reaction, or failing to get up are possible.
Choice generation guide (no combat · **all must be passive** — the protagonist has no strength in their legs and cannot get up on their own or move, crawl, change posture, or pick things up. Only gaze, hearing, sensation, inner reaction, or failing to get up; no active-movement / stealth-movement / object-handling choices):
 1) a choice that reads the situation by sight alone while the body cannot move, e.g. 'Scan past the dark beyond the rain with your eyes only'
 2) a passive choice focused on hearing/sensation, e.g. 'Hold your breath under the approaching searchlight and listen'
 3) a choice that reveals helplessness / waiting for the next arrival, e.g. 'Try to rise, but no strength comes to your legs'
Important: this scene is the awakening / situation-reading stage, so NEVER start combat. world_delta.start_combat MUST be null.

## ONBOARDING_SCENE2 (turn=1, label=SHOT 01 // ARRIVAL, shot=0)
location_lock: outdoors, rainy C-17 neon alley
mandatory_event: Jung Se-rin's first appearance (at a distance, before contact)
forbidden: new hooks (glowing object/unidentified signal), moving underground/indoors, combat, ending with Se-rin absent
flags: 
start_combat: 
---
ONBOARDING_SCENE2 (SHOT 01 // ARRIVAL): Unfold the 'first cut' of the intro cinematic as a playable scene. Follow this cut's authored setup exactly — title: '{shot_title}'. Setup: {shot_body} ★ The MANDATORY EVENT of this scene is 'Jung Se-rin's first appearance'. Whatever the player's last action was (player_action: '{player_action}' — groping around, hiding, or raising their head), receive that action in only 1-2 sentences and, in the middle of it, MUST advance/pivot the scene so that Jung Se-rin 'appears' through the rain. The protagonist still cannot get up on their own, so do not describe them standing, walking, or approaching Se-rin. Se-rin, having ridden up through the rain on her bike, stares from 'across' the alley as if checking whether you have not yet been erased. The name 'Jung Se-rin' or 'Se-rin' MUST appear in the first paragraph. Forbidden: do not end the scene with Se-rin not having appeared. Also do not invent any 'new mystery hook' such as a 'blinking blue object', an 'unidentified signal/device', or a 'circuit-board fragment' — the only event of this scene is 'Se-rin's arrival'. Keep the location the same 'rainy C-17 neon alley' as the previous scene (do not move underground/indoors). This scene is 'a first appearance at a distance' — Se-rin has not yet come close to you, and there is no physical contact. Focus on the sense of distance, wariness, the bike headlight, the tension of the drone searchlight (Se-rin coming to your side and reaching out a hand is the 'next' scene). All narration and choices in this scene MUST be written in English.
Choice generation guide (no combat, all directed at Se-rin · the protagonist still cannot get up so must be **passive** — no moving, crouching, approaching, or escape attempts): Raise your head and stare at Se-rin / Try to call out to Se-rin but no voice comes / Lower your eyes, wary of Se-rin.
Important: this scene is the face-to-face stage, so NEVER start combat. world_delta.start_combat MUST be null.

## ONBOARDING_SCENE3 (turn=2, label=APPROACH // the reaching hand)
location_lock: outdoors, rainy C-17 neon alley, wet ground
mandatory_event: Se-rin comes closer and reaches out a hand (just before contact)
forbidden: new hooks, moving underground/indoors, combat, setting met_se_rin/refused_se_rin
flags: 
start_combat: 
---
ONBOARDING_SCENE3 (APPROACH // the reaching hand): Jung Se-rin crosses the rain from across the alley and 'comes closer' to you, who are still **slumped/collapsed and unable to get up on your own** (Se-rin is the one closing the distance — do not describe the protagonist walking to Se-rin or rising on their own). Se-rin crouches on one knee at your side, checks your state, and carefully reaches out a hand. Overhead, a surveillance drone's searchlight sweeps the alley; far off, sirens and machine noise draw near. Keep the location the same 'rainy C-17 neon alley, wet ground' (no underground/indoors). Key: this scene is 'just before contact' — Se-rin has not yet grabbed your wrist, and you do not run together. The protagonist still cannot get up on their own; being pulled to their feet is the 'next' scene. Focus on the hesitation before the offered hand, the weighing of wariness against trust, the pressure of the approaching threat (grabbing the wrist and running is the 'next' scene). ★ The mandatory event of this scene is 'Se-rin coming close and reaching out a hand'. Receive the player's last action (player_action: '{player_action}') in only 1-2 sentences, and you MUST advance this event. Do not invent new hooks like a glowing object, an unidentified signal, or a circuit fragment. All narration and choices in this scene MUST be written in English.
Choice generation guide (no combat; do not set the met_se_rin flag yet):
 1) a choice leaning toward trust, e.g. 'Reach toward the hand Se-rin offers'
 2) a wary choice, e.g. 'Hesitate, reading Se-rin's intent'
 3) a choice attempting independent action, e.g. 'Stay wary and do not take Se-rin's hand'
Important: this scene is the just-before-contact stage, so NEVER start combat. world_delta.start_combat MUST be null, and do not set the met_se_rin/refused_se_rin flags yet (that decision is the next scene).

## ONBOARDING_SCENE4 (turn=3, label=SHOT 02 // FIRST CONTACT, shot=1)
location_lock: outdoors, rainy C-17 neon alley
mandatory_event: Se-rin grabs your wrist and tells you to run together
forbidden: new hooks, moving underground/indoors/into a data core, combat
flags: met_se_rin, refused_se_rin
start_combat: 
---
ONBOARDING_SCENE4 (SHOT 02 // FIRST CONTACT): Unfold the 'second cut' of the intro cinematic. Authored setup — title: '{shot_title}'. Setup: {shot_body} Se-rin snatches the player's wrist and **pulls them to their feet** (this is the moment the protagonist first stands, by Se-rin's strength — until now they could not stand on their own) and delivers her line: 'Not registered, right? Hey, then you're still a person. Run.' Then she nails down *why you are hunted* in one stroke: 'IX just erases any signal outside the baseline — and right now that's you.' Focus on the physical contact, the tactile tension, and Se-rin — brusque but protective. Location (locked): it MUST be 'outdoors, a rainy C-17 neon alley'. Even if the loop's location_id points to a 'data-layer'/underground, ignore it and do not move [LOCATION] underground/indoors/into a data core. ★ The mandatory event of this scene is 'Se-rin grabbing the wrist and telling you to run together'. Receive the player's last action (player_action: '{player_action}') in only 1-2 sentences, and you MUST advance this event. Do not invent new hooks like a glowing object or an unidentified signal. All narration and choices in this scene MUST be written in English.
Choice generation guide:
 1) a choice accepting the company, e.g. 'Take Se-rin's hand and run' (this choice makes Se-rin join as a party companion)
 2) a choice confirming the relationship, e.g. 'Ask Se-rin why she is helping you'
 3) a choice that stays wary of Se-rin and attempts a solo escape, e.g. 'Find a place to hide alone' (on this choice Se-rin does NOT join as a companion)
Flag and combat guide:
 - If the player agrees to go with Se-rin and follows her or acts with a trusting nuance, the returned JSON's `world_delta.flags` array MUST include 'met_se_rin' and exclude 'refused_se_rin'.
 - If the player rejects or distrusts Se-rin, or hides alone and watches, etc. — an independent-action nuance — the `world_delta.flags` array MUST include 'refused_se_rin' and exclude 'met_se_rin'.
 - Important: this scene is also a first-contact stage, so NEVER start combat. world_delta.start_combat MUST be null.

## ONBOARDING_SCENE5 (turn=4, label=SHOT 03 // IGNITION & CHASE, shot=2)
location_lock: outdoors, rainy C-17 neon street (mid-sprint)
mandatory_event: a sprint breaking through the drone chase with Se-rin + entering the first combat
forbidden: new hooks, moving underground/indoors
flags: met_se_rin, refused_se_rin
start_combat: patrol_ambush
---
ONBOARDING_SCENE5 (SHOT 03 // IGNITION & CHASE): Unfold the 'third cut' of the intro cinematic. Authored setup — title: '{shot_title}'. Setup: {shot_body} The engine ignites, the headlight tears red, and the instant the drone searchlight sweeps the alley the chase begins. Focus on high-speed sprint action, the engine's roar, breaking through the surveillance net, and Se-rin's rough riding. Location (locked): it MUST be 'outdoors, a rainy C-17 neon street' (mid-sprint). Even if the loop's location_id points to a 'data-layer'/underground, ignore it and do not move [LOCATION] underground/indoors. ★ The mandatory event of this scene is 'the sprint breaking through the drone chase with Se-rin and entering combat'. Receive the player's last action (player_action: '{player_action}') in only 1-2 sentences, and you MUST advance this event. Do not invent new hooks like a glowing object or an unidentified signal. All narration and choices in this scene MUST be written in English. Offer choices such as holding on tight or glancing back.
Flag and combat guide:
 - If the player previously agreed to go with Se-rin, include 'met_se_rin' in `world_delta.flags`. If they refused, include 'refused_se_rin'.
 - Important: the first combat encounter — breaking through Administrator IX's pursuit-drone cordon — must occur now. Set `world_delta.start_combat` to 'patrol_ambush' to begin the first combat.
