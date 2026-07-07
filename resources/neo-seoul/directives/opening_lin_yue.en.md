# Neo-Seoul Opening Variant — Lin Yue (Loop 2+ re-entry, 1 cut) — EN
header: === OPENING SCENE DIRECTIVE (RE-ENTRY VARIANT · HIGHEST PRIORITY) ===
max_turn: 3

## ONBOARDING_SCENE1 (turn=0, label=REENTRY // BROKER'S NOTE)
location_lock: Outdoors, rainy back alley at the edge of the Han River Night Market
mandatory_event: Re-entry awakening + finding a commission note tucked into the tarp (no encounter, foreshadow only)
forbidden: Lin Yue appearing in person, Jung Se-rin appearing, combat, setting any met_* flag, piling on new mystery bait
flags: 
start_combat: 
---
ONBOARDING_SCENE1 (REENTRY // BROKER'S NOTE): This is a loop re-entry scene. The unregistered '{archetype}' signal — the protagonist — wakes this time in a back alley of the Han River Night Market, under a stall tarp, with the déjà vu of repetition; they know this city is not new to them (afterimages of past loops in one or two sensory fragments only). The scene's mandatory event: rising, they find a paper note **deliberately tucked** into a fold of the tarp. A short line in waterproof ink — "If you want work, come to the market. I pay fair. — L.Y." Pressed into the corner is a credit seal the market's money-changers use. Who left it, and how did they know you would wake HERE — that unsettling precision is the scene's tension. Important: the note's owner (Lin Yue) does **not** appear in this scene. Do not complete the encounter. Jung Se-rin does not appear either. Focus on filmable sensations: the texture of damp paper, the market's pre-dawn noise, a drone searchlight in the distance. All narration and choices for this scene must be written in English.
Choice generation guide (no combat):
 1) A commission-leaning choice like "Pocket the note and mark the way to the market"
 2) An investigative choice like "Study the credit seal to gauge the note's origin"
 3) A wary choice like "Could be a trap — drop the note and move on"
Important: this is an awakening/hook beat — never start combat. world_delta.start_combat must be null, and do not set met_lin_yue or any meeting flag (the meeting is completed by its arc on the operation map).

## REENTRY_SCENE2 (turn=1, label=REENTRY // MARKET)
location_lock: Outdoors, back alley of the Han River night market — moving between stalls
mandatory_event: A vendor's silence and glance that seem to recognize the note's gilt seal (no completed dialogue)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat, Lin-yue's name or appearance
flags:
start_combat:
---
REENTRY_SCENE2 (MARKET): You cut between the stalls of the night market's back alley. The moment the wet note comes half out of your pocket, the old man at the noodle stall sees the seal and lowers his eyes — the silence of someone who knows. No one asks; no one answers. Show the weight this seal carries in the market only through the chain of silences and glances. Let the two words — midnight, the bridge — grow heavy inside sensation.
Choice generation guide (no combat): 1) Order a bowl of noodles from the old man and wait 2) Hide the seal and measure the way to the bridge by eye 3) Read one more stall's reaction

## REENTRY_SCENE3 (turn=2, label=REENTRY // TAIL)
location_lock: Outdoors, the market's end — a riverside mouth with the bridge in view
mandatory_event: Confirm the bearing to the bridge + one presence tailing you (identity undisclosed, no contact)
forbidden: Re-enacting Se-rin's canonical first-contact beat (wrist grab / "Run" / bike rescue), setting met_se_rin/trusted_se_rin/refused_se_rin flags, confirming the silhouette's/sender's identity, starting combat
flags:
start_combat:
---
REENTRY_SCENE3 (TAIL): At the market's end the bridge's silhouette hangs over the river fog. There is still time before midnight — and one set of footsteps behind you stops three stalls back. When you turn, no one. Do not settle whether the commission called you or is testing you. Hand the flow off to the operation map's route choices.
Choice generation guide: 1) Let the footsteps' owner drift away and move 2) Change your approach to the bridge by a detour 3) Reread the note and check its terms
