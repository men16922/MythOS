# Project MythOS — Closed Beta Game Teaser V2 (English, ~2 minutes)

> **Purpose**: Present Project MythOS as a complete playable SF RPG — an AI Game Master,
> a living Neo-Seoul, companions, tactical combat, and consequences that survive the loop —
> not as an AI feature demo or a combat montage.
>
> **Capture build**: `mythos-api-00057-c2c` (combat overhaul + Codex art bundle).
> **Closed Beta sign-up**: https://docs.google.com/forms/d/e/1FAIpQLSfAbQWTge08B9fHnEJQL0QYMWeoQ6AD-tS6HFSYMJppEkjuww/viewform?usp=dialog
> **Runtime**: 1:50–2:00. Capture a 16:9 master; retain key characters and captions in the central safe area.
> **Capture rule**: use a clean tester key. Never expose the DEV tab or boot simulator visible with admin keys.

---

## 1. Core promise

> **Neo-Seoul remembers your choices. Choose the next story, protect your people, and fight for the outcome.**

| Pillar | What the viewer sees | What they should feel |
| --- | --- | --- |
| **World** | Rainy awakening, Night Market, underground echoes, incinerator, control spire, IX | “I want to enter this city.” |
| **AI Game Master** | A choice becomes narration, a scene, then the next fork | “The story responds to me.” |
| **People and loops** | Se-rin and other companions, changing routes, Echoes carried forward | “This run leaves a mark.” |
| **Tactical combat** | Intent, aiming, cover, statuses, grenades, collision damage, a four-person party | “I win by making the right call.” |

Combat is the strongest proof of gameplay, but it receives **about 30 seconds**. The rest establishes
why the fight matters and what the player carries away from it.

Avoid long generation/loading screens, static fallback combat, feature-list captions, empty boards, and
any staged result that cannot occur in the live build.

---

## 2. English title, thumbnail, and description

### Title options

1. **[Recommended] Neo-Seoul Remembers Your Choices | Project MythOS Closed Beta**
2. **An AI Game Master Tells the Story. You Command the Fight. | Project MythOS**
3. **A Sci-Fi RPG Where Every Choice Survives the Loop | Project MythOS CBT**

### Thumbnail

- Main image: `concept/00-project-mythos-main.png` or `scenes/ix_confrontation.png`.
- Small foreground overlay: a real four-person combat board, supporting the world rather than replacing it.
- Primary text: **“NEO-SEOUL REMEMBERS”**
- Secondary text: **“CHOICES · COMPANIONS · TACTICS”**
- Do not use AI logos, prompts, or dense stat UI.

### Video description (copy and paste)

```markdown
Join the Closed Beta:
https://docs.google.com/forms/d/e/1FAIpQLSfAbQWTge08B9fHnEJQL0QYMWeoQ6AD-tS6HFSYMJppEkjuww/viewform?usp=dialog

Project MythOS is a single-player browser-based sci-fi RPG where an AI Game Master carries your choices
into the next scene. In rain-soaked Neo-Seoul, you choose your route, build bonds with companions, and
take the consequences of each run into the next loop.

Combat is never handed to the AI. Read enemy intent, hit chance, damage forecasts, and blast ranges;
then command a four-person party through cover, status effects, grenades, and collision plays.

• AI-guided narrative scenes that react to your choices
• Routes, companions, and relationships across Neo-Seoul
• Deterministic tactical combat with intent, aiming, terrain, and status warfare
• Multiple endings, Run History, and Echoes that carry forward

Free · no install · browser play · English and Korean · roughly 30–60 minutes per run
```

### Tags

```text
Project MythOS, AI RPG, AI Game Master, sci fi RPG, cyberpunk RPG, story RPG, tactical RPG,
turn based combat, solo RPG, browser game, indie game, companions, roguelite loop, AI narrative,
closed beta, playtest
```

---

## 3. ElevenLabs narration script

Use the existing English narrator audition candidates: `George`, `Daniel`, or `Brian`.
The inline tags are for ElevenLabs `eleven_v3`; remove the tags for subtitles. This is one continuous
prompt (over 250 characters), with intentional pauses rather than constant voiceover.

