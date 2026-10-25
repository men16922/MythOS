// Mythos 2.0 — loop setup: archetype, starting companion, Paradox level.
// Daily mode ("오늘의 시드"): archetype only; companion and Paradox are fixed for everyone.
import { CalendarDays, ChevronLeft, Heart, Lock, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { attemptsLabel, dailyLabel, dateLabel } from '../../engine/daily.ts'
import { AUTONOMY_STEPS, autonomyLevel, echoOffers, nextAutonomyStep, worldEchoFor } from '../../engine/legacy.ts'
import { MASTERY_WINS, masteryTier } from '../../engine/meta.ts'
import { mutatorForDate, mutatorOffersForSeed } from '../../engine/mutators.ts'
import { MutatorCard } from '../components/MutatorCard.tsx'
import type { ContentRegistry, MetaProfile, StatKey, Lang } from '../../engine/types.ts'
import { asset, portrait } from '../common/assets.ts'
import { STAT_LABEL, tr } from '../common/lang.ts'
import { CardView } from '../components/CardView.tsx'
import { ImplantIcon } from '../components/ImplantIcon.tsx'
import { sound } from '../components/sound.ts'
import { Tooltip } from '../components/Tooltip.tsx'
import { loadPlan } from '../../net/api.ts'
import { usePlan } from '../components/plan.ts'
import { narrate } from './gm.ts'
import { SignalPlusModal } from '../components/SignalPlus.tsx'
import { rx } from './rx.ts'
import './setup.css'

const STATS: StatKey[] = ['str', 'agi', 'int', 'cha', 'obs']

export interface SetupScreenProps {
  profile: MetaProfile
  C: ContentRegistry
  onStart: (o: {
    archetype: string
    companion: string | null
    paradox: number
    daily?: string
    crpg?: { background: string | null; trial?: boolean }
    echo?: string
    mutator?: string
  }) => void
  onBack: () => void
  /** KST date key: set up today's daily-seed run instead of a normal loop. */
  daily?: string
}

/** What shared victories have earned with a companion, and what the next tier is. */
function MasteryNote({ wins, lang }: { wins: number; lang: Lang }) {
  const ko = lang === 'ko'
  const tier = masteryTier(wins)
  const next: number | undefined = (MASTERY_WINS as readonly number[])[tier] // undefined once both tiers are earned
  return (
    <div className="m2-tip__text m2-mastery">
      <b>{ko ? `함께한 승리 ${wins}회` : `${wins} shared ${wins === 1 ? 'victory' : 'victories'}`}</b>
      {tier >= 1 && <div>{ko ? '숙련 Ⅰ · 시그니처 카드가 강화된 채로 시작' : 'Mastery I · their signature card starts upgraded'}</div>}
      {tier >= 2 && <div>{ko ? '숙련 Ⅱ · 유대 1에서 시작' : 'Mastery II · starts at bond 1'}</div>}
      {next !== undefined && (
        <small>{ko ? `다음 숙련까지 승리 ${next - wins}회` : `${next - wins} more ${next - wins === 1 ? 'victory' : 'victories'} to the next mastery`}</small>
      )}
    </div>
  )
}

export function SetupScreen({ profile, C, onStart, onBack, daily }: SetupScreenProps) {
  const lang = profile.settings.lang
  const ko = lang === 'ko'
  const archs = rx.archetypes(profile, C)
  const comps = rx.companions(profile, C)
  const firstLoop = profile.loops === 0
  const [archId, setArchId] = useState<string>(() => archs.find((a) => a.unlocked)?.def.id ?? '')
  const [compId, setCompId] = useState<string | null>(() => comps.find((c) => c.unlocked)?.def.id ?? null)
  const [paradox, setParadox] = useState(0)
  const plan = usePlan()
  void plan
  useEffect(() => {
    void loadPlan()
  }, [])
  const crpg = !daily && !!C.crpg
  const backgrounds = Object.values(C.crpg?.backgrounds ?? {})
  const [bgId, setBgId] = useState<string | null>(() => backgrounds[0]?.id ?? null)
  const [offer, setOffer] = useState(false)
  const echoes = useMemo(() => (daily ? [] : echoOffers(profile, C)), [daily, profile, C])
  const [echoId, setEchoId] = useState<string | null>(null)
  const worldEcho = useMemo(() => (daily ? undefined : worldEchoFor(profile)), [daily, profile])
  const mutatorOffers = useMemo(() => (daily || firstLoop ? [] : mutatorOffersForSeed(profile.loops + 1, 2)), [daily, firstLoop, profile.loops])
  const [mutatorId, setMutatorId] = useState<string | null>(null)
  const autonomy = autonomyLevel(profile)
  // Signal+ with AI on: the GM says which moment of the last loop the chosen echo remembers (once per echo).
  const [echoLines, setEchoLines] = useState<Record<string, string>>({})
  useEffect(() => {
    const echo = echoes.find((e) => e.id === echoId)
    const last = profile.history.find((r) => !r.daily)
    if (!echo || !last || echoLines[echo.id] || !crpg || !profile.settings.ai) return
    let alive = true
    void narrate('echo', lang, {
      echoName: tr(echo.name, lang),
      echoText: tr(echo.text, lang),
      chronicle: last.chronicle ?? '',
      lastResult: last.result,
      lastAct: last.act,
      party: last.party.map((id) => tr(C.companions[id]?.name, lang)),
    }).then((line) => {
      if (alive && line) setEchoLines((m) => ({ ...m, [echo.id]: line }))
    })
    return () => {
      alive = false
    }
  }, [echoId, crpg, lang, profile, C, echoes, echoLines])
  const nextStep = nextAutonomyStep(profile)
  const arch = C.archetypes[archId]
  const companion = firstLoop || daily ? 'se_rin' : compId
  const record = daily ? profile.daily?.[daily] : undefined
  const seRin = <img src={portrait('se-rin')} alt="" />
  const seRinName = tr(C.companions.se_rin?.name, lang) || (ko ? '세린' : 'Se-rin')

  return (
    <div className="m2-setup">
      <div className="m2-setup__bg" style={{ backgroundImage: `url(${asset('concept/06-subway-control-hub.png')})` }} />
      <header className="m2-setup__head">
        <button className="m2-iconbtn" onClick={onBack} title={daily ? (ko ? '타이틀로' : 'Back to title') : ko ? '아카이브로' : 'Back to the Archive'}>
          <ChevronLeft size={18} />
        </button>
        <div>
          {daily ? (
            <div className="m2-setup__kicker m2-setup__kicker--daily">
              <CalendarDays size={14} /> {ko ? '오늘의 시드' : 'Daily Signal'} · {tr(dateLabel(daily), lang)}
            </div>
          ) : (
            <div className="m2-setup__kicker">{ko ? `루프 ${profile.loops + 1}` : `Loop ${profile.loops + 1}`}</div>
          )}
          <h1>{daily ? (ko ? '오늘은 누구로 접속할까' : 'Who connects today') : ko ? '이번엔 누구로 접속할까' : 'Who connects this time'}</h1>
        </div>
      </header>

      <section className="m2-archs">
        {archs.map(({ def, unlocked, unlock }) => {
          const on = def.id === archId
          return (
            <button
              key={def.id}
              className={`m2-arch${on ? ' is-on' : ''}${unlocked ? '' : ' is-locked'}`}
              onMouseEnter={() => sound('ui_hover')}
              onClick={() => {
                if (!unlocked) {
                  sound('error')
                  return
                }
                sound('ui_click')
                setArchId(def.id)
              }}
            >
              <span className="m2-arch__art">
                <img src={portrait(def.sprite)} alt="" />
              </span>
              <span className="m2-arch__body">
                <b className="m2-arch__name">{tr(def.name, lang)}</b>
                <span className="m2-arch__tag">{tr(def.tagline, lang)}</span>
                {unlocked ? (
                  <>
                    <span className="m2-arch__hp">
                      <Heart size={13} /> <b className="m2-mono">{def.maxHp}</b>
                      <span className="m2-arch__cr m2-mono">{def.startingCredits} ₵</span>
                    </span>
                    <span className="m2-arch__stats">
                      {STATS.map((s) => (
                        <span key={s} className="m2-stat">
                          <small>{tr(STAT_LABEL[s], lang)}</small>
                          <i>
                            <i style={{ width: `${(def.stats[s] / 10) * 100}%` }} />
                          </i>
                          <b className="m2-mono">{def.stats[s]}</b>
                        </span>
                      ))}
                    </span>
                  </>
                ) : (
                  <span className="m2-arch__lock">
                    <Lock size={14} /> {unlock ? (ko ? `아카이브에서 해금 · ◈${unlock.cost}` : `Unlock in the Archive · ◈${unlock.cost}`) : ko ? '잠김' : 'Locked'}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </section>

      {arch && (
        <section className="m2-setup__detail">
          <p className="m2-setup__desc">{tr(arch.description, lang)}</p>
          <div className="m2-setup__deck">
            <div className="m2-setup__label">{ko ? '시작 덱' : 'Starting deck'}</div>
            <div className="m2-minideck">
              {[...new Set(arch.startingDeck)].map((id) => {
                const def = C.cards[id]
                if (!def) return null
                const n = arch.startingDeck.filter((x) => x === id).length
                return (
                  <Tooltip key={id} content={<CardView def={def} upgraded={false} lang={lang} size="md" />} width={220}>
                    <span className={`m2-minicard m2-minicard--${def.type}`}>
                      <i className="m2-mono">{def.cost < 0 ? '–' : def.cost}</i>
                      {tr(def.name, lang)}
                      {n > 1 && <em className="m2-mono">×{n}</em>}
                    </span>
                  </Tooltip>
                )
              })}
            </div>
            {C.implants[arch.startingImplant] && (
              <div className="m2-setup__implant">
                <ImplantIcon def={C.implants[arch.startingImplant]!} lang={lang} size={34} />
                <span>{tr(C.implants[arch.startingImplant]?.name, lang)}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {daily ? (
        <div className="m2-setup__row m2-setup__row--daily">
          <section className="m2-setup__comp">
            <div className="m2-setup__label">{ko ? '시작 동료' : 'Starting companion'}</div>
            <div className="m2-compfixed">
              {seRin}
              <span>
                <b>{seRinName}</b>
                <small>{ko ? '오늘의 시드에서는 모두 세린과 함께 출발한다.' : 'In the Daily Signal, everyone sets out with Se-rin.'}</small>
              </span>
            </div>
          </section>
          <section className="m2-setup__paradox m2-daily-rules">
            <div className="m2-setup__label">{ko ? '오늘의 규칙' : "Today's rules"}</div>
            <p className="m2-daily-rules__lead">{ko ? '모두 같은 지도, 같은 사건. 오늘 하루 동안만.' : 'Same map, same events for everyone. Today only.'}</p>
            <MutatorCard id={mutatorForDate(daily).id} lang={lang} />
            <p className="m2-daily-rules__fine">
              {ko
                ? '패러독스는 0으로 고정된다. 해금한 프로토콜 묶음, 임플란트 보급, 기억의 실은 적용되지 않는다.'
                : 'Paradox is fixed at 0. Unlocked protocol packs, implant caches and memory threads do not apply.'}
            </p>
            <p className="m2-daily-rules__best">
              {ko ? '오늘 최고 기록' : "Today's best"} ·{' '}
              <em className={`m2-daily-best${record?.best.won ? ' is-won' : record ? ' is-tried' : ''}`}>{tr(dailyLabel(record), lang)}</em>
              {record && ` · ${tr(attemptsLabel(record.attempts), lang)}`}
            </p>
          </section>
        </div>
      ) : (
        <div className="m2-setup__row">
          <section className="m2-setup__comp">
            <div className="m2-setup__label">{ko ? '시작 동료' : 'Starting companion'}</div>
            {firstLoop ? (
              <div className="m2-compfixed">
                {seRin}
                <span>
                  <b>{seRinName}</b>
                  <small>{ko ? '첫 루프에서는 세린이 당신을 찾아낸다.' : 'On your first loop, Se-rin finds you.'}</small>
                </span>
              </div>
            ) : (
              <div className="m2-comps">
                {comps.map(({ def, unlocked }) => (
                  <Tooltip
                    key={def.id}
                    content={
                      <div>
                        <div className="m2-tip__title">
                          {tr(def.name, lang)} <em>{tr(def.role, lang)}</em>
                        </div>
                        <div className="m2-tip__text">{unlocked ? tr(def.passiveText, lang) : ko ? '아카이브에서 해금' : 'Unlock in the Archive'}</div>
                        {unlocked && <MasteryNote wins={profile.companionWins?.[def.id] ?? 0} lang={lang} />}
                      </div>
                    }
                  >
                    <button
                      className={`m2-comp${companion === def.id ? ' is-on' : ''}${unlocked ? '' : ' is-locked'}`}
                      onClick={() => {
                        if (!unlocked) return sound('error')
                        sound('ui_click')
                        setCompId(companion === def.id ? null : def.id)
                      }}
                    >
                      <img src={portrait(def.sprite)} alt={tr(def.name, lang)} />
                      {!unlocked && <Lock size={14} />}
                      {unlocked && masteryTier(profile.companionWins?.[def.id] ?? 0) > 0 && (
                        <span className="m2-comp__mastery" aria-label={ko ? '숙련' : 'Mastery'}>
                          {masteryTier(profile.companionWins?.[def.id] ?? 0) >= 2 ? 'Ⅱ' : 'Ⅰ'}
                        </span>
                      )}
                    </button>
                  </Tooltip>
                ))}
                <span className="m2-comps__name">{companion ? tr(C.companions[companion]?.name, lang) : ko ? '혼자 간다' : 'Going alone'}</span>
              </div>
            )}
          </section>

          <section className="m2-setup__paradox">
            <div className="m2-setup__label">{ko ? '패러독스' : 'Paradox'}</div>
            <div className="m2-paradox">
              {[0, 1, 2, 3, 4, 5].map((lv) => {
                const locked = lv > profile.paradoxUnlocked
                return (
                  <button
                    key={lv}
                    className={`${paradox === lv ? 'is-on' : ''}${locked ? ' is-locked' : ''}`}
                    disabled={locked}
                    onClick={() => {
                      sound('ui_click')
                      setParadox(lv)
                    }}
                  >
                    {lv}
                  </button>
                )
              })}
            </div>
            <div className="m2-paradox__text">
              {paradox === 0 ? (
                <span>{ko ? '기본 규칙. 승리하면 다음 단계가 열린다.' : 'Standard rules. Win to unlock the next level.'}</span>
              ) : (
                C.paradox
                  .filter((p) => p.level <= paradox)
                  .map((p) => (
                    <span key={p.level}>
                      <b>{tr(p.name, lang)}</b> {tr(p.text, lang)}
                    </span>
                  ))
              )}
            </div>
          </section>
          {echoes.length > 0 && (
            <section className="m2-setup__bg-pick">
              <div className="m2-setup__label">{ko ? '각인 — 지난 루프가 남긴 것' : 'Inscribe — what the last loop left'}</div>
              <div className="m2-bgs" role="radiogroup">
                {echoes.map((e) => (
                  <button
                    key={e.id}
                    role="radio"
                    aria-checked={echoId === e.id}
                    className={echoId === e.id ? 'is-on' : ''}
                    onClick={() => {
                      sound('ui_click')
                      setEchoId(echoId === e.id ? null : e.id)
                    }}
                  >
                    <b>{tr(e.name, lang)}</b>
                    <small>{tr(e.text, lang)}</small>
                  </button>
                ))}
              </div>
              {echoId && echoLines[echoId] && <p className="m2-echo__line">“{echoLines[echoId]}”</p>}
              <p className="m2-bgs__text">
                {ko ? '하나만 새길 수 있다. 고르지 않아도 된다.' : 'You can inscribe one. Or none.'}
                {' · '}
                {ko ? `자율도 ${autonomy}/${AUTONOMY_STEPS.length}` : `Autonomy ${autonomy}/${AUTONOMY_STEPS.length}`}
                {nextStep !== null && (ko ? ` (기록 ${profile.codex.length}/${nextStep})` : ` (lore ${profile.codex.length}/${nextStep})`)}
                {worldEcho && (
                  <>
                    {' · '}
                    <b>
                      {worldEcho === 'world_echo_rewrite'
                        ? ko
                          ? '월드 잔향: 재작성된 코드 (+15₵ · IX 역방화벽)'
                          : 'World Echo: Rewritten Code (+15₵ · IX counter-firewall)'
                        : worldEcho === 'world_echo_refuge'
                          ? ko
                            ? '월드 잔향: 은신처의 유대 (시작 동료 유대 +1)'
                            : 'World Echo: Safe Refuge (+1 starting companion bond)'
                          : ko
                            ? '월드 잔향: 남은 불씨 (+15₵ · 개전 방어막 +4)'
                            : 'World Echo: Remaining Ember (+15₵ · +4 opening block)'}
                    </b>
                  </>
                )}
              </p>
            </section>
          )}
          {mutatorOffers.length > 0 && (
            <section className="m2-setup__bg-pick">
              <div className="m2-setup__label">{ko ? '도시 이상 현상 — 선택 변칙' : 'City Anomaly — optional mutator'}</div>
              <div className="m2-bgs" role="radiogroup">
                {mutatorOffers.map((m) => (
                  <button
                    key={m.id}
                    role="radio"
                    aria-checked={mutatorId === m.id}
                    className={mutatorId === m.id ? 'is-on' : ''}
                    onClick={() => {
                      sound('ui_click')
                      setMutatorId(mutatorId === m.id ? null : m.id)
                    }}
                  >
                    <b>{tr(m.name, lang)}</b>
                    <small>
                      ▲ {tr(m.boon, lang)} · ▼ {tr(m.burden, lang)}
                    </small>
                  </button>
                ))}
              </div>
              <p className="m2-bgs__text">
                {mutatorId
                  ? tr(mutatorOffers.find((m) => m.id === mutatorId)?.blurb, lang)
                  : ko
                    ? '선택 사항. 고르지 않으면 기본 도시 환경으로 시작한다.'
                    : 'Optional. Leave unselected for standard city conditions.'}
              </p>
            </section>
          )}
          {!daily && backgrounds.length > 0 && (
            <section className="m2-setup__bg-pick">
              <div className="m2-setup__label">{ko ? '출신' : 'Background'} <span className="m2-plus-tag">Signal+</span></div>
              {crpg ? (
                <>
                  <div className="m2-bgs" role="radiogroup">
                    {backgrounds.map((b) => (
                      <button
                        key={b.id}
                        role="radio"
                        aria-checked={bgId === b.id}
                        className={bgId === b.id ? 'is-on' : ''}
                        onClick={() => {
                          sound('ui_click')
                          setBgId(b.id)
                        }}
                      >
                        <b>{tr(b.name, lang)}</b>
                        <small>{b.proficient.map((st) => tr(STAT_LABEL[st], lang)).join(' · ')} +2</small>
                      </button>
                    ))}
                  </div>
                  <p className="m2-bgs__text">{tr(backgrounds.find((b) => b.id === bgId)?.text, lang)}</p>
                </>
              ) : (
                <button className="m2-bgs__teaser" onClick={() => setOffer(true)}>
                  {ko
                    ? '1막 구역 탐색과 d20 대화는 무료 체험으로 열려 있다. 출신 선택·2~3막 구역·야영 대화는 Signal+에서 열린다.'
                    : 'Act 1 districts and d20 dialogue are open as a free taste. Backgrounds, Act 2–3 districts and camp nights unlock with Signal+.'}
                </button>
              )}
            </section>
          )}
        </div>
      )}
      {offer && <SignalPlusModal lang={lang} onClose={() => setOffer(false)} />}

      <footer className="m2-setup__foot">
        <button
          className="m2-btn m2-btn--primary m2-btn--lg"
          disabled={!arch}
          onMouseEnter={() => sound('ui_hover')}
          onClick={() => {
            sound('transition', { intensity: 1.3 })
            onStart(
              daily
                ? { archetype: archId, companion: null, paradox: 0, daily }
                : {
                    archetype: archId,
                    companion: companion ?? null,
                    paradox,
                    ...(crpg ? { crpg: { background: bgId } } : C.crpg ? { crpg: { background: null, trial: true } } : {}),
                    ...(echoId ? { echo: echoId } : {}),
                    ...(mutatorId ? { mutator: mutatorId } : {}),
                  },
            )
          }}
        >
          <Play size={18} /> {ko ? '접속' : 'Connect'}
        </button>
      </footer>
    </div>
  )
}
