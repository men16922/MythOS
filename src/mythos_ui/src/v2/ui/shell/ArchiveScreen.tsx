// Mythos 2.0 — the Archive (meta hub): Echo balance, unlock tree, codex, endings, run history, IX.
import { art } from '../components/art.ts'
import { BookOpen, Check, ChevronLeft, History, Lock, Play, Sparkles, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ContentRegistry, Lang, MetaProfile, MetaUnlockDef, MetaUnlockKind, Text } from '../../engine/types.ts'
import { asset, portrait } from '../common/assets.ts'
import { L, tr } from '../common/lang.ts'
import { CountUp } from '../components/CountUp.tsx'
import { fmtText } from '../components/format.ts'
import { sound } from '../components/sound.ts'
import { Typewriter } from '../components/Typewriter.tsx'
import { narrate } from './gm.ts'
import { rx } from './rx.ts'

const KINDS: { kind: MetaUnlockKind; label: Text; hint: Text }[] = [
  { kind: 'archetype', label: L('접속자', 'Archetypes'), hint: L('새로운 방식으로 루프를 시작한다.', 'New ways to start a loop.') },
  { kind: 'companion', label: L('동료', 'Companions'), hint: L('함께 달릴 사람들. 각자 카드와 능력을 가져온다.', 'People who run with you. Each brings cards and a passive.') },
  { kind: 'card_pack', label: L('프로토콜 묶음', 'Protocol packs'), hint: L('보상과 상점에 새 카드가 섞인다.', 'New cards enter rewards and shops.') },
  { kind: 'implant_pack', label: L('임플란트 보급', 'Implant caches'), hint: L('새 임플란트가 드롭 풀에 들어온다.', 'New implants enter the drop pool.') },
  { kind: 'thread', label: L('기억의 실', 'Memory threads'), hint: L('매 루프에 영구히 적용되는 작은 이점.', 'Small permanent edges for every loop.') },
]

type SideTab = 'codex' | 'endings' | 'history'

/** Who killed the connector, as IX would name it: an enemy, not a map label. `killedBy` may be an
 *  encounter id ("Behind Cover") — then name its toughest enemy instead. */
function killerName(killerId: string | undefined, C: ContentRegistry): Text | undefined {
  if (!killerId) return undefined
  const direct = C.enemies[killerId]
  if (direct) return direct.name
  const enc = C.encounters[killerId]
  if (!enc) return undefined
  const TIER = { boss: 3, elite: 2, normal: 1, minion: 0 } as const
  const lead = enc.enemies
    .map((e) => C.enemies[e.id])
    .filter((d): d is NonNullable<typeof d> => !!d)
    .sort((a, b) => TIER[b.tier] - TIER[a.tier] || b.hp - a.hp)[0]
  return lead?.name ?? enc.name
}

function ixLine(profile: MetaProfile, C: ContentRegistry, lang: Lang): string {
  const lines = C.ixLines
  const last = profile.history[0]
  let pool: Text[] = lines.generic
  if (profile.loops === 0) pool = lines.first
  else if (last?.result === 'victory') pool = lines.afterWin
  else if (last && profile.lastDeath) pool = lines.afterDeath
  if (pool.length === 0) pool = lines.generic.length ? lines.generic : lines.first
  const line = pool[profile.loops % Math.max(1, pool.length)]
  const killer = killerName(profile.lastDeath?.killedBy, C)
  return fmtText(line ?? L('…', '…'), lang, {
    loop: profile.loops + 1,
    killer: killer ? tr(killer, lang) : lang === 'ko' ? '도시' : 'the city',
  })
}

function unlockIcon(u: MetaUnlockDef, C: ContentRegistry): string {
  if (u.icon) return asset(u.icon)
  if (u.kind === 'companion' && u.grants && C.companions[u.grants]) return portrait(C.companions[u.grants]?.sprite ?? '')
  if (u.kind === 'archetype' && u.grants && C.archetypes[u.grants]) return portrait(C.archetypes[u.grants]?.sprite ?? '')
  return asset('items/data_fragment.png')
}

