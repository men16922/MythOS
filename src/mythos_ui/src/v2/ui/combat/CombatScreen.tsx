// Mythos 2.0 — combat screen ("Breach Protocol").
//
// Owns: the local copy of the combat (so animations can run on the pre-action view), committing actions
// to the engine + animator, music and intro, and the hand-off back to the shell. Rendering of the board
// lives in Board.tsx; the event timeline + game feel in animator.ts; layout, targeting, intent views, the
// end-turn queue, input (cards / items / tiles / keyboard) and the HUD pieces in screen/*.
//
// Layouts: 'desk' (≥ 900 × 480, the original HUD), and two phone layouts picked from the root's size —
// 'port' (board under a party strip, inspector peek, hand + controls below) and 'land' (board between
// two thin columns, the hand peeking from the bottom edge). Touch (any non-mouse pointer, see touch.ts):
// taps replace hover — tap a unit / tile to pin the inspector, tap a card target once to preview and
// again to play, hold a card to read it.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Layers, Maximize2, X } from 'lucide-react'
import { canPlay, endTurn, threatMap } from '../../engine/combat.ts'
import { posKey, samePos } from '../../engine/grid.ts'
import type { CombatState, ContentRegistry, Lang, Pos, RunState, UnitState } from '../../engine/types.ts'
import { ART } from '../common/artManifest.ts'
import { BACKDROPS, asset } from '../common/assets.ts'
import { playBgm } from '../common/audio.ts'
import type { Bgm } from '../common/audio.ts'
import { tr } from '../common/lang.ts'
import { setMusicDuck, sfx } from '../common/sfx.ts'
import { useCombatAnimator, viewFrom } from './animator.ts'
import type { FxItem, RectLike } from './animator.ts'
import { Board } from './Board.tsx'
import { Coach } from './Coach.tsx'
import { tutorialDone } from './describe.ts'
import { Hand } from './Hand.tsx'
import { ArmedPanel, DetailPanel, PartyPanel, PileModal, TopStrip } from './Panels.tsx'
import { EndTurnButton, HelpPopover, ItemSlots, KeyLegend, PileButtons } from './screen/hud.tsx'
import { useCombatLayout } from './screen/layout.ts'
import { BossSplash, CardGhosts, CardZoom, CombatBanner } from './screen/overlays.tsx'
import { useTargeting } from './screen/targeting.ts'
import { partyDanger, useIntentViews } from './screen/threat.ts'
import { useCombatInput } from './screen/useCombatInput.ts'
import { useEndTurnQueue } from './screen/useEndTurnQueue.ts'
import { isTouch, watchPointer } from './touch.ts'
import '../../v2.css'
import './combat.css'

export interface CombatScreenProps {
  run: RunState
  combat: CombatState
  C: ContentRegistry
  lang: Lang
  settings: { fastAnim: boolean; sfx: boolean; bgm: boolean }
  onCombatChange: (c: CombatState) => void
  onOpenDeck?: () => void
}

function sameMoment(a: CombatState, b: CombatState): boolean {
  return a.encounterId === b.encounterId && a.events.length === b.events.length && a.turn === b.turn && a.phase === b.phase && a.hand.length === b.hand.length
}

