// Mythos 2.0 — UI state store: meta profile + current run.
//
// Persistence goes through v2/net/api.ts, which owns the localStorage mirror
// ('mythos2.profile' / 'mythos2.run', written synchronously on every save) and the
// debounced, never-blocking server sync (/api/v2). The UI never awaits the network:
// boot reads the local mirror synchronously; the server copy is consulted right after
// (net.loadProfile / loadRun: unsynced local progress wins and is pushed, otherwise the
// server copy wins) and adopted only while the player has not changed anything yet this
// session. The boot state itself is not re-saved (it is already the mirror), so opening the
// game on a stale device never overwrites newer cloud progress. A sign-in swaps in the
// account's cloud copy the same way (net.onAdopt).
//
// Run end is applied to the profile exactly once, at the moment the run's screen first
// becomes 'ended' (applyRunEnd is also idempotent per run id), and the saved run is
// cleared at the same time. The ended run stays in memory for the summary screen. A
// finished daily-seed run is also submitted to the leaderboard then (net/daily.ts).

import { useCallback, useEffect, useRef, useState } from 'react'
import { dateKeyAt, isDateKey } from '../engine/daily.ts'
import { applyRunEnd, computeEchoes, dailyResultOf, migrateProfile, newProfile } from '../engine/meta.ts'
import type { ContentRegistry, MetaProfile, RunState } from '../engine/types.ts'
import * as net from '../net/api.ts'
import { submitDaily, type SubmitOutcome } from '../net/daily.ts'
import { noteCommit, replayLogFor } from './replay/record.ts'
import { langFromSearch } from './common/lang.ts'

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

function isLiveRun(r: RunState | null | undefined): r is RunState {
  return !!r && r.version === 2 && !!r.screen && r.screen.kind !== 'ended'
}

function bootProfile(): MetaProfile {
  const local = safe(() => net.loadProfileLocal(), null)
  return local ? migrateProfile(local) : newProfile('Connector')
}

/** The language pinned by the page link (`?lang=en|ko`, e.g. a judge link), read once at boot. */
const linkLang = typeof window === 'undefined' ? null : langFromSearch(window.location.search)

/** `p` in the link's language (the same object when there is no pin or it already matches). */
function withLinkLang(p: MetaProfile): MetaProfile {
  return linkLang && p.settings.lang !== linkLang ? { ...p, settings: { ...p.settings, lang: linkLang } } : p
}

function bootRun(): RunState | null {
  const local = safe(() => net.loadRunLocal(), null)
  return isLiveRun(local) ? local : null
}

/** The leaderboard submit of the daily run that just ended (outcome null while it is in flight). */
export interface DailySubmitState {
  runId: string
  date: string
  archetype: string
  outcome: SubmitOutcome | null
}

