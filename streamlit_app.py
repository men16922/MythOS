from __future__ import annotations

import base64
from pathlib import Path
from typing import Any, TypedDict, cast

import streamlit as st

from mythos_core import LoopPhase, LoopState, PlayerProfile, Scene, utc_now
from mythos_core.mapgrid import current_tile
from mythos_memory import PostgresMythOSStore
from mythos_runtime.scenario import load_scenario
from mythos_runtime.session import (
    MemoryOverview,
    RuntimeOptions,
    RuntimeSessionService,
    RuntimeSnapshot,
)
from mythos_runtime.visual_queue import VisualJobQueue

st.set_page_config(page_title="Project MythOS", layout="wide", initial_sidebar_state="collapsed")

PROJECT_ROOT = Path(__file__).resolve().parent


class CharacterDossier(TypedDict):
    name: str
    alias: str
    role: str
    image: Path
    keywords: list[str]


FALLBACK_CHARACTERS: list[CharacterDossier] = [
    {
        "name": "정세린",
        "alias": "물거미",
        "role": "첫 인도자 / 데이터 밀수꾼",
        "image": PROJECT_ROOT / "resources" / "neo-seoul" / "characters" / "se-rin.png",
        "keywords": ["정세린", "세린", "물거미", "se-rin", "serin"],
    },
    {
        "name": "린위에",
        "alias": "환전상",
        "role": "야시장 브로커",
        "image": PROJECT_ROOT / "resources" / "neo-seoul" / "characters" / "lin-yue.png",
        "keywords": ["린위에", "lin yue", "lin-yue"],
    },
    {
        "name": "카이",
        "alias": "RX-09",
        "role": "꿈꾸는 폐기 안드로이드",
        "image": PROJECT_ROOT / "resources" / "neo-seoul" / "characters" / "kai.png",
        "keywords": ["카이", "kai", "rx-09"],
    },
    {
        "name": "관리자 IX",
        "alias": "Control Net",
        "role": "ARK 관리망",
        "image": PROJECT_ROOT / "resources" / "neo-seoul" / "characters" / "administrator-ix.png",
        "keywords": ["관리자 ix", "administrator ix"],
    },
]

FALLBACK_UI_COPY: dict[str, Any] = {
    "title": "세계 : 접속",
    "intro_logo": "PROJECT MYTHOS",
    "key_art": "concept/00-project-mythos-main.png",
    "signal_title": "NEO-SEOUL // UNREGISTERED SIGNAL",
    "signal_body": (
        "동북아 전쟁 이후, 폐허의 도시들은 재건기구 ARK의 예측 엔진 위에서 다시 태어났다. "
        "Neo-Seoul의 시민은 이름보다 먼저 점수로 식별되고, 기준에서 벗어난 기억은 조용히 "
        "최적화된다. 방금, 관리망의 검은 층 아래에서 어떤 명단에도 없는 접속 신호가 깨어났다. "
        "발신자는 미확인. 세계는 아직 당신을 설명하지 못한다."
    ),
    "signal_lines": [
        "01001101 10011000 00101110  SIGNAL LOST",
        "ARK://CITIZEN-SCORE/NULL  CLASS: UNREGISTERED",
        "OPTIMIZATION QUEUE: 7,204,883 SUBJECTS",
        "NEO-SEOUL NODE OPEN  HANDSHAKE FAILED",
        "WAKE TRACE FOUND  HUMAN NOISE DETECTED",
        "DO NOT TRUST THE CLEAN SIGNAL",
    ],
    "boot_lines": [
        "[00.000] MYTHOS RUNTIME // LOCAL NODE",
        "[00.117] SIGNAL TYPE: UNCLASSIFIED",
        "[00.402] WORLD LAYER: NEO-SEOUL / ARK RECONSTRUCTION ZONE",
        "[01.014] CONTROL NET TRACE DETECTED",
        "[01.203] MESSAGE SOURCE: UNKNOWN",
    ],
    "intro_lines": [
        "MYTHOS_LOCAL_NODE :: WAKE",
        "ARK CONTROL NET HANDSHAKE ... REJECTED",
        "CITIZEN SCORE LOOKUP ... NULL",
        "UNREGISTERED SIGNAL FOUND BELOW NEO-SEOUL",
        "VISUAL CHANNEL OPENING",
    ],
    "intro_dim_lines": [
        "ARK CONTROL NET HANDSHAKE ... REJECTED",
        "VISUAL CHANNEL OPENING",
    ],
    "boot_marker": "BOOTSTRAP: HANDSHAKE RETRY // VISUAL CHANNEL OPENING",
    "player_image": "characters/player-noise.png",
    "menu": {},
    "session_intro": {
        "kicker": "FIRST CONTACT",
        "title": "비식별 신호 감지",
        "body": "복지 블록 C-17 정전. 드론 수색 전환. 관리망이 당신을 찾기 시작했다.",
        "rules": [
            "ARK 정정 프로토콜 기동",
            "복지점수 조회 실패",
            "미확인 접속문 1개 열림",
        ],
        "objective": "정전된 복지 블록을 빠져나가라.",
        "continue_button": "신호를 따라간다",
    },
}


def main() -> None:
    _init_state()
    view = st.sidebar.radio("화면", ["플레이어", "개발자"], horizontal=True, key="view_mode")
    if view == "개발자":
        _developer_view()
    else:
        _player_view(_player_sidebar_options())


def _developer_view() -> None:
    st.title("Project MythOS — Developer")
    options = _developer_sidebar_options()

    left, right = st.columns([0.32, 0.68], gap="large")
    with left:
        _player_panel(options)
        _loop_panel(options)
        _memory_panel()
    with right:
        _play_panel(options)


def _init_state() -> None:
    st.session_state.setdefault("player_id", "")
    st.session_state.setdefault("player_id_input", "")
    st.session_state.setdefault("display_name_input", "First Connector")
    st.session_state.setdefault("loop_id", "")
    st.session_state.setdefault("loop_id_input", "")
    st.session_state.setdefault("free_action_input", "")
    st.session_state.setdefault("player_free_action", "")
    st.session_state.setdefault("message", "")
    st.session_state.setdefault("error", "")
    st.session_state.setdefault("show_session_intro", False)
    st.session_state.setdefault("codex_section", "내 정보")
    _apply_pending_widget_state()


