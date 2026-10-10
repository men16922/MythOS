// Mythos 2.0 — event screen: scene art, speaker, authored text (+ optional GM line), options, Improvise.
import { art } from '../components/art.ts'
import { Dices, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { EventDef, EventOption, Improvisation, Lang, RunState, StatKey } from '../../engine/types.ts'
import { asset, portrait } from '../common/assets.ts'
import { L, tr } from '../common/lang.ts'
import { effectChips, statLabel, type EffectChip } from '../components/format.ts'
import { RollMeter } from '../components/RollMeter.tsx'
import { sound } from '../components/sound.ts'
import { Typewriter } from '../components/Typewriter.tsx'
import { improvise, narrate } from './gm.ts'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'

const REWARD_LABEL: Record<Improvisation['reward'], { ko: string; en: string }> = {
  credits: L('크레딧', 'Credits'),
  heal: L('회복', 'Heal'),
  card: L('카드 획득', 'A card'),
  trace_down: L('추적도 감소', 'Less Trace'),
  implant: L('임플란트', 'An implant'),
}
const RISK_LABEL: Record<Improvisation['risk'], { ko: string; en: string }> = {
  hp: L('HP 손실', 'Lose HP'),
  trace: L('추적도 증가', 'More Trace'),
  credits: L('크레딧 손실', 'Lose credits'),
}

/** Exact stakes; mirrors the bounded formulas in engine/run.ts applyImprovisation. */
function rewardText(imp: Improvisation, lang: Lang): string {
  const ko = lang === 'ko'
  switch (imp.reward) {
    case 'credits':
      return `+${20 + imp.dc * 5} ₵`
    case 'heal':
      return `+${6 + imp.dc} HP`
    case 'trace_down':
      return ko ? `추적 −${5 + 2 * imp.dc}` : `−${5 + 2 * imp.dc} Trace`
    case 'card':
      return ko ? '카드 선택' : 'Choose a card'
    case 'implant':
      return ko ? '임플란트' : 'An implant'
  }
}
function riskText(imp: Improvisation, lang: Lang): string {
  const ko = lang === 'ko'
  switch (imp.risk) {
    case 'hp':
      return `−${imp.dc + 1} HP`
    case 'trace':
      return ko ? `추적 +${2 * imp.dc}` : `+${2 * imp.dc} Trace`
    case 'credits':
      return `−${4 * imp.dc} ₵`
  }
}

function speakerImage(id: string | undefined, run: ScreenProps['run'], C: ScreenProps['C']): string | null {
  if (!id) return null
  const comp = C.companions[id]
  if (comp) return portrait(comp.sprite)
  void run
  return asset(`characters/${id.replaceAll('_', '-')}.png`)
}

/** Needle landing spot for the roll animation (cosmetic; the engine already decided the outcome). */
function landFor(chance: number, success: boolean): number {
  return success ? Math.max(2, Math.random() * (chance - 4) + 2) : Math.min(98, chance + 3 + Math.random() * (95 - chance))
}

function Chips({ chips }: { chips: EffectChip[] }) {
  return (
    <span className="m2-chips">
      {chips.map((c, i) => (
        <span key={i} className={`m2-chip m2-chip--${c.tone}`}>
          {c.text}
        </span>
      ))}
    </span>
  )
}

export function EventScreen({ run, C, lang, settings, act }: ScreenProps) {
  const screen = run.screen.kind === 'event' ? run.screen : null
  const ev: EventDef | undefined = screen ? C.events[screen.eventId] : undefined
  const [gmLine, setGmLine] = useState<{ id: string; text: string } | null>(null)
  const [action, setAction] = useState('')
  const [pending, setPending] = useState<Improvisation | null>(null)
  const [judging, setJudging] = useState(false)
  const [rolling, setRolling] = useState<{ chance: number; success: boolean; land: number; next: RunState; label: string } | null>(null)
  // The option list can change once an option resolves (e.g. a recruit leaves the candidate pool), so the
  // outcome reads the option that was actually clicked, not whatever now sits at that index.
  const [picked, setPicked] = useState<{ eventId: string; index: number; opt: EventOption } | null>(null)
  const eventId = screen?.eventId ?? ''

  useEffect(() => {
    if (!ev) return
    let alive = true
    void narrate('event', lang, {
      eventId: ev.id,
      title: tr(ev.title, lang),
      text: tr(ev.text, lang),
      act: run.act,
      loop: run.loop,
      party: run.party.map((m) => tr(C.companions[m.id]?.name, lang)),
      trace: run.trace,
      hints: ev.gmHints ?? [],
    }).then((text) => {
      if (alive && text) setGmLine({ id: ev.id, text })
    })
    return () => {
      alive = false
    }
    // Only when the event itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  // Keyboard: 1-9 pick an option, Enter continues / rolls (clicks the visible button, so all rules stay in one place).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (document.querySelector('.m2-modal-back')) return
      if (/^[1-9]$/.test(e.key)) {
        const btn = document.querySelectorAll<HTMLButtonElement>('.m2-options .m2-option')[Number(e.key) - 1]
        if (btn && !btn.disabled) btn.click()
      } else if (e.key === 'Enter') {
        document.querySelector<HTMLButtonElement>('.m2-outcome .m2-btn--primary, .m2-adjud .m2-btn--primary')?.click()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!screen || !ev) return null
  const speaker = speakerImage(ev.speaker, run, C)
  const speakerName = ev.speaker ? C.companions[ev.speaker]?.name : undefined
  const rolled = screen.improvised?.rolled ? screen.improvised : null
  const resolved = screen.resolved && screen.resolved.optionIndex >= 0 ? screen.resolved : null
  const views = rx.eventOptions(run, C)
  const resolvedOpt = resolved
    ? picked && picked.eventId === ev.id && picked.index === resolved.optionIndex
      ? picked.opt
      : views[resolved.optionIndex]?.option
    : undefined

  const choose = (i: number, opt: EventOption, available: boolean) => {
    if (rolling) return
    if (!available) {
      sound('error')
      return
    }
    const next = rx.chooseOption(run, i, C)
    setPicked({ eventId: ev.id, index: i, opt })
    if (opt.check && next.screen.kind === 'event' && next.screen.resolved) {
      const chance = rx.chance(run, opt.check)
      const success = next.screen.resolved.success
      setRolling({ chance, success, land: landFor(chance, success), next, label: `${statLabel(opt.check.stat, lang)} ${run.stats[opt.check.stat]}` })
      return
    }
    sound('ui_click')
    act(next)
  }

  const submitImprov = async () => {
    const text = action.trim()
    if (!text || judging) return
    setJudging(true)
    sound('ui_click')
    const imp = await improvise({
      lang,
      event: { title: tr(ev.title, lang), text: tr(ev.text, lang), options: views.map((v) => tr(v.option.label, lang)) },
      action: text,
      stats: run.stats,
      act: run.act,
    })
    setJudging(false)
    setPending(imp)
  }

  const roll = () => {
    if (!pending || rolling) return
    const next = rx.improvise(run, pending, C)
    const r = next.screen.kind === 'event' ? next.screen.improvised?.rolled : undefined
    const chance = rx.chance(run, pending)
    setPending(null)
    setAction('')
    if (r) setRolling({ chance, success: r.success, land: Math.max(1, Math.min(99, r.roll)), next, label: `${statLabel(pending.stat, lang)} ${run.stats[pending.stat]}` })
    else act(next)
  }

  const ko = lang === 'ko'
  const done = !!resolved || !!rolled

  return (
    <div className="m2-event">
      <div className="m2-event__art">
        <img className="m2-event__scene" src={art.event(ev.id, ev.image)} alt="" />
        <div className="m2-event__art-shade" />
        {speaker && (
          <div className="m2-event__speaker">
            <img src={speaker} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
            {speakerName && <span>{tr(speakerName, lang)}</span>}
          </div>
        )}
      </div>

      <div className="m2-event__panel">
        <h1 className="m2-event__title">{tr(ev.title, lang)}</h1>
        {gmLine && gmLine.id === ev.id && (
          <div className="m2-gmline">
            <Sparkles size={14} />
            <Typewriter text={gmLine.text} cps={60} instant={settings.fastAnim} />
          </div>
        )}
        <Typewriter className="m2-event__text" text={tr(ev.text, lang)} cps={settings.fastAnim ? 400 : 110} />

        {rolling && (
          <RollMeter
            chance={rolling.chance}
            success={rolling.success}
            land={rolling.land}
            lang={lang}
            label={rolling.label}
            fast={settings.fastAnim}
            onDone={() => {
              act(rolling.next)
              setRolling(null)
            }}
          />
        )}

        {!done && !pending && !rolling && (
          <div className="m2-options">
            {views.map(({ option: opt, index: i, available, reason, chance }) => {
              const winChips = effectChips(opt.success.effects, C, lang)
              const failChips = opt.failure ? effectChips(opt.failure.effects, C, lang) : []
              const joinFx = opt.success.effects.find((e) => e.kind === 'companion')
              const joiner = joinFx && joinFx.kind === 'companion' ? C.companions[joinFx.id] : undefined
              return (
                <button
                  key={i}
                  className={`m2-option${available ? '' : ' is-locked'}`}
                  onClick={() => choose(i, opt, available)}
                  onMouseEnter={() => available && sound('ui_hover')}
                  disabled={!available}
                  style={{ animationDelay: `${120 + i * 70}ms` }}
                >
                  <span className="m2-option__key m2-mono">{i + 1}</span>
                  <span className="m2-option__main">
                    <span className="m2-option__label">{tr(opt.label, lang)}</span>
                    <span className="m2-option__meta">
                      {opt.hint ? <span className="m2-chip">{tr(opt.hint, lang)}</span> : <Chips chips={winChips} />}
                      {opt.check && failChips.length > 0 && !(opt.hint && /실패|fail/i.test(tr(opt.hint, lang))) && (
                        <span className="m2-option__fail">
                          {ko ? '실패 시' : 'On fail'} <Chips chips={failChips} />
                        </span>
                      )}
                    </span>
                    {!available && reason && <span className="m2-option__reason">{tr(reason, lang)}</span>}
                  </span>
                  {joiner && !opt.check && <img className="m2-option__face" src={portrait(joiner.sprite)} alt="" />}
                  {opt.check && chance !== undefined && (
                    <span className={`m2-odds${chance >= 70 ? ' is-good' : chance <= 35 ? ' is-bad' : ''}`}>
                      <b className="m2-mono">{chance}%</b>
                      <small>
                        {ko
                          ? `${statLabel(opt.check.stat, lang)} ${run.stats[opt.check.stat]} vs 난이도 ${opt.check.dc}`
                          : `${statLabel(opt.check.stat, lang)} ${run.stats[opt.check.stat]} vs DC ${opt.check.dc}`}
                      </small>
                    </span>
                  )}
                </button>
              )
            })}

            {ev.improvise !== false && (
              <form
                className="m2-improv"
                onSubmit={(e) => {
                  e.preventDefault()
                  void submitImprov()
                }}
              >
                <label className="m2-improv__label" htmlFor="m2-improv-input">
                  <Dices size={15} />
                  {ko ? '자유 행동' : 'Improvise'}
                  <small>{ko ? '하고 싶은 행동을 직접 적는다. GM이 판정한다.' : 'Describe your own action. The GM sets the odds.'}</small>
                </label>
                <div className="m2-improv__row">
                  <input
                    id="m2-improv-input"
                    value={action}
                    maxLength={140}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder={ko ? '예: 단말기를 해킹해 경보를 끈다' : 'e.g. Hack the terminal to kill the alarm'}
                    disabled={judging}
                  />
                  <button className="m2-btn" type="submit" disabled={!action.trim() || judging}>
                    {judging ? (ko ? '판정 중…' : 'Judging…') : ko ? '시도' : 'Try it'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {pending && !done && !rolling && <Adjudication imp={pending} lang={lang} statValue={run.stats[pending.stat]} chance={rx.chance(run, pending)} onRoll={roll} onCancel={() => setPending(null)} />}

        {resolved && (
          <div className={`m2-outcome ${resolved.success ? 'is-win' : 'is-loss'}`}>
            {resolvedOpt?.check && (
              <div className="m2-outcome__tag">{resolved.success ? (ko ? '성공' : 'Success') : ko ? '실패' : 'Failed'}</div>
            )}
            <Typewriter className="m2-outcome__text" text={tr(resolved.text, lang)} cps={settings.fastAnim ? 400 : 120} />
            <Chips chips={effectChips((resolved.success ? resolvedOpt?.success.effects : resolvedOpt?.failure?.effects) ?? [], C, lang)} />
            <button
              className="m2-btn m2-btn--primary m2-btn--lg"
              onClick={() => {
                sound('ui_click')
                act(rx.leaveEvent(run, C))
              }}
            >
              {ko ? '계속' : 'Continue'}
            </button>
          </div>
        )}

        {rolled && !resolved && (
          <div className={`m2-outcome ${rolled.rolled?.success ? 'is-win' : 'is-loss'}`}>
            <div className="m2-outcome__tag">
              {rolled.rolled?.success ? (ko ? '성공' : 'Success') : ko ? '실패' : 'Failed'}
              <span className="m2-mono"> · {rolled.rolled?.roll}</span>
            </div>
            <div className="m2-outcome__action">“{rolled.action}”</div>
            <Typewriter className="m2-outcome__text" text={tr(rolled.rolled?.success ? rolled.successText : rolled.failureText, lang)} cps={settings.fastAnim ? 400 : 120} />
            <span className="m2-chips">
              {rolled.rolled?.success ? (
                <span className="m2-chip m2-chip--good" title={tr(REWARD_LABEL[rolled.reward], lang)}>
                  {rewardText(rolled, lang)}
                </span>
              ) : (
                <span className="m2-chip m2-chip--bad" title={tr(RISK_LABEL[rolled.risk], lang)}>
                  {riskText(rolled, lang)}
                </span>
              )}
            </span>
            <button
              className="m2-btn m2-btn--primary m2-btn--lg"
              onClick={() => {
                sound('ui_click')
                act(rx.leaveEvent(run, C))
              }}
            >
              {ko ? '계속' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Adjudication(props: { imp: Improvisation; lang: Lang; statValue: number; chance: number; onRoll: () => void; onCancel: () => void }) {
  const { imp, lang, statValue, chance } = props
  const ko = lang === 'ko'
  return (
    <div className="m2-adjud">
      <div className="m2-adjud__head">{ko ? 'GM 판정' : 'GM ruling'}</div>
      <div className="m2-adjud__action">“{imp.action}”</div>
      <div className="m2-adjud__grid">
        <div>
          <small>{ko ? '판정 능력' : 'Check'}</small>
          <b>
            {statLabel(imp.stat as StatKey, lang)} <span className="m2-mono">{statValue}</span>
          </b>
        </div>
        <div>
          <small>{ko ? '난이도' : 'Difficulty'}</small>
          <b className="m2-mono">{imp.dc}</b>
        </div>
        <div className={`m2-adjud__odds${chance >= 70 ? ' is-good' : chance <= 35 ? ' is-bad' : ''}`}>
          <small>{ko ? '성공 확률' : 'Odds'}</small>
          <b className="m2-mono">{chance}%</b>
        </div>
      </div>
      <div className="m2-adjud__stakes">
        <span className="m2-chip m2-chip--good">
          {ko ? '성공' : 'Win'}: {rewardText(imp, lang)}
        </span>
        <span className="m2-chip m2-chip--bad">
          {ko ? '실패' : 'Lose'}: {riskText(imp, lang)}
        </span>
      </div>
      <div className="m2-adjud__actions">
        <button className="m2-btn m2-btn--primary m2-btn--lg" onClick={props.onRoll}>
          <Dices size={18} /> {ko ? '굴린다' : 'Roll'}
        </button>
        <button className="m2-btn m2-btn--ghost" onClick={props.onCancel}>
          {ko ? '다른 선택' : 'Back'}
        </button>
      </div>
    </div>
  )
}
