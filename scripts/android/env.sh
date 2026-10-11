# shellcheck shell=bash
# Shared environment for scripts/android/*.sh (sourced, not executed). Never edits shell profiles: every
# value is set for the calling script only and can be overridden from the environment.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UI="$ROOT/src/mythos_ui"
ANDROID_DIR="$UI/android"
PACKAGE_ID="com.projectmythos.signalrun"

# Android SDK: Homebrew's android-commandlinetools root unless the caller already has one.
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
# Gradle (AGP 8.13) needs JDK 21.
if [[ -z "${JAVA_HOME:-}" ]]; then
  JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
  [[ -n "$JAVA_HOME" ]] || JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
  export JAVA_HOME
fi
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin:$PATH"

# GCP / Firebase project: the PROJECT_ID line of the repo .env (nothing else is read from it).
if [[ -z "${PROJECT_ID:-}" && -f "$ROOT/.env" ]]; then
  PROJECT_ID="$(sed -n 's/^PROJECT_ID=//p' "$ROOT/.env" | head -1 | tr -d "\"' ")"
fi

# With Application Default Credentials (no `firebase login`), some Firebase APIs (App Distribution) need an
# explicit quota project; bill quota to the game's own project.
if [[ -n "${PROJECT_ID:-}" ]]; then
  export GOOGLE_CLOUD_QUOTA_PROJECT="${GOOGLE_CLOUD_QUOTA_PROJECT:-$PROJECT_ID}"
fi

# Firebase CLI: a pinned npx copy unless FIREBASE_BIN points at an installed one.
firebase_cli() {
  if [[ -n "${FIREBASE_BIN:-}" ]]; then
    "$FIREBASE_BIN" "$@"
  else
    npx --yes firebase-tools@15.31.0 "$@"
  fi
}