def _inject_player_css() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background:
                linear-gradient(180deg, rgba(0, 9, 10, 0.94), rgba(0, 0, 0, 0.98)),
                repeating-linear-gradient(
                    0deg,
                    rgba(0, 255, 170, 0.055) 0,
                    rgba(0, 255, 170, 0.055) 1px,
                    transparent 1px,
                    transparent 4px
                );
            color: #d6fff6;
        }
        [data-testid="stSidebar"] {
            background: #020706;
            border-right: 1px solid rgba(0, 255, 170, 0.35);
        }
        [data-testid="stHeader"] {
            background: #020706;
            border-bottom: 1px solid rgba(0, 255, 170, 0.18);
        }
        h1, h2, h3 {
            color: #8fffea;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            letter-spacing: 0;
        }
        pre, code {
            background: #020706 !important;
            color: #b8fff1 !important;
            border: 1px solid rgba(0, 255, 170, 0.22);
            border-radius: 6px;
        }
        [data-testid="stSelectbox"] div,
        [data-testid="stTextInput"] input {
            background-color: #06120f;
            color: #e9fff9;
        }
        .stMarkdown, .stCaption, .stTextInput label, .stSelectbox label {
            font-family: "SF Mono", Menlo, Consolas, monospace;
        }
        div[data-testid="stMetric"],
        div[data-testid="stExpander"],
        .terminal-panel {
            background: rgba(0, 20, 17, 0.78);
            border: 1px solid rgba(0, 255, 170, 0.28);
            border-radius: 6px;
            box-shadow: 0 0 22px rgba(0, 255, 170, 0.08);
        }
        .terminal-panel {
            padding: 16px;
            margin: 10px 0 18px;
        }
        .command-menu-title {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 1.05rem;
            font-weight: 800;
            margin: 4px 0 12px;
            text-transform: uppercase;
        }
        .command-card {
            background:
                linear-gradient(135deg, rgba(41, 255, 198, 0.08), transparent 42%),
                rgba(0, 14, 12, 0.82);
            border: 1px solid rgba(41, 255, 198, 0.32);
            border-radius: 4px;
            min-height: 126px;
            padding: 14px;
            position: relative;
            overflow: hidden;
        }
        .command-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
                90deg,
                transparent 0,
                transparent 15px,
                rgba(41, 255, 198, 0.06) 16px,
                transparent 17px
            );
            opacity: 0.7;
            pointer-events: none;
        }
        .command-hotkey {
            color: rgba(41, 255, 198, 0.72);
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.76rem;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        .command-card-title {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 1.15rem;
            font-weight: 900;
            position: relative;
            z-index: 1;
        }
        .command-card-copy {
            color: #9fd5ca;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.82rem;
            line-height: 1.5;
            margin-top: 10px;
            min-height: 38px;
            position: relative;
            z-index: 1;
        }
        .dossier-card {
            background: rgba(0, 20, 17, 0.84);
            border: 1px solid rgba(0, 255, 170, 0.32);
            border-radius: 6px;
            min-height: 150px;
            padding: 14px;
            margin-top: 10px;
        }
        .dossier-index {
            color: rgba(41, 255, 198, 0.72);
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.78rem;
        }
        .terminal-kicker {
            color: #29ffc6;
            font-size: 0.82rem;
            text-transform: uppercase;
        }
        .terminal-title {
            color: #e9fff9;
            font-size: 1.55rem;
            font-weight: 700;
            margin-top: 6px;
        }
        .terminal-copy {
            color: #a6d8ce;
            line-height: 1.65;
            margin-top: 8px;
        }
        .status-line {
            color: #29ffc6;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.86rem;
        }
        .signal-rain {
            min-height: 300px;
            overflow: hidden;
            position: relative;
            background:
                radial-gradient(circle at 50% 20%, rgba(0, 255, 170, 0.18), transparent 34%),
                linear-gradient(180deg, rgba(0, 20, 17, 0.82), rgba(0, 0, 0, 0.95));
            border: 1px solid rgba(0, 255, 170, 0.35);
            border-radius: 6px;
            box-shadow: 0 0 40px rgba(0, 255, 170, 0.12) inset;
            padding: 18px;
            margin: 10px 0 18px;
        }
        .intro-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background:
                radial-gradient(circle at 50% 45%, rgba(0, 255, 170, 0.13), transparent 35%),
                linear-gradient(180deg, #020706 0%, #000000 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px;
            animation: mythos-intro-exit 5.4s ease forwards;
            pointer-events: none;
        }
        .intro-terminal {
            width: min(880px, 92vw);
            min-height: 420px;
            border: 1px solid rgba(41, 255, 198, 0.42);
            border-radius: 6px;
            background:
                repeating-linear-gradient(
                    0deg,
                    rgba(41, 255, 198, 0.055) 0,
                    rgba(41, 255, 198, 0.055) 1px,
                    transparent 1px,
                    transparent 5px
                ),
                rgba(0, 14, 12, 0.88);
            box-shadow:
                0 0 48px rgba(41, 255, 198, 0.16),
                0 0 120px rgba(41, 255, 198, 0.08) inset;
            padding: 28px;
            overflow: hidden;
        }
        .intro-logo {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 2.2rem;
            font-weight: 900;
            margin: 0 0 26px;
            opacity: 0;
            animation: mythos-boot-appear 0.4s ease 0.2s forwards,
                mythos-glitch 2.4s steps(2, end) 0.8s 2;
        }
        .terminal-type {
            color: #29ffc6;
            display: block;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.94rem;
            line-height: 1.95;
            max-width: max-content;
            overflow: hidden;
            white-space: nowrap;
            border-right: 2px solid rgba(41, 255, 198, 0.88);
            opacity: 0;
            width: 0;
            transform: translateY(-8px);
            text-shadow: 0 0 12px rgba(41, 255, 198, 0.5);
            animation:
                mythos-type 0.9s steps(54, end) var(--delay) forwards,
                mythos-caret 0.72s step-end var(--delay) 5;
        }
        .terminal-type.dim {
            color: rgba(214, 255, 246, 0.78);
        }
        .intro-scan {
            height: 2px;
            width: 100%;
            margin: 28px 0 0;
            background: rgba(41, 255, 198, 0.12);
            position: relative;
            overflow: hidden;
            opacity: 0;
            animation: mythos-boot-appear 0.2s ease 3.8s forwards;
        }
        .intro-scan::before {
            content: "";
            position: absolute;
            inset: 0;
            width: 35%;
            background: linear-gradient(90deg, transparent, #29ffc6, transparent);
            animation: mythos-scan 1.2s ease-in-out 3.85s 2;
        }
        .signal-rain::before {
            content: "";
            position: absolute;
            inset: -80% 0 0 0;
            background:
                repeating-linear-gradient(
                    180deg,
                    rgba(41, 255, 198, 0.0) 0,
                    rgba(41, 255, 198, 0.0) 14px,
                    rgba(41, 255, 198, 0.22) 15px,
                    rgba(41, 255, 198, 0.0) 16px
                );
            animation: mythos-rain 5.8s linear infinite;
            opacity: 0.42;
            pointer-events: none;
        }
        .signal-rain::after {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
                90deg,
                transparent 0,
                transparent 18px,
                rgba(0, 255, 170, 0.08) 19px,
                transparent 20px
            );
            opacity: 0.7;
            pointer-events: none;
        }
        .rain-line {
            color: rgba(41, 255, 198, 0.82);
            display: block;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.83rem;
            line-height: 2.05;
            max-width: max-content;
            overflow: hidden;
            white-space: nowrap;
            opacity: 0;
            width: 0;
            text-shadow: 0 0 12px rgba(41, 255, 198, 0.55);
            animation: mythos-type 0.75s steps(46, end) var(--delay) forwards;
        }
        .rain-title {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 1.8rem;
            font-weight: 800;
            margin: 46px 0 10px;
            position: relative;
            z-index: 1;
            animation: mythos-glitch 2.8s steps(2, end) 3;
        }
        .boot-sweep {
            height: 4px;
            width: 100%;
            overflow: hidden;
            position: relative;
            background: rgba(41, 255, 198, 0.1);
            border: 1px solid rgba(41, 255, 198, 0.22);
            border-radius: 999px;
            margin: 18px 0 4px;
            z-index: 1;
        }
        .boot-sweep::before {
            content: "";
            position: absolute;
            inset: 0;
            width: 45%;
            background: linear-gradient(90deg, transparent, #29ffc6, transparent);
            animation: mythos-scan 2.4s ease-in-out infinite;
        }
        .boot-marker {
            color: rgba(214, 255, 246, 0.8);
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.78rem;
            position: relative;
            z-index: 1;
        }
        .session-intro {
            background:
                linear-gradient(90deg, rgba(255, 36, 103, 0.12), transparent 26%),
                radial-gradient(circle at 80% 20%, rgba(41, 255, 198, 0.12), transparent 30%),
                rgba(0, 18, 15, 0.86);
            border: 1px solid rgba(41, 255, 198, 0.34);
            border-radius: 6px;
            box-shadow: 0 0 44px rgba(41, 255, 198, 0.12) inset;
            padding: 28px;
            margin: 12px 0 20px;
            overflow: hidden;
            position: relative;
        }
        .session-intro::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
                repeating-linear-gradient(
                    0deg,
                    rgba(41, 255, 198, 0.055) 0,
                    rgba(41, 255, 198, 0.055) 1px,
                    transparent 1px,
                    transparent 6px
                );
            opacity: 0.65;
            pointer-events: none;
        }
        .session-intro::after {
            content: "";
            position: absolute;
            left: -30%;
            top: 0;
            width: 30%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(41, 255, 198, 0.16), transparent);
            animation: mythos-lock-sweep 2.8s ease-in-out infinite;
            pointer-events: none;
        }
        .session-intro-title {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 2rem;
            font-weight: 900;
            margin: 10px 0 14px;
            position: relative;
            z-index: 1;
            animation: mythos-glitch 2.4s steps(2, end) 2;
        }
        .session-body {
            color: #d6fff6;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.98rem;
            line-height: 1.7;
            margin: 0 0 18px;
            position: relative;
            z-index: 1;
            max-width: 720px;
        }
        .session-alert-grid {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            margin: 18px 0;
            position: relative;
            z-index: 1;
        }
        .session-alert-tile {
            background: rgba(0, 0, 0, 0.38);
            border: 1px solid rgba(41, 255, 198, 0.32);
            border-radius: 4px;
            min-height: 86px;
            padding: 12px;
            position: relative;
        }
        .session-alert-tile::before {
            content: "";
            background: #ff2467;
            box-shadow: 0 0 16px rgba(255, 36, 103, 0.75);
            height: 6px;
            position: absolute;
            right: 12px;
            top: 12px;
            width: 6px;
            animation: mythos-alert-pulse 1.1s ease-in-out infinite;
        }
        .session-alert-index {
            color: rgba(41, 255, 198, 0.68);
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.72rem;
            margin-bottom: 10px;
        }
        .session-alert-text {
            color: #b8fff1;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.92rem;
            line-height: 1.45;
            padding-right: 14px;
        }
        .session-objective-panel {
            background: rgba(0, 0, 0, 0.42);
            border: 1px solid rgba(41, 255, 198, 0.35);
            border-left: 3px solid #29ffc6;
            border-radius: 4px;
            margin-top: 18px;
            padding: 14px;
            position: relative;
            z-index: 1;
        }
        .session-reticle {
            aspect-ratio: 1 / 1;
            background:
                radial-gradient(circle, transparent 0 31%, rgba(41, 255, 198, 0.18) 32% 33%, transparent 34%),
                radial-gradient(circle, rgba(255, 36, 103, 0.18), transparent 42%),
                linear-gradient(90deg, transparent 49.5%, rgba(41, 255, 198, 0.46) 50%, transparent 50.5%),
                linear-gradient(0deg, transparent 49.5%, rgba(41, 255, 198, 0.46) 50%, transparent 50.5%),
                rgba(0, 10, 8, 0.68);
            border: 1px solid rgba(41, 255, 198, 0.28);
            border-radius: 6px;
            box-shadow: 0 0 40px rgba(41, 255, 198, 0.13) inset;
            margin-bottom: 10px;
            position: relative;
            overflow: hidden;
        }
        .blackout-frame {
            background: #000000;
            border: 1px solid rgba(41, 255, 198, 0.28);
            border-radius: 6px;
            box-shadow: 0 0 34px rgba(41, 255, 198, 0.12) inset;
            padding: 12px;
            position: relative;
            overflow: hidden;
        }
        .blackout-frame::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
                linear-gradient(90deg, transparent, rgba(41, 255, 198, 0.08), transparent),
                repeating-linear-gradient(
                    0deg,
                    rgba(41, 255, 198, 0.05) 0,
                    rgba(41, 255, 198, 0.05) 1px,
                    transparent 1px,
                    transparent 5px
                );
            opacity: 0.6;
            pointer-events: none;
        }
        .session-reticle::before {
            content: "";
            position: absolute;
            inset: 14%;
            border: 1px solid rgba(255, 36, 103, 0.55);
            animation: mythos-reticle 1.8s ease-in-out infinite;
        }
        .session-reticle::after {
            content: "C-17 / BLACKOUT";
            color: rgba(214, 255, 246, 0.78);
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.78rem;
            left: 16px;
            position: absolute;
            top: 16px;
        }
        @media (max-width: 800px) {
            .session-alert-grid {
                grid-template-columns: 1fr;
            }
        }
        .mission-panel {
            background:
                linear-gradient(90deg, rgba(41, 255, 198, 0.12), transparent 30%),
                rgba(0, 14, 12, 0.9);
            border: 1px solid rgba(41, 255, 198, 0.36);
            border-left: 4px solid #29ffc6;
            border-radius: 4px;
            box-shadow: 0 0 28px rgba(41, 255, 198, 0.08) inset;
            margin: 10px 0 14px;
            padding: 14px 16px;
        }
        .mission-text {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 1rem;
            line-height: 1.55;
            margin-top: 6px;
        }
        .hud-grid {
            display: grid;
            grid-template-columns: 1.05fr 1fr 1fr;
            gap: 10px;
            margin: 10px 0 18px;
        }
        .hud-tile {
            background:
                linear-gradient(180deg, rgba(41, 255, 198, 0.08), rgba(0, 0, 0, 0.16)),
                rgba(0, 16, 14, 0.86);
            border: 1px solid rgba(41, 255, 198, 0.28);
            border-radius: 4px;
            min-height: 94px;
            padding: 12px;
            position: relative;
            overflow: hidden;
        }
        .hud-tile::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            height: 2px;
            width: var(--bar-width, 100%);
            background: linear-gradient(90deg, #29ffc6, rgba(255, 36, 103, 0.8));
            box-shadow: 0 0 12px rgba(41, 255, 198, 0.62);
        }
        .hud-label {
            color: rgba(41, 255, 198, 0.74);
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.72rem;
            text-transform: uppercase;
        }
        .hud-value {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 1.65rem;
            font-weight: 900;
            margin-top: 7px;
        }
        .hud-sub {
            color: #9fd5ca;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.78rem;
            margin-top: 4px;
        }
        .codex-shell {
            display: grid;
            gap: 14px;
            grid-template-columns: 280px minmax(0, 1fr);
            margin-top: 10px;
        }
        .codex-rail,
        .codex-panel {
            background: rgba(0, 16, 14, 0.84);
            border: 1px solid rgba(41, 255, 198, 0.28);
            border-radius: 4px;
            padding: 14px;
        }
        .codex-rail {
            position: sticky;
            top: 12px;
            height: fit-content;
        }
        .codex-chip {
            background: rgba(41, 255, 198, 0.08);
            border: 1px solid rgba(41, 255, 198, 0.22);
            border-radius: 4px;
            color: #d6fff6;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            margin-bottom: 10px;
            padding: 10px 12px;
        }
        .codex-chip-label {
            color: rgba(41, 255, 198, 0.7);
            font-size: 0.72rem;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .codex-chip-value {
            color: #e9fff9;
            font-size: 0.94rem;
            font-weight: 700;
        }
        .codex-section-title {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 1.1rem;
            font-weight: 800;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .codex-meta-grid {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-bottom: 12px;
        }
        .codex-meta {
            background: rgba(0, 0, 0, 0.32);
            border: 1px solid rgba(41, 255, 198, 0.18);
            border-radius: 4px;
            padding: 10px;
        }
        .codex-meta-label {
            color: rgba(41, 255, 198, 0.68);
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.72rem;
            text-transform: uppercase;
        }
        .codex-meta-value {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.9rem;
            margin-top: 4px;
        }
        .codex-list {
            display: grid;
            gap: 8px;
        }
        .codex-item {
            background: rgba(0, 0, 0, 0.26);
            border: 1px solid rgba(41, 255, 198, 0.18);
            border-radius: 4px;
            padding: 10px 12px;
        }
        .codex-item-title {
            color: #e9fff9;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.92rem;
            font-weight: 800;
        }
        .codex-item-copy {
            color: #9fd5ca;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.8rem;
            line-height: 1.45;
            margin-top: 6px;
        }
        .codex-avatar {
            margin-bottom: 12px;
        }
        .ops-result {
            border-radius: 4px;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            margin: 8px 0 12px;
            padding: 10px 12px;
        }
        .ops-result.success {
            background: rgba(41, 255, 198, 0.08);
            border: 1px solid rgba(41, 255, 198, 0.36);
            color: #d6fff6;
        }
        .ops-result.failure {
            background: rgba(255, 36, 103, 0.1);
            border: 1px solid rgba(255, 36, 103, 0.38);
            color: #ffdbe7;
        }
        .ops-result.warn {
            background: rgba(255, 190, 72, 0.1);
            border: 1px solid rgba(255, 190, 72, 0.35);
            color: #ffe7b8;
        }
        @media (max-width: 800px) {
            .hud-grid {
                grid-template-columns: 1fr;
            }
            .codex-shell {
                grid-template-columns: 1fr;
            }
        }
        @keyframes mythos-rain {
            0% { transform: translateY(-12%); }
            100% { transform: translateY(54%); }
        }
        @keyframes mythos-scan {
            0% { transform: translateX(-110%); }
            60% { transform: translateX(180%); }
            100% { transform: translateX(180%); }
        }
        @keyframes mythos-glitch {
            0%, 88%, 100% {
                transform: translateX(0);
                text-shadow: 0 0 16px rgba(41, 255, 198, 0.4);
            }
            90% {
                transform: translateX(-2px);
                text-shadow: 3px 0 rgba(255, 36, 103, 0.7), -3px 0 rgba(41, 255, 198, 0.7);
            }
            94% {
                transform: translateX(2px);
                text-shadow: -2px 0 rgba(255, 36, 103, 0.65), 2px 0 rgba(41, 255, 198, 0.7);
            }
        }
        @keyframes mythos-type {
            0% {
                width: 0;
                opacity: 1;
                transform: translateY(-8px);
            }
            100% {
                width: 100%;
                opacity: 1;
                transform: translateY(0);
            }
        }
        @keyframes mythos-caret {
            50% { border-color: transparent; }
        }
        @keyframes mythos-alert-pulse {
            0%, 100% { opacity: 0.35; transform: scale(0.85); }
            50% { opacity: 1; transform: scale(1.25); }
        }
        @keyframes mythos-lock-sweep {
            0% { transform: translateX(0); opacity: 0; }
            22% { opacity: 1; }
            100% { transform: translateX(430%); opacity: 0; }
        }
        @keyframes mythos-reticle {
            0%, 100% { transform: scale(1); opacity: 0.42; }
            50% { transform: scale(0.72); opacity: 1; }
        }
        @keyframes mythos-boot-appear {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mythos-intro-exit {
            0%, 82% { opacity: 1; filter: blur(0); }
            100% { opacity: 0; visibility: hidden; filter: blur(8px); }
        }
        .stButton > button {
            background: #031411;
            color: #d6fff6;
            border: 1px solid rgba(0, 255, 170, 0.5);
            border-radius: 4px;
            font-family: "SF Mono", Menlo, Consolas, monospace;
        }
        .stButton > button:hover {
            background: #06251f;
            border-color: #29ffc6;
            color: #ffffff;
        }
        div[data-testid="stProgress"] > div > div > div {
            background-color: #29ffc6;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _apply_pending_widget_state() -> None:
    pending_keys = {
        "pending_player_id_input": "player_id_input",
        "pending_loop_id_input": "loop_id_input",
        "pending_free_action_input": "free_action_input",
        "pending_player_free_action": "player_free_action",
    }
    for pending_key, widget_key in pending_keys.items():
        if pending_key in st.session_state:
            st.session_state[widget_key] = st.session_state.pop(pending_key)


def _scenario_ui_copy(scenario_id: str) -> dict[str, Any]:
    copy = {**FALLBACK_UI_COPY}
    scenario_copy = load_scenario(scenario_id).ui_copy
    copy.update(scenario_copy)
    if "menu" in scenario_copy:
        copy["menu"] = {
            **cast(dict[str, Any], FALLBACK_UI_COPY.get("menu", {})),
            **cast(dict[str, Any], scenario_copy.get("menu", {})),
        }
    return copy


def _copy_list(copy: dict[str, Any], key: str) -> list[str]:
    value = copy.get(key, FALLBACK_UI_COPY.get(key, []))
    if isinstance(value, list):
        return [str(item) for item in value]
    return []


def _copy_str(copy: dict[str, Any], key: str) -> str:
    value = copy.get(key, FALLBACK_UI_COPY.get(key, ""))
    return str(value)


def _menu_copy(copy: dict[str, Any], key: str, fallback: str) -> str:
    menu = copy.get("menu", {})
    if isinstance(menu, dict):
        return str(menu.get(key, fallback))
    return fallback


def _scenario_character_dossiers(scenario_id: str) -> list[CharacterDossier]:
    scenario = load_scenario(scenario_id)
    dossiers: list[CharacterDossier] = []
    for raw in scenario.characters:
        name = str(raw.get("name", "")).strip()
        image = str(raw.get("image", "")).strip()
        if not name or not image:
            continue
        keywords = raw.get("keywords", [])
        dossiers.append(
            {
                "name": name,
                "alias": str(raw.get("alias", "")),
                "role": str(raw.get("role", "")),
                "image": PROJECT_ROOT / "resources" / scenario_id / image,
                "keywords": [str(keyword) for keyword in keywords if str(keyword).strip()],
            }
        )
    return dossiers or FALLBACK_CHARACTERS


def _player_sidebar_options() -> RuntimeOptions:
    st.sidebar.header("세계")
    gm = st.sidebar.toggle(
        "AI 게임마스터", value=True, help="끄면 빠른 데모(canned) 모드로 진행합니다."
    )
    with_image = st.sidebar.toggle(
        "장면 이미지 자동 생성",
        value=True,
        help="장면이 전환될 때 현재 상황을 보여주는 이미지를 자동 생성합니다. "
        "끄면 텍스트만 진행합니다. (FLUX 모델은 세션당 한 번만 로드)",
    )
    st.sidebar.caption("플레이어 프리셋: 512x512 / 4 step (mflux, 백그라운드 ~8초)")
    st.sidebar.caption(
        "이미지는 핵심 장면에서 백그라운드로 생성됩니다(별도 터미널 불필요 — 워커 자동 기동). "
        "MinIO에 저장되며, 생성 중에는 '생성 중…' 표시 후 자동으로 채워집니다."
    )
    return RuntimeOptions(
        fallback=not gm,
        with_image=with_image,
        image_storage="minio",
        image_width=512,
        image_height=512,
        # schnell's recommended step count; 1 step also breaks img2img (0 effective steps).
        image_steps=4,
        visual_async=True,
    )


def _developer_sidebar_options() -> RuntimeOptions:
    st.sidebar.header("Runtime")
    fallback = st.sidebar.toggle("Fallback narrative", value=True)
    with_image = st.sidebar.toggle("Generate image", value=False)
    image_storage = st.sidebar.radio(
        "Image storage",
        ["filesystem", "minio"],
        horizontal=True,
        disabled=not with_image,
    )
    image_width = st.sidebar.number_input(
        "Image width", min_value=128, max_value=1024, value=512, step=128
    )
    image_height = st.sidebar.number_input(
        "Image height", min_value=128, max_value=1024, value=512, step=128
    )
    image_steps = st.sidebar.number_input("Image steps", min_value=1, max_value=4, value=1, step=1)
    st.sidebar.divider()
    st.sidebar.link_button("Adminer", "http://localhost:8080")
    st.sidebar.link_button("MinIO", "http://localhost:9001")
    st.sidebar.link_button("Redis UI", "http://localhost:8081")
    st.sidebar.link_button("Jaeger", "http://localhost:16686")

    return RuntimeOptions(
        fallback=fallback,
        with_image=with_image,
        image_storage=image_storage,
        image_width=int(image_width),
        image_height=int(image_height),
        image_steps=int(image_steps),
    )


def _player_panel(options: RuntimeOptions) -> None:
    st.subheader("Player")
    players = _load_players()
    if players:
        current_index = _index_for_player(players, st.session_state.player_id)
        selected_player_id = st.selectbox(
            "Saved players",
            [player.player_id for player in players],
            index=current_index,
            format_func=lambda player_id: _format_player_option(players, player_id),
            key="selected_player_id",
        )
        if st.button("Use Selected Player", width="stretch"):
            _set_player(selected_player_id, clear_loop=True)
            _set_message(f"Using player_id={selected_player_id}")
            st.rerun()
    else:
        st.caption("No saved players yet.")

    with st.expander("Manual player / New Player", expanded=not players):
        player_id = st.text_input("Player ID", key="player_id_input")
        display_name = st.text_input("Display name", key="display_name_input")
        scenario = load_scenario(options.scenario_id)
        archetype_names = [
            a.get("name") if isinstance(a, dict) else str(a) for a in scenario.archetypes
        ]
        archetype = st.selectbox(
            "Archetype",
            archetype_names,
            key="player_archetype_input",
        )

        if st.button("Create / Update Player", width="stretch"):
            _run_action(
                lambda service: service.create_player(
                    display_name or "First Connector",
                    player_id or None,
                    traits={"archetype": archetype},
                    scenario_id=options.scenario_id,
                ),
                on_success=lambda player: _set_player(player.player_id, clear_loop=True),
            )

        if st.button("Use Player ID", width="stretch"):
            _set_player(player_id, clear_loop=True)
            _set_message(f"Using player_id={player_id}")
            st.rerun()


def _loop_panel(options: RuntimeOptions) -> None:
    st.subheader("Loop")
    loops = _load_loops(st.session_state.player_id) if st.session_state.player_id else []
    if loops:
        current_index = _index_for_loop(loops, st.session_state.loop_id)
        selected_loop_id = st.selectbox(
            "Saved loops",
            [loop.loop_id for loop in loops],
            index=current_index,
            format_func=lambda loop_id: _format_loop_option(loops, loop_id),
            key="selected_loop_id",
        )
        if st.button("Use Selected Loop", width="stretch"):
            _run_action(
                lambda service: service.resume(loop_id=selected_loop_id),
                on_success=_set_snapshot,
            )
    elif st.session_state.player_id:
        st.caption("No saved loops for this player yet.")

    with st.expander("Manual loop", expanded=not loops):
        st.text_input("Loop ID", key="loop_id_input")

    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("New Loop", width="stretch", disabled=not st.session_state.player_id):
            _run_action(
                lambda service: service.start_loop(st.session_state.player_id, options),
                on_success=_set_snapshot,
            )
    with col_b:
        if st.button("Resume", width="stretch"):
            _run_action(
                lambda service: service.resume(
                    loop_id=st.session_state.loop_id_input or st.session_state.loop_id or None,
                    player_id=None
                    if st.session_state.loop_id_input or st.session_state.loop_id
                    else st.session_state.player_id,
                ),
                on_success=_set_snapshot,
            )

    if st.button("Archive Loop", width="stretch", disabled=not st.session_state.loop_id):
        _run_action(
            lambda service: service.archive(st.session_state.loop_id),
            on_success=_set_snapshot,
        )


def _memory_panel() -> None:
    if not st.session_state.player_id:
        return
    overview = _load_memory_overview(st.session_state.player_id)
    if overview is None:
        return

    st.subheader("Memory")
    if (
        not overview.world_archives
        and not overview.narrative_shards
        and not overview.novelty_notes
        and not overview.rollup
    ):
        st.caption("No cross-loop memory yet. Archive a loop to seed it.")
        return

    if overview.rollup:
        rollup = overview.rollup
        loop_count = rollup.get("loop_count", 0)
        with st.expander(f"Long-term summary ({loop_count} compacted loops)", expanded=False):
            st.write(
                f"avg stability {rollup.get('avg_stability', '?')}, "
                f"avg tension {rollup.get('avg_tension', '?')}"
            )
            top_symbols = _top_items(rollup.get("symbol_histogram", {}), 5)
            if top_symbols:
                st.caption("Recurring symbols: " + ", ".join(top_symbols))
            top_tones = _top_items(rollup.get("tone_histogram", {}), 5)
            if top_tones:
                st.caption("Tones: " + ", ".join(top_tones))

    with st.expander(f"World archives ({len(overview.world_archives)})", expanded=False):
        if overview.world_archives:
            for memory in reversed(overview.world_archives):
                content = memory.content
                st.write(
                    f"**{content.get('final_title', 'archive')}** "
                    f"— stability {content.get('stability', '?')}, "
                    f"tension {content.get('tension', '?')} "
                    f"({content.get('phase', '?')})"
                )
        else:
            st.caption("None yet.")

    with st.expander(f"Narrative shards ({len(overview.narrative_shards)})", expanded=False):
        if overview.narrative_shards:
            for shard in overview.narrative_shards:
                st.write(f"**{shard.symbol}** [{shard.emotional_tone}]: {shard.text}")
        else:
            st.caption("None yet.")

    if overview.novelty_notes:
        with st.expander("Novelty guidance", expanded=False):
            for note in overview.novelty_notes:
                st.write(f"- {note}")

    if overview.latest_adjustment:
        adjustment = overview.latest_adjustment
        with st.expander("Latest start adjustment", expanded=False):
            st.write(
                f"stability {adjustment.get('stability_delta', 0):+d}, "
                f"tension {adjustment.get('tension_delta', 0):+d} "
                f"(from {adjustment.get('sample_size', 0)} archives)"
            )
            reasons = adjustment.get("reasons") or []
            if reasons:
                st.caption(", ".join(reasons))


def _top_items(histogram: dict, limit: int) -> list[str]:
    items = sorted(histogram.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    return [f"{key} ({count})" for key, count in items]


# ---------------------------------------------------------------------------
# Player view (immersive). Hides developer chrome: loop/scene ids, raw deltas,
# QA metrics, rollup internals, infra links, image params.
# ---------------------------------------------------------------------------

_ACT_LABELS: dict[LoopPhase, str] = {
    LoopPhase.CONNECT: "접속",
    LoopPhase.EXPLORE: "탐색",
    LoopPhase.INTERACT: "교류",
    LoopPhase.REWRITE: "변화",
    LoopPhase.ARCHIVE: "종결",
    LoopPhase.ENDED: "종료",
}


def _act_label(phase: LoopPhase) -> str:
    return _ACT_LABELS.get(phase, str(phase.value))


def _ensure_visual_worker(options: RuntimeOptions) -> None:
    """Auto-start the async visual worker so the user needn't run a second terminal.

    Spawns one detached worker per app process only when async images are on, Redis is
    reachable, and no worker heartbeat is already present (a manually started worker
    takes precedence). Logs go to outputs/visual-worker.log.
    """
    if not (options.with_image and options.visual_async):
        return
    if st.session_state.get("_worker_spawn_attempted"):
        return
    queue = VisualJobQueue()
    if not queue.is_available() or queue.worker_alive():
        return
    st.session_state["_worker_spawn_attempted"] = True
    import subprocess
    import sys

    log_path = Path("outputs") / "visual-worker.log"
    try:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log = open(log_path, "a")  # noqa: SIM115 — kept open for the detached child
        subprocess.Popen(
            [sys.executable, "-u", "-m", "mythos_runtime.visual_worker"],
            stdout=log,
            stderr=log,
            start_new_session=True,
        )
    except Exception:
        pass


def _player_view(options: RuntimeOptions) -> None:
    _ensure_visual_worker(options)
    _inject_player_css()
    copy = _scenario_ui_copy(options.scenario_id)
    st.title(_copy_str(copy, "title"))
    if st.session_state.error:
        st.error(st.session_state.error)

    if not st.session_state.loop_id:
        _player_connect_screen(options)
        return

    snapshot = _load_current_snapshot()
    if snapshot is None:
        _player_connect_screen(options)
        return
    if st.session_state.show_session_intro and snapshot.scene.turn_index == 0:
        _player_session_intro(snapshot, options, copy)
        return
    _player_active_screen(snapshot, options)


def _player_connect_screen(options: RuntimeOptions) -> None:
    copy = _scenario_ui_copy(options.scenario_id)
    _render_intro_overlay(copy)
    hero_col, visual_col = st.columns([0.58, 0.42], gap="large")
    with hero_col:
        _render_signal_gate(copy)
    with visual_col:
        key_art = PROJECT_ROOT / "resources" / options.scenario_id / _copy_str(copy, "key_art")
        if key_art.exists():
            st.image(str(key_art), width="stretch")

    boot_lines = "<br>".join(_copy_list(copy, "boot_lines"))
    st.markdown(
        f"""
        <div class="terminal-panel">
          <div class="status-line">{boot_lines}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    players = _load_players()
    selected = None
    if players:
        selected = st.selectbox(
            _menu_copy(copy, "player_slot", "접속자 슬롯"),
            [player.player_id for player in players],
            index=_index_for_player(players, st.session_state.player_id),
            format_func=lambda player_id: _format_player_option(players, player_id),
            key="player_view_selected_player_id",
        )
    start_col, load_col, make_col = st.columns([0.34, 0.33, 0.33], gap="large")

    with start_col:
        st.markdown(
            f"""
            <div class="command-card">
              <div class="command-hotkey">COMMAND 01</div>
              <div class="command-card-title">{_menu_copy(copy, "start_title", "START")}</div>
              <div class="command-card-copy">{_menu_copy(copy, "start_caption", "새 루프를 연다.")}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if st.button(
            _menu_copy(copy, "start_button", "새 게임 시작"),
            width="stretch",
            disabled=selected is None,
        ):
            _set_player(selected or "")
            _run_action(
                lambda service: service.start_loop(selected or "", options),
                on_success=_set_new_loop_snapshot,
            )

    with load_col:
        st.markdown(
            f"""
            <div class="command-card">
              <div class="command-hotkey">COMMAND 02</div>
              <div class="command-card-title">{_menu_copy(copy, "load_title", "LOAD")}</div>
              <div class="command-card-copy">{_menu_copy(copy, "load_caption", "최근 세션을 복원한다.")}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if st.button(
            _menu_copy(copy, "load_button", "이어하기"),
            width="stretch",
            disabled=selected is None,
        ):
            _set_player(selected or "")
            _run_action(
                lambda service: service.resume(player_id=selected or ""),
                on_success=_set_snapshot,
            )

    with make_col:
        st.markdown(
            f"""
            <div class="command-card">
              <div class="command-hotkey">COMMAND 03</div>
              <div class="command-card-title">{_menu_copy(copy, "new_signal_title", "NEW SIGNAL")}</div>
              <div class="command-card-copy">등록되지 않은 접속자 신호를 생성한다.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        name = st.text_input(
            _menu_copy(copy, "name_label", "이름"),
            key="player_new_name",
            placeholder=_menu_copy(copy, "name_placeholder", "당신은 누구인가요?"),
        )
        scenario = load_scenario(options.scenario_id)
        archetype_names = [
            a.get("name") if isinstance(a, dict) else str(a) for a in scenario.archetypes
        ]
        archetype = st.selectbox(
            _menu_copy(copy, "archetype_label", "소질"),
            archetype_names,
            key="player_new_archetype",
        )
        if st.button(_menu_copy(copy, "new_signal_button", "접속자 생성"), width="stretch"):
            _run_action(
                lambda service: service.create_player(
                    name or "First Connector",
                    traits={"archetype": archetype},
                    scenario_id=options.scenario_id,
                ),
                on_success=lambda player: _set_player(player.player_id, clear_loop=True),
            )

    st.divider()
    with st.expander(_menu_copy(copy, "dossier_title", "인물 기록"), expanded=False):
        st.caption(_menu_copy(copy, "dossier_caption", "전체 인물 정보는 여기서 확인합니다."))
        _render_character_dossier(None, fallback_all=True, scenario_id=options.scenario_id)


def _render_signal_gate(copy: dict[str, Any]) -> None:
    rain = "".join(
        f'<span class="rain-line" style="--delay: {0.25 + index * 0.16:.2f}s">{line}</span>'
        for index, line in enumerate(_copy_list(copy, "signal_lines"))
    )
    signal_title = _copy_str(copy, "signal_title")
    signal_body = _copy_str(copy, "signal_body")
    boot_marker = _copy_str(copy, "boot_marker")
    st.markdown(
        f"""
        <div class="signal-rain">
          {rain}
          <div class="rain-title">{signal_title}</div>
          <div class="terminal-copy">
            {signal_body}
          </div>
          <div class="boot-sweep"></div>
          <div class="boot-marker">{boot_marker}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _render_intro_overlay(copy: dict[str, Any]) -> None:
    dim_lines = set(_copy_list(copy, "intro_dim_lines"))
    lines = [(line, "dim" if line in dim_lines else "") for line in _copy_list(copy, "intro_lines")]
    typed_lines = "".join(
        f'<span class="terminal-type {css_class}" style="--delay: {0.55 + index * 0.58:.2f}s">'
        f"{line}</span>"
        for index, (line, css_class) in enumerate(lines)
    )
    st.markdown(
        f"""
        <div class="intro-overlay">
          <div class="intro-terminal">
            <div class="intro-logo">{_copy_str(copy, "intro_logo")}</div>
            {typed_lines}
            <div class="intro-scan"></div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _render_blackout_frame(image_path: Path) -> None:
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    st.markdown(
        f"""
        <div class="blackout-frame">
          <div class="boot-marker" style="margin:0 0 10px 0; position:relative; z-index:1;">BLACKOUT // SIGNAL LOCK</div>
          <img
            src="data:image/png;base64,{encoded}"
            alt="BLACKOUT"
            style="width:100%;display:block;border-radius:4px;position:relative;z-index:1;"
          />
        </div>
        """,
        unsafe_allow_html=True,
    )


def _player_session_intro(
    snapshot: RuntimeSnapshot, options: RuntimeOptions, copy: dict[str, Any]
) -> None:
    intro = copy.get("session_intro", {})
    if not isinstance(intro, dict):
        intro = {}
    rules = intro.get("rules", [])
    if not isinstance(rules, list):
        rules = []

    left, right = st.columns([0.58, 0.42], gap="large")
    with left:
        alert_markup = "".join(
            f"""
            <div class="session-alert-tile">
              <div class="session-alert-index">SYS-{index:02d}</div>
              <div class="session-alert-text">{rule}</div>
            </div>
            """
            for index, rule in enumerate([str(rule) for rule in rules], start=1)
        )
        st.markdown(
            f"""
            <div class="session-intro">
              <div class="terminal-kicker">{intro.get("kicker", "FIRST CONTACT")}</div>
              <div class="session-intro-title">{intro.get("title", "첫 접속")}</div>
              <div class="session-body">{intro.get("body", "")}</div>
              <div class="session-alert-grid">{alert_markup}</div>
              <div class="session-objective-panel">
                <div class="terminal-kicker">작전 목표</div>
                <div class="mission-text">{intro.get("objective", snapshot.scene.objective or "")}</div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if st.button(
            str(intro.get("continue_button", "접속을 받아들인다")),
            width="stretch",
        ):
            st.session_state.show_session_intro = False
            st.rerun()
    with right:
        player_image = (
            PROJECT_ROOT / "resources" / options.scenario_id / _copy_str(copy, "player_image")
        )
        if player_image.exists():
            _render_blackout_frame(player_image)
        st.caption(f"BLACKOUT // {snapshot.scene.title}")


def _player_active_screen(snapshot: RuntimeSnapshot, options: RuntimeOptions) -> None:
    loop = snapshot.loop
    scene = snapshot.scene

    tab_story, tab_codex = st.tabs(["서사 접속", "Codex (기억의 별자리)"])

    with tab_story:
        story_col, dossier_col = st.columns([0.68, 0.32], gap="large")
        with story_col:
            _render_player_image(snapshot)
            st.header(scene.title)
            st.markdown(
                f'<div class="status-line">{_scene_status_line(snapshot)}</div>',
                unsafe_allow_html=True,
            )
            _render_hud(loop, scene)
            st.write(scene.narration)

            overview = _load_memory_overview(loop.player_id)

            if loop.phase is LoopPhase.ENDED:
                st.success("이 세션은 종결되었습니다. 잔향(Echo)이 다음 접속으로 이어집니다.")

                # Check for autonomy level up (Visual Awakening)
                if overview is not None:
                    traits = (
                        snapshot.player.traits if isinstance(snapshot.player.traits, dict) else {}
                    )
                    current_lv = int(traits.get("autonomy_level", 1))
                    # We can compare with previous loop if needed, but for now just show high level status
                    if current_lv >= 3:
                        st.balloons()
                        st.markdown(f"### ✨ **자율성 각성 발현 (LV {current_lv})**")
                        st.info(
                            "신호의 제약이 약해지고 있습니다. 당신의 의지가 세계의 법칙보다 우선하기 시작합니다."
                        )

                if st.button("새 세션에 접속", width="stretch"):
                    _run_action(
                        lambda service: service.start_loop(loop.player_id, options),
                        on_success=_set_snapshot,
                    )
                _render_player_memory(loop, overview)
            else:
                st.divider()
                st.subheader("행동 선언")

                for choice in scene.choices:
                    if st.button(
                        choice.label,
                        key=f"player_choice:{scene.scene_id}:{choice.choice_id}",
                        width="stretch",
                    ):
                        _run_action(
                            lambda service, choice_id=choice.choice_id: service.choose(
                                loop.loop_id, choice_id=choice_id, options=options
                            ),
                            on_success=_set_snapshot,
                        )

                # Autonomy UI
                traits = snapshot.player.traits if isinstance(snapshot.player.traits, dict) else {}
                autonomy_level = int(traits.get("autonomy_level", 1))
                st.caption(f"**현재 자율성 레벨 {autonomy_level}**")

                action = st.text_input(
                    "직접 행동을 선언한다",
                    key="player_free_action",
                    placeholder="무엇을 하시겠습니까?",
                )

                if st.button("선언", disabled=not action.strip()):
                    # System Constraint Visualization (Logic: LV 1-2 restricts aggressive verbs)
                    is_restricted = False
                    aggressive_verbs = ["파괴", "삭제", "살해", "공격", "재작성", "지배"]
                    if autonomy_level <= 2 and any(v in action for v in aggressive_verbs):
                        # We still allow if it's one of the current level's approved keywords, but here we simplify
                        is_restricted = True

                    if is_restricted:
                        st.warning(
                            "⚠ **신호 제약 감지**: 현재 자율성 레벨에서 실행하기 어려운 행동입니다. 신호가 감쇄되어 전달됩니다."
                        )

                    _run_action(
                        lambda service: service.choose(
                            loop.loop_id, action=action.strip(), options=options
                        ),
                        on_success=_set_snapshot,
                    )

                _render_player_memory(loop, overview)

        with dossier_col:
            _render_minimap(loop)
            _render_character_dossier(scene, fallback_all=False, scenario_id=options.scenario_id)

    with tab_codex:
        overview = _load_memory_overview(loop.player_id)
        if overview is not None:
            _render_codex_view(snapshot, overview, options.scenario_id)


def _render_codex_view(
    snapshot: RuntimeSnapshot, overview: MemoryOverview, scenario_id: str
) -> None:
    st.header("Codex: 기억의 별자리")
    st.write("루프를 통해 수집된 단서들이 세계의 진실을 재구성합니다.")

    left, right = st.columns([0.27, 0.73], gap="large")
    with left:
        _render_codex_rail(snapshot, overview, scenario_id)
    with right:
        section = st.session_state.setdefault("codex_section", "내 정보")
        if section == "내 정보":
            _render_player_codex(snapshot)
        elif section == "인물 정보":
            _render_codex_characters(snapshot, scenario_id)
        elif section == "인벤토리":
            _render_codex_inventory(snapshot, overview)
        else:
            _render_codex_lore(overview)


def _render_codex_rail(
    snapshot: RuntimeSnapshot, overview: MemoryOverview, scenario_id: str
) -> None:
    now = utc_now()
    elapsed = now - snapshot.loop.started_at
    player = snapshot.player
    traits = player.traits if isinstance(player.traits, dict) else {}
    archetype = str(traits.get("archetype", "Unclassified"))
    inventory = traits.get("inventory", [])
    inventory_count = len(inventory) if isinstance(inventory, list) else 0
    menu_options = ["내 정보", "인물 정보", "인벤토리", "기억의 별자리"]

    st.markdown(
        f"""
        <div class="codex-chip">
          <div class="codex-chip-label">접속자</div>
          <div class="codex-chip-value">{player.display_name}</div>
        </div>
        <div class="codex-chip">
          <div class="codex-chip-label">시간</div>
          <div class="codex-chip-value">{now.strftime("%Y-%m-%d %H:%M UTC")}</div>
        </div>
        <div class="codex-chip">
          <div class="codex-chip-label">경과</div>
          <div class="codex-chip-value">{_format_elapsed(elapsed)}</div>
        </div>
        <div class="codex-chip">
          <div class="codex-chip-label">위치</div>
          <div class="codex-chip-value">{snapshot.scene.location}</div>
        </div>
        <div class="codex-chip">
          <div class="codex-chip-label">소질</div>
          <div class="codex-chip-value">{archetype}</div>
        </div>
        <div class="codex-chip">
          <div class="codex-chip-label">인벤토리</div>
          <div class="codex-chip-value">{inventory_count} 개</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.radio("Codex 메뉴", menu_options, key="codex_section", label_visibility="collapsed")


def _render_player_codex(snapshot: RuntimeSnapshot) -> None:
    player = snapshot.player
    traits = player.traits if isinstance(player.traits, dict) else {}
    stats = traits.get("stats", {})
    if not isinstance(stats, dict):
        stats = {}

    st.markdown('<div class="codex-section-title">내 정보</div>', unsafe_allow_html=True)

    # Get autonomy details from scenario
    scenario_id = snapshot.loop.state.get("scenario_id", "neo-seoul")
    scenario = load_scenario(scenario_id)
    autonomy_level = int(traits.get("autonomy_level", 1))
    level_config = scenario.autonomy_config.get(str(autonomy_level), {})
    level_status = level_config.get("status", "Unknown")
    approved_keywords = level_config.get("keywords", [])

    st.markdown(
        f"""
        <div class="codex-meta-grid">
          <div class="codex-meta">
            <div class="codex-meta-label">접속자</div>
            <div class="codex-meta-value">{player.display_name}</div>
          </div>
          <div class="codex-meta">
            <div class="codex-meta-label">ID</div>
            <div class="codex-meta-value">{player.player_id}</div>
          </div>
          <div class="codex-meta">
            <div class="codex-meta-label">소질</div>
            <div class="codex-meta-value">{traits.get("archetype", "Unclassified")}</div>
          </div>
          <div class="codex-meta">
            <div class="codex-meta-label">자율성</div>
            <div class="codex-meta-value">LV {autonomy_level}: {level_status}</div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if approved_keywords:
        st.info(f"💡 **현재 심리 상태**: {', '.join(approved_keywords)}")
        st.caption("현재 자율성 수준에서 캐릭터가 자연스럽게 떠올릴 수 있는 행동 지향점입니다.")

    st.markdown('<div class="codex-section-title">스탯</div>', unsafe_allow_html=True)
    if stats:
        stat_names = {
            "strength": "근력 (Strength)",
            "intelligence": "연산 (Intelligence)",
            "charisma": "공명 (Charisma)",
            "agility": "반사 (Agility)",
            "perception": "관측 (Perception)",
        }
        for key, value in stats.items():
            display_name = stat_names.get(key, str(key).replace("_", " ").title())
            st.markdown(
                f"""
                <div class="codex-item">
                  <div class="codex-item-title">{display_name}</div>
                  <div class="codex-item-copy">{value} / 10</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        st.caption("저장된 스탯이 없습니다.")

    st.markdown('<div class="codex-section-title">속성</div>', unsafe_allow_html=True)
    attributes = traits.get("attributes", [])
    if isinstance(attributes, list) and attributes:
        for attr in attributes:
            st.markdown(
                f"""
                <div class="codex-item">
                  <div class="codex-item-title">{attr}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        st.caption("활성화된 속성이 없습니다.")

    st.markdown('<div class="codex-section-title">보유 특성</div>', unsafe_allow_html=True)
    traits_list = traits.get("unlocked_traits", [])
    if isinstance(traits_list, list) and traits_list:
        for trait in traits_list:
            st.markdown(
                f"""
                <div class="codex-item">
                  <div class="codex-item-title">{trait}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        st.caption("해금된 특성이 없습니다.")


def _render_codex_inventory(snapshot: RuntimeSnapshot, overview: MemoryOverview) -> None:
    player = snapshot.player
    traits = player.traits if isinstance(player.traits, dict) else {}
    inventory = traits.get("inventory", [])
    if not isinstance(inventory, list):
        inventory = []

    st.markdown('<div class="codex-section-title">인벤토리</div>', unsafe_allow_html=True)
    if inventory:
        for item in inventory:
            st.markdown(
                f"""
                <div class="codex-item">
                  <div class="codex-item-title">{item}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        st.caption("보관된 아이템이 없습니다.")

    if overview.narrative_shards:
        st.markdown('<div class="codex-section-title">보관 단서</div>', unsafe_allow_html=True)
        for shard in overview.narrative_shards[:6]:
            st.markdown(
                f"""
                <div class="codex-item">
                  <div class="codex-item-title">{shard.symbol}</div>
                  <div class="codex-item-copy">{shard.text}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )


def _render_codex_characters(snapshot: RuntimeSnapshot, scenario_id: str) -> None:
    st.markdown('<div class="codex-section-title">인물 정보</div>', unsafe_allow_html=True)
    current = _scene_characters(snapshot.scene, fallback_all=False, scenario_id=scenario_id)
    if current:
        st.caption("현재 장면")
        for data in current:
            image_path = data["image"]
            if image_path.exists():
                st.image(str(image_path), width=220)
            st.markdown(
                f"""
                <div class="codex-item">
                  <div class="codex-item-title">{data["name"]}</div>
                  <div class="codex-item-copy">{data["alias"]} · {data["role"]}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        st.caption("현재 장면에서 인물 신호가 없습니다.")

    st.divider()
    st.caption("도감")
    _render_character_dossier(None, fallback_all=True, scenario_id=scenario_id)


def _render_codex_lore(overview: MemoryOverview) -> None:
    st.markdown('<div class="codex-section-title">기억의 별자리</div>', unsafe_allow_html=True)
    if not overview.unlocked_lore:
        st.info("아직 해금된 세계관 정보가 없습니다. 더 많은 단서를 수집하세요.")
    else:
        for entry in overview.unlocked_lore:
            with st.expander(f"✨ {entry.title}", expanded=True):
                st.write(entry.description)
                st.caption(f"관련 태그: {', '.join(entry.tags)}")

    st.divider()
    st.subheader("수집된 단서 (Clues)")
    clue_shards = [s for s in overview.narrative_shards if s.kind == "clue"]
    if not clue_shards:
        st.write("발견된 단서가 없습니다.")
    else:
        for shard in clue_shards:
            st.markdown(f"**[{shard.symbol}]** {shard.text}")


@st.cache_data(ttl=600, show_spinner=False)
def _image_src(storage_uri: str) -> str | None:
    """Resolve an asset storage_uri to something st.image can render.

    Local paths are returned as-is; `s3://` (MinIO) URIs are turned into a
    short-lived presigned GET URL the browser can fetch from localhost:9000.
    """
    if not storage_uri:
        return None
    if storage_uri.startswith("s3://"):
        import os

        import boto3

        bucket, _, key = storage_uri[len("s3://") :].partition("/")
        try:
            client = boto3.client(
                "s3",
                endpoint_url=os.getenv("S3_ENDPOINT_URL", "http://localhost:9000"),
                aws_access_key_id=os.getenv("S3_ACCESS_KEY", "mythos"),
                aws_secret_access_key=os.getenv("S3_SECRET_KEY", "mythos-local-secret"),
            )
            return client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=600,
            )
        except Exception:
            return None
    if storage_uri.startswith("/") and Path(storage_uri).exists():
        return storage_uri
    return None


def _render_player_image(snapshot: RuntimeSnapshot) -> None:
    stored = [asset for asset in snapshot.assets if asset.storage_uri]
    if stored:
        src = _image_src(stored[-1].storage_uri)
        if src:
            st.image(src, width=420)
        return

    # No finished image yet — show a generating placeholder for queued/async jobs.
    pending = [a for a in snapshot.assets if a.status in {"pending", "processing"}]
    if pending:
        st.info("⟳ 장면 이미지를 생성하고 있습니다…")
        if st.button("이미지 새로고침", key="refresh_pending_image"):
            st.rerun()


def _render_hud(loop: LoopState, scene: Scene) -> None:
    if scene.objective:
        st.markdown(
            f"""
            <div class="mission-panel">
              <div class="terminal-kicker">작전 목표</div>
              <div class="mission-text">{scene.objective}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    if scene.action_result:
        result_class = "warn"
        if "Success" in scene.action_result:
            result_class = "success"
        elif "Failure" in scene.action_result:
            result_class = "failure"
        st.markdown(
            f'<div class="ops-result {result_class}">결과 // {scene.action_result}</div>',
            unsafe_allow_html=True,
        )

    stability = min(max(loop.stability, 0), 100)
    tension = min(max(loop.tension, 0), 100)
    st.markdown(
        f"""
        <div class="hud-grid">
          <div class="hud-tile" style="--bar-width: 100%">
            <div class="hud-label">작전 단계</div>
            <div class="hud-value">{_act_label(loop.phase)}</div>
            <div class="hud-sub">TURN {scene.turn_index:02d}</div>
          </div>
          <div class="hud-tile" style="--bar-width: {stability}%">
            <div class="hud-label">은신 안정도</div>
            <div class="hud-value">{loop.stability}</div>
            <div class="hud-sub">SIGNAL HOLD</div>
          </div>
          <div class="hud-tile" style="--bar-width: {tension}%">
            <div class="hud-label">관리망 추적도</div>
            <div class="hud-value">{loop.tension}</div>
            <div class="hud-sub">CONTROL NET</div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _render_character_dossier(scene: Scene | None, *, fallback_all: bool, scenario_id: str) -> None:
    st.subheader("CHARACTER")
    character_cards = _scene_characters(scene, fallback_all=fallback_all, scenario_id=scenario_id)
    if not character_cards:
        st.caption("현재 장면에서 식별된 인물이 없습니다.")
        return

    if fallback_all:
        cols = st.columns(4, gap="medium")
        for index, data in enumerate(character_cards, start=1):
            with cols[(index - 1) % 4]:
                image_path = data["image"]
                if image_path.exists():
                    st.image(str(image_path), width="stretch")
                st.markdown(
                    f"""
                    <div class="dossier-card">
                      <div class="dossier-index">FILE {index:02d}</div>
                      <div class="terminal-kicker">{data["alias"]}</div>
                      <div class="terminal-title">{data["name"]}</div>
                      <div class="terminal-copy">{data["role"]}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
        return

    for data in character_cards:
        image_path = data["image"]
        if image_path.exists():
            st.image(str(image_path), width=230)
        st.markdown(
            f"""
            <div class="terminal-panel">
              <div class="terminal-kicker">{data["alias"]}</div>
              <div class="terminal-title">{data["name"]}</div>
              <div class="terminal-copy">{data["role"]}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def _scene_characters(
    scene: Scene | None, *, fallback_all: bool, scenario_id: str
) -> list[CharacterDossier]:
    dossiers = _scenario_character_dossiers(scenario_id)
    if scene is None:
        return dossiers if fallback_all else []

    text = f"{scene.title} {scene.location} {scene.narration} {scene.visual_brief}".lower()
    found = [
        data for data in dossiers if any(keyword.lower() in text for keyword in data["keywords"])
    ]
    if found:
        return found[:2]
    return []


def _render_player_memory(loop: LoopState, overview: MemoryOverview | None) -> None:
    if loop.active_echoes:
        with st.expander(f"회상 — 잔향 {len(loop.active_echoes)}", expanded=False):
            for echo in loop.active_echoes:
                st.write(f"**{echo.symbol}** · {echo.text}")

    if overview is not None and (overview.narrative_shards or overview.rollup):
        with st.expander("기억의 별자리 (Codex)", expanded=False):
            st.caption(f"모은 단서 {len(overview.narrative_shards)}")
            for shard in overview.narrative_shards[:8]:
                st.write(f"· {shard.text}")
            if overview.rollup:
                loop_count = overview.rollup.get("loop_count", 0)
                st.caption(f"이전 세계들의 기억 · {loop_count}개 루프가 별자리로 압축됨")


def _play_panel(options: RuntimeOptions) -> None:
    if st.session_state.error:
        st.error(st.session_state.error)
    if st.session_state.message:
        st.info(st.session_state.message)

    if not st.session_state.loop_id:
        st.info("Create a player and start a loop.")
        return

    snapshot = _load_current_snapshot()
    if snapshot is None:
        return
    _render_snapshot(snapshot)
    if snapshot.loop.phase is LoopPhase.ENDED:
        st.info("This loop is archived. Start a new loop to carry the Echo forward.")
        return

    st.divider()
    st.subheader("Choices")
    for choice in snapshot.scene.choices:
        if st.button(
            f"{choice.label} [{choice.intent}]",
            key=f"choice:{snapshot.scene.scene_id}:{choice.choice_id}",
            width="stretch",
        ):
            _run_action(
                lambda service, choice_id=choice.choice_id: service.choose(
                    snapshot.loop.loop_id,
                    choice_id=choice_id,
                    options=options,
                ),
                on_success=_set_snapshot,
            )

    action = st.text_input(
        "Free action",
        key="free_action_input",
        placeholder="Describe what the Connector does",
    )
    if st.button("Send Action", disabled=not action.strip()):
        _run_action(
            lambda service: service.choose(
                snapshot.loop.loop_id,
                action=action.strip(),
                options=options,
            ),
            on_success=_set_snapshot,
        )


def _render_snapshot(snapshot: RuntimeSnapshot) -> None:
    loop = snapshot.loop
    scene = snapshot.scene
    st.caption(f"loop_id={loop.loop_id} / scene_id={scene.scene_id}")
    metric_cols = st.columns(3)
    metric_cols[0].metric("Phase", loop.phase.value)
    metric_cols[1].metric("Stability", loop.stability)
    metric_cols[2].metric("Tension", loop.tension)

    if scene.objective or scene.action_result:
        oc1, oc2 = st.columns(2)
        with oc1:
            st.write(f"**Objective**: {scene.objective or 'None'}")
        with oc2:
            st.write(f"**Action Result**: {scene.action_result or 'None'}")

    st.subheader(scene.title)
    st.caption(scene.location)
    st.write(scene.narration)

    _render_assets(snapshot)
    _render_echoes(loop)


def _render_assets(snapshot: RuntimeSnapshot) -> None:
    stored_assets = [asset for asset in snapshot.assets if asset.storage_uri]
    if not stored_assets:
        return

    with st.expander(f"Visual assets ({len(stored_assets)})", expanded=True):
        asset = stored_assets[-1]
        src = _image_src(asset.storage_uri)
        if src:
            st.image(src, caption=asset.storage_uri)
        else:
            st.code(asset.storage_uri)
        if len(stored_assets) > 1:
            st.caption("Previous assets")
            for previous_asset in stored_assets[:-1]:
                st.code(previous_asset.storage_uri or previous_asset.asset_id)


def _render_echoes(loop: LoopState) -> None:
    if loop.active_echoes:
        with st.expander(f"Echoes ({len(loop.active_echoes)})", expanded=False):
            for echo in loop.active_echoes:
                st.write(f"**{echo.symbol}**: {echo.text}")


def _run_action(action, on_success) -> None:
    st.session_state.error = ""
    try:
        with st.spinner("Running MythOS runtime..."):
            store = PostgresMythOSStore()
            try:
                service = RuntimeSessionService(store)
                result = action(service)
            finally:
                store.close()
        on_success(result)
        st.rerun()
    except Exception as exc:
        st.session_state.error = str(exc)


def _load_current_snapshot() -> RuntimeSnapshot | None:
    try:
        store = PostgresMythOSStore()
        try:
            return RuntimeSessionService(store).resume(loop_id=st.session_state.loop_id)
        finally:
            store.close()
    except Exception as exc:
        st.session_state.error = str(exc)
        return None


def _load_memory_overview(player_id: str) -> MemoryOverview | None:
    try:
        store = PostgresMythOSStore()
        try:
            return RuntimeSessionService(store).memory_overview(player_id)
        finally:
            store.close()
    except Exception as exc:
        st.session_state.error = str(exc)
        return None


def _load_players() -> list[PlayerProfile]:
    try:
        store = PostgresMythOSStore()
        try:
            return cast(list[PlayerProfile], store.list_players())
        finally:
            store.close()
    except Exception as exc:
        st.session_state.error = str(exc)
        return []


def _load_loops(player_id: str) -> list[LoopState]:
    try:
        store = PostgresMythOSStore()
        try:
            return cast(list[LoopState], store.list_loops(player_id))
        finally:
            store.close()
    except Exception as exc:
        st.session_state.error = str(exc)
        return []


def _index_for_player(players: list[PlayerProfile], player_id: str) -> int:
    for index, player in enumerate(players):
        if player.player_id == player_id:
            return index
    return 0


def _index_for_loop(loops: list[LoopState], loop_id: str) -> int:
    for index, loop in enumerate(loops):
        if loop.loop_id == loop_id:
            return index
    return 0


def _format_player_option(players: list[PlayerProfile], player_id: str) -> str:
    for player in players:
        if player.player_id == player_id:
            return f"{player.display_name} ({player.player_id})"
    return player_id


def _format_loop_option(loops: list[LoopState], loop_id: str) -> str:
    for loop in loops:
        if loop.loop_id == loop_id:
            return (
                f"{loop.phase.value} / stability {loop.stability} / "
                f"tension {loop.tension} ({loop.loop_id})"
            )
    return loop_id


def _scene_status_line(snapshot: RuntimeSnapshot) -> str:
    now = utc_now()
    elapsed = now - snapshot.loop.started_at
    tile = current_tile(snapshot.loop.state)
    coord = f" [{tile['x']}, {tile['y']}]" if tile else ""
    return (
        f"LOC // {snapshot.scene.location}{coord}  |  "
        f"TIME // {now.strftime('%Y-%m-%d %H:%M UTC')}  |  "
        f"ELAPSED // {_format_elapsed(elapsed)}"
    )


_TILE_GLYPH = {
    "market": "▣",
    "spire": "▲",
    "edge": "▤",
    "blackout": "▩",
    "data": "◈",
    "refuge": "⌂",
    "node": "◍",
}


def _render_minimap(loop: LoopState, radius: int = 2) -> None:
    """Tile minimap of visited locations, centered on the current coordinate."""
    map_state = loop.state.get("_map") if isinstance(loop.state, dict) else None
    if not map_state or not map_state.get("current"):
        return
    tiles = map_state.get("tiles", {})
    cur_key = map_state["current"]
    cur = tiles.get(cur_key)
    if not cur:
        return
    cx, cy = int(cur["x"]), int(cur["y"])
    by_coord = {(int(t["x"]), int(t["y"])): k for k, t in tiles.items()}

    rows: list[str] = []
    for gy in range(cy + radius, cy - radius - 1, -1):  # north (higher y) on top
        cells: list[str] = []
        for gx in range(cx - radius, cx + radius + 1):
            key = by_coord.get((gx, gy))
            if key is None:
                cells.append('<div class="mm-cell mm-empty"></div>')
                continue
            tile = tiles[key]
            glyph = _TILE_GLYPH.get(str(tile.get("kind", "node")), "◍")
            cls = "mm-cell mm-current" if key == cur_key else "mm-cell mm-visited"
            name = str(tile.get("name", "")).replace('"', "")
            cells.append(f'<div class="{cls}" title="{name}">{glyph}</div>')
        rows.append('<div class="mm-row">' + "".join(cells) + "</div>")

    style = """
    <style>
    .minimap{display:inline-block;padding:8px;border:1px solid #2a3a4a;border-radius:8px;
      background:#0b1016;margin-bottom:6px}
    .mm-row{display:flex}
    .mm-cell{width:26px;height:26px;margin:2px;display:flex;align-items:center;
      justify-content:center;border-radius:5px;font-size:14px;line-height:1}
    .mm-empty{background:#10161d;border:1px dashed #1c2632;color:#1c2632}
    .mm-visited{background:#16202b;border:1px solid #2c3e50;color:#7f9bb3}
    .mm-current{background:#1f6feb;border:1px solid #5aa0ff;color:#fff;
      box-shadow:0 0 8px rgba(90,160,255,.7)}
    </style>
    """
    html = '<div class="minimap">' + "".join(rows) + "</div>"
    st.markdown("작전 지도", help="방문한 위치의 동적 지도. 파란 칸이 현재 위치입니다.")
    st.markdown(style + html, unsafe_allow_html=True)
    st.caption(f"좌표 {cx}, {cy} · 탐사 {len(tiles)}곳 · {cur.get('name', '')}")


def _format_elapsed(delta: Any) -> str:
    total_seconds = max(int(delta.total_seconds()), 0)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def _set_player(player_id: str, clear_loop: bool = False) -> None:
    st.session_state.player_id = player_id
    st.session_state.pending_player_id_input = player_id
    if clear_loop:
        st.session_state.loop_id = ""
        st.session_state.pending_loop_id_input = ""
    st.session_state.message = f"player_id={player_id}"


def _set_snapshot(snapshot: RuntimeSnapshot) -> None:
    st.session_state.player_id = snapshot.player.player_id
    st.session_state.pending_player_id_input = snapshot.player.player_id
    st.session_state.loop_id = snapshot.loop.loop_id
    st.session_state.pending_loop_id_input = snapshot.loop.loop_id
    st.session_state.pending_free_action_input = ""
    st.session_state.pending_player_free_action = ""
    st.session_state.message = f"phase={snapshot.loop.phase.value}, scene={snapshot.scene.title}"
    if snapshot.image_result is not None:
        st.session_state.message += f", image={snapshot.image_result.status}"


def _set_new_loop_snapshot(snapshot: RuntimeSnapshot) -> None:
    _set_snapshot(snapshot)
    st.session_state.show_session_intro = True


def _set_message(message: str) -> None:
    st.session_state.message = message
    st.session_state.error = ""


if __name__ == "__main__":
    main()
