// Mythos 2.0 — safehouse conversation with one companion. The authored bond line opens it; the player can then
// say up to four short things and the companion answers in voice (AI GM, authored fallback on any miss).
// Pure flavour: nothing here touches the run (the bond +1 was already granted by the rest reducer).

import { MessageCircle, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ContentRegistry, Lang, MetaProfile, RunState } from '../../engine/types.ts'
import { TALK_LIMITS, type TalkTurn } from '../../net/api.ts'
import { portrait } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { ReportLine } from '../components/ReportLine.tsx'
import { sound } from '../components/sound.ts'
import { Typewriter } from '../components/Typewriter.tsx'
import { companionReply } from './gm.ts'
import './voices.css'

interface Msg {
  id: number
  role: TalkTurn['role']
  text: string
  /** A model wrote it (offer the report flag). */
  llm?: boolean
}

interface Props {
  run: RunState
  C: ContentRegistry
  lang: Lang
  settings: MetaProfile['settings']
  companionId: string
  /** The authored bond line that opens the conversation (already localised). */
  opening: string
}

export function CompanionChat({ run, C, lang, settings, companionId, opening }: Props) {
  const ko = lang === 'ko'
  const def = C.companions[companionId]
  const member = run.party.find((m) => m.id === companionId)
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ id: 0, role: 'companion', text: opening }])
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ctrl = useRef<AbortController | null>(null)

  const used = msgs.filter((m) => m.role === 'player').length
  const left = TALK_LIMITS.playerMessages - used
  const latestId = msgs[msgs.length - 1]?.id

  useEffect(() => () => ctrl.current?.abort(), [])
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, waiting])

  if (!def) return null
  const name = tr(def.name, lang)

  const send = async () => {
    const text = draft.trim().slice(0, TALK_LIMITS.message)
    if (!text || waiting || left <= 0) return
    sound('ui_click')
    const history: TalkTurn[] = msgs.map((m) => ({ role: m.role, text: m.text }))
    const nextId = msgs.length
    setMsgs((prev) => [...prev, { id: nextId, role: 'player', text }])
    setDraft('')
    setWaiting(true)
    ctrl.current?.abort()
    const abort = new AbortController()
    ctrl.current = abort
    const bond = member?.bond ?? 1
    const reply = await companionReply(
      {
        lang,
        companion: companionId,
        message: text,
        history,
        context: {
          name,
          alias: tr(def.alias, lang),
          role: tr(def.role, lang),
          bondLines: def.bondLines.slice(0, Math.max(1, bond)).map((l) => tr(l, lang)),
          bond,
          act: run.act,
          actName: tr(C.acts[run.act]?.name, lang),
          log: run.log
            .slice(-5)
            .map((e) => tr(e.note, lang))
            .filter(Boolean),
          archetype: tr(C.archetypes[run.archetype]?.name, lang),
          party: run.party.map((m) => tr(C.companions[m.id]?.name, lang)).filter(Boolean),
        },
      },
      abort.signal,
    )
    if (abort.signal.aborted) return
    setWaiting(false)
    setMsgs((prev) => [...prev, { id: nextId + 1, role: 'companion', text: reply.text, llm: reply.source === 'llm' }])
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <section className="m2-chat" aria-label={ko ? `대화 · ${name}` : `Talking with ${name}`}>
      <header className="m2-chat__head">
        <img src={portrait(def.sprite)} alt="" />
        <div className="m2-chat__who">
          <b>{name}</b>
          <small>
            {tr(def.alias, lang)} · {tr(def.role, lang)}
          </small>
        </div>
        {member && (
          <span className="m2-bondpips" title={ko ? '유대' : 'Bond'}>
            {[1, 2, 3].map((i) => (
              <i key={i} className={i <= member.bond ? 'is-on' : ''} />
            ))}
          </span>
        )}
      </header>

      <div className="m2-chat__log" ref={logRef} aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={`m2-chat__msg is-${m.role}`}>
            {m.role === 'companion' && m.id === latestId ? <Typewriter text={m.text} cps={settings.fastAnim ? 400 : 48} /> : <span>{m.text}</span>}
            {m.llm && <ReportLine className="m2-chat__report" line={{ route: 'talk', kind: `companion:${companionId}`, lang, text: m.text }} lang={lang} />}
          </div>
        ))}
        {waiting && (
          <div className="m2-chat__msg is-companion is-typing" aria-label={ko ? `${name} 입력 중` : `${name} is typing`}>
            <span className="m2-chat__dots">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>

      {left > 0 ? (
        <form
          className="m2-chat__input"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <MessageCircle size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            value={draft}
            maxLength={TALK_LIMITS.message}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={ko ? `${name}에게 말을 건다…` : `Say something to ${name}…`}
            disabled={waiting}
            aria-label={ko ? '할 말' : 'Message'}
          />
          <span className="m2-chat__left m2-mono" title={ko ? '남은 말' : 'Lines left'}>
            {left}
          </span>
          <button className="m2-btn m2-chat__send" type="submit" disabled={!draft.trim() || waiting} aria-label={ko ? '보내기' : 'Send'}>
            <SendHorizontal size={16} />
          </button>
        </form>
      ) : (
        !waiting && <p className="m2-chat__end">{ko ? '대화가 잦아든다. 이제 떠날 시간이다.' : 'The talk winds down. Time to move.'}</p>
      )}
    </section>
  )
}
