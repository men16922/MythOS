import { useState, useRef, useCallback, useEffect } from "react";
import type { CombatCinemaContext, CombatCinemaCue } from "../types";

const BGM_PREF_KEY = "mythos_bgm_enabled";

export function useAudio(
  selectedScenarioId: string,
  bgmPathFromSnapshot: string | null | undefined,
  logToConsole: (line: string) => void
) {
  const [bgmEnabled, setBgmEnabled] = useState(() => {
    try {
      // Local dev always boots silent (owner 2026-07-12 "로컬에서는 항상 BGM
      // 기본 OFF") — repeated test reloads shouldn't blast music. The in-app
      // toggle still works for the session; production keeps the stored pref.
      if (/^(localhost|127\.|0\.0\.0\.0|192\.168\.|10\.)/.test(window.location.hostname)) {
        return false;
      }
      return localStorage.getItem(BGM_PREF_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const [bgmReady, setBgmReady] = useState(false);

  const audioContextActive = useRef(false);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmSrc = useRef("");

  // bgmEnabled 의 단일 진실원. playBgm 은 stale closure(WS onmessage 핸들러 등)에서 호출돼도
  // 이 ref 를 읽어 현재 토글 상태를 따른다 — closure 캡처값(과거 bgmEnabled)이 아니라.
  const bgmEnabledRef = useRef(bgmEnabled);
  useEffect(() => {
    bgmEnabledRef.current = bgmEnabled;
  }, [bgmEnabled]);

  const playBgm = useCallback((bgmPath: string, forceEnabled = false) => {
    if (!audioContextActive.current || !bgmPath || (!forceEnabled && !bgmEnabledRef.current)) return;

    // normalize url helper
    let srcUrl = bgmPath.trim();
    if (!srcUrl.startsWith("http") && !srcUrl.startsWith("/")) {
      srcUrl = "/" + srcUrl;
    }
    if (srcUrl.includes("resources/")) {
      srcUrl = "/resources/" + srcUrl.substring(srcUrl.indexOf("resources/") + 10);
    }

    const existing = bgmAudioRef.current;
    if (currentBgmSrc.current === srcUrl && existing && !existing.paused && !existing.error) {
      return;
    }

    if (existing && (currentBgmSrc.current !== srcUrl || existing.error)) {
      try {
        existing.pause();
      } catch {
        logToConsole("기존 BGM 정지 중 오류가 발생했습니다.");
      }
      bgmAudioRef.current = null;
    }

    const audio = bgmAudioRef.current || new Audio(srcUrl);
    audio.loop = true;
    audio.volume = 0.5;
    audio.preload = "auto";
    bgmAudioRef.current = audio;
    currentBgmSrc.current = srcUrl;

    audio.addEventListener("error", () => {
      if (currentBgmSrc.current === srcUrl) {
        currentBgmSrc.current = "";
      }
      logToConsole("BGM 파일 로드 실패: " + srcUrl);
    }, { once: true });

    logToConsole("배경 음악(BGM) 로드: " + srcUrl);
    audio.play().then(() => {
      currentBgmSrc.current = srcUrl;
    }).catch(() => {
      if (currentBgmSrc.current === srcUrl) {
        currentBgmSrc.current = "";
      }
      logToConsole("BGM 재생이 차단되었습니다. 다음 상호작용에서 다시 시도합니다.");
    });
  }, [logToConsole]);

  const mainBgmPath = useCallback(() => {
    return `resources/${selectedScenarioId}/audio/bgm_main.wav`;
  }, [selectedScenarioId]);

  const preferredBgmPath = useCallback(() => {
    return bgmPathFromSnapshot || mainBgmPath();
  }, [bgmPathFromSnapshot, mainBgmPath]);

  const initAudio = useCallback(() => {
    setBgmReady(true);
    const targetBgm = preferredBgmPath();
    if (audioContextActive.current) {
      if (targetBgm) {
        playBgm(targetBgm);
      }
      return;
    }
    audioContextActive.current = true;
    logToConsole("오디오 장치가 활성화되었습니다.");
    if (targetBgm) {
      playBgm(targetBgm);
    }
  }, [preferredBgmPath, playBgm, logToConsole]);

  const pauseBgm = useCallback(() => {
    if (!bgmAudioRef.current) return;
    try {
      bgmAudioRef.current.pause();
    } catch {
      logToConsole("BGM 정지 중 오류가 발생했습니다.");
    }
  }, [logToConsole]);

  const handleToggleBgm = useCallback(() => {
    // First interaction: audio not yet unlocked by a user gesture → this click
    // unlocks it and starts the contextually-correct (snapshot) track.
    if (!audioContextActive.current) {
      setBgmEnabled(true);
      try {
        localStorage.setItem(BGM_PREF_KEY, "on");
      } catch { /* ignore */ }
      initAudio();
      logToConsole("BGM START");
      return;
    }

    if (bgmEnabled) {
      setBgmEnabled(false);
      try {
        localStorage.setItem(BGM_PREF_KEY, "off");
      } catch { /* ignore */ }
      pauseBgm();
      logToConsole("BGM OFF");
      return;
    }

    // Turn back ON by RESUMING the track that was last playing (currentBgmSrc),
    // not by re-deriving preferredBgmPath() — re-deriving would jump to whatever
    // the live snapshot points at now, which is the "toggle switched the song +
    // needed a second press" bug. Fall back to the preferred path only if nothing
    // has played yet.
    setBgmEnabled(true);
    try {
      localStorage.setItem(BGM_PREF_KEY, "on");
    } catch { /* ignore */ }
    playBgm(currentBgmSrc.current || preferredBgmPath(), true);
    logToConsole("BGM ON");
  }, [bgmEnabled, preferredBgmPath, initAudio, playBgm, pauseBgm, logToConsole]);

  // SFX element cache: a fresh `new Audio(url).play()` per shot pays fetch+decode
  // startup every time, so the sound lagged the setTimeout-scheduled visuals
  // (combat A/V desync, owner 2026-07-11). Cached base elements load once;
  // playback clones them (clones reuse the cached media data, near-instant start).
  const sfxCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const sfxBase = useCallback((srcUrl: string): HTMLAudioElement => {
    let base = sfxCacheRef.current.get(srcUrl);
    if (!base) {
      base = new Audio(srcUrl);
      base.preload = "auto";
      sfxCacheRef.current.set(srcUrl, base);
    }
    return base;
  }, []);

  // Warm the cache ahead of need (e.g. every combat SFX at combat start).
  // Creating+loading Audio needs no user gesture — only play() is gated.
  const preloadSfx = useCallback((keys: string[], scenarioId = selectedScenarioId) => {
    for (const key of keys) {
      sfxBase(`/resources/${scenarioId}/audio/sfx/${key}.wav`);
    }
  }, [selectedScenarioId, sfxBase]);

  const playSfx = useCallback((key: string, scenarioId = selectedScenarioId, volume = 0.55) => {
    if (!audioContextActive.current) return;
    const playClip = (sfxKey: string, sfxVolume: number, onError?: () => void) => {
      const srcUrl = `/resources/${scenarioId}/audio/sfx/${sfxKey}.wav`;
      const audio = sfxBase(srcUrl).cloneNode(true) as HTMLAudioElement;
      audio.volume = Math.min(1, Math.max(0, sfxVolume));
      if (onError) {
        audio.addEventListener("error", onError, { once: true });
      }
      audio.play().catch(() => {
        logToConsole("SFX 재생이 차단되었거나 파일을 찾을 수 없습니다.");
      });
    };
    playClip(key, volume, key.startsWith("skills/")
      ? () => playClip("sfx_glitch", Math.min(volume, 0.34))
      : undefined
    );
  }, [selectedScenarioId, sfxBase, logToConsole]);

  const skillSfxKey = useCallback((skillName?: string): string => {
    const normalized = (skillName || "").replace(/\s+/g, "").toLowerCase();
    if (normalized.includes("signal") || normalized.includes("신호")) return "skills/signal_step";
    if (normalized.includes("overload") || normalized.includes("과부하")) return "skills/overload_strike";
    if (normalized.includes("packet") || normalized.includes("패킷")) return "skills/packet_shot";
    if (normalized.includes("covering") || normalized.includes("엄호")) return "skills/covering_noise";
    if (normalized.includes("patch") || normalized.includes("패치")) return "skills/patch_protocol";
    return "sfx_glitch";
  }, []);

  const skillUsesGenericImpact = useCallback((skillName?: string): boolean => {
    const normalized = (skillName || "").replace(/\s+/g, "").toLowerCase();
    return normalized.includes("overload") ||
      normalized.includes("과부하") ||
      normalized.includes("packet") ||
      normalized.includes("패킷");
  }, []);

  const playCombatCinemaCue = useCallback((ctx: CombatCinemaContext, cue: CombatCinemaCue, scenarioId = selectedScenarioId) => {
    if (!audioContextActive.current) return;
    const isSkill = ctx.kind === "skill" || Boolean(ctx.skillName);
    const isDefend = ctx.kind === "defend";

    if (cue === "enter" && isSkill) {
      playSfx("sfx_glitch", scenarioId, 0.22);
      return;
    }

    if (cue === "windup") {
      if (isDefend) {
        playSfx("sfx_defend", scenarioId, 0.55);
      } else if (isSkill) {
        playSfx(skillSfxKey(ctx.skillName), scenarioId, 0.76);
      } else if (ctx.miss) {
        playSfx("sfx_move", scenarioId, 0.5);
      } else {
        playSfx("sfx_attack", scenarioId, ctx.crit ? 0.78 : 0.56);
      }
      return;
    }

    if (cue === "impact") {
      if (ctx.miss) {
        playSfx("sfx_move", scenarioId, 0.58);
      } else if (isDefend) {
        playSfx("sfx_defend", scenarioId, 0.62);
      } else if (!isSkill || skillUsesGenericImpact(ctx.skillName)) {
        playSfx("sfx_attack", scenarioId, ctx.crit ? 0.94 : 0.78);
      }
    }
  }, [selectedScenarioId, playSfx, skillSfxKey, skillUsesGenericImpact]);

  const resetAudioRefs = useCallback(() => {
    bgmAudioRef.current = null;
    currentBgmSrc.current = "";
  }, []);

  // Force BGM ON (opening entry): a new game should always start with music,
  // even if a previous session persisted "off" — the toggle still works after.
  const enableBgm = useCallback(() => {
    setBgmEnabled(true);
    try {
      localStorage.setItem(BGM_PREF_KEY, "on");
    } catch { /* ignore */ }
    initAudio();
    playBgm(currentBgmSrc.current || preferredBgmPath(), true);
    logToConsole("BGM ON (opening)");
  }, [initAudio, playBgm, preferredBgmPath, logToConsole]);

  return {
    bgmEnabled,
    bgmReady,
    initAudio,
    playBgm,
    pauseBgm,
    handleToggleBgm,
    enableBgm,
    playSfx,
    preloadSfx,
    playCombatCinemaCue,
    resetAudioRefs,
    mainBgmPath,
    preferredBgmPath
  };
}
