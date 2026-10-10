// Mythos 2.0 — UI state store: meta profile + current run.
//
// Persistence goes through v2/net/api.ts, which owns the localStorage mirror
// ('mythos2.profile' / 'mythos2.run', written synchronously on every save) and the
// debounced, never-blocking server sync (/api/v2). The UI never awaits the network:
// boot reads the local mirror synchronously; a server copy is adopted later only when
// this device had nothing better.
//
// Run end is applied to the profile exactly once, at the moment the run's screen first
// becomes 'ended' (applyRunEnd is also idempotent per run id), and the saved run is
// cleared at the same time. The ended run stays in memory for the summary screen.

import { useCallback, useEffect, useRef, useState } from 'react'
import { applyRunEnd, migrateProfile, newProfile } from '../engine/meta.ts'
import type { ContentRegistry, MetaProfile, RunState } from '../engine/types.ts'
import * as net from '../net/api.ts'

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

function bootRun(): RunState | null {
  const local = safe(() => net.loadRunLocal(), null)
  return isLiveRun(local) ? local : null
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
}

export function useGame(C: ContentRegistry): GameStore {
  const [profile, setProfileState] = useState<MetaProfile>(bootProfile)
  const [run, setRunState] = useState<RunState | null>(bootRun)
  const profileRef = useRef(profile)
  const runRef = useRef(run)
  const hadLocalProfile = useRef(safe(() => net.loadProfileLocal() !== null, false))
  const savedRun = useRef(run !== null)

  // Profile: mirror + debounced server save on every change.
  useEffect(() => {
    profileRef.current = profile
    void safe(() => net.saveProfile(profile), Promise.resolve(false))
  }, [profile])

  // Run: save while live; clear once it ends or is dropped.
  useEffect(() => {
    runRef.current = run
    if (isLiveRun(run)) {
      savedRun.current = true
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

  // Boot: adopt the server copy only if this device had no profile / run of its own.
  useEffect(() => {
    let alive = true
    if (!hadLocalProfile.current) {
      void net
        .loadProfile()
        .then((p) => {
          if (!alive || !p) return
          const migrated = migrateProfile(p)
          if (migrated.loops > profileRef.current.loops) setProfileState(migrated)
        })
        .catch(() => undefined)
    }
    if (!runRef.current) {
      void net
        .loadRun()
        .then((r) => {
          if (alive && !runRef.current && isLiveRun(r)) setRunState(r)
        })
        .catch(() => undefined)
    }
    return () => {
      alive = false
    }
  }, [])

  const setProfile = useCallback((next: MetaProfile | ((p: MetaProfile) => MetaProfile)) => {
    setProfileState((p) => (typeof next === 'function' ? next(p) : next))
  }, [])

  const setRun = useCallback(
    (next: RunState | null) => {
      const prev = runRef.current
      runRef.current = next
      if (next && next.screen.kind === 'ended' && prev?.screen.kind !== 'ended') {
        const banked = applyRunEnd(profileRef.current, next, C)
        if (banked !== profileRef.current) {
          profileRef.current = banked
          setProfileState(banked)
          const rec = banked.history.find((h) => h.id === next.id)
          if (rec) void safe(() => net.appendHistory(rec), Promise.resolve(false))
        }
      }
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
  }
}
