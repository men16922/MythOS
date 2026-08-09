# Value-axis chip coverage vs precision — decision memo

Status: Measured, awaiting owner decision. No code changed.
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

## Boundary

Measured against banked transcripts by running the real classifier, not in a
browser. It predicts which chip renders, not whether the chip reads well
mid-play at 390px — that stays a feel verdict. The reproduction scripts are
scratch-only and not committed; the tables above are their output.
