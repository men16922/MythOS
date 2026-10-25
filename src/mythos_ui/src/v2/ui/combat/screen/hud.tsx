// Combat screen HUD pieces around the hand: the key legend (desktop) / help popover (phones), the consumable
// slots, the pile buttons and the end-turn button.

import { BookOpen, FastForward, Flame, Trash2, Undo2 } from 'lucide-react'
import type { CombatState, ContentRegistry, Lang } from '../../../engine/types.ts'
import { CONSUMABLE_ART } from '../../common/artManifest.ts'
import { asset } from '../../common/assets.ts'
import { tr } from '../../common/lang.ts'
import { Tooltip } from '../../components/Tooltip.tsx'
import './hud.css'

/** Phone layouts: the controls in a popover (the desktop's key legend has no room). */
export function HelpPopover({ k, touch, onClose }: { k: boolean; touch: boolean; onClose: () => void }) {
  return (
    <div className="m2c-help" onClick={onClose}>
      {touch ? (
        <ul>
          <li>{k ? '대원 누르기 · 선택, 파란 칸 · 이동' : 'Tap a unit to select it, a blue tile to move'}</li>
          <li>{k ? '적이나 칸 누르기 · 정보 고정 (다시 누르면 해제)' : 'Tap an enemy or tile to inspect it (again to clear)'}</li>
          <li>{k ? '카드 누르기 · 조준 → 대상 한 번 · 미리보기 → 한 번 더 · 사용' : 'Tap a card to aim, a target once to preview, again to play'}</li>
          <li>{k ? '카드 길게 누르기 · 크게 보기' : 'Hold a card to read it'}</li>
          <li>{k ? '아래 정보 패널 누르기 · 자세히' : 'Tap the intel panel for the full details'}</li>
          <li>{k ? '위협 · 모든 적 공격 범위와 피해 합계' : 'Threat: every enemy hit and its total damage'}</li>
        </ul>
      ) : (
        <ul>
          <li>
            <kbd>1-9</kbd> {k ? '카드' : 'card'} · <kbd>⇧1-3</kbd> {k ? '소모품' : 'item'}
          </li>
          <li>
            <kbd>E</kbd> {k ? '턴 종료' : 'end turn'} · <kbd>Z</kbd> {k ? '이동 취소' : 'undo move'}
          </li>
          <li>
            <kbd>Tab</kbd> {k ? '대원 전환' : 'cycle unit'} · <kbd>T</kbd> {k ? '위협' : 'threat'} · <kbd>Esc</kbd> {k ? '취소' : 'cancel'}
          </li>
        </ul>
      )}
    </div>
  )
}

/** Desktop: the key legend under the energy orb. */
export function KeyLegend({ k }: { k: boolean }) {
  return (
    <div className="m2c-legend">
      <span>
        <kbd>1-9</kbd>
        {k ? '카드' : 'card'}
      </span>
      <span>
        <kbd>E</kbd>
        {k ? '턴 종료' : 'end turn'}
      </span>
      <span>
        <kbd>Z</kbd>
        {k ? '이동 취소' : 'undo move'}
      </span>
      <span>
        <kbd>Tab</kbd>
        {k ? '대원 전환' : 'cycle unit'}
      </span>
      <span>
        <kbd>T</kbd>
        {k ? '위협' : 'threat'}
      </span>
      <span>
        <kbd>⇧1-3</kbd>
        {k ? '소모품' : 'item'}
      </span>
      <span>
        <kbd>Esc</kbd>
        {k ? '취소' : 'cancel'}
      </span>
    </div>
  )
}

/** The three consumable slots (⇧1-3) and the deck viewer button. */
export function ItemSlots(p: { combat: CombatState; C: ContentRegistry; lang: Lang; armedIndex: number; onItem: (index: number) => void; onOpenDeck: (() => void) | undefined }) {
  const { combat, C, lang } = p
  const k = lang === 'ko'
  return (
    <div className="m2c-items">
      {[0, 1, 2].map((i) => {
        const id = combat.consumables[i]
        const def = id ? C.consumables[id] : undefined
        const icon = def ? asset(CONSUMABLE_ART[def.id] ?? def.icon) : ''
        return def ? (
          <Tooltip
            key={i}
            content={
              <div>
                <b>{tr(def.name, lang)}</b>
                <div>{tr(def.text, lang)}</div>
                <small>{k ? `무료 사용 · ⇧${i + 1}` : `Free to use · ⇧${i + 1}`}</small>
              </div>
            }
          >
            <button type="button" className={`m2c-item${p.armedIndex === i ? ' is-armed' : ''}`} onClick={() => p.onItem(i)}>
              <img src={icon} alt={tr(def.name, lang)} draggable={false} />
              <kbd>⇧{i + 1}</kbd>
            </button>
          </Tooltip>
        ) : (
          <span key={i} className="m2c-item is-empty" />
        )
      })}
      {p.onOpenDeck && (
        <button type="button" className="m2c-pilebtn" onClick={p.onOpenDeck} title={k ? '덱 보기' : 'Deck'}>
          <BookOpen size={15} />
        </button>
      )}
    </div>
  )
}

