#!/usr/bin/env bash
# Headless, silent arm64 emulator for smoke tests (no window, no audio device, nothing saved on exit).
#   scripts/android/emulator.sh            # create the AVD once, boot it, wait until Android is up
#   scripts/android/emulator.sh stop       # shut down this emulator only
# It runs on its own console port (EMU_PORT, default 5580 → adb serial emulator-5580) so it never collides with
# other emulators on the machine; always address it with `adb -s emulator-5580 …`.
# Install: adb -s emulator-5580 install -r src/mythos_ui/android/app/build/outputs/apk/debug/app-debug.apk
# A local API on the host (`make api`, :8010) is http://10.0.2.2:8010 from inside the emulator.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

AVD="${AVD_NAME:-mythos-api36}"
IMAGE="${AVD_IMAGE:-system-images;android-36;google_apis;arm64-v8a}"
DEVICE="${AVD_DEVICE:-pixel_7}"
PORT="${EMU_PORT:-5580}"
SERIAL="emulator-$PORT"
LOG="${EMULATOR_LOG:-${TMPDIR:-/tmp}/mythos-emulator.log}"
ADB=(adb -s "$SERIAL")

if [[ "${1:-}" == "stop" ]]; then
  "${ADB[@]}" emu kill >/dev/null 2>&1 || true
  echo "$SERIAL stopped"
  exit 0
fi

if ! emulator -list-avds 2>/dev/null | grep -qx "$AVD"; then
  echo "Creating AVD $AVD ($DEVICE, $IMAGE)"
  echo no | avdmanager create avd -n "$AVD" -k "$IMAGE" -d "$DEVICE" >/dev/null 2>&1 || true
  emulator -list-avds 2>/dev/null | grep -qx "$AVD" || { echo "AVD creation failed" >&2; exit 1; }
fi

if adb devices | grep -q "^$SERIAL"; then
  echo "$SERIAL is already running"
else
  nohup emulator -avd "$AVD" -port "$PORT" -no-window -no-audio -no-boot-anim -no-snapshot-save -gpu swiftshader_indirect >"$LOG" 2>&1 &
  echo "booting $AVD headless as $SERIAL (log: $LOG)"
fi

"${ADB[@]}" wait-for-device
for _ in $(seq 1 180); do
  [[ "$("${ADB[@]}" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] && break
  sleep 2
done
[[ "$("${ADB[@]}" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] || { echo "emulator did not finish booting (see $LOG)" >&2; exit 1; }
"${ADB[@]}" shell settings put global window_animation_scale 0 >/dev/null 2>&1 || true
"${ADB[@]}" shell settings put global transition_animation_scale 0 >/dev/null 2>&1 || true
echo "emulator ready: $SERIAL"
