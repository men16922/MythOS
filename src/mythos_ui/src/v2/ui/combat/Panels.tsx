// Combat HUD panels: top strip, party roster, unit/tile detail, pile viewer.

import { memo, useContext } from 'react'
import { Hourglass, Footprints, Menu, Zap as ZapIcon, Shield as ShieldIcon } from 'lucide-react'
import type { IntentInfo } from '../../engine/combat.ts'
import { GRID_W } from '../../engine/types.ts'
import type { CardInstance, CombatState, ContentRegistry, EncounterDef, Lang, StatusKind, Tile, UnitState } from '../../engine/types.ts'
import { STATUS_ICON, portrait } from '../common/assets.ts'
import { V2_SPRITES } from '../common/spriteManifest.ts'
import { tr } from '../common/lang.ts'
import { ShellMenu } from '../common/shellMenu.ts'
import { CardView } from '../components/CardView.tsx'
import { ImplantIcon } from '../components/ImplantIcon.tsx'
import { Modal } from '../components/Modal.tsx'
import { PatternIcon, ShieldGlyph } from './Board.tsx'
import { STATUS_NAME, STATUS_TEXT, TRACK_NOTE, bonusProgress, bonusText, describeMove, kindTag, objectiveText } from './describe.ts'

const ko = (lang: Lang, a: string, b: string) => (lang === 'ko' ? a : b)
const STATUS_ORDER: StatusKind[] = ['burn', 'shock', 'mark', 'weak', 'guard', 'thorns']

function portraitOf(u: UnitState): string {
  return portrait(u.sprite)
}

// ---------------------------------------------------------------- top strip

export const TopStrip = memo(function TopStrip(p: {
  c: CombatState
  enc: EncounterDef | undefined
  C: ContentRegistry
  lang: Lang
  enemyPhase: boolean
  flashImplant: string | null
  threatOn: boolean
  onThreat: () => void
  onLegend: () => void
  /** Implant icon size (phone layouts shrink it). */
  implantSize?: number
}) {
  const { c, enc, lang } = p
  const tag = kindTag(enc?.kind, lang)
  const prog = bonusProgress(c)
  const openMenu = useContext(ShellMenu)
  return (
    <div className="m2c-top">
      <div className={`m2c-turn${p.enemyPhase ? ' is-enemy' : ''}`}>
        <span className="m2c-turn-k">{ko(lang, '턴', 'TURN')}</span>
        <b>{c.turn}</b>
        <span className="m2c-phase">{p.enemyPhase ? ko(lang, '적 페이즈', 'ENEMY PHASE') : ko(lang, '당신의 턴', 'YOUR MOVE')}</span>
      </div>
      <div className="m2c-enc">
        {tag && <em className={`m2c-tag is-${enc?.kind}`}>{tag}</em>}
        <span className="m2c-enc-name">{enc ? tr(enc.name, lang) : ''}</span>
        <span className="m2c-obj">{objectiveText(enc, c, lang)}</span>
        {c.bonus && (
          <span className={`m2c-bonus${c.bonus.failed ? ' is-failed' : ''}`} title={ko(lang, '보너스 목표 — 달성 시 추가 보상', 'Bonus objective — extra reward if met')}>
            <i>★</i>
            {bonusText(c.bonus.def, lang)}
            {prog && !c.bonus.failed && <b>{prog}</b>}
            {c.bonus.failed && <b>{ko(lang, '실패', 'FAILED')}</b>}
          </span>
        )}
      </div>
      <div className="m2c-top-r">
        <div className="m2c-implants">
          {c.implants.map((id) => {
            const def = p.C.implants[id]
            return def ? <ImplantIcon key={id} def={def} lang={lang} size={p.implantSize ?? 30} flash={p.flashImplant === id} /> : null
          })}
        </div>
        <button type="button" className={`m2c-chip${p.threatOn ? ' is-on' : ''}`} onClick={p.onThreat} title={ko(lang, '위협 지도 (T / Alt)', 'Threat map (T / hold Alt)')}>
          <span className="m2c-kbd">T</span>
          {ko(lang, '위협', 'Threat')}
        </button>
        <button type="button" className="m2c-chip" onClick={p.onLegend}>
          ?
        </button>
        {openMenu && (
          <button type="button" className="m2c-chip" onClick={openMenu} title={ko(lang, '메뉴 · 저장하고 나가기 (자동 저장 중)', 'Menu · save & quit (auto-saved)')}>
            <Menu size={14} />
          </button>
        )}
      </div>
    </div>
  )
})

// ---------------------------------------------------------------- party roster

