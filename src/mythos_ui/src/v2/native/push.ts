// "오늘의 시드 알림" for the Android app: FCM topic notifications via @capacitor-firebase/messaging.
//
// The server never stores device tokens: Cloud Scheduler sends one message a day to the topic `daily-ko` /
// `daily-en` (contract: online/CONTRACT.md "Push"; `make push-schedule`). This module only manages the player's opt-in:
//   on  → notification permission (Android 13+), channel `daily`, subscribe `daily-<lang>`, unsubscribe the other;
//   off → unsubscribe both. Default OFF. A language change moves the subscription.
// A tap on a notification whose data has `open=daily` (cold start or background) is relayed to the shell, which opens
// the daily leaderboard on the title. A push that arrives while the game is in the foreground only raises a small
// toast (the system shows nothing then).
import { FirebaseMessaging, Importance } from '@capacitor-firebase/messaging'
import { Capacitor } from '@capacitor/core'
import type { Lang } from '../engine/types.ts'
import { emitNative, registerPush, type PushToggleResult } from '../ui/common/nativeBridge.ts'

/** localStorage: '1' = on (default off); the topic currently subscribed. */
const PUSH_KEY = 'mythos2.push'
const TOPIC_KEY = 'mythos2.push.topic'
const CHANNEL_ID = 'daily'
const LANGS: readonly Lang[] = ['ko', 'en']

const topicFor = (lang: Lang): string => `daily-${lang}`

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    /* storage unavailable */
  }
}

const enabled = (): boolean => read(PUSH_KEY) === '1'

async function ensureChannel(lang: Lang): Promise<void> {
  // Re-creating an existing channel only updates its name (Android keeps the player's own channel settings).
  await FirebaseMessaging.createChannel({
    id: CHANNEL_ID,
    name: lang === 'ko' ? '오늘의 시드' : 'Daily Signal',
    description: lang === 'ko' ? '새 오늘의 시드가 열리면 알려 준다' : 'Tells you when a new Daily Signal opens',
    importance: Importance.Default, // in the shade with sound, no heads-up banner
    vibration: false,
  })
}

async function subscribeOnly(lang: Lang): Promise<void> {
  const topic = topicFor(lang)
  await FirebaseMessaging.subscribeToTopic({ topic })
  write(TOPIC_KEY, topic)
  for (const other of LANGS) if (other !== lang) await FirebaseMessaging.unsubscribeFromTopic({ topic: topicFor(other) }).catch(() => undefined)
}

async function setPush(on: boolean, lang: Lang): Promise<PushToggleResult> {
  try {
    if (!on) {
      write(PUSH_KEY, '0')
      for (const l of LANGS) await FirebaseMessaging.unsubscribeFromTopic({ topic: topicFor(l) }).catch(() => undefined)
      write(TOPIC_KEY, null)
      return 'off'
    }
    let perm = await FirebaseMessaging.checkPermissions()
    if (perm.receive !== 'granted') perm = await FirebaseMessaging.requestPermissions()
    if (perm.receive !== 'granted') {
      write(PUSH_KEY, '0')
      return 'denied'
    }
    await ensureChannel(lang)
    await subscribeOnly(lang)
    write(PUSH_KEY, '1')
    return 'on'
  } catch (err) {
    console.warn('push toggle failed', err)
    if (on) write(PUSH_KEY, '0')
    return 'unavailable' // Firebase not configured in this build (no google-services.json) / Play services missing
  }
}

async function syncLang(lang: Lang): Promise<void> {
  if (!enabled() || read(TOPIC_KEY) === topicFor(lang)) return
  try {
    await ensureChannel(lang)
    await subscribeOnly(lang)
  } catch {
    /* retried on the next language change / launch */
  }
}

function asData(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/** App start: register the toggle and listen for taps / foreground pushes. */
export function initPush(): void {
  if (!Capacitor.isNativePlatform()) return
  registerPush({ enabled, set: setPush, syncLang })
  void FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
    if (asData(event.notification.data).open === 'daily') emitNative({ kind: 'open-daily' })
  }).catch(() => undefined)
  void FirebaseMessaging.addListener('notificationReceived', (event) => {
    const n = event.notification
    if (asData(n.data).open === 'daily') emitNative({ kind: 'daily-received', title: n.title ?? '', body: n.body ?? '' })
  }).catch(() => undefined)
}
