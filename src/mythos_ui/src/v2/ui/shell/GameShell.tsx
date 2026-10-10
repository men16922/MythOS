// Mythos 2.0 game shell: title → archive → setup → run screens (by run.screen.kind) → ending → archive.
import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { CONTENT } from '../../content/index.ts'
import type { CombatState, ContentRegistry, Lang, MetaProfile, RunState } from '../../engine/types.ts'
import { configureAudio, playBgm, unlockAudio, type Bgm } from '../common/audio.ts'
import { tr } from '../common/lang.ts'
import { DeckModal } from '../components/DeckModal.tsx'
import { ErrorBoundary } from '../components/ErrorBoundary.tsx'
import { TRACE_EFFECT, TRACE_LABEL, traceTier, type TraceTier } from '../components/format.ts'
import { Modal } from '../components/Modal.tsx'
import { SettingsPanel } from '../components/SettingsPanel.tsx'
import { duckMusic, sound } from '../components/sound.ts'
import { Prologue } from '../prologue/Prologue.tsx'
import { ActIntro } from './ActIntro.tsx'
import { ArchiveScreen } from './ArchiveScreen.tsx'
import { CardPickScreen } from './CardPickScreen.tsx'
import { EndingScreen } from './EndingScreen.tsx'
import { EventScreen } from './EventScreen.tsx'
import { FinalChoice } from './FinalChoice.tsx'
import { MapScreen } from './MapScreen.tsx'
import { RestScreen } from './RestScreen.tsx'
import { CardRewardScreen, RewardScreen } from './RewardScreen.tsx'
import { rx } from './rx.ts'
import { SetupScreen } from './SetupScreen.tsx'
import { ShopScreen } from './ShopScreen.tsx'
import { TitleScreen } from './TitleScreen.tsx'
import { TopBar } from './TopBar.tsx'
import { TreasureScreen } from './TreasureScreen.tsx'
import type { ScreenProps } from './types.ts'
import { useGame } from '../store.ts'
import '../../v2.css'

type View = 'title' | 'archive' | 'setup' | 'run'

// ------------------------------------------------------------ combat screen (combat-UI agent), loaded lazily
interface CombatScreenProps {
  run: RunState
  combat: CombatState
  C: ContentRegistry
  lang: Lang
  settings: MetaProfile['settings']
  onCombatChange: (c: CombatState) => void
  onOpenDeck: () => void
}
const combatModules = import.meta.glob('../combat/CombatScreen.tsx')
const combatLoader = combatModules['../combat/CombatScreen.tsx']
const CombatScreen: ComponentType<CombatScreenProps> | null = combatLoader
  ? lazy(() => combatLoader().then((m) => ({ default: (m as { CombatScreen: ComponentType<CombatScreenProps> }).CombatScreen })))
  : null

