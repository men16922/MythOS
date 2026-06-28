import { useEffect, useState } from "react";
import { useLang } from "./i18n/lang";

interface BootIntroProps {
  uiCopy?: Record<string, unknown>;
  scenarioId: string;
  onEnter: () => void;
}

// 앱 첫 진입(메인 화면) 시 1회 재생되는 부팅/시그널 오프닝.
// Streamlit connect 화면의 intro overlay + signal gate를 React로 옮긴 것.
const DEFAULTS = {
  intro_logo: "PROJECT MYTHOS",
  signal_title: "NEO-SEOUL // UNREGISTERED SIGNAL",
  // signal_body default is localized at the use site via t("boot.signalBodyDefault").
  signal_lines: ["NEO-SEOUL NODE OPEN  HANDSHAKE FAILED", "WAKE TRACE FOUND  HUMAN NOISE DETECTED"],
  boot_lines: ["[00.000] MYTHOS RUNTIME // LOCAL NODE", "[00.117] SIGNAL TYPE: UNCLASSIFIED"],
  intro_lines: [
    "MYTHOS_LOCAL_NODE :: WAKE",
    "ARK CONTROL NET HANDSHAKE ... REJECTED",
    "CITIZEN SCORE LOOKUP ... NULL",
    "UNREGISTERED SIGNAL FOUND BELOW NEO-SEOUL",
    "VISUAL CHANNEL OPENING",
  ],
  boot_marker: "BOOTSTRAP: HANDSHAKE RETRY // VISUAL CHANNEL OPENING",
  key_art: "",
};

function asList(v: unknown, fallback: string[]): string[] {
  return Array.isArray(v) && v.length > 0 ? v.map(String) : fallback;
}
function asStr(v: unknown, fallback: string): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

export function BootIntro({ uiCopy, scenarioId, onEnter }: BootIntroProps) {
  const { t } = useLang();
  const c = uiCopy ?? {};
  const logo = asStr(c.intro_logo, DEFAULTS.intro_logo);
  const introLines = asList(c.intro_lines, DEFAULTS.intro_lines);
  const dimLines = new Set(asList(c.intro_dim_lines, []));
  const bootLines = asList(c.boot_lines, DEFAULTS.boot_lines);
  const signalTitle = asStr(c.signal_title, DEFAULTS.signal_title);
  const signalBody = asStr(c.signal_body, t("boot.signalBodyDefault"));
  const signalLines = asList(c.signal_lines, DEFAULTS.signal_lines);
  const bootMarker = asStr(c.boot_marker, DEFAULTS.boot_marker);
  const keyArt = asStr(c.key_art, DEFAULTS.key_art);
  const keyArtUrl = keyArt ? `/resources/${scenarioId}/${keyArt}` : "";

  // intro_lines를 한 줄씩 타이핑하듯 노출
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    if (revealed >= introLines.length) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), 420);
    return () => clearTimeout(t);
  }, [revealed, introLines.length]);

  return (
    <div className="boot-intro" onClick={onEnter}>
      <div className="boot-grid" onClick={(e) => e.stopPropagation()}>
        {/* 좌측: 터미널 부팅 */}
        <div className="boot-terminal">
          <div className="boot-logo">{logo}</div>
          <div className="boot-typed">
            {introLines.slice(0, revealed).map((line, i) => (
              <div
                key={i}
                className={`boot-line ${dimLines.has(line) ? "dim" : ""}`}
              >
                {line}
              </div>
            ))}
            {revealed < introLines.length && <span className="boot-caret">▌</span>}
          </div>
          <div className="boot-marker">{bootMarker}</div>
          <div className="boot-bootlines">
            {bootLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>

        {/* 우측: 시그널 게이트 + 키 아트 */}
        <div className="boot-signal">
          {keyArtUrl && (
            <div className="boot-art">
              <img src={keyArtUrl} alt="key art" />
            </div>
          )}
          <div className="boot-signal-title">{signalTitle}</div>
          <div className="boot-signal-body">{signalBody}</div>
          <div className="boot-signal-lines">
            {signalLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>

      <button
        className="boot-enter-btn"
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
      >
        {t("boot.enter")}
      </button>
      <div className="boot-skip-hint">{t("boot.skipHint")}</div>
    </div>
  );
}
