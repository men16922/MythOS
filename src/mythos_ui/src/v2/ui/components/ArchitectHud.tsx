// Mythos 2.0 — Architect HUD: an opt-in (`?hud=1`) inspector for judges and developers. It shows what the backend is
// doing without changing play: how each AI GM call ended and how long it took (the authored line is already on screen
// at 0 ms; a model line swaps in later), the AI allowance, the run's seed and named RNG streams, and how many steps of
// a daily run are logged for the server's replay check. Never shown by default; collapsible to a small tab.
import { useState, useSyncExternalStore } from 'react'
import type { RunState } from '../../engine/types.ts'
import { streamScope } from '../../engine/streams.ts'
import { aiCalls, subscribeAiCalls, summarize, type CallOutcome } from '../common/telemetry.ts'
import { replayLogFor } from '../replay/record.ts'
import { usePlan } from './plan.ts'
import './architectHud.css'

const OUTCOME_LABEL: Record<CallOutcome, string> = { llm: 'LLM', fallback: 'server fallback', local: 'local (0 ms)', off: 'AI off' }

export function ArchitectHud({ run }: { run: RunState | null }) {
  // Phones start folded to the tab: the panel would sit over the scene.
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 560)
  const calls = useSyncExternalStore(subscribeAiCalls, aiCalls, aiCalls)
  const plan = usePlan()
  if (!open) {
    return (
      <button type="button" className="m2-hud m2-hud--tab" onClick={() => setOpen(true)} data-testid="architect-hud">
        HUD
      </button>
    )
  }
  const sum = summarize(calls)
  const streams = run?.streams ? Object.keys(run.streams).length : 0
  const replay = run && typeof run.daily === 'string' ? replayLogFor(run.id) : null
  const b = plan.budget
  return (
    <aside className="m2-hud" data-testid="architect-hud" aria-label="Architect HUD">
      <header className="m2-hud__head">
        <b>ARCHITECT HUD</b>
        <button type="button" onClick={() => setOpen(false)} aria-label="Collapse">
          –
        </button>
      </header>
      <dl className="m2-hud__grid">
        <dt>AI calls</dt>
        <dd>
          {sum.total} · LLM {sum.llm}
          {sum.total ? ` (${Math.round((100 * sum.llm) / sum.total)}%)` : ''}
        </dd>
        <dt>LLM median</dt>
        <dd>{sum.medianLlmMs === null ? '—' : `${sum.medianLlmMs} ms (authored line at 0 ms)`}</dd>
        <dt>Allowance</dt>
        <dd>
          {plan.features.includes('ai') ? (b.unlimited ? 'admin · unlimited' : `${plan.tier}${plan.demo ? ' · demo' : ''} · ${Math.round(b.left * 100)}% left`) : 'no AI (signed out)'}
        </dd>
        {run && (
          <>
            <dt>Run seed</dt>
            <dd>
              {run.seed} · {streams} named streams used · now {streamScope(run)}
            </dd>
            <dt>Replay</dt>
            <dd>{typeof run.daily === 'string' ? (replay ? `${replay.steps.length} steps logged` : 'not recorded here') : 'daily runs only'}</dd>
          </>
        )}
      </dl>
      <ol className="m2-hud__calls">
        {calls.slice(0, 6).map((c) => (
          <li key={c.id} className={`is-${c.outcome}`}>
            <span>
              {c.route}·{c.kind}
            </span>
            <span>
              {OUTCOME_LABEL[c.outcome]}
              {c.outcome === 'off' ? '' : ` · ${c.ms} ms`}
            </span>
          </li>
        ))}
        {calls.length === 0 && <li className="is-empty">no AI calls yet</li>}
      </ol>
    </aside>
  )
}
