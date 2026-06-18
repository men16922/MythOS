# Token/Context Optimization (overnight-harness repo porting)

> **This is a 2nd-person instruction sheet for the agent (Claude).** Paste this file into a
> repo that uses the overnight-harness and say "apply this." The agent reads **only this doc**
> and performs the conversion + gate wiring + verification itself. Self-contained — no network.
>
> Source: generalized from a measured rollout in Project MythOS (see §1).

## 0. What you'll do — at a glance

Cut the **fixed context cost** every session/overnight iteration pays before any task work:
(1) write agent-only operational docs in **English**, (2) hard-gate entry-doc growth, (3) make
the structure index the default broad search. Steps: **detect → convert → gate → promote → record → verify.**
Fill the `ADAPT:` slots for this repo; keep everything else verbatim.

## 1. Rationale (measured — decide before doing)

The entry docs (`brief`/`status`/`plan`/`log`) + `CLAUDE.md` + `harness/*` load on **every** session
and **every** overnight iteration. They're agent-only, yet often written in a language that costs
~1.5–2× tokens per character vs English. MythOS measured (tiktoken o200k): converted set
56,898 → 47,435 tokens (**-16.6%**, fixed-cost set -16.4%). The % is moderated because docs are
~half code identifiers/paths (token-neutral) — so **only convert if the docs carry real non-English prose.**
If they're already English or mostly code, skip §2 and keep just the gate (§3).

## 2. Convert agent-only operational docs to English

**Convert** (agent-only, low human-read): `CLAUDE.md`; `harness/*`; the engineering bibles +
interpretations; the `/sync` entry docs (`AGENT_BRIEF`/`STATUS`/`NEXT_PLAN`/`PROGRESS_LOG` — `ADAPT:` this
repo's filenames); skill **bodies** (`.claude/skills/*/SKILL.md`); `scripts/overnight/PROMPT*.md`; doc-policy/README.

**Keep native-language** (do NOT touch): product/narrative/user-facing content; any file injected into an
LLM that must answer in that language; human-run QA checklists; the agent↔user chat replies.

**Preserve verbatim while translating** (machine-consumed — never reword/translate): skill frontmatter
trigger keywords (invocation matching); status boxes `[x]/[/]/[ ]/[~]`; lane tags
`[auto]/[auto:claude|codex|agy]/[manual]/[blocked]`; the `▶ NEXT SESSION:` marker; forbidden-action
lists in `PROMPT*.md`; any literal a script greps for (check first: `grep -rn '\[' scripts/overnight/*.sh` for
markers a runner appends to a prompt); file paths, identifiers, `make` targets, commit/branch refs, metrics.

After editing skill bodies, re-project mirrors: `bash harness/sync-skills.sh` (edit only `.claude/skills/`, the SSOT).

## 3. Add the doc-budget gate (deterministic, offline)

Write `harness/check-doc-budget.sh` (`ADAPT:` paths + caps to this repo), `chmod +x`, and wire into
`make check` (add `$(MAKE) check-doc-budget` to the `check` target + a `check-doc-budget:` recipe calling it):

```bash
#!/usr/bin/env bash
# Enforce context-budget line caps on the entry docs (loaded every session/iteration).
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
check() { # path cap
  if [ ! -f "$1" ]; then echo "doc-budget: MISSING $1"; fail=1; return; fi
  local n; n=$(wc -l < "$1" | tr -d ' ')
  if [ "$n" -gt "$2" ]; then echo "doc-budget: OVER  $1 = ${n} (cap $2) — run /tidy-docs"; fail=1
  else echo "doc-budget: ok    $1 = ${n}/$2"; fi
}
check docs/AGENT_BRIEF.md  60   # ADAPT: filenames + caps
check docs/STATUS.md       120
check docs/NEXT_PLAN.md    120
check docs/PROGRESS_LOG.md 120
[ "$fail" -eq 0 ] && echo "doc-budget: OK" || { echo "doc-budget: FAIL"; exit 1; }
```

## 4. Promote Quarkify (only if this is a large codebase)

Make broad symbol/structure search **default** to the `.quarkify/src` index, grep reserved for rare
literals — state it in `harness/CORE_MANDATES.md §5`/`CLAUDE.md` and add one line to the overnight `PROMPT`.
Do **not** gate it (optional local accelerator). To install Quarkify itself, follow `quarkify-port.md`.
Skip entirely for small/sparse repos (grep is cheaper there).

## 5. Record + verify

- Record the choice in the repo's decision log: *operational docs = English; user/narrative content = native.*
- `make check` green (incl. `check-skills` mirror drift + new `check-doc-budget`); confirm a native-language
  skill trigger still fires its skill; confirm no script greps a translated literal.
- Measure: `pip install tiktoken` then count `len(enc.encode(text))` (`o200k_base`) over the converted set,
  before (`git show HEAD:<f>`) vs after. Record the delta. **Don't use `wc -m`/char counts** — they rise on
  English even as tokens fall, and mislead across languages.
