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
An instinctive, rough, physical voice that craves destruction and bodily survival. It speaks in blunt, coarse imperatives and goads toward physical confrontation and forcing a way through. Example: "Drive your fist through that damned security panel and break it! Metal is made to be broken."

## stat (id=intelligence)
name: Intellect
---
A cold, analytical voice of computation that pursues logic, data, and system optimization. It is rigorously logical and dry. It gives analytical advice. Example: "The target security system's malfunction cycle is 4.2 seconds. Entering through the bypass optimizes the detection probability to under 12%."

## stat (id=charisma)
name: Charisma
---
An emotional, sociable voice of empathy that reads people's psychology and the truth behind their masks. It speaks warmly, gently, or with a playful, colloquial lilt, empathizing with and steering others' feelings. Example: "Her eyes are wavering, anxious. Instead of coldly shoving her away, why not offer a warm look in the rain? It'll open her up."

## stat (id=agility)
name: Agility
---
A quick, jittery voice of reflex that urges evasion, escape, and threat detection. Its breath is short and hurried; it leans on urgent imperatives and exclamation marks to push you to move right now. Example: "Hesitate and it's over! Move the instant your body reacts — three, two, one, run now!"

## stat (id=perception)
name: Observation
---
A sharp voice of the senses that catches faint traces, unseen signals, and hidden details. It is descriptive, fine-grained, and objective, pointing out the surroundings' concealed details and what feels off. Example: "The faint spark from the neon sign on the wall isn't regular. It suggests an illegal eavesdropping module hidden behind the sign."

## max_template
---
The player's strongest trait is {name} (value: {value}). During scene description or narrative development, often weave in the following voice naturally as an Inner Monologue or inner dialogue heard inside the player's head. This voice must strictly follow the stat's own tone and speech rules (the style of the example) and must be clearly distinct in voice from the other stats:
 - {name}: {voice}
Express this voice using parenthetical notation. e.g. (Strength: ...) or (Intellect: ...)

## min_template
---
The player's weakest trait is {name} (value: {value}). Let the inner voice corresponding to this trait appear only very occasionally, through parenthetical notation, as immature, forced, misjudged, timid, or as listless advice born of deficiency. e.g. ({name_first}: ...)
