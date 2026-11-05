// Keep the app bundle's syntax target and Capacitor's startup guard in sync.
// Matches Vite 8's Chrome baseline; OS minSdk alone does not establish WebView support.
export const ANDROID_WEBVIEW_MIN_VERSION = 111
