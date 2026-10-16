// Mythos 2.0 — the run's comms log (ui/common/commsLog.ts): every GM / IX / boss / companion line seen this run and
// what the player said back, oldest first, grouped by act. AI-written lines carry a mark and the report flag.
import { MessagesSquare } from 'lucide-react'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { ContentRegistry, Lang } from '../../engine/types.ts'
import { commsEntries, subscribeComms, type CommsEntry } from '../common/commsLog.ts'
import { tr } from '../common/lang.ts'
import { Modal } from './Modal.tsx'
import { ReportLine } from './ReportLine.tsx'
import './commslog.css'

function speakerName(e: CommsEntry, C: ContentRegistry, ko: boolean): string {
  const mate = e.companion ? tr(C.companions[e.companion]?.name, ko ? 'ko' : 'en') : ''
  switch (e.speaker) {
    case 'gm':
      return 'GM'
    case 'boss':
      return e.where ? `GM · ${e.where}` : ko ? 'GM · 보스전' : 'GM · Boss'
    case 'ix':
      return ko ? '관리자 IX' : 'Administrator IX'
    case 'companion':
      return mate || (ko ? '동료' : 'Companion')
    case 'player':
      return mate ? (ko ? `나 → ${mate}` : `You → ${mate}`) : ko ? '나' : 'You'
  }
}

export function CommsLogModal({ C, lang, onClose }: { C: ContentRegistry; lang: Lang; onClose: () => void }) {
  const ko = lang === 'ko'
  const entries = useSyncExternalStore(subscribeComms, commsEntries, commsEntries)
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries.length])

  const aiCount = entries.filter((e) => e.ai).length
  return (
    <Modal
      wide
      onClose={onClose}
      title={
        <span className="m2-comms__title">
          <MessagesSquare size={16} aria-hidden="true" /> {ko ? '통신 기록' : 'Comms log'}
        </span>
      }
    >
      <p className="m2-comms__note">
        {ko
          ? `이번 루프에서 오간 말. AI 표시가 붙은 대사(${aiCount})는 AI가 썼다. 부적절하면 깃발로 알려 달라.`
          : `Everything said this loop. Lines marked AI (${aiCount}) were written by AI; flag anything inappropriate.`}
      </p>
      {entries.length ? (
        <ol className="m2-comms" ref={listRef} aria-label={ko ? '통신 기록' : 'Comms log'}>
          {entries.map((e, i) => {
            // A line without an act (IX comms) never opens or repeats a heading.
            const prevAct = entries.slice(0, i).findLast((p) => p.act !== undefined)?.act
            const actHead = e.act !== undefined && e.act !== prevAct
            return (
              <li key={e.id} className={`m2-comms__item is-${e.speaker}${e.ai ? ' is-ai' : ''}`}>
                {actHead && (
                  <div className="m2-comms__act">
                    {ko ? `${e.act}막` : `Act ${e.act}`} · {tr(C.acts[e.act as 1 | 2 | 3]?.name, lang)}
                  </div>
                )}
                <div className="m2-comms__head">
                  <b>{speakerName(e, C, ko)}</b>
                  {e.where && e.speaker === 'gm' && <small>{e.where}</small>}
                  {e.ai && <span className="m2-comms__ai">AI</span>}
                  {e.ai && <ReportLine className="m2-comms__report" line={{ route: e.report?.route ?? 'narrate', kind: e.report?.kind ?? e.speaker, lang, text: e.text }} lang={lang} />}
                </div>
                <p>{e.text}</p>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="m2-comms__empty">{ko ? '아직 오간 말이 없다.' : 'Nothing has been said yet.'}</p>
      )}
    </Modal>
  )
}
