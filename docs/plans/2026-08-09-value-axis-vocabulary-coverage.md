# Value-axis chip coverage vs precision — decision memo

Status: **Decided and shipped 2026-08-09** — owner adopted the recommendation
(traversal + sabotage + fight; `spoof → data` held). See "What shipped" below for
the three terms a per-term audit removed before implementation.
Date: 2026-08-09
Scope: `_AXIS_KEYWORDS` / `_choice_axis` in `src/mythos_api/serializers.py`
Decision owner: MythOS owner (NEXT_PLAN Priority 0, `[manual]` residual)

## Why this exists

The 2026-08-09 value-axis fix removed two fallbacks that invented an axis, which
closed the mislabelling (96/98 EN labels advertised "Help people") but left
40 of ~98 choices on the 08-08 arm showing **no** chip. The open question was
recorded as coverage vs precision with no evidence attached, so it could not
actually be decided: nobody knew whether those 40 were labels the vocabulary
*missed* or labels that genuinely advertise no value.

They are overwhelmingly the former, and they fall into a small number of
coherent families rather than being scattered.

## Measurement

Sample: all Director-authored choice labels in the three banked EN arms —
`prod-people-help-20260808`, `prod-people-help-20260728`,
`prod-evidence-safety-20260728` — **292 labels**. Junction (`route:`) labels are
excluded from the denominator because they do not go through `_choice_axis` at
all; they read the destination node's real axis (2026-07-19). Intent is held at
`interact`, the value these scenes carried; the bank does not store it.

Baseline: **100 chipless (34%)** — safety 68, data 75, people 25, control 24.

| Candidate family | Recovers | Reclassifies an already-chipped label |
| --- | --- | --- |
| traversal → safety (`sprint`, `squeeze`, `slide`, `scramble`, `climb`, `scale`, `leap`, `dive`, `dash`, `crawl`, `vault`, `descend`, `run`) | **47** | 1 |
| sabotage → control (`overload`, `sever`, `short out`, `reroute`, `blow`, `blackout`, `pry`, `wrench`, `kick`, `rip`) | **22** | 0 |
| fight → control (`ambush`, `stand your ground`, `draw your weapon`, `brace`, `fight`) | **6** | 0 |
| spoof → data (`spoof`, `splice`, `solder`, `interface`, `inject`, `decipher`) | 10 | 1 |

The single largest gap is not a judgment call: this scenario almost never phrases
an escape with the abstract verbs already in the list (`flee`, `evade`,
`retreat`). It phrases it as a body moving through a gap — *Sprint through the
searchlight gaps*, *Squeeze into the maintenance conduit*, *Slide under the
closing fire-door*. Those are safety choices by any reading, and 47 of them
currently render nothing.

## Recommendation

Adopt **traversal + sabotage + fight**. Hold `spoof → data`.

- chipless **100 → 27 (34% → 9%)**
- exactly **1** already-chipped label changes axis: *"Sprint across the shaking
  catwalk to manually jam the crane gears"* control → safety. The traversal verb
  wins because safety is tested before control in the ordered scan. It is a real
  precision cost and it is one label in 292.
- scenes where every choice shares one axis (08-08 arm): **14/45 → 11/45**, so
  the contrast the 08-09 fix bought is not given back.

`spoof → data` is held because the family's *axis* is contested, not its terms:
spoofing a sensor is either working the system through knowledge (data) or
forcing it (control), and the choice decides what the chip promises. It also
takes *"Splice into the local control junction to override the security gate"*
away from control, where `override` had put it correctly. Adding all four
reaches 19 chipless (7%) at 2 reclassifications — a worse trade for 8 labels.

## Residual after the recommended change

19 labels still render nothing. Reviewed individually, most are genuinely
axisless (salvage/loot: *"Quickly salvage the sparking drone wreckage"*;
navigation: *"Follow the chalk arrow toward the neon market block"*), which is
the correct outcome — but four expose a **people-axis noun gap** worth a separate
look: *"Lead the survivors through the unpowered maintenance tunnels"*, *"Pull
her into the dark drainage alcove"*, *"Offer the salvaged drone scrap to a market
guard"*, and *"Decline unexplained favors and seek another exit"* — the Se-rin
refusal itself. `survivor` is a clear miss; the others need pronoun or role
handling that risks the false positives the 08-09 fix exists to prevent.

## What shipped

The recommendation was accepted. Before writing the terms in, each one was
audited against the 292-label sample to see which labels it would actually
decide — the exploratory pass had only counted them. Three were dropped:

- **`brace`** produced a measured mislabel: *"Brace yourself against the concrete
  wall and try to ride out the electrical feedback loop"* is enduring, not
  imposing. Its one correct hit (*"Brace the maintenance doors and prepare to
  fight off the first wave"*) is caught by `fight` instead.
- **`run`** took *"Wrench the slate from her hands and run into the drainage
  system"* to safety, hiding the theft in it. Dropping it lets `wrench` read the
  same label as control, which is the better answer.
- **`draw your weapon`** had one hit — *"Draw your weapon and draw the drones'
  attention away from the civilians"* — which is a **people** choice. Shipping it
  would have introduced exactly the kind of wrong chip this track exists to
  remove.

`fight` is safe to carry broad only because safety is scanned before control, so
*"avoid the fight"* and *"flee the fight"* stay safety. That ordering dependency
is now pinned by a test.

Measured on the shipped vocabulary, same 292 labels: chipless **100 → 30
(34% → 10%)**, distribution safety 114 / data 75 / control 48 / people 25, and
exactly **one** already-chipped label changes axis (the predicted *"Sprint across
the shaking catwalk to manually jam the crane gears"*, control → safety).

Scene contrast, all three arms, scenes where every choice shares one axis:

| arm | before | after |
| --- | --- | --- |
| `prod-people-help-20260808` | 14/45 | **11/45** |
| `prod-evidence-safety-20260728` | 10/45 | **6/45** |
| `prod-people-help-20260728` | 4/44 | **5/44** |

The third arm is one scene **worse**, and that is the real cost of coverage: a
scene whose two choices were one chip and one blank now shows two chips on the
same axis, which the metric counts as no contrast. Net across the three arms is
28/133 → 22/133.

Locked by four tests in `tests/test_api.py` beside the existing axis family,
including the ordering dependency and all three rejected terms. `make check`
1268 (5 skipped).

## Boundary

Measured against banked transcripts by running the real classifier, not in a
browser. It predicts which chip renders, not whether the chip reads well
mid-play at 390px — that stays a feel verdict. The reproduction scripts are
scratch-only and not committed; the tables above are their output.