/** Discard / exhausted pile viewers and the move undo (Z). */
export function PileButtons(p: { k: boolean; discard: number; exhaust: number; canUndo: boolean; onPile: (kind: 'discard' | 'exhaust') => void; onUndo: () => void }) {
  const { k } = p
  return (
    <div className="m2c-piles">
      <button type="button" className="m2c-pilebtn" onClick={() => p.onPile('discard')} title={k ? '버린 카드' : 'Discard'}>
        <Trash2 size={14} />
        <b>{p.discard}</b>
      </button>
      <button type="button" className="m2c-pilebtn" onClick={() => p.onPile('exhaust')} title={k ? '소멸' : 'Exhausted'}>
        <Flame size={14} />
        <b>{p.exhaust}</b>
      </button>
      <button type="button" className="m2c-pilebtn" disabled={!p.canUndo} onClick={p.onUndo} title={k ? '이동 되돌리기 (Z)' : 'Undo move (Z)'}>
        <Undo2 size={14} />
        <kbd>Z</kbd>
      </button>
    </div>
  )
}

/** End turn (E). During the enemy phase the same button fast-forwards the timeline. */
export function EndTurnButton(p: {
  k: boolean
  glow: boolean
  danger: boolean
  interactive: boolean
  canHurry: boolean
  canQueueEnd: boolean
  enemyPhase: boolean
  onEnd: () => void
  onHurry: () => void
}) {
  const { k, interactive, canHurry } = p
  return (
    <button
      type="button"
      data-coach="endturn"
      className={`m2c-end${p.glow ? ' is-glow' : ''}${p.danger ? ' is-danger' : ''}${!interactive ? ' is-off' : ''}${canHurry ? ' is-hurry' : ''}`}
      onClick={canHurry ? p.onHurry : p.onEnd}
      // Never keep focus: a later Space (fast-forward) must not "click" the focused button and end a turn.
      onMouseDown={(e) => e.preventDefault()}
      disabled={!interactive && !canHurry && !p.canQueueEnd}
      title={canHurry ? (k ? '클릭 또는 Space: 빨리 감기' : 'Click or Space: fast-forward') : undefined}
    >
      <span>{p.enemyPhase ? (k ? '적 행동 중' : 'ENEMY ACTING') : k ? '턴 종료' : 'END TURN'}</span>
      {canHurry ? <FastForward size={16} strokeWidth={2.6} /> : <kbd>E</kbd>}
    </button>
  )
}

/** X2 Momentum gauge (기세) + the Signal Burst button once it is full. */
export function MomentumGauge(p: { k: boolean; momentum: number; max: number; burstName: string | null; used: boolean; interactive: boolean; onBurst: () => void }) {
  const pct = Math.max(0, Math.min(100, (p.momentum / p.max) * 100))
  const ready = !!p.burstName && !p.used && p.momentum >= p.max
  return (
    <div className={`m2c-momentum${ready ? ' is-ready' : ''}${p.used ? ' is-used' : ''}`} title={p.k ? '기세: 처치·환경 처치·치명타·회피·턴 경과로 찬다. 가득 차면 필살기(전투당 1회).' : 'Momentum: kills, environment kills, crits, evades and turns fill it. Full = Signal Burst (once per fight).'}>
      {ready ? (
        <button type="button" className="m2c-sigburst" disabled={!p.interactive} onClick={p.onBurst} onMouseDown={(e) => e.preventDefault()}>
          <span>{p.burstName}</span>
          <kbd>B</kbd>
        </button>
      ) : (
        <>
          <div className="m2c-momentum__label">{p.used ? (p.k ? '필살기 사용' : 'BURST USED') : p.k ? '기세' : 'MOMENTUM'}</div>
          <div className="m2c-momentum__bar">
            <i style={{ width: `${p.used ? 0 : pct}%` }} />
          </div>
        </>
      )}
    </div>
  )
}
