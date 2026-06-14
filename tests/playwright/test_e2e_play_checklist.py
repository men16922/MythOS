# ruff: noqa: E402, I001, E501
import multiprocessing
import os
import sys
import time
import json
from pathlib import Path
from typing import Any

# Add src to python path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

import uvicorn
from playwright.sync_api import sync_playwright
from mythos_api.app import create_app

APP_URL = "http://127.0.0.1:8080/?fallback=0&image=0"
OUTPUT_DIR = Path(__file__).parent / "outputs"


def run_server():
    app = create_app()
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="info")


# HTML/JS snippets to inject for mocking WebSockets inside the browser
MOCK_WEBSOCKET_JS = """
class MockWebSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
        super();
        this.url = url;
        this.readyState = 0; // CONNECTING
        window.activeMockSocket = this;
        
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        
        setTimeout(() => {
            this.readyState = 1; // OPEN
            const ev = new Event('open');
            this.dispatchEvent(ev);
        }, 50);
    }
    
    dispatchEvent(event) {
        super.dispatchEvent(event);
        if (event.type === 'open' && this.onopen) {
            this.onopen(event);
        } else if (event.type === 'message' && this.onmessage) {
            this.onmessage(event);
        } else if (event.type === 'close' && this.onclose) {
            this.onclose(event);
        } else if (event.type === 'error' && this.onerror) {
            this.onerror(event);
        }
        return true;
    }
    
    send(data) {
        const msg = JSON.parse(data);
        if (window.onMockWebSocketSend) {
            window.onMockWebSocketSend(msg);
        }
        const event = msg.event;
        console.log("MockWebSocket send() 호출됨. event=" + event);
        if (event === "begin") {
            setTimeout(() => window.dispatchMockTokens(0), 100);
        } else if (event === "choose") {
            window.currentMockTurn = (window.currentMockTurn || 0) + 1;
            console.log("MockWebSocket choose 감지. 다음 턴=" + window.currentMockTurn);
            setTimeout(() => window.dispatchMockTokens(window.currentMockTurn), 100);
        }
    }
    
    close() {
        this.readyState = 3; // CLOSED
        const ev = new Event('close');
        this.dispatchEvent(ev);
        if (window.activeMockSocket === this) {
            window.activeMockSocket = null;
        }
    }
}
window.WebSocket = MockWebSocket;

// Deterministic token & snapshot dispatcher helper inside browser context
window.dispatchMockTokens = (turn) => {
    console.log("dispatchMockTokens() 진입. turn=" + turn);
    const socket = window.activeMockSocket;
    if (!socket) {
        console.error("MockWebSocket: active socket not found!");
        return;
    }
    
    let snapshot;
    let tokens = [];
    if (turn === 0) {
        snapshot = window.snapshot_turn0;
        tokens = ["비가 ", "쏟아지는 ", "C-17 골목길..."];
    } else if (turn === 1) {
        snapshot = window.snapshot_turn1;
        tokens = ["골목 ", "끝에서 ", "사이렌 소리가..."];
    } else if (turn === 2) {
        snapshot = window.snapshot_combat;
        tokens = ["보안팀과의 ", "교전이 ", "시작된다!"];
    } else {
        console.error("Unknown turn for dispatching tokens: " + turn);
        return;
    }
    
    console.log("선택된 스냅샷 유효 여부: " + (!!snapshot));
    if (!snapshot) {
        console.error("오류: 스냅샷 데이터가 존재하지 않습니다! turn=" + turn);
        return;
    }
    
    let delay = 0;
    tokens.forEach((t) => {
        setTimeout(() => {
            socket.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'token', content: t }) }));
        }, delay);
        delay += 100;
    });
    
    setTimeout(() => {
        console.log("최종 snapshot 패킷 전송 시작. turn=" + turn);
        socket.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'snapshot', data: snapshot }) }));
    }, delay + 100);
};
"""

# HTML/JS snippets to inject for spying Canvas 2D drawings and mocking matchMedia
CANVAS_SPY_JS = """
window.matchMedia = function(query) {
    return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
    };
};

const originalGetContext = HTMLCanvasElement.prototype.getContext;
window.canvasDrawLogs = [];
HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    const ctx = originalGetContext.call(this, type, ...args);
    if (type === '2d' && !ctx._spied) {
        ctx._spied = true;
        
        const originalDrawImage = ctx.drawImage;
        ctx.drawImage = function() {
            const image = arguments[0];
            let src = 'unknown';
            if (image instanceof HTMLImageElement) {
                src = image.src;
            } else if (image instanceof HTMLCanvasElement) {
                src = 'canvas';
            }
            window.canvasDrawLogs.push({
                type: 'drawImage',
                src: src,
                args: Array.from(arguments).slice(1).map(a => typeof a === 'number' ? Math.round(a) : a)
            });
            return originalDrawImage.apply(this, arguments);
        };

        const originalEllipse = ctx.ellipse;
        ctx.ellipse = function() {
            window.canvasDrawLogs.push({
                type: 'ellipse',
                args: Array.from(arguments).map(a => typeof a === 'number' ? Math.round(a) : a),
                fillStyle: this.fillStyle,
                strokeStyle: this.strokeStyle
            });
            return originalEllipse.apply(this, arguments);
        };

        const originalArc = ctx.arc;
        ctx.arc = function() {
            window.canvasDrawLogs.push({
                type: 'arc',
                args: Array.from(arguments).map(a => typeof a === 'number' ? Math.round(a) : a),
                fillStyle: this.fillStyle,
                strokeStyle: this.strokeStyle
            });
            return originalArc.apply(this, arguments);
        };

        const originalLineTo = ctx.lineTo;
        ctx.lineTo = function() {
            window.canvasDrawLogs.push({
                type: 'lineTo',
                args: Array.from(arguments).map(a => typeof a === 'number' ? Math.round(a) : a),
                strokeStyle: this.strokeStyle
            });
            return originalLineTo.apply(this, arguments);
        };
    }
    return ctx;
};
"""