function sameJson(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

export interface GameStore {
  profile: MetaProfile
  run: RunState | null
  /** True when a run is in progress (not yet ended). */
  hasRun: boolean
  setProfile: (next: MetaProfile | ((p: MetaProfile) => MetaProfile)) => void
  /** Replace the run. Entering the 'ended' screen banks the run into the profile once. */
  setRun: (next: RunState | null) => void
  /** Attach the GM chronicle to the history record of a finished run. */
  attachChronicle: (runId: string, chronicle: string) => void
  /** Drop the in-memory run (after the summary screen) without touching the profile. */
  closeRun: () => void
  /** When the live run was last auto-saved on this device (every state change writes it). */
  savedAt: number | null
  /** Push pending saves to the server now (save & quit). */
  flush: () => Promise<void>
  /** The daily run that just ended: its leaderboard submit. */
  dailySubmit: DailySubmitState | null
}

export function useGame(C: ContentRegistry): GameStore {
  const [mirror] = useState<MetaProfile>(bootProfile)
  const [profile, setProfileState] = useState<MetaProfile>(() => withLinkLang(mirror))
  const [run, setRunState] = useState<RunState | null>(bootRun)
  const profileRef = useRef(profile)
  const runRef = useRef(run)
  // The states that already match the local mirror (boot, or a cloud copy just adopted): not saved again.
  // A link-pinned language differs from the mirror: that one is saved like any settings change.
  const quietProfile = useRef<MetaProfile | null>(profile === mirror ? profile : null)
  const quietRun = useRef<RunState | null>(run)
  const savedRun = useRef(run !== null)
  const [savedAt, setSavedAt] = useState<number | null>(() => safe(() => net.runSavedAt(), null))
  const [dailySubmit, setDailySubmit] = useState<DailySubmitState | null>(null)

  // Profile: mirror + debounced server save on every change.
  useEffect(() => {
    profileRef.current = profile
    if (profile === quietProfile.current) return
    quietProfile.current = null
    void safe(() => net.saveProfile(profile), Promise.resolve(false))
  }, [profile])

  // Run: save while live; clear once it ends or is dropped.
  useEffect(() => {
    runRef.current = run
    if (isLiveRun(run)) {
      savedRun.current = true
      if (run === quietRun.current) return
      quietRun.current = null
      // The localStorage mirror is written synchronously inside saveRun; the server copy follows (debounced).
      void safe(() => net.saveRun(run), Promise.resolve(false))
    } else if (savedRun.current) {
      savedRun.current = false
      void safe(() => net.clearRun(), Promise.resolve(false))
    }
  }, [run])

  // Flush pending saves when the tab goes away.
  useEffect(() => {
    const flush = () => void safe(() => net.flushSaves(true), Promise.resolve())
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  // Switch to a copy that came from the server (it is already mirrored locally, so it is not re-saved).
  const adoptProfile = useCallback((raw: MetaProfile) => {
    const next = migrateProfile(raw)
    if (sameJson(next, profileRef.current)) return
    quietProfile.current = next
    profileRef.current = next
    setProfileState(next)
  }, [])
  const adoptRun = useCallback((r: RunState) => {
    if (!isLiveRun(r) || sameJson(r, runRef.current)) return
    quietRun.current = r
    runRef.current = r
    savedRun.current = true
    setRunState(r)
    setSavedAt(safe(() => net.runSavedAt(), null))
  }, [])

  // Boot: reconcile with the server copy, unless the player already changed something this session.
  useEffect(() => {
    let alive = true
    const bootProfileState = profileRef.current
    const bootRunState = runRef.current
    void net
      .loadProfile()
      .then((p) => {
        if (alive && p && profileRef.current === bootProfileState) adoptProfile(withLinkLang(p))
      })
      .catch(() => undefined)
    void net
      .loadRun()
      .then((r) => {
        if (alive && r && runRef.current === bootRunState) adoptRun(r)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [adoptProfile, adoptRun])

  // Sign-in: the account's cloud copy replaces this device's state (net/api.ts adoptAccount decides).
  useEffect(
    () =>
      net.onAdopt((copies) => {
        if (copies.profile) adoptProfile(copies.profile)
        if (copies.run) adoptRun(copies.run)
      }),
    [adoptProfile, adoptRun],
  )

  const setProfile = useCallback((next: MetaProfile | ((p: MetaProfile) => MetaProfile)) => {
    setProfileState((p) => (typeof next === 'function' ? next(p) : next))
  }, [])

  const setRun = useCallback(
    (next: RunState | null) => {
      const prev = runRef.current
      runRef.current = next
      noteCommit(prev, next)
      if (next && next.screen.kind === 'ended' && prev?.screen.kind !== 'ended') {
        const banked = applyRunEnd(profileRef.current, next, C)
        if (banked !== profileRef.current) {
          profileRef.current = banked
          setProfileState(banked)
          const rec = banked.history.find((h) => h.id === next.id)
          if (rec) void safe(() => net.appendHistory(rec), Promise.resolve(false))
          if (isDateKey(next.daily)) {
            // Today's leaderboard: this run's own result (the server keeps each player's best).
            const date = next.daily
            const result = dailyResultOf(next, computeEchoes(next, C).total)
            setDailySubmit({ runId: next.id, date, archetype: next.archetype, outcome: null })
            const replay = replayLogFor(next.id) ?? undefined
            void submitDaily({ date, name: banked.playerName, result, replay }, dateKeyAt(Date.now()))
              .catch((): SubmitOutcome => ({ kind: 'queued' }))
              .then((outcome) => setDailySubmit((s) => (s && s.runId === next.id ? { ...s, outcome } : s)))
          }
        }
      }
      // Every live state change is auto-saved by the effect below; stamp it for the HUD / title.
      if (isLiveRun(next)) setSavedAt(Date.now())
      setRunState(next)
    },
    [C],
  )

  const attachChronicle = useCallback((runId: string, chronicle: string) => {
    const p = profileRef.current
    const idx = p.history.findIndex((h) => h.id === runId)
    const rec = p.history[idx]
    if (idx < 0 || !rec || rec.chronicle) return
    const history = p.history.slice()
    const updated = { ...rec, chronicle }
    history[idx] = updated
    const np = { ...p, history }
    profileRef.current = np
    setProfileState(np)
    void safe(() => net.appendHistory(updated), Promise.resolve(false))
  }, [])

  const closeRun = useCallback(() => {
    runRef.current = null
    setRunState(null)
  }, [])

  return {
    profile,
    run,
    hasRun: isLiveRun(run),
    setProfile,
    setRun,
    attachChronicle,
    closeRun,
    savedAt: isLiveRun(run) ? savedAt : null,
    flush: () => safe(() => net.flushSaves(), Promise.resolve()),
    dailySubmit,
  }
}