export interface ArchiveScreenProps {
  profile: MetaProfile
  C: ContentRegistry
  onProfile: (p: MetaProfile) => void
  onBegin: () => void
  onBack: () => void
  /** Loop number of a run still in progress (the CTA then resumes it). */
  activeLoop?: number | null
  onContinue?: () => void
  onAbandon?: () => void
}

export function ArchiveScreen({ profile, C, onProfile, onBegin, onBack, activeLoop, onContinue, onAbandon }: ArchiveScreenProps) {
  const lang = profile.settings.lang
  const ko = lang === 'ko'
  const [kind, setKind] = useState<MetaUnlockKind>('companion')
  const [side, setSide] = useState<SideTab>('codex')
  const [charging, setCharging] = useState<string | null>(null)
  const [burst, setBurst] = useState<string | null>(null)
  const authoredIx = useMemo(() => ixLine(profile, C, lang), [profile, C, lang])
  const [gmIx, setGmIx] = useState<{ key: string; text: string } | null>(null)
  const ixKey = `${profile.loops}-${lang}`

  useEffect(() => {
    let alive = true
    const killer = killerName(profile.lastDeath?.killedBy, C)
    const last = profile.history[0]
    const lastEnding = last?.endingId ? C.endings[last.endingId] : undefined
    void narrate('ix_loop_start', lang, {
      loop: profile.loops + 1,
      lastResult: last?.result,
      lastEnding: lastEnding ? tr(lastEnding.title, lang) : undefined,
      lastEndingText: lastEnding ? tr(lastEnding.text, lang) : undefined,
      killedBy: killer ? tr(killer, lang) : undefined,
      lastAct: profile.lastDeath?.act,
      wins: profile.wins,
    }).then((text) => {
      if (alive && text) setGmIx({ key: ixKey, text })
    })
    return () => {
      alive = false
    }
    // once per loop count / language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ixKey])

  const unlocks = Object.values(C.unlocks).filter((u) => u.kind === kind)
  const ownedCount = (k: MetaUnlockKind) => Object.values(C.unlocks).filter((u) => u.kind === k && profile.unlocks.includes(u.id)).length
  const totalCount = (k: MetaUnlockKind) => Object.values(C.unlocks).filter((u) => u.kind === k).length

  const buy = (u: MetaUnlockDef) => {
    if (charging) return
    const gate = rx.unlockGate(profile, u, C)
    if (!gate.ok) {
      sound('error')
      return
    }
    setCharging(u.id)
    sound('roll_tick', { intensity: 0.6 })
    window.setTimeout(() => {
      sound('unlock')
      onProfile(rx.buyUnlock(profile, u.id, C))
      setCharging(null)
      setBurst(u.id)
      window.setTimeout(() => setBurst((b) => (b === u.id ? null : b)), 900)
    }, profile.settings.fastAnim ? 150 : 620)
  }

  const lore = Object.values(C.lore)
  const endings = Object.values(C.endings)

  return (
    <div className="m2-archive">
      <div className="m2-archive__bg" style={{ backgroundImage: `url(${art.archive()})` }} />
      <header className="m2-archive__head">
        <button className="m2-iconbtn" onClick={onBack} title={ko ? '타이틀로' : 'Back to title'}>
          <ChevronLeft size={18} />
        </button>
        <div className="m2-archive__titles">
          <h1>{ko ? '아카이브' : 'The Archive'}</h1>
          <p>{ko ? '루프가 끝나도 남는 것들' : 'What survives the loop'}</p>
        </div>
        <div className="m2-archive__stats">
          <div>
            <small>{ko ? '루프' : 'Loops'}</small>
            <b className="m2-mono">{profile.loops}</b>
          </div>
          <div>
            <small>{ko ? '탈출' : 'Wins'}</small>
            <b className="m2-mono">{profile.wins}</b>
          </div>
          <div className="m2-archive__echo">
            <small>{ko ? '에코' : 'Echoes'}</small>
            <b>
              ◈ <CountUp value={profile.echoes} className="m2-mono" />
            </b>
          </div>
        </div>
      </header>

      <div className="m2-archive__grid">
        <section className="m2-ix">
          <div className="m2-ix__portrait">
            <img src={asset('characters/administrator-ix.png')} alt="" />
          </div>
          <div className="m2-ix__name">{ko ? '관리자 IX' : 'Administrator IX'}</div>
          <div className="m2-ix__line">
            <Typewriter key={gmIx?.key === ixKey ? 'gm' : 'auth'} text={gmIx?.key === ixKey ? gmIx.text : authoredIx} cps={profile.settings.fastAnim ? 400 : 55} />
          </div>
          {activeLoop ? (
            <>
              <button
                className="m2-btn m2-btn--primary m2-btn--lg m2-ix__begin"
                onMouseEnter={() => sound('ui_hover')}
                onClick={() => {
                  sound('transition')
                  onContinue?.()
                }}
              >
                <Play size={18} /> {ko ? `루프 ${activeLoop} 이어하기` : `Resume loop ${activeLoop}`}
              </button>
              <button className="m2-ix__alt" onClick={onAbandon}>
                {ko ? '이 루프를 포기하고 새로 시작' : 'Abandon it and start over'}
              </button>
            </>
          ) : (
            <button
              className="m2-btn m2-btn--primary m2-btn--lg m2-ix__begin"
              onMouseEnter={() => sound('ui_hover')}
              onClick={() => {
                sound('transition')
                onBegin()
              }}
            >
              <Play size={18} /> {ko ? `루프 ${profile.loops + 1} 시작` : `Begin loop ${profile.loops + 1}`}
            </button>
          )}
        </section>

        <section className="m2-tree">
          <nav className="m2-tabs">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                className={k.kind === kind ? 'is-on' : ''}
                onClick={() => {
                  sound('ui_click')
                  setKind(k.kind)
                }}
              >
                {tr(k.label, lang)}
                <small className="m2-mono">
                  {ownedCount(k.kind)}/{totalCount(k.kind)}
                </small>
              </button>
            ))}
          </nav>
          <p className="m2-tree__hint">{tr(KINDS.find((k) => k.kind === kind)?.hint, lang)}</p>
          <div className="m2-tree__list">
            {unlocks.map((u) => {
              const owned = profile.unlocks.includes(u.id)
              const gate = rx.unlockGate(profile, u, C)
              const reqMissing = !!u.requires && !profile.unlocks.includes(u.requires)
              const state = owned ? 'owned' : gate.ok ? 'open' : reqMissing ? 'locked' : 'short'
              return (
                <button
                  key={u.id}
                  className={`m2-unlock is-${state}${charging === u.id ? ' is-charging' : ''}${burst === u.id ? ' is-burst' : ''}`}
                  onClick={() => !owned && buy(u)}
                  onMouseEnter={() => !owned && sound('ui_hover')}
                  disabled={owned}
                >
                  <span className="m2-unlock__icon">
                    <img src={unlockIcon(u, C)} alt="" />
                    {state === 'locked' && (
                      <span className="m2-unlock__lock">
                        <Lock size={16} />
                      </span>
                    )}
                  </span>
                  <span className="m2-unlock__body">
                    <b>{tr(u.name, lang)}</b>
                    <small>{tr(u.text, lang)}</small>
                    {!owned && !gate.ok && gate.reason && <em>{tr(gate.reason, lang)}</em>}
                  </span>
                  <span className="m2-unlock__cost">
                    {owned ? (
                      <Check size={18} />
                    ) : (
                      <>
                        ◈<b className="m2-mono">{u.cost}</b>
                      </>
                    )}
                  </span>
                  <span className="m2-unlock__charge" />
                </button>
              )
            })}
            {unlocks.length === 0 && <div className="m2-empty">{ko ? '아직 기록된 것이 없다.' : 'Nothing recorded yet.'}</div>}
          </div>
        </section>

        <section className="m2-records">
          <nav className="m2-tabs m2-tabs--sm">
            <button className={side === 'codex' ? 'is-on' : ''} onClick={() => setSide('codex')}>
              <BookOpen size={14} /> {ko ? '기록' : 'Codex'}
              <small className="m2-mono">
                {profile.codex.length}/{lore.length}
              </small>
            </button>
            <button className={side === 'endings' ? 'is-on' : ''} onClick={() => setSide('endings')}>
              <Trophy size={14} /> {ko ? '결말' : 'Endings'}
              <small className="m2-mono">
                {profile.endingsSeen.length}/{endings.length}
              </small>
            </button>
            <button className={side === 'history' ? 'is-on' : ''} onClick={() => setSide('history')}>
              <History size={14} /> {ko ? '이력' : 'History'}
            </button>
          </nav>
          <div className="m2-records__body">
            {side === 'codex' && (
              <>
                {lore
                  .filter((e) => profile.codex.includes(e.id))
                  .map((e) => (
                    <details key={e.id} className="m2-lore">
                      <summary>{tr(e.title, lang)}</summary>
                      <p>{tr(e.text, lang)}</p>
                    </details>
                  ))}
                {lore.length > profile.codex.length && (
                  <div className="m2-lore m2-lore--locked">
                    <b className="m2-mono">{lore.length - profile.codex.length}</b>
                    <span>{ko ? '개의 기록이 손상된 채 남아 있다. 루프 중 사건과 선택에서 복구된다.' : 'entries remain corrupted. Events and choices during a loop restore them.'}</span>
                  </div>
                )}
              </>
            )}
            {side === 'endings' && (
              <div className="m2-endgrid">
                {endings.map((e) => {
                  const seen = profile.endingsSeen.includes(e.id)
                  return (
                    <div key={e.id} className={`m2-endcard${seen ? '' : ' is-hidden'}`}>
                      <img src={art.ending(e.id, e.image)} alt="" />
                      <span>{seen ? tr(e.title, lang) : '???'}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {side === 'history' &&
              (profile.history.length === 0 ? (
                <div className="m2-empty">{ko ? '아직 끝난 루프가 없다.' : 'No finished loops yet.'}</div>
              ) : (
                profile.history.map((h) => {
                  const arch = C.archetypes[h.archetype]
                  const ending = C.endings[h.endingId]
                  const killer = h.killedBy ? (C.encounters[h.killedBy]?.name ?? C.enemies[h.killedBy]?.name) : undefined
                  return (
                    <div key={h.id} className={`m2-hist m2-hist--${h.result}`}>
                      <div className="m2-hist__top">
                        <b className="m2-mono">#{h.loop}</b>
                        <span>{tr(arch?.name, lang)}</span>
                        <span className="m2-hist__res">
                          {h.result === 'victory' ? tr(ending?.title, lang) || (ko ? '탈출' : 'Escaped') : h.result === 'abandoned' ? (ko ? '포기' : 'Abandoned') : ko ? '삭제됨' : 'Erased'}
                        </span>
                        <span className="m2-hist__echo m2-mono">+◈{h.echoes}</span>
                      </div>
                      <div className="m2-hist__sub">
                        {ko ? `${h.act}막 · ${h.floors}구역` : `Act ${h.act} · ${h.floors} floors`}
                        {killer && ` · ${tr(killer, lang)}`}
                        {h.party.length > 0 && ` · ${h.party.map((p) => tr(C.companions[p]?.name, lang)).join(', ')}`}
                      </div>
                      {h.chronicle && (
                        <p className="m2-hist__chron">
                          <Sparkles size={12} /> {h.chronicle}
                        </p>
                      )}
                    </div>
                  )
                })
              ))}
          </div>
        </section>
      </div>
    </div>
  )
}