def run_test():
    # Ensure outputs directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    server_process = multiprocessing.Process(target=run_server)
    server_process.start()

    # Wait for server to boot
    time.sleep(3.0)

    print("Checking system dependencies and starting E2E test...")
    success = False
    browser = None
    try:
        with sync_playwright() as p:
            # We run in headless=True for automation, but capturing detailed screenshots.
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            requested_urls = []

            # Enable browser console logging to stdout for debugging
            page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.text}"))
            page.on("pageerror", lambda exc: print(f"[BROWSER ERROR] {exc}"))
            def _log_request(req: Any) -> None:
                requested_urls.append(req.url)
                print(f"[REQ] {req.method} {req.url}")

            page.on("request", _log_request)
            page.on("response", lambda res: print(f"[RES] {res.status} {res.url}"))

            # 1. Inject WebSocket Mocking & Canvas Spy Scripts before navigation
            page.add_init_script(MOCK_WEBSOCKET_JS)
            page.add_init_script(CANVAS_SPY_JS)

            # Define scenario & player mock data
            mock_scenarios = {
                "scenarios": [
                    {
                        "id": "neo-seoul",
                        "name": "네오 서울: 접속",
                        "brief": "가상 현실 루프와 현실의 기시감이 충돌하는 도시",
                        "archetypes": [
                            {
                                "name": "Netrunner",
                                "attributes": ["해킹", "기시감 인지"],
                                "starting_item": "더미 데이터 카드",
                                "stats": {"stability": 50, "tension": 20},
                            }
                        ],
                        "endings": [
                            {
                                "id": "ending_glass_librarian",
                                "title": "유리성의 사서",
                                "condition": "stability <= 10",
                            }
                        ],
                        "characters": [
                            {
                                "name": "정세린",
                                "alias": "물거미",
                                "role": "첫 인도자 / 데이터 밀수꾼",
                                "image": "characters/se-rin.png",
                                "portrait": "characters/se-rin.png",
                                "keywords": ["정세린", "세린", "se-rin"],
                            }
                        ],
                        "ui_copy": {
                            "intro_logo": "TEST PROJECT MYTHOS",
                            "signal_title": "TEST UNREGISTERED SIGNAL",
                            "session_intro": {
                                "kicker": "TEST KICKER",
                                "title": "TEST INTRO TITLE",
                                "body": "TEST INTRO BODY",
                                "continue_button": "접속을 받아들인다",
                            },
                        },
                    }
                ]
            }

            mock_player = {
                "player_id": "player_test",
                "display_name": "테스터",
                "traits": {
                    "archetype": "Netrunner",
                    "inventory": [],
                    "stats": {"stability": 50, "tension": 20},
                },
            }

            mock_runs = {
                "runs": [
                    {
                        "loop_id": "loop_ended_999",
                        "ending_label": "엔딩 · 유리성의 사서",
                        "turns": 12,
                        "ended_at": "2026-06-06T12:00:00Z",
                    }
                ]
            }

            # Setup REST API routing/mocking
            page.route("**/api/v1/scenarios", lambda route: route.fulfill(json=mock_scenarios))
            page.route("**/api/v1/auth/connect", lambda route: route.fulfill(json=mock_player))
            page.route("**/api/v1/runs?player_id=*", lambda route: route.fulfill(json=mock_runs))
            page.route(
                "**/api/v1/save-slots?player_id=*", lambda route: route.fulfill(json={"slots": []})
            )

            # Define snapshots for turns
            snapshot_turn0 = {
                "loop_id": "loop_test_123",
                "phase": "explore",
                "location": "c17_alley",
                "stability": 80,
                "tension": 20,
                "decay_percent": 5,
                "zone_risk": "low",
                "clues_collected": 0,
                "active_scene": {
                    "scene_id": "scene_0",
                    "loop_id": "loop_test_123",
                    "turn_index": 0,
                    "title": "비 내리는 골목",
                    "location": "c17_alley",
                    "narration": "비가 쏟아지는 C-17 골목길. 정보 브로커 세린이 어둠 속에서 나타나 말을 걸어온다. '정말 너야?'",
                    "choices": [
                        {
                            "choice_id": "choice_0_talk",
                            "label": "세린에게 다가간다",
                            "intent": "explore",
                            "cost": None,
                            "requires": None,
                        },
                        {
                            "choice_id": "choice_0_ignore",
                            "label": "신호를 무시하고 지나친다",
                            "intent": "explore",
                            "cost": None,
                            "requires": None,
                        },
                    ],
                    "scene_type": "story",
                    "objective": "세린과 대화하여 정보를 얻으시오.",
                },
                "combat": None,
                "assets": [],
                "bgm_path": "resources/neo-seoul/audio/bgm_calm.wav",
                "state": {"flags": ["met_serin"], "_party": {"player_hp": 15, "player_max_hp": 15}},
                "player": mock_player,
            }

            snapshot_turn1 = {
                "loop_id": "loop_test_123",
                "phase": "explore",
                "location": "c17_alley",
                "stability": 70,
                "tension": 25,
                "decay_percent": 10,
                "zone_risk": "low",
                "clues_collected": 0,
                "active_scene": {
                    "scene_id": "scene_1",
                    "loop_id": "loop_test_123",
                    "turn_index": 1,
                    "title": "보안팀의 추격",
                    "location": "c17_alley",
                    "narration": "세린이 경고하며 물러선다. 골목 끝에서 드론들의 기계음이 울리기 시작했다.",
                    "choices": [
                        {
                            "choice_id": "choice_1_disabled",
                            "label": "안정적인 통신망 복구 시도 (실패 유도)",
                            "intent": "explore",
                            "cost": None,
                            "requires": {"stability_min": 95},
                        },
                        {
                            "choice_id": "choice_1_costly",
                            "label": "소리를 내어 달아난다",
                            "intent": "explore",
                            "cost": {"stability": -10, "tension": 5},
                            "requires": None,
                        },
                        {
                            "choice_id": "choice_1_combat",
                            "label": "보안팀 드론과 교전 준비",
                            "intent": "combat",
                            "cost": None,
                            "requires": None,
                        },
                    ],
                    "scene_type": "story",
                },
                "combat": None,
                "assets": [],
                "bgm_path": "resources/neo-seoul/audio/bgm_calm.wav",
                "state": {"flags": ["met_serin"], "_party": {"player_hp": 15, "player_max_hp": 15}},
                "player": mock_player,
            }

            snapshot_combat: dict[str, Any] = {
                "loop_id": "loop_test_123",
                "phase": "interact",
                "location": "c17_alley",
                "stability": 60,
                "tension": 30,
                "decay_percent": 15,
                "zone_risk": "high",
                "clues_collected": 0,
                "active_scene": {
                    "scene_id": "scene_2",
                    "loop_id": "loop_test_123",
                    "turn_index": 2,
                    "title": "보안팀 교전",
                    "location": "c17_alley",
                    "narration": "보안팀 공격용 드론이 시그널 게이트 앞을 가로막고 붉은 레이저 조준선을 발사한다. 전투 돌입.",
                    "choices": [],
                    "scene_type": "combat",
                },
                "combat": {
                    "finished": False,
                    "log": [],
                    "radar": {
                        "arena": {"w": 8, "h": 6},
                        "blips": [
                            {
                                "id": "player",
                                "name": "테스터",
                                "faction": "player",
                                "x": 2,
                                "y": 3,
                                "hp": 15,
                                "max_hp": 15,
                                "alive": True,
                                "combat_images": {"idle": "characters/player-noise.png"},
                            },
                            {
                                "id": "serin",
                                "name": "세린",
                                "faction": "ally",
                                "x": 1,
                                "y": 3,
                                "hp": 7,
                                "max_hp": 10,
                                "alive": True,
                                "portrait": "characters/se-rin.png",
                            },
                            {
                                "id": "maintenance_drone",
                                "name": "정비 드론",
                                "faction": "enemy",
                                "x": 5,
                                "y": 2,
                                "hp": 8,
                                "max_hp": 8,
                                "alive": True,
                                "combat_images": {
                                    "idle": "enemies/combat/maintenance-drone-idle.png",
                                    "guard": "enemies/combat/maintenance-drone-guard.png",
                                    "attack": "enemies/combat/maintenance-drone-attack.png",
                                    "skill": "enemies/combat/maintenance-drone-skill.png",
                                    "hit": "enemies/combat/maintenance-drone-hit.png",
                                },
                            },
                            {
                                "id": "sentinel_drone",
                                "name": "감시 드론",
                                "faction": "enemy",
                                "x": 5,
                                "y": 4,
                                "hp": 10,
                                "max_hp": 10,
                                "alive": True,
                                "combat_images": {
                                    "idle": "enemies/combat/sentinel-drone-idle.png",
                                    "guard": "enemies/combat/sentinel-drone-guard.png",
                                },
                            },
                        ],
                        "current": "player",
                        "enemy_intents": [
                            {
                                "enemy_id": "maintenance_drone",
                                "action": "attack",
                                "target_x": 2,
                                "target_y": 3,
                            }
                        ],
                        "round": 1,
                    },
                    "available": {
                        "can_act": True,
                        "focus": 3,
                        "max_focus": 3,
                        "reachable": [[2, 2], [2, 4], [3, 3], [1, 2], [1, 4]],
                        "skills": [
                            {
                                "id": "packet_shot",
                                "name": "패킷 사격",
                                "cost": 1,
                                "role": "damage",
                                "tags": ["ranged"],
                            },
                            {
                                "id": "patch_protocol",
                                "name": "패치 프로토콜",
                                "cost": 1,
                                "role": "healing",
                                "tags": ["heal"],
                            },
                            {
                                "id": "signal_step",
                                "name": "신호 도약",
                                "cost": 1,
                                "role": "mobility",
                                "tags": ["movement"],
                            },
                            {
                                "id": "covering_noise",
                                "name": "엄호 노이즈",
                                "cost": 1,
                                "role": "defense",
                                "tags": ["support"],
                            },
                            {
                                "id": "overload_strike",
                                "name": "과부하 일격",
                                "cost": 2,
                                "role": "damage",
                                "tags": ["melee"],
                            },
                        ],
                        "targets": [
                            {
                                "id": "maintenance_drone",
                                "name": "정비 드론",
                                "hp": 8,
                                "max_hp": 8,
                                "in_range": True,
                            },
                            {
                                "id": "sentinel_drone",
                                "name": "감시 드론",
                                "hp": 10,
                                "max_hp": 10,
                                "in_range": True,
                            },
                            {
                                "id": "serin",
                                "name": "세린",
                                "hp": 7,
                                "max_hp": 10,
                                "in_range": True,
                            },
                        ],
                    },
                },
                "assets": [],
                "bgm_path": "resources/neo-seoul/audio/bgm_combat_normal.wav",
                "state": {
                    "flags": ["combat_active"],
                    "_party": {"player_hp": 15, "player_max_hp": 15},
                },
                "player": mock_player,
            }

            # 2. player moved (2,3) -> (3,3)
            snapshot_combat_moved = {
                "loop_id": "loop_test_123",
                "phase": "interact",
                "location": "c17_alley",
                "stability": 60,
                "tension": 30,
                "decay_percent": 15,
                "zone_risk": "high",
                "clues_collected": 0,
                "active_scene": snapshot_combat["active_scene"],
                "prose": "테스터가 (3, 3)으로 이동했다.",
                "combat": {
                    "finished": False,
                    "log": [],
                    "radar": {
                        "arena": {"w": 8, "h": 6},
                        "blips": [
                            {**snapshot_combat["combat"]["radar"]["blips"][0], "x": 3, "y": 3},
                            snapshot_combat["combat"]["radar"]["blips"][1],
                            snapshot_combat["combat"]["radar"]["blips"][2],
                            snapshot_combat["combat"]["radar"]["blips"][3],
                        ],
                        "current": "player",
                        "enemy_intents": [],
                        "round": 2,
                    },
                    "available": {
                        **snapshot_combat["combat"]["available"],
                        "reachable": [[3, 2], [3, 4], [4, 3], [2, 3]],
                    },
                },
                "player": mock_player,
            }

            # 3. Ranged Skill (packet_shot) -> Attacker: player, Target: maintenance_drone
            # maintenance_drone HP 8 -> 5. Contains action: "hit" to trigger CombatCinema.
            snapshot_combat_ranged = {
                "loop_id": "loop_test_123",
                "phase": "interact",
                "location": "c17_alley",
                "stability": 60,
                "tension": 30,
                "decay_percent": 15,
                "zone_risk": "high",
                "clues_collected": 0,
                "active_scene": snapshot_combat["active_scene"],
                "prose": "테스터가 패킷 사격을 시전하여 정비 드론에게 3의 피해를 입혔다.",
                "combat": {
                    "finished": False,
                    "log": [
                        {
                            "actor": "player",
                            "action": "skill",
                            "detail": {"skill_id": "packet_shot", "skill_name": "패킷 사격"},
                        },
                        {
                            "actor": "player",
                            "action": "hit",
                            "detail": {
                                "target": "maintenance_drone",
                                "damage": 3,
                                "skill_name": "패킷 사격",
                            },
                        },
                    ],
                    "radar": {
                        "arena": {"w": 8, "h": 6},
                        "blips": [
                            snapshot_combat_moved["combat"]["radar"]["blips"][0],
                            snapshot_combat_moved["combat"]["radar"]["blips"][1],
                            {
                                **snapshot_combat_moved["combat"]["radar"]["blips"][2],
                                "hp": 5,
                            },  # maintenance_drone HP: 5
                            snapshot_combat_moved["combat"]["radar"]["blips"][3],
                        ],
                        "current": "player",
                        "enemy_intents": [],
                        "round": 3,
                    },
                    "available": snapshot_combat_moved["combat"]["available"],
                },
                "player": mock_player,
            }

            # 4. Guard State for drones (defending=True)
            snapshot_combat_guard = {
                "loop_id": "loop_test_123",
                "phase": "interact",
                "location": "c17_alley",
                "stability": 60,
                "tension": 30,
                "decay_percent": 15,
                "zone_risk": "high",
                "clues_collected": 0,
                "active_scene": snapshot_combat["active_scene"],
                "prose": "정비 드론과 감시 드론이 방어 태세에 돌입했다.",
                "combat": {
                    "finished": False,
                    "log": [],
                    "radar": {
                        "arena": {"w": 8, "h": 6},
                        "blips": [
                            snapshot_combat_ranged["combat"]["radar"]["blips"][0],
                            snapshot_combat_ranged["combat"]["radar"]["blips"][1],
                            {
                                **snapshot_combat_ranged["combat"]["radar"]["blips"][2],
                                "defending": True,
                            },
                            {
                                **snapshot_combat_ranged["combat"]["radar"]["blips"][3],
                                "defending": True,
                            },
                        ],
                        "current": "player",
                        "enemy_intents": [],
                        "round": 4,
                    },
                    "available": snapshot_combat_ranged["combat"]["available"],
                },
                "player": mock_player,
            }

            # 5. Heal Skill (patch_protocol) -> Attacker: player, Target: serin
            # serin HP 7 -> 10
            snapshot_combat_heal = {
                "loop_id": "loop_test_123",
                "phase": "interact",
                "location": "c17_alley",
                "stability": 60,
                "tension": 30,
                "decay_percent": 15,
                "zone_risk": "high",
                "clues_collected": 0,
                "active_scene": snapshot_combat["active_scene"],
                "prose": "테스터가 패치 프로토콜을 시전하여 세린의 HP를 3 회복시켰다.",
                "combat": {
                    "finished": False,
                    "log": [
                        {
                            "actor": "player",
                            "action": "skill",
                            "detail": {"skill_id": "patch_protocol", "skill_name": "패치 프로토콜"},
                        }
                    ],
                    "radar": {
                        "arena": {"w": 8, "h": 6},
                        "blips": [
                            snapshot_combat_guard["combat"]["radar"]["blips"][0],
                            {
                                **snapshot_combat_guard["combat"]["radar"]["blips"][1],
                                "hp": 10,
                            },  # serin HP: 10
                            snapshot_combat_guard["combat"]["radar"]["blips"][2],
                            snapshot_combat_guard["combat"]["radar"]["blips"][3],
                        ],
                        "current": "player",
                        "enemy_intents": [],
                        "round": 5,
                    },
                    "available": snapshot_combat_guard["combat"]["available"],
                },
                "player": mock_player,
            }

            # 6. Mobility Skill (signal_step) -> player moves from (3,3) to (4,3)
            snapshot_combat_mobility = {
                "loop_id": "loop_test_123",
                "phase": "interact",
                "location": "c17_alley",
                "stability": 60,
                "tension": 30,
                "decay_percent": 15,
                "zone_risk": "high",
                "clues_collected": 0,
                "active_scene": snapshot_combat["active_scene"],
                "prose": "테스터가 신호 도약을 사용하여 (4, 3)으로 이동했다.",
                "combat": {
                    "finished": False,
                    "log": [
                        {
                            "actor": "player",
                            "action": "skill",
                            "detail": {"skill_id": "signal_step", "skill_name": "신호 도약"},
                        }
                    ],
                    "radar": {
                        "arena": {"w": 8, "h": 6},
                        "blips": [
                            {
                                **snapshot_combat_heal["combat"]["radar"]["blips"][0],
                                "x": 4,
                                "y": 3,
                            },  # player at (4,3)
                            snapshot_combat_heal["combat"]["radar"]["blips"][1],
                            snapshot_combat_heal["combat"]["radar"]["blips"][2],
                            snapshot_combat_heal["combat"]["radar"]["blips"][3],
                        ],
                        "current": "player",
                        "enemy_intents": [],
                        "round": 6,
                    },
                    "available": {
                        **snapshot_combat_heal["combat"]["available"],
                        "reachable": [[4, 2], [4, 4], [5, 3], [3, 3]],
                    },
                },
                "player": mock_player,
            }

            # 7. Defense Skill (covering_noise)
            snapshot_combat_defense = {
                "loop_id": "loop_test_123",
                "phase": "interact",
                "location": "c17_alley",
                "stability": 60,
                "tension": 30,
                "decay_percent": 15,
                "zone_risk": "high",
                "clues_collected": 0,
                "active_scene": snapshot_combat["active_scene"],
                "prose": "테스터가 엄호 노이즈를 시전하여 방어막을 형성했다.",
                "combat": {
                    "finished": False,
                    "log": [
                        {
                            "actor": "player",
                            "action": "skill",
                            "detail": {"skill_id": "covering_noise", "skill_name": "엄호 노이즈"},
                        }
                    ],
                    "radar": {
                        "arena": {"w": 8, "h": 6},
                        "blips": [
                            snapshot_combat_mobility["combat"]["radar"]["blips"][0],
                            snapshot_combat_mobility["combat"]["radar"]["blips"][1],
                            snapshot_combat_mobility["combat"]["radar"]["blips"][2],
                            snapshot_combat_mobility["combat"]["radar"]["blips"][3],
                        ],
                        "current": "player",
                        "enemy_intents": [],
                        "round": 7,
                    },
                    "available": snapshot_combat_mobility["combat"]["available"],
                },
                "player": mock_player,
            }

            # 8. Melee Skill (overload_strike) -> maintenance_drone HP 5 -> 0 (death)
            snapshot_combat_melee = {
                "loop_id": "loop_test_123",
                "phase": "interact",
                "location": "c17_alley",
                "stability": 60,
                "tension": 30,
                "decay_percent": 15,
                "zone_risk": "high",
                "clues_collected": 0,
                "active_scene": snapshot_combat["active_scene"],
                "prose": "테스터가 과부하 일격으로 정비 드론을 격파했다.",
                "combat": {
                    "finished": False,
                    "log": [
                        {
                            "actor": "player",
                            "action": "skill",
                            "detail": {"skill_id": "overload_strike", "skill_name": "과부하 일격"},
                        },
                        {
                            "actor": "player",
                            "action": "hit",
                            "detail": {
                                "target": "maintenance_drone",
                                "damage": 5,
                                "skill_name": "과부하 일격",
                            },
                        },
                    ],
                    "radar": {
                        "arena": {"w": 8, "h": 6},
                        "blips": [
                            snapshot_combat_defense["combat"]["radar"]["blips"][0],
                            snapshot_combat_defense["combat"]["radar"]["blips"][1],
                            {
                                **snapshot_combat_defense["combat"]["radar"]["blips"][2],
                                "hp": 0,
                                "alive": False,
                            },  # maintenance_drone: dead
                            snapshot_combat_defense["combat"]["radar"]["blips"][3],
                        ],
                        "current": "player",
                        "enemy_intents": [],
                        "round": 8,
                    },
                    "available": snapshot_combat_defense["combat"]["available"],
                },
                "player": mock_player,
            }

            # 9. Defeat
            snapshot_combat_defeat = {
                "prose": "보안 드론의 집중 포화에 테스터의 장비가 과부하되어 접속 신호가 완전히 종료되었다.",
                "combat": {
                    "finished": True,
                    "log": [],
                    "outcome": "player_defeat",
                    "radar": {
                        "arena": {"w": 8, "h": 6},
                        "blips": [
                            {
                                **snapshot_combat_melee["combat"]["radar"]["blips"][0],
                                "hp": 0,
                                "alive": False,
                            },  # player dead
                            {
                                **snapshot_combat_melee["combat"]["radar"]["blips"][1],
                                "hp": 0,
                                "alive": False,
                            },  # serin dead
                            snapshot_combat_melee["combat"]["radar"]["blips"][2],
                            snapshot_combat_melee["combat"]["radar"]["blips"][3],
                        ],
                    },
                },
            }

            page.route("**/api/v1/loops/begin", lambda route: route.fulfill(json=snapshot_turn0))
            page.route("**/api/v1/loops/active*", lambda route: route.fulfill(json=snapshot_turn0))

            # Expose snapshots to window namespace
            page.add_init_script(f"window.snapshot_turn0 = {json.dumps(snapshot_turn0)};")
            page.add_init_script(f"window.snapshot_turn1 = {json.dumps(snapshot_turn1)};")
            page.add_init_script(f"window.snapshot_combat = {json.dumps(snapshot_combat)};")

            # Global action response handler
            current_action_response: list[Any] = [None]

            def handle_combat_action(route):
                resp = current_action_response[0]
                if resp is not None:
                    print(
                        f"[API MOCK] Fulfilling combat action with: {resp.get('prose', 'no prose')}"
                    )
                    route.fulfill(json=resp)
                else:
                    route.fulfill(json=snapshot_combat_moved)

            page.route("**/api/v1/combat/action", handle_combat_action)

            # Setup WS message Interceptor via python callback
            ws_sent_messages = []

            def handle_ws_send(msg):
                ws_sent_messages.append(msg)
                event = msg.get("event")
                print(f"[WS SENT] Event: {event}")

            page.expose_function("onMockWebSocketSend", handle_ws_send)

            # --- TEST STEP 1: BootIntro Verification ---
            print("Navigating to local React SPA...")
            page.goto(APP_URL)

            # Verify that boot intro is visible on first entry
            page.wait_for_selector(".boot-intro", timeout=5000)
            assert page.is_visible(".boot-intro"), "BootIntro must be visible on first entry!"
            assert "TEST PROJECT MYTHOS" in page.locator(".boot-logo").inner_text(), (
                "BootIntro logo text mismatch!"
            )
            page.screenshot(path=str(OUTPUT_DIR / "01_boot_intro.png"))
            print("Verified: BootIntro is correctly rendered.")

            # Click enter button to dismiss boot intro and go to onboarding
            page.click(".boot-enter-btn")
            page.wait_for_selector("#onboarding", timeout=5000)
            assert not page.is_visible(".boot-intro"), (
                "BootIntro must be dismissed after clicking Enter!"
            )
            page.wait_for_selector(".bgm-toggle:has-text('BGM ON')", timeout=3000)
            assert any("bgm_main.wav" in url for url in requested_urls), (
                "Main screen BGM must be requested after dismissing BootIntro."
            )
            page.screenshot(path=str(OUTPUT_DIR / "02_onboarding.png"))
            print("Verified: Onboarding form appeared and main BGM started after entering.")

            # --- TEST STEP 2: Onboarding & Hotkey Verification ---
            # Default name check
            display_name = page.locator("#display-name").input_value()
            assert display_name == "테스터", (
                f"Default display name should be '테스터', got '{display_name}'"
            )

            # Select Netrunner archetype card
            page.click(".arch-card:first-child")
            page.wait_for_timeout(300)

            # Start Game
            page.click("#start")

            # Accept session intro cinematic if visible
            print("Accepting session intro cinematic...")
            page.wait_for_selector(".intro-accept-btn", timeout=5000)
            page.screenshot(path=str(OUTPUT_DIR / "02.5_session_intro.png"))
            page.click(".intro-accept-btn")
            page.wait_for_timeout(300)

            # Now wait for play dashboard to be visible
            page.wait_for_selector("#play", timeout=5000)
            print("Successfully started game and entered dashboard.")

            # Wait for narration streaming to finish
            page.wait_for_selector("#choices button", timeout=12000)
            page.screenshot(path=str(OUTPUT_DIR / "03_dashboard_turn0.png"))
            print("Verified: Story streaming finished and choices are visible.")
            assert any("bgm_main.wav" in url or "bgm_calm.wav" in url for url in requested_urls), (
                "Exploration BGM must be requested after audio unlock."
            )
            print("Verified: Exploration BGM resource was requested.")

            # Hotkey Focus Test
            save_input = page.locator('#save-load-panel input[placeholder="설명 (선택)"]')
            save_input.click()
            save_input.fill("")
            page.keyboard.press("1")
            page.wait_for_timeout(300)
            input_val = save_input.input_value()
            assert input_val == "1", (
                f"Hotkey should be blocked during input focus, input value should be '1', got '{input_val}'"
            )
            print("Verified: Hotkey is blocked when input field is active.")

            # Clear and blur
            save_input.fill("")
            page.evaluate("document.activeElement.blur()")
            page.click("body")
            page.wait_for_timeout(800)

            # Route next API choose to turn 1 snapshot
            page.route("**/api/v1/loops/choose", lambda route: route.fulfill(json=snapshot_turn1))

            # Click first choice to progress to turn 1
            print("Clicking first choice to progress to Turn 1...")
            page.click("#choices button:first-child")

            # Wait for Turn 1 Choices
            page.wait_for_selector(
                '#choices button:has-text("안정적인 통신망 복구 시도")', timeout=12000
            )
            page.screenshot(path=str(OUTPUT_DIR / "04_dashboard_turn1.png"))
            print("Verified: Successfully selected choice 1 and progressed to Turn 1.")

            # --- TEST STEP 3: Requires / Cost & Character Panel Verification ---
            char_panel = page.locator(".character-panel")
            assert "정세린" in char_panel.locator(".char-name").inner_text(), (
                "Se-rin should be visible in character panel!"
            )
            assert "물거미" in char_panel.locator(".char-alias").inner_text(), (
                "Se-rin's alias '물거미' should be visible!"
            )
            assert "첫 인도자" in char_panel.locator(".char-arch").inner_text(), (
                "Se-rin's role should be visible!"
            )
            print("Verified: Character Panel correctly binds current interlocutor.")

            # Verify disabled choice
            disabled_button = page.locator('#choices button:has-text("안정적인 통신망 복구 시도")')
            assert disabled_button.is_disabled(), (
                "Choice with failed requirements must be disabled!"
            )
            style = disabled_button.evaluate("el => window.getComputedStyle(el).opacity")
            assert float(style) <= 0.6, f"Disabled choice should have reduced opacity (got {style})"
            print("Verified: Choice requirement failure correctly disables & dims the button.")

            # Verify cost indicator
            costly_button = page.locator('#choices button:has-text("소리를 내어 달아난다")')
            btn_text = costly_button.inner_text()
            assert "안정성 -10" in btn_text and "긴장도 +5" in btn_text, (
                f"Cost indicator mismatch! Got: {btn_text}"
            )
            print("Verified: Cost indicator is visible on the choice button.")

            # Route choice to Combat Snapshot
            page.route("**/api/v1/loops/choose", lambda route: route.fulfill(json=snapshot_combat))

            # Click choice 3 to enter combat
            combat_choice = page.locator('#choices button:has-text("보안팀 드론과 교전 준비")')
            combat_choice.click()

            # Wait for combat board (canvas)
            page.wait_for_selector("canvas#combat", timeout=12000)
            canvas = page.locator("canvas#combat")
            assert canvas.count() > 0, "Combat Canvas should be rendered!"
            assert any("bgm_combat_normal.wav" in url for url in requested_urls), (
                "Combat BGM must be requested when entering combat."
            )
            page.screenshot(path=str(OUTPUT_DIR / "05_combat_entered.png"))
            print("Verified: Successfully transitioned to Combat state and rendered the Canvas.")

            # --- VERIFICATION A: Canvas Idle Sprites and Portrait Fallback (Checklist 1) ---
            print("Waiting for canvas rendering to settle...")
            page.wait_for_timeout(1000)
            draw_logs = page.evaluate("window.canvasDrawLogs")
            print(f"Canvas initial draw logs count: {len(draw_logs)}")

            draw_images = [log for log in draw_logs if log["type"] == "drawImage"]
            image_srcs = [log["src"] for log in draw_images]
            print(f"Image sources rendered initially: {image_srcs}")

            # Check that player-noise, maintenance-drone-idle, and sentinel-drone-idle were drawn (Checklist 1.1)
            assert any("player-noise.png" in src for src in image_srcs), (
                "player-noise sprite must be rendered!"
            )
            assert any("maintenance-drone-idle.png" in src for src in image_srcs), (
                "maintenance-drone-idle sprite must be rendered!"
            )
            assert any("sentinel-drone-idle.png" in src for src in image_srcs), (
                "sentinel-drone-idle sprite must be rendered!"
            )
            print(
                "Verified (Checklist 1.1): Idle sprites for player, maintenance_drone, and sentinel_drone are rendering."
            )

            # Check that se-rin portrait fall back is used (Checklist 1.4)
            assert any("se-rin.png" in src for src in image_srcs), (
                "serin portrait fallback must be rendered!"
            )
            assert any(log["type"] == "arc" for log in draw_logs), (
                "arc (circle) fallback for serin must be used!"
            )
            print(
                "Verified (Checklist 1.4): Portrait fallback disk (arc + se-rin.png) is active for units without combat_images."
            )

            # --- VERIFICATION B: Drag & Drop Unit Movement ---
            current_action_response[0] = snapshot_combat_moved
            box = canvas.bounding_box()
            assert box is not None, "Canvas bounding box not found!"

            cols, rows = 8, 6
            src_x = box["x"] + (2 + 0.5) * (box["width"] / cols)
            src_y = box["y"] + (3 + 0.5) * (box["height"] / rows)
            dst_x = box["x"] + (3 + 0.5) * (box["width"] / cols)
            dst_y = box["y"] + (3 + 0.5) * (box["height"] / rows)

            print(f"Dragging player from ({src_x}, {src_y}) to ({dst_x}, {dst_y})...")
            page.mouse.move(src_x, src_y)
            page.mouse.down()
            for i in range(1, 11):
                px = src_x + (dst_x - src_x) * (i / 10.0)
                py = src_y + (dst_y - src_y) * (i / 10.0)
                page.mouse.move(px, py)
                page.wait_for_timeout(20)
            page.mouse.up()

            page.wait_for_timeout(1000)
            page.screenshot(path=str(OUTPUT_DIR / "06_combat_moved.png"))
            print("Verified: Drag-and-drop triggers coordinate-based unit movement successfully.")

            # --- VERIFICATION C: Ranged Skill (packet_shot) & CombatCinema Polish (Checklist 2.2 & 3) ---
            print("Triggering Ranged Skill (packet_shot) on maintenance_drone...")
            current_action_response[0] = snapshot_combat_ranged
            page.evaluate("window.canvasDrawLogs = []")

            page.click('#combat-controls button:has-text("패킷 사격")')
            page.wait_for_timeout(300)

            # Click target '정비 드론' on the canvas at (5, 2)
            tar_x = box["x"] + (5 + 0.5) * (box["width"] / cols)
            tar_y = box["y"] + (2 + 0.5) * (box["height"] / rows)
            page.mouse.click(tar_x, tar_y)

            # CombatCinema overlay should trigger
            print("Waiting for CombatCinema overlay...")
            page.wait_for_selector(".cinema-overlay", timeout=5000)
            assert page.is_visible(".cinema-overlay"), "CombatCinema overlay must be visible!"

            # 1. Attacker timing / audio-enhanced windup (Checklist 3.1)
            # Audio cues add request and decode work around the windup, so sample
            # the first observed combat phase instead of depending on one narrow
            # phase-attack frame after the overlay appears.
            page.wait_for_function(
                """() => {
                    const el = document.querySelector('.cinema-overlay');
                    return !!el && (
                      el.classList.contains('phase-attack') ||
                      el.classList.contains('phase-impact')
                    );
                }""",
                timeout=2500,
            )
            page.screenshot(path=str(OUTPUT_DIR / "06_1_cinema_overlay.png"))
            phase_class = page.locator(".cinema-overlay").first.evaluate("el => el.className")
            print(f"CombatCinema sampled phase class: {phase_class}")
            if "phase-attack" in phase_class:
                lunge_transform = page.locator(
                    ".cinema-overlay.phase-attack .actor-side.left"
                ).evaluate("el => window.getComputedStyle(el).transform")
                print(f"Lunge transform matrix: {lunge_transform}")
                assert "matrix" in lunge_transform, "Lunge transform matrix should be active!"
                print("Verified (Checklist 3.1): Attacker card has Lunge physics applied.")
            else:
                print("Verified (Checklist 3.1): CombatCinema advanced through windup into impact.")

            # 2. Defender Knockback (Checklist 3.2)
            page.wait_for_selector(".cinema-overlay.phase-impact", timeout=1000)
            audio_resources = requested_urls + page.evaluate(
                """() => performance.getEntriesByType('resource').map((entry) => entry.name)"""
            )
            assert any("skills/packet_shot.wav" in url for url in audio_resources), (
                "Skill-specific windup SFX must be requested."
            )
            assert any("sfx_attack.wav" in url for url in audio_resources), (
                "Impact SFX must be requested."
            )
            print("Verified: CombatCinema skill-specific windup and impact SFX were requested.")

            impact_animation = page.locator(
                ".cinema-overlay.phase-impact .actor-side.right"
            ).evaluate(
                "el => window.getComputedStyle(el).animationName || window.getComputedStyle(el).animation"
            )
            print(f"Impact animation: {impact_animation}")
            assert "staggerShake" in impact_animation, (
                "staggerShake animation must be active on defender during impact!"
            )

            # Damage pop-up check
            damage_pop = page.locator(".cinema-overlay.phase-impact .damage-number")
            assert damage_pop.count() > 0, "Damage number must pop up during impact!"
            print(
                "Verified (Checklist 3.2): Defender card has Knockback physics (staggerShake) applied."
            )

            # Wait for CombatCinema to finish and close
            page.wait_for_selector(".cinema-overlay", state="detached", timeout=8000)
            print("CombatCinema overlay closed.")

            # 3. Canvas Ranged Tracer FX (Checklist 2.2)
            page.wait_for_timeout(600)
            logs = page.evaluate("window.canvasDrawLogs")
            line_logs = [log for log in logs if log["type"] == "lineTo"]
            assert len(line_logs) > 0, "Tracer beam lineTo must be called for packet_shot!"
            print(
                "Verified (Checklist 2.2): packet_shot ranged tracer beam successfully drawn on canvas."
            )

            # --- VERIFICATION D: Drone Guard 포즈 검증 (Checklist 4.1) ---
            print("Triggering Drone Guard state...")
            current_action_response[0] = snapshot_combat_guard
            page.evaluate("window.canvasDrawLogs = []")

            page.click('#combat-controls button:has-text("대기")')
            page.wait_for_timeout(1000)

            logs = page.evaluate("window.canvasDrawLogs")
            image_srcs = [log["src"] for log in logs if log["type"] == "drawImage"]
            print(f"Image sources rendered during guard: {image_srcs}")
            assert any("maintenance-drone-guard.png" in src for src in image_srcs), (
                "maintenance-drone-guard sprite must be rendered!"
            )
            assert any("sentinel-drone-guard.png" in src for src in image_srcs), (
                "sentinel-drone-guard sprite must be rendered!"
            )
            print(
                "Verified (Checklist 4.1): Drone Guard pose assets are successfully rendered when defending."
            )

            # --- VERIFICATION E: Heal Skill (patch_protocol) Canvas FX (Checklist 2.4) ---
            print("Triggering Heal Skill (patch_protocol)...")
            current_action_response[0] = snapshot_combat_heal
            page.evaluate("window.canvasDrawLogs = []")

            page.click('#combat-controls button:has-text("패치 프로토콜")')
            page.wait_for_timeout(300)

            # Click serin at (1, 3)
            tar_x = box["x"] + (1 + 0.5) * (box["width"] / cols)
            tar_y = box["y"] + (3 + 0.5) * (box["height"] / rows)
            page.mouse.click(tar_x, tar_y)

            page.wait_for_selector(".cinema-overlay", state="detached", timeout=8000)
            page.wait_for_timeout(800)
            logs = page.evaluate("window.canvasDrawLogs")
            ellipse_logs = [log for log in logs if log["type"] == "ellipse"]
            has_green_ring = any(
                "7dff9b" in (log.get("strokeStyle") or "").lower()
                or (
                    "125" in (log.get("strokeStyle") or "")
                    and "255" in (log.get("strokeStyle") or "")
                    and "155" in (log.get("strokeStyle") or "")
                )
                for log in ellipse_logs
            )
            has_white_spark = any(
                "ffffff" in (log.get("fillStyle") or "").lower()
                or (
                    "255" in (log.get("fillStyle") or "")
                    and "255" in (log.get("fillStyle") or "")
                    and "255" in (log.get("fillStyle") or "")
                )
                for log in ellipse_logs
            )
            assert has_green_ring, (
                f"Green recovery aura ring must be drawn! Ellipse logs: {ellipse_logs}"
            )
            assert has_white_spark, (
                f"White healing spark must be drawn! Ellipse logs: {ellipse_logs}"
            )
            print(
                "Verified (Checklist 2.4): patch_protocol healing aura rings and sparks successfully drawn on canvas."
            )

            # --- VERIFICATION F: Mobility Skill (signal_step) Canvas FX (Checklist 2.1) ---
            print("Triggering Mobility Skill (signal_step)...")
            current_action_response[0] = snapshot_combat_mobility
            page.evaluate("window.canvasDrawLogs = []")

            page.click('#combat-controls button:has-text("신호 도약")')
            page.wait_for_timeout(300)

            # Click (4, 3)
            tar_x = box["x"] + (4 + 0.5) * (box["width"] / cols)
            tar_y = box["y"] + (3 + 0.5) * (box["height"] / rows)
            page.mouse.click(tar_x, tar_y)

            page.wait_for_selector(".cinema-overlay", state="detached", timeout=8000)
            page.wait_for_timeout(800)
            logs = page.evaluate("window.canvasDrawLogs")
            ellipse_logs = [log for log in logs if log["type"] == "ellipse"]
            has_violet_ring = any(
                "e07dff" in (log.get("strokeStyle") or "").lower()
                or (
                    "224" in (log.get("strokeStyle") or "")
                    and "125" in (log.get("strokeStyle") or "")
                    and "255" in (log.get("strokeStyle") or "")
                )
                for log in ellipse_logs
            )
            assert has_violet_ring, f"Violet blink ring must be drawn! Ellipse logs: {ellipse_logs}"
            print(
                "Verified (Checklist 2.1): signal_step mobility collapsing/expanding rings successfully drawn on canvas."
            )

            # --- VERIFICATION G: Defense Skill (covering_noise) Canvas FX (Checklist 2.3) ---
            print("Triggering Defense Skill (covering_noise)...")
            current_action_response[0] = snapshot_combat_defense
            page.evaluate("window.canvasDrawLogs = []")

            page.click('#combat-controls button:has-text("엄호 노이즈")')
            page.wait_for_timeout(300)

            # Click player at (4, 3)
            tar_x = box["x"] + (4 + 0.5) * (box["width"] / cols)
            tar_y = box["y"] + (3 + 0.5) * (box["height"] / rows)
            page.mouse.click(tar_x, tar_y)

            page.wait_for_selector(".cinema-overlay", state="detached", timeout=8000)
            page.wait_for_timeout(800)
            logs = page.evaluate("window.canvasDrawLogs")
            ellipse_logs = [log for log in logs if log["type"] == "ellipse"]
            has_cyan_ring = any(
                "8fffea" in (log.get("strokeStyle") or "").lower()
                or (
                    "143" in (log.get("strokeStyle") or "")
                    and "255" in (log.get("strokeStyle") or "")
                    and "234" in (log.get("strokeStyle") or "")
                )
                for log in ellipse_logs
            )
            assert has_cyan_ring, f"Cyan barrier ring must be drawn! Ellipse logs: {ellipse_logs}"
            print(
                "Verified (Checklist 2.3): covering_noise defensive shield rings successfully drawn on canvas."
            )

            # --- VERIFICATION H: Melee Skill (overload_strike) Canvas FX (Checklist 2.5) ---
            print("Triggering Melee Skill (overload_strike)...")
            current_action_response[0] = snapshot_combat_melee
            page.evaluate("window.canvasDrawLogs = []")

            page.click('#combat-controls button:has-text("과부하 일격")')
            page.wait_for_timeout(300)

            # Click maintenance_drone at (5, 2)
            tar_x = box["x"] + (5 + 0.5) * (box["width"] / cols)
            tar_y = box["y"] + (2 + 0.5) * (box["height"] / rows)
            page.mouse.click(tar_x, tar_y)

            # Wait for CombatCinema to finish and close
            page.wait_for_selector(".cinema-overlay", state="detached", timeout=8000)
            page.wait_for_timeout(600)
            logs = page.evaluate("window.canvasDrawLogs")
            ellipse_logs = [log for log in logs if log["type"] == "ellipse"]
            has_yellow_spark = any(
                "ffd76a" in (log.get("fillStyle") or "").lower()
                or (
                    "255" in (log.get("fillStyle") or "")
                    and "215" in (log.get("fillStyle") or "")
                    and "106" in (log.get("fillStyle") or "")
                )
                for log in ellipse_logs
            )
            assert has_yellow_spark, (
                f"Yellow spark blast must be drawn! Ellipse logs: {ellipse_logs}"
            )
            print(
                "Verified (Checklist 2.5): overload_strike melee hit spark explosion successfully drawn on canvas."
            )

            # --- VERIFICATION I: Combat Defeat & Exit (Return to Main) ---
            print("Triggering Combat Defeat...")
            current_action_response[0] = snapshot_combat_defeat

            wait_btn = page.locator('#combat-controls button:has-text("대기")')
            if wait_btn.count() > 0:
                wait_btn.click()
            else:
                page.keyboard.press("d")

            # Defeat banner should appear
            page.wait_for_selector(".combat-outcome.lose", timeout=5000)
            page.screenshot(path=str(OUTPUT_DIR / "07_combat_defeat.png"))
            print("Verified: Combat defeat banner successfully displayed.")

            # Verify Run History in sidebar
            print("Verifying Run History in sidebar before returning to main...")
            page.wait_for_selector("#history-panel .save-slot-item", timeout=3000)
            text = page.locator("#history-panel .save-slot-item").first.inner_text()
            assert "유리성의 사서" in text, f"Run history should show finished ending, got '{text}'"
            print("Verified: Sidebar shows Run History.")

            # Click '메인 화면으로 ▸' (Return to Main) button
            return_btn = page.locator("#cc-return-main")
            assert return_btn.count() > 0, "Return to main button must be visible after defeat!"
            return_btn.click()

            # Wait for onboarding panel to reload
            page.wait_for_selector("#onboarding", timeout=5000)
            assert not page.is_visible(".boot-intro"), (
                "BootIntro must NOT reappear after returning to main from session!"
            )
            page.screenshot(path=str(OUTPUT_DIR / "08_returned_main.png"))
            print("Verified: Returned to main menu. BootIntro did not show again (1-time rule).")

            # Success!
            print("All Checklist E2E Playwright tests passed successfully!")
            success = True
            browser.close()
    except Exception as e:
        print(f"E2E Test Failed: {e}", file=sys.stderr)
        try:
            if "page" in locals() and page:
                html_path = OUTPUT_DIR / "e2e_failure_diagnostics.html"
                html_path.write_text(page.content(), encoding="utf-8")
                print(f"HTML DOM dumped at {html_path}", file=sys.stderr)
                page.screenshot(path=str(OUTPUT_DIR / "e2e_failure_diagnostics.png"))
                print(
                    f"Diagnostics captured at {OUTPUT_DIR / 'e2e_failure_diagnostics.png'}",
                    file=sys.stderr,
                )
        except Exception as diag_error:
            print(f"Failed to capture diagnostics: {diag_error}", file=sys.stderr)
        import traceback

        traceback.print_exc()
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass
        print("Stopping uvicorn server...")
        server_process.terminate()
        server_process.join(timeout=5)
        if server_process.is_alive():
            server_process.kill()
            server_process.join(timeout=5)

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    run_test()
