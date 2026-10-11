// Native glue for the Android app (Capacitor). Runs only inside the app shell; opening dist-app/ in a desktop
// browser for debugging skips all of it. Fullscreen (immersive) and keep-screen-on live in MainActivity.java;
// sign-in (native/authNative.ts) is started by App2.mountApp2; the daily notification toggle is native/push.ts.
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { flushSaves } from '../net/api.ts'
import { musicBus } from '../ui/common/sfx.ts'
import { handleBack } from './backButton.ts'
import { initCrashReports } from './crash.ts'
import { initPush } from './push.ts'

let audioWasRunning = false

export function initNative(): void {
  if (!Capacitor.isNativePlatform()) return
  void initCrashReports()
  initPush()

  // Back: close the topmost layer / open the pause menu; at the title, background the app instead of exiting.
  void App.addListener('backButton', () => {
    if (handleBack() === 'minimize') void App.minimizeApp()
  })

  // The WebView keeps running in the background: silence the music graph and push pending saves now.
  void App.addListener('pause', () => {
    void flushSaves()
    const bus = musicBus()
    audioWasRunning = bus?.ctx.state === 'running'
    if (audioWasRunning) void bus?.ctx.suspend().catch(() => undefined)
  })
  void App.addListener('resume', () => {
    if (audioWasRunning) void musicBus()?.ctx.resume().catch(() => undefined)
    audioWasRunning = false
  })
}
