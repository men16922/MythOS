// Mythos 2.0 — Signal+ quest journal and companion approval (engine/crpg.ts questLog / approvals).
import type { ContentRegistry, Lang, RunState } from '../../engine/types.ts'
import { approvals, COMBAT_MOD_TEXT } from '../../engine/crpg.ts'
import { tr } from '../common/lang.ts'
import { Modal } from '../components/Modal.tsx'

export function QuestLog({ run, C, lang, onClose }: { run: RunState; C: ContentRegistry; lang: Lang; onClose: () => void }) {
  const ko = lang === 'ko'
  const quests = (C.crpg ? Object.entries(run.crpg?.quests ?? {}) : [])
    .map(([id, stage]) => ({ q: C.crpg?.quests[id], stage }))
    .filter((x) => x.q && x.stage > 0)
  const bg = run.crpg?.background ? C.crpg?.backgrounds[run.crpg.background] : undefined
  const next = run.crpg?.nextCombat ?? []
  return (
    <Modal onClose={onClose} title={ko ? '임무 일지' : 'Journal'}>
      <div className="m2-journal">
        {bg && (
          <p className="m2-journal__bg">
            <b>{tr(bg.name, lang)}</b> — {tr(bg.text, lang)}
          </p>
        )}
        {quests.length === 0 ? (
          <p className="m2-journal__empty">{ko ? '아직 맡은 일이 없다.' : 'Nothing on your plate yet.'}</p>
        ) : (
          <ul className="m2-journal__quests">
            {quests.map(({ q, stage }) =>
              q ? (
                <li key={q.id}>
                  <b>{tr(q.title, lang)}</b>
                  <p>{tr(q.stages[Math.min(stage, q.stages.length) - 1], lang)}</p>
                  {q.payoff && stage === q.payoff.stage && (
                    <small className={(run.crpg?.payoffsUsed ?? []).includes(q.id) ? 'is-used' : 'is-ready'}>
                      {(run.crpg?.payoffsUsed ?? []).includes(q.id) ? (ko ? '보스전에서 쓰였다: ' : 'Spent on a boss fight: ') : ko ? '다음 보스전: ' : 'Next boss fight: '}
                      {tr(q.payoff.text, lang)}
                    </small>
                  )}
                </li>
              ) : null,
            )}
          </ul>
        )}
        {next.length > 0 && (
          <p className="m2-journal__next">
            {ko ? '다음 전투: ' : 'Next fight: '}
            {next.map((m) => tr(COMBAT_MOD_TEXT[m], lang)).join(' · ')}
          </p>
        )}
        <ul className="m2-journal__approval">
          {approvals(run).map(({ id, value }) => (
            <li key={id}>
              <span>{tr(C.companions[id]?.name, lang)}</span>
              <span className={`m2-mono ${value > 0 ? 'is-good' : value < 0 ? 'is-bad' : ''}`}>
                {value > 0 ? `+${value}` : value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
