// Mythos 2.0 — the character sheet (CRPG C+2): who the connector is this run — archetype, background, stats and
// what each does in a fight, the four choice axes, the Signal Burst, and the crew with bond, approval and the
// first impression they formed. Read-only; opened from the top bar portrait.
import { REP_TIER, repTier } from '../../engine/crpg.ts'
import type { ChoiceAxis, ContentRegistry, Faction, FirstImpression, Lang, RunState, StatKey } from '../../engine/types.ts'
import { portrait } from '../common/assets.ts'
import { L, tr } from '../common/lang.ts'
import { companionSprite } from './format.ts'
import { HpBar } from './HpBar.tsx'
import { Modal } from './Modal.tsx'
import { statPerkLines } from './statPerkLines.ts'
import './sheet.css'

interface Props {
  run: RunState
  C: ContentRegistry
  lang: Lang
  onClose: () => void
}

const STAT_NAME: Record<StatKey, ReturnType<typeof L>> = {
  str: L('근력', 'Strength'),
  agi: L('민첩', 'Agility'),
  int: L('지능', 'Intelligence'),
  cha: L('매력', 'Charisma'),
  obs: L('관찰', 'Observation'),
}
const STAT_ORDER: StatKey[] = ['str', 'agi', 'int', 'cha', 'obs']

const AXES: { id: ChoiceAxis; name: ReturnType<typeof L>; hint: ReturnType<typeof L> }[] = [
  { id: 'humanity', name: L('인간성', 'Humanity'), hint: L('설득하고, 건네고, 믿는다', 'Persuade, give, trust') },
  { id: 'dominance', name: L('지배', 'Dominance'), hint: L('위협하고, 속이고, 밀어붙인다', 'Threaten, deceive, force') },
  { id: 'resilience', name: L('회복력', 'Resilience'), hint: L('경계하고, 버티고, 이겨낸다', 'Guard, endure, survive') },
  { id: 'insight', name: L('통찰', 'Insight'), hint: L('읽어내고, 꿰뚫고, 웃어넘긴다', 'Read, see through, deflect') },
]

const FACTIONS: { id: Faction; name: ReturnType<typeof L>; good: ReturnType<typeof L>; bad: ReturnType<typeof L> }[] = [
  { id: 'offgrid', name: L('비접속자 연대', 'The Off-grid'), good: L('휴식 회복 +10%p', 'Rest heals +10 pts'), bad: L('휴식 회복 −10%p', 'Rest heals −10 pts') },
  { id: 'market', name: L('야시장', 'Night Market'), good: L('상점 가격 −10%', 'Shop prices −10 %'), bad: L('상점 가격 +10%', 'Shop prices +10 %') },
  { id: 'grid', name: L('관리망', 'The Grid'), good: L('노드마다 추적도 −1', 'Trace −1 per node'), bad: L('노드마다 추적도 +1', 'Trace +1 per node') },
]

const IMPRESSION: Record<FirstImpression, ReturnType<typeof L>> = {
  trust: L('믿음으로 답했다', 'You answered with trust'),
  guard: L('경계하며 시험했다', 'You tested them warily'),
  wit: L('농담으로 넘겼다', 'You deflected with a joke'),
}

