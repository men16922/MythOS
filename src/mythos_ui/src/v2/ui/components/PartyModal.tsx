// Mythos 2.0 — the party screen: every recruited companion, who is deployed (two slots) and who waits on the bench.
// Swapping is a map-only action (engine `setDeployment`); elsewhere the screen is read-only. Benched companions keep
// their HP and bond, rest at the safehouse, and their cards sit fights out.
import { Users } from 'lucide-react'
import type { ContentRegistry, Lang, PartyMember, RunState } from '../../engine/types.ts'
import { portrait } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { MAX_PARTY } from '../../engine/run.ts'
import { rx } from '../shell/rx.ts'
import { companionSprite } from './format.ts'
import { HpBar } from './HpBar.tsx'
import { Modal } from './Modal.tsx'
import { sound } from './sound.ts'
import './party.css'

interface Props {
  run: RunState
  C: ContentRegistry
  lang: Lang
  onChange: (run: RunState) => void
  onClose: () => void
}

export function PartyModal({ run, C, lang, onChange, onClose }: Props) {
  const ko = lang === 'ko'
  const editable = run.screen.kind === 'map'
  const deployed = run.party.map((m) => m.id)
  const bench = run.bench ?? []
  const full = deployed.length >= MAX_PARTY

  const apply = (ids: string[]) => {
    const next = rx.setDeployment(run, ids)
    if (next === run) return sound('error')
    sound('ui_click')
    onChange(next)
  }

  const card = (m: PartyMember, isDeployed: boolean) => {
    const def = C.companions[m.id]
    if (!def) return null
    return (
      <li key={m.id} className={`m2-partycard${isDeployed ? ' is-deployed' : ''}`}>
        <img src={portrait(companionSprite(m.id, C))} alt="" />
        <div className="m2-partycard__body">
          <div className="m2-partycard__head">
            <b>{tr(def.name, lang)}</b>
            <small>{tr(def.role, lang)}</small>
            <span className="m2-bondpips" title={ko ? '유대' : 'Bond'}>
              {[1, 2, 3].map((i) => (
                <i key={i} className={i <= m.bond ? 'is-on' : ''} />
              ))}
            </span>
          </div>
          <div className="m2-partycard__hp">
            <HpBar hp={m.hp} max={m.maxHp} small label={false} />
            <span className="m2-mono">
              {m.hp}/{m.maxHp}
            </span>
          </div>
          {def.combatPassive && (
            <p>
              <b>{tr(def.combatPassive.name, lang)}</b> · {tr(def.combatPassive.text, lang)}
            </p>
          )}
          <p className="m2-partycard__passive">{tr(def.passiveText, lang)}</p>
        </div>
        {editable &&
          (isDeployed ? (
            <button type="button" className="m2-btn m2-btn--ghost m2-partycard__act" onClick={() => apply(deployed.filter((id) => id !== m.id))}>
              {ko ? '대기로' : 'Bench'}
            </button>
          ) : (
            <button
              type="button"
              className="m2-btn m2-partycard__act"
              disabled={full}
              title={full ? (ko ? '먼저 출격 중인 동료 한 명을 대기로 돌린다' : 'Bench a deployed companion first') : undefined}
              onClick={() => apply([...deployed, m.id])}
            >
              {ko ? '출격' : 'Deploy'}
            </button>
          ))}
      </li>
    )
  }

  return (
    <Modal
      wide
      onClose={onClose}
      title={
        <span className="m2-party__title">
          <Users size={16} aria-hidden="true" /> {ko ? '파티' : 'Party'}
        </span>
      }
    >
      <p className="m2-party__note">
        {editable
          ? ko
            ? `출격은 최대 ${MAX_PARTY}명. 출격한 동료만 싸우고, 패시브와 카드를 빌려준다. 대기 중인 동료의 카드는 전투에서 뽑히지 않는다. 체력과 유대는 그대로 남고, 휴식처에서는 모두 함께 쉰다.`
            : `Up to ${MAX_PARTY} deployed. Only deployed companions fight and lend their passives and cards; a benched companion's cards are not drawn. HP and bond carry over, and everyone rests at the safehouse.`
          : ko
            ? '편성은 작전 지도에서만 바꿀 수 있다.'
            : 'Change the line-up on the map.'}
      </p>
      <h3 className="m2-party__label">
        {ko ? '출격' : 'Deployed'} <span className="m2-mono">{deployed.length}/{MAX_PARTY}</span>
      </h3>
      {run.party.length ? (
        <ul className="m2-party__list">{run.party.map((m) => card(m, true))}</ul>
      ) : (
        <p className="m2-party__empty">{ko ? '혼자 간다.' : 'Going alone.'}</p>
      )}
      <h3 className="m2-party__label">
        {ko ? '대기' : 'Bench'} <span className="m2-mono">{bench.length}</span>
      </h3>
      {bench.length ? (
        <ul className="m2-party__list">{bench.map((m) => card(m, false))}</ul>
      ) : (
        <p className="m2-party__empty">{ko ? '대기 중인 동료가 없다. 2막 초입에서 새 동료를 만날 수 있다.' : 'Nobody on the bench. New companions wait at the start of Act 2.'}</p>
      )}
    </Modal>
  )
}
