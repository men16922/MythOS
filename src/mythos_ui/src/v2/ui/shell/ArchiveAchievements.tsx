// Archive tab — achievements (content/achievements.ts), grouped. Earned ones lit, the rest dim with
// what they ask; secret ones stay '???' until earned. Cosmetic only.
import { Check } from 'lucide-react'
import type { AchievementGroup, ContentRegistry, Lang, MetaProfile } from '../../engine/types.ts'
import { L, tr } from '../common/lang.ts'

const GROUPS: { group: AchievementGroup; label: ReturnType<typeof L> }[] = [
  { group: 'progress', label: L('루프', 'Loops') },
  { group: 'ending', label: L('결말', 'Endings') },
  { group: 'collection', label: L('수집', 'Collection') },
  { group: 'challenge', label: L('도전', 'Challenges') },
  { group: 'archetype', label: L('접속자', 'Archetypes') },
  { group: 'companion', label: L('동료', 'Companions') },
]

export function ArchiveAchievements({ profile, C, lang }: { profile: MetaProfile; C: ContentRegistry; lang: Lang }) {
  const have = new Set(profile.achievements ?? [])
  const all = Object.values(C.achievements ?? {})
  return (
    <div className="m2-ach" data-testid="archive-achievements">
      {GROUPS.map(({ group, label }) => {
        const list = all.filter((a) => a.group === group)
        if (list.length === 0) return null
        return (
          <section key={group} className="m2-ach__sec">
            <h4>
              {tr(label, lang)} <small className="m2-mono">{list.filter((a) => have.has(a.id)).length}/{list.length}</small>
            </h4>
            {list.map((a) => {
              const got = have.has(a.id)
              const hidden = !got && a.secret
              return (
                <div key={a.id} className={`m2-ach__row${got ? ' is-got' : ''}`}>
                  <span className="m2-ach__mark" aria-label={got ? (lang === 'ko' ? '달성' : 'Earned') : undefined}>
                    {got && <Check size={12} />}
                  </span>
                  <span className="m2-ach__body">
                    <b>{hidden ? '???' : tr(a.name, lang)}</b>
                    <small>{hidden ? (lang === 'ko' ? '아직 밝혀지지 않은 기록' : 'A record not yet revealed') : tr(a.text, lang)}</small>
                  </span>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
