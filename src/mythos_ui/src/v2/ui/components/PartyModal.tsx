// Mythos 2.0 — the party screen. One place for everyone in the crew: pick a person on the left, and the right shows their
// level, stats, gear and the inventory for the slot in hand. Everything that changes the crew is map-only (engine `onScreen`);
// elsewhere the same screen reads as a record. Benched companions keep their HP, level and bond, and their gear.
import { Shield, Swords, Users } from 'lucide-react'
import { useState } from 'react'
import { MAX_COMPANION_LEVEL, companionStats, levelOf, xpToNext } from '../../engine/companionLevel.ts'
import { STAT_MAX, partySlots } from '../../engine/run.ts'
import { squadTacticFor } from '../../engine/squad.ts'
import type { ContentRegistry, GearDef, GearSlot, Lang, PartyMember, RunState, StatKey, Stats } from '../../engine/types.ts'
import { GEAR_ART } from '../common/artManifest.ts'
import { asset, portrait } from '../common/assets.ts'
import { L, tr } from '../common/lang.ts'
import { rx } from '../shell/rx.ts'
import { companionSprite } from './format.ts'
import { gearLine } from './gearLine.ts'
import { HpBar } from './HpBar.tsx'
import { Modal } from './Modal.tsx'
import { sound } from './sound.ts'
import { statPerkLines } from './statPerkLines.ts'
import './party.css'

interface Props {
  run: RunState
  C: ContentRegistry
  lang: Lang
  onChange: (run: RunState) => void
  onClose: () => void
}

const CONNECTOR = 'connector'
const STATS: { key: StatKey; name: ReturnType<typeof L> }[] = [
  { key: 'str', name: L('근력', 'STR') },
  { key: 'agi', name: L('민첩', 'AGI') },
  { key: 'int', name: L('지능', 'INT') },
  { key: 'cha', name: L('매력', 'CHA') },
  { key: 'obs', name: L('관찰', 'OBS') },
]
const SLOTS: { slot: GearSlot; name: ReturnType<typeof L> }[] = [
  { slot: 'weapon', name: L('무기', 'Weapon') },
  { slot: 'armor', name: L('보호구', 'Armor') },
]

function StatBars({ stats, perks, onGrow, lang }: { stats: Stats; perks?: [string, string][]; onGrow?: (k: StatKey) => void; lang: Lang }) {
  return (
    <ul className="m2-pt__stats">
      {STATS.map(({ key, name }, i) => (
        <li key={key}>
          <span className="m2-pt__statname">{tr(name, lang)}</span>
          <span className="m2-pt__bar" aria-label={`${stats[key]}/${STAT_MAX}`}>
            <i style={{ width: `${(stats[key] / STAT_MAX) * 100}%` }} />
            {[10, 15].map((n) => (
              <em key={n} style={{ left: `${(n / STAT_MAX) * 100}%` }} />
            ))}
          </span>
          <b className="m2-mono">{stats[key]}</b>
          {onGrow && (
            <button type="button" className="m2-pt__plus" disabled={stats[key] >= STAT_MAX} onClick={() => onGrow(key)} aria-label={`${tr(name, lang)} +1`}>
              +
            </button>
          )}
          {perks?.[i]?.[1] && <small>{perks[i]?.[1]}</small>}
        </li>
      ))}
    </ul>
  )
}