export const PartyPanel = memo(function PartyPanel(p: {
  units: UnitState[]
  C: ContentRegistry
  lang: Lang
  selected: string | null
  danger: Record<string, number>
  onSelect: (uid: string) => void
  onHover: (uid: string | null) => void
}) {
  const { lang } = p
  return (
    <div className="m2c-party">
      <div className="m2c-panel-h">{ko(lang, '분대', 'SQUAD')}</div>
      {p.units.map((u) => {
        const down = u.hp <= 0
        const shocked = (u.statuses.shock ?? 0) > 0
        const pct = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)))
        const dmg = p.danger[u.uid] ?? 0
        return (
          <button
            key={u.uid}
            type="button"
            className={`m2c-pu is-${u.side}${p.selected === u.uid ? ' is-sel' : ''}${down ? ' is-down' : ''}${dmg > 0 ? ' is-danger' : ''}`}
            onClick={() => !down && u.side === 'party' && p.onSelect(u.uid)}
            onMouseEnter={() => p.onHover(u.uid)}
            onMouseLeave={() => p.onHover(null)}
          >
            <span className={V2_SPRITES[u.sprite] ? 'm2c-pu-face is-body' : 'm2c-pu-face'}>
              <img src={portraitOf(u)} alt="" draggable={false} />
            </span>
            <span className="m2c-pu-main">
              <span className="m2c-pu-name">
                {tr(u.name, lang)}
                {u.side === 'neutral' && <em>{ko(lang, '보호', 'VIP')}</em>}
              </span>
              <span className="m2c-pu-hp">
                <span className="m2c-pu-fill" style={{ width: `${pct * 100}%` }} />
                {dmg > 0 && <span className="m2c-pu-threat" style={{ left: `${Math.max(0, pct - dmg / Math.max(1, u.maxHp)) * 100}%`, width: `${Math.min(pct, dmg / Math.max(1, u.maxHp)) * 100}%` }} />}
                <b>
                  {u.hp}/{u.maxHp}
                </b>
              </span>
              <span className="m2c-pu-row">
                {u.block > 0 && (
                  <span className="m2c-pu-block">
                    <ShieldGlyph />
                    {u.block}
                  </span>
                )}
                {STATUS_ORDER.filter((k) => (u.statuses[k] ?? 0) > 0).map((k) => (
                  <span key={k} className="m2c-pu-st" title={tr(STATUS_NAME[k], lang)}>
                    <img src={STATUS_ICON[k]} alt="" />
                    {u.statuses[k]}
                  </span>
                ))}
                {down && u.uid !== 'connector' && <span className="m2c-pu-down">{ko(lang, '전투 불능', 'DOWN')}</span>}
                {u.side === 'party' && !down && (
                  <span className={`m2c-pu-move${u.moved || shocked ? ' is-spent' : ''}`}>
                    <Footprints size={11} strokeWidth={2.5} />
                    {shocked ? ko(lang, '감전', 'shocked') : u.moved ? ko(lang, '이동 완료', 'moved') : ko(lang, '이동 가능', 'can move')}
                  </span>
                )}
                {dmg > 0 && <span className="m2c-pu-warn">⚠ -{dmg}</span>}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
})

// ---------------------------------------------------------------- detail

const TILE_INFO: Record<Tile['kind'], { name: [string, string]; text: [string, string] }> = {
  floor: { name: ['바닥', 'Floor'], text: ['아무 제약 없는 평지.', 'Open ground.'] },
  cover: {
    name: ['엄폐물', 'Cover'],
    text: ['이동과 투사체를 막는다. 밀려 부딪힌 유닛은 충돌 피해 1, 엄폐물은 내구도 −1.', 'Blocks movement and shots. Units pushed into it take 1 bump damage; cover loses 1 hp.'],
  },
  hazard: {
    name: ['전기 바닥', 'Live Wire'],
    text: ['이 위에서 적 페이즈를 마치거나 밀려 들어오면 피해 2.', 'Deals 2 damage to a unit that ends the enemy phase on it or is pushed onto it.'],
  },
  void: {
    name: ['붕괴 구역', 'Void'],
    text: ['적을 밀어 넣으면 그 자리에서 삭제된다. 아군에게는 벽이다.', 'Push an enemy in and it is deleted. A wall for your squad.'],
  },
}

export const DetailPanel = memo(function DetailPanel(p: {
  unit: UnitState | null
  intent: IntentInfo | null
  tile: { kind: Tile['kind']; hp?: number; fire?: number; ttl?: number } | null
  C: ContentRegistry
  lang: Lang
  threats: number
  /** Touch UI: "tap" wording for the empty state. */
  touch?: boolean
}) {
  const { unit: u, lang, C } = p
  if (!u) {
    if (!p.tile) {
      return (
        <div className="m2c-detail is-empty">
          <div className="m2c-panel-h">{ko(lang, '정보', 'INTEL')}</div>
          <p>
            {p.touch
              ? ko(lang, '유닛이나 칸을 누르면 자세한 정보가 뜬다.', 'Tap a unit or tile for details.')
              : ko(lang, '유닛이나 칸 위에 커서를 올리면 자세한 정보가 뜬다.', 'Hover a unit or tile for details.')}
          </p>
        </div>
      )
    }
    const info = TILE_INFO[p.tile.kind]
    return (
      <div className="m2c-detail">
        <div className="m2c-panel-h">{ko(lang, '지형', 'TERRAIN')}</div>
        <div className="m2c-d-name">{ko(lang, ...info.name)}</div>
        <p className="m2c-d-text">{ko(lang, ...info.text)}</p>
        {p.tile.kind === 'cover' && (
          <p className="m2c-d-sub">
            {ko(lang, '내구도', 'Durability')} {p.tile.hp ?? 2}
          </p>
        )}
        {(p.tile.fire ?? 0) > 0 && (
          <p className="m2c-d-warn">
            {ko(
              lang,
              `불길 · ${p.tile.fire}턴 더 탄다. 들어서거나 이 위에서 적 페이즈를 마치면 화상 2.`,
              `Fire · burns ${p.tile.fire} more turn(s). Entering it, or ending the enemy phase on it, inflicts Burn 2.`,
            )}
          </p>
        )}
        {p.tile.ttl !== undefined && (
          <p className="m2c-d-sub">{ko(lang, `임시 전류 · ${p.tile.ttl}턴 뒤 꺼진다.`, `Temporary · shorts out in ${p.tile.ttl} turn(s).`)}</p>
        )}
        {p.threats > 0 && <p className="m2c-d-warn">{ko(lang, `이 칸에 예고된 피해 ${p.threats}`, `${p.threats} damage incoming here`)}</p>}
      </div>
    )
  }
  const enemyDef = u.side === 'enemy' ? C.enemies[u.defId] : undefined
  const comp = C.companions[u.defId]
  const statuses = STATUS_ORDER.filter((k) => (u.statuses[k] ?? 0) > 0)
  const pct = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)))
  const tier = enemyDef?.tier
  // Boss phases: show the thresholds still ahead on the hp bar, and what the next one does — otherwise the
  // phase heal reads as an attack that *healed* the boss (the damage preview shows a green +N).
  const phasesLeft = (enemyDef?.phases ?? []).slice(u.phase ?? 0)
  const nextPhase = phasesLeft[0]
  const phaseGains = nextPhase
    ? [
        ...(nextPhase.heal ? [ko(lang, `회복 ${nextPhase.heal}`, `heal ${nextPhase.heal}`)] : []),
        ...(nextPhase.effects ?? []).flatMap((e) =>
          e.kind === 'block'
            ? [ko(lang, `방어막 ${e.amount}`, `block ${e.amount}`)]
            : e.kind === 'status'
              ? [`${tr(STATUS_NAME[e.status], lang)} ${e.amount}`]
              : e.kind === 'heal'
                ? [ko(lang, `회복 ${e.amount}`, `heal ${e.amount}`)]
                : [],
        ),
      ]
    : []
  return (
    <div className={`m2c-detail is-${u.side}`}>
      <div className="m2c-panel-h">
        {u.side === 'enemy' ? ko(lang, '적성 개체', 'HOSTILE') : u.side === 'neutral' ? ko(lang, '민간인', 'CIVILIAN') : ko(lang, '아군', 'SQUAD')}
        {tier && tier !== 'normal' && <em className={`m2c-tag is-${tier}`}>{tier === 'minion' ? ko(lang, '하급', 'MINION') : tier === 'elite' ? ko(lang, '정예', 'ELITE') : ko(lang, '보스', 'BOSS')}</em>}
      </div>
      <div className="m2c-d-head">
        <span className={V2_SPRITES[u.sprite] ? 'm2c-d-face is-body' : 'm2c-d-face'}>
          <img src={portraitOf(u)} alt="" draggable={false} />
        </span>
        <span>
          <span className="m2c-d-name">{tr(u.name, lang)}</span>
          <span className="m2c-d-hp">
            <span style={{ width: `${pct * 100}%` }} />
            {phasesLeft.map((ph, i) => (
              <i key={i} className="m2c-d-hp-tick" style={{ left: `${ph.hpBelow * 100}%` }} />
            ))}
            <b>
              {u.hp}/{u.maxHp}
            </b>
          </span>
          <span className="m2c-d-stats">
            {u.block > 0 && (
              <span className="is-block">
                <ShieldGlyph /> {u.block}
              </span>
            )}
            {u.armor > 0 && (
              <span title={ko(lang, '장갑: 맞을 때마다 피해 감소', 'Armor: reduces each hit')}>
                <ShieldIcon size={11} /> {ko(lang, '장갑', 'Armor')} {u.armor}
              </span>
            )}
            <span>
              <Footprints size={11} /> {u.move}
            </span>
            {u.flying && <span>{ko(lang, '비행', 'Flying')}</span>}
          </span>
        </span>
      </div>
      {p.intent && (
        <div className={`m2c-d-intent${p.intent.windupLeft > 0 ? ' is-wind' : ''}`}>
          <div className="m2c-d-ih">
            <PatternIcon p={p.intent.move.pattern} size={14} />
            <b>{tr(p.intent.move.name, lang)}</b>
            {p.intent.windupLeft > 0 && (
              <span className="m2c-d-wind">
                <Hourglass size={11} /> {p.intent.windupLeft + 1}
              </span>
            )}
          </div>
          <div className="m2c-d-it">{describeMove(p.intent.move, p.intent.damage, p.intent.windupLeft, lang)}</div>
          {p.intent.move.pattern === 'track' && <div className="m2c-d-track">{tr(TRACK_NOTE, lang)}</div>}
        </div>
      )}
      {u.side === 'enemy' && !p.intent && <div className="m2c-d-sub">{ko(lang, '예고된 행동 없음', 'No telegraphed action')}</div>}
      {nextPhase && (
        <div className="m2c-d-phase">
          {ko(lang, `다음 단계 · HP ${Math.floor(nextPhase.hpBelow * u.maxHp)} 이하`, `Next phase · HP ≤ ${Math.floor(nextPhase.hpBelow * u.maxHp)}`)}
          {phaseGains.length > 0 && <b> · {phaseGains.join(' · ')}</b>}
        </div>
      )}
      {enemyDef?.passive && (
        <div className="m2c-d-passive">
          <ZapIcon size={11} /> {tr(enemyDef.passive, lang)}
        </div>
      )}
      {comp?.combatPassive && (
        <div className="m2c-d-passive is-combat">
          <ZapIcon size={11} /> <b>{tr(comp.combatPassive.name, lang)}</b> {tr(comp.combatPassive.text, lang)}
        </div>
      )}
      {comp && <div className="m2c-d-passive">{tr(comp.passiveText, lang)}</div>}
      {statuses.length > 0 && (
        <ul className="m2c-d-statuses">
          {statuses.map((k) => (
            <li key={k}>
              <img src={STATUS_ICON[k]} alt="" />
              <b>
                {tr(STATUS_NAME[k], lang)} {u.statuses[k]}
              </b>
              <span>{tr(STATUS_TEXT[k], lang)}</span>
            </li>
          ))}
        </ul>
      )}
      {u.side === 'enemy' && u.pos.x < GRID_W && (
        <div className="m2c-d-tip">{ko(lang, '다른 적이나 벽에 밀어 부딪히게 하거나, 붕괴 구역에 빠뜨려라.', 'Push it into others, walls or the void.')}</div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------- piles

export function PileModal(p: { kind: 'draw' | 'discard' | 'exhaust'; cards: CardInstance[]; C: ContentRegistry; lang: Lang; onClose: () => void }) {
  const { lang } = p
  const title =
    p.kind === 'draw' ? ko(lang, '뽑을 카드 더미', 'Draw pile') : p.kind === 'discard' ? ko(lang, '버린 카드 더미', 'Discard pile') : ko(lang, '소멸된 카드', 'Exhausted')
  const cards = p.kind === 'draw' ? [...p.cards].sort((a, b) => a.defId.localeCompare(b.defId)) : p.cards
  return (
    <Modal title={`${title} · ${p.cards.length}`} onClose={p.onClose} wide>
      {p.kind === 'draw' && <p className="m2c-pile-note">{ko(lang, '순서는 공개되지 않는다.', 'Order is hidden.')}</p>}
      <div className="m2c-pile-grid">
        {cards.length === 0 && <p className="m2c-pile-note">{ko(lang, '비어 있다.', 'Empty.')}</p>}
        {cards.map((c) => {
          const def = p.C.cards[c.defId]
          return def ? <CardView key={c.uid} def={def} upgraded={c.upgraded} lang={lang} size="sm" /> : null
        })}
      </div>
    </Modal>
  )
}
