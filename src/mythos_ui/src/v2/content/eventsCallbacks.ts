// Callbacks (W1-1 "choices follow you"): an earlier choice comes back as a scene later in the run. Each rolls like
// any event but only plays when its flag is set (otherwise the node plays another event, so no node is empty). The
// flags are set by the original choice: walking past the capsule (a1_welfare_capsule), cutting out or covering Kai
// (a2_kai_scrapyard), copying the list instead of pulling three names (a3_optimization_queue); the hunt reads Trace.
// Same rules as events.ts (enforced by narrative.test.ts).
import type { EventDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

/**
 * Roll weight: like any event. At 3 the scenes crowded out stronger Act 3 events for the many runs that qualify
 * (Sea −3.8 pts, lower in all three canonical blocks); at 1 every depth stays within noise (2026-11-04).
 */
const CALLBACK_WEIGHT = 1

export const CALLBACK_EVENTS: EventDef[] = [
  {
    id: 'a3_cb_capsule',
    acts: [3],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'left_citizen' },
    title: t('312점', 'Score 312'),
    image: 'v2/events/a3_cb_capsule.webp',
    text: t(
      '첨탑 복도 벽면에 처리 완료 목록이 흘러간다. 한 줄이 눈에 걸린다. 312점. C-17 복지 블록, 수면 캡슐.\n그 캡슐이다. 당신이 지나친 그 캡슐.\n목록은 멈추지 않는다. 다음 줄, 다음 줄.',
      'A list marked PROCESSED scrolls down the Spire corridor wall. One line snags your eye. Score 312. C-17 welfare block, sleep capsule.\nThat capsule. The one you walked past.\nThe list does not stop. Next line, next line.',
    ),
    options: [
      {
        label: t('목록을 멈추고 끝까지 읽는다', 'Stop the list and read it through'),
        hint: t('코덱스 · ◈ +4 · 추적 +6', 'Codex · +4 ◈ · +6 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t(
            '312 아래에 처리 사유가 있다. ‘구조 요청 없음.’ 당신은 그 줄을 외워 둔다.',
            'Under 312, the reason for processing: ‘No rescue requested.’ You commit the line to memory.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_citizen_score' },
            { kind: 'echoes', amount: 4 },
            { kind: 'trace', amount: 6 },
          ],
        },
        failure: {
          text: t('목록이 잠긴다. 보안 프로토콜이 손끝을 읽어 간다.', 'The list locks. A security protocol reads your fingertips.'),
          effects: [{ kind: 'trace', amount: 10 }],
        },
      },
      {
        label: t('세린에게 그날 일을 말한다', 'Tell Se-rin about that night'),
        hint: t('세린 유대 +1 · 실패 시 −1', 'Se-rin bond +1 · fail −1'),
        requires: { companion: 'se_rin' },
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t('세린이 한참 목록을 본다. “다음엔 같이 열자.” 그게 다다.', 'Se-rin watches the list a long time. “Next time we open it together.” That is all.'),
          effects: [{ kind: 'bond', id: 'se_rin', amount: 1 }],
        },
        failure: {
          text: t('세린은 대답하지 않는다. 걸음이 반 발짝 멀어진다.', 'Se-rin doesn’t answer. Her step falls half a pace away from yours.'),
          effects: [{ kind: 'bond', id: 'se_rin', amount: -1 }],
        },
      },
      {
        label: t('고개를 돌린다', 'Look away'),
        hint: t('+20 ₵ · 추적 −4', '+20 ₵ · −4 Trace'),
        success: {
          text: t('다음 줄, 다음 줄. 숫자는 금방 다른 숫자가 된다.', 'Next line, next line. A number soon becomes another number.'),
          effects: [
            { kind: 'credits', amount: 20 },
            { kind: 'trace', amount: -4 },
          ],
        },
      },
    ],
    gmHints: ['processed list', 'the capsule you walked past', 'guilt'],
  },
  {
    id: 'a3_cb_core',
    acts: [3],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'kai_cored' },
    title: t('따뜻한 코어', 'The Warm Core'),
    image: 'v2/events/a3_cb_core.webp',
    text: t(
      '첨탑 정비실을 지날 때 몸 안의 임플란트가 미열을 낸다. 폐기장에서 뽑은 그 코어다.\n귓속에서 갈라진 목소리. “…비가 와요.”\n벽 너머 정비 로봇들이 일제히 고개를 든다. 같은 꿈을 들은 것처럼.',
      'Passing the Spire maintenance bay, the implant in your body runs warm. The core you pulled in the scrapyard.\nA cracked voice in your ear: “…it’s raining.”\nBeyond the wall, the maintenance robots lift their heads at once, as if they heard the same dream.',
    ),
    options: [
      {
        label: t('코어의 꿈을 끝까지 듣는다', 'Listen to the core’s dream'),
        hint: t('추적 −8 · ◈ +5 · 실패 시 −6 HP', '−8 Trace · +5 ◈ · fail −6 HP'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('노란 우산, 아이의 이름, 그리고 정비 코드 하나. 꿈속 코드가 문을 연다.', 'A yellow umbrella, a child’s name, and one maintenance code. The code from the dream opens a door.'),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'echoes', amount: 5 },
          ],
        },
        failure: {
          text: t('꿈이 역류한다. 머릿속이 하얗게 탄다.', 'The dream flows backwards. The inside of your head burns white.'),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('코어를 끈다', 'Shut the core down'),
        hint: t('+25 ₵', '+25 ₵'),
        success: {
          text: t('미열이 식는다. 정비 로봇들이 다시 고개를 숙인다. 이제 그건 그냥 부품이다.', 'The warmth fades. The robots bow their heads again. Now it is just a part.'),
          effects: [{ kind: 'credits', amount: 25 }],
        },
      },
    ],
    gmHints: ['kai core', 'a dream that is not yours', 'maintenance robots'],
  },
  {
    id: 'a3_cb_umbrella',
    acts: [3],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'kai_umbrella' },
    title: t('노란 우산', 'The Yellow Umbrella'),
    image: 'v2/events/a3_cb_umbrella.webp',
    text: t(
      '첨탑 테라스 끝, 찢어진 우산 하나가 난간에 기대 있다. 폐기장에서 당신이 씌워 준 그 우산이다.\n손잡이에 정비 태그가 감겨 있다. ‘RX-09 — 비 그침 확인.’\n누군가 그를 여기까지 옮겼다. 아니면 그가 걸어왔다.',
      'At the end of a Spire terrace, a torn umbrella leans on the railing. The one you left over him in the scrapyard.\nA maintenance tag is wound round the handle: ‘RX-09 — rain stopped, confirmed.’\nSomeone carried him this far. Or he walked.',
    ),
    options: [
      {
        label: t('태그의 정비 기록을 따라간다', 'Follow the tag’s maintenance log'),
        hint: t('소모품 · ◈ +3 · 실패 시 추적 +8', 'Consumable · +3 ◈ · fail +8 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('기록 끝에 좌표가 있다. 비상 보급함. 뚜껑에 우산이 그려져 있다.', 'At the end of the log, coordinates. An emergency supply box with an umbrella drawn on the lid.'),
          effects: [
            { kind: 'consumable' },
            { kind: 'echoes', amount: 3 },
          ],
        },
        failure: {
          text: t('기록이 중간에 지워져 있다. 지운 자리에서 경보가 운다.', 'The log is erased halfway. An alarm wails from the gap.'),
          effects: [{ kind: 'trace', amount: 8 }],
        },
      },
      {
        label: t('우산을 펴 들고 간다', 'Open the umbrella and carry it'),
        hint: t('파티 회복 6 · 추적 −4', 'Heal party 6 · −4 Trace'),
        success: {
          text: t('드론 탐조등이 우산 위를 미끄러진다. 위에서 보면 그냥 우산이다.', 'A drone searchlight slides across the umbrella. From above, it is just an umbrella.'),
          effects: [
            { kind: 'heal_party', amount: 6 },
            { kind: 'trace', amount: -4 },
          ],
        },
      },
    ],
    gmHints: ['yellow umbrella', 'RX-09', 'rain stopped'],
  },
  {
    id: 'a3_cb_hunt',
    acts: [3],
    weight: CALLBACK_WEIGHT,
    requires: { minTrace: 60 },
    title: t('사냥 명령', 'Hunt Order'),
    image: 'v2/events/a3_cb_hunt.webp',
    text: t(
      '흰 복도의 스피커가 한꺼번에 켜진다. 당신의 이름을 읽는다. 철자 하나 틀리지 않고.\n‘추적 대상 우선순위 1. 협조 시민에게 포상.’\n아래층에서 문이 하나씩 잠기는 소리가 올라온다.',
      'Every speaker in the white corridor switches on at once. They read your name, every letter right.\n‘Pursuit target, priority one. Rewards for cooperating citizens.’\nFrom the floor below, doors lock one by one.',
    ),
    options: [
      {
        label: t('정면으로 뚫고 간다', 'Push straight through'),
        hint: t('희귀 카드 · −6 HP', 'Rare card · −6 HP'),
        success: {
          text: t('잠기는 문보다 한 걸음 빠르다. 마지막 문을 어깨로 밀어젖힌다.', 'One step faster than the locking doors. You shoulder the last one open.'),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'card_choice', rarity: 'rare' },
          ],
        },
      },
      {
        label: t('환기 덕트로 숨는다', 'Hide in the vent duct'),
        hint: t('추적 −12 · 실패 시 −6 HP', '−12 Trace · fail −6 HP'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t('덕트 안은 좁고 따뜻하다. 스피커가 당신 이름을 세 번 더 읽고 포기한다.', 'The duct is narrow and warm. The speakers read your name three more times and give up.'),
          effects: [{ kind: 'trace', amount: -12 }],
        },
        failure: {
          text: t('덕트 끝에 철망이 있다. 빠져나오는 데 피가 묻는다.', 'A wire mesh at the end of the duct. Getting out costs blood.'),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('현상금을 거꾸로 이용한다', 'Turn the bounty around'),
        hint: t('+40 ₵ · 추적 +6 · 실패 시 추적 +10', '+40 ₵ · +6 Trace · fail +10 Trace'),
        check: { stat: 'cha', dc: 7 },
        success: {
          text: t('가짜 목격 신고 세 건. 포상금이 당신 계좌로 들어온다. IX는 엉뚱한 층을 뒤진다.', 'Three false sightings. The reward lands in your account. IX searches the wrong floor.'),
          effects: [
            { kind: 'credits', amount: 40 },
            { kind: 'trace', amount: 6 },
          ],
        },
        failure: {
          text: t('신고 번호가 당신 단말로 되돌아온다.', 'The report number bounces back to your own terminal.'),
          effects: [{ kind: 'trace', amount: 10 }],
        },
      },
    ],
    gmHints: ['bounty', 'IX broadcast', 'locked doors'],
  },
  {
    id: 'a4_cb_list',
    acts: [4],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'list_copied' },
    title: t('복사본', 'The Copy'),
    image: 'v2/events/a4_cb_list.webp',
    text: t(
      '유리 서가 사이 열람대에 익숙한 파일이 펼쳐져 있다. 3막에서 당신이 복사한 최적화 명단이다.\n누군가 연필로 세 줄을 그어 두었다. 노인, 정비공, 아이.\n사서가 묻는다. “이 셋은 기록입니까, 사람입니까.”',
      'On a reading desk between the glass shelves lies a file you know: the optimization list you copied in Act 3.\nSomeone has pencilled through three lines. An old man, a mechanic, a child.\nThe librarian asks: “Are these three records, or people?”',
    ),
    options: [
      {
        label: t('기록이라고 답한다', 'Answer: records'),
        hint: t('고급 임플란트 · 지배 +1', 'Uncommon implant · +1 Dominance'),
        success: {
          text: t('사서가 고개를 끄덕이고 서가 하나를 연다. 정리된 것은 쓸모가 있다.', 'The librarian nods and unlocks a shelf. What is sorted is useful.'),
          effects: [
            { kind: 'implant', rarity: 'uncommon' },
            { kind: 'axis', axis: 'dominance' },
          ],
        },
      },
      {
        label: t('사람이라고 답하고 이름을 찾는다', 'Answer: people, and look for their names'),
        hint: t('◈ +6 · 인간성 +1 · 실패 시 −5 HP', '+6 ◈ · +1 Humanity · fail −5 HP'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('서가 깊은 곳에 세 사람의 출입 기록이 있다. 어제 날짜다. 아직 어딘가에 있다.', 'Deep in the shelves, an entry record for all three. Dated yesterday. They are still somewhere.'),
          effects: [
            { kind: 'echoes', amount: 6 },
            { kind: 'axis', axis: 'humanity' },
          ],
        },
        failure: {
          text: t('유리 사다리가 발밑에서 갈라진다.', 'The glass ladder cracks under your feet.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
    ],
    gmHints: ['copied list', 'records or people', 'glass library'],
  },
]
