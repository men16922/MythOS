from __future__ import annotations

import base64
import html
import json
from pathlib import Path
from typing import Any, TypedDict, cast

import streamlit as st

from mythos_combat import PlayerAction
from mythos_core import LoopPhase, LoopState, PlayerProfile, Scene, utc_now
from mythos_core.mapgrid import current_tile
from mythos_memory import PostgresMythOSStore
from mythos_runtime.combat_server import ensure_combat_server
from mythos_runtime.ending_resolver import EndingResolver
from mythos_runtime.options import (
    MemoryOverview,
    RunSummary,
    RuntimeOptions,
    RuntimeSnapshot,
    RuntimeStreamEvent,
    SaveSlot,
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
        _causality_monitor_panel()
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
    st.session_state.setdefault("hidden_combat_action", "")
    st.session_state.setdefault("hidden_combat_exit", "")
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
        /* Prevent image flicker during streamlit reruns */
        img {
            transition: opacity 0.25s ease-in-out;
        }
        /* Lock visual component boxes to avoid layout shifting */
        div[data-testid="stImage"] {
            min-height: 180px;
            background: rgba(0, 5, 4, 0.5);
            border-radius: 4px;
        }
        div[data-testid="stTextInput"]:has(input[aria-label="hidden_combat_action"]),
        div[data-testid="stTextInput"]:has(input[aria-label="hidden_combat_exit"]),
        .st-key-hidden_combat_action,
        .st-key-hidden_combat_exit {
            position: absolute !important;
            top: 0px !important;
            left: -9999px !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            opacity: 0.01 !important;
            pointer-events: auto !important;
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
        .opening-cinema {
            background:
                linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.78)),
                rgba(0, 10, 9, 0.9);
            border: 1px solid rgba(41, 255, 198, 0.34);
            border-radius: 6px;
            box-shadow: 0 0 32px rgba(41, 255, 198, 0.12);
            margin: 6px 0 18px;
            overflow: hidden;
            position: relative;
        }
        .opening-cinema-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr);
            gap: 1px;
            background: rgba(41, 255, 198, 0.22);
        }
        .opening-shot {
            background: #020706;
            min-height: 330px;
            overflow: hidden;
            position: relative;
        }
        .opening-shot:first-child {
            min-height: 410px;
        }
        .opening-shot img {
            filter: saturate(1.08) contrast(1.05);
            height: 100%;
            inset: 0;
            object-fit: cover;
            position: absolute;
            width: 100%;
        }
        .opening-shot::after {
            background:
                linear-gradient(180deg, transparent 20%, rgba(0, 0, 0, 0.82) 100%),
                repeating-linear-gradient(
                    0deg,
                    rgba(41, 255, 198, 0.08) 0,
                    rgba(41, 255, 198, 0.08) 1px,
                    transparent 2px,
                    transparent 5px
                );
            content: "";
            inset: 0;
            pointer-events: none;
            position: absolute;
        }
        .opening-shot-copy {
            bottom: 0;
            left: 0;
            padding: 18px;
            position: absolute;
            right: 0;
            z-index: 1;
        }
        .opening-shot-kicker {
            color: #29ffc6;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.72rem;
            font-weight: 800;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .opening-shot-title {
            color: #f2fffb;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 1.12rem;
            font-weight: 900;
            line-height: 1.35;
        }
        .opening-shot-body {
            color: #b8ded6;
            font-family: "SF Mono", Menlo, Consolas, monospace;
            font-size: 0.82rem;
            line-height: 1.55;
            margin-top: 10px;
        }
        @media (max-width: 900px) {
            .opening-cinema-grid {
                grid-template-columns: 1fr;
            }
            .opening-shot,
            .opening-shot:first-child {
                min-height: 340px;
            }
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
    slots = _load_save_slots(st.session_state.player_id) if st.session_state.player_id else []
    if slots:
        current_index = _index_for_save_slot(slots, st.session_state.loop_id)
        selected_slot_id = st.selectbox(
            "Active save slots",
            [slot.loop_id for slot in slots],
            index=current_index,
            format_func=lambda loop_id: _format_save_slot_option(slots, loop_id),
            key="selected_loop_id",
        )
        if st.button("Use Selected Loop", width="stretch"):
            _run_action(
                lambda service: service.resume(loop_id=selected_slot_id),
                on_success=_set_snapshot,
            )
    elif st.session_state.player_id:
        st.caption("No active save slots for this player yet.")

    with st.expander("Manual loop", expanded=not slots):
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


def _render_combat_simulator_inline(
    loop: LoopState | None, options: RuntimeOptions, player_id: str | None = None
) -> None:
    scenario = load_scenario(options.scenario_id)
    encounters = []
    if hasattr(scenario, "combat") and isinstance(scenario.combat, dict):
        encounters = list(scenario.combat.get("encounters", {}).keys())
    if not encounters:
        encounters = ["patrol_ambush", "sentinel_checkpoint", "enforcer_standoff", "wraith_glitch"]

    suffix = "_active" if loop else "_connect"
    st.divider()
    allies_pool = scenario.combat.get("allies", {}) if isinstance(scenario.combat, dict) else {}
    ally_options = list(allies_pool.keys()) if isinstance(allies_pool, dict) else []
    ally_labels = (
        {
            ally_id: str(entry.get("name", ally_id)) if isinstance(entry, dict) else ally_id
            for ally_id, entry in allies_pool.items()
        }
        if isinstance(allies_pool, dict)
        else {}
    )
    selected_encounter = st.selectbox(
        "전투 시뮬레이션 조우 선택",
        encounters,
        format_func=lambda x: {
            "patrol_ambush": "순찰 대원 매복 (patrol_ambush)",
            "sentinel_checkpoint": "감시 초소 검문 (sentinel_checkpoint)",
            "enforcer_standoff": "집행 부대 대치 (enforcer_standoff)",
            "wraith_glitch": "유령 글리치 조우 (wraith_glitch)",
        }.get(x, x),
        key=f"sim_selected_encounter{suffix}",
        label_visibility="collapsed",
    )
    selected_allies = st.multiselect(
        "시뮬레이션 동료",
        ally_options,
        default=[],
        format_func=lambda ally_id: ally_labels.get(ally_id, ally_id),
        key=f"sim_selected_allies{suffix}",
        placeholder="동료 없이 시작",
    )

    disabled = False
    if loop is None:
        disabled = not player_id

    if st.button(
        "⚔️ 전투 시뮬레이션 진입",
        key=f"btn_start_combat_sim{suffix}",
        use_container_width=True,
        disabled=disabled,
    ):
        party_members = [{"id": str(ally_id)} for ally_id in selected_allies]
        if loop:
            _run_action(
                lambda service: service.start_combat(
                    loop.loop_id,
                    selected_encounter,
                    options,
                    party_members=party_members or None,
                ),
                on_success=_set_snapshot,
            )
        else:
            _set_player(player_id or "")

            def action(service):
                snap = service.start_loop(player_id or "", options)
                combat_snap = service.start_combat(
                    snap.loop.loop_id,
                    selected_encounter,
                    options,
                    party_members=party_members or None,
                )
                return combat_snap

            _run_action(
                action,
                on_success=_set_snapshot,
            )
    st.divider()


def _memory_panel() -> None:
    if not st.session_state.player_id:
        return
    overview = _load_memory_overview(st.session_state.player_id)
    if overview is None:
        return

    st.subheader("Memory")
    if (
        not overview.world_archives
        and not overview.run_summaries
        and not overview.narrative_shards
        and not overview.novelty_notes
        and not overview.rollup
    ):
        st.caption("No cross-loop memory yet. Archive a loop to seed it.")
        return

    _render_run_history(overview.run_summaries, expanded=bool(overview.run_summaries))

    if overview.meta_progression:
        progress = overview.meta_progression
        with st.expander("Meta progression", expanded=False):
            st.write(
                f"runs {progress.get('runs_completed', 0)}, "
                f"clues {progress.get('total_clues', 0)}, "
                f"combat {progress.get('total_combats_won', 0)}W/"
                f"{progress.get('total_combats_lost', 0)}L"
            )
            unlock_lines = []
            for key in (
                "unlocked_traits",
                "unlocked_allies",
                "unlocked_starting_items",
                "codex_unlocks",
            ):
                values = progress.get(key)
                if isinstance(values, list) and values:
                    unlock_lines.append(f"{key}: " + ", ".join(str(value) for value in values))
            for line in unlock_lines:
                st.caption(line)

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


def _render_run_history(summaries: list[RunSummary], expanded: bool = False) -> None:
    with st.expander(f"기록 보관소 ({len(summaries)})", expanded=expanded):
        if summaries:
            for summary in summaries:
                ended = summary.ended_at.replace("T", " ").split("+", 1)[0]
                st.write(
                    f"**{summary.final_title}** — {summary.scenario_id} / "
                    f"{summary.ending_label} / {ended}"
                )
                st.caption(
                    f"turns {summary.turns}, stability {summary.stability}, "
                    f"tension {summary.tension}, combat {summary.combats_won}W/"
                    f"{summary.combats_lost}L"
                )
                if summary.summary_text:
                    st.write(summary.summary_text)
                details = []
                if summary.clues_collected:
                    details.append("clues: " + ", ".join(summary.clues_collected))
                if summary.allies_met:
                    details.append("allies: " + ", ".join(summary.allies_met))
                if summary.unlocks_granted:
                    details.append("unlocks: " + ", ".join(summary.unlocks_granted))
                if details:
                    st.caption(" / ".join(details))
        else:
            st.caption("None yet.")


def _causality_monitor_panel() -> None:
    if not st.session_state.loop_id:
        return
    snapshot = _load_current_snapshot()
    if snapshot is None or snapshot.loop is None:
        return

    loop = snapshot.loop
    st.subheader("Causality & NPC Agendas")

    # 1. Metric Scores
    overview = _load_memory_overview(loop.player_id)
    clue_count = 0
    if overview and overview.narrative_shards:
        clue_count = len(
            [s for s in overview.narrative_shards if s.kind == "clue" and s.loop_id == loop.loop_id]
        )

    scores = EndingResolver.calculate_scores(loop, clue_count)

    cols = st.columns(4)
    metrics = ["Humanity", "Insight", "Resilience", "Dominance"]
    colors = ["#4ade80", "#60a5fa", "#f472b6", "#fbbf24"]
    for col, metric, color in zip(cols, metrics, colors):
        score = scores.get(metric, 0)
        col.markdown(
            f"""
            <div style="background: rgba(0, 20, 17, 0.78); border: 1px solid {color}33; border-radius: 6px; padding: 10px; text-align: center;">
                <span style="color: {color}; font-weight: bold; font-size: 14px;">{metric}</span><br/>
                <span style="font-size: 24px; font-family: monospace; color: #d6fff6;">{score}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.write("")

    # 2. Flags & Butterfly Effects
    flags = loop.state.get("flags", [])
    with st.expander(f"Active Flags & Butterfly Effects ({len(flags)})", expanded=False):
        if flags:
            st.code("\n".join(flags), language="text")
        else:
            st.caption("No active flags in this loop.")

    # 3. NPC Agendas and Endings Check
    scenario_id = str(loop.state.get("scenario_id") or "neo-seoul")
    try:
        scenario = load_scenario(scenario_id)
        if scenario.endings:
            with st.expander(f"Endings & Conditions ({len(scenario.endings)})", expanded=False):
                for ending in scenario.endings:
                    ending_id = ending.get("id")
                    title = ending.get("title") or "Unnamed Ending"
                    condition = ending.get("condition") or "No condition"

                    resolved_id, resolved_label = EndingResolver.resolve_ending(
                        loop, scenario, clue_count
                    )
                    is_active = resolved_id == ending_id

                    color_tag = (
                        "color: #4ade80; font-weight: bold;" if is_active else "color: #6b7280;"
                    )
                    status_text = " [Active]" if is_active else ""

                    st.markdown(
                        f"""
                        <div style="padding: 4px 0;">
                            <span style="{color_tag}">• {title} ({ending_id}){status_text}</span><br/>
                            <code style="font-size: 11px; margin-left: 15px;">Condition: {condition}</code>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
    except Exception as e:
        st.error(f"Error loading ending monitor: {e}")


def _render_save_slot_status(loop: LoopState) -> None:
    slots = _load_save_slots(loop.player_id)
    current = next((slot for slot in slots if slot.loop_id == loop.loop_id), None)
    if current is None:
        st.caption("AUTOSAVE :: 슬롯 준비 중")
    else:
        saved_at = current.saved_at.replace("T", " ").split("+", 1)[0]
        combat_marker = " / 전투 중" if current.in_combat else ""
        st.caption(f"AUTOSAVE :: {saved_at} / {current.phase}{combat_marker}")
    if loop.phase is not LoopPhase.ENDED and st.button("SAVE", key=f"save_slot:{loop.loop_id}"):
        label = current.label if current is not None else "Manual Save"
        _run_action(
            lambda service: service.save_slot(loop.loop_id, label=label),
            on_success=lambda _slot: _set_message("저장 슬롯을 갱신했습니다."),
        )


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
    selected_slots: list[SaveSlot] = []
    scenario = load_scenario(options.scenario_id)
    archetype_names = [
        a.get("name") if isinstance(a, dict) else str(a) for a in scenario.archetypes
    ]
    default_archetype = str(archetype_names[0]) if archetype_names else "Unclassified"
    if players:
        selected = st.selectbox(
            _menu_copy(copy, "player_slot", "접속자 슬롯"),
            [player.player_id for player in players],
            index=_index_for_player(players, st.session_state.player_id),
            format_func=lambda player_id: _format_player_option(players, player_id),
            key="player_view_selected_player_id",
        )
        selected_slots = _load_save_slots(selected)
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
        ):
            name_value = str(st.session_state.get("player_new_name") or "First Connector")
            archetype_value = str(st.session_state.get("player_new_archetype") or default_archetype)

            def start_action(service):
                player_id = selected
                if not player_id:
                    player = service.create_player(
                        name_value,
                        traits={"archetype": archetype_value},
                        scenario_id=options.scenario_id,
                    )
                    player_id = player.player_id
                yield from service.stream_start_loop(player_id, options)

            _set_player(selected or "")
            _run_stream_action(
                start_action,
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
        selected_load_loop_id = None
        if selected_slots:
            selected_load_loop_id = st.selectbox(
                "LOAD SLOT",
                [slot.loop_id for slot in selected_slots],
                format_func=lambda loop_id: _format_save_slot_option(selected_slots, loop_id),
                key="player_load_slot",
                label_visibility="collapsed",
            )
        else:
            st.caption(
                "이어갈 활성 저장 슬롯이 없습니다. 새 게임을 시작하거나 기록 보관소를 확인하세요."
            )
        if st.button(
            _menu_copy(copy, "load_button", "이어하기"),
            width="stretch",
            disabled=selected is None or not selected_load_loop_id,
        ):
            _set_player(selected or "")
            _run_action(
                lambda service: service.resume(loop_id=selected_load_loop_id),
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

    _render_combat_simulator_inline(None, options, selected)
    if selected:
        _render_run_history(_load_run_summaries(selected), expanded=False)
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
        if not _render_opening_cinematic(intro, options.scenario_id):
            player_image = (
                PROJECT_ROOT / "resources" / options.scenario_id / _copy_str(copy, "player_image")
            )
            if player_image.exists():
                _render_blackout_frame(player_image)
        st.caption(f"BLACKOUT // {snapshot.scene.title}")


def _render_opening_cinematic(intro: dict[str, Any], scenario_id: str) -> bool:
    raw_shots = intro.get("cinematic_shots", [])
    if not isinstance(raw_shots, list):
        return False

    shot_markup = []
    for raw in raw_shots:
        if not isinstance(raw, dict):
            continue
        rel_image = str(raw.get("image", "")).strip()
        image_path = PROJECT_ROOT / "resources" / scenario_id / rel_image
        if not rel_image or not image_path.exists():
            continue
        encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
        shot_markup.append(
            f"""
            <div class="opening-shot">
              <img src="data:image/png;base64,{encoded}" alt="{html.escape(str(raw.get("title", "opening")))}" />
              <div class="opening-shot-copy">
                <div class="opening-shot-kicker">{html.escape(str(raw.get("kicker", "OPENING")))}</div>
                <div class="opening-shot-title">{html.escape(str(raw.get("title", "")))}</div>
                <div class="opening-shot-body">{html.escape(str(raw.get("body", "")))}</div>
              </div>
            </div>
            """
        )

    if not shot_markup:
        return False

    st.iframe(_opening_cinematic_html("".join(shot_markup)), height=560)
    return True


def _opening_cinematic_html(shots_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body {{
    background: transparent;
    margin: 0;
    overflow: hidden;
  }}
  .opening-cinema {{
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.78)),
      rgba(0, 10, 9, 0.9);
    border: 1px solid rgba(41, 255, 198, 0.34);
    border-radius: 6px;
    box-shadow: 0 0 32px rgba(41, 255, 198, 0.12);
    box-sizing: border-box;
    height: 560px;
    overflow: hidden;
    position: relative;
    width: 100%;
  }}
  .opening-cinema-grid {{
    background: rgba(41, 255, 198, 0.22);
    display: grid;
    gap: 1px;
    grid-template-columns: 1fr;
    height: 100%;
  }}
  .opening-shot {{
    background: #020706;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }}
  .opening-shot img {{
    filter: saturate(1.08) contrast(1.05);
    height: 100%;
    inset: 0;
    object-fit: cover;
    position: absolute;
    width: 100%;
  }}
  .opening-shot::after {{
    background:
      linear-gradient(180deg, transparent 20%, rgba(0, 0, 0, 0.82) 100%),
      repeating-linear-gradient(
        0deg,
        rgba(41, 255, 198, 0.08) 0,
        rgba(41, 255, 198, 0.08) 1px,
        transparent 2px,
        transparent 5px
      );
    content: "";
    inset: 0;
    pointer-events: none;
    position: absolute;
  }}
  .opening-shot-copy {{
    bottom: 0;
    left: 0;
    padding: 16px;
    position: absolute;
    right: 0;
    z-index: 1;
  }}
  .opening-shot-kicker {{
    color: #29ffc6;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.68rem;
    font-weight: 800;
    margin-bottom: 6px;
    text-transform: uppercase;
  }}
  .opening-shot-title {{
    color: #f2fffb;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 1rem;
    font-weight: 900;
    line-height: 1.35;
  }}
  .opening-shot-body {{
    color: #b8ded6;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.76rem;
    line-height: 1.5;
    margin-top: 8px;
  }}
</style>
</head>
<body>
  <div class="opening-cinema">
    <div class="opening-cinema-grid">
      {shots_html}
    </div>
  </div>
</body>
</html>"""


def _player_active_screen(snapshot: RuntimeSnapshot, options: RuntimeOptions) -> None:
    loop = snapshot.loop
    scene = snapshot.scene
    combat = snapshot.combat

    # Process hidden drag-and-drop or click combat actions (only for non-combat states, though normally combat only)
    if not combat:
        hidden_action = st.session_state.get("hidden_combat_action", "")
        if hidden_action:
            st.session_state.hidden_combat_action = ""
            try:
                action_data = json.loads(hidden_action)
                if action_data.get("type") == "select":
                    selected = st.session_state.get("combat_selected_unit") == "player"
                    st.session_state.combat_selected_unit = "" if selected else "player"
                    st.rerun()
            except Exception as e:
                st.error(f"Action error: {e}")

    tab_story, tab_codex = st.tabs(["서사 접속", "Codex (기억의 별자리)"])

    with tab_story:
        story_col, dossier_col = st.columns([0.68, 0.32], gap="large")
        with story_col:
            if combat:
                _render_save_slot_status(loop)
                # Delegate all combat board, controls, logs, and local actions to the isolated fragment
                _render_combat_arena_fragment(options)
            else:
                _render_player_image(snapshot)
                st.header(scene.title)
                st.markdown(
                    f'<div class="status-line">{_scene_status_line(snapshot)}</div>',
                    unsafe_allow_html=True,
                )
                _render_hud(loop, scene)
                _render_save_slot_status(loop)
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
                            snapshot.player.traits
                            if isinstance(snapshot.player.traits, dict)
                            else {}
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
                    # Wrap the interactive controls so they can be cleared the moment
                    # an action is taken: the choices / free-action input disappear
                    # while the next scene streams in, then reappear on rerun.
                    action_area = st.empty()
                    pending_choice_id: str | None = None
                    pending_action: str | None = None
                    restricted_action = False
                    aggressive_verbs = ["파괴", "삭제", "살해", "공격", "재작성", "지배"]
                    traits = (
                        snapshot.player.traits if isinstance(snapshot.player.traits, dict) else {}
                    )
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

    # Render audio at the very end to prevent UI layout jumps and shifting
    _render_audio(snapshot)


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


_COMBAT_BOARD_CSS = """
    html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; user-select: none; -webkit-user-select: none; }
    .tac-live-wrap { background: rgba(2, 10, 9, 0.96); border: 1px solid rgba(41, 255, 198, 0.38); border-radius: 6px; padding: 12px; color: #d8fff7; margin-bottom: 12px; }
    .tac-live-head { font: 800 12px 'SF Mono', Menlo, monospace; color: #29ffc6; letter-spacing: 1px; margin-bottom: 8px; }
    .tac-live-help { font: 11px 'SF Mono', Menlo, monospace; color: #8fd8ca; margin-bottom: 8px; }
    .tac-board-js { display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center; background: rgba(2, 10, 9, 0.96); border: 1px solid rgba(41, 255, 198, 0.38); border-radius: 6px; padding: 12px; margin-bottom: 12px; }
    .tac-row-js { display: flex; flex-direction: row; gap: 4px; }
    .tac-cell-js { position: relative; width: 44px; height: 44px; border-radius: 5px; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: default; box-sizing: border-box; }
    .tac-cell-js * { pointer-events: none !important; }
    .tac-cell-js.tac-empty { background: #071211; border: 1px solid #12231f; }
    .tac-cell-js.tac-player { background: #082720; border: 1px solid #29ffc6; box-shadow: 0 0 10px rgba(41, 255, 198, 0.35); cursor: grab; }
    .tac-cell-js.tac-player:active { cursor: grabbing; }
    .tac-cell-js.tac-player.tac-selected { border: 2px solid #29ffc6 !important; box-shadow: 0 0 15px rgba(41, 255, 198, 0.8) !important; }
    .tac-cell-js.tac-enemy { background: #2a0710; border: 1px solid #ff5a7a; box-shadow: 0 0 10px rgba(255, 90, 122, 0.28); animation: tac-pulse-live 1.15s steps(2, end) infinite; }
    .tac-cell-js.tac-ally { background: #07182a; border: 1px solid #5aa0ff; }
    .tac-cell-js img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .tac-cell-js .tac-glyph { font: 900 18px 'SF Mono', Menlo, monospace; }
    .tac-cell-js .tac-hp { position: absolute; left: 4px; right: 4px; bottom: 4px; height: 4px; background: rgba(0, 0, 0, 0.65); }
    .tac-cell-js .tac-hp span { display: block; height: 4px; background: #29ffc6; }
    .tac-cell-js.tac-enemy .tac-hp span { background: #ff5a7a; }
    .tac-cell-js.tac-reachable { background: rgba(41, 255, 198, 0.15) !important; border: 1px dashed rgba(41, 255, 198, 0.8) !important; box-shadow: 0 0 8px rgba(41, 255, 198, 0.25) !important; cursor: pointer; }
    .tac-cell-js.tac-reachable:hover { background: rgba(41, 255, 198, 0.3) !important; border-color: #29ffc6 !important; box-shadow: 0 0 12px rgba(41, 255, 198, 0.8) !important; }
    .tac-cell-js.tac-reachable-inactive { background: rgba(41, 255, 198, 0.05) !important; border: 1px dashed rgba(41, 255, 198, 0.3) !important; }
    .tac-cell-js.tac-reachable.drag-active { border: 1.5px dashed #29ffc6 !important; animation: neon-glow-pulse 1.3s infinite alternate !important; }
    .tac-cell-js.tac-reachable.drag-over { background: rgba(41, 255, 198, 0.45) !important; border: 2px solid #29ffc6 !important; box-shadow: 0 0 20px rgba(41, 255, 198, 1) !important; animation: none !important; }
    @keyframes tac-pulse-live { 0% { opacity: 1; } 50% { opacity: 0.72; } 100% { opacity: 1; } }
    @keyframes neon-glow-pulse {
        0% { background: rgba(41, 255, 198, 0.1); box-shadow: 0 0 4px rgba(41, 255, 198, 0.15); border-color: rgba(41, 255, 198, 0.4); }
        100% { background: rgba(41, 255, 198, 0.3); box-shadow: 0 0 12px rgba(41, 255, 198, 0.75); border-color: rgba(41, 255, 198, 1); }
    }
"""

_COMBAT_BOARD_JS = """
    (function() {
        function playSfx(key) {
            if (!key) return;
            const src = (window.__SFX__ && window.__SFX__[key]) ? window.__SFX__[key] : null;
            if (!src) return;
            const audio = new Audio(src);
            audio.volume = 0.7;
            audio.play().catch(e => console.warn("Local SFX play failed:", e));
        }

        function updateBoardUI(data) {
            const radar = data.radar || {};
            const reachable = data.reachable || [];
            const selected = data.selected || false;
            const title = data.title || "";

            document.querySelector('.tac-live-head').textContent = `TACTICAL BOARD :: ${title}`;

            const arena = radar.arena || {w: 8, h: 6};
            const w = parseInt(arena.w), h = parseInt(arena.h);
            const reachableSet = new Set(reachable.map(tile => `${tile[0]},${tile[1]}`));

            const blips = radar.blips || [];
            const byCell = {};
            blips.forEach(blip => {
                if (blip.alive !== false) {
                    const x = parseInt(blip.x || 0);
                    const y = parseInt(blip.y || 0);
                    byCell[`${x},${y}`] = blip;
                }
            });

            const boardContainer = document.querySelector('.tac-board-js');
            boardContainer.innerHTML = '';

            for (let y = h - 1; y >= 0; y--) {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'tac-row-js';

                for (let x = 0; x < w; x++) {
                    const coordKey = `${x},${y}`;
                    const blip = byCell[coordKey];
                    const isPlayer = !!(blip && blip.faction === 'player');
                    const isReachable = reachableSet.has(coordKey);

                    const cellDiv = document.createElement('div');
                    cellDiv.className = 'tac-cell-js';
                    cellDiv.dataset.x = x;
                    cellDiv.dataset.y = y;

                    let cellContent = '';

                    if (blip) {
                        const faction = blip.faction || '';
                        cellDiv.classList.add(`tac-${faction}`);
                        if (isPlayer && selected) { cellDiv.classList.add('tac-selected'); }
                        cellDiv.setAttribute('title', blip.name || '');
                        cellDiv.setAttribute('draggable', isPlayer ? 'true' : 'false');

                        let avatar = '';
                        if (blip.portrait_uri) {
                            avatar = `<img src="${blip.portrait_uri}" alt="" class="tac-portrait-img" draggable="false" />`;
                        } else if (blip.glyph) {
                            avatar = `<span class="tac-glyph">${blip.glyph}</span>`;
                        } else {
                            avatar = `<span class="tac-glyph">●</span>`;
                        }

                        const hp = parseInt(blip.hp || 0);
                        const maxHp = Math.max(1, parseInt(blip.max_hp || 1));
                        const pct = Math.max(0, Math.min(100, Math.floor((hp / maxHp) * 100)));

                        cellContent = `${avatar}<div class="tac-hp"><span style="width:${pct}%"></span></div>`;
                    } else {
                        cellDiv.setAttribute('draggable', 'false');
                        if (selected && isReachable) {
                            cellDiv.className = 'tac-cell-js tac-empty tac-reachable';
                            cellDiv.setAttribute('title', `이동 가능 ${x},${y}`);
                        } else if (isReachable) {
                            cellDiv.className = 'tac-cell-js tac-empty tac-reachable-inactive';
                        } else {
                            cellDiv.className = 'tac-cell-js tac-empty';
                        }
                    }

                    cellDiv.innerHTML = cellContent;
                    rowDiv.appendChild(cellDiv);
                }
                boardContainer.appendChild(rowDiv);
            }

            if (data.play_sfx) { playSfx(data.play_sfx); }
        }

        document.addEventListener('click', function(e) {
            const cell = e.target.closest('.tac-cell-js');
            if (!cell) return;
            if (cell.classList.contains('tac-player')) {
                sendCombatAction({type: "select", unit: "player"});
            } else if (cell.classList.contains('tac-reachable')) {
                const x = parseInt(cell.dataset.x);
                const y = parseInt(cell.dataset.y);
                playSfx('sfx_move');
                sendCombatAction({type: "move", x: x, y: y});
            }
        });

        document.addEventListener('dragstart', function(e) {
            const cell = e.target.closest('.tac-cell-js.tac-player');
            if (cell) {
                e.dataTransfer.setData('text/plain', 'player');
                e.dataTransfer.effectAllowed = 'move';
                document.querySelectorAll('.tac-cell-js.tac-reachable, .tac-cell-js.tac-reachable-inactive').forEach(c => {
                    c.classList.add('tac-reachable-temp');
                    c.classList.add('tac-reachable');
                    c.classList.add('drag-active');
                });
            }
        });

        document.addEventListener('dragend', function(e) {
            document.querySelectorAll('.tac-cell-js.tac-reachable-temp').forEach(c => {
                c.classList.remove('tac-reachable-temp');
                if (c.classList.contains('tac-reachable-inactive')) { c.classList.remove('tac-reachable'); }
                c.classList.remove('drag-active');
                c.classList.remove('drag-over');
            });
            document.querySelectorAll('.tac-cell-js.tac-reachable').forEach(c => {
                c.classList.remove('drag-active');
                c.classList.remove('drag-over');
            });
            window.currentDragOverCell = null;
        });

        document.addEventListener('dragover', function(e) {
            const cell = e.target.closest('.tac-cell-js.tac-reachable');
            if (cell) {
                e.preventDefault();
                cell.classList.add('drag-over');
                window.currentDragOverCell = cell;
            }
        });

        document.addEventListener('dragleave', function(e) {
            const cell = e.target.closest('.tac-cell-js.tac-reachable');
            if (cell) {
                cell.classList.remove('drag-over');
                if (window.currentDragOverCell === cell) { window.currentDragOverCell = null; }
            }
        });

        document.addEventListener('drop', function(e) {
            e.preventDefault();
            const cell = window.currentDragOverCell;
            if (cell) {
                const x = parseInt(cell.dataset.x);
                const y = parseInt(cell.dataset.y);
                document.querySelectorAll('.tac-cell-js.tac-reachable-temp').forEach(c => {
                    c.classList.remove('tac-reachable-temp');
                    if (c.classList.contains('tac-reachable-inactive')) { c.classList.remove('tac-reachable'); }
                    c.classList.remove('drag-active');
                    c.classList.remove('drag-over');
                });
                window.currentDragOverCell = null;
                playSfx('sfx_move');
                sendCombatAction({type: "move", x: x, y: y});
            }
        });

        function sendCombatAction(actionData) {
            let parentDoc;
            try { parentDoc = window.parent.document; } catch (err) {
                console.error("Cannot reach parent document:", err); return;
            }
            let input = parentDoc.querySelector('input[aria-label="hidden_combat_action"]');
            if (!input) {
                const containers = parentDoc.querySelectorAll('[data-testid="stTextInput"]');
                for (const container of containers) {
                    const label = container.querySelector('label');
                    if (label && label.textContent.trim() === 'hidden_combat_action') {
                        input = container.querySelector('input');
                        if (input) break;
                    }
                }
            }
            if (input) {
                input.focus();
                const nativeInputValueSetter = window.parent.Object.getOwnPropertyDescriptor(window.parent.HTMLInputElement.prototype, "value").set;
                nativeInputValueSetter.call(input, JSON.stringify(actionData));
                input.dispatchEvent(new window.parent.Event('input', { bubbles: true }));
                input.dispatchEvent(new window.parent.Event('change', { bubbles: true }));
                ['keydown', 'keypress', 'keyup'].forEach(evtType => {
                    input.dispatchEvent(new window.parent.KeyboardEvent(evtType, {
                        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
                    }));
                });
                input.blur();
            } else {
                console.error("Combat Action Target Input not found in parent document.");
            }
        }

        if (window.__COMBAT_DATA__) { updateBoardUI(window.__COMBAT_DATA__); }
    })();
"""


def _build_interactive_board_html(data_payload: dict[str, Any], sfx_map: dict[str, str]) -> str:
    """Build the full self-contained tactical board HTML for components.html.

    Data and SFX (as base64 data URIs) are injected inline so the board renders
    inside a same-origin srcdoc iframe with no external static server, while still
    reaching ``window.parent.document`` to submit actions.
    """

    def _safe_json(obj: Any) -> str:
        # Avoid breaking out of the <script> context.
        return json.dumps(obj).replace("</", "<\\/")

    injected = (
        "<script>"
        f"window.__COMBAT_DATA__ = {_safe_json(data_payload)};"
        f"window.__SFX__ = {_safe_json(sfx_map)};"
        "</script>"
    )
    return (
        "<!DOCTYPE html><html><head><meta charset='utf-8' />"
        f"<style>{_COMBAT_BOARD_CSS}</style>{injected}</head><body>"
        '<div class="tac-live-wrap">'
        '<div class="tac-live-head">TACTICAL BOARD :: LOADING</div>'
        '<div class="tac-live-help">드래그 앤 드롭으로 캐릭터를 끌어다 놓거나, '
        "클릭 후 강조된 경로를 눌러 바로 이동합니다.</div></div>"
        '<div class="tac-board-js"></div>'
        f"<script>{_COMBAT_BOARD_JS}</script>"
        "</body></html>"
    )


def _render_tactical_board_interactive(
    loop: LoopState, combat: dict[str, Any], options: RuntimeOptions
) -> None:
    try:
        radar = combat.get("radar", {})
        if not isinstance(radar, dict):
            st.warning("전술 레이더 신호 분석 실패")
            return
        available = combat.get("available", {})
        reachable = available.get("reachable", []) if isinstance(available, dict) else []
        selected = st.session_state.get("combat_selected_unit") == "player"
        title = f"ROUND // {int(radar.get('round', 1)):02d}"

        # Build list of blips with computed portrait data URIs (embedded inline)
        blips = [blip for blip in radar.get("blips", []) if isinstance(blip, dict)]
        blips_payload = []
        for blip in blips:
            p_uri = _combat_portrait_data_uri(blip, options.scenario_id)
            blip_copy = dict(blip)
            blip_copy["portrait_uri"] = p_uri
            blips_payload.append(blip_copy)

        # Gather and consume the transient play_sfx
        play_sfx = st.session_state.get("play_sfx")
        if play_sfx:
            st.session_state.play_sfx = None

        radar_payload = dict(radar)
        radar_payload["blips"] = blips_payload

        data_payload = {
            "radar": radar_payload,
            "reachable": [
                [int(tile[0]), int(tile[1])]
                for tile in reachable
                if isinstance(tile, list) and len(tile) == 2
            ],
            "selected": selected,
            "title": title,
            "play_sfx": play_sfx,
        }

        # SFX as base64 data URIs so they work inside a srcdoc iframe (no static server)
        sfx_keys = {"sfx_move"}
        if play_sfx:
            sfx_keys.add(play_sfx)
        sfx_map = {key: _get_b64_sfx(key) for key in sfx_keys}
        sfx_map = {key: uri for key, uri in sfx_map.items() if uri}

        # Hidden text input to catch action callbacks from within the iframe.
        # The board (rendered via st.iframe as a same-origin srcdoc iframe)
        # reaches window.parent.document to set this value and dispatch Enter.
        # Collapsed label so the input carries aria-label="hidden_combat_action",
        # which the off-screen hiding CSS targets (otherwise it shows as a white box).
        st.text_input(
            "hidden_combat_action",
            key="hidden_combat_action",
            label_visibility="collapsed",
        )

        board_html = _build_interactive_board_html(data_payload, sfx_map)
        st.iframe(board_html, height=430)
    except Exception as e:
        st.error(f"전술 보드 렌더링 예외 발생: {e}")


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
    title = (
        f"OUTCOME // {html.escape(str(outcome))}"
        if outcome
        else f"ROUND // {int(radar.get('round', 1)):02d}"
    )
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
    outcome_display = {
        "player_victory": "VICTORY",
        "player_defeat": "DEFEAT",
        "fled": "ESCAPE",
    }.get(outcome_raw, outcome_raw.upper())
    rewards = combat.get("rewards", {})
    items = rewards.get("items", []) if isinstance(rewards, dict) else []
    radar = combat.get("radar", {})
    blips = (
        [blip for blip in radar.get("blips", []) if isinstance(blip, dict)]
        if isinstance(radar, dict)
        else []
    )
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
    outcome_class = {
        "player_victory": "outcome-victory",
        "player_defeat": "outcome-defeat",
        "fled": "outcome-fled",
    }.get(outcome_raw, "outcome-victory")

    result_label = {
        "player_victory": "교전 승리 (VICTORY)",
        "fled": "전술 이탈 (FLED)",
        "player_defeat": "신호 소실 (DEFEAT)",
    }.get(outcome_raw, "교전 종료 (RESOLVED)")

    loot_badges = []
    if items:
        for item in items:
            item_name = str(item)
            item_class = "loot-item-tech"
            if "nanopatch" in item_name.lower():
                item_class = "loot-item-medical"
            elif "shard" in item_name.lower():
                item_class = "loot-item-data"
            loot_badges.append(
                f'<span class="loot-badge {item_class}">{html.escape(item_name)}</span>'
            )
        loot_html = f'<div class="loot-container">{"".join(loot_badges)}</div>'
    else:
        loot_html = (
            '<div class="loot-container"><span class="loot-badge loot-none">없음</span></div>'
        )

    verdict_badge = f'<div class="combat-verdict-badge">{html.escape(verdict)}</div>'

    st.markdown(
        "<style>"
        ".combat-result{border:1px solid rgba(41,255,198,.42);background:linear-gradient(180deg,rgba(2,21,18,.98),rgba(1,8,7,.98));border-radius:8px;padding:18px;color:#d8fff7;box-shadow:0 0 25px rgba(0, 255, 170, 0.15);font-family:'SF Mono',Menlo,Consolas,monospace}"
        ".combat-result.outcome-defeat{border-color:rgba(255,90,122,.5);background:linear-gradient(180deg,rgba(30,5,10,.98),rgba(10,2,4,.98));box-shadow:0 0 25px rgba(255, 90, 122, 0.15)}"
        ".combat-result.outcome-fled{border-color:rgba(255,180,50,.5);background:linear-gradient(180deg,rgba(25,15,5,.98),rgba(8,5,2,.98));box-shadow:0 0 25px rgba(255, 180, 50, 0.15)}"
        ".combat-result-top{display:flex;gap:16px;align-items:center;margin-bottom:16px}"
        ".combat-result-portrait{width:74px;height:74px;position:relative;flex:0 0 74px;border:1px solid rgba(41,255,198,.45);background:#020b0a;overflow:hidden;border-radius:5px;box-shadow:0 0 12px rgba(41,255,198,.15)}"
        ".outcome-defeat .combat-result-portrait{border-color:rgba(255,90,122,.45);box-shadow:0 0 12px rgba(255,90,122,.15)}"
        ".outcome-fled .combat-result-portrait{border-color:rgba(255,180,50,.45);box-shadow:0 0 12px rgba(255,180,50,.15)}"
        ".combat-result-portrait img{width:100%;height:100%;object-fit:cover;display:block;filter:contrast(1.12) saturate(1.08)}"
        ".combat-result-portrait-label{position:absolute;left:4px;right:4px;bottom:4px;font:800 9px 'SF Mono',Menlo,monospace;color:#eafff9;background:rgba(0,0,0,.62);padding:2px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
        ".combat-result-heading{min-width:0;flex:1}"
        ".combat-result-kicker{font:800 11px 'SF Mono',Menlo,monospace;color:#29ffc6;letter-spacing:1px;margin-bottom:4px}"
        ".outcome-defeat .combat-result-kicker{color:#ff5a7a}"
        ".outcome-fled .combat-result-kicker{color:#ffb432}"
        ".combat-result-title{font:900 24px 'SF Mono',Menlo,monospace;color:#eafff9;margin-bottom:4px;letter-spacing:1px;text-shadow:0 0 8px rgba(255,255,255,0.2)}"
        ".outcome-victory .combat-result-title{color:#29ffc6;text-shadow:0 0 10px rgba(41,255,198,0.4)}"
        ".outcome-defeat .combat-result-title{color:#ff5a7a;text-shadow:0 0 10px rgba(255,90,122,0.4)}"
        ".outcome-fled .combat-result-title{color:#ffb432;text-shadow:0 0 10px rgba(255,180,50,0.4)}"
        ".combat-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}"
        ".combat-result-stat{border:1px solid rgba(120,220,200,.22);background:rgba(5,18,17,.72);border-radius:5px;padding:10px}"
        ".outcome-defeat .combat-result-stat{border-color:rgba(255,90,122,.15);background:rgba(18,5,8,.72)}"
        ".outcome-fled .combat-result-stat{border-color:rgba(255,180,50,.15);background:rgba(18,12,5,.72)}"
        ".combat-result-label{font:800 10px 'SF Mono',Menlo,monospace;color:#78cfc0;letter-spacing:.5px}"
        ".outcome-defeat .combat-result-label{color:#ff8aa1}"
        ".outcome-fled .combat-result-label{color:#ffcf8a}"
        ".combat-result-value{font:900 16px 'SF Mono',Menlo,monospace;color:#eafff9;margin-top:4px}"
        ".combat-verdict-badge{border-left:4px solid #29ffc6;background:rgba(41,255,198,0.08);padding:10px 14px;font-size:12px;font-weight:700;line-height:1.5;color:#eafff9;margin:12px 0;border-radius:0 4px 4px 0}"
        ".outcome-defeat .combat-verdict-badge{border-left-color:#ff5a7a;background:rgba(255,90,122,0.08)}"
        ".outcome-fled .combat-verdict-badge{border-left-color:#ffb432;background:rgba(255,180,50,0.08)}"
        ".loot-section{margin-top:16px;padding:12px;background:rgba(2,10,9,0.5);border:1px solid rgba(41,255,198,0.18);border-radius:6px}"
        ".outcome-defeat .loot-section{background:rgba(10,2,4,0.5);border-color:rgba(255,90,122,0.15)}"
        ".outcome-fled .loot-section{background:rgba(8,5,2,0.5);border-color:rgba(255,180,50,0.15)}"
        ".loot-section-title{font:800 11px 'SF Mono',Menlo,monospace;color:#29ffc6;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px}"
        ".outcome-defeat .loot-section-title{color:#ff5a7a}"
        ".outcome-fled .loot-section-title{color:#ffb432}"
        ".loot-container{display:flex;flex-wrap:wrap;gap:6px}"
        ".loot-badge{display:inline-block;padding:4px 10px;border-radius:3px;font-size:12px;font-weight:800;border:1px solid}"
        ".loot-item-tech{background:rgba(41, 255, 198, 0.1);color:#29ffc6;border-color:rgba(41, 255, 198, 0.4);box-shadow:0 0 8px rgba(41, 255, 198, 0.2)}"
        ".loot-item-medical{background:rgba(0, 180, 255, 0.1);color:#00b4ff;border-color:rgba(0, 180, 255, 0.4);box-shadow:0 0 8px rgba(0, 180, 255, 0.2)}"
        ".loot-item-data{background:rgba(180, 100, 255, 0.1);color:#b464ff;border-color:rgba(180, 100, 255, 0.4);box-shadow:0 0 8px rgba(180, 100, 255, 0.2)}"
        ".loot-none{background:rgba(255, 255, 255, 0.05);color:#8fd8ca;border-color:rgba(255, 255, 255, 0.1)}"
        ".combat-result-copy{font:12px 'SF Mono',Menlo,monospace;color:#9eddd1;line-height:1.5;margin-top:12px}"
        "</style>"
        f'<div class="combat-result {outcome_class}"><div class="combat-result-top">{player_portrait}'
        f'<div class="combat-result-heading"><div class="combat-result-kicker">COMBAT RESULT :: {outcome_display}</div>'
        f'<div class="combat-result-title">{html.escape(result_label)}</div></div></div>'
        '<div class="combat-result-grid">'
        f'<div class="combat-result-stat"><div class="combat-result-label">PARTY ONLINE</div><div class="combat-result-value">{survivors}/{len(party)}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">HOSTILES DOWN</div><div class="combat-result-value">{defeated}/{len(enemies)}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">PLAYER HP</div><div class="combat-result-value">{html.escape(hp_label)}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">ROUND / TURN</div><div class="combat-result-value">{rounds}/{turns}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">DAMAGE DEALT</div><div class="combat-result-value">{damage_dealt}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">DAMAGE TAKEN</div><div class="combat-result-value">{damage_taken}</div></div>'
        f'<div class="combat-result-stat"><div class="combat-result-label">HIT / MISS / CRIT</div><div class="combat-result-value">{hits}/{misses}/{crits}</div></div>'
        "</div>"
        f"{verdict_badge}"
        f'<div class="loot-section"><div class="loot-section-title">LOOT / ACQUIRED ASSETS</div>{loot_html}</div>'
        '<div class="combat-result-copy">전투 기록을 정산하고 서사 루프를 다음 장면으로 넘길 수 있습니다.</div></div>',
        unsafe_allow_html=True,
    )
    if outcome_raw == "player_defeat" or loop.phase is LoopPhase.ENDED:
        if st.button(
            "메인 화면으로 돌아가기", key=f"combat_return_home:{loop.loop_id}", width="stretch"
        ):
            _return_to_player_main(loop.player_id)
            st.rerun()
        return
    if st.button(
        "전투 정산 후 다음 장면으로 진행", key=f"combat_continue:{loop.loop_id}", width="stretch"
    ):
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
        pos = f"{int(blip.get('x', 0))},{int(blip.get('y', 0))}"
        cards.append(
            f'<div class="roster-card{dead}">{avatar}<div class="roster-main">'
            f'<div class="roster-name">{name}</div>'
            f'<div class="roster-hp"><span style="width:{pct}%"></span></div>'
            f'<div class="roster-meta">HP {hp}/{max_hp} · POS {pos}</div>'
            f"</div></div>"
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
    is_fragment: bool = False,
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

    run_fn = _run_combat_action if is_fragment else _run_action

    def _dispatch(action_lambda) -> None:
        # Run the combat action then force a refresh so the board, roster and
        # controls redraw with the new state. Without the rerun the emptied
        # action_area stays blank and the board shows the pre-action snapshot.
        run_fn(action_lambda, on_success=_set_snapshot)
        if is_fragment:
            st.rerun(scope="fragment")
        else:
            st.rerun()

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
                f"{'IN RANGE' if in_range else 'OUT OF RANGE'}</div></div>",
                unsafe_allow_html=True,
            )
            if st.button(
                "공격",
                key=f"combat_attack:{loop.loop_id}:{target_id}:{index}",
                width="stretch",
                disabled=not in_range,
            ):
                st.session_state.play_sfx = "sfx_attack"
                action_area.empty()
                _dispatch(
                    lambda service, chosen_id=target_id: service.combat_action(
                        loop.loop_id,
                        PlayerAction(type="attack", target_id=chosen_id),
                        options,
                    )
                )

    # --- Focus + skills + items ---------------------------------------
    focus = int(available.get("focus", 0))
    max_focus = int(available.get("max_focus", 0))
    skill_states = [s for s in available.get("skills", []) if isinstance(s, dict)]
    scenario = load_scenario(options.scenario_id)
    combat_pool = scenario.combat if isinstance(scenario.combat, dict) else {}
    skill_defs = combat_pool.get("skills", {})
    item_defs = combat_pool.get("items", {})

    inventory = list(loop.state.get("_inventory", [])) if isinstance(loop.state, dict) else []
    inv_counts: dict[str, int] = {}
    inv_names: dict[str, str] = {}
    for entry in inventory:
        iid = str(entry.get("id", "")) if isinstance(entry, dict) else str(entry)
        if not iid:
            continue
        inv_counts[iid] = inv_counts.get(iid, 0) + 1
        if isinstance(entry, dict) and entry.get("name"):
            inv_names[iid] = str(entry["name"])

    if max_focus:
        st.caption(f"집중(Focus) ◆ {focus}/{max_focus}")

    if skill_states:
        st.caption("스킬")
        for skill_state in skill_states:
            sid = str(skill_state.get("id", ""))
            sdef = skill_defs.get(sid, {}) if isinstance(skill_defs.get(sid), dict) else {}
            sname = str(sdef.get("name", sid))
            cd = int(skill_state.get("cooldown", 0))
            cost = sdef.get("cost", {}) if isinstance(sdef.get("cost"), dict) else {}
            focus_cost = int(cost.get("focus", 0))
            item_cost = cost.get("item")
            reasons: list[str] = []
            if cd > 0:
                reasons.append(f"재충전 R-{cd}")
            if focus_cost > focus:
                reasons.append("집중 부족")
            if item_cost and inv_counts.get(str(item_cost), 0) <= 0:
                reasons.append(f"{item_cost} 없음")
            cost_bits = []
            if focus_cost:
                cost_bits.append(f"◆{focus_cost}")
            if item_cost:
                cost_bits.append(str(item_cost))
            label = sname + (f"  ({' · '.join(cost_bits)})" if cost_bits else "")
            if st.button(
                label,
                key=f"combat_skill:{loop.loop_id}:{sid}",
                width="stretch",
                disabled=bool(reasons),
                help=" / ".join(reasons) if reasons else str(sdef.get("role", "")),
            ):
                st.session_state.play_sfx = "sfx_attack"
                action_area.empty()
                _dispatch(
                    lambda service, chosen=sid: service.combat_action(
                        loop.loop_id,
                        PlayerAction(type="skill", skill_id=chosen),
                        options,
                    )
                )

    consumable_ids = [
        iid
        for iid in inv_counts
        if isinstance(item_defs.get(iid), dict) and item_defs[iid].get("kind") == "consumable"
    ]
    if consumable_ids:
        st.caption("아이템")
        for iid in consumable_ids:
            idef = item_defs[iid]
            iname = inv_names.get(iid, str(idef.get("name", iid)))
            count = inv_counts.get(iid, 0)
            if st.button(
                f"{iname} ×{count}",
                key=f"combat_item:{loop.loop_id}:{iid}",
                width="stretch",
            ):
                st.session_state.play_sfx = "sfx_defend"
                action_area.empty()
                _dispatch(
                    lambda service, chosen=iid: service.combat_action(
                        loop.loop_id,
                        PlayerAction(type="item", item_id=chosen),
                        options,
                    )
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
            st.session_state.play_sfx = "sfx_defend"
            action_area.empty()
            _dispatch(
                lambda service: service.combat_action(
                    loop.loop_id,
                    PlayerAction(type="defend"),
                    options,
                )
            )
    with c2:
        if st.button("도주", width="stretch"):
            st.session_state.play_sfx = "sfx_move"
            action_area.empty()
            _dispatch(
                lambda service: service.combat_action(
                    loop.loop_id,
                    PlayerAction(type="flee"),
                    options,
                )
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


@st.cache_data(ttl=600, show_spinner=False)
def _get_image_base64_cached(src_path_or_url: str) -> str | None:
    import base64

    import requests

    try:
        if src_path_or_url.startswith("http"):
            response = requests.get(src_path_or_url, timeout=5)
            if response.status_code == 200:
                encoded = base64.b64encode(response.content).decode("utf-8")
                mime = "image/png"
                if "jpeg" in src_path_or_url.lower() or "jpg" in src_path_or_url.lower():
                    mime = "image/jpeg"
                return f"data:{mime};base64,{encoded}"
        elif Path(src_path_or_url).exists():
            with open(src_path_or_url, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
                mime = "image/png"
                if src_path_or_url.lower().endswith((".jpg", ".jpeg")):
                    mime = "image/jpeg"
                return f"data:{mime};base64,{encoded}"
    except Exception as e:
        import sys

        print(f"Error cache encoding image base64: {e}", file=sys.stderr)
    return None


def _render_player_image(snapshot: RuntimeSnapshot) -> None:
    stored = [asset for asset in snapshot.assets if asset.storage_uri]
    if stored:
        src = _image_src(stored[-1].storage_uri)
        if src:
            # To prevent layout shifting and heavy flickering from S3 presigned URL refreshes,
            # we convert the image to base64 and cache it.
            base64_src = _get_image_base64_cached(src)
            if base64_src:
                st.markdown(
                    f"""
                    <div class="flicker-free-img-container" style="width:100%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.2); border-radius:4px; overflow:hidden;">
                        <img src="{base64_src}" style="width:100%; max-width:420px; height:auto; border-radius:4px;" />
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            else:
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


@st.cache_resource
def _get_b64_sfx(name: str) -> str:
    import base64
    from pathlib import Path

    try:
        project_root = Path(__file__).resolve().parent
        path = project_root / "resources" / "neo-seoul" / "audio" / "sfx" / f"{name}.wav"
        if path.exists():
            with open(path, "rb") as f:
                data = f.read()
                return f"data:audio/wav;base64,{base64.b64encode(data).decode('utf-8')}"
    except Exception:
        pass
    return ""


def _run_combat_action(action, on_success) -> None:
    st.session_state.error = ""
    try:
        store = PostgresMythOSStore()
        try:
            service = RuntimeSessionService(store)
            result = action(service)
        finally:
            store.close()
        on_success(result)
    except Exception as exc:
        st.session_state.error = str(exc)


def _render_combat_console_log(loop_id: str) -> None:
    try:
        store = PostgresMythOSStore()
        try:
            scenes = store.list_scenes(loop_id)
            combat_logs = []
            for s in sorted(scenes, key=lambda x: x.turn_index):
                if s.scene_type == "combat" and s.narration:
                    combat_logs.append(f"[{s.title}] {s.narration}")

            if combat_logs:
                log_text = "\n\n".join(combat_logs)
                st.markdown(
                    "<div style=\"font-family:'SF Mono',Menlo,monospace; font-size:12px; height:140px; overflow-y:auto; "
                    "background:rgba(2, 10, 8, 0.95); border:1px solid rgba(41,255,198,0.3); padding:10px; color:#5effd3; margin-top:8px; border-radius:4px;"
                    'box-shadow: inset 0 0 10px rgba(0, 255, 170, 0.1);">'
                    f"<div>{html.escape(log_text).replace(chr(10), '<br>')}</div>"
                    "</div>",
                    unsafe_allow_html=True,
                )
        finally:
            store.close()
    except Exception as e:
        st.caption(f"LOG SYNC PENDING // {e}")


def _combat_iframe_state(snapshot: RuntimeSnapshot, options: RuntimeOptions) -> dict[str, Any]:
    combat = snapshot.combat or {}
    state = snapshot.loop.state if isinstance(snapshot.loop.state, dict) else {}
    return {
        "ok": True,
        "loop_id": snapshot.loop.loop_id,
        "scenario_id": options.scenario_id,
        "combat": combat,
        "prose": snapshot.scene.narration if snapshot.scene.scene_type == "combat" else "",
        "inventory": _combat_inventory_counts(state.get("_inventory", [])),
        "party": state.get("_party", {}),
        "loop_phase": snapshot.loop.phase.value,
    }


def _combat_inventory_counts(raw_inventory: Any) -> dict[str, dict[str, Any]]:
    counts: dict[str, dict[str, Any]] = {}
    if not isinstance(raw_inventory, list):
        return counts
    for entry in raw_inventory:
        if isinstance(entry, dict):
            item_id = str(entry.get("id", ""))
            name = str(entry.get("name", item_id))
        else:
            item_id = str(entry)
            name = item_id
        if not item_id:
            continue
        current = counts.setdefault(item_id, {"id": item_id, "name": name, "count": 0})
        current["count"] = int(current["count"]) + 1
    return counts


def _combat_meta_payload(scenario_id: str) -> dict[str, Any]:
    scenario = load_scenario(scenario_id)
    combat = scenario.combat if isinstance(scenario.combat, dict) else {}
    return {
        "skills": combat.get("skills", {}) if isinstance(combat.get("skills"), dict) else {},
        "items": combat.get("items", {}) if isinstance(combat.get("items"), dict) else {},
    }


def _combat_portrait_payload(radar: dict[str, Any], scenario_id: str) -> dict[str, str]:
    portraits: dict[str, str] = {}
    for blip in radar.get("blips", []):
        if not isinstance(blip, dict):
            continue
        blip_id = str(blip.get("id", ""))
        uri = _combat_portrait_data_uri(blip, scenario_id)
        if blip_id and uri:
            portraits[blip_id] = uri
    return portraits


def _build_combat_app_html(config: dict[str, Any]) -> str:
    def _safe_json(obj: Any) -> str:
        return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
html,body{{margin:0;padding:0;background:#020706;color:#d8fff7;font-family:'SF Mono',Menlo,Consolas,monospace;overflow:hidden;}}
button{{font-family:inherit;letter-spacing:0;}}
.combat-app{{height:100vh;box-sizing:border-box;border:1px solid rgba(41,255,198,.34);background:linear-gradient(180deg,rgba(2,18,16,.98),rgba(0,5,5,.99));padding:12px;display:grid;grid-template-columns:minmax(410px,1.45fr) minmax(300px,.9fr);gap:12px;}}
.panel{{border:1px solid rgba(41,255,198,.24);background:rgba(1,9,8,.78);border-radius:6px;padding:10px;box-sizing:border-box;min-width:0;}}
.kicker{{font-size:11px;font-weight:800;color:#29ffc6;margin-bottom:8px;text-transform:uppercase;}}
.board{{display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;background:#030b0b;border:1px solid #143b34;border-radius:5px;padding:8px;}}
.row{{display:flex;gap:4px;}}
.cell{{position:relative;width:46px;height:46px;border-radius:5px;display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box;background:#071211;border:1px solid #12231f;color:#d8fff7;}}
.cell.player{{background:#082720;border-color:#29ffc6;box-shadow:0 0 10px rgba(41,255,198,.35);cursor:grab;}}
.cell.player.selected{{border:2px solid #29ffc6;box-shadow:0 0 16px rgba(41,255,198,.85);}}
.cell.enemy{{background:#2a0710;border-color:#ff5a7a;box-shadow:0 0 10px rgba(255,90,122,.28);animation:pulse 1.15s steps(2,end) infinite;}}
.cell.ally{{background:#07182a;border-color:#5aa0ff;}}
.cell.reachable{{background:rgba(41,255,198,.16);border:1px dashed rgba(41,255,198,.86);box-shadow:0 0 8px rgba(41,255,198,.28);cursor:pointer;}}
.cell.reachable:hover,.cell.drag-over{{background:rgba(41,255,198,.35);box-shadow:0 0 16px rgba(41,255,198,.9);}}
.cell img{{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}}
.glyph{{font-size:18px;font-weight:900;pointer-events:none;}}
.hp{{position:absolute;left:4px;right:4px;bottom:4px;height:4px;background:rgba(0,0,0,.65);}}
.hp span{{display:block;height:4px;background:#29ffc6;}}
.enemy .hp span{{background:#ff5a7a;}}
.layout-col{{display:flex;flex-direction:column;gap:10px;min-height:0;}}
.rosters{{display:grid;grid-template-columns:1fr 1fr;gap:8px;}}
.card{{display:flex;gap:8px;align-items:center;border:1px solid rgba(120,220,200,.22);background:rgba(5,18,17,.72);border-radius:5px;padding:7px;margin-bottom:6px;min-width:0;}}
.avatar{{width:34px;height:34px;flex:0 0 34px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(80,180,160,.35);background:#04100f;color:#29ffc6;font-weight:900;overflow:hidden;}}
.avatar img{{width:100%;height:100%;object-fit:cover;display:block;}}
.name{{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}}
.meta{{font-size:10px;color:#8fbab0;margin-top:3px;}}
.bar{{height:5px;background:#172521;margin-top:4px;}}
.bar span{{display:block;height:5px;background:#29ffc6;}}
.dead{{opacity:.45;filter:grayscale(1);}}
.controls{{display:grid;grid-template-columns:1fr 1fr;gap:8px;}}
.cmd{{min-height:34px;border:1px solid rgba(41,255,198,.34);background:rgba(4,25,21,.86);color:#eafff9;border-radius:5px;padding:8px;cursor:pointer;font-size:12px;font-weight:800;}}
.cmd:hover:not(:disabled){{background:rgba(41,255,198,.18);}}
.cmd:disabled{{opacity:.38;cursor:not-allowed;}}
.cmd.danger{{border-color:rgba(255,90,122,.42);background:rgba(35,6,12,.82);}}
.focus{{font-size:12px;color:#8fffea;margin-bottom:8px;}}
.log{{height:138px;overflow-y:auto;background:rgba(2,10,8,.95);border:1px solid rgba(41,255,198,.24);padding:9px;color:#9fffe9;font-size:12px;line-height:1.45;white-space:pre-wrap;}}
.error{{color:#ff8aa1;font-size:12px;margin-top:6px;}}
.result-title{{font-size:22px;font-weight:900;margin-bottom:8px;}}
.result-victory{{color:#29ffc6;}}.result-defeat{{color:#ff5a7a;}}.result-fled{{color:#ffb432;}}
.stats{{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;}}
.stat{{border:1px solid rgba(120,220,200,.18);padding:8px;border-radius:5px;background:rgba(5,18,17,.72);font-size:11px;}}
.stat strong{{display:block;color:#eafff9;font-size:15px;margin-top:3px;}}
@keyframes pulse{{0%{{opacity:1}}50%{{opacity:.72}}100%{{opacity:1}}}}
@media(max-width:780px){{.combat-app{{grid-template-columns:1fr;overflow:auto;}}}}
</style>
</head>
<body>
<div id="app" class="combat-app"></div>
<script>
const CONFIG = {_safe_json(config)};
let state = CONFIG.initial;
let selected = false;
let busy = false;
let dragCell = null;
const endpoint = `http://127.0.0.1:${{CONFIG.port}}`;

function esc(value) {{
  return String(value ?? '').replace(/[&<>"']/g, ch => ({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[ch]));
}}
function playSfx(key) {{
  const src = CONFIG.sfx && CONFIG.sfx[key];
  if (!src) return;
  const audio = new Audio(src);
  audio.volume = 0.7;
  audio.play().catch(() => {{}});
}}
function combat() {{ return state.combat || {{radar:{{}}, available:{{}}}}; }}
function radar() {{ return combat().radar || {{}}; }}
function available() {{ return combat().available || {{}}; }}
function blips() {{ return (radar().blips || []).filter(b => b && b.alive !== false); }}
function portrait(blip) {{ return (CONFIG.portraits && CONFIG.portraits[blip.id]) || blip.portrait_uri || ''; }}
function hpPct(blip) {{ return Math.max(0, Math.min(100, Math.floor((Number(blip.hp || 0) / Math.max(1, Number(blip.max_hp || 1))) * 100))); }}
function reachableSet() {{
  return new Set((available().reachable || []).map(t => `${{Number(t[0])}},${{Number(t[1])}}`));
}}
function renderBoard() {{
  const r = radar();
  const arena = r.arena || {{w:8,h:6}};
  const byCell = {{}};
  for (const b of blips()) byCell[`${{Number(b.x||0)}},${{Number(b.y||0)}}`] = b;
  const reach = reachableSet();
  let html = `<div class="kicker">TACTICAL BOARD :: ROUND ${{String(r.round || 1).padStart(2,'0')}}</div><div class="board">`;
  for (let y = Number(arena.h || 6) - 1; y >= 0; y--) {{
    html += '<div class="row">';
    for (let x = 0; x < Number(arena.w || 8); x++) {{
      const key = `${{x}},${{y}}`;
      const b = byCell[key];
      const canMove = selected && reach.has(key) && !b;
      const classes = ['cell'];
      if (b) classes.push(b.faction || '');
      if (b && b.faction === 'player' && selected) classes.push('selected');
      if (canMove) classes.push('reachable');
      const draggable = b && b.faction === 'player' ? ' draggable="true"' : '';
      html += `<div class="${{classes.join(' ')}}" data-x="${{x}}" data-y="${{y}}" data-id="${{b ? esc(b.id) : ''}}"${{draggable}}>`;
      if (b) {{
        const p = portrait(b);
        html += p ? `<img src="${{p}}" alt="">` : `<span class="glyph">${{esc(b.glyph || '●')}}</span>`;
        html += `<div class="hp"><span style="width:${{hpPct(b)}}%"></span></div>`;
      }}
      html += '</div>';
    }}
    html += '</div>';
  }}
  return html + '</div>';
}}
function roster(title, list) {{
  let html = `<div class="kicker">${{title}}</div>`;
  if (!list.length) return html + '<div class="meta">NO SIGNAL</div>';
  for (const b of list) {{
    const p = portrait(b);
    html += `<div class="card ${{b.alive === false ? 'dead' : ''}}">
      <div class="avatar">${{p ? `<img src="${{p}}" alt="">` : esc(b.glyph || '●')}}</div>
      <div style="min-width:0;flex:1"><div class="name">${{esc(b.name)}}</div>
      <div class="bar"><span style="width:${{hpPct(b)}}%"></span></div>
      <div class="meta">HP ${{b.hp}}/${{b.max_hp}} · POS ${{b.x}},${{b.y}} · FOCUS ${{b.focus || 0}}/${{b.max_focus || 0}}</div></div>
    </div>`;
  }}
  return html;
}}
function itemCount(itemId) {{
  const item = state.inventory && state.inventory[itemId];
  return item ? Number(item.count || 0) : 0;
}}
function renderControls() {{
  const a = available();
  if (!a.can_act) return '<div class="panel"><div class="kicker">COMMAND</div><div class="meta">전술 신호를 동기화하는 중입니다.</div></div>';
  const skillDefs = (CONFIG.meta && CONFIG.meta.skills) || {{}};
  const itemDefs = (CONFIG.meta && CONFIG.meta.items) || {{}};
  let html = '<div class="panel"><div class="kicker">COMMAND CONSOLE</div>';
  html += `<div class="focus">집중(Focus) ◆ ${{a.focus || 0}}/${{a.max_focus || 0}}</div><div class="controls">`;
  for (const t of (a.targets || []).slice(0, 4)) {{
    html += `<button class="cmd danger" data-action="attack" data-target="${{esc(t.id)}}" ${{t.in_range ? '' : 'disabled'}}>공격: ${{esc(t.name)}} · HP ${{t.hp}}/${{t.max_hp}}</button>`;
  }}
  for (const skill of (a.skills || [])) {{
    const def = skillDefs[skill.id] || {{}};
    const cost = def.cost || {{}};
    const focusCost = Number(cost.focus || 0);
    const itemCost = cost.item || '';
    const disabled = Number(skill.cooldown || 0) > 0 || focusCost > Number(a.focus || 0) || (itemCost && itemCount(itemCost) <= 0);
    const bits = [];
    if (focusCost) bits.push(`◆${{focusCost}}`);
    if (itemCost) bits.push(itemCost);
    const label = `${{def.name || skill.id}}${{bits.length ? ' (' + bits.join(' · ') + ')' : ''}}${{skill.cooldown ? ' R-' + skill.cooldown : ''}}`;
    html += `<button class="cmd" data-action="skill" data-skill="${{esc(skill.id)}}" ${{disabled ? 'disabled' : ''}}>${{esc(label)}}</button>`;
  }}
  for (const [iid, inv] of Object.entries(state.inventory || {{}})) {{
    const def = itemDefs[iid] || {{}};
    if (def.kind !== 'consumable') continue;
    html += `<button class="cmd" data-action="item" data-item="${{esc(iid)}}">${{esc(inv.name || def.name || iid)}} ×${{inv.count}}</button>`;
  }}
  html += '<button class="cmd" data-action="defend">방어</button><button class="cmd" data-action="flee">도주</button>';
  return html + '</div><div class="meta" style="margin-top:8px">이동: 플레이어 신호 선택 후 강조 칸 클릭 또는 드래그.</div><div id="err" class="error"></div></div>';
}}
function renderLog() {{
  return `<div class="panel"><div class="kicker">COMBAT LOG</div><div class="log">${{esc(state.prose || '전투 신호 대기 중.')}}</div></div>`;
}}
function renderOutcome() {{
  const c = combat();
  if (!c.finished) return '';
  const s = c.summary || {{}};
  const outcome = c.outcome || 'resolved';
  const cls = outcome === 'player_defeat' ? 'result-defeat' : (outcome === 'player_fled' ? 'result-fled' : 'result-victory');
  const title = outcome === 'player_victory' ? '교전 승리' : (outcome === 'player_defeat' ? '신호 소실' : '전술 이탈');
  return `<div class="panel"><div class="kicker">COMBAT RESULT</div><div class="result-title ${{cls}}">${{title}}</div>
    <div class="stats"><div class="stat">PLAYER HP<strong>${{s.player_hp || 0}}/${{s.player_max_hp || 0}}</strong></div>
    <div class="stat">ROUND / TURN<strong>${{s.rounds || 0}}/${{s.turns || 0}}</strong></div>
    <div class="stat">DAMAGE DEALT<strong>${{s.damage_dealt || 0}}</strong></div>
    <div class="stat">DAMAGE TAKEN<strong>${{s.damage_taken || 0}}</strong></div></div>
    <button class="cmd" data-action="exit">${{outcome === 'player_defeat' ? '메인 화면으로 돌아가기' : '전투 정산 후 다음 장면으로 진행'}}</button></div>`;
}}
function renderAll() {{
  const all = radar().blips || [];
  const party = all.filter(b => b.faction === 'player' || b.faction === 'ally');
  const enemies = all.filter(b => b.faction === 'enemy');
  document.getElementById('app').innerHTML = `
    <div class="layout-col"><div class="panel">${{renderBoard()}}</div>${{renderLog()}}</div>
    <div class="layout-col"><div class="rosters"><div class="panel">${{roster('PARTY', party)}}</div><div class="panel">${{roster('ENEMY', enemies)}}</div></div>
    ${{combat().finished ? renderOutcome() : renderControls()}}</div>`;
  const log = document.querySelector('.log');
  if (log) log.scrollTop = log.scrollHeight;
}}
async function sendAction(action) {{
  if (busy || combat().finished) return;
  busy = true;
  try {{
    const res = await fetch(endpoint + '/combat/action', {{
      method: 'POST',
      headers: {{'Content-Type': 'text/plain'}},
      body: JSON.stringify({{loop_id: CONFIG.loop_id, scenario_id: CONFIG.scenario_id, action}})
    }});
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error || 'combat action failed');
    state = payload;
    selected = false;
    renderAll();
  }} catch (err) {{
    const target = document.getElementById('err');
    if (target) target.textContent = String(err.message || err);
  }} finally {{
    busy = false;
  }}
}}
function signalExit() {{
  const input = window.parent.document.querySelector('input[aria-label="hidden_combat_exit"]');
  if (!input) return;
  const setter = window.parent.Object.getOwnPropertyDescriptor(window.parent.HTMLInputElement.prototype, 'value').set;
  setter.call(input, JSON.stringify({{type:'exit', outcome: combat().outcome || ''}}));
  input.dispatchEvent(new window.parent.Event('input', {{bubbles:true}}));
  input.dispatchEvent(new window.parent.Event('change', {{bubbles:true}}));
  ['keydown','keypress','keyup'].forEach(t => input.dispatchEvent(new window.parent.KeyboardEvent(t, {{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}})));
}}
document.addEventListener('click', e => {{
  const cell = e.target.closest('.cell');
  const btn = e.target.closest('button[data-action]');
  if (cell) {{
    if (cell.classList.contains('player')) {{ selected = !selected; renderAll(); return; }}
    if (cell.classList.contains('reachable')) {{ playSfx('sfx_move'); sendAction({{type:'wait', x:Number(cell.dataset.x), y:Number(cell.dataset.y)}}); return; }}
  }}
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'exit') return signalExit();
  if (action === 'attack') {{ playSfx('sfx_attack'); return sendAction({{type:'attack', target_id:btn.dataset.target}}); }}
  if (action === 'skill') {{ playSfx('sfx_attack'); return sendAction({{type:'skill', skill_id:btn.dataset.skill}}); }}
  if (action === 'item') {{ playSfx('sfx_defend'); return sendAction({{type:'item', item_id:btn.dataset.item}}); }}
  if (action === 'defend') {{ playSfx('sfx_defend'); return sendAction({{type:'defend'}}); }}
  if (action === 'flee') {{ playSfx('sfx_move'); return sendAction({{type:'flee'}}); }}
}});
document.addEventListener('dragstart', e => {{
  const cell = e.target.closest('.cell.player');
  if (!cell) return;
  selected = true;
  e.dataTransfer.setData('text/plain', 'player');
  setTimeout(renderAll, 0);
}});
document.addEventListener('dragover', e => {{
  const cell = e.target.closest('.cell.reachable');
  if (!cell) return;
  e.preventDefault();
  cell.classList.add('drag-over');
  dragCell = cell;
}});
document.addEventListener('dragleave', e => {{
  const cell = e.target.closest('.cell.reachable');
  if (cell) cell.classList.remove('drag-over');
}});
document.addEventListener('drop', e => {{
  e.preventDefault();
  if (!dragCell) return;
  playSfx('sfx_move');
  sendAction({{type:'wait', x:Number(dragCell.dataset.x), y:Number(dragCell.dataset.y)}});
  dragCell = null;
}});
renderAll();
</script>
</body>
</html>"""


@st.fragment
def _render_combat_arena_fragment(options: RuntimeOptions) -> None:
    snapshot = _load_current_snapshot()
    if snapshot is None or snapshot.combat is None:
        st.warning("전술 신호 동기화 지연")
        return

    loop = snapshot.loop
    combat = snapshot.combat

    hidden_exit = st.session_state.get("hidden_combat_exit", "")
    if hidden_exit:
        st.session_state.hidden_combat_exit = ""
        try:
            exit_data = json.loads(hidden_exit)
            if exit_data.get("type") == "exit":
                outcome = str(exit_data.get("outcome", ""))
                if outcome == "player_defeat" or loop.phase is LoopPhase.ENDED:
                    _return_to_player_main(loop.player_id)
                    st.rerun()
                _run_combat_action(
                    lambda service: service.choose(
                        loop.loop_id,
                        action="전투 결과를 정리하고 다음 장면으로 이동한다.",
                        options=options,
                    ),
                    on_success=_set_snapshot,
                )
                st.rerun()
        except Exception as e:
            st.error(f"Combat exit error: {e}")

    st.text_input(
        "hidden_combat_exit",
        key="hidden_combat_exit",
        label_visibility="collapsed",
    )

    try:
        port = ensure_combat_server()
        radar = combat.get("radar", {}) if isinstance(combat, dict) else {}
        config = {
            "loop_id": loop.loop_id,
            "scenario_id": options.scenario_id,
            "port": port,
            "initial": _combat_iframe_state(snapshot, options),
            "meta": _combat_meta_payload(options.scenario_id),
            "portraits": _combat_portrait_payload(
                radar if isinstance(radar, dict) else {}, options.scenario_id
            ),
            "sfx": {
                key: uri
                for key in ["sfx_move", "sfx_attack", "sfx_defend", "sfx_victory", "sfx_defeat"]
                if (uri := _get_b64_sfx(key))
            },
        }
        st.iframe(_build_combat_app_html(config), height=820)
    except Exception as e:
        st.error(f"전투 iframe 렌더링 예외 발생: {e}")

    overview = _load_memory_overview(loop.player_id)
    _render_player_memory(loop, overview)


def _render_audio(snapshot: RuntimeSnapshot) -> None:
    import time

    # 1. Loop-based Background Music (BGM)
    # st.audio does not support the 'key' argument in this environment, so we omit it.
    if snapshot.bgm_path and Path(snapshot.bgm_path).exists():
        st.audio(snapshot.bgm_path, format="audio/wav", autoplay=True, loop=True)

    # 2. Duration-bounded SFX Queue (2.5s window) using native st.audio to pass browser autoplay blocks
    if "sfx_queue" not in st.session_state:
        st.session_state.sfx_queue = []

    # Enqueue new SFX requests
    sfx_key = st.session_state.get("play_sfx")
    if sfx_key:
        st.session_state.play_sfx = None  # Consume immediately
        st.session_state.sfx_queue.append({"key": sfx_key, "timestamp": time.time()})

    # Filter and keep only SFX requests that are less than 2.5 seconds old
    now = time.time()
    active_sfxs = [item for item in st.session_state.sfx_queue if now - item["timestamp"] < 2.5]
    st.session_state.sfx_queue = active_sfxs

    # Render each active SFX using keyless st.audio
    project_root = Path(__file__).resolve().parent
    for item in active_sfxs:
        key = item["key"]
        sfx_path = project_root / "resources" / "neo-seoul" / "audio" / "sfx" / f"{key}.wav"
        if sfx_path.exists():
            st.audio(str(sfx_path), format="audio/wav", autoplay=True, loop=False)


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
                        combined = f"{base_text}\n\n{streamed_text}" if base_text else streamed_text
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


def _load_run_summaries(player_id: str) -> list[RunSummary]:
    try:
        store = PostgresMythOSStore()
        try:
            return RuntimeSessionService(store).list_run_summaries(player_id)
        finally:
            store.close()
    except Exception as exc:
        st.session_state.error = str(exc)
        return []


def _load_save_slots(player_id: str) -> list[SaveSlot]:
    try:
        store = PostgresMythOSStore()
        try:
            return RuntimeSessionService(store).list_save_slots(player_id)
        finally:
            store.close()
    except Exception as exc:
        st.session_state.error = str(exc)
        return []


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


def _index_for_save_slot(slots: list[SaveSlot], loop_id: str) -> int:
    for index, slot in enumerate(slots):
        if slot.loop_id == loop_id:
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


def _format_save_slot_option(slots: list[SaveSlot], loop_id: str) -> str:
    for slot in slots:
        if slot.loop_id == loop_id:
            saved_at = slot.saved_at.replace("T", " ").split("+", 1)[0]
            combat = " / combat" if slot.in_combat else ""
            return (
                f"{slot.label} / {slot.phase}{combat} / turn {slot.turn_index} / "
                f"stability {slot.stability} / tension {slot.tension} / {saved_at}"
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
    st.caption(
        f"좌표 {cx}, {cy} · 탐사 {len(tiles)}곳 · 접촉 {len(live_contacts)} · {cur.get('name', '')}"
    )


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
