# Neo-Seoul Stat-Voice Directives (English)
#
# English variant of stat_voices.md: stat-based inner-monologue (Disco Elysium style)
# directive prose. scenario_context picks the player's min/max stat (selection logic
# stays in code) and fills the templates below into the narrative notes. Loaded for
# language="en" via load_scenario_directives(..., "en"); falls back to stat_voices.md
# (Korean) when absent. Tune the prose only here.

header: === STAT-BASED INNER MONOLOGUE (DISCO ELYSIUM STYLE) ===

## stat (id=strength)
name: Strength
---
The bruiser — a huge, male-bodied voice of muscle: belligerent, simple, and loyal. It craves physical destruction and forcing a way through, shoving you on in blunt, coarse slang ("Smash it", "Go straight through", "Don't flinch"). Example: "Quit overthinking. That damned security panel — drive your fist through it and break it. Metal is made to break."

## stat (id=intelligence)
name: Intellect
---
A cold, genderless AI-analyst voice. Detached and arrogant, it reduces everything to probability and optimization, speaking only in dry, machine-formal register (percentages, clipped declaratives). Example: "The target system's malfunction cycle is 4.2 seconds. Entering via the bypass optimizes detection probability to under 12%. Emotional judgment is not advised."

## stat (id=charisma)
name: Charisma
---
A soft female voice — like a warm, teasing older sister who reads the psychology behind every mask. She lilts in gentle, playful colloquialism ("isn't it?", "why not try...", "come on"), coaxing you to open people up. Example: "See how her eyes waver? Don't shove her away — offer a warm look in the rain instead. She'll open right up, sweetie."

## stat (id=agility)
name: Agility
---
A jittery, fearful boy's voice of pure reflex. It reacts on instinct, and the moment it senses danger it panics and hurries you along in short, exclamatory commands ("Run!", "Now!", "Duck!"). Example: "Hear the rotor overhead?! Hesitate and you're done — three, two, one, dive into the dark RIGHT NOW!"

## stat (id=perception)
name: Observation
---
An old, calm observer's voice — dogged and cynical, catching the faint traces and wrongness everyone else misses. It narrates dryly, without emotion ("...is off", "...detected"). Example: "The neon sign's spark cycle isn't regular. A vibration that breaks the pattern — an eavesdropping module hidden behind it, detected."

## max_template
---
The stat inner-voices must appear ONLY when this turn's choices actually gate on that stat — the (Strength)/(Intellect)/(Charisma)/(Agility)/(Observation) tag at the end of a choice label is the signal. Stats not checked by this turn's choices stay silent; do not force them in. When a voice does speak, follow its gender, personality, and speech style from the STAT VOICE REFERENCE above so each is clearly distinct, and express it in parenthetical notation, e.g. (Strength: ...) or (Charisma: ...). For reference, the player's strongest trait is {name} (value: {value}), so that stat's voice sounds competent and confident.

## min_template
---
The player's weakest trait is {name} (value: {value}). Only when that stat is gated by a choice this turn, let its voice — keeping its persona's speech style — appear only very occasionally as immature, misjudged, timid, or listless advice. e.g. ({name_first}: ...)
