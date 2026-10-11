// Crash reporting for the Android app (Firebase Crashlytics via @capacitor-firebase/crashlytics).
// Native crashes are captured by the SDK itself; the game is TypeScript in a WebView, so uncaught JS errors,
// unhandled rejections and errors React catches are sent as non-fatal reports. No player data, account or token is
// attached: only the error message/stack and the app build. Opt-out lives in Settings (app build only) and is
// persisted both here and by Crashlytics (setCrashlyticsCollectionEnabled survives restarts).
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics'
import { Capacitor } from '@capacitor/core'

/** localStorage: '0' = the player turned crash reports off (default on). Mirrored in SettingsPanel.tsx. */
export const CRASH_REPORTS_KEY = 'mythos2.crashReports'
/** Settings toggle → `CustomEvent<boolean>` on window (SettingsPanel never imports this module). */
export const CRASH_REPORTS_EVENT = 'mythos:crash-reports'
/** Cap per launch so an error inside a render loop cannot flood the project. */
const MAX_REPORTS_PER_SESSION = 20

export function crashReportsEnabled(): boolean {
  try {
    return window.localStorage.getItem(CRASH_REPORTS_KEY) !== '0'
  } catch {
    return true
  }
}

let enabled = crashReportsEnabled()
let sent = 0

export async function setCrashReports(on: boolean): Promise<void> {
  enabled = on
  try {
    window.localStorage.setItem(CRASH_REPORTS_KEY, on ? '1' : '0')
  } catch {
    /* storage unavailable: Crashlytics still keeps its own flag */
  }
  try {
    await FirebaseCrashlytics.setEnabled({ enabled: on })
  } catch {
    /* Firebase not configured in this build (no google-services.json) */
  }
}

function errorText(err: unknown): { message: string; stack: string } {
  if (err instanceof Error) return { message: `${err.name}: ${err.message}`, stack: err.stack ?? '' }
  try {
    return { message: typeof err === 'string' ? err : JSON.stringify(err), stack: '' }
  } catch {
    return { message: String(err), stack: '' }
  }
}

/** Send one non-fatal JS error (no-op when opted out or over the per-launch cap). */
export function reportError(err: unknown, where: string): void {
  if (!enabled || sent >= MAX_REPORTS_PER_SESSION || !Capacitor.isNativePlatform()) return
  sent += 1
  const { message, stack } = errorText(err)
  void (async () => {
    try {
      if (stack) await FirebaseCrashlytics.log({ message: stack.slice(0, 2000) })
      await FirebaseCrashlytics.recordException({ message: `[${where}] ${message}`.slice(0, 500) })
    } catch {
      /* best effort */
    }
  })()
}

/** App start: apply the saved opt-in and hook global JS error sources. */
export async function initCrashReports(): Promise<void> {
  window.addEventListener(CRASH_REPORTS_EVENT, (e) => void setCrashReports((e as CustomEvent<unknown>).detail === true))
  await setCrashReports(crashReportsEnabled())
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window.error'))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'unhandledrejection'))
}