const PROLOGUE_KEY = 'mythos2.prologueSeen'
const VIEW_KEY = 'mythos2.view'
/** A reload inside the same browser session returns to the screen you were on (title on a fresh visit). */
function bootView(): View {
  try {
    const v = window.sessionStorage.getItem(VIEW_KEY)
    return v === 'archive' || v === 'setup' || v === 'run' ? v : 'title'
  } catch {
    return 'title'
  }
}
function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function writeFlag(key: string): void {
  try {
    window.localStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

function bgmFor(view: View, run: RunState | null): Bgm | undefined {
  if (view === 'title') return 'title'
  if (view === 'archive' || view === 'setup') return 'hub'
  if (!run) return 'hub'
  const mapTrack = `map${run.act}` as Bgm
  switch (run.screen.kind) {
    case 'combat':
      return undefined // the combat UI owns combat music
    case 'event':
      return 'event'
    case 'shop':
      return 'shop'
    case 'rest':
      return 'rest'
    case 'final_choice':
      return 'ending'
    case 'ended':
      return run.screen.result === 'victory' ? 'ending' : 'defeat'
    default:
      return mapTrack
  }
}

export function GameShell() {
  const C = CONTENT
  const game = useGame(C)
  const { profile, run, setRun, setProfile } = game
  const lang = profile.settings.lang
  const [viewState, setView] = useState<View>(bootView)
  const view: View = viewState === 'run' && !run ? 'title' : viewState
  const [deckOpen, setDeckOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirm, setConfirm] = useState<null | 'abandon' | 'newloop'>(null)
  const [discardIdx, setDiscardIdx] = useState<number | null>(null)
  const [prologueSeen, setPrologueSeen] = useState(() => readFlag(PROLOGUE_KEY))
  const audioUnlocked = useRef(false)
  const lastTier = useRef<string | null>(null)

  // Audio settings + per-screen music.
  useEffect(() => {
    configureAudio({ bgm: profile.settings.bgm, sfx: profile.settings.sfx })
  }, [profile.settings.bgm, profile.settings.sfx])
  const bgm = bgmFor(view, run)
  useEffect(() => {
    if (bgm !== undefined) playBgm(bgm)
  }, [bgm])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // Alarm + banner when Trace crosses into a higher tier (the rule change must be seen, not just heard).
  const tier = run ? traceTier(run.trace) : null
  const [tierAlert, setTierAlert] = useState<TraceTier | null>(null)
  useEffect(() => {
    const order = ['quiet', 'alert', 'hunted', 'purge']
    if (tier && lastTier.current && order.indexOf(tier) > order.indexOf(lastTier.current)) {
      sound('alarm')
      setTierAlert(tier)
    }
    lastTier.current = tier
  }, [tier])
  // Tier changes happen on node entry, usually straight into a fight: there the banner waits for the
  // encounter splash to clear (CSS delay) instead of being skipped.
  const tierAlertLate = run?.screen.kind === 'combat'
  useEffect(() => {
    if (!tierAlert) return
    const t = window.setTimeout(() => setTierAlert(null), tierAlertLate ? 6000 : 4200)
    return () => window.clearTimeout(t)
  }, [tierAlert, tierAlertLate])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(VIEW_KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])

  // Dev-only QA hook: window.__m2 = { run, profile, setRun, setProfile, setView, C }.
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__m2 = { run, profile, setRun, setProfile, setView, C }
  }, [run, profile, setRun, setProfile, C])

  const modalOpen = deckOpen || settingsOpen || confirm !== null || discardIdx !== null
  useEffect(() => {
    duckMusic(modalOpen)
  }, [modalOpen])

  const firstGesture = () => {
    if (audioUnlocked.current) return
    audioUnlocked.current = true
    unlockAudio()
  }

  const act = useCallback(
    (next: RunState) => {
      setRun(next)
    },
    [setRun],
  )

  const setSettings = (s: MetaProfile['settings']) => setProfile((p) => ({ ...p, settings: s }))

  const startRun = (o: { archetype: string; companion: string | null; paradox: number }) => {
    if (game.hasRun) {
      // Never overwrite a live run silently: ask first (abandoning banks it).
      setConfirm('newloop')
      return
    }
    try {
      const r = rx.newRun(profile, o, C)
      setRun(r)
      setView('run')
    } catch (e) {
      console.error(e)
      sound('error')
    }
  }

  const abandon = () => {
    if (run) setRun(rx.abandon(run))
    setConfirm(null)
  }

  // ------------------------------------------------------------ screen selection
  let screen: ReactNode = null
  let screenKey: string = view
  const showBar = view === 'run' && run && !['act_intro', 'ended', 'combat'].includes(run.screen.kind)

  if (view === 'title') {
    screen = (
      <TitleScreen
        profile={profile}
        run={game.hasRun ? run : null}
        C={C}
        onContinue={() => setView('run')}
        onNewLoop={() => (game.hasRun ? setConfirm('newloop') : setView(profile.loops === 0 ? 'setup' : 'archive'))}
        onArchive={() => setView('archive')}
        onSettings={() => setSettingsOpen(true)}
        onLang={(l) => setSettings({ ...profile.settings, lang: l })}
      />
    )
  } else if (view === 'archive') {
    screen = (
      <ArchiveScreen
        profile={profile}
        C={C}
        onProfile={(p) => setProfile(p)}
        onBegin={() => setView('setup')}
        onBack={() => setView('title')}
        activeLoop={game.hasRun && run ? run.loop : null}
        onContinue={() => setView('run')}
        onAbandon={() => setConfirm('newloop')}
      />
    )
  } else if (view === 'setup') {
    screen = <SetupScreen profile={profile} C={C} onStart={startRun} onBack={() => setView(profile.loops === 0 ? 'title' : 'archive')} />
  } else if (run) {
    const props: ScreenProps = { run, C, lang, settings: profile.settings, act }
    const s = run.screen
    screenKey = `run:${s.kind}:${run.act}:${s.kind === 'event' ? s.eventId : (run.nodeId ?? '')}`
    switch (s.kind) {
      case 'act_intro':
        screen =
          run.loop === 1 && run.act === 1 && !prologueSeen ? (
            <Prologue
              lang={lang}
              onDone={() => {
                writeFlag(PROLOGUE_KEY)
                setPrologueSeen(true)
              }}
            />
          ) : (
            <ActIntro {...props} />
          )
        if (run.loop === 1 && run.act === 1 && !prologueSeen) screenKey = 'prologue'
        break
      case 'map':
        screen = <MapScreen {...props} />
        break
      case 'event':
        screen = <EventScreen {...props} />
        break
      case 'shop':
        screen = <ShopScreen {...props} />
        break
      case 'rest':
        screen = <RestScreen {...props} />
        break
      case 'treasure':
        screen = <TreasureScreen {...props} />
        break
      case 'reward':
        screen = <RewardScreen {...props} />
        break
      case 'card_reward':
        screen = <CardRewardScreen {...props} />
        break
      case 'card_pick':
        screen = <CardPickScreen {...props} />
        break
      case 'final_choice':
        screen = <FinalChoice {...props} />
        break
      case 'ended':
        screen = (
          <EndingScreen
            {...props}
            onChronicle={(text) => game.attachChronicle(run.id, text)}
            onDone={() => {
              game.closeRun()
              setView('archive')
            }}
          />
        )
        break
      case 'combat':
        screen = CombatScreen ? (
          <Suspense fallback={<div className="m2-loading">{lang === 'ko' ? '전투 준비 중…' : 'Deploying…'}</div>}>
            <CombatScreen
              run={run}
              combat={s.combat}
              C={C}
              lang={lang}
              settings={profile.settings}
              onCombatChange={(c) => setRun(rx.updateCombat(run, c, C))}
              onOpenDeck={() => setDeckOpen(true)}
            />
          </Suspense>
        ) : (
          <div className="m2-loading">
            <p>{lang === 'ko' ? '전투 화면을 불러오는 중…' : 'Combat screen is loading…'}</p>
          </div>
        )
        break
    }
  } else {
    screen = null
  }

  return (
    <div className={`m2-app${profile.settings.fastAnim ? ' is-fast' : ''}`} onPointerDownCapture={firstGesture} onKeyDownCapture={firstGesture} lang={lang}>
      {showBar && run && (
        <TopBar
          run={run}
          C={C}
          lang={lang}
          onDeck={() => setDeckOpen(true)}
          onSettings={() => setSettingsOpen(true)}
          onAbandon={() => setConfirm('abandon')}
          onDiscard={(i) => setDiscardIdx(i)}
        />
      )}
      <main className={`m2-stage${showBar ? ' has-bar' : ''}`}>
        <div key={screenKey} className="m2-screen">
          <ErrorBoundary
            resetKey={screenKey}
            fallback={(_e, reset) => (
              <div className="m2-loading m2-crash">
                <p>{lang === 'ko' ? '신호가 끊겼다. 이 화면을 다시 불러온다.' : 'Signal lost. Reload this screen.'}</p>
                <div className="m2-crash__actions">
                  <button className="m2-btn m2-btn--primary" onClick={reset}>
                    {lang === 'ko' ? '다시 시도' : 'Retry'}
                  </button>
                  <button className="m2-btn m2-btn--ghost" onClick={() => setView('title')}>
                    {lang === 'ko' ? '타이틀로' : 'Title screen'}
                  </button>
                </div>
              </div>
            )}
          >
            {screen}
          </ErrorBoundary>
        </div>
        <div key={`curtain-${screenKey}`} className="m2-curtain" aria-hidden="true" />
        {tierAlert && view === 'run' && (
          <div key={tierAlert} className={`m2-tier-alert m2-tier-alert--${tierAlert}${tierAlertLate ? ' is-late' : ''}`} role="status">
            <b>
              {lang === 'ko' ? '추적도' : 'Trace'} · {tr(TRACE_LABEL[tierAlert], lang)}
            </b>
            <span>{tr(TRACE_EFFECT[tierAlert], lang)}</span>
          </div>
        )}
      </main>

      {deckOpen && run && (
        <DeckModal
          cards={run.screen.kind === 'combat' ? [...run.screen.combat.draw, ...run.screen.combat.hand, ...run.screen.combat.discard, ...run.screen.combat.exhaust] : run.deck}
          C={C}
          lang={lang}
          onClose={() => setDeckOpen(false)}
        />
      )}
      {discardIdx !== null && run && run.consumables[discardIdx] && (
        <Modal
          onClose={() => setDiscardIdx(null)}
          title={lang === 'ko' ? '소모품을 버릴까?' : 'Discard this consumable?'}
          actions={
            <>
              <button className="m2-btn m2-btn--ghost" onClick={() => setDiscardIdx(null)}>
                {lang === 'ko' ? '그대로 둔다' : 'Keep it'}
              </button>
              <button
                className="m2-btn m2-btn--danger"
                onClick={() => {
                  sound('ui_click')
                  setRun(rx.discardConsumable(run, discardIdx, C))
                  setDiscardIdx(null)
                }}
              >
                {lang === 'ko' ? '버린다' : 'Discard'}
              </button>
            </>
          }
        >
          <p className="m2-modal__text">{tr(C.consumables[run.consumables[discardIdx] ?? '']?.name, lang)}</p>
        </Modal>
      )}
      {settingsOpen && <SettingsPanel settings={profile.settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />}
      {confirm && (
        <Modal
          tone="danger"
          onClose={() => setConfirm(null)}
          title={lang === 'ko' ? '이 루프를 포기할까?' : 'Abandon this loop?'}
          actions={
            <>
              <button className="m2-btn m2-btn--ghost" onClick={() => setConfirm(null)}>
                {lang === 'ko' ? '계속 달린다' : 'Keep running'}
              </button>
              <button
                className="m2-btn m2-btn--danger"
                onClick={() => {
                  if (confirm === 'newloop' && run) {
                    setRun(rx.abandon(run))
                    game.closeRun()
                    setConfirm(null)
                    setView('archive')
                  } else {
                    abandon()
                    setView('run')
                  }
                }}
              >
                {lang === 'ko' ? '포기한다' : 'Abandon'}
              </button>
            </>
          }
        >
          <p className="m2-modal__text">
            {lang === 'ko'
              ? '접속이 끊기고 이번 루프는 끝난다. 지금까지 모은 에코는 아카이브에 남는다.'
              : 'The connection drops and this loop ends. Echoes earned so far are kept in the Archive.'}
          </p>
        </Modal>
      )}
    </div>
  )
}
