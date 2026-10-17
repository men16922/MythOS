// Mythos 2.0 — Signal+ conversation: the speaker, the last choice's d20 roll and consequences (approval, inspiration),
// the node's options with their odds, an inspiration reroll, and free text to an NPC (the AI reads which open option
// the line attempts; the buttons stay as the authored path). Rules live in engine/crpg.ts.
import { Dices, MessageSquareText, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CrpgEffect, D20Roll, DialogueOption, Intent, Lang, RunEffect, Text } from '../../engine/types.ts'
import { COMBAT_MOD_TEXT } from '../../engine/crpg.ts'
import { talkNpc } from '../../net/api.ts'
import { asset, portrait } from '../common/assets.ts'
import { L, tr } from '../common/lang.ts'
import { effectChips, statLabel, type EffectChip } from '../components/format.ts'
import { usePlan } from '../components/plan.ts'
import { sound } from '../components/sound.ts'
import { Typewriter } from '../components/Typewriter.tsx'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'
import './event.css'
import './crpg.css'

const INTENT_LABEL: Record<Intent, Text> = {
  ask: L('묻기', 'Ask'),
  persuade: L('설득', 'Persuade'),
  deceive: L('기만', 'Deceive'),
  intimidate: L('위협', 'Intimidate'),
  insight: L('통찰', 'Insight'),
  offer: L('제안', 'Offer'),
  sneak: L('은밀', 'Sneak'),
  fight: L('완력', 'Force'),
  leave: L('떠나기', 'Leave'),
}
/** An option label as said aloud: authored labels that are already a quote keep their own marks. */
function said(label: string): string {
  return /^[“"'‘「]/.test(label) ? label : `“${label}”`
}

/** Free-text lines per conversation node (each one is a GM call). */
const FREE_TEXT_PER_NODE = 2

function crpgChips(effects: (RunEffect | CrpgEffect)[], C: ScreenProps['C'], lang: Lang): EffectChip[] {
  const plain = effects.filter((e): e is RunEffect => e.kind !== 'quest' && e.kind !== 'combat_mod' && e.kind !== 'inspiration')
  const out = effectChips(plain, C, lang)
  for (const e of effects) {
    if (e.kind === 'quest') {
      const q = C.crpg?.quests[e.id]
      if (q) out.push({ text: `${lang === 'ko' ? '임무' : 'Quest'}: ${tr(q.title, lang)}`, tone: 'gold' })
    } else if (e.kind === 'combat_mod') out.push({ text: tr(COMBAT_MOD_TEXT[e.mod], lang), tone: 'good' })
    else if (e.kind === 'inspiration') out.push({ text: lang === 'ko' ? '영감 +1' : '+1 Inspiration', tone: 'echo' })
  }
  return out
}

function Chips({ chips }: { chips: EffectChip[] }) {
  if (chips.length === 0) return null
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

/** The d20 landing: cycles a few faces, then shows the roll against the DC. */
function D20({ roll, lang, fast }: { roll: D20Roll; lang: Lang; fast: boolean }) {
  const ko = lang === 'ko'
  const key = `${roll.die}:${roll.other ?? ''}:${roll.dc}:${roll.rerolled ? 1 : 0}`
  const [landedKey, setLandedKey] = useState('')
  const [spin, setSpin] = useState(1)
  const landed = landedKey === key
  useEffect(() => {
    let face = roll.die
    const tick = setInterval(() => {
      face = ((face * 7 + 3) % 20) + 1
      setSpin(face)
    }, 45)
    const stop = setTimeout(
      () => {
        clearInterval(tick)
        setLandedKey(key)
        sound(roll.success ? 'success' : 'error', { volume: 0.7 })
      },
      fast ? 120 : 650,
    )
    return () => {
      clearInterval(tick)
      clearTimeout(stop)
    }
  }, [key, roll.die, roll.success, fast])
  return (
    <div className={`m2-d20${landed ? (roll.success ? ' is-win' : ' is-loss') : ' is-rolling'}`} data-testid="d20">
      <span className="m2-d20__die m2-mono">{landed ? roll.die : spin}</span>
      {roll.advantage && roll.other !== undefined && landed && (
        <span className="m2-d20__other m2-mono" title={ko ? '유리: 높은 쪽' : 'Advantage: the higher die'}>
          {roll.other}
        </span>
      )}
      <span className="m2-d20__math m2-mono">
        {landed ? `${roll.die} ${roll.modifier >= 0 ? '+' : '−'} ${Math.abs(roll.modifier)} = ${roll.total}` : '…'}{' '}
        <small>
          vs {ko ? '난이도' : 'DC'} {roll.dc}
        </small>
      </span>
      {landed && (
        <b className="m2-d20__verdict">
          {roll.die === 20 ? (ko ? '대성공' : 'Natural 20') : roll.die === 1 ? (ko ? '대실패' : 'Natural 1') : roll.success ? (ko ? '성공' : 'Success') : ko ? '실패' : 'Failure'}
          {roll.rerolled && <small> · {ko ? '영감' : 'Inspired'}</small>}
        </b>
      )}
    </div>
  )
}

function Approvals({ list, C, lang }: { list: { id: string; delta: number }[]; C: ScreenProps['C']; lang: Lang }) {
  if (list.length === 0) return null
  const ko = lang === 'ko'
  return (
    <ul className="m2-approvals">
      {list.map(({ id, delta }) => (
        <li key={id} className={delta > 0 ? 'is-good' : 'is-bad'}>
          {delta > 0 ? <ThumbsUp size={13} /> : <ThumbsDown size={13} />}
          <img src={portrait(C.companions[id]?.sprite ?? id)} alt="" />
          {tr(C.companions[id]?.name, lang)} {delta > 0 ? (ko ? '좋아한다' : 'approves') : ko ? '언짢아한다' : 'disapproves'}
        </li>
      ))}
    </ul>
  )
}

function speakerOf(id: string | undefined, C: ScreenProps['C']): { name: Text; role?: Text; face?: string } | null {
  if (!id) return null
  const npc = C.crpg?.npcs[id]
  if (npc) return { name: npc.name, role: npc.role, face: npc.portrait ? asset(npc.portrait) : undefined }
  const comp = C.companions[id]
  if (comp) return { name: comp.name, role: comp.alias, face: portrait(comp.sprite) }
  return null
}

export function DialogueScreen({ run, C, lang, settings, act }: ScreenProps) {
  const plan = usePlan()
  const [typed, setTyped] = useState('')
  const [line, setLine] = useState('')
  const [busy, setBusy] = useState(false)
  const [chat, setChat] = useState<{ key: string; turns: { role: 'player' | 'companion'; text: string }[]; note: string | null }>({ key: '', turns: [], note: null })
  if (run.screen.kind !== 'dialogue') return null
  const state = run.screen.dialogue
  const def = C.crpg?.dialogues[state.id]
  if (!def) return null
  const ko = lang === 'ko'
  const node = def.nodes[state.node]
  const nodeKey = `${state.id}:${state.node}:${state.last ? tr(state.last.label, 'en') : ''}`
  const turns = chat.key === nodeKey ? chat.turns : []
  const note = chat.key === nodeKey ? chat.note : null
  const views = rx.dialogueOptions(run, C)
  const speaker = speakerOf(node?.speaker ?? def.npc, C)
  const districtName = run.screen.returnTo.kind === 'district' ? C.crpg?.districts[run.screen.returnTo.district.id]?.name : undefined
  const pendingOpt: DialogueOption | undefined = state.pending ? node?.options[state.pending.optionIndex] : undefined
  const freeText = !!def.npc && settings.ai && plan.features.includes('ai') && !state.ended && !state.pending
  const triesLeft = FREE_TEXT_PER_NODE - turns.filter((t) => t.role === 'player').length
  const lastKey = state.last ? `${state.id}:${tr(state.last.label, 'en')}:${run.rng}` : ''

  const choose = (index: number) => {
    sound('ui_click')
    act(rx.chooseDialogue(run, index, C))
  }

  const submit = async () => {
    const message = line.trim()
    if (!message || busy || !def.npc) return
    setBusy(true)
    const open = views.filter((v) => v.available)
    const res = await talkNpc({
      lang,
      npc: def.npc,
      message,
      history: turns,
      options: open.map((v) => ({ intent: v.option.intent, label: tr(v.option.label, lang) })),
      context: { district: districtName ? tr(districtName, lang) : '', node: node ? tr(node.text, lang) : '', act: run.act },
    })
    setBusy(false)
    setLine('')
    const nextTurns = [...turns, { role: 'player' as const, text: message }, ...(res?.text ? [{ role: 'companion' as const, text: res.text }] : [])]
    const match = res?.intent ? open.find((v) => v.option.intent === res.intent) : undefined
    const noteText = match
      ? `${ko ? '→ 시도' : '→ Attempt'}: ${tr(match.option.label, lang)}`
      : res === null
        ? ko
          ? '연결이 끊겼다. 선택지를 골라라.'
          : 'No connection. Pick an option.'
        : ko
          ? '그 말로는 아무것도 바뀌지 않는다.'
          : 'That changes nothing here.'
    setChat({ key: nodeKey, turns: nextTurns, note: noteText })
    if (match) setTimeout(() => choose(match.index), settings.fastAnim ? 200 : 900)
  }

  return (
    <div className="m2-dialogue">
      <aside className="m2-dialogue__who">
        {speaker?.face ? <img src={speaker.face} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <span className="m2-dialogue__initial">
            <i>{speaker ? tr(speaker.name, lang).slice(0, 1) : '…'}</i>
          </span>}
        {speaker && (
          <div>
            <b>{tr(speaker.name, lang)}</b>
            {speaker.role && <small>{tr(speaker.role, lang)}</small>}
          </div>
        )}
        {districtName && <small className="m2-dialogue__where">{tr(districtName, lang)}</small>}
        <span className="m2-district__inspiration" title={ko ? '영감: 실패한 판정을 한 번 다시 굴린다' : 'Inspiration: reroll a failed check'}>
          <Sparkles size={14} /> {run.crpg?.inspiration ?? 0}
        </span>
      </aside>

      <div className="m2-dialogue__panel">
        {state.last && (
          <div className={`m2-said${state.last.roll ? (state.last.roll.success ? ' is-win' : ' is-loss') : ''}`}>
            <div className="m2-said__label">{said(tr(state.last.label, lang))}</div>
            {state.last.roll && <D20 roll={state.last.roll} lang={lang} fast={settings.fastAnim} />}
            <Typewriter className="m2-said__text" text={tr(state.last.text, lang)} cps={settings.fastAnim ? 400 : 120} onDone={() => setTyped(lastKey)} />
            {typed === lastKey && (
              <>
                <Chips chips={crpgChips(state.last.effects ?? [], C, lang)} />
                <Approvals list={state.last.approvals} C={C} lang={lang} />
                {state.last.inspired && (
                  <p className="m2-said__inspired">
                    <Sparkles size={13} /> {ko ? '출신다운 선택이었다. 영감 +1' : 'True to your background. +1 Inspiration'}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {state.pending && pendingOpt && (
          <div className="m2-pending">
            <div className="m2-said__label">{said(tr(pendingOpt.label, lang))}</div>
            <D20 roll={state.pending.roll} lang={lang} fast={settings.fastAnim} />
            <Chips chips={crpgChips((state.pending.roll.success ? pendingOpt.success.effects : pendingOpt.failure?.effects) ?? [], C, lang)} />
            <div className="m2-pending__actions">
              {!state.pending.roll.success && !state.pending.roll.rerolled && (run.crpg?.inspiration ?? 0) > 0 && (
                <button
                  className="m2-btn"
                  onClick={() => {
                    sound('ui_click')
                    act(rx.rerollDialogue(run))
                  }}
                >
                  <Sparkles size={15} /> {ko ? '영감으로 다시 굴린다' : 'Reroll with Inspiration'}
                </button>
              )}
              <button
                className="m2-btn m2-btn--primary"
                onClick={() => {
                  sound('ui_click')
                  act(rx.acceptRoll(run, C))
                }}
              >
                {ko ? '받아들인다' : 'Accept'}
              </button>
            </div>
          </div>
        )}

        {!state.ended && !state.pending && node && (
          <>
            <Typewriter className="m2-dialogue__text" text={tr(node.text, lang)} cps={settings.fastAnim ? 400 : 110} />
            {turns.length > 0 && (
              <ol className="m2-freechat">
                {turns.map((t, i) => (
                  <li key={i} className={t.role === 'player' ? 'is-player' : 'is-npc'}>
                    {t.text}
                  </li>
                ))}
                {note && <li className="m2-freechat__note">{note}</li>}
              </ol>
            )}
            <div className="m2-options">
              {views.map(({ option, index, available, reason, chance, modifier, advantage, inspires }) => (
                <button
                  key={index}
                  className={`m2-option${available ? '' : ' is-locked'}`}
                  disabled={!available}
                  onMouseEnter={() => available && sound('ui_hover')}
                  onClick={() => choose(index)}
                >
                  <span className="m2-option__key m2-mono">{index + 1}</span>
                  <span className="m2-option__main">
                    <span className="m2-option__label">{tr(option.label, lang)}</span>
                    <span className="m2-option__meta">
                      <span className={`m2-intent m2-intent--${option.intent}`}>{tr(INTENT_LABEL[option.intent], lang)}</span>
                      {option.requires?.background && <span className="m2-chip m2-chip--echo">{tr(C.crpg?.backgrounds[option.requires.background]?.name, lang)}</span>}
                      {inspires && (
                        <span className="m2-chip m2-chip--echo" title={ko ? '출신다운 선택: 영감 +1' : 'In character: +1 Inspiration'}>
                          <Sparkles size={11} />
                        </span>
                      )}
                      {!option.check && <Chips chips={crpgChips(option.success.effects ?? [], C, lang)} />}
                    </span>
                    {!available && reason && <span className="m2-option__reason">{tr(reason, lang)}</span>}
                  </span>
                  {option.check && chance !== undefined && (
                    <span className={`m2-odds${chance >= 70 ? ' is-good' : chance <= 35 ? ' is-bad' : ''}`}>
                      <b className="m2-mono">{chance}%</b>
                      <small>
                        <Dices size={11} /> {statLabel(option.check.stat, lang)} {modifier !== undefined && modifier >= 0 ? '+' : ''}
                        {modifier} vs {ko ? '난이도' : 'DC'} {option.check.dc}
                        {advantage ? (ko ? ' · 유리' : ' · Adv.') : ''}
                      </small>
                    </span>
                  )}
                </button>
              ))}
            </div>
            {freeText && triesLeft > 0 && (
              <form
                className="m2-improv"
                onSubmit={(e) => {
                  e.preventDefault()
                  void submit()
                }}
              >
                <label className="m2-improv__label" htmlFor="m2-npc-input">
                  <MessageSquareText size={15} />
                  {ko ? '직접 말한다' : 'Say it yourself'}
                  <small>{ko ? `하고 싶은 말을 적는다. 상대가 그 말에 반응한다. (남은 ${triesLeft}번)` : `Type what you say. They react to it. (${triesLeft} left)`}</small>
                </label>
                <div className="m2-improv__row">
                  <input id="m2-npc-input" value={line} maxLength={140} onChange={(e) => setLine(e.target.value)} disabled={busy} placeholder={ko ? '예: 저도 여기 사람이에요. 겁주려는 거 아니에요.' : 'e.g. I live here too. I’m not here to scare anyone.'} />
                  <button className="m2-btn" type="submit" disabled={!line.trim() || busy}>
                    {busy ? (ko ? '듣는 중…' : 'Listening…') : ko ? '말한다' : 'Say'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {state.ended && (
          <button
            className="m2-btn m2-btn--primary m2-btn--lg"
            onClick={() => {
              sound('ui_click')
              act(rx.closeDialogue(run, C))
            }}
          >
            {ko ? '계속' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  )
}
