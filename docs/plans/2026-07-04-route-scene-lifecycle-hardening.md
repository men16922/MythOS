# Route Scene Lifecycle Hardening

Date: 2026-07-04

## Problem

Route scenes form a causal graph, but validation only checked whether a consumed
flag appeared somewhere. It did not check production order or self-dependency.
Consequences observed in live QA:

- `Restarting Kai` consumed `lin_yue_deal`, while the only authored producer was
  a Night Market perspective that required the same flag.
- 200 seeded route measurements produced `lin_yue_deal` 0 times.
- the runtime progress fallback could enter a visually locked anchor anyway.
- deleting a producer scene could leave downstream gates silently dead.
- a duplicated choice request advanced once, then returned `choice not found`.

## Contract

1. Every route anchor has a unique stable `beat` id.
2. Every hard `gate` has an engine/authored causal producer in an earlier layer.
3. A perspective selector must be available before that perspective resolves;
   its own effect cannot bootstrap its `when` condition.
4. A generated edge must retain an ungated forward option when one exists.
5. Runtime recovery may repair a stale graph edge, but never cross a locked node.
6. Choice requests carry the scene id and are idempotent when an old scene is
   submitted again.
7. Cross-loop relationship totals are hydrated at loop start without being
   double-counted at archive.

## Verification

- causal content validator runs from `load_scenario`, so bad authored data fails
  before route generation;
- add/delete/default/duplicate/self-cycle unit tests;
- seeded full/dynamic route measurement;
- locked-node runtime recovery test;
- duplicate REST/WS choice tests;
- cross-loop relationship round-trip test;
- `make check` and browser QA when a browser is available.
