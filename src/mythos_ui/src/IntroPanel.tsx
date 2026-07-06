import React, { useState, useEffect } from "react";
import { useLang } from "./i18n/lang";

export interface CinematicShot {
  image: string;
  kicker: string;
  title: string;
  body: string;
}

export interface IntroData {
  kicker: string;
  title: string;
  body: string;
  rules?: string[];
  objective?: string;
  continue_button?: string;
  cinematic_shots?: CinematicShot[];
}

interface IntroPanelProps {
  // null = the loop's opening variant is still unknown (returning identity,
  // first snapshot not yet in) — render the signal-alignment hold screen.
  introData: IntroData | null;
  scenarioId: string;
  onAccept: () => void;
}

export const IntroPanel: React.FC<IntroPanelProps> = ({
  introData,
  scenarioId,
  onAccept,
}) => {
  const { t } = useLang();
  const [activeShotIdx, setActiveShotIdx] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const shots = introData?.cinematic_shots || [];

  const handleNextShot = () => {
    if (activeShotIdx < shots.length - 1) {
      triggerGlitch();
      setActiveShotIdx((prev) => prev + 1);
    }
  };

  const handlePrevShot = () => {
    if (activeShotIdx > 0) {
      triggerGlitch();
      setActiveShotIdx((prev) => prev - 1);
    }
  };

  const triggerGlitch = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 250);
  };

  // Play intro sfx_glitch when switching shots
  useEffect(() => {
    const glitchAudioUrl = `/resources/${scenarioId}/audio/sfx/sfx_glitch.wav`;
    const audio = new Audio(glitchAudioUrl);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignored if autoplay is blocked
    });
  }, [activeShotIdx, scenarioId]);

  const currentShot = shots[activeShotIdx];

  if (!introData) {
    return (
      <div className="intro-container">
        <div className="intro-overlay-grid">
          <div className="intro-left-panel">
            <div className="terminal-kicker">OPENING SEQUENCE</div>
            <h1 className="intro-title">{t("intro.aligningTitle")}</h1>
            <p className="intro-body-text">{t("intro.aligningBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="intro-container">
      <div className="intro-overlay-grid">
        {/* Left column: Narrative details */}
        <div className="intro-left-panel">
          <div className="terminal-kicker">{introData.kicker || "FIRST CONTACT"}</div>
          <h1 className="intro-title">{introData.title || t("intro.titleDefault")}</h1>
          <p className="intro-body-text">{introData.body}</p>

          {introData.rules && introData.rules.length > 0 && (
            <div className="intro-rules-container">
              {introData.rules.map((rule, idx) => (
                <div key={idx} className="intro-rule-tile">
                  <div className="intro-rule-index">·</div>
                  <div className="intro-rule-text">{rule}</div>
                </div>
              ))}
            </div>
          )}

          <button className="intro-accept-btn" onClick={onAccept}>
            {introData.continue_button || t("intro.acceptDefault")} ▸
          </button>
        </div>

        {/* Right column: Cinematic slider */}
        <div className="intro-right-panel">
          {currentShot && (
            <div className={`intro-cinema-box ${glitch ? "glitch-active" : ""}`}>
              <div className="intro-cinema-img-wrapper">
                <img
                  src={`/resources/${scenarioId}/${currentShot.image}`}
                  alt={currentShot.title}
                  className="intro-cinema-img"
                />
                <div className="intro-cinema-scanline"></div>
              </div>
              <div className="intro-cinema-details">
                <div className="terminal-kicker">{currentShot.kicker}</div>
                <h3 className="intro-cinema-title">{currentShot.title}</h3>
                <p className="intro-cinema-body">{currentShot.body}</p>
              </div>

              {/* Slider Controls */}
              {shots.length > 1 && (
                <div className="intro-slider-controls">
                  <button
                    className="intro-slider-btn"
                    onClick={handlePrevShot}
                    disabled={activeShotIdx === 0}
                  >
                    ◀ PREV
                  </button>
                  <div className="intro-slider-dots">
                    {shots.map((_, idx) => (
                      <span
                        key={idx}
                        className={`intro-slider-dot ${idx === activeShotIdx ? "active" : ""}`}
                        onClick={() => {
                          if (idx !== activeShotIdx) {
                            triggerGlitch();
                            setActiveShotIdx(idx);
                          }
                        }}
                      ></span>
                    ))}
                  </div>
                  <button
                    className="intro-slider-btn"
                    onClick={handleNextShot}
                    disabled={activeShotIdx === shots.length - 1}
                  >
                    NEXT ▶
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