export function CharacterSheet({ run, C, lang, onClose }: Props) {
  const ko = lang === 'ko'
  const arch = C.archetypes[run.archetype]
  const bg = run.crpg?.background ? C.crpg?.backgrounds[run.crpg.background] : undefined
  const lines = statPerkLines(run.stats, lang)
  const axes = run.axes ?? {}
  const axisMax = Math.max(3, ...AXES.map((a) => axes[a.id] ?? 0))
  const lead = AXES.reduce<(typeof AXES)[number] | null>((best, a) => ((axes[a.id] ?? 0) > (best ? (axes[best.id] ?? 0) : 0) ? a : best), null)
  const crew = [...run.party, ...(run.bench ?? [])]
  const activeQuests = Object.values(run.crpg?.quests ?? {}).filter((v) => v > 0 && v < 99).length

  return (
    <Modal title={ko ? '접속자 기록' : 'Connector record'} onClose={onClose} wide>
      <div className="m2-sheet">
        <section className="m2-sheet__who">
          <img src={portrait(arch?.sprite ?? 'player-noise')} alt="" />
          <div>
            <h3>{arch ? tr(arch.name, lang) : ''}</h3>
            <p className="m2-sheet__tag">{arch ? tr(arch.tagline, lang) : ''}</p>
            <div className="m2-sheet__hp">
              <HpBar hp={run.hp} max={run.maxHp} small label={false} />
              <span className="m2-mono">
                HP {run.hp}/{run.maxHp}
              </span>
            </div>
            {bg && (
              <p className="m2-sheet__bg">
                <b>{ko ? '출신' : 'Background'}</b> {tr(bg.name, lang)} · {bg.proficient.map((s) => tr(STAT_NAME[s], lang)).join(' · ')} +2
              </p>
            )}
            {(run.growth ?? 0) > 0 && <p className="m2-sheet__growth">{ko ? `성장 포인트 ${run.growth} — 지도에서 스탯에 쓸 수 있다` : `${run.growth} growth point(s) — spend them on the map`}</p>}
          </div>
        </section>

        <section>
          <h4>{ko ? '능력치' : 'Stats'}</h4>
          <ul className="m2-sheet__stats">
            {STAT_ORDER.map((k, i) => (
              <li key={k}>
                <span className="m2-sheet__stat">{tr(STAT_NAME[k], lang)}</span>
                <span className="m2-sheet__pips" aria-label={`${run.stats[k]}/10`}>
                  {Array.from({ length: 10 }, (_, n) => (
                    <i key={n} className={n < run.stats[k] ? 'is-on' : ''} />
                  ))}
                </span>
                <b className="m2-mono">{run.stats[k]}</b>
                <small>{lines[i]?.[1]}</small>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>{ko ? '기울기' : 'Leanings'}</h4>
          <p className="m2-sheet__lead">
            {lead ? (ko ? `지금의 당신은 ${tr(lead.name, lang)} 쪽으로 기울어 있다.` : `Right now you lean toward ${tr(lead.name, lang)}.`) : ko ? '아직 어느 쪽으로도 기울지 않았다.' : 'You have not leaned any way yet.'}
          </p>
          <ul className="m2-sheet__axes">
            {AXES.map((a) => (
              <li key={a.id} className={`is-${a.id}`}>
                <span>{tr(a.name, lang)}</span>
                <span className="m2-sheet__bar">
                  <i style={{ width: `${((axes[a.id] ?? 0) / axisMax) * 100}%` }} />
                </span>
                <b className="m2-mono">{axes[a.id] ?? 0}</b>
                <small>{tr(a.hint, lang)}</small>
              </li>
            ))}
          </ul>
        </section>

        {run.crpg && (
          <section>
            <h4>{ko ? '평판' : 'Reputation'}</h4>
            <ul className="m2-sheet__axes m2-sheet__rep">
              {FACTIONS.map((f) => {
                const v = run.crpg?.rep?.[f.id] ?? 0
                const tier = repTier(run, f.id)
                return (
                  <li key={f.id} className={tier > 0 ? 'is-good' : tier < 0 ? 'is-bad' : ''}>
                    <span>{tr(f.name, lang)}</span>
                    <span className="m2-sheet__bar">
                      <i style={{ width: `${(Math.min(REP_TIER, Math.abs(v)) / REP_TIER) * 100}%` }} />
                    </span>
                    <b className="m2-mono">{v > 0 ? `+${v}` : v}</b>
                    <small>{tier > 0 ? tr(f.good, lang) : tier < 0 ? tr(f.bad, lang) : ko ? `±${REP_TIER}에서 효과` : `Takes effect at ±${REP_TIER}`}</small>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {arch?.burst && (
          <section>
            <h4>{ko ? '필살기' : 'Signal Burst'}</h4>
            <p className="m2-sheet__burst">
              <b>{tr(arch.burst.name, lang)}</b> — {tr(arch.burst.text, lang)}{' '}
              <small>{ko ? '(기세가 가득 차면 전투당 1회)' : '(once per fight at full Momentum)'}</small>
            </p>
          </section>
        )}

        <section>
          <h4>
            {ko ? '동료' : 'Crew'}
            {activeQuests > 0 && <small> · {ko ? `진행 중인 의뢰 ${activeQuests}` : `${activeQuests} quest(s) in progress`}</small>}
          </h4>
          {crew.length === 0 && <p className="m2-sheet__empty">{ko ? '혼자다.' : 'Alone.'}</p>}
          <ul className="m2-sheet__crew">
            {crew.map((m) => {
              const def = C.companions[m.id]
              if (!def) return null
              const intro = C.intros?.[m.id]
              const imp = run.flags[`impress_${m.id}`]
              const tone = imp ? (['trust', 'guard', 'wit'] as const)[imp - 1] : undefined
              return (
                <li key={m.id}>
                  <img src={portrait(companionSprite(m.id, C))} alt="" />
                  <div>
                    <b>{tr(def.name, lang)}</b> <small>{tr(def.alias, lang)}</small>
                    <div className="m2-sheet__meta">
                      <span>
                        {ko ? '유대' : 'Bond'} {m.bond}/3
                      </span>
                      {run.crpg && (
                        <span>
                          {ko ? '승인' : 'Approval'} {run.crpg.approval[m.id] ?? 0}
                        </span>
                      )}
                    </div>
                    {intro && (
                      <div className="m2-sheet__traits">
                        {intro.traits.map((t0, i) => (
                          <span key={i}>{tr(t0, lang)}</span>
                        ))}
                      </div>
                    )}
                    {tone && <p className="m2-sheet__imp">{tr(IMPRESSION[tone], lang)}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </Modal>
  )
}
