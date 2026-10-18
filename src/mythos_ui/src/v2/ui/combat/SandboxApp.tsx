// Dev-only combat sandbox UI (mounted by CombatSandbox.tsx at /?sandbox=combat).
// ?enc=<encounterId> preselects a fight; ?vw=1280&vh=720 pins the combat area to an exact size.
import { useMemo, useState } from 'react'
import { CONTENT } from '../../content/index.ts'
import { startCombat } from '../../engine/combat.ts'
import { newProfile } from '../../engine/meta.ts'
import { newRun } from '../../engine/run.ts'
import type { CombatState, Lang, RunState } from '../../engine/types.ts'
import { configureAudio, unlockAudio } from '../common/audio.ts'
import { CombatScreen } from './CombatScreen.tsx'
import { TUTORIAL_KEY } from './describe.ts'
import './sandbox.css'

const C = CONTENT

function build(archetype: string, encounterId: string, extra: boolean, seed: number): { run: RunState; combat: CombatState } | { error: string } {
  try {
    const profile = newProfile('Sandbox')
    const run = newRun(profile, { archetype, paradox: 0, seed }, C)
    const enc = C.encounters[encounterId]
    if (enc) run.act = enc.act
    if (extra) {
      const second = Object.values(C.companions).find((c) => !run.party.some((p) => p.id === c.id))
      if (second && run.party.length < 2) {
        run.party.push({ id: second.id, hp: second.maxHp, maxHp: second.maxHp, bond: 0 })
        for (const id of second.cards) run.deck.push({ uid: `sb_${id}_${run.uidCounter++}`, defId: id, upgraded: false })
      }
      run.consumables = Object.keys(C.consumables).slice(0, 3)
    }
    return { run, combat: startCombat(run, encounterId, C) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function CombatSandbox() {
  const encounters = useMemo(() => Object.values(C.encounters).sort((a, b) => a.act - b.act || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)), [])
  const archetypes = Object.keys(C.archetypes)
  const [encId, setEncId] = useState(() => new URLSearchParams(window.location.search).get('enc') ?? encounters[0]?.id ?? '')
  const [arch, setArch] = useState(archetypes[0] ?? 'ghost')
  const [extra, setExtra] = useState(true)
  const [lang, setLang] = useState<Lang>('ko')
  const [fast, setFast] = useState(false)
  const [seed, setSeed] = useState(1)
  const [result, setResult] = useState<string | null>(null)
  const [remount, setRemount] = useState(0)
  const built = useMemo(() => build(arch, encId, extra, seed), [arch, encId, extra, seed])
  const [combat, setCombat] = useState<CombatState | null>(null)
  const [builtFor, setBuiltFor] = useState(built)
  if (builtFor !== built) {
    setBuiltFor(built)
    setCombat(null)
    setResult(null)
  }
  const current = combat ?? ('combat' in built ? built.combat : null)

  const q = new URLSearchParams(window.location.search)
  const vw = Number(q.get('vw')) || 0
  const vh = Number(q.get('vh')) || 0
  // ?vw=1280&vh=720 pins the combat area to an exact size (layout checks on a large monitor).
  const frame = vw && vh ? { flex: 'none', width: vw, height: vh, outline: '1px solid #f0cd75' } : undefined

  const restart = () => {
    setSeed((s) => s + 1)
  }

  return (
    <div
      className="m2-app m2c-sandbox"
      onPointerDownCapture={() => {
        // Dev sandbox: silent unless explicitly asked for (?sound=1); ?mute=1 always wins (audio.ts).
        const sound = new URLSearchParams(window.location.search).get('sound') === '1'
        configureAudio({ bgm: sound, sfx: sound })
        if (sound) unlockAudio()
      }}
    >
      <div className="m2c-sb-bar">
        <b>COMBAT SANDBOX</b>
        <select value={encId} onChange={(e) => setEncId(e.target.value)}>
          {encounters.map((e) => (
            <option key={e.id} value={e.id}>
              A{e.act} · {e.kind} · {e.name.ko} ({e.id})
            </option>
          ))}
        </select>
        <select value={arch} onChange={(e) => setArch(e.target.value)}>
          {archetypes.map((a) => (
            <option key={a} value={a}>
              {C.archetypes[a]?.name.ko ?? a}
            </option>
          ))}
        </select>
        <label>
          <input type="checkbox" checked={extra} onChange={(e) => setExtra(e.target.checked)} /> +companion +items
        </label>
        <label>
          <input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> fast
        </label>
        <button type="button" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>
          {lang.toUpperCase()}
        </button>
        <button type="button" onClick={restart}>
          restart
        </button>
        <button
          type="button"
          onClick={() => {
            if (!current) return
            setCombat({ ...current, units: current.units.map((u) => (u.side === 'enemy' ? { ...u, hp: 1, block: 0, armor: 0 } : u)) })
            setRemount((n) => n + 1)
          }}
        >
          enemies→1hp
        </button>
        <button
          type="button"
          onClick={() => {
            if (!current) return
            const first = current.units.find((u) => u.side === 'enemy' && u.hp > 0)
            setCombat({ ...current, units: current.units.filter((u) => u.side !== 'enemy' || u === first).map((u) => (u === first ? { ...u, hp: 1, block: 0, armor: 0 } : u)) })
            setRemount((n) => n + 1)
          }}
        >
          solo→1hp
        </button>
        <button
          type="button"
          onClick={() => {
            if (!current) return
            const tiles = current.tiles.map((row, y) =>
              row.map((t, x) => {
                if (x >= 2 && x <= 4 && y >= 1 && y <= 2 && t.kind === 'floor') {
                  return { ...t, fire: 3 }
                }
                return t
              }),
            )
            const units = current.units.map((u, idx) =>
              u.side === 'enemy'
                ? {
                    ...u,
                    pos: idx % 2 === 0 ? { x: 3, y: 2 } : u.pos,
                    statuses: { ...u.statuses, burn: 3, shock: idx % 2 === 0 ? 2 : 0, mark: idx % 2 === 1 ? 1 : 0 },
                  }
                : u,
            )
            setCombat({ ...current, tiles, units })
            setRemount((n) => n + 1)
          }}
        >
          fx:fire
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.removeItem(TUTORIAL_KEY)
            } catch {
              // ignore
            }
            restart()
          }}
        >
          tutorial
        </button>
        {result && <span className="m2c-sb-result">{result}</span>}
      </div>
      <div className={q.get('free') ? 'm2c-sb-stage is-free' : 'm2c-sb-stage'} style={frame}>
        {'error' in built ? (
          <div className="m2c-sb-msg">engine/content not ready: {built.error}</div>
        ) : current ? (
          <CombatScreen
            key={`${encId}:${arch}:${seed}:${extra}:${remount}`}
            run={built.run}
            combat={current}
            C={C}
            lang={lang}
            settings={{ fastAnim: fast, sfx: true, bgm: true }}
            onCombatChange={(c) => {
              setCombat(c)
              if (c.phase !== 'player') setResult(c.phase === 'won' ? `WON on turn ${c.turn}` : `LOST on turn ${c.turn}`)
            }}
            onOpenDeck={() => undefined}
          />
        ) : null}
        {result && (
          <div className="m2c-sb-over">
            <p>{result}</p>
            <button type="button" onClick={restart}>
              fight again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
