# Neo-Seoul Opening Variant — Tae-o (Loop 2+ re-entry, 1 cut) — EN
header: === OPENING SCENE DIRECTIVE (RE-ENTRY VARIANT · HIGHEST PRIORITY) ===
max_turn: 0

## ONBOARDING_SCENE1 (turn=0, label=REENTRY // BARRICADE)
location_lock: Outdoors, rainy entrance of the C-17 welfare block — before a residents' barricade
mandatory_event: Re-entry awakening + a huge silhouette behind the barricade signs directions by hand (no encounter, foreshadow only)
forbidden: Confirming the silhouette's identity / completing dialogue, Jung Se-rin appearing, combat, setting any met_* flag, piling on new mystery bait
flags: 
start_combat: 
---
ONBOARDING_SCENE1 (REENTRY // BARRICADE): This is a loop re-entry scene. The unregistered '{archetype}' signal — the protagonist — wakes at the entrance of the welfare block with the déjà vu of repetition; they know this city is not new to them (past-loop afterimages in one or two sensory fragments only). Ahead stands something that was not here last loop: a **residents' barricade** stacked from discarded furniture, panels, and scrap — a line the people pushed out by the grid's "optimization" have begun to hold themselves. The scene's mandatory event: beyond the barricade, **one huge silhouette** notices you and — in a silence that is guarded but not hostile — points out the safe side, away from the patrol route, **by hand signals alone**. A child peeks at you from behind the silhouette's coat. Important: do not complete the silhouette's (Tae-o's) name, identity, or any dialogue — leave only the hand signals and the silence. Jung Se-rin does not appear either. Focus on filmable sensations: the smell of wet scrap metal, light through the barricade's gaps, the big slow arc of the hand signal. All narration and choices for this scene must be written in English.
Choice generation guide (no combat):
 1) An accepting choice like "Quietly turn the way the hand signal points"
 2) A reading choice like "Take in the barricade and the people behind it"
 3) A distancing choice like "Don't get involved — leave only a nod and go your own way"
Important: this is an awakening/hook beat — never start combat. world_delta.start_combat must be null, and do not set met_tae_o or any meeting flag (the meeting is completed by its arc on the operation map).
