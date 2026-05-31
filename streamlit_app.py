from __future__ import annotations

import base64
import html
from pathlib import Path
from typing import Any, TypedDict, cast

import streamlit as st

from mythos_combat import PlayerAction
from mythos_core import LoopPhase, LoopState, PlayerProfile, Scene, utc_now
from mythos_core.mapgrid import current_tile
from mythos_memory import PostgresMythOSStore
from mythos_runtime.options import (
    MemoryOverview,
    RuntimeOptions,
    RuntimeSnapshot,
    RuntimeStreamEvent,
)
from mythos_runtime.scenario import load_scenario
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.visual_queue import VisualJobQueue

st.set_page_config(page_title="Project MythOS", layout="wide", initial_sidebar_state="collapsed")

PROJECT_ROOT = Path(__file__).resolve().parent
STORY_TRANSCRIPT_LIMIT = 12000


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
    st.session_state.setdefault("audio_active", False)
    st.session_state.setdefault("story_transcripts", {})
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
            box-shadow: 0 0 22px rgba(0, 255, 170, 0.08);
        }
        audio {
            opacity: 0;
            position: absolute;
            width: 0;
            height: 0;
            pointer-events: none;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <style>
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
        .mythos-loader {
            background: rgba(0, 10, 9, 0.92);
            border: 1px solid rgba(41, 255, 198, 0.34);
            border-radius: 4px;
            box-shadow: 0 0 26px rgba(41, 255, 198, 0.08);
            color: #dffdf7;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            margin: 10px 0 14px;
            overflow: hidden;
            padding: 14px 16px 12px;
            position: relative;
        }
        .mythos-loader::before {
            background: repeating-linear-gradient(
                180deg,
                rgba(41, 255, 198, 0.04) 0,
                rgba(41, 255, 198, 0.04) 1px,
                transparent 2px,
                transparent 5px
            );
            content: "";
            inset: 0;
            opacity: 0.45;
            pointer-events: none;
            position: absolute;
        }
        .loader-line {
            color: rgba(190, 255, 244, 0.9);
            font-size: 0.75rem;
            line-height: 1.55;
            position: relative;
            z-index: 1;
        }
        .loader-line.dim {
            color: rgba(140, 204, 194, 0.68);
        }
        .loader-prompt {
            color: #29ffc6;
            font-weight: 800;
        }
        .loader-cursor::after {
            animation: mythos-loader-dots 1.2s steps(4, end) infinite;
            content: "";
        }
        @keyframes mythos-loader-dots {
            0% { content: ""; }
            25% { content: "."; }
            50% { content: ".."; }
            75% { content: "..."; }
            100% { content: ""; }
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
        fast_mode=True,
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
    fast_mode = st.sidebar.toggle(
        "Fast mode",
        value=False,
        help="ON이면 repair 왕복과 blocking 이미지 fallback을 피합니다. Player View는 항상 ON입니다.",
    )
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
        fast_mode=fast_mode,
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

    if not st.session_state.audio_active:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("WAKE SYSTEM // 접속 기동 (BGM 활성화)", use_container_width=True):
            st.session_state.audio_active = True
            st.rerun()

    # Play main BGM (ONLY in connect screen)
    main_bgm = PROJECT_ROOT / "resources" / options.scenario_id / "audio" / "bgm_main.wav"
    if st.session_state.audio_active and main_bgm.exists() and not st.session_state.loop_id:
        st.audio(str(main_bgm), format="audio/wav", autoplay=True, loop=True)

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
            _run_stream_action(
                lambda service: service.stream_start_loop(selected or "", options),
                on_success=_set_new_loop_snapshot,
                show_stream=False,
                loading_label="새 루프 접속 중",
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
    _render_audio(snapshot)
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
    _render_audio(snapshot)
    loop = snapshot.loop
    scene = snapshot.scene

    tab_story, tab_codex = st.tabs(["서사 접속", "Codex (기억의 별자리)"])

    with tab_story:
        story_col, dossier_col = st.columns([0.68, 0.32], gap="large")
        with story_col:
            combat = snapshot.combat
            if combat:
                image_col, radar_col, command_col = st.columns([0.32, 0.38, 0.30], gap="medium")
                with image_col:
                    _render_player_image(snapshot)
                with radar_col:
                    _render_combat_radar(loop, combat, options)
                with command_col:
                    if not combat.get("finished"):
                        action_area = st.empty()
                        with action_area.container():
                            _render_combat_controls(loop, combat, options, action_area)
                    else:
                        _render_combat_outcome(loop, combat, options)
            else:
                _render_player_image(snapshot)
            st.header(scene.title)
            st.markdown(
                f'<div class="status-line">{_scene_status_line(snapshot)}</div>',
                unsafe_allow_html=True,
            )
            _render_hud(loop, scene)
            script_placeholder = st.empty()
            transcript = _story_transcript(snapshot)
            _render_script_window(
                transcript,
                key=f"script:{scene.scene_id}",
                placeholder=script_placeholder,
            )

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
            elif combat and not combat.get("finished"):
                _render_player_memory(loop, overview)
            else:
                # Wrap the interactive controls so they can be cleared the moment
                # an action is taken: the choices / free-action input disappear
                # while the next scene streams in, then reappear on rerun.
                action_area = st.empty()
                pending_choice_id: str | None = None
                pending_action: str | None = None
                restricted_action = False
                aggressive_verbs = ["파괴", "삭제", "살해", "공격", "재작성", "지배"]
                traits = snapshot.player.traits if isinstance(snapshot.player.traits, dict) else {}
                autonomy_level = int(traits.get("autonomy_level", 1))

                with action_area.container():
                    st.divider()
                    st.subheader("행동 선언")

                    for choice in scene.choices:
                        if st.button(
                            choice.label,
                            key=f"player_choice:{scene.scene_id}:{choice.choice_id}",
                            width="stretch",
                        ):
                            pending_choice_id = choice.choice_id

                    # Autonomy UI
                    st.caption(f"**현재 자율성 레벨 {autonomy_level}**")

                    action = st.text_input(
                        "직접 행동을 선언한다",
                        key="player_free_action",
                        placeholder="무엇을 하시겠습니까?",
                    )

                    if st.button("선언", disabled=not action.strip()):
                        pending_action = action.strip()
                        # System Constraint Visualization (LV 1-2 restricts aggressive verbs)
                        if autonomy_level <= 2 and any(
                            v in pending_action for v in aggressive_verbs
                        ):
                            restricted_action = True

                if pending_choice_id is not None:
                    action_area.empty()
                    _run_stream_action(
                        lambda service, choice_id=pending_choice_id: service.stream_choose(
                            loop.loop_id, choice_id=choice_id, options=options
                        ),
                        on_success=_set_snapshot,
                        loading_label="다음 장면 동기화 중",
                        stream_placeholder=script_placeholder,
                        initial_text=transcript,
                    )
                elif pending_action is not None:
                    action_area.empty()
                    if restricted_action:
                        st.warning(
                            "⚠ **신호 제약 감지**: 현재 자율성 레벨에서 실행하기 어려운 행동입니다. 신호가 감쇄되어 전달됩니다."
                        )
                    _run_stream_action(
                        lambda service: service.stream_choose(
                            loop.loop_id, action=pending_action, options=options
                        ),
                        on_success=_set_snapshot,
                        loading_label="다음 장면 동기화 중",
                        stream_placeholder=script_placeholder,
                        initial_text=transcript,
                    )

                _render_player_memory(loop, overview)

        with dossier_col:
            _render_minimap(loop)
            _render_character_dossier(scene, fallback_all=False, scenario_id=options.scenario_id)

    with tab_codex:
        overview = _load_memory_overview(loop.player_id)
        if overview is not None:
            _render_codex_view(snapshot, overview, options.scenario_id)


def _render_combat_radar(loop: LoopState, combat: dict[str, Any], options: RuntimeOptions) -> None:
    scenario_id = options.scenario_id
    radar = combat.get("radar", {})
    if isinstance(radar, dict):
        if combat.get("finished"):
            st.markdown(_render_tactical_board_html(radar, scenario_id), unsafe_allow_html=True)
        else:
            _render_tactical_board_interactive(loop, combat, options)
        _render_combat_roster(radar, scenario_id)
    outcome = combat.get("outcome")
    if outcome:
        rewards = combat.get("rewards", {})
        items = rewards.get("items", []) if isinstance(rewards, dict) else []
        suffix = f" · loot: {', '.join(items)}" if items else ""
        st.caption(f"COMBAT // {outcome}{suffix}")


def _render_tactical_board_interactive(
    loop: LoopState, combat: dict[str, Any], options: RuntimeOptions
) -> None:
    radar = combat.get("radar", {})
    if not isinstance(radar, dict):
        return
    available = combat.get("available", {})
    reachable = available.get("reachable", []) if isinstance(available, dict) else []
    reachable_set = {
        (int(tile[0]), int(tile[1]))
        for tile in reachable
        if isinstance(tile, list) and len(tile) == 2
    }
    arena = radar.get("arena", {"w": 8, "h": 6})
    w, h = int(arena.get("w", 8)), int(arena.get("h", 6))
    blips = [blip for blip in radar.get("blips", []) if isinstance(blip, dict)]
    by_cell = {
        (int(blip.get("x", 0)), int(blip.get("y", 0))): blip
        for blip in blips
        if blip.get("alive", True)
    }
    player_pos = _combat_player_pos(radar)
    selected = st.session_state.get("combat_selected_unit") == "player"
    title = f"ROUND // {int(radar.get('round', 1)):02d}"
    st.markdown(
        "<style>"
        ".tac-live-wrap{background:rgba(2,10,9,.96);border:1px solid rgba(41,255,198,.38);border-radius:6px;padding:12px;color:#d8fff7}"
        ".tac-live-head{font:800 12px 'SF Mono',Menlo,monospace;color:#29ffc6;letter-spacing:1px;margin-bottom:8px}"
        ".tac-live-help{font:11px 'SF Mono',Menlo,monospace;color:#8fd8ca;margin-bottom:8px}"
        "</style>"
        f'<div class="tac-live-wrap"><div class="tac-live-head">TACTICAL BOARD :: {title}</div>'
        '<div class="tac-live-help">플레이어 신호를 누른 뒤, 강조된 칸을 바로 선택해 이동합니다.</div></div>',
        unsafe_allow_html=True,
    )
    for y in range(h - 1, -1, -1):
        cols = st.columns(w, gap="small")
        for x in range(w):
            coord = (x, y)
            blip = by_cell.get(coord)
            is_player = bool(blip and blip.get("faction") == "player")
            is_enemy = bool(blip and blip.get("faction") == "enemy")
            is_ally = bool(blip and blip.get("faction") == "ally")
            is_reachable = coord in reachable_set
            if is_player:
                label = "◎"
                help_text = "플레이어 신호 선택"
                disabled = False
            elif is_enemy:
                label = "■"
                help_text = str(blip.get("name", "enemy")) if blip else "enemy"
                disabled = True
            elif is_ally:
                label = "◆"
                help_text = str(blip.get("name", "ally")) if blip else "ally"
                disabled = True
            elif selected and is_reachable:
                label = f"{x},{y}"
                help_text = f"{x},{y}로 이동"
                disabled = False
            else:
                label = "·" if is_reachable else " "
                help_text = "이동 가능" if is_reachable else "이동 불가"
                disabled = True
            with cols[x]:
                if st.button(
                    label,
                    key=f"tac_board:{loop.loop_id}:{x}:{y}",
                    width="stretch",
                    disabled=disabled,
                    help=help_text,
                ):
                    if is_player:
                        st.session_state.combat_selected_unit = "" if selected else "player"
                        st.rerun()
                    elif player_pos is not None and selected and is_reachable:
                        st.session_state.combat_selected_unit = ""
                        _run_action(
                            lambda service, chosen_dest=coord: service.combat_action(
                                loop.loop_id,
                                PlayerAction(type="wait", move_to=chosen_dest),
                                options,
                            ),
                            on_success=_set_snapshot,
                        )


def _render_tactical_board_html(radar: dict[str, Any], scenario_id: str) -> str:
    arena = radar.get("arena", {"w": 8, "h": 6})
    w, h = int(arena.get("w", 8)), int(arena.get("h", 6))
    blips = [blip for blip in radar.get("blips", []) if isinstance(blip, dict)]
    by_cell = {
        (int(blip.get("x", 0)), int(blip.get("y", 0))): blip
        for blip in blips
        if blip.get("alive", True)
    }
    rows: list[str] = []
    for gy in range(h - 1, -1, -1):
        cells: list[str] = []
        for gx in range(w):
            blip = by_cell.get((gx, gy))
            if blip is None:
                cells.append('<div class="tac-cell tac-empty"></div>')
                continue
            faction = str(blip.get("faction", ""))
            portrait = _combat_portrait_data_uri(blip, scenario_id)
            glyph = html.escape(str(blip.get("glyph", "●")))
            name = html.escape(str(blip.get("name", "")))
            hp = int(blip.get("hp", 0))
            max_hp = max(1, int(blip.get("max_hp", 1)))
            pct = max(0, min(100, int((hp / max_hp) * 100)))
            avatar = (
                f'<img src="{portrait}" alt="" />'
                if portrait
                else f'<span class="tac-glyph">{glyph}</span>'
            )
            cells.append(
                f'<div class="tac-cell tac-{html.escape(faction)}" title="{name}">'
                f'{avatar}<div class="tac-hp"><span style="width:{pct}%"></span></div></div>'
            )
        rows.append('<div class="tac-row">' + "".join(cells) + "</div>")
    outcome = radar.get("outcome")
    title = f"OUTCOME // {html.escape(str(outcome))}" if outcome else f"ROUND // {int(radar.get('round', 1)):02d}"
    return (
        """<style>
        .tac-wrap{background:rgba(2,10,9,.96);border:1px solid rgba(41,255,198,.38);border-radius:6px;padding:12px;color:#d8fff7}
        .tac-head{font:800 12px 'SF Mono',Menlo,monospace;color:#29ffc6;letter-spacing:1px;margin-bottom:10px}
        .tac-grid{display:inline-block;background:#030b0b;border:1px solid #143b34;padding:7px;border-radius:5px}
        .tac-row{display:flex}
        .tac-cell{position:relative;width:44px;height:44px;margin:2px;border-radius:5px;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .tac-empty{background:#071211;border:1px solid #12231f}
        .tac-player{background:#082720;border:1px solid #29ffc6;box-shadow:0 0 10px rgba(41,255,198,.35)}
        .tac-enemy{background:#2a0710;border:1px solid #ff5a7a;box-shadow:0 0 10px rgba(255,90,122,.28);animation:tac-pulse 1.15s steps(2,end) infinite}
        .tac-ally{background:#07182a;border:1px solid #5aa0ff}
        .tac-cell img{width:100%;height:100%;object-fit:cover;display:block}
        .tac-glyph{font:900 18px 'SF Mono',Menlo,monospace}
        .tac-hp{position:absolute;left:4px;right:4px;bottom:4px;height:4px;background:rgba(0,0,0,.65)}
        .tac-hp span{display:block;height:4px;background:#29ffc6}
        .tac-enemy .tac-hp span{background:#ff5a7a}
        @keyframes tac-pulse{0%{opacity:1}50%{opacity:.72}100%{opacity:1}}
        </style>"""
        + '<div class="tac-wrap">'
        + f'<div class="tac-head">TACTICAL BOARD :: {title}</div>'
        + '<div class="tac-grid">'
        + "".join(rows)
        + "</div></div>"
    )


def _render_combat_outcome(
    loop: LoopState, combat: dict[str, Any], options: RuntimeOptions
) -> None:
    outcome_raw = str(combat.get("outcome") or "resolved")
    outcome = html.escape(outcome_raw)
    rewards = combat.get("rewards", {})
    items = rewards.get("items", []) if isinstance(rewards, dict) else []
    loot = ", ".join(str(item) for item in items) if items else "none"
    radar = combat.get("radar", {})
    blips = [blip for blip in radar.get("blips", []) if isinstance(blip, dict)] if isinstance(radar, dict) else []
    party = [blip for blip in blips if blip.get("faction") in {"player", "ally"}]
    enemies = [blip for blip in blips if blip.get("faction") == "enemy"]
    defeated = len([blip for blip in enemies if not blip.get("alive", True)])
    survivors = len([blip for blip in party if blip.get("alive", True)])
    player_blip = next((blip for blip in party if blip.get("faction") == "player"), None)
    player_portrait = ""
    if player_blip is not None:
        player_portrait_uri = _combat_portrait_data_uri(player_blip, options.scenario_id)
        if player_portrait_uri:
            player_name = html.escape(str(player_blip.get("name", "PLAYER")))
            player_portrait = (
                f'<div class="combat-result-portrait"><img src="{player_portrait_uri}" alt="" />'
                f'<div class="combat-result-portrait-label">{player_name}</div></div>'
            )
    summary = combat.get("summary", {})
    summary = summary if isinstance(summary, dict) else {}
    player_hp = int(summary.get("player_hp", 0) or 0)
    player_max_hp = int(summary.get("player_max_hp", 0) or 0)
    hp_label = f"{player_hp}/{player_max_hp}" if player_max_hp else "n/a"
    damage_dealt = int(summary.get("damage_dealt", 0) or 0)
    damage_taken = int(summary.get("damage_taken", 0) or 0)
    rounds = int(summary.get("rounds", 0) or 0)
    turns = int(summary.get("turns", 0) or 0)
    hits = int(summary.get("hits", 0) or 0)
    misses = int(summary.get("misses", 0) or 0)
    crits = int(summary.get("crits", 0) or 0)
    verdict = _combat_verdict(outcome_raw, damage_dealt, damage_taken, defeated, len(enemies))
    result_label = {
        "player_victory": "교전 승리",
        "fled": "이탈 성공",
        "player_defeat": "신호 소실",
    }.get(outcome_raw, "교전 종료")
    st.markdown(
        "<style>"
        ".combat-result{border:1px solid rgba(41,255,198,.42);background:linear-gradient(180deg,rgba(2,21,18,.96),rgba(2,10,9,.96));border-radius:6px;padding:14px;color:#d8fff7}"
        ".combat-result-top{display:flex;gap:12px;align-items:center;margin-bottom:10px}"
        ".combat-result-portrait{width:74px;height:74px;position:relative;flex:0 0 74px;border:1px solid rgba(41,255,198,.45);background:#020b0a;overflow:hidden;border-radius:5px;box-shadow:0 0 12px rgba(41,255,198,.15)}"
        ".combat-result-portrait img{width:100%;height:100%;object-fit:cover;display:block;filter:contrast(1.12) saturate(1.08)}"
        ".combat-result-portrait-label{position:absolute;left:4px;right:4px;bottom:4px;font:800 9px 'SF Mono',Menlo,monospace;color:#eafff9;background:rgba(0,0,0,.62);padding:2px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
        ".combat-result-heading{min-width:0;flex:1}"
        ".combat-result-kicker{font:800 11px 'SF Mono',Menlo,monospace;color:#29ffc6;letter-spacing:1px;margin-bottom:8px}"
        ".combat-result-title{font:900 24px 'SF Mono',Menlo,monospace;color:#eafff9;margin-bottom:10px}"
        ".combat-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}"
        ".combat-result-stat{border:1px solid rgba(120,220,200,.22);background:rgba(5,18,17,.72);border-radius:5px;padding:8px}"
        ".combat-result-label{font:10px 'SF Mono',Menlo,monospace;color:#78cfc0;letter-spacing:.5px}"
        ".combat-result-value{font:800 15px 'SF Mono',Menlo,monospace;color:#eafff9;margin-top:3px}"
        ".combat-result-copy{font:12px 'SF Mono',Menlo,monospace;color:#9eddd1;line-height:1.5;margin-top:8px}"
        "</style>"
        f'<div class="combat-result"><div class="combat-result-top">{player_portrait}'
        f'<div class="combat-result-heading"><div class="combat-result-kicker">COMBAT RESULT :: {outcome}</div>'
        f'<div class="combat-result-title">{html.escape(result_label)}</div></div></div>'
        '<div class="combat-result-grid">'
        f'<div class="combat-result-stat"><div class="combat-result-label">PARTY ONLINE</div><div class="combat-result-value">{survivors}/{len(party)}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">HOSTILES DOWN</div><div class="combat-result-value">{defeated}/{len(enemies)}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">PLAYER HP</div><div class="combat-result-value">{html.escape(hp_label)}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">ROUND / TURN</div><div class="combat-result-value">{rounds}/{turns}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">DAMAGE DEALT</div><div class="combat-result-value">{damage_dealt}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">DAMAGE TAKEN</div><div class="combat-result-value">{damage_taken}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">HIT / MISS / CRIT</div><div class="combat-result-value">{hits}/{misses}/{crits}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">LOOT</div><div class="combat-result-value">{html.escape(loot)}</div></div>'
        '</div>'
        f'<div class="combat-result-copy">{html.escape(verdict)}</div>'
        '<div class="combat-result-copy">전투 기록을 정산하고 서사 루프를 다음 장면으로 넘길 수 있습니다.</div></div>',
        unsafe_allow_html=True,
    )
    if outcome_raw == "player_defeat" or loop.phase is LoopPhase.ENDED:
        if st.button("메인 화면으로 돌아가기", key=f"combat_return_home:{loop.loop_id}", width="stretch"):
            _return_to_player_main(loop.player_id)
            st.rerun()
        return
    if st.button("전투 정산 후 다음 장면으로 진행", key=f"combat_continue:{loop.loop_id}", width="stretch"):
        st.session_state.combat_selected_unit = ""
        _run_action(
            lambda service: service.choose(
                loop.loop_id,
                action="전투 결과를 정리하고 다음 장면으로 이동한다.",
                options=options,
            ),
            on_success=_set_snapshot,
        )


def _combat_verdict(
    outcome: str, damage_dealt: int, damage_taken: int, defeated: int, enemy_count: int
) -> str:
    if outcome == "player_victory":
        if damage_taken == 0:
            return "판정: 완전 제압. 소모 없이 적대 신호를 끊었습니다."
        if damage_dealt >= damage_taken * 2:
            return "판정: 우세 승리. 피해 교환비가 안정적입니다."
        return "판정: 소모전 승리. 다음 인카운터 전 회복 수단을 점검해야 합니다."
    if outcome == "fled":
        return "판정: 전술 이탈. 생존은 확보했지만 접촉 신호가 세계에 흔적을 남겼습니다."
    if outcome == "player_defeat":
        if defeated > 0:
            return "판정: 치명적 패배. 일부 적을 제거했지만 파티 신호가 유지되지 못했습니다."
        if enemy_count > 1:
            return "판정: 포위 붕괴. 수적 열세를 줄이기 전에 전선이 무너졌습니다."
        return "판정: 신호 붕괴. 방어/회복/이탈 판단이 너무 늦었습니다."
    return "판정: 교전 종료. 기록을 다음 장면에 반영합니다."


def _render_combat_roster(radar: dict[str, Any], scenario_id: str) -> None:
    blips = [blip for blip in radar.get("blips", []) if isinstance(blip, dict)]
    if not blips:
        return
    party = [blip for blip in blips if blip.get("faction") in {"player", "ally"}]
    enemies = [blip for blip in blips if blip.get("faction") == "enemy"]
    st.markdown(
        _combat_roster_html("PARTY", party, scenario_id)
        + _combat_roster_html("ENEMY", enemies, scenario_id),
        unsafe_allow_html=True,
    )


def _combat_roster_html(title: str, blips: list[dict[str, Any]], scenario_id: str) -> str:
    if not blips:
        return ""
    cards = []
    for blip in blips:
        hp = int(blip.get("hp", 0))
        max_hp = max(1, int(blip.get("max_hp", 1)))
        pct = max(0, min(100, int((hp / max_hp) * 100)))
        dead = " roster-dead" if not blip.get("alive", True) else ""
        avatar = _combat_avatar_html(blip, scenario_id)
        name = html.escape(str(blip.get("name", "")))
        pos = f'{int(blip.get("x", 0))},{int(blip.get("y", 0))}'
        cards.append(
            f'<div class="roster-card{dead}">{avatar}<div class="roster-main">'
            f'<div class="roster-name">{name}</div>'
            f'<div class="roster-hp"><span style="width:{pct}%"></span></div>'
            f'<div class="roster-meta">HP {hp}/{max_hp} · POS {pos}</div>'
            f'</div></div>'
        )
    return (
        """<style>
        .roster-title{margin-top:10px;color:#88ffe6;font:700 11px 'SF Mono',Menlo,monospace;letter-spacing:1px}
        .roster-card{display:flex;gap:8px;align-items:center;margin:6px 0;padding:7px;border:1px solid rgba(80,180,160,.24);background:rgba(5,18,17,.72);border-radius:5px;overflow:hidden}
        .roster-avatar{width:34px;height:34px;flex:0 0 34px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(80,180,160,.35);color:#29ffc6;font:700 16px 'SF Mono',Menlo,monospace;background:#04100f}
        .roster-avatar img{width:100%;height:100%;object-fit:cover;display:block}
        .roster-main{min-width:0;flex:1}
        .roster-name{font-size:12px;color:#eafff9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .roster-hp{height:5px;background:#172521;margin:4px 0}
        .roster-hp span{display:block;height:5px;background:#29ffc6}
        .roster-meta{font-size:10px;color:#8fbab0;font-family:'SF Mono',Menlo,monospace}
        .roster-dead{opacity:.45;filter:grayscale(1)}
        </style>"""
        + f'<div class="roster-title">{html.escape(title)}</div>'
        + "".join(cards)
    )


def _combat_avatar_html(blip: dict[str, Any], scenario_id: str) -> str:
    portrait = _combat_portrait_data_uri(blip, scenario_id)
    if portrait:
        return f'<div class="roster-avatar"><img src="{portrait}" alt="" /></div>'
    return f'<div class="roster-avatar">{html.escape(str(blip.get("glyph", "●")))}</div>'


def _combat_portrait_data_uri(blip: dict[str, Any], scenario_id: str) -> str | None:
    portrait = str(blip.get("portrait", "")).strip() or _combat_portrait_from_scenario(
        blip, scenario_id
    )
    if not portrait:
        return None
    path = PROJECT_ROOT / "resources" / scenario_id / portrait
    if not path.exists():
        return None
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _combat_portrait_from_scenario(blip: dict[str, Any], scenario_id: str) -> str:
    if blip.get("faction") == "player":
        return "characters/player-noise.png"
    scenario = load_scenario(scenario_id)
    bestiary = scenario.combat.get("bestiary", {}) if isinstance(scenario.combat, dict) else {}
    blip_id = str(blip.get("id", ""))
    blip_name = str(blip.get("name", ""))
    for key, entry in bestiary.items():
        if not isinstance(entry, dict):
            continue
        entry_id = str(entry.get("id", key))
        if blip_id.startswith(entry_id) or blip_name == str(entry.get("name", "")):
            return str(entry.get("image", ""))
    return ""


def _render_combat_controls(
    loop: LoopState,
    combat: dict[str, Any],
    options: RuntimeOptions,
    action_area,
) -> None:
    available = combat.get("available", {})
    if not isinstance(available, dict) or not available.get("can_act", False):
        st.info("전술 신호를 동기화하는 중입니다.")
        return

    targets = [target for target in available.get("targets", []) if isinstance(target, dict)]
    radar = combat.get("radar", {})
    player_pos = _combat_player_pos(radar if isinstance(radar, dict) else {})
    selected_unit = st.session_state.get("combat_selected_unit")
    st.markdown(
        "<style>"
        ".combat-command-panel{border:1px solid rgba(41,255,198,.35);background:rgba(2,10,9,.93);border-radius:6px;padding:12px;color:#d8fff7}"
        ".combat-command-kicker{font:700 11px 'SF Mono',Menlo,monospace;color:#29ffc6;letter-spacing:1px;margin-bottom:6px}"
        ".combat-command-title{font:800 22px 'SF Mono',Menlo,monospace;color:#eafff9;margin-bottom:8px}"
        ".combat-command-copy{font:12px 'SF Mono',Menlo,monospace;color:#8fd8ca;line-height:1.45;margin-bottom:8px}"
        ".target-card{border:1px solid rgba(255,90,122,.28);background:rgba(30,6,11,.64);border-radius:5px;padding:8px;margin:6px 0}"
        ".target-name{color:#ffdce3;font-weight:800;font-size:13px}"
        ".target-meta{color:#d99aa8;font:11px 'SF Mono',Menlo,monospace}"
        "</style>"
        '<div class="combat-command-panel"><div class="combat-command-kicker">COMMAND CONSOLE</div>'
        '<div class="combat-command-title">전투 명령</div>'
        '<div class="combat-command-copy">이동은 전술 보드에서 직접 처리합니다. 표적은 사거리 안에서만 공격할 수 있습니다.</div></div>',
        unsafe_allow_html=True,
    )

    if targets:
        st.caption("표적")
        for index, target in enumerate(targets[:4]):
            target_id = str(target.get("id", ""))
            in_range = bool(target.get("in_range"))
            distance = int(target.get("distance", 0))
            hp = int(target.get("hp", 0))
            max_hp = int(target.get("max_hp", 0))
            name = html.escape(str(target.get("name", target_id)))
            st.markdown(
                f'<div class="target-card"><div class="target-name">{name}</div>'
                f'<div class="target-meta">HP {hp}/{max_hp} · DIST {distance} · '
                f'{"IN RANGE" if in_range else "OUT OF RANGE"}</div></div>',
                unsafe_allow_html=True,
            )
            if st.button(
                "공격",
                key=f"combat_attack:{loop.loop_id}:{target_id}:{index}",
                width="stretch",
                disabled=not in_range,
            ):
                action_area.empty()
                _run_action(
                    lambda service, chosen_id=target_id: service.combat_action(
                        loop.loop_id,
                        PlayerAction(type="attack", target_id=chosen_id),
                        options,
                    ),
                    on_success=_set_snapshot,
                )

    if player_pos is not None:
        st.caption(
            "전술 보드: 플레이어 신호 선택됨"
            if selected_unit == "player"
            else "전술 보드의 플레이어 신호를 눌러 이동 범위를 엽니다."
        )

    c1, c2 = st.columns(2)
    with c1:
        if st.button("방어", width="stretch"):
            action_area.empty()
            _run_action(
                lambda service: service.combat_action(
                    loop.loop_id,
                    PlayerAction(type="defend"),
                    options,
                ),
                on_success=_set_snapshot,
            )
    with c2:
        if st.button("도주", width="stretch"):
            action_area.empty()
            _run_action(
                lambda service: service.combat_action(
                    loop.loop_id,
                    PlayerAction(type="flee"),
                    options,
                ),
                on_success=_set_snapshot,
            )


def _render_move_board(
    loop: LoopState,
    player_pos: tuple[int, int],
    reachable: list,
    radar: dict[str, Any],
    options: RuntimeOptions,
    action_area,
) -> None:
    arena = radar.get("arena", {"w": 8, "h": 6})
    w, h = int(arena.get("w", 8)), int(arena.get("h", 6))
    reachable_set = {(int(tile[0]), int(tile[1])) for tile in reachable if len(tile) == 2}
    occupied = {
        (int(blip.get("x", 0)), int(blip.get("y", 0)))
        for blip in radar.get("blips", [])
        if isinstance(blip, dict) and blip.get("alive", True) and blip.get("faction") != "player"
    }
    min_x = max(0, player_pos[0] - 2)
    max_x = min(w - 1, player_pos[0] + 2)
    min_y = max(0, player_pos[1] - 2)
    max_y = min(h - 1, player_pos[1] + 2)
    st.caption(f"이동 보드 · 현재 {player_pos[0]},{player_pos[1]}")
    for y in range(max_y, min_y - 1, -1):
        cols = st.columns(max_x - min_x + 1)
        for col_index, x in enumerate(range(min_x, max_x + 1)):
            coord = (x, y)
            is_player = coord == player_pos
            is_occupied = coord in occupied
            disabled = (coord not in reachable_set and not is_player) or is_occupied
            label = "◎" if is_player else ("×" if is_occupied else f"{x},{y}")
            with cols[col_index]:
                if st.button(
                    label,
                    key=f"combat_cell:{loop.loop_id}:{x}:{y}",
                    width="stretch",
                    disabled=disabled,
                ):
                    action_area.empty()
                    move_to = None if is_player else coord
                    _run_action(
                        lambda service, chosen_dest=move_to: service.combat_action(
                            loop.loop_id,
                            PlayerAction(type="wait", move_to=chosen_dest),
                            options,
                        ),
                        on_success=_set_snapshot,
                    )


def _combat_player_pos(radar: dict[str, Any]) -> tuple[int, int] | None:
    for blip in radar.get("blips", []):
        if isinstance(blip, dict) and blip.get("faction") == "player":
            return int(blip.get("x", 0)), int(blip.get("y", 0))
    return None


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
    _render_script_window(scene.narration, key=f"dev-script:{scene.scene_id}")

    _render_assets(snapshot)
    _render_audio(snapshot)
    _render_echoes(loop)


def _render_audio(snapshot: RuntimeSnapshot) -> None:
    if snapshot.bgm_path and Path(snapshot.bgm_path).exists():
        st.audio(snapshot.bgm_path, format="audio/wav", autoplay=True, loop=True)


def _render_script_window(
    text: str,
    *,
    key: str,
    max_chars: int = 4200,
    placeholder=None,
) -> None:
    del key  # Kept for call-site stability if Streamlit native keyed containers are added later.
    block = _script_window_html(text, max_chars=max_chars)
    target = placeholder if placeholder is not None else st
    target.markdown(block, unsafe_allow_html=True)


def _script_window_html(text: str, max_chars: int = 4200) -> str:
    clipped = text[-max_chars:] if len(text) > max_chars else text
    prefix = "...\n" if len(text) > max_chars else ""
    escaped = html.escape(prefix + clipped).replace("\n", "<br>")
    # Rendered as plain markdown (no iframe) so reruns and streaming chunks swap
    # the inner HTML in place instead of reloading an iframe document — the iframe
    # reload was the white flash / flicker. `flex-direction: column-reverse` keeps
    # the newest text pinned to the bottom (CSS-only auto-scroll, no <script>).
    return (
        '<div style="box-sizing:border-box;height:372px;overflow-y:auto;'
        "padding:16px 18px;border:1px solid rgba(0,255,230,0.22);"
        "background:rgba(3,8,15,0.88);color:rgba(235,246,255,0.96);"
        "font-family:'SF Mono',Menlo,Consolas,monospace;font-size:15px;"
        "line-height:1.72;border-radius:6px;white-space:normal;"
        'display:flex;flex-direction:column-reverse;">'
        f"<div>{escaped}</div>"
        "</div>"
    )


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


def _run_stream_action(
    action,
    on_success,
    *,
    show_stream: bool = True,
    loading_label: str = "Loading...",
    stream_placeholder=None,
    initial_text: str = "",
) -> None:
    st.session_state.error = ""
    status = st.empty()
    _render_loader(status, loading_label)
    placeholder = stream_placeholder if show_stream else None
    streamed_text = ""
    base_text = initial_text.rstrip()
    if placeholder is not None and base_text:
        _render_script_window(base_text, key="stream-base", placeholder=placeholder)
    final_snapshot = None
    try:
        store = PostgresMythOSStore()
        try:
            service = RuntimeSessionService(store)
            for event in action(service):
                if not isinstance(event, RuntimeStreamEvent):
                    continue
                if event.kind == "text" and event.text:
                    streamed_text += event.text
                    if placeholder is not None:
                        combined = (
                            f"{base_text}\n\n{streamed_text}" if base_text else streamed_text
                        )
                        _render_script_window(combined, key="stream-live", placeholder=placeholder)
                elif event.kind == "final":
                    final_snapshot = event.snapshot
        finally:
            store.close()
        if final_snapshot is None:
            raise RuntimeError("stream ended without a final snapshot")
        status.empty()
        on_success(final_snapshot)
        st.rerun()
    except Exception as exc:
        _render_loader(status, "접속 실패", subline=str(exc))
        st.session_state.error = str(exc)


def _render_loader(target, label: str, *, subline: str | None = None) -> None:
    safe_label = html.escape(label)
    safe_subline = html.escape(subline or "world_state.sync pending")
    target.markdown(
        f"""
        <div class="mythos-loader">
          <div class="loader-line dim">MYTHOS_LOCAL_NODE :: STREAM HANDSHAKE</div>
          <div class="loader-line"><span class="loader-prompt">&gt;</span> {safe_label}<span class="loader-cursor"></span></div>
          <div class="loader-line dim">[00.117] player_intent.buffer :: locked</div>
          <div class="loader-line dim">[00.402] narrative_schema.scan :: active</div>
          <div class="loader-line dim">[00.719] {safe_subline}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


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


def _story_transcript(snapshot: RuntimeSnapshot) -> str:
    transcripts = st.session_state.setdefault("story_transcripts", {})
    existing = transcripts.get(snapshot.loop.loop_id)
    if isinstance(existing, dict):
        text = existing.get("text", "")
        if isinstance(text, str) and text.strip():
            return text
    if isinstance(existing, str) and existing.strip():
        return existing
    transcripts[snapshot.loop.loop_id] = {
        "text": snapshot.scene.narration,
        "last_scene_id": snapshot.scene.scene_id,
    }
    return snapshot.scene.narration


def _append_story_transcript(snapshot: RuntimeSnapshot, *, reset: bool = False) -> None:
    transcripts = st.session_state.setdefault("story_transcripts", {})
    loop_id = snapshot.loop.loop_id
    if reset:
        transcripts[loop_id] = {
            "text": snapshot.scene.narration[-STORY_TRANSCRIPT_LIMIT:],
            "last_scene_id": snapshot.scene.scene_id,
        }
        return

    existing = transcripts.get(loop_id)
    if isinstance(existing, dict):
        current_text = str(existing.get("text", ""))
        last_scene_id = str(existing.get("last_scene_id", ""))
    elif isinstance(existing, str):
        current_text = existing
        last_scene_id = ""
    else:
        current_text = ""
        last_scene_id = ""

    if last_scene_id == snapshot.scene.scene_id:
        return

    if not current_text.strip():
        updated = snapshot.scene.narration
    else:
        updated = f"{current_text.rstrip()}\n\n{snapshot.scene.narration}"

    if len(updated) > STORY_TRANSCRIPT_LIMIT:
        updated = updated[-STORY_TRANSCRIPT_LIMIT:]
        if not updated.startswith("..."):
            updated = f"...\n{updated}"

    transcripts[loop_id] = {
        "text": updated,
        "last_scene_id": snapshot.scene.scene_id,
    }


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
    encounter_map = loop.state.get("_encounter_map", {}) if isinstance(loop.state, dict) else {}
    contacts = encounter_map.get("contacts", {}) if isinstance(encounter_map, dict) else {}
    live_contacts = [
        contact
        for contact in contacts.values()
        if isinstance(contact, dict) and contact.get("state") not in {"defeated"}
    ]
    contacts_by_coord: dict[tuple[int, int], dict[str, Any]] = {
        (int(contact.get("x", 0)), int(contact.get("y", 0))): contact for contact in live_contacts
    }

    rows: list[str] = []
    for gy in range(cy + radius, cy - radius - 1, -1):  # north (higher y) on top
        cells: list[str] = []
        for gx in range(cx - radius, cx + radius + 1):
            key = by_coord.get((gx, gy))
            contact = contacts_by_coord.get((gx, gy))
            if contact is not None:
                glyph = html.escape(str(contact.get("glyph", "!")))
                name = html.escape(str(contact.get("name", "enemy contact")))
                cells.append(f'<div class="mm-cell mm-enemy" title="{name}">{glyph}</div>')
                continue
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
    .mm-enemy{background:#3a1018;border:1px solid #ff5a7a;color:#ff8aa1;
      box-shadow:0 0 8px rgba(255,90,122,.5);animation:mm-blink 1s steps(2,end) infinite}
    @keyframes mm-blink{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}
    </style>
    """
    minimap_html = '<div class="minimap">' + "".join(rows) + "</div>"
    st.markdown("작전 지도", help="방문한 위치의 동적 지도. 파란 칸이 현재 위치입니다.")
    st.markdown(style + minimap_html, unsafe_allow_html=True)
    st.caption(f"좌표 {cx}, {cy} · 탐사 {len(tiles)}곳 · 접촉 {len(live_contacts)} · {cur.get('name', '')}")


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


def _return_to_player_main(player_id: str) -> None:
    st.session_state.player_id = player_id
    st.session_state.pending_player_id_input = player_id
    st.session_state.loop_id = ""
    st.session_state.pending_loop_id_input = ""
    st.session_state.loop_id_input = ""
    st.session_state.show_session_intro = False
    st.session_state.combat_selected_unit = ""
    st.session_state.message = "메인 화면으로 돌아왔습니다."
    st.session_state.error = ""


def _set_snapshot(snapshot: RuntimeSnapshot) -> None:
    st.session_state.player_id = snapshot.player.player_id
    st.session_state.pending_player_id_input = snapshot.player.player_id
    st.session_state.loop_id = snapshot.loop.loop_id
    st.session_state.pending_loop_id_input = snapshot.loop.loop_id
    st.session_state.pending_free_action_input = ""
    st.session_state.pending_player_free_action = ""
    if snapshot.combat is None or snapshot.combat.get("finished"):
        st.session_state.combat_selected_unit = ""
    st.session_state.message = f"phase={snapshot.loop.phase.value}, scene={snapshot.scene.title}"
    if snapshot.image_result is not None:
        st.session_state.message += f", image={snapshot.image_result.status}"
    _append_story_transcript(snapshot)


def _set_new_loop_snapshot(snapshot: RuntimeSnapshot) -> None:
    _set_snapshot(snapshot)
    _append_story_transcript(snapshot, reset=True)
    st.session_state.show_session_intro = True


def _set_message(message: str) -> None:
    st.session_state.message = message
    st.session_state.error = ""


if __name__ == "__main__":
    main()