export function PartyModal({ run, C, lang, onChange, onClose }: Props) {
  const ko = lang === 'ko'
  const editable = run.screen.kind === 'map'
  const [who, setWho] = useState(CONNECTOR)
  const [slot, setSlot] = useState<GearSlot>('weapon')
  const slots = partySlots(run)
  const deployed = run.party.map((m) => m.id)
  const bench = run.bench ?? []
  const member: PartyMember | undefined = [...run.party, ...bench].find((m) => m.id === who)
  const def = member ? C.companions[member.id] : undefined
  const arch = C.archetypes[run.archetype]
  const growth = run.growth ?? 0
  const tactic = squadTacticFor(deployed, C)
  const wornBy = (id: string): string | undefined => Object.entries(run.worn ?? {}).find(([, w]) => Object.values(w).includes(id))?.[0]
  const nameOf = (id: string): string => (id === CONNECTOR ? tr(arch?.name, lang) : tr(C.companions[id]?.name, lang))

  const apply = (next: RunState) => {
    if (next === run) return sound('error')
    sound('ui_click')
    onChange(next)
  }

  const rosterRow = (id: string, m: PartyMember | undefined, tag: string) => {
    const img = id === CONNECTOR ? (arch?.sprite ?? 'player-noise') : companionSprite(id, C)
    const hp = m ? m.hp : run.hp
    const maxHp = m ? m.maxHp : run.maxHp
    return (
      <li key={id}>
        <button type="button" className={`m2-pt__person${who === id ? ' is-on' : ''}`} onClick={() => setWho(id)}>
          <img src={portrait(img)} alt="" />
          <span className="m2-pt__personbody">
            <b>{nameOf(id)}</b>
            <small>{tag}</small>
            <HpBar hp={hp} max={maxHp} small label={false} />
          </span>
        </button>
      </li>
    )
  }

  const worn = run.worn?.[who] ?? {}
  const pieces: GearDef[] = (run.gear ?? []).flatMap((id) => {
    const g = C.gear?.[id]
    return g && g.slot === slot ? [g] : []
  })

  return (
    <Modal
      wide
      onClose={onClose}
      title={
        <span className="m2-party__title">
          <Users size={16} aria-hidden="true" /> {ko ? '파티' : 'Party'}
          {growth > 0 && <span className="m2-pt__points">{ko ? `성장 포인트 ${growth}` : `${growth} growth`}</span>}
        </span>
      }
    >
      <div className="m2-pt">
        <aside className="m2-pt__roster">
          <h3>
            {ko ? '출격' : 'Deployed'} <span className="m2-mono">{deployed.length}/{slots}</span>
          </h3>
          <ul>
            {rosterRow(CONNECTOR, undefined, ko ? '접속자' : 'Connector')}
            {run.party.map((m) => rosterRow(m.id, m, ko ? `레벨 ${levelOf(m)}` : `Level ${levelOf(m)}`))}
          </ul>
          {bench.length > 0 && <h3>{ko ? '대기' : 'Bench'}</h3>}
          <ul>{bench.map((m) => rosterRow(m.id, m, ko ? `레벨 ${levelOf(m)}` : `Level ${levelOf(m)}`))}</ul>
          {tactic && (
            <p className="m2-pt__tactic">
              <b>{tr(tactic.name, lang)}</b>
              <small>{tr(tactic.text, lang)}</small>
            </p>
          )}
        </aside>

        <section className="m2-pt__detail">
          <header className="m2-pt__head">
            <img src={portrait(member ? companionSprite(member.id, C) : (arch?.sprite ?? 'player-noise'))} alt="" />
            <div>
              <h2>{nameOf(who)}</h2>
              <p>{member ? tr(def?.role, lang) : tr(arch?.tagline, lang)}</p>
              {member && (
                <p className="m2-pt__level">
                  <b>{ko ? `레벨 ${levelOf(member)}` : `Level ${levelOf(member)}`}</b>
                  {levelOf(member) < MAX_COMPANION_LEVEL ? (ko ? ` · 다음까지 승리 ${xpToNext(member)}` : ` · ${xpToNext(member)} wins to next`) : ko ? ' · 최대' : ' · Max'}
                  {' · '}
                  {ko ? '유대' : 'Bond'} {member.bond}/3
                </p>
              )}
              {member && editable && (
                <div className="m2-pt__acts">
                  {deployed.includes(member.id) ? (
                    <button type="button" className="m2-btn m2-btn--ghost" onClick={() => apply(rx.setDeployment(run, deployed.filter((id) => id !== member.id)))}>
                      {ko ? '대기로' : 'Bench'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="m2-btn"
                      disabled={deployed.length >= slots}
                      title={deployed.length >= slots ? (ko ? '먼저 출격 중인 동료 한 명을 대기로 돌린다' : 'Bench a deployed companion first') : undefined}
                      onClick={() => apply(rx.setDeployment(run, [...deployed, member.id]))}
                    >
                      {ko ? '출격' : 'Deploy'}
                    </button>
                  )}
                  {levelOf(member) < MAX_COMPANION_LEVEL && (
                    <button type="button" className="m2-btn m2-btn--ghost" disabled={growth <= 0} onClick={() => apply(rx.trainCompanion(run, member.id, C))}>
                      {ko ? '훈련 (성장 포인트 1)' : 'Train (1 growth)'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>

          {member && def ? (
            <>
              <StatBars lang={lang} stats={companionStats(def, levelOf(member))} />
              {def.combatPassive && (
                <p className="m2-pt__passive">
                  <b>{tr(def.combatPassive.name, lang)}</b> · {tr(def.combatPassive.text, lang)}
                </p>
              )}
              <p className="m2-pt__hint">{ko ? '레벨 3: 개전 방어막 · 레벨 5: 개전 기세' : 'Level 3: start block · Level 5: start Momentum'}</p>
            </>
          ) : (
            <StatBars lang={lang} stats={run.stats} perks={statPerkLines(run.stats, lang)} {...(editable && growth > 0 ? { onGrow: (k: StatKey) => apply(rx.spendGrowth(run, k)) } : {})} />
          )}

          <div className="m2-pt__slots">
            {SLOTS.map(({ slot: s, name }) => {
              const on = worn[s] ? C.gear?.[worn[s] as string] : undefined
              return (
                <button key={s} type="button" className={`m2-pt__slot${slot === s ? ' is-on' : ''}`} onClick={() => setSlot(s)}>
                  {on && GEAR_ART[on.id] ? <img src={asset(GEAR_ART[on.id])} alt="" className="m2-pt__gearicon" /> : s === 'weapon' ? <Swords size={16} aria-hidden="true" /> : <Shield size={16} aria-hidden="true" />}
                  <span>
                    <small>{tr(name, lang)}</small>
                    <b>{on ? tr(on.name, lang) : ko ? '비어 있음' : 'Empty'}</b>
                    {on && <small>{gearLine(on.mods, lang)}</small>}
                  </span>
                </button>
              )
            })}
          </div>

          <ul className="m2-pt__inv">
            {pieces.length === 0 && <li className="m2-pt__empty">{ko ? '가진 장비가 없다. 엘리트, 보스, 상점에서 얻는다.' : 'Nothing here yet. Elites, bosses and shops carry gear.'}</li>}
            {pieces.map((g) => {
              const owner = wornBy(g.id)
              const mine = owner === who
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    className={`m2-pt__item is-${g.rarity}${mine ? ' is-mine' : ''}`}
                    disabled={!editable}
                    onClick={() => apply(rx.equipGear(run, who, slot, mine ? null : g.id, C))}
                  >
                    {GEAR_ART[g.id] && <img src={asset(GEAR_ART[g.id])} alt="" className="m2-pt__gearicon" />}
                    <b>{tr(g.name, lang)}</b>
                    <span>{gearLine(g.mods, lang)}</span>
                    {owner && <small>{mine ? (ko ? '착용 중 · 눌러서 해제' : 'Worn · tap to remove') : ko ? `${nameOf(owner)} 착용 중` : `On ${nameOf(owner)}`}</small>}
                  </button>
                </li>
              )
            })}
          </ul>
          {!editable && <p className="m2-pt__hint">{ko ? '편성과 장비는 작전 지도에서만 바꿀 수 있다.' : 'Change the line-up and gear on the map.'}</p>}
        </section>
      </div>
    </Modal>
  )
}
