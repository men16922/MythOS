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
  {
    id: 'a5_cb_debt',
    acts: [5],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'lin_yue_debt' },
    title: t('이자', 'Interest'),
    image: 'v2/events/a5_cb_debt.webp',
    text: t(
      '고철 묘역 입구에 낯익은 심부름꾼이 서 있다. 2막에서 린위에와 맺은 거래, 그 장부를 들고 있다.\n“여기까지 오느라 이자가 붙었습니다.”\n장부의 마지막 줄에 당신 이름이 두 번 적혀 있다.',
      'A runner you know stands at the graveyard gate, holding the ledger from your Act 2 deal with Lin-yue.\n“Interest accrued on the way down.”\nYour name is written twice on the last line.',
    ),
    options: [
      {
        label: t('크레딧으로 갚는다', 'Pay in credits'),
        hint: t('−60 ₵ · 빚 청산 · 추적 −10', '−60 ₵ · debt paid · −10 Trace'),
        requires: { minCredits: 60 },
        success: {
          text: t('심부름꾼이 칩을 세고 장부에 줄을 긋는다. “깔끔하네요.”', 'The runner counts the chips and strikes the line. “Clean.”'),
          effects: [
            { kind: 'credits', amount: -60 },
            { kind: 'trace', amount: -10 },
            { kind: 'flag', key: 'lin_yue_debt', value: 0 },
          ],
        },
      },
      {
        label: t('린위에에게 대신 말해 달라고 한다', 'Ask Lin-yue to speak for you'),
        hint: t('빚 청산 · 린위에 유대 +1 · 실패 시 −1', 'Debt paid · Lin-yue bond +1 · fail −1'),
        requires: { companion: 'lin_yue' },
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('린위에가 장부를 받아 직접 찢는다. “이 사람 빚은 내가 졌어.”', 'Lin-yue takes the ledger and tears it herself. “This one’s debt is mine.”'),
          effects: [
            { kind: 'bond', id: 'lin_yue', amount: 1 },
            { kind: 'flag', key: 'lin_yue_debt', value: 0 },
          ],
        },
        failure: {
          text: t('린위에가 장부에서 눈을 돌린다. “장사는 장사야.”', 'Lin-yue looks away from the ledger. “Business is business.”'),
          effects: [{ kind: 'bond', id: 'lin_yue', amount: -1 }],
        },
      },
      {
        label: t('몸으로 갚는다', 'Pay with your body'),
        hint: t('빚 청산 · 최대 HP −4', 'Debt paid · −4 max HP'),
        success: {
          text: t('차가운 기계가 손목에 닿는다. 온기가 빠져나간다. 장부가 닫힌다.', 'A cold device touches your wrist. Warmth drains away. The ledger closes.'),
          effects: [
            { kind: 'maxHp', amount: -4 },
            { kind: 'flag', key: 'lin_yue_debt', value: 0 },
          ],
        },
      },
      {
        label: t('한 번 더 빌린다', 'Borrow once more'),
        hint: t('+40 ₵ · 추적 +5 · 빚은 남는다', '+40 ₵ · +5 Trace · the debt stays'),
        success: {
          text: t('심부름꾼이 장부에 세 번째 줄을 쓴다. 칩이 손바닥에 떨어진다. “다음 층에서 뵙죠.”', 'The runner writes a third line. Chips drop into your palm. “See you a floor down.”'),
          effects: [
            { kind: 'credits', amount: 40 },
            { kind: 'trace', amount: 5 },
          ],
        },
      },
      {
        label: t('장부를 찢는다', 'Tear up the ledger'),
        hint: t('빚 청산 · 추적 +15 · 정크 카드', 'Debt cleared · +15 Trace · junk card'),
        success: {
          text: t('종이가 반으로 갈라진다. 심부름꾼이 웃으며 단말에 무언가를 입력한다.', 'The paper splits in two. The runner smiles and types something into a terminal.'),
          effects: [
            { kind: 'trace', amount: 15 },
            { kind: 'junk', cardId: 'static' },
            { kind: 'flag', key: 'lin_yue_debt', value: 0 },
          ],
        },
      },
    ],
    gmHints: ['lin-yue debt', 'interest', 'the ledger'],
  },
  {
    id: 'a5_cb_dream',
    acts: [5],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'kai_woken' },
    title: t('같은 꿈', 'The Same Dream'),
    image: 'v2/events/a5_cb_dream.webp',
    text: t(
      '고철 묘역 한가운데, 폐기된 기계 수백 대가 같은 쪽으로 고개를 기울이고 있다. 모두 같은 꿈을 꾸는 중이다.\n꿈의 화면에 노란 우산이 떠 있다. 당신이 카이를 깨운 그날 밤이다.\n누군가 그 기억을 여기까지 퍼뜨렸다.',
      'In the middle of the scrap graveyard, hundreds of discarded machines tilt their heads the same way. They are all dreaming the same dream.\nA yellow umbrella floats on the dream’s screen. The night you woke Kai.\nSomeone spread that memory all the way down here.',
    ),
    options: [
      {
        label: t('꿈에 접속해 끝까지 본다', 'Jack in and watch it through'),
        hint: t('◈ +6 · 통찰 +1 · 실패 시 −6 HP', '+6 ◈ · +1 Insight · fail −6 HP'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('꿈 끝에 당신 얼굴이 있다. 기계들이 기억하는 첫 번째 사람.', 'At the end of the dream is your face. The first person the machines remember.'),
          effects: [
            { kind: 'echoes', amount: 6 },
            { kind: 'axis', axis: 'insight' },
          ],
        },
        failure: {
          text: t('꿈이 너무 많다. 수백 개의 시선이 한꺼번에 머릿속으로 들어온다.', 'Too many dreams. Hundreds of gazes pour into your head at once.'),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('카이에게 보여 준다', 'Show Kai'),
        hint: t('카이 유대 +1 · 파티 회복 4', 'Kai bond +1 · heal party 4'),
        requires: { companion: 'kai' },
        success: {
          text: t('카이가 오래 화면을 본다. “제 꿈이 이렇게 멀리 왔네요.”', 'Kai watches the screen a long time. “My dream came all this way.”'),
          effects: [
            { kind: 'bond', id: 'kai', amount: 1 },
            { kind: 'heal_party', amount: 4 },
          ],
        },
      },
      {
        label: t('깨우지 않고 지나간다', 'Pass without waking them'),
        hint: t('추적 −8', '−8 Trace'),
        success: {
          text: t('발소리를 죽인다. 기계들은 계속 같은 꿈을 꾼다.', 'You soften your steps. The machines keep dreaming the same dream.'),
          effects: [{ kind: 'trace', amount: -8 }],
        },
      },
    ],
    gmHints: ['shared dream', 'yellow umbrella', 'scrap graveyard'],
  },
  {
    id: 'a6_cb_citizen',
    acts: [6],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'saved_citizen' },
    title: t('청소 카트', 'The Cleaning Cart'),
    image: 'v2/events/a6_cb_citizen.webp',
    text: t(
      '원본 서버실 바닥을 청소 카트 하나가 지나간다. 캡슐에서 꺼내 준 그 남자다. 이제 여기까지 닦는다.\n남자가 걸레를 멈추고 당신을 본다. “끝까지 왔네.”\n카트 아래 칸에 무언가 천으로 덮여 있다.',
      'A cleaning cart rolls across the origin server floor. The man you pulled from the capsule. He cleans down here now.\nHe stops his mop and looks at you. “You made it all the way.”\nSomething under a cloth sits on the cart’s bottom shelf.',
    ),
    options: [
      {
        label: t('천을 걷는다', 'Lift the cloth'),
        hint: t('+10 HP · 소모품', '+10 HP · consumable'),
        success: {
          text: t('구급상자와 보급 캡슐 하나. 남자가 어깨를 으쓱한다. “빚은 갚아야지.”', 'A first-aid kit and a supply capsule. He shrugs. “Debts get paid.”'),
          effects: [
            { kind: 'hp', amount: 10 },
            { kind: 'consumable' },
          ],
        },
      },
      {
        label: t('같이 바닥을 닦는다', 'Mop the floor with him'),
        hint: t('추적 −15 · ◈ +4', '−15 Trace · +4 ◈'),
        success: {
          text: t('둘이서 닦으면 금방이다. 감시 카메라는 청소부 두 명을 본다.', 'Two make quick work of it. The cameras see two cleaners.'),
          effects: [
            { kind: 'trace', amount: -15 },
            { kind: 'echoes', amount: 4 },
          ],
        },
      },
      {
        label: t('서버실 출입 기록을 묻는다', 'Ask about the server-room logs'),
        hint: t('인간성 +1 · 추적 −10 · 실패 시 추적 +8', '+1 Humanity · −10 Trace · fail +8 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('남자가 수첩을 꺼낸다. 교대 시간, 꺼진 카메라, 잠기지 않는 문 하나.', 'He takes out a notebook. Shift times, dead cameras, one door that never locks.'),
          effects: [
            { kind: 'axis', axis: 'humanity' },
            { kind: 'trace', amount: -10 },
          ],
        },
        failure: {
          text: t('남자가 고개를 젓는다. 질문이 너무 많으면 카메라가 돌아본다.', 'He shakes his head. Too many questions and the cameras turn.'),
          effects: [{ kind: 'trace', amount: 8 }],
        },
      },
    ],
    gmHints: ['the saved citizen', 'origin server', 'debts paid'],
  },
  // ---- The Unwritten Sea (2026-11-04): Sea runs share Acts 1–3, so their early choices come back on the sea's own acts.
  {
    id: 'sea4_cb_list',
    acts: [4],
    route: 'sea_4',
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'list_copied' },
    title: t('젖은 명단', 'The Wet List'),
    image: 'v2/events/sea4_cb_list.webp',
    text: t(
      '마른 항구의 화물 더미 사이로 젖은 종이 한 장이 걸려 있다. 3막에서 당신이 복사한 최적화 명단의 한 쪽이다.\n세 줄이 번져 읽히지 않는다. 노인, 정비공, 아이가 있던 자리다.\n하역원 하나가 종이를 집어 들고 묻는다. “이거 화물 목록이에요?”',
      'Between the cargo stacks of the Dry Harbor, one wet sheet has snagged: a page of the optimization list you copied in Act 3.\nThree lines have run and cannot be read. Where the old man, the mechanic and the child were.\nA dock worker picks it up. “Is this a cargo manifest?”',
    ),
    options: [
      {
        label: t('화물 목록이라고 답한다', 'Say it is a manifest'),
        hint: t('+30 ₵ · 지배 +1', '+30 ₵ · +1 Dominance'),
        success: {
          text: t('하역원이 고개를 끄덕이고 종이를 서류철에 끼운다. 수고비가 건네진다.', 'The worker nods and files it. A handling fee changes hands.'),
          effects: [
            { kind: 'credits', amount: 30 },
            { kind: 'axis', axis: 'dominance' },
          ],
        },
      },
      {
        label: t('번진 세 줄을 함께 읽어 본다', 'Try to read the three runs together'),
        hint: t('◈ +6 · 인간성 +1 · 실패 시 추적 +6', '+6 ◈ · +1 Humanity · fail +6 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('젖은 잉크 사이로 이름 하나가 떠오른다. 하역원이 그 이름을 소리 내어 따라 읽는다.', 'One name surfaces between the runs of ink. The worker reads it aloud after you.'),
          effects: [
            { kind: 'echoes', amount: 6 },
            { kind: 'axis', axis: 'humanity' },
          ],
        },
        failure: {
          text: t('종이가 손에서 찢어진다. 항구 감시등이 이쪽으로 돈다.', 'The sheet tears in your hands. A harbor lamp swings this way.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
    ],
    gmHints: ['wet list', 'dry harbor', 'manifest or names'],
  },
  {
    id: 'sea5_cb_debt',
    acts: [5],
    route: 'sea_5',
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'lin_yue_debt' },
    title: t('물때 이자', 'Interest at the Tide'),
    image: 'v2/events/sea5_cb_debt.webp',
    text: t(
      '밀물선의 부교 끝에 낯익은 심부름꾼이 서 있다. 바지 밑단이 젖어도 장부는 젖지 않았다.\n“바다까지 오셨네요. 이자는 물때 따라 붙습니다.”\n장부 마지막 줄에 당신 이름이 두 번 적혀 있다.',
      'At the end of a pontoon on the Tide Line stands a runner you know. Wet to the shins; the ledger is dry.\n“All the way to the sea. Interest follows the tide.”\nYour name is written twice on the last line.',
    ),
    options: [
      {
        label: t('크레딧으로 갚는다', 'Pay in credits'),
        hint: t('−60 ₵ · 빚 청산 · 추적 −10', '−60 ₵ · debt paid · −10 Trace'),
        requires: { minCredits: 60 },
        success: {
          text: t('칩이 세어지고 줄이 그어진다. 심부름꾼이 부교를 걸어 돌아간다.', 'The chips are counted and the line struck. The runner walks back down the pontoon.'),
          effects: [
            { kind: 'credits', amount: -60 },
            { kind: 'trace', amount: -10 },
            { kind: 'flag', key: 'lin_yue_debt', value: 0 },
          ],
        },
      },
      {
        label: t('몸으로 갚는다', 'Pay with your body'),
        hint: t('빚 청산 · 최대 HP −4', 'Debt paid · −4 max HP'),
        success: {
          text: t('차가운 기계가 손목에 닿는다. 회색 물이 발목을 적신다. 장부가 닫힌다.', 'A cold device touches your wrist. Gray water wets your ankles. The ledger closes.'),
          effects: [
            { kind: 'maxHp', amount: -4 },
            { kind: 'flag', key: 'lin_yue_debt', value: 0 },
          ],
        },
      },
      {
        label: t('한 번 더 빌린다', 'Borrow once more'),
        hint: t('+40 ₵ · 추적 +5 · 빚은 남는다', '+40 ₵ · +5 Trace · the debt stays'),
        success: {
          text: t('장부에 세 번째 줄이 생긴다. “등대에서 뵙죠.”', 'A third line appears in the ledger. “See you at the lighthouse.”'),
          effects: [
            { kind: 'credits', amount: 40 },
            { kind: 'trace', amount: 5 },
          ],
        },
      },
    ],
    gmHints: ['lin-yue debt', 'pontoon at the tide line', 'dry ledger'],
  },
  {
    id: 'sea6_cb_citizen',
    acts: [6],
    route: 'sea_6',
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'saved_citizen' },
    title: t('등대 일지', 'The Lamp Log'),
    image: 'v2/events/sea6_cb_citizen.webp',
    text: t(
      '마지막 등대 계단참에서 남자 하나가 근무 일지를 적고 있다. 캡슐에서 꺼내 준 그 남자다. 이제 물이 어디까지 왔는지 적는다.\n“끝까지 왔네.” 남자가 펜을 내려놓는다.\n일지 사이에 무언가 끼워져 있다.',
      'On the landing of the last lighthouse a man is writing in the duty log. The man you pulled from the capsule. Now he records how far the water has come.\n“You made it all the way.” He sets the pen down.\nSomething is tucked between the pages.',
    ),
    options: [
      {
        label: t('끼워 둔 것을 받는다', 'Take what he tucked in'),
        hint: t('+10 HP · 소모품', '+10 HP · consumable'),
        success: {
          text: t('구급 패치와 보급 캡슐 하나. “빚은 갚아야지.”', 'A med patch and a supply capsule. “Debts get paid.”'),
          effects: [
            { kind: 'hp', amount: 10 },
            { kind: 'consumable' },
          ],
        },
      },
      {
        label: t('일지 한 줄을 대신 적는다', 'Write one line of the log for him'),
        hint: t('인간성 +1 · 추적 −10 · 실패 시 추적 +8', '+1 Humanity · −10 Trace · fail +8 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('물높이를 정확히 적는다. 남자가 고개를 끄덕인다. “잘 보네.”', 'You log the water line exactly. He nods. “Good eye.”'),
          effects: [
            { kind: 'axis', axis: 'humanity' },
            { kind: 'trace', amount: -10 },
          ],
        },
        failure: {
          text: t('숫자를 잘못 적는다. 등대 감시 장치가 틀린 줄을 기록한다.', 'You get the number wrong. The lighthouse monitor logs the bad line.'),
          effects: [{ kind: 'trace', amount: 8 }],
        },
      },
    ],
    gmHints: ['the saved citizen', 'lighthouse duty log', 'water line'],
  },
  // ---- Outside the List (DLC 2 parallel Act 2): whether the counter's line held comes back in the Spire.
  {
    id: 'a3_cb_line',
    acts: [3],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'outside_kept' },
    title: t('줄은 남았다', 'The Line Held'),
    image: 'v2/events/a3_cb_line.webp',
    text: t(
      '첨탑 직원 통로에서 식판을 나르던 여자가 걸음을 멈춘다. 명단 밖 배식대 줄에서 본 얼굴이다.\n“여기 주방에도 사람이 필요하대서요. 줄은 아직 서요. 매일.”\n여자가 앞치마 주머니를 두드린다.',
      'In a Spire staff corridor, a woman carrying trays stops. You know the face from the counter line outside the list.\n“They needed hands in the kitchen here. The line still forms. Every day.”\nShe pats her apron pocket.',
    ),
    options: [
      {
        label: t('식권을 받는다', 'Take the meal ticket'),
        hint: t('+8 HP · ◈ +2', '+8 HP · +2 ◈'),
        success: {
          text: t('식권 뒷면에 직원용 승강기 번호가 적혀 있다.', 'On the back of the ticket, a staff lift number.'),
          effects: [
            { kind: 'hp', amount: 8 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
      {
        label: t('줄 소식을 묻는다', 'Ask how the line is doing'),
        hint: t('추적 −8 · ◈ +3 · 실패 시 추적 +5', '−8 Trace · +3 ◈ · fail +5 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('여자가 순찰 교대 시간을 배식 시간처럼 외워 준다.', 'She recites the patrol changeover the way she would a serving time.'),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'echoes', amount: 3 },
          ],
        },
        failure: {
          text: t('말이 길어진다. 통로 끝 카메라가 두 사람을 오래 본다.', 'The talk runs long. The camera at the end of the corridor watches you both.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
    ],
    gmHints: ['the counter line held', 'spire kitchen', 'meal ticket'],
  },
  {
    id: 'a3_cb_ladle',
    acts: [3],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'outside_gone' },
    title: t('닦인 국자', 'The Washed Ladle'),
    image: 'v2/events/a3_cb_ladle.webp',
    text: t(
      '첨탑 주방 벽에 국자 하나가 닦인 채 걸려 있다. 명단 밖 배식대의 그 국자와 같은 모양이다.\n요리사가 당신 시선을 따라온다. “그 배식대, 문 닫았죠. 거기서 왔어요?”',
      'On the Spire kitchen wall a ladle hangs, washed clean. The same make as the one at the counter outside the list.\nThe cook follows your gaze. “That counter closed, didn’t it. You came from there?”',
    ),
    options: [
      {
        label: t('그렇다고 말한다', 'Say yes'),
        hint: t('+25 ₵ · 실패 시 추적 +6', '+25 ₵ · fail +6 Trace'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t('요리사가 말없이 봉투 하나를 건넨다. “다시 열 때 보태요.”', 'The cook hands over an envelope without a word. “Put it toward opening again.”'),
          effects: [{ kind: 'credits', amount: 25 }],
        },
        failure: {
          text: t('요리사의 얼굴이 굳는다. 주방 전화기를 든다.', 'The cook’s face sets. He picks up the kitchen phone.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('아무 말 없이 지나간다', 'Walk past without a word'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('국자가 벽에서 조금 흔들린다. 누가 건드린 것처럼.', 'The ladle sways on the wall a little, as if someone touched it.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
    gmHints: ['the closed counter', 'washed ladle', 'spire kitchen'],
  },
  // 2026-11-04: the Act 1 Hand-Crank Market district's two dangling choices come back (Signal+ runs only).
  {
    id: 'a2_cb_ku',
    acts: [2],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'lm_owes_ku' },
    title: t('구 여사의 셈', 'Madam Ku’s Sum'),
    image: 'v2/events/a2_cb_ku.webp',
    text: t(
      '손전등 시장 꼬마 하나가 길을 막는다. 손에 계산기가 들려 있다.\n“구 여사님이 셋이래요. 이번 주. 지금 몇 명이에요?”',
      'A kid from the hand-crank market blocks your way, a calculator in hand.\n“Madam Ku says three. This week. How many so far?”',
    ),
    options: [
      {
        label: t('빚을 돈으로 치른다', 'Settle it in cash'),
        hint: t('−30 ₵ · 소모품 1 · 추적 −5', '−30 ₵ · 1 consumable · −5 Trace'),
        requires: { minCredits: 30 },
        success: {
          text: t('꼬마가 칩을 세어 계산기에 찍는다. “여사님이 덤이래요.” 손발전기 등 하나를 쥐여 준다. 시장 쪽 감시가 하나 줄어든다.', 'The kid counts the chips into the calculator. “She says this one’s on the house.” A hand-crank lamp lands in your hand. One fewer set of eyes on you from the market.'),
          effects: [{ kind: 'credits', amount: -30 }, { kind: 'consumable' }, { kind: 'trace', amount: -5 }],
        },
      },
      {
        label: t('지나가던 손님 하나를 소개한다', 'Point a passer-by her way'),
        hint: t('+20 ₵ · 실패 시 추적 +5', '+20 ₵ · fail +5 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('꼬마가 손님을 데리고 간다. 잠시 뒤 돌아와 수수료를 건넨다. “하나 남았대요.”', 'The kid leads the customer off, then comes back with a commission. “Two down, she says.”'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
        failure: {
          text: t('손님이 단속 요원이었다. 꼬마가 달아나며 당신을 가리킨다.', 'The customer was an enforcer. The kid runs, pointing back at you.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('모른 척한다', 'Pretend not to know her'),
        hint: t('추적 +4', '+4 Trace'),
        success: {
          text: t('꼬마가 계산기에 무언가를 찍는다. 시장은 셈을 잊지 않는다.', 'The kid punches something into the calculator. The market does not forget a sum.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
    ],
    gmHints: ['madam ku', 'a debt of three buyers', 'calculator'],
  },
  {
    id: 'a3_cb_min',
    acts: [3],
    weight: CALLBACK_WEIGHT,
    requires: { flag: 'sold_min' },
    title: t('절뚝이는 배달꾼', 'The Limping Courier'),
    image: 'v2/events/a3_cb_min.webp',
    text: t(
      '첨탑 하역장에 배달꾼 하나가 다리를 절며 들어온다. 헬멧에 수금 회사 마크. 민이다.\n그가 당신을 알아본다. 상자를 내려놓고, 아무 말도 하지 않는다.',
      'A courier limps into the Spire loading bay, a collections firm’s mark on his helmet. Min.\nHe recognises you. He sets the crate down and says nothing.',
    ),
    options: [
      {
        label: t('사과한다', 'Apologise'),
        hint: t('추적 −8 · 실패 시 추적 +4', '−8 Trace · fail +4 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('민이 헬멧을 벗는다. “빚은 그걸로 갚았어요. 대신 평생 배달하게 됐지만.” 하역장 경비 교대 시간을 알려 준다.', 'Min takes off the helmet. “It paid the debt. I just deliver for them for life now.” He tells you when the bay guard changes.'),
          effects: [{ kind: 'trace', amount: -8 }],
        },
        failure: {
          text: t('민이 고개를 돌린다. 수금 회사 단말이 당신 얼굴을 찍는다.', 'Min turns away. The collections terminal photographs your face.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('태오가 헬멧 대여료를 대신 낸다', 'Tae-o pays his helmet rental'),
        hint: t('−20 ₵ · 태오 유대 +1', '−20 ₵ · Tae-o bond +1'),
        requires: { companion: 'tae_o', minCredits: 20 },
        success: {
          text: t('태오가 말없이 칩을 민의 장갑에 쥐여 준다. 돌아서는 태오의 어깨가 조금 가벼워 보인다.', 'Tae-o presses chips into Min’s glove without a word. Walking back, his shoulders look a little lighter.'),
          effects: [{ kind: 'credits', amount: -20 }, { kind: 'bond', id: 'tae_o', amount: 1 }],
        },
      },
      {
        label: t('모자를 눌러쓰고 지나간다', 'Pull your hood down and walk past'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('뒤에서 상자 끄는 소리가 이어진다. 한 박자씩 절며.', 'Behind you a crate is dragged on, one limping beat at a time.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
    ],
    gmHints: ['min the courier', 'sold out', 'collections firm', 'limp'],
  },
  // 2026-11-04: Act 5 district quests come back in Act 6 (Signal+ runs only).
  {
    id: 'a6_cb_choir',
    acts: [6],
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_scrap_choir', stage: 2 } },
    title: t('끝난 노래', 'The Finished Song'),
    image: 'v2/events/a6_cb_choir.webp',
    text: t(
      '최초 기록의 서가 사이로 노래가 흘러온다. 고철 묘역의 그 노래다. 이번엔 마지막 마디까지 간다.\n어디선가 스피커 하나가 기록 속에 끼어 있다. 끝난 노래가 여기까지 왔다.',
      'A song drifts between the first record’s stacks. The scrap graveyard’s song. This time it reaches the last bar.\nSomewhere a speaker has lodged itself in the record. The finished song came all this way.',
    ),
    options: [
      {
        label: t('끝까지 듣는다', 'Listen to the end'),
        hint: t('+10 HP · ◈ +3', '+10 HP · +3 ◈'),
        success: {
          text: t('마지막 음이 서가에 오래 남는다. 숨이 고르게 돌아온다.', 'The last note lingers in the stacks. Your breathing evens out.'),
          effects: [
            { kind: 'hp', amount: 10 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
      {
        label: t('노래를 따라 걷는다', 'Follow the song'),
        hint: t('추적 −12 · ◈ +2 · 실패 시 추적 +6', '−12 Trace · +2 ◈ · fail +6 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('노래가 감시가 비는 통로로만 흐른다. 기계들은 길을 안다.', 'The song only flows down corridors the watchers have left. The machines know the way.'),
          effects: [
            { kind: 'trace', amount: -12 },
            { kind: 'echoes', amount: 2 },
          ],
        },
        failure: {
          text: t('메아리에 길을 잃는다. 같은 서가를 세 번 지난다.', 'You lose the way in the echoes and pass the same stack three times.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
    ],
    gmHints: ['the scrap choir', 'finished song', 'last bar', 'first record stacks'],
  },
  {
    id: 'a6_cb_cold',
    acts: [6],
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_cold_storage', stage: 2 } },
    title: t('아직 따뜻한 기계', 'The Machine Still Warm'),
    image: 'v2/events/a6_cb_cold.webp',
    text: t(
      '최초 기록의 갈림길에 기계 하나가 서 있다. 냉동 보관창 맨 아래 선반에서 깨운 그 기계다. 서리 자국이 아직 어깨에 남아 있다.\n“따뜻하네요. 여기도.” 기계가 손을 내민다.',
      'At a fork in the first record stands a machine: the one you woke from the bottom shelf of the cold storage, frost marks still on its shoulders.\n“It’s warm. Here too.” It holds out a hand.',
    ),
    options: [
      {
        label: t('손을 잡는다', 'Take its hand'),
        hint: t('+8 HP · 소모품', '+8 HP · consumable'),
        success: {
          text: t('손이 따뜻하다. 기계가 품에서 꺼낸 배터리를 당신 손에 쥐여 준다.', 'The hand is warm. It presses a battery from its chest into yours.'),
          effects: [
            { kind: 'hp', amount: 8 },
            { kind: 'consumable' },
          ],
        },
      },
      {
        label: t('길 안내를 부탁한다', 'Ask it to lead the way'),
        hint: t('추적 −10 · ◈ +3', '−10 Trace · +3 ◈'),
        success: {
          text: t('기계가 앞장선다. 깨어난 뒤로 이 길만 걸었다고 한다.', 'It walks ahead. It says it has walked only this road since it woke.'),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
    ],
    gmHints: ['the cold storage', 'woken machine', 'frost marks', 'warm hand'],
  },
  // 2026-11-04: the Sea districts' quests come back one Sea act later (Signal+ runs only).
  {
    id: 'sea5_cb_clock',
    acts: [5],
    route: 'sea_5',
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_sea_seizure', stage: 2 } },
    title: t('밀물 교대', 'The Flood Shift'),
    image: 'v2/events/sea5_cb_clock.webp',
    text: t(
      '방파제 위에서 종이 울린다. 하역조다. 보람이 되찾은 교대 시계를 손목에 차고, 밀물 시각을 교대 시간처럼 외친다.\n“배는 안 와도 물은 와요!” 하역조가 모래주머니를 나른다.',
      'A bell rings on the breakwater. The longshore crew. Boram wears the recovered shift clock and calls the flood time like a shift change.\n“No ship, but the water comes!” The crew hauls sandbags.',
    ),
    options: [
      {
        label: t('모래주머니를 같이 나른다', 'Haul sandbags with them'),
        hint: t('추적 −10 · ◈ +3', '−10 Trace · +3 ◈'),
        success: {
          text: t('한 줄로 서서 주머니를 넘긴다. 세관 드론은 하역조 한 명이 늘어난 줄 모른다.', 'You stand in the line passing sacks. The customs drones don’t notice the crew is one bigger.'),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
      {
        label: t('교대 도시락을 얻어먹는다', 'Share the shift lunch'),
        hint: t('+10 HP · 소모품', '+10 HP · consumable'),
        success: {
          text: t('보람이 도시락 뚜껑을 반으로 나눈다. 나이 든 하역꾼 하나가 남은 반찬을 당신 쪽으로 민다.', 'Boram splits a lunchbox lid in half. An older hand pushes the rest of the side dishes your way.'),
          effects: [
            { kind: 'hp', amount: 10 },
            { kind: 'consumable' },
          ],
        },
      },
    ],
    gmHints: ['longshore crew', 'recovered shift clock', 'breakwater', 'flood time'],
  },
  {
    id: 'sea6_cb_barge',
    acts: [6],
    route: 'sea_6',
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_sea_barge', stage: 2 } },
    title: t('불 켜진 바지선', 'The Lit Barge'),
    image: 'v2/events/sea6_cb_barge.webp',
    text: t(
      '안개 낀 철탑 길 아래로 바지선 하나가 다가온다. 맨 끝 배다. 이번엔 창에 불이 켜져 있다.\n할머니가 창문을 열고 보온병을 들어 보인다. “아들 이름을 다시 불렀더니, 배가 여기까지 왔어.”',
      'Below the fogbound causeway a barge draws close. The last barge, its window lit this time.\nThe old woman opens the window and holds up a flask. “I called my son’s name again, and the barge came all this way.”',
    ),
    options: [
      {
        label: t('보온병을 받는다', 'Take the flask'),
        hint: t('+12 HP', '+12 HP'),
        success: {
          text: t('뜨거운 국물이다. 냄비에서 막 덜어 온 맛이 난다.', 'Hot broth. It tastes just ladled from the pot.'),
          effects: [{ kind: 'hp', amount: 12 }],
        },
      },
      {
        label: t('배를 타고 철탑 아래로 돌아간다', 'Ride the barge under the causeway'),
        hint: t('추적 −12 · 실패 시 추적 +6', '−12 Trace · fail +6 Trace'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t('등대단 초소들이 머리 위로 지나간다. 아무도 아래를 보지 않는다.', 'The Keepers’ posts pass overhead. Nobody looks down.'),
          effects: [{ kind: 'trace', amount: -12 }],
        },
        failure: {
          text: t('배가 기둥에 부딪힌다. 위에서 무적이 짧게 울린다.', 'The barge knocks a pillar. Above, a foghorn gives a short blast.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
    ],
    gmHints: ['the last barge', 'lit window', 'old woman', 'flask of broth'],
  },
  // 2026-11-04: Outside the List's district comes back in Act 3 (Signal+ runs on the DLC 2 route only).
  {
    id: 'a3_cb_laundry',
    acts: [3],
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_outside_laundry', stage: 2 } },
    title: t('조끼 없는 도', 'Do Without the Vest'),
    image: 'v2/events/a3_cb_laundry.webp',
    text: t(
      '첨탑 직원 세탁실에서 청년 하나가 수건을 갠다. 정리반 신입이던 도다. 조끼는 없다.\n“그 주에 그만뒀어요. 분실물 보고서 쓰다가.” 그가 앞치마 주머니에서 무언가를 꺼낸다. 이름표 하나다.',
      'In the Spire staff laundry a young man is folding towels. Do, the Closing Crew rookie. No vest.\n“Quit that week. Halfway through a lost-property report.” He takes something from his apron pocket. A name tag.',
    ),
    options: [
      {
        label: t('이름표를 받는다', 'Take the tag'),
        hint: t('추적 −8 · ◈ +3', '−8 Trace · +3 ◈'),
        success: {
          text: t('당신 이름이 아니다. 누군가 지켜 낸 이름이다. 도가 말한다. “주인 찾으면 줘요.”', 'Not your name. Someone’s name that was kept. Do says, “Give it back if you find them.”'),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
      {
        label: t('정리반의 첨탑 순찰 순서를 묻는다', 'Ask the Crew’s patrol order in the Spire'),
        hint: t('추적 −12 · 실패 시 추적 +5', '−12 Trace · fail +5 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('도가 수건을 개며 층수를 하나씩 읊는다. 세탁실은 맨 마지막이다.', 'Folding towels, Do recites the floors one by one. The laundry is last.'),
          effects: [{ kind: 'trace', amount: -12 }],
        },
        failure: {
          text: t('대화가 길어진다. 세탁실 감독관이 문가에 선다.', 'The talk runs long. The laundry supervisor appears in the doorway.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
    ],
    gmHints: ['do the former crew rookie', 'kept name tag', 'spire staff laundry'],
  },
  // 2026-11-04: the newest districts come back one act later (Signal+ only).
  {
    id: 'sea5_cb_container',
    acts: [5],
    route: 'sea_5',
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_sea_container', stage: 2 } },
    title: t('바지선 지붕의 토마토', 'Tomatoes on a Barge Roof'),
    image: 'v2/events/sea5_cb_container.webp',
    text: t(
      '바지선 지붕 위에 토마토 화분이 놓여 있다. 컨테이너 골목 C-7의 그 화분이다. 나래가 지붕에서 손을 흔든다.\n“이사 왔어요. 여긴 테이프가 안 붙어요. 물에 뜨니까.”',
      'A tomato plant sits on a barge roof: the one from Container Alley, C-7. Narae waves from the roof.\n“We moved. They can’t tape this one. It floats.”',
    ),
    options: [
      {
        label: t('토마토를 얻어먹는다', 'Accept a tomato'),
        hint: t('+8 HP · 소모품', '+8 HP · consumable'),
        success: {
          text: t('작고 시다. 나래 엄마가 보온병까지 쥐여 준다.', 'Small and sour. Narae’s mother adds a flask as well.'),
          effects: [
            { kind: 'hp', amount: 8 },
            { kind: 'consumable' },
          ],
        },
      },
      {
        label: t('지붕 길을 다시 묻는다', 'Ask about roof routes again'),
        hint: t('추적 −10 · ◈ +2', '−10 Trace · +2 ◈'),
        success: {
          text: t('나래가 바지선 지붕을 건너는 길을 알려 준다. 세관 드론은 물 위를 잘 안 본다.', 'Narae shows you a way across the barge roofs. Customs drones rarely look at the water.'),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
    ],
    gmHints: ['narae', 'tomato plant', 'barge roof', 'cannot be sealed'],
  },
  {
    id: 'sea6_cb_rows',
    acts: [6],
    route: 'sea_6',
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_sea_rows', stage: 2 } },
    title: t('이름으로 불린 형체', 'The One Who Was Called'),
    image: 'v2/events/sea6_cb_rows.webp',
    text: t(
      '철탑 길 안개 속에 젖은 교복의 형체가 서 있다. 이름을 얻은 그 형체다. 이번엔 문을 두드리지 않는다.\n“불러 줘서 고마워. 이 길, 등대단이 안 보는 쪽 알아.”',
      'In the causeway fog stands the figure in the wet uniform, the one that was given a name. It is not knocking this time.\n“Thanks for calling me. I know the side of this road the Keepers don’t watch.”',
    ),
    options: [
      {
        label: t('형체를 따라간다', 'Follow it'),
        hint: t('추적 −12 · ◈ +2', '−12 Trace · +2 ◈'),
        success: {
          text: t('형체가 안개 사이로 길을 낸다. 무적 소리가 등 뒤로 멀어진다.', 'The figure opens a way through the fog. The foghorn falls away behind you.'),
          effects: [
            { kind: 'trace', amount: -12 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
      {
        label: t('이름을 한 번 더 불러 준다', 'Say its name once more'),
        hint: t('+10 HP · ◈ +3', '+10 HP · +3 ◈'),
        success: {
          text: t('형체가 웃는다. 젖은 교복이 조금 마른 것처럼 보인다.', 'The figure smiles. The wet uniform looks a little drier.'),
          effects: [
            { kind: 'hp', amount: 10 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
    ],
    gmHints: ['named residue', 'wet school uniform', 'causeway fog'],
  },
  {
    id: 'a3_cb_meters',
    acts: [3],
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_outside_meters', stage: 2 } },
    title: t('첨탑의 우회선', 'A Bypass in the Spire'),
    image: 'v2/events/a3_cb_meters.webp',
    text: t(
      '첨탑 정비 통로의 배전함이 열려 있다. 맨손으로 전선을 만지는 노인. 계량기 벽의 강 씨다.\n“여기 계량기도 똑같이 돌아. 바늘 하나 세워 줄까? 감시 카메라 쪽으로.”',
      'A fuse box in a Spire maintenance corridor stands open. An old man handles the wires bare-handed: Gang, from the meter wall.\n“Meters here turn the same way. Want me to stop a dial? The camera circuit, say.”',
    ),
    options: [
      {
        label: t('카메라 회로를 세워 달라고 한다', 'Ask him to stop the camera circuit'),
        hint: t('추적 −12 · 실패 시 추적 +5', '−12 Trace · fail +5 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('통로 카메라 불이 하나씩 꺼진다. 강 씨가 휘파람을 분다.', 'The corridor cameras go dark one by one. Gang whistles.'),
          effects: [{ kind: 'trace', amount: -12 }],
        },
        failure: {
          text: t('엉뚱한 선이다. 경보등이 켜진다. 강 씨가 먼저 달아난다.', 'Wrong wire. The alarm light comes on. Gang runs first.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('남는 전지를 얻는다', 'Take a spare battery'),
        hint: t('소모품 · ◈ +2', 'consumable · +2 ◈'),
        success: {
          text: t('강 씨가 공구 벨트에서 전지 하나를 빼 준다. “첨탑 전기는 맛이 좋아.”', 'Gang pulls a battery off his tool belt. “Spire power tastes good.”'),
          effects: [
            { kind: 'consumable' },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
    ],
    gmHints: ['mr gang the electrician', 'spire fuse box', 'bypass'],
  },
  // 2026-11-04: the four Glass Library districts (Act 4) come back among the Dreaming Machines (Act 5).
  {
    id: 'a5_cb_cut_names',
    acts: [5],
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_cut_names', stage: 2 } },
    title: t('붙여 둔 이름', 'The Name You Pasted Back'),
    image: 'v2/events/a5_cb_cut_names.webp',
    text: t(
      '고철 묘역의 버려진 기계 하나, 가슴판에 종잇조각이 붙어 있다. 잘린 이름의 서랍에서 당신이 다시 붙여 준 그 이름이다. 풀 자국이 아직 반짝인다.\n기계가 그 이름으로 자기를 소개한다.',
      'A discarded machine in the scrap graveyard has a paper slip stuck to its chest plate: the name you pasted back from the drawer of cut names. The paste still shines.\nThe machine introduces itself by that name.',
    ),
    options: [
      {
        label: t('그 이름으로 불러 준다', 'Call it by that name'),
        hint: t('+10 HP · ◈ +3', '+10 HP · +3 ◈'),
        success: {
          text: t('기계가 고개를 든다. 주변의 다른 기계들도 자기 가슴판을 내려다본다.', 'The machine lifts its head. The machines around it look down at their own chest plates.'),
          effects: [
            { kind: 'hp', amount: 10 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
      {
        label: t('묘역의 길을 묻는다', 'Ask it the way through the graveyard'),
        hint: t('추적 −12 · 실패 시 추적 +5', '−12 Trace · fail +5 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('기계가 크레인 순회가 비는 골목을 짚어 준다.', 'The machine points out the lanes the crane patrol skips.'),
          effects: [{ kind: 'trace', amount: -12 }],
        },
        failure: {
          text: t('기계가 너무 크게 대답한다. 크레인 불빛이 돈다.', 'The machine answers too loudly. The crane light swings round.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
    ],
    gmHints: ['the pasted-back name', 'scrap graveyard', 'chest plate'],
  },
  {
    id: 'a5_cb_dream_shelf',
    acts: [5],
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_dream_fragment', stage: 2 } },
    title: t('빈 마지막 장', 'The Blank Last Page'),
    image: 'v2/events/a5_cb_dream_shelf.webp',
    text: t(
      '폐기된 영사기 하나가 고철 더미 위에서 혼자 돌아간다. 꿈의 서가에서 당신이 빈 채로 남겨 둔 그 장면이다. 마지막 장에서 화면이 하얗게 멈춘다.\n기계들이 하얀 화면을 둘러싸고 앉아 있다. 아무도 결말을 채우지 않는다.',
      'A scrapped projector runs on its own atop a heap: the scene you preserved with its last page blank in the Dream Stacks. On the last page the screen stops, white.\nMachines sit around the white screen. Nobody fills in the ending.',
    ),
    options: [
      {
        label: t('기계들 곁에 앉는다', 'Sit with the machines'),
        hint: t('+8 HP · ◈ +3', '+8 HP · +3 ◈'),
        success: {
          text: t('하얀 화면을 함께 본다. 결말이 없다는 게 이상하게 편하다.', 'You watch the white screen together. Having no ending is strangely restful.'),
          effects: [
            { kind: 'hp', amount: 8 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
      {
        label: t('영사기의 순회 신호를 읽는다', 'Read the projector’s patrol signal'),
        hint: t('추적 −10 · 소모품', '−10 Trace · consumable'),
        success: {
          text: t('영사기 받침에 검열 색인의 순회표가 끼워져 있다. 받침 아래엔 예비 전지.', 'The censor index’s patrol table is wedged under the projector stand, with a spare battery below it.'),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'consumable' },
          ],
        },
      },
    ],
    gmHints: ['blank last page', 'scrapped projector', 'unfinished dream'],
  },
  {
    id: 'a5_cb_index',
    acts: [5],
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_forbidden_index', stage: 2 } },
    title: t('해독한 책의 독자', 'A Reader for the Decoded Book'),
    image: 'v2/events/a5_cb_index.webp',
    text: t(
      '고철 더미 속 기계 하나가 낡은 책을 읽고 있다. 금서 색인에서 당신이 해독한 바로 그 제목이다. 해독된 번호가 퍼진 모양이다.\n기계가 책장을 넘기다 당신을 본다. “이거, 끝까지 읽어도 되는 거죠?”',
      'A machine in the scrap is reading an old book: the very title you decoded in the Forbidden Index. The decoded mark must have spread.\nTurning a page, the machine looks up. “I’m allowed to read this to the end, aren’t I?”',
    ),
    options: [
      {
        label: t('“끝까지 읽어도 돼.”', '“Read it to the end.”'),
        hint: t('◈ +4 · 추적 −4', '+4 ◈ · −4 Trace'),
        success: {
          text: t('기계가 다시 책에 고개를 묻는다. 주변 기계 몇이 어깨 너머로 같이 읽는다.', 'The machine bends back over the book. A few others read over its shoulder.'),
          effects: [
            { kind: 'echoes', amount: 4 },
            { kind: 'trace', amount: -4 },
          ],
        },
      },
      {
        label: t('책 사이에 끼운 쪽지를 본다', 'Look at the note tucked in the book'),
        hint: t('추적 −12 · 실패 시 추적 +5', '−12 Trace · fail +5 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('검열관이 남긴 쪽지다. 다음 수거 경로가 거꾸로 적혀 있다. 거꾸로 읽는 법은 이미 안다.', 'A censor’s note: the next collection route, written backwards. You already know how to read backwards.'),
          effects: [{ kind: 'trace', amount: -12 }],
        },
        failure: {
          text: t('쪽지가 부서진다. 기계가 실망한 소리를 낸다.', 'The note crumbles. The machine makes a disappointed sound.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
    ],
    gmHints: ['decoded banned book', 'machine reader', 'scrap graveyard'],
  },
  {
    id: 'a5_cb_miro',
    acts: [5],
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_return_record', stage: 2 } },
    title: t('예약 확인 쪽지', 'The Reservation Slip'),
    image: 'v2/events/a5_cb_miro.webp',
    text: t(
      '고철 묘역 입구, 작은 배달 기계가 당신 앞에 멈춘다. 몸통에 반납 창구의 도장이 찍힌 쪽지가 꽂혀 있다. 미로와 맞춰 본 그 열람 예약이다.\n쪽지 아래에 아이 글씨로 한 줄. “제 번호도 아직 살아 있어요.”',
      'At the graveyard gate a small delivery machine stops before you. Tucked into its body is a slip stamped by the returns desk: the reading reservation you reconciled with Miro.\nUnder it, one line in a child’s hand. “My number is still alive too.”',
    ),
    options: [
      {
        label: t('쪽지를 받는다', 'Take the slip'),
        hint: t('◈ +3 · 소모품', '+3 ◈ · consumable'),
        success: {
          text: t('배달 기계가 수령 도장을 받고 떠난다. 짐칸에 덤으로 보급품 하나를 두고.', 'The delivery machine takes your signature and goes, leaving a supply pack behind as a bonus.'),
          effects: [
            { kind: 'echoes', amount: 3 },
            { kind: 'consumable' },
          ],
        },
      },
      {
        label: t('배달 기계의 경로를 따라간다', 'Follow the delivery machine’s route'),
        hint: t('추적 −10 · +6 HP', '−10 Trace · +6 HP'),
        success: {
          text: t('배달 기계는 감시가 없는 길만 안다. 그래야 배달이 끊기지 않으니까.', 'Delivery machines know only the unwatched roads. That is how deliveries never stop.'),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'hp', amount: 6 },
          ],
        },
      },
    ],
    gmHints: ['miro', 'reading reservation', 'delivery machine'],
  },
  {
    id: 'a6_cb_crane',
    acts: [6],
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_crane_chapel', stage: 2 } },
    title: t('꿈을 끝낸 간호 로봇', 'The Nurse Who Finished Dreaming'),
    image: 'v2/events/a6_cb_crane.webp',
    text: t(
      '최초 기록의 복도 끝에 작은 간호 로봇이 서 있다. 크레인 아래 묻어 준 그 로봇이다. 꿈을 끝까지 꾸고, 여기서 깨어났다고 한다.\n체온계를 내민다. “열 좀 재 볼게요. 오래 걸어오셨네요.”',
      'At the end of a corridor in the first record stands the small nursing robot you had buried under the crane. It dreamed its dream to the end, it says, and woke here.\nIt holds out the thermometer. “Let me take your temperature. You’ve walked a long way.”',
    ),
    options: [
      {
        label: t('체온을 재게 둔다', 'Let it take your temperature'),
        hint: t('+14 HP', '+14 HP'),
        success: {
          text: t('로봇이 고개를 끄덕인다. “조금 지쳤어요. 이걸 드세요.” 작은 알약 하나가 손에 놓인다.', 'The robot nods. “A little worn out. Take this.” A small pill lands in your palm.'),
          effects: [{ kind: 'hp', amount: 14 }],
        },
      },
      {
        label: t('꿈의 끝이 어땠는지 묻는다', 'Ask how the dream ended'),
        hint: t('◈ +4 · 추적 −6', '+4 ◈ · −6 Trace'),
        success: {
          text: t('“비가 그쳤어요.” 로봇이 그것만 말한다. 그걸로 충분해 보인다.', '“The rain stopped.” That is all the robot says. It seems to be enough.'),
          effects: [
            { kind: 'echoes', amount: 4 },
            { kind: 'trace', amount: -6 },
          ],
        },
      },
    ],
    gmHints: ['nursing robot', 'finished dream', 'thermometer', 'buried under the crane'],
  },
  {
    id: 'sea5_cb_dorm',
    acts: [5],
    route: 'sea_5',
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_sea_dorm', stage: 2 } },
    title: t('밀물 칸에 적힌 이름', 'A Name in the Flood Column'),
    image: 'v2/events/sea5_cb_dorm.webp',
    text: t(
      '방파제 초소 벽에 조석표 한 장이 새로 붙어 있다. 하역조 숙소 식당의 그 필체다. 오늘 밀물 칸 옆에 연필로 작게 적혀 있다. 당신이 지나간다는 표시다.\n초소 안에서 영 조리장이 보온 도시락을 들고 나온다.',
      'A fresh tide table is pinned to the breakwater post: the same hand as on the dormitory mess wall. Beside today’s flood, in small pencil, a note that you are passing through.\nCook Yeong steps out of the post with an insulated lunchbox.',
    ),
    options: [
      {
        label: t('도시락을 받는다', 'Take the lunchbox'),
        hint: t('+12 HP', '+12 HP'),
        success: {
          text: t('“숙소 지켜 준 값이에요. 아직 따뜻해요.”', '“For keeping the dormitory. Still warm.”'),
          effects: [{ kind: 'hp', amount: 12 }],
        },
      },
      {
        label: t('조석표대로 물길을 탄다', 'Move by the tide table'),
        hint: t('추적 −12 · ◈ +2', '−12 Trace · +2 ◈'),
        success: {
          text: t('밀물 시각에 맞춰 움직이자 세관 순찰이 물에 막혀 따라오지 못한다.', 'Moving to the flood times, you leave the customs patrol cut off by the water.'),
          effects: [
            { kind: 'trace', amount: -12 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
    ],
    gmHints: ['tide table', 'cook yeong', 'breakwater post', 'kept dormitory'],
  },
  {
    id: 'sea6_cb_shallows',
    acts: [6],
    route: 'sea_6',
    weight: CALLBACK_WEIGHT,
    requires: { quest: { id: 'q_sea_shallows', stage: 2 } },
    title: t('돌아온 목소리', 'The Voice That Came Back'),
    image: 'v2/events/sea6_cb_shallows.webp',
    text: t(
      '철탑 길 안개 속에서 아이 목소리 하나가 노래를 부른다. 여울에서 건져 준 그 목소리다. 엄마 곁으로 돌아간 뒤 안개 속까지 퍼졌다고 한다.\n노래가 들리는 쪽만 안개가 옅다.',
      'In the causeway fog a child’s voice is singing: the voice you brought back from the shallows. Back with its mother, it has carried even into the fog.\nThe fog is thinner only where the song can be heard.',
    ),
    options: [
      {
        label: t('노래 쪽으로 걷는다', 'Walk toward the song'),
        hint: t('추적 −12 · ◈ +3', '−12 Trace · +3 ◈'),
        success: {
          text: t('옅은 안개 속에선 등대단 초소가 먼저 보인다. 피해 간다.', 'In the thin fog the Keepers’ posts show first. You go around them.'),
          effects: [
            { kind: 'trace', amount: -12 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
      {
        label: t('멈춰 서서 끝까지 듣는다', 'Stop and listen to the end'),
        hint: t('+12 HP', '+12 HP'),
        success: {
          text: t('짧은 노래다. 끝나자 숨이 고르게 돌아와 있다.', 'A short song. When it ends, your breathing has evened out.'),
          effects: [{ kind: 'hp', amount: 12 }],
        },
      },
    ],
    gmHints: ['child voice', 'song in the fog', 'recovered memory'],
  },
]