```text
Neo-Seoul is falling. And somewhere beneath its rain, you wake up with no name. [pauses]

Every street has a price. Every signal has a history. In Project MythOS, an AI Game Master carries your choices forward — into the next scene, the next road, and the people who choose to stand beside you.

Choose a path. Earn a companion's trust. Decide what you are willing to lose. [pauses]

When danger arrives, the story gives way to your command. Read the enemy's next move. Take cover. Break their line. Turn one decision into the moment that changes the fight.

Because the outcome is yours. And when the fight is over, Neo-Seoul remembers. [pauses]

Choose the story. Protect your people. Survive the loop.

Project MythOS. Closed Beta now recruiting.
```

**Delivery direction**: calm, cinematic, and intimate at the beginning; restrained urgency during combat;
then widen into resolve for the final CTA. Do not read every caption. Let sound design and the game carry
the gaps between these lines.

---

## 4. Edit timeline — subtitles and narration in English

| Time | Footage / real resource | English subtitle | Narration cue |
| --- | --- | --- | --- |
| **0:00–0:08** | `opening/opening-01-serin-arrival.png` → `scenes/opening_escape.png` → `opening/opening-03-drone-chase.png`. Rain, alarm, Se-rin's arrival. | **“The city is falling. You wake up again.”** | “Neo-Seoul is falling…” |
| **0:08–0:18** | `concept/01-night-market.png` → `03-underground-echo.png` → `05-data-incinerator.png` → `02-control-spire.png`, intercut with their live locations. | **“Every road has a price.”** | “Every street has a price…” |
| **0:18–0:32** | A real three-choice prompt → selection → narration continues → `scenes/night_market.png` or `scenes/lin_yue_secret_request.png` appears. | **“Your choice becomes the next scene.”** | “An AI Game Master carries your choices forward…” |
| **0:32–0:43** | Route-map fork and horizon reveal → `kai_meet.png`, `su_ah_meet.png`, `han_meet.png`, `lin_yue_meet.png`. | **“Choose your path. Choose who to trust.”** | “Choose a path. Earn a companion's trust…” |
| **0:43–0:53** | `cutscenes/se-rin-first-light.png` or `se-rin-promise.png` → CHARACTER panel → the companion joins the real board. | **“They are more than stats.”**<br>**“They are why you survive.”** | “Decide what you are willing to lose.” |
| **0:53–1:03** | Combat entry; hold a streets/undercity/industrial/spire board for two seconds, then show enemy intent and danger cells. | **“When danger arrives, you take command.”** | “When danger arrives, the story gives way to your command.” |
| **1:03–1:16** | Enemy intent → aim preview → cover/support move → shove into a structure. Keep this as one understandable play. | **“Read the next move.”**<br>**“Make yours count.”** | “Read the enemy's next move. Take cover. Break their line.” |
| **1:16–1:27** | Grenade arc/range → incendiary or cryo blast → two status glyphs → skill cut-in → victory lineup and loot. | **“Cover. Range. Status. A four-person plan.”** | “Turn one decision into the moment that changes the fight.” |
| **1:27–1:38** | Return from combat to narrative → choice result / Stability and Pursuit change → `control_grid_ghost.png` or `blank_in_list.png`. | **“Every outcome returns to the story.”** | “Because the outcome is yours.” |
| **1:38–1:48** | `ix_confrontation.png` → two or three endings (`safe-refuge.png`, `code-rewrite.png`, `noble-sacrifice.png`) → Run History/Echo/next-loop boon. | **“What you save changes the ending.”**<br>**“Neo-Seoul remembers.”** | “And when the fight is over, Neo-Seoul remembers.” |
| **1:48–1:58** | Fast world → choice → companion → combat → ending montage. End on `concept/00-project-mythos-main.png` or a spire scene and a clean CTA card. | **“Choose the story.”**<br>**“Protect your people.”**<br>**“Survive the loop.”**<br>**“PROJECT MYTHOS — CLOSED BETA”**<br>Free · Browser · 30–60 min · Sign-up URL | “Choose the story… Project MythOS. Closed Beta now recruiting.” |

---

## 5. Capture and edit checklist

1. Record one uninterrupted **choice → narration → scene image** sequence.
2. Record a route fork, a companion encounter/cutscene, then that companion under direct command.
3. Record non-fallback combat (`?fallback=0`) with intent, aim preview, cover/support, collision, grenade,
   status effects, and a four-person victory lineup.
4. Use opening, concept, scene, cutscene, and ending art as transitions between real gameplay states — never
   as a long static slideshow.
5. Keep on-screen captions to one short sentence at a time. The narrator should support the footage, not
   explain every UI panel.
6. Cut a 35–45 second vertical version from **world hook → choice → tactical decision → CTA**, not from
   combat alone.