export function CombatScreen(props: CombatScreenProps) {
  const { C, lang, settings } = props
  const k = lang === 'ko'

  // ------------------------------------------------------------ local combat copy
  const [combat, setCombat] = useState(props.combat)
  const [echo, setEcho] = useState(props.combat)
  if (props.combat !== echo) {
    setEcho(props.combat)
    if (!sameMoment(props.combat, combat)) setCombat(props.combat)
  }

  const anim = useCombatAnimator(C, props.combat, settings.fastAnim, lang)
  const { registerStage, registerHurt, registerBoard, registerFigure } = anim
  const derived = useMemo(() => viewFrom(combat), [combat])
  const view = anim.busy || anim.view.base === combat ? anim.view : { ...derived, banner: anim.view.banner, flashImplant: anim.view.flashImplant }
  const vc: CombatState = useMemo(() => ({ ...view.base, units: view.units, tiles: view.tiles }), [view.base, view.units, view.tiles])

  const [ending, setEnding] = useState(false)
  /** `encounter#turn` of the last move/card the player committed — see canQueueEnd. */
  const [actedTurn, setActedTurn] = useState('')
  const turnKey = `${combat.encounterId}#${combat.turn}`
  const interactive = !anim.busy && combat.phase === 'player' && !ending
  /** The enemy phase is playing: the end-turn button / Space fast-forward it. */
  const canHurry = anim.busy && view.enemyPhase && !ending
  /** One of *this turn's* player actions is animating: an end-turn press is queued until it settles. Never during
   *  the turn-start sequence after an enemy phase — mashing E to fast-forward would otherwise skip the new turn. */
  const canQueueEnd = anim.busy && !view.enemyPhase && combat.phase === 'player' && !ending && actedTurn === turnKey
  const enc = C.encounters[combat.encounterId]

  // ------------------------------------------------------------ layout
  const { rootRef, rootEl, autoH, W, H, mode, compact, lay, g, boardLeft, boardTop } = useCombatLayout()
  const { topH, fs, bottomH, sideW, tw, handW } = lay

  // Touch UI (wording, key hints) follows the last real pointer; hover handlers ask isTouch() directly.
  const [touchUI, setTouchUI] = useState(isTouch)
  useEffect(() => watchPointer(setTouchUI), [])
  /** Phone layouts: the inspector sheet is expanded. */
  const [sheet, setSheet] = useState(false)
  /** Phone layouts: the help popover (the desktop's key legend has no room). */
  const [help, setHelp] = useState(false)
  /** Touch long press on a card: show it large. */
  const [zoom, setZoom] = useState<string | null>(null)

  // ------------------------------------------------------------ selection & targeting
  const tg = useTargeting(combat, C, interactive)
  const { setSel, armed, setArmed, hoverPos, setHoverPos, setHoverDir, hoverCard, setHoverCard, selUnit, selUid } = tg
  const { armedCard, armedDef, armedFace, itemDef, isArmed, originFor, origin, originUnit, tmode, confirmMode, options, preview } = tg
  const [panelHover, setPanelHover] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [threatOn, setThreatOn] = useState(false)
  const [altHeld, setAltHeld] = useState(false)
  const [pile, setPile] = useState<'draw' | 'discard' | 'exhaust' | null>(null)
  const [legend, setLegend] = useState(true)
  const [coach, setCoach] = useState(() => !tutorialDone())
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)

  // ------------------------------------------------------------ intents / threat
  const { intents, shownIntents } = useIntentViews(vc, view, C, preview)

  const showThreat = (threatOn || altHeld) && !view.enemyPhase
  const threat = useMemo(() => (showThreat ? threatMap(vc, C) : null), [showThreat, vc, C])

  const hoverUnit = hoverPos ? vc.units.find((u) => u.hp > 0 && samePos(u.pos, hoverPos)) : undefined
  const panelUnit = panelHover ? vc.units.find((u) => u.uid === panelHover) : undefined
  const pinnedUnit = pinned ? vc.units.find((u) => u.uid === pinned && u.hp > 0) : undefined
  const focusEnemy = isArmed ? null : (hoverUnit?.side === 'enemy' ? hoverUnit.uid : panelUnit?.side === 'enemy' ? panelUnit.uid : (pinnedUnit?.uid ?? null))
  const detailUnit = panelUnit ?? hoverUnit ?? pinnedUnit ?? (isArmed ? originUnit : undefined) ?? (hoverPos ? undefined : selUnit) ?? null
  const detailIntent = detailUnit && detailUnit.side === 'enemy' ? (intents.find((i) => i.uid === detailUnit.uid)?.info ?? null) : null
  const hoverTile = hoverPos && !hoverUnit ? (vc.tiles[hoverPos.y]?.[hoverPos.x] ?? null) : null
  const hoverThreat = hoverPos ? (threatMap(vc, C)[posKey(hoverPos)] ?? 0) : 0

  const danger = useMemo(() => partyDanger(vc.units, shownIntents), [shownIntents, vc.units])

  // ------------------------------------------------------------ playable cards
  const playable = useMemo(() => {
    const out: Record<string, { ok: boolean; reason?: string }> = {}
    for (const card of combat.hand) {
      const o = originFor(card.uid) ?? 'connector'
      const r = canPlay(combat, C, card.uid, o)
      out[card.uid] = r.ok ? { ok: true } : r.reason ? { ok: false, reason: tr(r.reason, lang) } : { ok: false }
    }
    return out
  }, [combat, C, originFor, lang])
  const anyPlayable = Object.values(playable).some((p) => p.ok)

  // ------------------------------------------------------------ actions
  const timers = useRef<number[]>([])
  useEffect(() => {
    const list = timers.current
    return () => {
      for (const t of list) window.clearTimeout(t)
    }
  }, [])

  const showToast = useCallback((text: string) => {
    setToast({ text, key: Date.now() })
    const t = window.setTimeout(() => setToast((cur) => (cur && cur.text === text ? null : cur)), 1600)
    timers.current.push(t)
  }, [])

  const finishCombat = useCallback(
    (next: CombatState) => {
      setEnding(true)
      const won = next.phase === 'won'
      const st = next.stats
      const bonusOk = next.bonus && !next.bonus.failed
      const sub = won
        ? k
          ? `처치 ${st.enemiesKilled} · 환경 처치 ${st.environmentKills} · 받은 피해 ${st.damageTaken}${bonusOk ? ' · ★ 보너스 달성' : ''}`
          : `${st.enemiesKilled} kills · ${st.environmentKills} environment · ${st.damageTaken} damage taken${bonusOk ? ' · ★ bonus met' : ''}`
        : k
          ? '접속자의 신호가 끊겼다'
          : 'The Connector has gone dark'
      // A boss fight ends on the boss: name it ("관리자 IX 정지") instead of a generic VICTORY.
      const boss = (enc?.enemies ?? []).map((e) => C.enemies[e.id]).find((d) => d?.tier === 'boss')
      const winTitle = boss ? (k ? `${tr(boss.name, lang)} 정지` : `${tr(boss.name, lang).toUpperCase()} DOWN`) : k ? '승리' : 'VICTORY'
      anim.banner({ kind: won ? 'victory' : 'defeat', title: won ? winTitle : k ? '신호 소실' : 'SIGNAL LOST', sub }, 4000)
      sfx(won ? 'victory' : 'defeat')
      setMusicDuck(true)
      const t = window.setTimeout(
        () => {
          setMusicDuck(false)
          props.onCombatChange(next)
        },
        won ? 1500 : 1900,
      )
      timers.current.push(t)
    },
    [anim, k, props, enc, C, lang],
  )

  const commitAction = useCallback(
    (next: CombatState, opts: { card?: { rect: RectLike; upgraded: boolean }; endTurn?: boolean } = {}) => {
      const prev = combat
      if (!opts.endTurn) setActedTurn(`${prev.encounterId}#${prev.turn}`)
      setCombat(next)
      setArmed(null)
      setHoverDir(null)
      // Touch "hover" is a tap focus: the action consumed it.
      if (isTouch()) setHoverPos(null)
      const ended = next.phase !== 'player'
      if (!ended) {
        setEcho(next)
        props.onCombatChange(next)
      }
      const playOpts: Parameters<typeof anim.play>[2] = {
        from: prev.events.length,
        onDone: () => {
          if (ended) finishCombat(next)
        },
      }
      if (opts.card) playOpts.card = opts.card
      if (opts.endTurn) playOpts.endTurn = true
      anim.play(prev, next, playOpts)
    },
    [combat, props, anim, finishCombat, setArmed, setHoverDir, setHoverPos],
  )

  const endTurnQueue = useEndTurnQueue({
    enemyPhase: view.enemyPhase,
    interactive,
    canQueueEnd,
    commitEnd: () => {
      setArmed(null)
      setHoverCard(null)
      commitAction(endTurn(combat, C), { endTurn: true })
    },
    hurry: anim.hurry,
  })
  const doEndTurn = endTurnQueue.endTurn

  // ------------------------------------------------------------ input (cards, items, tiles, keyboard)
  const { playOpt, onCard, onItem, onTileClick, doUndo } = useCombatInput({
    combat,
    C,
    k,
    interactive,
    canQueueEnd,
    canHurry,
    tg,
    playable,
    rootRef,
    commitAction,
    showToast,
    endTurnQueue,
    hurry: anim.hurry,
    pileOpen: !!pile,
    pinned,
    setPinned,
    setThreatOn,
    setAltHeld,
  })

  // ------------------------------------------------------------ music, intro, boss splash
  const conn = combat.units.find((u) => u.uid === 'connector')
  const crisis = !!conn && conn.hp / Math.max(1, conn.maxHp) < 0.35
  const act = enc?.act ?? props.run.act ?? 1
  const bgm: Bgm =
    enc?.kind === 'boss' ? (act === 1 ? 'boss1' : act === 2 ? 'boss2' : 'boss_ix') : enc?.kind === 'elite' || crisis ? 'elite' : act === 2 ? 'combat2' : act === 3 ? 'combat3' : 'combat1'
  useEffect(() => {
    playBgm(bgm)
  }, [bgm])

  const bossArt = enc?.kind === 'boss' ? ART.bosses[combat.encounterId] : undefined
  const [splash, setSplash] = useState(enc?.kind === 'boss')
  useEffect(() => {
    const intro = () => {
      const title = enc ? tr(enc.name, lang) : ''
      const sub = enc?.intro ? tr(enc.intro, lang) : undefined
      anim.banner(sub ? { kind: 'intro', title, sub } : { kind: 'intro', title }, 1900)
      sfx('player_turn')
    }
    if (enc?.kind === 'boss') {
      sfx('phase')
      const t = window.setTimeout(() => {
        setSplash(false)
        intro()
      }, 1700)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(intro, 120)
    return () => window.clearTimeout(t)
    // Intro runs once per mounted fight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A fresh lock-on (or a lock that moved) gets a targeting chirp.
  const lockKey = intents
    .filter((i) => i.info.move.pattern === 'track' && i.info.targetUid)
    .map((i) => `${i.uid}>${i.info.targetUid ?? ''}`)
    .join('|')
  useEffect(() => {
    if (lockKey) sfx('telegraph', { volume: 0.8 })
  }, [lockKey])

  // Windup heartbeat at the start of each player turn.
  const windups = intents.filter((i) => i.info.windupLeft > 0).length
  useEffect(() => {
    if (windups > 0 && interactive) sfx('windup', { volume: 0.7 })
  }, [windups, interactive, combat.turn])

  // Energy orb drain/refill pulse.
  const orbRef = useRef<HTMLDivElement>(null)
  const shownEnergy = view.handHidden ? 0 : combat.energy
  const lastEnergy = useRef(shownEnergy)
  useEffect(() => {
    const el = orbRef.current
    if (el && shownEnergy !== lastEnergy.current) {
      if (shownEnergy < lastEnergy.current) el.animate([{ transform: 'scale(1)', filter: 'brightness(2.2)' }, { transform: 'scale(0.86)' }, { transform: 'scale(1)', filter: 'none' }], { duration: 380, easing: 'ease-out' })
      else {
        el.animate([{ transform: 'scale(0.8)', filter: 'brightness(2.6)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)', filter: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' })
        sfx('energy', { volume: 0.6 })
      }
    }
    lastEnergy.current = shownEnergy
  }, [shownEnergy])

  // ------------------------------------------------------------ render helpers
  const backdrop = enc ? (ART.arenas[enc.backdrop] ? asset(ART.arenas[enc.backdrop]) : BACKDROPS[enc.backdrop]) : BACKDROPS.streets
  const newArt = !!(enc && ART.arenas[enc.backdrop])
  const partyUnits: UnitState[] = vc.units.filter((u) => u.side === 'party' || u.side === 'neutral').filter((u) => u.hp > 0 || u.uid === 'connector')
  // Companions knocked out this fight leave the board; keep them on the roster as "down".
  for (const m of props.run.party) {
    if (partyUnits.some((u) => u.uid === m.id)) continue
    const cd = C.companions[m.id]
    if (!cd) continue
    partyUnits.push({ uid: m.id, defId: m.id, side: 'party', name: cd.name, sprite: cd.sprite, pos: { x: -1, y: -1 }, hp: 0, maxHp: m.maxHp, block: 0, armor: 0, move: 0, moved: true, facing: 'right', statuses: {} })
  }
  const handCards = view.handHidden ? view.base.hand : combat.hand
  const piles = view.handHidden ? view.base : combat
  const glowEnd = interactive && combat.energy > 0 && anyPlayable
  const inDanger = Object.keys(danger).length > 0
  const banner = view.banner
  const drawFrom = { x: -(W / 2) + 40, y: 0 }

  const cardFx = anim.fx.filter((f): f is Extract<FxItem, { kind: 'card' }> => f.kind === 'card')

  // Hover handlers: a tap's emulated mouseenter must not stick as hover (touch drives these from taps instead).
  const onTileEnter = (p: Pos | null) => {
    if (!isTouch()) setHoverPos(p)
  }

  const [armedName, armedText] = useMemo(
    () => [armedDef ? tr(armedDef.name, lang) : itemDef ? tr(itemDef.name, lang) : '', armedFace ? tr(armedFace.text, lang) : itemDef ? tr(itemDef.text, lang) : ''],
    [armedDef, armedFace, itemDef, lang],
  )
  const zoomInst = zoom ? combat.hand.find((c) => c.uid === zoom) : undefined
  const zoomDef = zoomInst ? C.cards[zoomInst.defId] : undefined
  const zoomFs = Math.min((W * 0.62) / 10.6, (H * 0.62) / 15, 20)
  const compactVars = (compact ? { '--party': `${lay.partyH}px`, '--peek': `${lay.peekH}px`, '--hpeek': `${lay.handPeek}px`, '--ch': `${fs * 15}px` } : {}) as CSSProperties

  return (
    <div
      ref={rootRef}
      className={`m2c-root${settings.fastAnim ? ' is-fast' : ''}${view.enemyPhase ? ' is-enemy-phase' : ''}${isArmed ? ' is-targeting' : ''}${crisis ? ' is-crisis' : ''}${compact ? ` is-compact is-${mode}` : ''}${touchUI ? ' is-touch' : ''}`}
      style={{ '--side': `${sideW}px`, '--top': `${topH}px`, '--bottom': `${bottomH}px`, '--tw': `${tw}px`, ...compactVars, ...(autoH ? { height: autoH } : {}) } as CSSProperties}
      onContextMenu={(e) => {
        // Touch long press: no browser menu, and it must not cancel the armed card.
        if (isTouch()) {
          e.preventDefault()
          return
        }
        if (isArmed) {
          e.preventDefault()
          setArmed(null)
        }
      }}
    >
      <div className={`m2c-bg${newArt ? ' is-new' : ''}`} style={{ backgroundImage: `url(${backdrop})` }} />
      <div className="m2c-bg-fx" />
      <div className="m2c-hurt" ref={registerHurt} />

      <div className="m2c-stage" ref={registerStage}>
        <div className="m2c-board-wrap" style={{ left: boardLeft, top: boardTop }}>
          <Board
            g={g}
            vc={vc}
            ufx={view.ufx}
            C={C}
            lang={lang}
            intents={shownIntents}
            focusEnemy={focusEnemy}
            firing={view.firing}
            threat={threat}
            moves={tg.moves}
            moveHover={tg.moveHover}
            targets={tg.targets}
            active={tg.active}
            activeHostile={tg.activeHostile}
            dirArrows={tg.dirArrows}
            preview={preview}
            selectedUid={isArmed ? null : selUid}
            originUid={isArmed ? origin : interactive ? tg.hoverCardOrigin : null}
            hoverPos={hoverPos}
            incoming={view.enemyPhase ? [] : vc.incoming}
            fx={anim.fx}
            dimIntents={showThreat}
            onTileEnter={onTileEnter}
            onTileClick={onTileClick}
            onTileContext={() => {
              if (!isTouch()) setArmed(null)
            }}
            onDirClick={(d) => {
              const o = options.find((x) => x.dir === d)
              if (o && !tg.aimFirst(o, { dir: d })) playOpt(o)
            }}
            onDirEnter={(d) => {
              if (!isTouch()) setHoverDir(d)
            }}
            registerFigure={registerFigure}
            registerBoard={registerBoard}
            {...(touchUI && tg.aimAt ? { aimAt: tg.aimAt.at, aimDir: tg.aimAt.dir, aimLabel: k ? '한 번 더 누르면 사용' : 'Tap again to play' } : {})}
          />
        </div>
      </div>

      <TopStrip
        c={vc}
        enc={enc}
        C={C}
        lang={lang}
        enemyPhase={view.enemyPhase}
        flashImplant={view.flashImplant}
        threatOn={threatOn}
        onThreat={() => setThreatOn((v) => !v)}
        onLegend={() => (compact ? setHelp((v) => !v) : setLegend((v) => !v))}
        {...(compact ? { implantSize: 22 } : {})}
      />

      <aside className="m2c-left">
        <PartyPanel
          units={partyUnits}
          C={C}
          lang={lang}
          selected={selUid}
          danger={danger}
          onSelect={(uid) => (setSel(uid), sfx('ui_click'))}
          onHover={(uid) => {
            if (!isTouch()) setPanelHover(uid)
          }}
        />
      </aside>
      <aside
        className={compact ? `m2c-right is-sheet${sheet ? ' is-open' : ''}` : 'm2c-right'}
        // Phone layouts: the collapsed inspector is one big "expand" button.
        onClick={compact && !sheet ? () => setSheet(true) : undefined}
      >
        {compact && (
          <button
            type="button"
            className="m2c-sheet-tab"
            aria-label={sheet ? (k ? '정보 접기' : 'Collapse intel') : k ? '정보 펼치기' : 'Expand intel'}
            onClick={(e) => {
              e.stopPropagation()
              setSheet((v) => !v)
            }}
          >
            {sheet ? <X size={16} strokeWidth={2.6} /> : <Maximize2 size={13} strokeWidth={2.6} />}
          </button>
        )}
        {(!compact || sheet || !isArmed) && <DetailPanel unit={detailUnit} intent={detailIntent} tile={hoverTile} C={C} lang={lang} threats={hoverThreat} touch={touchUI} />}
        {isArmed && <ArmedPanel k={k} compact={compact} touch={touchUI} name={armedName} text={armedText} confirmMode={confirmMode} dirAimed={tmode === 'line' || tmode === 'beam'} />}
      </aside>

      {compact && help && <HelpPopover k={k} touch={touchUI} onClose={() => setHelp(false)} />}

      <div className="m2c-bottom">
        <div className="m2c-bl">
          <button type="button" className="m2c-pilebtn is-draw" onClick={() => setPile('draw')} title={k ? '뽑을 카드' : 'Draw pile'}>
            <Layers size={16} />
            <b>{piles.draw.length}</b>
          </button>
          <div ref={orbRef} className={`m2c-orb${shownEnergy > 0 && interactive ? ' is-live' : ''}${shownEnergy === 0 ? ' is-empty' : ''}`}>
            <b>{shownEnergy}</b>
            <span>/{combat.maxEnergy}</span>
            <i>{k ? '에너지' : 'ENERGY'}</i>
          </div>
          {legend && !compact && <KeyLegend k={k} />}
        </div>

        <div className="m2c-bc" style={{ width: handW }}>
          <Hand
            cards={handCards}
            C={C}
            lang={lang}
            fs={fs}
            width={handW}
            hidden={view.handHidden || ending}
            armedUid={armedCard?.uid ?? null}
            confirmUid={confirmMode && armedCard ? armedCard.uid : null}
            hoverUid={interactive ? hoverCard : null}
            playable={playable}
            drawFrom={drawFrom}
            onCard={onCard}
            onHover={(uid) => {
              if (isTouch()) return
              setHoverCard(uid)
              if (uid && interactive) sfx('card_hover', { volume: 0.5 })
            }}
            touch={touchUI}
            onZoom={setZoom}
          />
        </div>

        <div className="m2c-br">
          <ItemSlots combat={combat} C={C} lang={lang} armedIndex={armed?.kind === 'item' ? armed.index : -1} onItem={onItem} onOpenDeck={props.onOpenDeck} />
          <PileButtons k={k} discard={piles.discard.length} exhaust={piles.exhaust.length} canUndo={!!combat.undo && interactive} onPile={setPile} onUndo={doUndo} />
          <EndTurnButton
            k={k}
            glow={glowEnd}
            danger={inDanger && interactive}
            interactive={interactive}
            canHurry={canHurry}
            canQueueEnd={canQueueEnd}
            enemyPhase={view.enemyPhase}
            onEnd={doEndTurn}
            onHurry={anim.hurry}
          />
        </div>
      </div>

      <CardGhosts cards={cardFx} g={g} boardLeft={boardLeft} boardTop={boardTop} fs={fs} C={C} lang={lang} />

      {banner && <CombatBanner key={banner.key} banner={banner} />}

      {splash && enc && <BossSplash enc={enc} art={bossArt} lang={lang} />}

      {toast && (
        <div key={toast.key} className="m2c-toast">
          {toast.text}
        </div>
      )}

      {zoomInst && zoomDef && <CardZoom fs={zoomFs} def={zoomDef} upgraded={zoomInst.upgraded} lang={lang} play={playable[zoomInst.uid]} />}

      {coach && interactive && !splash && <Coach root={rootEl} lang={lang} onClose={() => setCoach(false)} touch={touchUI} />}

      {pile && <PileModal kind={pile} cards={piles[pile]} C={C} lang={lang} onClose={() => setPile(null)} />}
    </div>
  )
}
