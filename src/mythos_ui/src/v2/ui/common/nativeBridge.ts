// Seam between the shared UI and Android-only native modules (src/v2/native/*). Imports nothing native, so the web
// bundle never pulls in Capacitor: the app entry registers implementations here at boot and the UI calls through.
import type { Lang } from '../../engine/types.ts'

export type PushToggleResult = 'on' | 'off' | 'denied' | 'unavailable'

/** "오늘의 시드 알림" (native/push.ts). */
export interface PushControl {
  /** Is the daily notification on (the player's choice, persisted)? */
  enabled(): boolean
  /** Turn it on (asks for the notification permission on Android 13+) or off. */
  set(on: boolean, lang: Lang): Promise<PushToggleResult>
  /** The game language changed: move the topic subscription to `daily-<lang>`. */
  syncLang(lang: Lang): Promise<void>
}

export type PurchaseOutcome = 'subscribed' | 'pending' | 'canceled' | 'sign-in' | 'unverified' | 'unavailable'

/** Signal+ through Google Play Billing (native/billing.ts). */
export interface BillingControl {
  /** The Signal+ offer priced by Play in the player's currency, or null (offline, product not live yet). */
  offer(): Promise<{ title: string; price: string } | null>
  /** Buy and redeem with the server. Never throws. */
  purchase(): Promise<PurchaseOutcome>
  /** Re-send owned subscriptions to the server (reinstall, a redeem that failed offline). */
  restore(): Promise<void>
}

let billing: BillingControl | null = null

export function registerBilling(control: BillingControl): void {
  billing = control
}

export function billingControl(): BillingControl | null {
  return billing
}

type NativeEvent = { kind: 'open-daily' } | { kind: 'daily-received'; title: string; body: string }

let push: PushControl | null = null
const listeners = new Set<(e: NativeEvent) => void>()
/** An event that arrived before the shell subscribed (a cold start from a notification tap). */
let early: NativeEvent | null = null

export function registerPush(control: PushControl): void {
  push = control
}

export function pushControl(): PushControl | null {
  return push
}

export function emitNative(event: NativeEvent): void {
  if (listeners.size === 0) {
    early = event
    return
  }
  for (const l of [...listeners]) l(event)
}

/** Subscribe to native events (notification taps, foreground pushes). A pending early event is delivered at once. */
export function onNative(listener: (e: NativeEvent) => void): () => void {
  listeners.add(listener)
  if (early) {
    const e = early
    early = null
    listener(e)
  }
  return () => listeners.delete(listener)
}
