# PROMPT_ENGINEERING — agent/LLM prompt design (bible)

> **General concept doc (bible).** This repo's application (iteration prompt · narrative prompt) is → [`mythos/PROMPT.md`](mythos/PROMPT.md).

## Definition
Engineering that **constrains and steers** agent/LLM behavior **via prompts**. There are usually two layers —
① **harness prompt** (the fixed procedure an agent runs each iteration) ② **runtime/domain prompt** (the request a product feature makes to the LLM).

## 1. Harness Iteration Prompt
Bake the fixed per-iteration procedure of the unattended loop into a prompt:
- Standard procedure: restore state → recover leftovers → pick one task → implement + gate → record → commit.
- Per-engine branching: split the prompt per engine capability (skill-call possible/not, sandbox or not) even for the same procedure.
- **Don't leave boundaries to the prompt alone — promote what you can to a deterministic gate** (Feedback Ladder, `HARNESS_ENGINEERING §2`).
  Prompt prohibitions are a last resort (only what the sandbox can't block). Explicitly forbid fabricate (passing the gate with fake artifacts).

For stronger long-horizon models, keep the prompt **lean and outcome-oriented**:

- State the work contract once: goal, scope, success/evidence criteria, autonomy boundary, budget, and stopping rule.
- Name the current layer (`research|design|implementation|review|external`) so the model does not silently change work type.
- On continuation turns, send only the checkpoint delta and next action; do not resend the full original prompt.
- Keep retries, claims, approvals, timeouts, and final completion authority in the external controller, not prose.
- Remove instructions one group at a time and rerun representative evals; model capability is not a license for a blind rewrite.

## 2. Runtime/Domain Prompt — reliability patterns
| Pattern | Content |
| --- | --- |
| **Structured output** | Receive a schema (JSON etc.), not free text, and bake in limits (length · item count · allowed keys). |
| **Model division** | Splitting generation (free text, large model) from structuring (parsing, small model) is more stable. |
| **repair → fallback** | On parse failure, one repair retry → on repeated failure, a **deterministic fallback** (user-visible/safe action). |
| **context selection** | Don't inject the full knowledge base; only relevant snippets + a rolled-up summary (prevents context bloat · cost · drift). |

## 3. Tone/register rules are a calibrated feel domain
Prose tone, register, and repetition suppression cannot be fully frozen into a deterministic gate. Keep the rules as docs,
use rubric/pairwise judges to prefilter and prioritize, calibrate them against human labels, and keep the final product-taste
authority human. Repetition is often a real problem, so suppress it via prompt guidance + a window of immediately-preceding context.

## 4. Sibling Concepts (bible)
- Higher harness: [`HARNESS_ENGINEERING.md`](HARNESS_ENGINEERING.md) · loop: [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md)
- Multi-agent: [`AGENTIC_ENGINEERING.md`](AGENTIC_ENGINEERING.md) · context: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md)
- This repo's application: [`mythos/PROMPT.md`](mythos/PROMPT.md)
