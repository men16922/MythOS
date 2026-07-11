// 도감의 정적 용어집 (owner 2026-07-11: "복지 점수라는게 뭔지 모르겠음 … 용어집 같은거 있나?").
// 장면 속 세계관 용어의 항상-보이는 기준 정의. 모델이 새 시스템 명사를 발명하는 것은
// directives/naming.md 규칙이 막고, 여기는 정의된 정본 용어만 싣는다. 시나리오별
// 저작 데이터로 승격(scenario.json + en.json 오버레이)은 후속 — 지금은 UI 카피 계층.
export interface GlossaryEntry {
  id: string;
  term: { ko: string; en: string };
  desc: { ko: string; en: string };
}

export const NEO_SEOUL_GLOSSARY: GlossaryEntry[] = [
  {
    id: "unregistered_signal",
    term: { ko: "비식별 신호", en: "Unregistered Signal" },
    desc: {
      ko: "어떤 명단에도 없는 사람. 관리망이 읽지 못해 '오류'로 취급한다 — 지금의 당신.",
      en: "A person on no roster. The Control Net can't read them, so it files them as an error — you.",
    },
  },
  {
    id: "optimization",
    term: { ko: "최적화", en: "Optimization" },
    desc: {
      ko: "관리자 IX의 삭제 절차. 기준 밖 신호의 기억과 존재를 지운다.",
      en: "Administrator IX's erasure procedure: deleting the memory and existence of off-baseline signals.",
    },
  },
  {
    id: "control_net",
    term: { ko: "관리망", en: "Control Net" },
    desc: {
      ko: "Neo-Seoul을 운영하는 감시·통제 시스템. 그 목소리가 관리자 IX, 그 중추가 ARK다.",
      en: "The surveillance system running Neo-Seoul. Administrator IX is its voice; ARK is its core.",
    },
  },
  {
    id: "loop",
    term: { ko: "루프", en: "Loop" },
    desc: {
      ko: "같은 시간대를 반복하는 접속 회차. 루프가 끝나면 기록은 지워지지만 에코가 남는다.",
      en: "One pass through the same window of time. When a loop ends its record is erased — but an echo remains.",
    },
  },
  {
    id: "echo",
    term: { ko: "에코", en: "Echo" },
    desc: {
      ko: "지워진 루프가 남기는 잔향. 다음 루프의 당신에게 희미한 기억(여운)과 힘으로 이어진다.",
      en: "The residue an erased loop leaves behind, carried into your next loop as faint memory and strength.",
    },
  },
  {
    id: "stability",
    term: { ko: "안정성", en: "Stability" },
    desc: {
      ko: "이번 루프의 신호가 버티는 힘. 바닥나면 루프가 무너진다.",
      en: "How firmly this loop's signal holds together. If it runs out, the loop collapses.",
    },
  },
  {
    id: "tension",
    term: { ko: "긴장도", en: "Tension" },
    desc: {
      ko: "관리망이 조여오는 정도. 가득 차면 상황이 터진다.",
      en: "How hard the Control Net is closing in. At the top, things break open.",
    },
  },
  {
    id: "heat",
    term: { ko: "추적도", en: "Heat" },
    desc: {
      ko: "당신의 흔적이 관리망에 얼마나 잡혔는가. 높을수록 수색이 좁혀온다 — 이득이 아니라 비용.",
      en: "How much of your trail the Control Net has caught. Higher means the search closes in — a cost, not a gain.",
    },
  },
  {
    id: "insight",
    term: { ko: "통찰", en: "Insight" },
    desc: {
      ko: "루프를 넘어 쌓이는 이해. 다음 회차의 성장(해금)에 쓰인다.",
      en: "Understanding that accumulates across loops, spent on growth between runs.",
    },
  },
  {
    id: "water_spider",
    term: { ko: "물거미", en: "Water Spider" },
    desc: {
      ko: "정세린의 별칭. 지하 수로를 오가는 데이터 밀수꾼.",
      en: "Jung Se-rin's handle — a data smuggler who runs the underground waterways.",
    },
  },
  {
    id: "ping",
    term: { ko: "핑", en: "Ping" },
    desc: {
      ko: "수제 탐지 신호. 누군가 신호를 '보냈다'는 뜻이지, 사람 이름이 아니다.",
      en: "A handmade detection signal. It means someone sent a signal — it is not a person.",
    },
  },
];

export function glossaryFor(scenarioId: string): GlossaryEntry[] {
  return scenarioId === "neo-seoul" ? NEO_SEOUL_GLOSSARY : [];
}
