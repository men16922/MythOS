// Alert consent owns permission checks, registration cleanup and topic changes. No native imports: tests cross
// the same interface as Settings, using a deterministic adapter instead of Firebase/network side effects.
import type { Lang } from '../engine/types.ts'
import type { PushControl, PushToggleResult } from '../ui/common/nativeBridge.ts'

export interface PushConsentDeps {
  read(): boolean
  write(on: boolean): void
  permission(request: boolean): Promise<boolean>
  registration(on: boolean): Promise<void>
  channel(lang: Lang): Promise<void>
  subscribe(topic: string): Promise<void>
  unsubscribe(topic: string): Promise<void>
}

export function createPushConsent(d: PushConsentDeps): PushControl {
  let queue = Promise.resolve()
  let revision = 0
  let desired = d.read()
  const disable = async (): Promise<void> => {
    d.write(false) // Persist the choice even when token deletion must be retried on restart.
    await d.registration(false) // Native side disables auto-init before awaiting token deletion.
    // Do not enqueue topic unsubscriptions here: they can request a fresh token just to remove a topic.
  }
  const apply = async (on: boolean, lang: Lang, request: boolean, rev: number): Promise<PushToggleResult> => {
    const stale = (): boolean => rev !== revision
    try {
      if (stale()) return 'off'
      if (!on) {
        await disable()
        return 'off'
      }
      const granted = await d.permission(request)
      if (stale()) return 'off'
      if (!granted) {
        desired = false
        await disable()
        return 'denied'
      }
      await d.channel(lang)
      if (stale()) return 'off'
      await d.registration(true)
      if (stale()) return 'off'
      await d.subscribe(`daily-${lang}`)
      if (stale()) return 'off'
      await d.unsubscribe(`daily-${lang === 'ko' ? 'en' : 'ko'}`)
      if (stale()) return 'off'
      d.write(true)
      return 'on'
    } catch {
      if (!stale() && on) {
        desired = false
        await disable().catch(() => undefined)
      }
      return 'unavailable'
    } finally {
      // SDK topic work cannot be cancelled. If it finishes after off, clean up again without enabling it.
      // A newer explicit on owns its registration; stale work must not disable that newer choice.
      if (stale() && !desired) {
        const cleanup = disable().catch(() => undefined)
        // A new on must also wait for this late deletion, not just the original off request.
        queue = Promise.all([queue, cleanup]).then(() => undefined)
        await cleanup
      }
    }
  }
  const change = (on: boolean, lang: Lang, request: boolean): Promise<PushToggleResult> => {
    desired = on
    const rev = ++revision
    // Off bypasses a stalled topic request. Subsequent on waits for this deletion to finish.
    const result = on ? queue.then(() => apply(on, lang, request, rev)) : apply(on, lang, request, rev)
    queue = result.then(() => undefined, () => undefined)
    return result
  }
  return {
    enabled: d.read,
    set: (on, lang) => change(on, lang, true),
    syncLang: async (lang) => { await change(desired, lang, false) },
  }
}
