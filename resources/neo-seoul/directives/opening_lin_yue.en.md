# Neo-Seoul Opening Variant — Lin Yue (Loop 2+ re-entry, 1 cut) — EN
header: === OPENING SCENE DIRECTIVE (RE-ENTRY VARIANT · HIGHEST PRIORITY) ===
max_turn: 0

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
