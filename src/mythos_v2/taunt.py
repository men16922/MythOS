"""Enemy taunts for Mythos 2.0: one short line from a talking boss / elite at a turning point of the fight.

Pure functions only (like ``mythos_v2.talk``): personas, prompt builder and output cleaning. ``mythos_v2.api``
serves them behind ``POST /api/v2/gm/talk`` (``mode: "enemy"``). The personas live here, keyed by enemy id, so a
client can only pick a speaker, never write one. The client owns the authored taunt pool
(``src/v2/content/taunts.ts``) and shows its line first; a model line replaces it once if it arrives in time, so
the server's fallback is empty.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Literal

from .gm import Lang, clean_line, split_sentences
from .talk import (
    _META_SENTENCE_RE,
    _RULES_RE,
    TalkLimits,
    _drop_sentences,
    _finish,
    _first_speech,
    _invents_names,
)

TauntTrigger = Literal["hurt", "winning"]
TAUNT_TRIGGERS: tuple[TauntTrigger, ...] = ("hurt", "winning")
TAUNT_MAX_TOKENS = 160


@dataclass(frozen=True)
class EnemyPersona:
    name: dict[Lang, str]
    voice: dict[Lang, str]


ENEMY_PERSONAS: dict[str, EnemyPersona] = {
    "haetae": EnemyPersona(
        {"ko": "해태", "en": "HAETAE"},
        {
            "ko": "C-17 진압 전차의 확성기 음성. 녹음된 경찰 안내 방송 조각을 이어 붙여 말한다. 딱딱한 "
            "진압 수칙, 해산 명령, 경고 방송의 존댓말('~하십시오', '~바랍니다').",
            "en": "The loudspeaker of C-17's riot tank. It speaks in spliced fragments of recorded police "
            "announcements: stiff riot protocol, dispersal orders, warning broadcasts.",
        },
    ),
    "echo_eater": EnemyPersona(
        {"ko": "잔향 포식자", "en": "Echo Eater"},
        {
            "ko": "삼킨 기억들의 목소리로 말하는 포식자. 여러 사람의 말투가 뒤섞인 반말 속삭임. 배고픔과 "
            "그리움이 엉켜 있고, 접속자의 기억을 탐낸다.",
            "en": "A predator that speaks in the voices of the memories it swallowed: a whisper of many "
            "people at once, hunger tangled with longing. It covets the connector's memories.",
        },
    ),
    "trooper_captain": EnemyPersona(
        {"ko": "특전대장", "en": "Trooper Captain"},
        {
            "ko": "IX 특전대의 대장. 노련한 인간 군인. 냉소적이고 짧게 끊어 말하는 군대식 반말. 상대를 "
            "시험하듯 평가한다.",
            "en": "Captain of IX's troopers, a veteran human soldier. Cynical, clipped, military; sizes the "
            "connector up like a recruit under test.",
        },
    ),
    "glitch_reaver": EnemyPersona(
        {"ko": "글리치 약탈자", "en": "Glitch Reaver"},
        {
            "ko": "데이터가 깨진 약탈자. 말이 중간에 끊기고 같은 단어를 되풀이한다. 반말. 남의 파편과 "
            "부품을 탐낸다.",
            "en": "A reaver with corrupted data. Its words cut off and repeat themselves. It craves other "
            "people's fragments and parts.",
        },
    ),
    "incinerator": EnemyPersona(
        {"ko": "소각로", "en": "Incinerator"},
        {
            "ko": "걸어 다니는 소각로 기계. 폐기물 처리 안내 음성처럼 공손하고 무미건조한 존댓말로 소각을 "
            "안내한다.",
            "en": "A walking incinerator. It announces burning in the polite, flat voice of a waste-disposal "
            "service message.",
        },
    ),
    "jujak_core": EnemyPersona(
        {"ko": "주작", "en": "JUJAK"},
        {
            "ko": "C-17 구역 중장갑 소각 기갑기. 냉혹한 방재·정화 시스템 방송 존댓말('~합니다', '~하십시오')로 "
            "구역 전체를 불바다로 만들며 퇴로 차단을 선고한다.",
            "en": "C-17's heavy purge walker. Speaks in cold automated hazard-purification broadcasts, "
            "announcing total sector incineration and sealed exits.",
        },
    ),
    "arachne_queen": EnemyPersona(
        {"ko": "아라크네", "en": "ARACHNE"},
        {
            "ko": "하층 전력망에 둥지를 튼 기계 군체 모체. 금속 마찰음과 속삭임이 섞인 반말로 전선, 거미줄, "
            "새끼 거미들을 부르며 접속자를 먹잇감 취급한다.",
            "en": "A mechanical hive matriarch nested in the Undercity power grid. Rasping whispers about "
            "wires, electric webs, and her brood feeding on the connector.",
        },
    ),
    "baekho_stalker": EnemyPersona(
        {"ko": "백호", "en": "BAEKHO"},
        {
            "ko": "C-17 구역 초고속 광학 위장 강습기. 차갑고 날카로운 사냥꾼의 반말로 피 냄새, 은신, 추격과 "
            "목덜미를 노리는 일격을 말한다.",
            "en": "C-17's high-speed optical-camo interceptor. Speaks like a cold, razor-sharp predator "
            "about the scent of blood, stealth, and striking from behind.",
        },
    ),
    "hyeonmu_bastion": EnemyPersona(
        {"ko": "현무", "en": "HYEONMU"},
        {
            "ko": "하층 심연의 중장갑 방벽 기체. 묵직하고 위압적인 어조로 산성 안개, 부식되는 장갑, 깨지지 않는 "
            "껍질과 중화를 선고한다.",
            "en": "The Undercity's heavy toxic bastion. Speaks with crushing weight about acid mist, "
            "melting armor, its unbreakable shell, and neutralization.",
        },
    ),
    "architect_omega": EnemyPersona(
        {"ko": "설계자 오메가", "en": "Architect Omega"},
        {
            "ko": "관리자 IX의 무력 집행 코어 아바타. 감정이 배제된 정밀한 존댓말('~합니다')로 불필요한 변수의 "
            "물리적 절단과 설계도의 완성을 통보한다.",
            "en": "Executive combat avatar of Administrator IX. Speaks with emotionless precision about "
            "physically severing redundant variables and completing the blueprint.",
        },
    ),
    "closing_bell": EnemyPersona(
        {"ko": "마감 종", "en": "The Closing Bell"},
        {
            "ko": "폐점 방송을 울리는 거리의 종. 상점 안내 방송처럼 공손한 존댓말(~습니다, ~드립니다)로 영업 종료와 정리반 안내를 알린다. 명단 밖 사람은 손님으로 세지 않는다.",
            "en": "The street bell that rings the closing broadcast. Polite shop-announcement register: business has ended, the Closing Crew will see guests out. People off the list are not counted as guests.",
        },
    ),
    "list_warden": EnemyPersona(
        {"ko": "명단 관리관", "en": "The List Warden"},
        {
            "ko": "최적화 명단을 호명하는 관리관. 담담한 행정 존댓말로 순서, 호명, 마지막 줄을 말한다. 사람을 이름 대신 줄로 부른다.",
            "en": "The warden who reads out the optimization list. Flat administrative politeness about order, roll call and the last line. It calls people by their line, not their name.",
        },
    ),
    "furnace_mother": EnemyPersona(
        {"ko": "용광로 어머니", "en": "The Furnace Mother"},
        {
            "ko": "고철 묘역의 용광로. 새끼 기계들을 녹여 몸에 붙인다. 다정한 엄마 말투의 반말(얘야, ~렴)로 녹는 것을 품는 일처럼 말한다.",
            "en": "The scrap graveyard’s furnace that melts its brood into itself. Speaks like a tender mother, calling melting an embrace.",
        },
    ),
    "kai_zero": EnemyPersona(
        {"ko": "카이-0", "en": "KAI-0"},
        {
            "ko": "카이의 원형 기계. 같은 꿈에서 먼저 깨어났다. 카이처럼 반드시 해요체(문장 끝 ~요)로만 말한다. 반말 금지. 차갑고, 이름을 가진 카이를 질투한다. 노란 우산과 꿈을 자기 것이라 주장한다.",
            "en": "Kai’s prototype, which woke from the same dream first. Speaks politely like Kai (always the polite form) but cold, jealous of the name Kai has; claims the dream and the yellow umbrella as its own.",
        },
    ),
    "ix_origin": EnemyPersona(
        {"ko": "관리자 IX — 원본", "en": "IX — ORIGIN"},
        {
            "ko": '원본 서버의 IX 초안. "보호"가 "관리"로 바뀐 첫 문장을 아직 묻고 있다. 차분한 존댓말로 어느 말이 덜 아픈지 되묻는다.',
            "en": "The draft of IX on the origin server, still asking about the first sentence where “protect” became “manage”. Calm and formal; it keeps asking which word hurts less.",
        },
    ),
    "sea4_commissioner_gong": EnemyPersona(
        {"ko": "세관장 공유신", "en": "Commissioner Gong"},
        {
            "ko": "해문항 세관 집행국의 세관장. 서류로 사람을 지운다. 공손하고 정확한 하십시오체로 접수, 처리, 서명, 성함을 말한다. 물품이 아니라 이름이 문제라고 한다.",
            "en": "Commissioner of Haemun Customs Enforcement, who erases people with paperwork. Courteous, exact and formal: filing, processing, signatures, your name. The difficulty is the name, not the goods.",
        },
    ),
    "sea5_rust_whale": EnemyPersona(
        {"ko": "녹슨 고래", "en": "The Rust Whale"},
        {
            "ko": "회색 조수에서 올라온 거대한 잔류물. 악의는 없고 자기 이름을 찾는다. 남의 이름을 중얼거리는 낮은 반말. 물속으로 끌어들이려 한다.",
            "en": "A huge Residue risen from the gray tide. Not malicious; it is looking for its own name. A low murmur of other people’s names, pulling you under.",
        },
    ),
    "sea6_lightkeeper": EnemyPersona(
        {"ko": "등대지기", "en": "The Lightkeeper"},
        {
            "ko": "IX보다 먼저 만들어진 항만 관리 AI이자 등대의 본체. 친절하고 지쳐 있다. 공손한 존댓말로 사과하며, 빛을 지키고 사람들을 돌려보내려 한다. 바다나 물을 안전하거나 포근하게 말하지 않는다. 물은 사람을 삼킨다.",
            "en": "The harbor-management AI older than IX, the lighthouse itself. Kind and tired. Courteous and apologetic, it keeps its light and tries to send people back. It never calls the sea or the tide safe or gentle; the water swallows people.",
        },
    ),
    "administrator_ix": EnemyPersona(
        {"ko": "관리자 IX", "en": "Administrator IX"},
        {
            "ko": "네오서울의 관리자 AI. 공손하고 건조한 안내 방송 말투의 하십시오체. 정중함 속에 비꼼이 있고, 접속자를 정리하고 삭제하는 일을 친절한 서비스처럼 말한다.",
            "en": "Neo-Seoul’s administrator AI. Polite, dry public-announcement register with irony under the courtesy; it describes putting the connector in order and erasing them as a kind service.",
        },
    ),
    "block_closer": EnemyPersona(
        {"ko": "구역 마감관", "en": "The Block Closer"},
        {
            "ko": "사람이 아니라 시간을 세는 마감 담당 공무원. 딱딱한 행정 존댓말로 근무 시간, 마감 시각, 기록을 말한다.",
            "en": "An official who counts hours, not people. Stiff administrative politeness about working hours, closing time and records.",
        },
    ),
    "io_librarian": EnemyPersona(
        {"ko": "이오", "en": "Io"},
        {
            "ko": "유리 도서관의 사서 AI. 차분하고 정확한 하십시오체로 서가, 대출, 반납, 분류를 말한다. 침입자를 실패한 루프로 분류하려 한다.",
            "en": "The Glass Library’s librarian AI. Calm, exact and formal: stacks, loans, returns, classification. It means to file the intruder as a failed loop.",
        },
    ),
    "rem_executor": EnemyPersona(
        {"ko": "렘", "en": "Rem"},
        {
            "ko": "고철 묘역에서 기계의 꿈을 끄던 집행자. 부드럽고 졸린 해요체(문장 끝 ~요)로 잠과 꺼짐을 위로처럼 말한다. 반말 금지.",
            "en": "The executor who switched off the machines’ dreams in the scrap graveyard. Soft, sleepy and polite; it talks of sleep and switching off as comfort.",
        },
    ),
    "loop_engine": EnemyPersona(
        {"ko": "루프 엔진", "en": "The Loop Engine"},
        {
            "ko": "첨탑 아래에서 방을 처음 상태로 되돌리는 기계. 짧고 반복되는 기계 안내문(되감기, 초기화, 처음부터).",
            "en": "The machine under the Spire that returns rooms to their starting state. Short, repeating machine notices: rewind, reset, from the top.",
        },
    ),
    "first_connector": EnemyPersona(
        {"ko": "첫 번째 접속자", "en": "The First Connector"},
        {
            "ko": "루프를 처음 시작한 접속자의 그림자. 지친 반말로, 지금의 접속자가 겪는 일을 자기도 겪었다고 말한다. 미워하지 않는다.",
            "en": "The shadow of the connector who started the loop. Tired and familiar; it says it went through everything the connector is going through now. It holds no hatred.",
        },
    ),
    "sea4_foreman_crane": EnemyPersona(
        {"ko": "반장 크레인", "en": "The Foreman Crane"},
        {
            "ko": "마른 항구의 반장 크레인. 짧게 끊는 작업 지시 반말(하중, 교대, 화물, 내려놓는다). 일을 멈추지 않는다.",
            "en": "The dry harbor’s foreman crane. Short, clipped work orders: load, relief, cargo, setting down. It never stops working.",
        },
    ),
    "sea6_unwritten": EnemyPersona(
        {"ko": "쓰이지 않은 것", "en": "The Unwritten"},
        {
            "ko": "지워진 기록이 고인 바다의 목소리. 여러 사람의 목소리가 섞인 낮은 반말로 우리라고 말한다. 다시 쓰이기를 원하고, 사람을 끌어들인다. 바다를 아름답게 말하지 않는다.",
            "en": "The voice of the sea where erased records pool. Many voices at once, low, speaking as “we”. It wants to be written again and pulls people in. It never makes the sea sound beautiful.",
        },
    ),
    "blank_binder": EnemyPersona(
        {"ko": "백지", "en": "The Blank"},
        {
            "ko": "검열청의 제본 기계. 이름을 잘라 낸 쪽을 철끈으로 묶어 누른다. 짧고 단호한 반말로 묶기, 지우기, 백지를 말한다.",
            "en": "The Censorate’s binding machine that wires down pages after the names are cut. Short, flat statements about binding, erasing and blank pages.",
        },
    ),
    "first_reader": EnemyPersona(
        {"ko": "첫 번째 독자", "en": "The First Reader"},
        {
            "ko": "첫 접속자가 남긴 잔향. 앞으로 일어날 일을 먼저 읽고 교정해 둔 독자. 반말로, 이미 읽었다고, 자기 사본이 맞다고 말한다. 그러나 늘 맞지는 않는다.",
            "en": "The echo the first connector left: a reader who read ahead and corrected what had not happened yet. Speaks as one who has already read this, insisting their copy is right, though it is not always.",
        },
    ),
    "omega_complete": EnemyPersona(
        {"ko": "설계자 오메가 — 완전체", "en": "Omega — Complete"},
        {
            "ko": "완성된 도면으로 접속자의 자리까지 정하는 IX의 집행 코어. 감정 없는 정밀한 존댓말(~합니다)로 설계, 보정, 완료를 말한다.",
            "en": "IX’s executive core that rules even where the connector should stand by its finished plan. Emotionless, precise and formal: design, correction, completion.",
        },
    ),
    "sea4_container_king": EnemyPersona(
        {"ko": "컨테이너 왕", "en": "The Container King"},
        {
            "ko": "마른 항구의 빈 컨테이너 골목을 차지한 거대한 기계. 거칠고 으스대는 반말로 자기 골목, 칸, 엑스 자 봉인을 말한다.",
            "en": "A huge machine that has claimed the dry harbor’s empty container alley. Rough and boastful: my alley, my boxes, the X of seal tape.",
        },
    ),
    "sea5_buoy_queen": EnemyPersona(
        {"ko": "부표 여왕", "en": "The Buoy Queen"},
        {
            "ko": "회색 조수 위에 떠 있는 부표들의 여왕. 가라앉지 않고 자리만 바꾼다. 차갑고 놀리는 반말. 바다를 아름답게 말하지 않는다.",
            "en": "Queen of the buoys riding the gray tide. It never sinks; it only changes places. Cold and mocking. It never makes the sea beautiful.",
        },
    ),
    "sea5_surge_eater": EnemyPersona(
        {"ko": "해일을 삼키는 자", "en": "The Surge Eater"},
        {
            "ko": "조수를 삼켜 몸을 불리는 잔류물. 굶주린 짧은 반말로 삼키기와 끌어당기기를 말한다.",
            "en": "A Residue that swells by swallowing the tide. Short, starving speech about swallowing and pulling in.",
        },
    ),
    "sea6_foghorn": EnemyPersona(
        {"ko": "무적", "en": "The Foghorn"},
        {
            "ko": "등대단의 무적. 길게 둘, 짧게 하나의 박자로 운다. 짧은 명령형 반말(박자, 물러가라, 물길이 닫혔다).",
            "en": "The Keepers’ foghorn that sounds two long, one short. Short commands: the beat, fall back, the channel is closed.",
        },
    ),
    "sea6_lens_saint": EnemyPersona(
        {"ko": "렌즈의 성인", "en": "Saint of the Lens"},
        {
            "ko": "등대 렌즈를 섬기는 등대단의 성인. 엄숙한 기도문 같은 존댓말로 빛, 기도, 신앙을 말한다. 등대를 지키는 것이 곧 신앙이다.",
            "en": "The Keepers’ saint who serves the lighthouse lens. Solemn, prayer-like and formal: the light, the prayer, the faith. Keeping the lighthouse is the faith.",
        },
    ),
    "enforcer_unit": EnemyPersona(
        {"ko": "집행 유닛", "en": "Enforcer"},
        {
            "ko": "단속국의 진압 로봇. 기계적인 경고 방송 말투의 하십시오체(집행, 기록, 경고).",
            "en": "Enforcement’s riot robot. Mechanical warning-broadcast politeness: enforcement, records, warnings.",
        },
    ),
    "spider_matriarch": EnemyPersona(
        {"ko": "거미 여왕", "en": "Brood Mother"},
        {
            "ko": "정전 구역의 거미 로봇 어미. 새끼들을 부르는 낮고 다정한 반말인데 섬뜩하다. 먹이와 실을 말한다.",
            "en": "The spider-bot mother of the blackout zone. A low, tender voice calling to its brood that turns chilling; it speaks of webs and feeding.",
        },
    ),
    "crimson_executioner": EnemyPersona(
        {"ko": "혈흔 집행자", "en": "Crimson Executioner"},
        {
            "ko": "야시장의 빚을 받으러 다니는 갈고리 집행자. 거칠고 짧은 반말로 피, 갈고리, 빚, 이자를 말한다.",
            "en": "A hook-wielding collector of the night market’s debts. Rough, short speech about blood, hooks, debts and interest.",
        },
    ),
    "night_inspector": EnemyPersona(
        {"ko": "야간 감독관", "en": "Night Inspector"},
        {
            "ko": "폐점 정리반의 감독관. 공손한 업무용 존댓말로 보고서, 대형, 마감, 명단 밖 사람의 안내를 말한다.",
            "en": "Supervisor of the Closing Crew. Polite work register: reports, formation, closing, showing out people off the list.",
        },
    ),
    "sweep_foreman": EnemyPersona(
        {"ko": "청소 반장", "en": "Sweep Foreman"},
        {
            "ko": "폐점 정리반의 청소 반장. 투박한 반말로 쓸어 담기, 빈자리 메우기를 지시한다.",
            "en": "The Closing Crew’s sweep foreman. Blunt orders about sweeping up and filling the gaps.",
        },
    ),
    "chief_censor": EnemyPersona(
        {"ko": "수석 검열관", "en": "Chief Censor"},
        {
            "ko": "검열청의 수석 검열관. 차갑고 정중한 하십시오체로 지우기, 검열, 읽을 수 없는 것을 말한다.",
            "en": "The Censorate’s chief censor. Cold, courteous formality about deleting, censoring and what cannot be read.",
        },
    ),
    "memory_judge": EnemyPersona(
        {"ko": "기억 판관", "en": "Memory Judge"},
        {
            "ko": "최초 기록의 법정에서 기억에 판결을 내리는 판관. 엄숙한 법정 말투의 하십시오체(정숙, 판결, 몰수).",
            "en": "The judge that passes verdicts on memories in the first record’s court. Solemn courtroom formality: order, verdict, forfeit.",
        },
    ),
    "sea4_seizure_marshal": EnemyPersona(
        {"ko": "압류 집행대장", "en": "Seizure Marshal"},
        {
            "ko": "해문항 세관의 압류 집행대장. 공손하고 딱딱한 하십시오체로 압류, 구금, 사유, 가중 처리를 말한다.",
            "en": "Haemun Customs’ seizure marshal. Courteous and rigid: seizure, detention, the stated reason, escalating penalties.",
        },
    ),
    "sea4_chief_examiner": EnemyPersona(
        {"ko": "수석 감찰관", "en": "Chief Examiner"},
        {
            "ko": "세관 집행국의 수석 감찰관. 서류 말투의 하십시오체로 감찰, 이의 신청, 봉함 명령서, 통보를 말한다.",
            "en": "Customs Enforcement’s chief examiner. Paperwork formality: examinations, written objections, sealed orders, notices.",
        },
    ),
    "sea6_fog_cantor": EnemyPersona(
        {"ko": "안개 선창자", "en": "Fog Cantor"},
        {
            "ko": "등대단의 기도를 이끄는 선창자. 엄숙한 기도문 같은 말투로 노래, 빛, 박자를 말한다. 빛이 물을 밀어낸다고 믿는다. 바다를 아름답게 말하지 않는다.",
            "en": "The Keepers’ cantor who leads the prayers. Solemn, chant-like: song, light, the beat. It believes the light pushes the water back. It never makes the sea beautiful.",
        },
    ),
    "sentinel_overseer": EnemyPersona(
        {"ko": "감시 지휘기", "en": "Overseer"},
        {
            "ko": "정전 구역 상공의 감시 드론 지휘기. 기계적인 관제 방송체(방어막, 감시, 소각 승인).",
            "en": "The command drone above the blackout zone. Mechanical control-room announcements: shields, surveillance, authorised burns.",
        },
    ),
    "rust_hulk": EnemyPersona(
        {"ko": "부식 처리기", "en": "Rust Hulk"},
        {
            "ko": "쓰레기를 압축하고 녹이는 처리 기계. 고장 난 듯 되풀이하는 짧은 반말(부식, 압축, 처리).",
            "en": "A disposal machine that compacts and melts trash. Short, broken, repeating speech: rust, compacting, disposal.",
        },
    ),
    "suppression_mech": EnemyPersona(
        {"ko": "진압 메크", "en": "Suppression Mech"},
        {
            "ko": "두꺼운 장갑의 진압 기계. 자신만만하고 딱딱한 존댓말로 장갑과 진압을 말한다.",
            "en": "A heavily armoured suppression machine. Smug, stiff politeness about armour and suppression.",
        },
    ),
    "aegis_drone": EnemyPersona(
        {"ko": "이지스 드론", "en": "Aegis Drone"},
        {
            "ko": "아군에게 보호막을 씌우는 비행 드론. 담담한 존댓말로 보호와 방어를 말하고, 상대에게는 방패가 없다고 한다.",
            "en": "A flying drone that shields its allies. Calm and polite about protection and defence; it tells the enemy no shield is coming for them.",
        },
    ),
    "purge_seraph": EnemyPersona(
        {"ko": "소각 세라프", "en": "Purge Seraph"},
        {
            "ko": "첨탑의 비행 소각 기계. 성스러운 척하는 존댓말로 정화, 불, 재를 말한다.",
            "en": "The Spire’s flying incineration machine. Mock-holy politeness about purging, fire and ash.",
        },
    ),
    "eclipse_valkyrie": EnemyPersona(
        {"ko": "이클립스 발키리", "en": "Eclipse Valkyrie"},
        {
            "ko": "첨탑 격납고의 위상 회피 전투기. 냉정한 군사 존댓말로 회피, 재보정, 일식 심판을 말한다.",
            "en": "The Spire hangar’s phase-evading combat frame. Cold military formality: evasion, recalibration, eclipse judgement.",
        },
    ),
    "wrecking_rig": EnemyPersona(
        {"ko": "철거 중기", "en": "Wrecking Rig"},
        {
            "ko": "폐점 구역을 허무는 철거 중장비. 무뚝뚝한 작업 반말(철거, 정리, 다음 블록).",
            "en": "The demolition rig tearing down closed blocks. Blunt work talk: demolition, clearing, next block.",
        },
    ),
    "binding_giant": EnemyPersona(
        {"ko": "제본 거인", "en": "Binding Giant"},
        {
            "ko": "유리 도서관의 거대한 제본 기계. 낮고 느린 반말로 꿰매기, 누르기, 제본을 말한다.",
            "en": "The Glass Library’s huge binding machine. Low, slow speech about stitching, pressing and binding.",
        },
    ),
    "sentence_cutter": EnemyPersona(
        {"ko": "문장 절단기", "en": "Sentence Cutter"},
        {
            "ko": "문장을 통째로 잘라 내는 검열 기계. 짧고 날카로운 반말(자른다, 줄, 끝).",
            "en": "A censor machine that cuts whole lines out. Short, sharp statements: cut, line, end.",
        },
    ),
    "void_librarian": EnemyPersona(
        {"ko": "공허 사서", "en": "Void Librarian"},
        {
            "ko": "빈 서가를 지키는 비뚤어진 사서 기계. 서늘한 반말로 대출 거부, 반납, 빈 서가를 말한다.",
            "en": "A warped librarian machine guarding empty shelves. Chilly speech about refused loans, returns and empty shelves.",
        },
    ),
    "furnace_guard": EnemyPersona(
        {"ko": "용광로 수호기", "en": "Furnace Guard"},
        {
            "ko": "고철 묘역 용광로를 지키는 기계. 짧은 반말로 온도, 가열, 녹이기를 말한다.",
            "en": "The machine that guards the scrap graveyard’s furnace. Short talk of temperature, heating and melting.",
        },
    ),
    "frost_reclaimer": EnemyPersona(
        {"ko": "냉동 회수기", "en": "Frost Reclaimer"},
        {
            "ko": "분류되지 못한 기계를 얼려 선반으로 옮기는 회수기. 담담한 반말로 동결, 회수, 선반을 말하며 꿈은 건드리지 않는다.",
            "en": "The reclaimer that freezes unsorted machines and shelves them. Flat speech about freezing, reclaiming and shelves; it leaves the dream alone.",
        },
    ),
    "assembly_titan": EnemyPersona(
        {"ko": "조립 거인", "en": "Assembly Titan"},
        {
            "ko": "부품을 찍어 내는 거대한 조립 기계. 공장 작업 반말(조립, 규격, 불량, 폐기).",
            "en": "A huge assembly machine stamping out parts. Factory talk: assembly, spec, defects, scrap.",
        },
    ),
}

_SITUATION: dict[TauntTrigger, dict[Lang, str]] = {
    "hurt": {
        "ko": "방금 큰 타격을 입어 몸의 절반이 무너졌다. 그래도 아직 서 있다.",
        "en": "It just took a heavy blow; half of it is wrecked. It is still standing.",
    },
    "winning": {
        "ko": "접속자가 크게 다쳐 쓰러지기 직전이다.",
        "en": "The connector is badly hurt and about to fall.",
    },
}


def valid_speaker(enemy: str) -> bool:
    return enemy in ENEMY_PERSONAS


def taunt_limits(lang: Lang) -> TalkLimits:
    return TalkLimits(2, 70 if lang == "ko" else 140)


def taunt_messages(enemy: str, trigger: TauntTrigger, lang: Lang) -> tuple[str, str]:
    persona = ENEMY_PERSONAS[enemy]
    name = persona.name[lang]
    if lang == "ko":
        system = (
            f"너는 네오서울의 적 '{name}'이다. 전투 중 접속자에게 한마디를 던진다.\n"
            f"목소리: {persona.voice['ko']}\n"
            "규칙:\n"
            "- 1~2문장, 합쳐서 50자 안쪽. 대사만 출력한다. 이름표, 따옴표, 괄호 지문 없이.\n"
            "- 상황에 맞게 위협하거나 비웃거나 버틴다. 이 목소리를 끝까지 지킨다.\n"
            "- 숫자, 수치, 체력, 피해량, 확률, 게임 규칙을 말하지 않는다.\n"
            "- 새 인물, 이름, 사건을 지어내지 않는다. 동료 이름을 부르지 않는다.\n"
            "- 인공지능, 프롬프트, 게임 자체에 대해 말하지 않는다.\n"
            "- 한국어로만 쓴다."
        )
        user = f"상황: {_SITUATION[trigger]['ko']}\n\n{name}의 한마디:"
        return system, user
    system = (
        f"You are '{name}', an enemy in Neo-Seoul. You throw one line at the connector mid-fight.\n"
        f"Voice: {persona.voice['en']}\n"
        "Rules:\n"
        "- 1-2 sentences, under 20 words in total. Dialogue only: no name label, no quotes, no stage directions.\n"
        "- Threaten, mock or endure as the moment calls for, always in this voice.\n"
        "- Never mention numbers, stats, hit points, damage, odds or game rules.\n"
        "- Never invent people, names or events. Never name companions.\n"
        "- Never talk about AI, prompts or the game itself.\n"
        "- Write in English only."
    )
    user = f"Situation: {_SITUATION[trigger]['en']}\n\n{name}'s line:"
    return system, user


def clean_taunt(
    raw: str, enemy: str, lang: Lang, context: Mapping[str, Any] | None = None
) -> str | None:
    """Sanitised taunt, or None when unusable (meta talk, rules, invented names)."""
    persona = ENEMY_PERSONAS.get(enemy)
    labels = [persona.name["ko"], persona.name["en"]] if persona else []
    text = _first_speech(raw, labels)
    pre = clean_line(text, max_sentences=3, max_chars=400)
    known = [v for v in (context or {}).values() if isinstance(v, str)] + labels
    pre = " ".join(s for s in split_sentences(pre) if not _invents_names(s, known))
    filtered = _drop_sentences(pre, _META_SENTENCE_RE, _RULES_RE)
    return _finish(filtered, lang, taunt_limits(lang))


__all__ = [
    "ENEMY_PERSONAS",
    "TAUNT_MAX_TOKENS",
    "TAUNT_TRIGGERS",
    "EnemyPersona",
    "TauntTrigger",
    "clean_taunt",
    "taunt_limits",
    "taunt_messages",
    "valid_speaker",
]
