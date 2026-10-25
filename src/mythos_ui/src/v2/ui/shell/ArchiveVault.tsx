// Archive floor 2 — "기록 보관소" (plan §11): what the Deep Signal leaves behind. First Record shards, the music
// room (every loop's soundtrack, through the normal BGM channel so mute and the BGM setting still apply), and the
// long-run records: deepest act, Endless Signal, archetype mastery.
import { useState } from 'react'
import { RECORD_SHARDS } from '../../content/packs/first_record/index.ts'
import { ARCH_MASTERY_WINS, archMasteryTier } from '../../engine/meta.ts'
import type { ContentRegistry, Lang, MetaProfile } from '../../engine/types.ts'
import { MUSIC } from '../common/artManifest.ts'
import { playBgm, type Bgm } from '../common/audio.ts'
import { L, tr } from '../common/lang.ts'
import { sound } from '../components/sound.ts'

const TRACK_NAME: Record<string, ReturnType<typeof L>> = {
  title: L('타이틀', 'Title'),
  hub: L('아카이브', 'Archive'),
  map1: L('1막 지도', 'Act 1 map'),
  map2: L('2막 지도', 'Act 2 map'),
  map3: L('3막 지도', 'Act 3 map'),
  event: L('사건', 'Event'),
  shop: L('암시장', 'Black market'),
  rest: L('은신처', 'Safehouse'),
  combat1: L('전투 1', 'Combat 1'),
  combat2: L('전투 2', 'Combat 2'),
  combat3: L('전투 3', 'Combat 3'),
  elite: L('엘리트', 'Elite'),
  boss1: L('보스 1', 'Boss 1'),
  boss2: L('보스 2', 'Boss 2'),
  boss_ix: L('관리자 IX', 'Administrator IX'),
  victory: L('승리', 'Victory'),
  defeat: L('패배', 'Defeat'),
  ending: L('엔딩', 'Ending'),
}

export function ArchiveVault({ profile, C, lang }: { profile: MetaProfile; C: ContentRegistry; lang: Lang }) {
  const ko = lang === 'ko'
  const [track, setTrack] = useState<string | null>(null)
  const records = profile.records ?? []
  const tracks = Object.keys(MUSIC).filter((k) => TRACK_NAME[k])
  const endless = profile.endlessBest ?? 0
  return (
    <div className="m2-vault" data-testid="archive-vault">
      <section className="m2-vault__sec">
        <h4>{ko ? '깊이의 기록' : 'Depth records'}</h4>
        <div className="m2-vault__stats">
          <span>{ko ? `가장 깊이 간 막: ${profile.bestAct}` : `Deepest act: ${profile.bestAct}`}</span>
          <span>
            {ko ? '무한 신호: ' : 'Endless Signal: '}
            {endless > 0 ? (ko ? `잔향 ${Math.floor(endless / 100)}층 · ${endless % 100}막` : `layer ${Math.floor(endless / 100)} · act ${endless % 100}`) : '—'}
          </span>
          {Object.values(C.archetypes).map((a) => {
            const wins = profile.archetypeWins?.[a.id] ?? 0
            const tier = archMasteryTier(profile, a.id)
            const next = ARCH_MASTERY_WINS.find((w) => wins < w)
            return (
              <span key={a.id}>
                {tr(a.name, lang)} · {ko ? '숙련' : 'Mastery'} {tier > 0 ? 'I'.repeat(tier) : '—'}
                {next !== undefined && <small> ({ko ? `${wins}/${next}승` : `${wins}/${next} wins`})</small>}
              </span>
            )
          })}
        </div>
      </section>

      <section className="m2-vault__sec m2-firstrec" data-testid="first-record">
        <b>{ko ? `최초 기록 ${records.length}/${RECORD_SHARDS.length}` : `First Record ${records.length}/${RECORD_SHARDS.length}`}</b>
        {RECORD_SHARDS.map((r) =>
          records.includes(r.id) ? (
            <p key={r.id}>
              <span>{tr(r.title, lang)}</span> {tr(r.text, lang)}
            </p>
          ) : (
            <p key={r.id} className="is-hidden">
              {ko ? '??? — 딥 시그널 4~6막 어딘가' : '??? — somewhere in Deep Signal Acts 4–6'}
            </p>
          ),
        )}
      </section>

      <section className="m2-vault__sec">
        <h4>{ko ? '음악 감상실' : 'Music room'}</h4>
        <div className="m2-vault__tracks">
          {tracks.map((k) => (
            <button
              key={k}
              className={track === k ? 'is-on' : ''}
              onClick={() => {
                sound('ui_click')
                const next = track === k ? 'hub' : k
                setTrack(track === k ? null : k)
                playBgm(next as Bgm)
              }}
            >
              {tr(TRACK_NAME[k]!, lang)}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
