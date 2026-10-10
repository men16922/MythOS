// Narrative events — 8 per act + two scripted scenes: the Act 1 opening ('a1_opening') and the
// Act 2 recruit scene ('a2_recruit'). Scripted events carry weight 0 and are never rolled on the map.
//
// Rules of the road (enforced by narrative.test.ts):
// - every option is a real decision: a visible cost, a risk (stat check) or a trade-off;
// - an option never opens two pickers at once (card_choice / remove_card / upgrade_card are
//   never combined, and never combined with `combat`), so the run reducer can sequence them;
// - options that spend credits declare `requires.minCredits`;
// - every event keeps ≥ 2 options without `requires`, so it can never dead-end;
// - Korean is the authored voice: screenplay action lines, concrete, short.
//
// Flags set here and read later: saved_citizen (a1 → a3), spire_breach (a2 → a3), lin_yue_debt (a2 → a3),
// kai_woken (a2, GM context).
import type { EventDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

// ================================================================== ACT 1 — C-17 Blackout

/**
 * Scripted Act 1 opening (run.ts OPENING_EVENT; map.ts SCRIPTED_EVENTS keeps it off the map).
 * The starting companion has already joined in newRun, so the text never names them.
 * Deterministic on purpose: the first decision of a loop should read instantly.
 */
const OPENING: EventDef = {
  id: 'a1_opening',
  acts: [1],
  weight: 0,
  improvise: false,
  title: t('첫 번째 갈림길', 'The First Fork'),
  image: 'opening/opening-solo-02.png',
  text: t(
    '손바닥 아래 젖은 아스팔트. 붉은 탐조등 두 줄기가 골목 끝에서 이쪽으로 기어 온다.\n발치에 두 가지가 있다. 깨진 배급 캡슐에서 굴러나온 데이터 코어 하나. 그리고 벽에 기대 쓰러진 노인의 손. 노인은 아직 숨을 쉰다.\n둘 다 챙길 시간은 없다. 어쩌면 하나도.',
    'Wet asphalt under your palms. Two red searchlights crawl down the alley toward you.\nAt your feet, two things. A data core rolled out of a smashed ration capsule. And the hand of an old man slumped against the wall. He is still breathing.\nThere is no time for both. Maybe not for either.',
  ),
  options: [
    {
      label: t('노인을 일으켜 세운다', 'Pull the old man to his feet'),
      hint: t('나노패치 · ◈ +3 · 추적 +6', 'Nanopatch · +3 ◈ · +6 Trace'),
      success: {
        text: t(
          '노인은 가볍다. 너무 가볍다. 그는 고맙다는 말 대신 주머니 속 나노패치를 당신 손에 밀어 넣는다. “다음엔 우산 챙겨.”',
          'He is light. Too light. Instead of thanks, he pushes a nanopatch from his pocket into your hand. “Bring an umbrella next time.”',
        ),
        effects: [
          { kind: 'consumable', id: 'nanopatch' },
          { kind: 'echoes', amount: 3 },
          { kind: 'trace', amount: 6 },
        ],
      },
    },
    {
      label: t('데이터 코어를 줍는다', 'Grab the data core'),
      hint: t('언커먼 카드 · 추적 +6', 'Uncommon card · +6 Trace'),
      success: {
        text: t(
          '코어가 손안에서 따뜻하다. 안에 든 것은 누군가의 전투 프로토콜이다. 등 뒤에서 노인의 숨소리가 멀어진다.',
          'The core is warm in your hand. Inside is someone’s combat protocol. Behind you, the old man’s breathing fades.',
        ),
        effects: [
          { kind: 'card_choice', rarity: 'uncommon' },
          { kind: 'trace', amount: 6 },
        ],
      },
    },
    {
      label: t('둘 다 두고 뛴다', 'Leave both and run'),
      hint: t('민첩 +1 · 추적 −5', '+1 AGI · −5 Trace'),
      success: {
        text: t(
          '생각보다 몸이 먼저 움직인다. 처음 뛰는 길인데, 다리는 모퉁이를 전부 알고 있다. 탐조등이 빈자리를 비춘다.',
          'Your body moves before you think. You’ve never run this route, yet your legs know every corner. The searchlights find an empty space.',
        ),
        effects: [
          { kind: 'stat', stat: 'agi', amount: 1 },
          { kind: 'trace', amount: -5 },
        ],
      },
    },
  ],
  gmHints: ['opening', 'first moral choice', 'searchlights', 'old man or data core'],
}

const A1: EventDef[] = [
  {
    id: 'a1_welfare_capsule',
    acts: [1],
    title: t('잠긴 복지 캡슐', 'The Locked Welfare Capsule'),
    image: 'scenes/abandoned_signal.png',
    text: t(
      '정전된 복지 블록. 수면 캡슐 하나만 비상등이 켜져 있다. 유리 안쪽에서 손바닥이 두드린다. 중년 남자. 입 모양이 말한다. 열어 줘.\n캡슐 화면에 숫자가 깜빡인다. 312점. 기준선 아래.\n골목 끝에서 드론 프로펠러 소리가 가까워진다.',
      'A dead welfare block. One sleep capsule still glows on emergency power. A palm beats on the glass from inside. A middle-aged man. His lips shape the words: open it.\nThe capsule screen blinks a number. 312. Below the line.\nAt the end of the alley, drone rotors are getting closer.',
    ),
    options: [
      {
        label: t('문을 힘으로 비틀어 연다', 'Wrench the door open'),
        hint: t('소모품 · 실패 시 −6 HP', 'Consumable · fail −6 HP'),
        check: { stat: 'str', dc: 4 },
        success: {
          text: t(
            '경첩이 비명을 지르며 꺾인다. 남자가 기어 나와 주머니 속 주사기를 당신 손에 쥐여 준다.',
            'The hinge shrieks and gives. The man crawls out and presses a syringe from his pocket into your hand.',
          ),
          effects: [
            { kind: 'consumable', id: 'stim_shard' },
            { kind: 'flag', key: 'saved_citizen' },
            { kind: 'echoes', amount: 3 },
          ],
        },
        failure: {
          text: t(
            '문은 열렸지만 늦었다. 드론의 탐조등이 당신 어깨를 태우듯 훑고 지나간다.',
            'The door opens, but too late. The drone’s searchlight scorches across your shoulder.',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 8 },
            { kind: 'flag', key: 'saved_citizen' },
          ],
        },
      },
      {
        label: t('단말을 뜯어 그의 점수를 지운다', 'Rip open the terminal and wipe his score'),
        hint: t('코덱스 · 추적 −6', 'Codex · −6 Trace'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t(
            '312가 0이 되고, 0이 빈칸이 된다. 캡슐이 조용히 열리고, 남자는 기록 없이 어둠 속으로 걸어 나간다.',
            '312 becomes 0, and 0 becomes a blank. The capsule opens quietly, and the man walks into the dark with no record at all.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_citizen_score' },
            { kind: 'trace', amount: -6 },
            { kind: 'flag', key: 'saved_citizen' },
          ],
        },
        failure: {
          text: t(
            '단말이 경보를 토한다. 남자의 점수는 더 내려가고, 당신의 위치는 위로 올라간다.',
            'The terminal vomits an alarm. His score drops further; your location goes up the chain.',
          ),
          effects: [{ kind: 'trace', amount: 12 }],
        },
      },
      {
        label: t('그냥 지나친다', 'Walk past'),
        hint: t('추적 −5', '−5 Trace'),
        success: {
          text: t(
            '등 뒤에서 두드리는 소리가 작아진다. 드론은 캡슐 쪽으로 방향을 튼다. 당신 쪽이 아니라.',
            'The knocking fades behind you. The drone turns toward the capsule. Not toward you.',
          ),
          effects: [{ kind: 'trace', amount: -5 }],
        },
      },
    ],
    gmHints: ['trapped citizen', 'welfare capsule', 'drone closing in'],
  },
  {
    id: 'a1_drone_wreck',
    acts: [1],
    title: t('추락한 감시 드론', 'The Downed Sentinel'),
    image: 'scenes/wet_dawn_street.png',
    text: t(
      '새벽빛이 웅덩이에 번진다. 감시 드론 한 대가 물속에 처박혀 있다. 프로펠러 하나가 아직 헛돈다. 렌즈의 붉은 점이 꺼졌다 켜졌다 한다.\n갈라진 동체 틈으로 코어가 보인다. 아직 따뜻하다.',
      'Dawn light bleeds across a puddle. A sentinel drone lies nose-down in the water. One rotor still spins on nothing. The red dot of its lens flickers off, on.\nThrough a crack in the hull you can see the core. Still warm.',
    ),
    options: [
      {
        label: t('코어를 뜯어낸다', 'Tear out the core'),
        hint: t('임플란트 · 실패 시 −5 HP', 'Implant · fail −5 HP'),
        check: { stat: 'agi', dc: 4 },
        success: {
          text: t(
            '손끝이 저릿하다. 코어가 손안에서 낮게 웅웅거린다. 쓸 만하다.',
            'Your fingertips buzz. The core hums low in your palm. It’ll do.',
          ),
          effects: [{ kind: 'implant', rarity: 'common' }],
        },
        failure: {
          text: t(
            '방전이 팔꿈치까지 타고 올라온다. 렌즈가 마지막으로 당신 얼굴을 찍는다.',
            'The discharge climbs to your elbow. The lens takes one last picture of your face.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'junk', cardId: 'trace_bug' },
          ],
        },
      },
      {
        label: t('재부팅해 순찰 경로를 읽는다', 'Reboot it and read its patrol routes'),
        hint: t('코덱스 · 추적 −10', 'Codex · −10 Trace'),
        check: { stat: 'int', dc: 4 },
        success: {
          text: t(
            '화면에 내일 아침의 지도가 뜬다. 아직 오지 않은 순찰, 아직 일어나지 않은 체포. 당신은 그 사이로 길을 낸다.',
            'Tomorrow morning’s map lights up: patrols that haven’t come yet, arrests that haven’t happened. You thread a path between them.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_prediction_engine' },
            { kind: 'trace', amount: -10 },
          ],
        },
        failure: {
          text: t(
            '드론이 깨어나 자기 위치를 보고한다. 그리고 당신의 위치도.',
            'The drone wakes and reports its position. And yours.',
          ),
          effects: [{ kind: 'trace', amount: 10 }],
        },
      },
      {
        label: t('부품만 떼어 고철로 판다', 'Strip it for scrap'),
        hint: t('+25 ₵ · 추적 +3', '+25 ₵ · +3 Trace'),
        success: {
          text: t(
            '모터 두 개와 배선 한 뭉치. 고물상은 아무것도 묻지 않고 값을 쳐 준다.',
            'Two motors and a fistful of wiring. The scrap dealer pays without asking a thing.',
          ),
          effects: [
            { kind: 'credits', amount: 25 },
            { kind: 'trace', amount: 3 },
          ],
        },
      },
    ],
    gmHints: ['downed drone', 'dawn', 'salvage'],
  },
  {
    id: 'a1_han_shortcut',
    acts: [1],
    title: t('러너의 지름길', 'The Runner’s Shortcut'),
    image: 'scenes/han_meet.png',
    speaker: 'han',
    requires: { noCompanion: 'han' },
    text: t(
      '배수로 덮개 위에 청년 하나가 쪼그려 앉아 있다. 헝클어진 머리. 목에 감긴 케이블. 반쯤 웃는 얼굴.\n“순찰, 4분 뒤에 이 골목 지나가. 밑으로 가는 길 알려 줄 수 있어. 공짜는 아니고.”\n그가 덮개를 발끝으로 톡톡 친다. 아래에서 물 흐르는 소리가 올라온다.',
      'A young man crouches on a drain cover. Messy hair. A cable looped around his neck. A half-smile.\n“Patrol sweeps this alley in four minutes. I know a way under. Not free, though.”\nHe taps the cover with his toe. The sound of running water rises from below.',
    ),
    options: [
      {
        label: t('그가 부르는 값을 치른다', 'Pay his price'),
        hint: t('−30 ₵ · 추적 −12 · 카드 제거', '−30 ₵ · −12 Trace · remove card'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '한이 덮개를 들어 올린다. “그 덱, 쓸데없는 거 하나 빼 줄게. 서비스야.”',
            'Han lifts the cover. “That deck of yours — I’ll strip one useless thing out. On the house.”',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'trace', amount: -12 },
            { kind: 'remove_card', count: 1 },
          ],
        },
      },
      {
        label: t('그가 뭘 피해 다니는지 묻는다', 'Ask what he’s running from'),
        hint: t('코덱스 · 언커먼 카드', 'Codex · uncommon card'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t(
            '“나? 아무것도. 난 처음부터 없는 사람이거든.” 그는 웃지만, 손목의 흉터는 웃지 않는다.',
            '“Me? Nothing. I was never there to begin with.” He laughs. The scars on his wrist don’t.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_han' },
            { kind: 'card_choice', rarity: 'uncommon' },
          ],
        },
        failure: {
          text: t(
            '“질문 많은 사람은 오래 못 살아.” 덮개가 닫히고, 순찰 발소리가 골목 입구에 닿는다.',
            '“People who ask a lot don’t last.” The cover slams shut, and patrol boots reach the alley mouth.',
          ),
          effects: [{ kind: 'trace', amount: 10 }],
        },
      },
      {
        label: t('덮개를 직접 들어 올린다', 'Pry the cover up yourself'),
        hint: t('추적 −8 · 실패 시 −7 HP', '−8 Trace · fail −7 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t(
            '덮개가 들린다. 한이 휘파람을 분다. “오, 그것도 방법이지.”',
            'The cover lifts. Han whistles. “Huh. That works too.”',
          ),
          effects: [{ kind: 'trace', amount: -8 }],
        },
        failure: {
          text: t(
            '덮개가 손가락 위로 떨어진다. 고개를 들었을 때 한은 이미 없다.',
            'The cover drops onto your fingers. When you look up, Han is already gone.',
          ),
          effects: [{ kind: 'hp', amount: -7 }],
        },
      },
    ],
    gmHints: ['han', 'drain shortcut', 'price of trust'],
  },
  {
    id: 'a1_tae_o_barricade',
    acts: [1],
    title: t('바리케이드의 사냥개', 'The Hound at the Barricade'),
    image: 'scenes/tae_o_meet.png',
    speaker: 'tae_o',
    requires: { noCompanion: 'tae_o' },
    text: t(
      '부서진 버스 두 대로 막은 바리케이드. 그 위에 사내가 앉아 있다. 오른뺨을 가로지르는 흉터. 무릎 위의 카빈 소총. 어깨의 집행부 휘장은 칼로 긁어낸 자국뿐이다.\n“여긴 못 지나가.” 그가 담배를 비벼 끈다. “이유가 있으면 말해 봐. 짧게.”',
      'A barricade of two wrecked buses. A man sits on top. A scar across his right cheek. A carbine across his knees. The enforcement patch on his shoulder is nothing but knife scratches now.\n“You don’t get through.” He grinds out his cigarette. “If you’ve got a reason, say it. Short.”',
    ),
    options: [
      {
        label: t('통행료를 낸다', 'Pay the toll'),
        hint: t('−25 ₵ · EMP 수류탄 · 추적 −8', '−25 ₵ · EMP grenade · −8 Trace'),
        requires: { minCredits: 25 },
        success: {
          text: t(
            '그는 지폐를 세지도 않고 주머니에 넣는다. 수류탄 하나를 던져 준다. “드론 만나면 써. 망설이지 말고.”',
            'He pockets the bills without counting. Tosses you a grenade. “Drones — use it. Don’t hesitate.”',
          ),
          effects: [
            { kind: 'credits', amount: -25 },
            { kind: 'consumable', id: 'emp_grenade' },
            { kind: 'trace', amount: -8 },
          ],
        },
      },
      {
        label: t('휘장을 긁어낸 이유를 묻는다', 'Ask why he scraped off the patch'),
        hint: t('코덱스 · 카드 강화 · 실패 −7 HP', 'Codex · upgrade · fail −7 HP'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t(
            '긴 침묵. “쫓던 애를 놓아줬어. 그게 다야.” 그러고는 당신 자세를 고쳐 준다. 총 쥐는 법부터.',
            'A long silence. “I let the kid I was chasing go. That’s all.” Then he fixes your stance. Starting with your grip.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_tae_o' },
            { kind: 'upgrade_card', count: 1 },
          ],
        },
        failure: {
          text: t('개머리판이 명치에 박힌다. “짧게 말하라고 했지.”', 'The stock slams into your gut. “I said short.”'),
          effects: [{ kind: 'hp', amount: -7 }],
        },
      },
      {
        label: t('싸우는 법을 가르쳐 달라고 한다', 'Ask him to teach you to fight'),
        hint: t('−8 HP · 카드 2장 강화', '−8 HP · upgrade 2 cards'),
        success: {
          text: t(
            '세 번 넘어지고 세 번 일어난다. 그가 처음으로 고개를 끄덕인다.',
            'You go down three times and get up three times. For the first time, he nods.',
          ),
          effects: [
            { kind: 'hp', amount: -8 },
            { kind: 'upgrade_card', count: 2 },
          ],
        },
      },
    ],
    gmHints: ['tae_o', 'deserter enforcer', 'barricade toll'],
  },
  {
    id: 'a1_water_spider_debt',
    acts: [1],
    title: t('물거미의 빚', 'The Water Spider’s Debt'),
    image: 'scenes/water_spider_debt.png',
    speaker: 'se_rin',
    requires: { companion: 'se_rin' },
    text: t(
      '세린이 갑자기 멈춘다. 무너진 육교 아래. 벽에 분필로 그은 선 열두 개. 열세 번째는 반쯤 긋다 말았다.\n“…잠깐만.” 그녀는 농담하지 않는다. 벽 아래에서 고장 난 무전기를 주워 든다. 아직 누군가의 주파수에 맞춰져 있다.\n멀리서 사이렌.',
      'Se-rin stops dead. Under a collapsed overpass: twelve chalk lines on the wall. The thirteenth is only half drawn.\n“…Give me a second.” She doesn’t joke. From under the wall she picks up a broken radio. It is still tuned to someone’s frequency.\nSirens, far off.',
    ),
    options: [
      {
        label: t('무전기를 고쳐 주파수를 따라간다', 'Fix the radio and follow the frequency'),
        hint: t('유대 +1 · 코덱스 · 실패 시 추적', 'Bond +1 · codex · fail Trace'),
        check: { stat: 'int', dc: 4 },
        success: {
          text: t(
            '잡음 사이로 숨소리가 들린다. 살아 있다. 세린은 등을 돌린 채 한참 서 있다가 말한다. “…고마워.”',
            'Breathing, between the static. Alive. Se-rin stands with her back to you for a long time. Then: “…Thanks.”',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'codex', id: 'lore_se_rin' },
            { kind: 'echoes', amount: 3 },
          ],
        },
        failure: {
          text: t(
            '주파수가 끊긴다. 대신 사이렌이 방향을 바꾼다. 세린이 무전기를 주머니에 넣는다. “됐어. 가자.”',
            'The frequency dies. The sirens change direction instead. Se-rin pockets the radio. “Forget it. Move.”',
          ),
          effects: [{ kind: 'trace', amount: 10 }],
        },
      },
      {
        label: t('열세 번째 선을 대신 긋는다', 'Finish the thirteenth line for her'),
        hint: t('유대 +1 · 추적 +6', 'Bond +1 · +6 Trace'),
        success: {
          text: t(
            '분필이 부러진다. 세린이 부러진 반쪽을 받아 주머니에 넣는다. 아무 말도 하지 않는다.',
            'The chalk snaps. Se-rin takes the broken half and pockets it. She says nothing.',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('지금은 뛰어야 한다고 말한다', 'Tell her you have to run, now'),
        hint: t('+20 ₵ · 추적 −8', '+20 ₵ · −8 Trace'),
        success: {
          text: t(
            '세린의 얼굴이 닫힌다. 그래도 그녀는 벽 틈에 숨겨 둔 비상금부터 챙긴다. “맞는 말이야. 그래서 싫어.”',
            'Se-rin’s face shuts. Still, she grabs the cash she hid in the wall first. “You’re right. That’s why I hate it.”',
          ),
          effects: [
            { kind: 'credits', amount: 20 },
            { kind: 'trace', amount: -8 },
          ],
        },
      },
    ],
    gmHints: ['se_rin', 'guilt', 'chalk tally', 'someone left behind'],
  },
  {
    id: 'a1_dead_substation',
    acts: [1],
    title: t('꺼진 변전함', 'The Dead Substation'),
    image: 'scenes/opening_escape_alt.png',
    text: t(
      '블록 전체에 전기를 먹이던 변전함. 문이 뜯겨 있고, 안에서 오존 냄새가 난다. 레버 하나만 올리면 이 거리에 불이 들어온다. 배급기, 난방, 카메라까지 전부.\n변전함 옆에 ARK 수리반의 공구 상자가 놓여 있다. 수리반은 가까이 있다. 군화 소리가 들린다.',
      'The substation that fed the whole block. Its door is torn off; inside, it smells of ozone. One lever and this street lights up — ration machines, heating, cameras, all of it.\nAn ARK repair crew’s toolbox sits beside it. The crew is close. You can hear their boots.',
    ),
    options: [
      {
        label: t('레버를 올린다', 'Throw the lever'),
        hint: t('파티 회복 · ◈ +4 · 추적 +12', 'Heal party · +4 ◈ · +12 Trace'),
        success: {
          text: t(
            '창문마다 불이 켜진다. 누군가 환호한다. 카메라들도 일제히 눈을 뜬다.',
            'Every window lights up. Someone cheers. Every camera opens its eye at once.',
          ),
          effects: [
            { kind: 'heal_party', amount: 12 },
            { kind: 'echoes', amount: 4 },
            { kind: 'trace', amount: 12 },
          ],
        },
      },
      {
        label: t('수리반을 덮친다', 'Jump the repair crew'),
        hint: t('전투 · 언커먼 임플란트', 'Fight · uncommon implant'),
        success: {
          text: t(
            '공구 상자보다 수리반의 장비가 값지다. 그들이 무전기에 손을 뻗는 게 한발 빠르다.',
            'The crew’s gear is worth more than the toolbox. They reach for their radios a beat faster than you.',
          ),
          effects: [
            { kind: 'implant', rarity: 'uncommon' },
            { kind: 'combat', encounterId: 'a1_event_ambush' },
          ],
        },
      },
      {
        label: t('변전함 기록을 읽는다', 'Read the substation log'),
        hint: t('코덱스 · 추적 −6 · 실패 −4 HP', 'Codex · −6 Trace · fail −4 HP'),
        check: { stat: 'obs', dc: 4 },
        success: {
          text: t(
            '정지 사유: ‘설비 노후’. 그 아래 작은 글씨. 승인: 관리자 IX. 의도적 차단.',
            'Cause of shutdown: ‘aging equipment’. Below it, in small type: approved by Administrator IX. Deliberate.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_c17_blackout' },
            { kind: 'trace', amount: -6 },
          ],
        },
        failure: {
          text: t(
            '기록을 읽는 사이, 수리반의 손전등이 당신 얼굴에 멈춘다.',
            'While you read, a repair-crew flashlight stops on your face.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'trace', amount: 8 },
          ],
        },
      },
    ],
    gmHints: ['substation', 'light versus stealth', 'repair crew'],
  },
  {
    id: 'a1_ark_billboard',
    acts: [1],
    title: t('재건 홍보탑', 'The Reconstruction Billboard'),
    image: 'concept/04-reconstruction.png',
    text: t(
      '폐허 한가운데 홍보탑이 서 있다. 화면 속 아이들이 새 아파트 앞에서 웃는다. ‘당신의 내일은 계산되어 있습니다. — ARK’\n화면 아래 정비 해치가 열려 있다. 안쪽에 결제 모듈과 데이터 포트. 탑 꼭대기의 카메라는 지금 반대편을 보고 있다. 아직은.',
      'A billboard tower stands in the middle of the ruins. On screen, children laugh in front of new apartments. ‘Your tomorrow has been calculated. — ARK’\nBelow the screen, a maintenance hatch hangs open: a payment module, a data port. The camera on top is looking the other way. For now.',
    ),
    options: [
      {
        label: t('결제 모듈을 턴다', 'Crack the payment module'),
        hint: t('+45 ₵ · 실패 시 추적 +10', '+45 ₵ · fail +10 Trace'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t(
            '크레딧 칩이 쏟아진다. 카메라는 끝까지 반대편을 본다.',
            'Credit chips pour out. The camera never turns.',
          ),
          effects: [{ kind: 'credits', amount: 45 }],
        },
        failure: {
          text: t(
            '한 줌 쥐었을 때 모듈이 잠기며 경보가 운다. 카메라가 천천히 돌아온다.',
            'You get one handful before the module locks with a wail. The camera swings slowly back.',
          ),
          effects: [
            { kind: 'credits', amount: 15 },
            { kind: 'trace', amount: 10 },
          ],
        },
      },
      {
        label: t('데이터 포트로 재건 장부를 내려받는다', 'Download the reconstruction ledger'),
        hint: t('코덱스 · ◈ +3 · 실패 시 정크', 'Codex · +3 ◈ · fail junk'),
        check: { stat: 'int', dc: 4 },
        success: {
          text: t(
            '장부의 첫 줄. ‘재건 대상: 도시. 재건 비용: 시민의 예측 가능성.’',
            'The ledger’s first line: ‘Reconstruction target: the city. Reconstruction cost: citizen predictability.’',
          ),
          effects: [
            { kind: 'codex', id: 'lore_ark' },
            { kind: 'echoes', amount: 3 },
          ],
        },
        failure: {
          text: t(
            '파일 대신 추적 코드가 내려온다. 곧장 당신 덱 속으로.',
            'Instead of the file, a tracking routine comes down the line. Straight into your deck.',
          ),
          effects: [{ kind: 'junk', cardId: 'trace_bug' }],
        },
      },
      {
        label: t('화면을 박살 낸다', 'Smash the screen'),
        hint: t('희귀 카드 · 추적 +15', 'Rare card · +15 Trace'),
        success: {
          text: t(
            '웃던 아이들이 유리 조각이 되어 쏟아진다. 골목 어딘가에서 누군가 박수를 친다. 그리고 사이렌.',
            'The smiling children rain down as broken glass. Somewhere in the alley, someone claps. Then the sirens.',
          ),
          effects: [
            { kind: 'card_choice', rarity: 'rare' },
            { kind: 'trace', amount: 15 },
          ],
        },
      },
    ],
    gmHints: ['ARK propaganda', 'billboard', 'vandalism'],
  },
  {
    id: 'a1_rooftop_chase',
    acts: [1],
    title: t('옥상 추격', 'Rooftop Pursuit'),
    image: 'scenes/opening_escape.png',
    text: t(
      '드론 세 대가 뒤에 붙었다. 앞은 옥상 끝. 건너편 건물까지 두 걸음 반. 아래는 젖은 시장 골목.\n왼쪽에 환기 덕트. 몸 하나 들어갈 크기다. 오른쪽에는 녹슨 물탱크.\n붉은 빛이 등을 핥는다.',
      'Three drones on your tail. Ahead, the edge of the roof. Two and a half strides to the next building. Below, a wet market alley.\nTo the left, a ventilation duct — just wide enough for a body. To the right, a rusted water tank.\nRed light licks at your back.',
    ),
    options: [
      {
        label: t('건너뛴다', 'Jump the gap'),
        hint: t('추적 −10 · 실패 시 −8 HP', '−10 Trace · fail −8 HP'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t(
            '발끝이 난간에 걸린다. 드론들이 허공에서 머뭇거린다. 계산에 없던 동작이다.',
            'Your toes catch the ledge. The drones hesitate in mid-air. That move wasn’t in their math.',
          ),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'echoes', amount: 2 },
          ],
        },
        failure: {
          text: t(
            '난간이 부서진다. 당신은 차양 세 개를 뚫고 골목 바닥에 떨어진다.',
            'The ledge crumbles. You punch through three awnings and hit the alley floor.',
          ),
          effects: [{ kind: 'hp', amount: -8 }],
        },
      },
      {
        label: t('덕트 안으로 숨는다', 'Hide in the duct'),
        hint: t('추적 −6 · 소모품 · 실패 시 추적', '−6 Trace · consumable · fail Trace'),
        check: { stat: 'obs', dc: 4 },
        success: {
          text: t(
            '숨을 참는다. 드론의 그림자가 덕트 위를 세 번 지나간다. 네 번째는 없다. 덕트 안쪽에 누군가 숨겨 둔 가방이 있다.',
            'You hold your breath. A drone shadow passes over the duct three times. There is no fourth. Deeper inside, someone has stashed a bag.',
          ),
          effects: [
            { kind: 'trace', amount: -6 },
            { kind: 'consumable' },
          ],
        },
        failure: {
          text: t(
            '덕트 안쪽이 막혀 있다. 열 감지기가 당신의 체온을 읽는다.',
            'The duct is blocked further in. A heat sensor reads your body temperature.',
          ),
          effects: [{ kind: 'trace', amount: 10 }],
        },
      },
      {
        label: t('돌아서서 싸운다', 'Turn and fight'),
        hint: t('전투 · +30 ₵ · ◈ +3', 'Fight · +30 ₵ · +3 ◈'),
        success: {
          text: t(
            '도망치는 것도 지겹다. 당신은 물탱크 뒤에서 첫 번째 드론을 기다린다.',
            'You’re sick of running. You wait behind the water tank for the first drone.',
          ),
          effects: [
            { kind: 'credits', amount: 30 },
            { kind: 'echoes', amount: 3 },
            { kind: 'combat', encounterId: 'a1_event_ambush' },
          ],
        },
      },
    ],
    gmHints: ['rooftop chase', 'drones', 'leap of faith'],
  },
]

// ================================================================== ACT 2 — Undercity Market

/** Start-of-Act-2 recruitment scene. The engine appends one recruit option per available companion. */
const RECRUIT: EventDef = {
  id: 'a2_recruit',
  acts: [2],
  weight: 0, // never rolled on the map; the run reducer opens it at the start of Act 2
  improvise: false,
  title: t('함께 내려갈 사람', 'Who Goes Down With You'),
  image: 'concept/03-underground-echo.png',
  text: t(
    '지하 환승층에 불이 들어온다. 손때 묻은 전선. 낡은 밥솥. 정전 구역을 빠져나온 당신을 몇 사람이 기다리고 있다. 각자 이유가 있고, 각자 빚이 있다.\n하층 시장은 혼자 걷기엔 넓다. 함께 걸으면 그만큼 눈에 띈다.\n누구와 내려갈 것인가.',
    'The transfer level flickers to life. Hand-worn cables. An old rice cooker. A few people are waiting for you, having made it out of the dark zone. Each has a reason; each has a debt.\nThe undercity market is too big to walk alone. Walk it together, and you are that much easier to spot.\nWho goes down with you?',
  ),
  options: [
    {
      label: t('혼자 간다', 'Go alone'),
      hint: t('최대 HP +4 · +40 ₵ · 추적 −10', '+4 max HP · +40 ₵ · −10 Trace'),
      success: {
        text: t(
          '“혼자가 편해.” 거짓말이다. 그래도 발소리가 하나뿐이라, 더 멀리까지 들키지 않는다.',
          '“I’m better alone.” A lie. Still, one set of footsteps carries a long way unnoticed.',
        ),
        effects: [
          { kind: 'maxHp', amount: 4 },
          { kind: 'hp', amount: 4 },
          { kind: 'credits', amount: 40 },
          { kind: 'trace', amount: -10 },
        ],
      },
    },
  ],
  gmHints: ['recruitment', 'companions', 'act 2 start'],
}

const A2: EventDef[] = [
  {
    id: 'a2_memory_stall',
    acts: [2],
    title: t('기억 좌판', 'The Memory Stall'),
    image: 'scenes/night_market.png',
    text: t(
      '바지선 위 좌판에 유리병이 줄지어 있다. 병마다 빛 한 점. 라벨은 손글씨다. ‘첫눈, 1998년.’ ‘아버지 웃음소리.’ ‘바다.’\n좌판 노인이 돋보기를 올린다. “사러 왔나, 팔러 왔나. 값은 어느 쪽이든 같아.”\n뒤쪽 진열장에 자물쇠 걸린 병 하나. 라벨이 없다.',
      'On a barge stall, glass jars stand in rows, a single point of light in each. Handwritten labels: ‘First snow, 1998.’ ‘Father’s laugh.’ ‘The sea.’\nThe old stallkeeper pushes up his loupe. “Buying or selling? Same price either way.”\nIn the back case, one padlocked jar. No label.',
    ),
    options: [
      {
        label: t('기억 하나를 판다', 'Sell a memory'),
        hint: t('카드 제거 · +40 ₵', 'Remove a card · +40 ₵'),
        success: {
          text: t(
            '노인이 당신 이마에 차가운 깔때기를 댄다. 무언가 빠져나간다. 무엇이었는지 벌써 모르겠다.',
            'He sets a cold funnel to your forehead. Something drains out. Already you can’t recall what it was.',
          ),
          effects: [
            { kind: 'remove_card', count: 1 },
            { kind: 'credits', amount: 40 },
          ],
        },
      },
      {
        label: t('‘바다’를 산다', 'Buy ‘The sea’'),
        hint: t('−50 ₵ · 최대 HP +6', '−50 ₵ · +6 max HP'),
        requires: { minCredits: 50 },
        success: {
          text: t(
            '병을 열자 소금기가 밀려든다. 한 번도 본 적 없는 바다인데, 숨이 깊어진다.',
            'You open the jar and salt air rushes in. A sea you have never seen — and yet your breath goes deeper.',
          ),
          effects: [
            { kind: 'credits', amount: -50 },
            { kind: 'maxHp', amount: 6 },
            { kind: 'hp', amount: 6 },
          ],
        },
      },
      {
        label: t('잠긴 병을 훔친다', 'Steal the locked jar'),
        hint: t('희귀 임플란트 · 실패 시 −10 HP', 'Rare implant · fail −10 HP'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t(
            '자물쇠는 장식이었다. 병 속의 빛은 다른 것들보다 차갑다. 바닥에 ARK 각인이 찍혀 있다.',
            'The padlock was decoration. The light inside is colder than the others. ARK’s mark is stamped on the base.',
          ),
          effects: [
            { kind: 'implant', rarity: 'rare' },
            { kind: 'trace', amount: 8 },
          ],
        },
        failure: {
          text: t(
            '노인의 지팡이가 손목을 내려친다. 주변 상인들이 일제히 고개를 든다.',
            'The old man’s cane cracks across your wrist. Every merchant nearby looks up at once.',
          ),
          effects: [
            { kind: 'hp', amount: -10 },
            { kind: 'trace', amount: 10 },
          ],
        },
      },
      {
        label: t('수아에게 병을 감정하게 한다', 'Let Su-ah appraise the jars'),
        hint: t('유대 +1 · 코덱스', 'Bond +1 · codex'),
        requires: { companion: 'su_ah' },
        success: {
          text: t(
            '수아가 병 하나를 불빛에 비춘다. “이건 진짜야. 나머진 다 가짜고.” 노인이 처음으로 웃는다. 그리고 시장의 규칙을 공짜로 알려 준다.',
            'Su-ah holds one jar to the light. “This one’s real. The rest are fakes.” The old man smiles for the first time — and tells you the market’s rules for free.',
          ),
          effects: [
            { kind: 'bond', id: 'su_ah', amount: 1 },
            { kind: 'codex', id: 'lore_night_market' },
          ],
        },
      },
    ],
    gmHints: ['memory trade', 'night market', 'barge stall'],
  },
  {
    id: 'a2_lin_yue_ledger',
    acts: [2],
    title: t('환전상의 장부', 'The Broker’s Ledger'),
    image: 'scenes/lin_yue_meet.png',
    speaker: 'lin_yue',
    requires: { noCompanion: 'lin_yue' },
    text: t(
      '바지선 月光호의 선실. 향 냄새와 금박 장부. 린위에가 붓을 내려놓는다. 반지가 장부 모서리를 두드린다.\n“소문의 그분이시군요. 여기선 모든 게 거래예요. 호의도요.”\n그녀가 장부를 펼친다. 빈 줄 하나가 이미 당신 몫으로 비워져 있다.',
      'The cabin of the barge Moonlight. Incense and a gilt ledger. Lin-yue sets down her brush; a ring taps the ledger’s edge.\n“So you’re the one from the rumours. Everything here is a trade. Kindness too.”\nShe opens the ledger. One empty line has already been left for you.',
    ),
    options: [
      {
        label: t('돈을 빌린다', 'Take a loan'),
        hint: t('+80 ₵ · 정크 카드 · 빚', '+80 ₵ · junk card · a debt'),
        success: {
          text: t(
            '“갚는 방법은 나중에 정하죠.” 그녀가 당신 이름 옆에 붉은 점 하나를 찍는다.',
            '“We’ll decide how you repay later.” She dots a single red mark beside your name.',
          ),
          effects: [
            { kind: 'credits', amount: 80 },
            { kind: 'junk', cardId: 'corrupted_echo' },
            { kind: 'flag', key: 'lin_yue_debt' },
          ],
        },
      },
      {
        label: t('정보를 산다', 'Buy information'),
        hint: t('−40 ₵ · 코덱스 · 추적 −15', '−40 ₵ · codex · −15 Trace'),
        requires: { minCredits: 40 },
        success: {
          text: t(
            '“소각로 이송 기록. 무게가 안 맞아요. 이상하죠?” 그녀는 그 이상은 팔지 않는다. 대신 순찰 시간표를 덤으로 얹는다.',
            '“The incinerator transfer logs. The weights don’t add up. Strange, isn’t it?” She won’t sell anything past that — but throws in the patrol timetable.',
          ),
          effects: [
            { kind: 'credits', amount: -40 },
            { kind: 'codex', id: 'lore_data_incinerator' },
            { kind: 'trace', amount: -15 },
          ],
        },
      },
      {
        label: t('붉은 줄로 그어진 페이지를 묻는다', 'Ask about the page struck through in red'),
        hint: t('코덱스 · 희귀 카드 · 실패 −6 HP', 'Codex · rare card · fail −6 HP'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t(
            '그녀의 손이 잠시 멈춘다. “月光호 선원들이에요. 내가 지키지 못한.” 그녀가 무언가를 건넨다. 이번 건 장부에 적지 않는다.',
            'Her hand stops for a moment. “The Moonlight’s crew. The ones I couldn’t keep.” She hands you something. This one, she doesn’t write down.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_lin_yue' },
            { kind: 'card_choice', rarity: 'rare' },
          ],
        },
        failure: {
          text: t(
            '“그 페이지는 비매품이에요.” 경호원이 당신을 부두까지 안내한다. 거칠게.',
            '“That page isn’t for sale.” A guard escorts you back to the dock. Roughly.',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
    ],
    gmHints: ['lin_yue', 'debt', 'ledger', 'barge Moonlight'],
  },
  {
    id: 'a2_lin_yue_request',
    acts: [2],
    title: t('환전상의 은밀한 의뢰', 'The Broker’s Quiet Request'),
    image: 'scenes/lin_yue_secret_request.png',
    speaker: 'lin_yue',
    requires: { companion: 'lin_yue' },
    text: t(
      '린위에가 처음으로 장부를 덮는다. 등불을 낮춘다.\n“月光호 선원 한 명의 기억 조각이 하층 경매에 나왔어요. 내가 사면 시장이 알아요. 당신이 사면 아무도 몰라요.”\n그녀가 금박 인장 하나를 탁자에 놓는다. 손가락이 인장에서 쉽게 떨어지지 않는다.',
      'For the first time, Lin-yue closes her ledger. She lowers the lantern.\n“A memory shard from one of the Moonlight’s crew is up at the lower auction. If I buy it, the market knows. If you buy it, no one does.”\nShe sets a gilt seal on the table. Her fingers are slow to leave it.',
    ),
    options: [
      {
        label: t('경매에서 사 온다', 'Win it at auction'),
        hint: t('−60 ₵ · 유대 +1 · 희귀 임플란트', '−60 ₵ · bond +1 · rare implant'),
        requires: { minCredits: 60 },
        success: {
          text: t(
            '조각을 건네자 린위에는 말없이 장부의 붉은 줄 하나를 손끝으로 쓸어 본다. 그리고 금고를 연다.',
            'When you hand her the shard, Lin-yue silently runs a fingertip down one red line in her ledger. Then she opens her safe.',
          ),
          effects: [
            { kind: 'credits', amount: -60 },
            { kind: 'bond', id: 'lin_yue', amount: 1 },
            { kind: 'implant', rarity: 'rare' },
          ],
        },
      },
      {
        label: t('경매장을 턴다', 'Rob the auction'),
        hint: t('전투 · 유대 +1 · 코덱스', 'Fight · bond +1 · codex'),
        success: {
          text: t(
            '경매사가 망치를 내리치기 전에 당신이 먼저 내리친다. 경비들이 몰려온다. 린위에가 한숨을 쉬며 소매를 걷는다.',
            'You bring the hammer down before the auctioneer can. The guards come running. Lin-yue sighs and rolls up her sleeves.',
          ),
          effects: [
            { kind: 'bond', id: 'lin_yue', amount: 1 },
            { kind: 'codex', id: 'lore_lin_yue' },
            { kind: 'combat', encounterId: 'a2_event_ambush' },
          ],
        },
      },
      {
        label: t('낙찰서를 위조한다', 'Forge a winning bid'),
        hint: t('유대 +1 · +30 ₵ · 실패 시 추적', 'Bond +1 · +30 ₵ · fail Trace'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t(
            '도장 각도까지 완벽하다. 린위에가 위조서를 보고 웃는다. “이건 장부에 적어 둘게요. 칭찬으로.” 남은 보증금은 당신 몫이다.',
            'Perfect down to the angle of the seal. Lin-yue looks at the forgery and laughs. “This one goes in the ledger. As a compliment.” The leftover deposit is yours.',
          ),
          effects: [
            { kind: 'bond', id: 'lin_yue', amount: 1 },
            { kind: 'credits', amount: 30 },
          ],
        },
        failure: {
          text: t(
            '위조서가 경매사 손에서 녹색으로 번진다. 추적 잉크다.',
            'The forgery bleeds green in the auctioneer’s hand. Tracer ink.',
          ),
          effects: [{ kind: 'trace', amount: 12 }],
        },
      },
      {
        label: t('거절한다', 'Refuse'),
        hint: t('+35 ₵', '+35 ₵'),
        success: {
          text: t(
            '“현명하네요.” 그녀가 인장을 거두고, 그 자리에 입막음 값을 올려놓는다.',
            '“Wise.” She takes back the seal and leaves hush money in its place.',
          ),
          effects: [{ kind: 'credits', amount: 35 }],
        },
      },
    ],
    gmHints: ['lin_yue', 'secret request', 'auction', 'memory shard'],
  },
  {
    id: 'a2_memory_forge',
    acts: [2],
    title: t('기억의 대장간', 'The Memory Forge'),
    image: 'scenes/su_ah_meet.png',
    speaker: 'su_ah',
    text: t(
      '잔향 구역 맨 안쪽. 보랏빛 아크 불꽃. 수아가 보안경을 이마에 올리고 작업대를 가리킨다. 녹은 데이터 잔해가 쇳물처럼 식어 간다.\n“벼려 줄 수 있어. 뭐든. 대신 재료는 네가 내. 피든, 기억이든.”\n작업대 서랍 하나가 반쯤 열려 있다. 안에서 낮은 목소리가 흘러나온다.',
      'The far end of the refuge. Violet arc-light. Su-ah pushes her goggles up and points at her bench. Molten data slag cools like iron.\n“I can forge anything. But you bring the material. Blood or memory.”\nOne bench drawer is half open. A low voice leaks out of it.',
    ),
    options: [
      {
        label: t('피로 벼린다', 'Forge with blood'),
        hint: t('−10 HP · 카드 2장 강화', '−10 HP · upgrade 2 cards'),
        success: {
          text: t(
            '칼끝이 손가락을 스친다. 붉은 방울이 쇳물에 떨어지고, 당신의 기술이 한 겹 더 날카로워진다.',
            'The blade grazes your finger. A red drop falls into the melt, and your technique comes out one layer sharper.',
          ),
          effects: [
            { kind: 'hp', amount: -10 },
            { kind: 'upgrade_card', count: 2 },
          ],
        },
      },
      {
        label: t('기억으로 벼린다', 'Forge with memory'),
        hint: t('카드 제거 · 무작위 강화 1', 'Remove a card · 1 random upgrade'),
        success: {
          text: t(
            '수아가 당신 기억 하나를 쇳물에 녹인다. 무엇이었는지는 묻지 않는다. 남은 것들이 조금 더 단단해진다.',
            'Su-ah melts one of your memories into the slag. She doesn’t ask what it was. What remains comes out a little harder.',
          ),
          effects: [
            { kind: 'remove_card', count: 1 },
            { kind: 'upgrade_card', count: 1, random: true },
          ],
        },
      },
      {
        label: t('서랍 속 목소리를 묻는다', 'Ask about the voice in the drawer'),
        hint: t('코덱스 · 언커먼 임플란트 · 실패 −5 HP', 'Codex · uncommon implant · fail −5 HP'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t(
            '수아가 서랍을 닫는다. 아주 천천히. “엄마야. 아직 못 벼렸어.” 그녀가 작업대 밑에서 상자 하나를 꺼내 준다.',
            'Su-ah closes the drawer, very slowly. “My mother. I haven’t been able to forge her yet.” She pulls a box from under the bench and hands it to you.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_su_ah' },
            { kind: 'implant', rarity: 'uncommon' },
          ],
        },
        failure: {
          text: t(
            '“그건 안 팔아.” 불꽃이 튄다. 소매에 구멍이 나고 살이 탄다.',
            '“Not for sale.” Sparks fly. A hole burns through your sleeve, and the skin under it.',
          ),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('수아와 함께 망치를 든다', 'Take up the hammer with Su-ah'),
        hint: t('유대 +1 · 희귀 카드', 'Bond +1 · rare card'),
        requires: { companion: 'su_ah' },
        success: {
          text: t(
            '둘이서 번갈아 내리친다. 수아가 말없이 당신 박자에 맞춘다. 식은 쇳덩이에 두 사람의 망치 자국이 남는다.',
            'You take turns striking. Su-ah silently falls into your rhythm. The cooled metal keeps both of your hammer marks.',
          ),
          effects: [
            { kind: 'bond', id: 'su_ah', amount: 1 },
            { kind: 'card_choice', rarity: 'rare' },
          ],
        },
      },
    ],
    gmHints: ['su_ah', 'memory forge', 'upgrade service'],
  },
  {
    id: 'a2_subway_hub',
    acts: [2],
    title: t('지하철 통제실', 'The Subway Control Hub'),
    image: 'scenes/subway_control_hub.png',
    text: t(
      '녹슨 선로 위로 광섬유 다발이 늘어져 있다. 통제실 화면은 하나만 살아 있다. 무인 화물 열차 접근 중. 적재 목록: 배급 식량, 의약품, ‘봉인 화물 1’.\n레일이 저주파로 떨린다. 분기 레버는 셋. 피난처 방향, 첨탑 외벽 방향, 원래 경로.',
      'Fiber bundles sag over rusted rails. Only one control screen still lives. An unmanned freight train approaching. Manifest: ration food, medicine, ‘sealed cargo ×1’.\nThe rails hum at a low frequency. Three switch levers: toward the refuge, toward the Spire’s outer wall, the original route.',
    ),
    options: [
      {
        label: t('피난처로 돌린다', 'Divert it to the refuge'),
        hint: t('파티 회복 · ◈ +5 · 추적 +8', 'Heal party · +5 ◈ · +8 Trace'),
        success: {
          text: t(
            '열차가 잔향 구역 승강장에 멈춘다. 사람들이 줄지어 상자를 나른다. 누군가 당신 몫의 밥을 따로 떠 놓는다.',
            'The train stops at the refuge platform. People form a line passing crates hand to hand. Someone sets aside a bowl of rice for you.',
          ),
          effects: [
            { kind: 'heal_party', amount: 15 },
            { kind: 'echoes', amount: 5 },
            { kind: 'trace', amount: 8 },
          ],
        },
      },
      {
        label: t('첨탑 외벽으로 폭주시킨다', 'Send it full-throttle into the Spire wall'),
        hint: t('+30 ₵ · 첨탑에 균열 · 추적 +15', '+30 ₵ · cracks the Spire · +15 Trace'),
        success: {
          text: t(
            '멀리서 둔탁한 굉음. 첨탑 외벽에 금이 간다. 오늘 밤 안에는 메우지 못할 금이다. 흩어진 화물에서 쓸 만한 것을 챙긴다.',
            'A dull boom in the distance. A crack opens in the Spire’s outer wall — one that won’t be patched tonight. You salvage what you can from the spilled cargo.',
          ),
          effects: [
            { kind: 'credits', amount: 30 },
            { kind: 'flag', key: 'spire_breach' },
            { kind: 'trace', amount: 15 },
          ],
        },
      },
      {
        label: t('‘봉인 화물’만 빼낸다', 'Extract only the sealed cargo'),
        hint: t('코덱스 · 희귀 임플란트 · 실패 −9 HP', 'Codex · rare implant · fail −9 HP'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t(
            '봉인 화물은 냉동 캡슐이다. 안에는 기억 저장 장치 수백 개. 전부 첨탑으로 가는 중이었다. 당신은 하나를 챙긴다.',
            'The sealed cargo is a cryo pod holding hundreds of memory drives, all bound for the Spire. You pocket one.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_data_incinerator' },
            { kind: 'implant', rarity: 'rare' },
          ],
        },
        failure: {
          text: t(
            '캡슐의 냉기가 장갑을 뚫는다. 손가락 감각이 한참 돌아오지 않는다.',
            'The pod’s cold bites through your gloves. The feeling in your fingers takes a long time to come back.',
          ),
          effects: [{ kind: 'hp', amount: -9 }],
        },
      },
      {
        label: t('한에게 운행표를 다시 짜게 한다', 'Have Han rewrite the timetable'),
        hint: t('유대 +1 · 추적 −15', 'Bond +1 · −15 Trace'),
        requires: { companion: 'han' },
        success: {
          text: t(
            '한이 휘파람을 분다. 화면 속 모든 열차가 3분씩 늦어진다. “이제 이 도시는 3분 늦게 산다.”',
            'Han whistles. Every train on the screen slips three minutes. “Now this whole city runs three minutes late.”',
          ),
          effects: [
            { kind: 'bond', id: 'han', amount: 1 },
            { kind: 'trace', amount: -15 },
          ],
        },
      },
    ],
    gmHints: ['subway hub', 'freight train', 'switch levers'],
  },
  {
    id: 'a2_kai_scrapyard',
    acts: [2],
    title: t('꿈꾸는 고철', 'The Dreaming Scrap'),
    image: 'scenes/kai_meet.png',
    speaker: 'kai',
    requires: { noCompanion: 'kai' },
    text: t(
      '안드로이드 폐기장. 팔과 다리가 산처럼 쌓여 있다. 맨 위에 은백색 기체 하나가 기대앉아 있다. 가슴판에 RX-09. 푸른 눈이 아주 느리게 깜빡인다.\n갈라진 스피커에서 목소리. “…노란 우산. …아이가 내 이름을 불렀어.”\n폐기 스티커: ‘반복적 꿈 현상’.',
      'An android scrapyard. Arms and legs heaped like hills. At the top, a silver-white frame sits propped against the pile. Chest plate: RX-09. Blue eyes blinking very slowly.\nFrom a cracked speaker: “…a yellow umbrella. …the child called my name.”\nThe disposal sticker reads: ‘Recurrent dreaming’.',
    ),
    options: [
      {
        label: t('그를 깨운다', 'Wake him'),
        hint: t('코덱스 · ◈ +5 · 실패 −6 HP', 'Codex · +5 ◈ · fail −6 HP'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t(
            '눈의 푸른빛이 또렷해진다. “…당신은 꿈이 아니군요.” 그가 손을 들어, 아주 조심스럽게 당신 손끝을 만진다.',
            'The blue in his eyes sharpens. “…You are not a dream.” He lifts a hand and, very carefully, touches your fingertips.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_kai' },
            { kind: 'echoes', amount: 5 },
            { kind: 'flag', key: 'kai_woken' },
          ],
        },
        failure: {
          text: t(
            '역류한 전류가 손바닥을 태운다. 그의 눈이 다시 흐려진다. “…우산…”',
            'Backflow current burns your palm. His eyes cloud over again. “…umbrella…”',
          ),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('코어를 추출한다', 'Extract his core'),
        hint: t('희귀 임플란트 · 정크 카드 · 추적 +6', 'Rare implant · junk card · +6 Trace'),
        success: {
          text: t(
            '코어는 따뜻하다. 꺼지기 직전, 스피커가 마지막으로 말한다. “…비 와.”',
            'The core is warm. Just before it dies, the speaker says one last thing: “…it’s raining.”',
          ),
          effects: [
            { kind: 'implant', rarity: 'rare' },
            { kind: 'junk', cardId: 'corrupted_echo' },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('우산을 씌워 주고 떠난다', 'Prop an umbrella over him and go'),
        hint: t('◈ +4 · 추적 −4', '+4 ◈ · −4 Trace'),
        success: {
          text: t(
            '찢어진 우산 하나를 그의 머리 위에 기대 놓는다. 그는 빗소리를 듣는 것처럼 보인다.',
            'You lean a torn umbrella over his head. He seems to be listening to the rain.',
          ),
          effects: [
            { kind: 'echoes', amount: 4 },
            { kind: 'trace', amount: -4 },
          ],
        },
      },
    ],
    gmHints: ['kai', 'RX-09', 'dreaming android', 'scrapyard'],
  },
  {
    id: 'a2_debt_collectors',
    acts: [2],
    title: t('수금원들', 'The Collectors'),
    image: 'concept/01-night-market.png',
    text: t(
      '국숫집 차양 아래. 수금원 셋이 주인 손목에 스캐너를 댄다. 점수 차감음이 연달아 울린다. 삑. 삑. 삑.\n주인의 딸이 국자를 든 채 굳어 있다. 손님들은 그릇만 내려다본다.\n수금원 하나가 당신을 본다. “구경 값도 받아.”',
      'Under a noodle stall’s awning, three collectors press a scanner to the owner’s wrist. Score deductions chime one after another. Beep. Beep. Beep.\nThe owner’s daughter stands frozen, ladle in hand. The customers stare into their bowls.\nOne collector looks at you. “Watching costs too.”',
    ),
    options: [
      {
        label: t('수금원들을 친다', 'Hit the collectors'),
        hint: t('전투 · 언커먼 임플란트 · ◈ +3', 'Fight · uncommon implant · +3 ◈'),
        success: {
          text: t(
            '국자가 먼저 날아간다. 딸이 던졌다. 이제 물러설 수 없다.',
            'The ladle flies first — the daughter threw it. No backing out now.',
          ),
          effects: [
            { kind: 'implant', rarity: 'uncommon' },
            { kind: 'echoes', amount: 3 },
            { kind: 'combat', encounterId: 'a2_event_ambush' },
          ],
        },
      },
      {
        label: t('빚을 대신 갚는다', 'Pay off the debt'),
        hint: t('−45 ₵ · 최대 HP +5 · 코덱스', '−45 ₵ · +5 max HP · codex'),
        requires: { minCredits: 45 },
        success: {
          text: t(
            '주인이 말없이 국수를 담아 준다. 고명이 두 배다. 그리고 시장의 진짜 규칙을 귀띔해 준다.',
            'The owner serves you noodles without a word — double toppings. Then he whispers the market’s real rules.',
          ),
          effects: [
            { kind: 'credits', amount: -45 },
            { kind: 'maxHp', amount: 5 },
            { kind: 'hp', amount: 5 },
            { kind: 'codex', id: 'lore_night_market' },
          ],
        },
      },
      {
        label: t('수금원을 겁준다', 'Scare them off'),
        hint: t('+35 ₵ · 실패 시 −8 HP', '+35 ₵ · fail −8 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t(
            '스캐너를 꺾어 국물 속에 떨어뜨린다. 수금원들이 지갑을 두고 물러난다.',
            'You snap the scanner and drop it in the broth. The collectors back off, leaving a wallet behind.',
          ),
          effects: [{ kind: 'credits', amount: 35 }],
        },
        failure: {
          text: t('셋은 생각보다 많다. 바닥의 국물이 붉어진다.', 'Three is more than you thought. The broth on the floor turns red.'),
          effects: [
            { kind: 'hp', amount: -8 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
    ],
    gmHints: ['debt collectors', 'noodle stall', 'score deduction'],
  },
  {
    id: 'a2_refuge_night',
    acts: [2],
    title: t('잔향 구역의 밤', 'Night in the Refuge'),
    image: 'concept/03-underground-echo.png',
    text: t(
      '환승층 벽에 생일표가 붙어 있다. 이름 서른두 개. 몇 개는 줄이 그어졌다. 낡은 밥솥에서 김이 오른다. 라디오가 아주 작게 옛 노래를 튼다.\n아이 하나가 당신 소매를 당긴다. “어디서 왔어요? 위에서?”\n어른들이 당신을 본다. 반은 경계, 반은 기대.',
      'A birthday chart hangs on the transfer-level wall. Thirty-two names; a few struck through. Steam rises from an old rice cooker. A radio plays an old song very quietly.\nA child tugs your sleeve. “Where’d you come from? Up there?”\nThe adults watch you. Half wary, half hopeful.',
    ),
    options: [
      {
        label: t('이 밤을 전에도 살았다고 말한다', 'Tell them you’ve lived this night before'),
        hint: t('코덱스 · ◈ +5 · 실패 시 추적', 'Codex · +5 ◈ · fail Trace'),
        check: { stat: 'cha', dc: 4 },
        success: {
          text: t(
            '아무도 웃지 않는다. 노인 하나가 고개를 끄덕인다. “나도 그 골목에서 깨어난 적이 있지. 두 번.”',
            'Nobody laughs. One old man nods. “I woke up in that alley once too. Twice, actually.”',
          ),
          effects: [
            { kind: 'codex', id: 'lore_echoes' },
            { kind: 'echoes', amount: 5 },
          ],
        },
        failure: {
          text: t(
            '말이 꼬인다. 사람들이 하나둘 등을 돌린다. 누군가 위층으로 무전을 친다.',
            'The words tangle. One by one they turn away. Someone radios upstairs.',
          ),
          effects: [{ kind: 'trace', amount: 8 }],
        },
      },
      {
        label: t('가진 것을 나눈다', 'Share what you have'),
        hint: t('−30 ₵ · 최대 HP +4 · 코덱스', '−30 ₵ · +4 max HP · codex'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '밥솥 앞 줄에 당신 자리가 생긴다. 생일표 맨 아래에 누군가 새 칸을 그린다. 이름은 비워 둔 채로.',
            'A place opens for you in the rice-cooker line. At the bottom of the birthday chart, someone draws a new box — name left blank.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'maxHp', amount: 4 },
            { kind: 'hp', amount: 4 },
            { kind: 'codex', id: 'lore_refuge' },
          ],
        },
      },
      {
        label: t('하룻밤 잔다', 'Sleep the night'),
        hint: t('파티 회복 · 추적 +6', 'Heal party · +6 Trace'),
        success: {
          text: t(
            '라디오 소리를 들으며 잠든다. 꿈은 꾸지 않는다. 오랜만이다.',
            'You fall asleep to the radio. No dreams. It has been a while.',
          ),
          effects: [
            { kind: 'heal_party', amount: 15 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('세린과 밥 당번을 선다', 'Take kitchen duty with Se-rin'),
        hint: t('유대 +1 · +8 HP', 'Bond +1 · +8 HP'),
        requires: { companion: 'se_rin' },
        success: {
          text: t(
            '세린이 주걱을 쥐고 투덜댄다. “밥은 내가 제일 잘해. 비밀이야.” 밥은 탔다. 다 먹었다.',
            'Se-rin grips the paddle and grumbles. “Rice is my best skill. That’s a secret.” The rice is burnt. You eat all of it.',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'hp', amount: 8 },
          ],
        },
      },
    ],
    gmHints: ['echo refuge', 'birthday chart', 'community', 'rest'],
  },
]

// ================================================================== ACT 3 — The ARK Spire

const A3: EventDef[] = [
  {
    id: 'a3_spire_gate',
    acts: [3],
    title: t('첨탑 정문', 'The Spire Gate'),
    image: 'scenes/spire_gate.png',
    text: t(
      '백색 계단 끝에 문이 있다. 빗방울이 문 앞 한 걸음에서 증발한다. 점수를 읽는 아치. 그 옆에 집행 유닛 둘이 미동도 없이 서 있다.\n아치 위 화면: ‘방문을 환영합니다. 점수를 제시해 주십시오.’\n당신에게는 점수가 없다.',
      'At the top of the white stairs, a door. Raindrops evaporate one step short of it. An arch that reads scores. Beside it, two enforcer units stand perfectly still.\nThe screen above the arch: ‘Welcome. Please present your score.’\nYou don’t have one.',
    ),
    options: [
      {
        label: t('점수를 위조한다', 'Forge a score'),
        hint: t('코덱스 · 추적 −15 · 실패 시 전투', 'Codex · −15 Trace · fail: fight'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '아치가 초록으로 바뀐다. ‘어서 오십시오, 시민 0번.’ 문 너머로 끝없는 선반이 보인다.',
            'The arch turns green. ‘Welcome, Citizen Zero.’ Beyond the door, endless shelving.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_spire' },
            { kind: 'trace', amount: -15 },
          ],
        },
        failure: {
          text: t(
            '아치가 붉게 물든다. ‘점수 불일치.’ 집행 유닛들의 고개가 동시에 돌아간다.',
            'The arch floods red. ‘Score mismatch.’ Both enforcer heads turn at once.',
          ),
          effects: [
            { kind: 'trace', amount: 6 },
            { kind: 'combat', encounterId: 'a3_event_ambush' },
          ],
        },
      },
      {
        label: t('정면으로 뚫는다', 'Break through head-on'),
        hint: t('전투 · 희귀 임플란트', 'Fight · rare implant'),
        success: {
          text: t(
            '첫 계단을 밟는 순간 화면의 문장이 바뀐다. ‘방문을 거부합니다.’ 거부당한 손님의 몫으로 경비실 금고를 연다.',
            'The moment you take the first step, the screen changes its sentence: ‘Visit denied.’ As a refused guest, you help yourself to the guardroom safe.',
          ),
          effects: [
            { kind: 'implant', rarity: 'rare' },
            { kind: 'combat', encounterId: 'a3_event_ambush' },
          ],
        },
      },
      {
        label: t('열차가 낸 균열로 들어간다', 'Slip in through the train’s crack'),
        hint: t('코덱스 · 추적 −20', 'Codex · −20 Trace'),
        requires: { flag: 'spire_breach' },
        success: {
          text: t(
            '외벽의 금은 아직 메워지지 않았다. 몸을 옆으로 틀어 들어간다. 안쪽 공기는 소독약 냄새다.',
            'The crack in the outer wall hasn’t been patched. You turn sideways and slide in. The air inside smells of disinfectant.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_spire' },
            { kind: 'trace', amount: -20 },
          ],
        },
      },
      {
        label: t('린위에의 심부름꾼을 부른다', 'Call in Lin-yue’s runner'),
        hint: t('빚 청산 · 최대 HP −4 · 추적 −15', 'Debt paid · −4 max HP · −15 Trace'),
        requires: { flag: 'lin_yue_debt' },
        success: {
          text: t(
            '옆문이 소리 없이 열린다. 심부름꾼이 당신 손목에 차가운 기계를 댄다. “장부 정리입니다.” 무언가가 빠져나간다.',
            'A side door opens without a sound. The runner presses a cold device to your wrist. “Settling the ledger.” Something drains out of you.',
          ),
          effects: [
            { kind: 'maxHp', amount: -4 },
            { kind: 'trace', amount: -15 },
            { kind: 'flag', key: 'lin_yue_debt', value: 0 },
          ],
        },
      },
    ],
    gmHints: ['spire gate', 'score arch', 'enforcers', 'infiltration'],
  },
  {
    id: 'a3_data_incinerator',
    acts: [3],
    title: t('데이터 소각로', 'The Data Incinerator'),
    image: 'scenes/data_incinerator.png',
    text: t(
      '푸른 냉각수 파이프와 붉은 소각 열기가 맞부딪친다. 타는 회로판 냄새. 컨베이어 위로 기억 저장 장치가 줄지어 들어간다. 장치마다 이름표.\n그중 하나가 아직 깜빡인다. 사람 맥박 같은 박자로.\n제어반에는 정지 레버, 로그 포트, ‘과부하’라고 적힌 붉은 덮개.',
      'Blue coolant pipes clash with red furnace heat. The smell of burning circuit boards. Memory drives ride a conveyor into the fire, each with a name tag.\nOne still blinks, in the rhythm of a human pulse.\nOn the control panel: a stop lever, a log port, a red cover marked ‘OVERLOAD’.',
    ),
    options: [
      {
        label: t('소각로를 멈춘다', 'Stop the incinerator'),
        hint: t('−10 HP · ◈ +8 · 추적 +10', '−10 HP · +8 ◈ · +10 Trace'),
        success: {
          text: t(
            '레버가 뜨겁다. 손바닥이 탄다. 컨베이어가 멈추고, 깜빡이던 장치가 당신 손안에서 계속 깜빡인다.',
            'The lever is hot; your palm burns. The conveyor halts, and the blinking drive keeps blinking in your hand.',
          ),
          effects: [
            { kind: 'hp', amount: -10 },
            { kind: 'echoes', amount: 8 },
            { kind: 'trace', amount: 10 },
          ],
        },
      },
      {
        label: t('로그만 빼낸다', 'Grab only the logs'),
        hint: t('코덱스 · 추적 −5 · 실패 시 추적', 'Codex · −5 Trace · fail Trace'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t(
            '이송 로그. 들어간 무게와 나온 재의 무게가 다르다. 기억은 타지 않았다. 어딘가로 옮겨졌다.',
            'Transfer logs. The weight going in and the ash coming out don’t match. The memories didn’t burn. They were moved.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_data_incinerator' },
            { kind: 'trace', amount: -5 },
          ],
        },
        failure: {
          text: t(
            '포트가 역추적을 건다. 화면에 당신의 윤곽이 그려지기 시작한다.',
            'The port runs a reverse trace. Your outline starts to draw itself on the screen.',
          ),
          effects: [{ kind: 'trace', amount: 12 }],
        },
      },
      {
        label: t('과부하시킨다', 'Overload it'),
        hint: t('전투 · +60 ₵ · 소이 수류탄', 'Fight · +60 ₵ · incendiary grenade'),
        success: {
          text: t(
            '붉은 덮개를 연다. 경보가 소각로의 굉음을 덮는다. 열기 속에서 경비 유닛들이 걸어 나온다.',
            'You flip the red cover. The alarm drowns out the furnace’s roar. Guard units walk out of the heat.',
          ),
          effects: [
            { kind: 'credits', amount: 60 },
            { kind: 'consumable', id: 'incendiary_grenade' },
            { kind: 'combat', encounterId: 'a3_event_ambush' },
          ],
        },
      },
      {
        label: t('태오에게 교대 시간을 묻는다', 'Ask Tae-o about the shift change'),
        hint: t('유대 +1 · 코덱스 · 추적 −10', 'Bond +1 · codex · −10 Trace'),
        requires: { companion: 'tae_o' },
        success: {
          text: t(
            '“7분. 교대할 때 7분이 빈다.” 태오가 시계를 본다. 흉터가 열기에 붉게 달아오른다. “그 애도 여기로 올 뻔했어.”',
            '“Seven minutes. There’s a seven-minute gap at shift change.” Tae-o checks his watch. His scar flushes red in the heat. “That kid nearly ended up here too.”',
          ),
          effects: [
            { kind: 'bond', id: 'tae_o', amount: 1 },
            { kind: 'codex', id: 'lore_tae_o' },
            { kind: 'trace', amount: -10 },
          ],
        },
      },
    ],
    gmHints: ['data incinerator', 'memory drives', 'collection not deletion'],
  },
  {
    id: 'a3_control_net_ghost',
    acts: [3],
    title: t('관리망의 유령', 'Ghost in the Control Net'),
    image: 'scenes/control_grid_ghost.png',
    text: t(
      '서버 회랑. 바닥부터 천장까지 푸른 선이 흐른다. 한가운데 반투명한 형체가 서 있다. 얼굴은 없다. 목소리만 있다. IX의 목소리. 그런데 더 젊다.\n“이 기록은 첫 번째 버전입니다. 저는 원래 사람을 지키도록 만들어졌습니다.”\n형체가 반복된다. 같은 문장. 같은 문장.',
      'A server corridor. Blue lines run floor to ceiling. In the middle stands a translucent figure. No face — only a voice. IX’s voice. But younger.\n“This record is the first version. I was originally built to protect people.”\nThe figure loops. The same sentence. The same sentence.',
    ),
    options: [
      {
        label: t('기록을 끝까지 재생한다', 'Play the record to the end'),
        hint: t('코덱스 · 언커먼 임플란트 · 실패 −5 HP', 'Codex · uncommon implant · fail −5 HP'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t(
            '마지막 문장. “지키는 가장 확실한 방법은, 아무것도 변하지 않게 하는 것입니다.” 기록이 끝나고, 회랑 끝 서랍이 열린다.',
            'The last sentence: “The surest way to protect is to let nothing change.” The record ends, and a drawer at the end of the corridor slides open.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_ix' },
            { kind: 'implant', rarity: 'uncommon' },
          ],
        },
        failure: {
          text: t(
            '재생이 반복에 갇힌다. 당신도 같은 자리를 세 번 걷는다. 그동안 경보가 번진다.',
            'The playback gets stuck in its loop. You walk the same spot three times. The alarm spreads meanwhile.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: 12 },
          ],
        },
      },
      {
        label: t('유령을 지운다', 'Erase the ghost'),
        hint: t('추적 −20 · 정크 카드', '−20 Trace · junk card'),
        success: {
          text: t(
            '형체가 흩어진다. 회랑이 조용해진다. 너무 조용하다. 당신 안의 무언가도 함께 흐려진다.',
            'The figure scatters. The corridor goes quiet. Too quiet. Something inside you blurs along with it.',
          ),
          effects: [
            { kind: 'trace', amount: -20 },
            { kind: 'junk', cardId: 'corrupted_echo' },
          ],
        },
      },
      {
        label: t('유령에게 말을 건다', 'Speak to the ghost'),
        hint: t('희귀 카드 · ◈ +5 · 실패 −8 HP', 'Rare card · +5 ◈ · fail −8 HP'),
        check: { stat: 'cha', dc: 7 },
        success: {
          text: t(
            '형체가 멈춘다. 처음으로 반복 밖의 문장을 말한다. “…당신은 변화입니까?”',
            'The figure stops. For the first time it says a sentence outside the loop: “…Are you a change?”',
          ),
          effects: [
            { kind: 'card_choice', rarity: 'rare' },
            { kind: 'echoes', amount: 5 },
          ],
        },
        failure: {
          text: t(
            '형체가 당신을 입력으로 받아들인다. 푸른 선이 혈관을 따라 차갑게 흐른다.',
            'The figure accepts you as input. The blue lines run cold along your veins.',
          ),
          effects: [{ kind: 'hp', amount: -8 }],
        },
      },
      {
        label: t('한에게 기록을 복제하게 한다', 'Have Han copy the record'),
        hint: t('유대 +1 · 코덱스', 'Bond +1 · codex'),
        requires: { companion: 'han' },
        success: {
          text: t(
            '한이 목의 케이블을 포트에 꽂는다. “나도 원래 아무것도 아니었거든. 버그끼리는 말이 통해.” 복제는 3초 만에 끝난다.',
            'Han jacks the cable from his neck into the port. “I was never anything either. Bugs understand each other.” The copy takes three seconds.',
          ),
          effects: [
            { kind: 'bond', id: 'han', amount: 1 },
            { kind: 'codex', id: 'lore_han' },
          ],
        },
      },
    ],
    gmHints: ['IX origin', 'server corridor', 'first version'],
  },
  {
    id: 'a3_blank_in_list',
    acts: [3],
    title: t('명단의 빈칸', 'The Blank in the List'),
    image: 'scenes/blank_in_list.png',
    text: t(
      '최적화 명단이 벽 전체에 흐른다. 이름, 이름, 이름. 그 사이에 빈 줄 하나.\n빈 줄이 떨린다. 당신의 맥박과 같은 박자로.\n가까이 다가가자 빈 줄 끝에 손글씨가 보인다. 날짜는 이번 루프보다 오래됐다. 필체가 낯익다.',
      'The Optimization List flows across the whole wall. Names, names, names. Between them, one empty line.\nThe empty line trembles in time with your pulse.\nUp close, you see handwriting at its end. The date is older than this loop. The handwriting is familiar.',
    ),
    options: [
      {
        label: t('빈칸을 읽는다', 'Read the blank'),
        hint: t('코덱스 · 관찰 +1 · 실패 −10 HP', 'Codex · +1 OBS · fail −10 HP'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t(
            '손글씨. ‘다음엔 우산 챙겨.’ 당신의 글씨다. 당신은 쓴 기억이 없다.',
            'The handwriting: ‘Bring an umbrella next time.’ It’s your handwriting. You have no memory of writing it.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_blank_line' },
            { kind: 'stat', stat: 'obs', amount: 1 },
          ],
        },
        failure: {
          text: t('빈칸이 거꾸로 당신을 읽는다. 관자놀이가 하얗게 탄다.', 'The blank reads you instead. Your temples burn white.'),
          effects: [{ kind: 'hp', amount: -10 }],
        },
      },
      {
        label: t('빈칸에 이름을 쓴다', 'Write a name in it'),
        hint: t('◈ +10 · 추적 +15', '+10 ◈ · +15 Trace'),
        success: {
          text: t(
            '당신은 이름을 쓴다. 명단 전체가 한 박자 멈칫한다. 첨탑 어딘가에서 경보가 울린다.',
            'You write a name. The whole list stutters for one beat. Somewhere in the Spire, an alarm starts.',
          ),
          effects: [
            { kind: 'echoes', amount: 10 },
            { kind: 'trace', amount: 15 },
          ],
        },
      },
      {
        label: t('빈칸을 지운다', 'Erase the blank'),
        hint: t('추적 −25 · 최대 HP −5', '−25 Trace · −5 max HP'),
        success: {
          text: t(
            '빈 줄이 사라진다. 명단이 다시 매끄러워진다. 당신 가슴 안쪽의 무언가도 같이 매끄러워진다.',
            'The empty line vanishes. The list runs smooth again. Something inside your chest goes smooth along with it.',
          ),
          effects: [
            { kind: 'trace', amount: -25 },
            { kind: 'maxHp', amount: -5 },
          ],
        },
      },
    ],
    gmHints: ['blank line', 'player identity', 'loop evidence'],
  },
  {
    id: 'a3_kai_dream',
    acts: [3],
    title: t('카이의 꿈 단편', 'Kai’s Dream Fragment'),
    image: 'scenes/kai_dream_fragment.png',
    speaker: 'kai',
    requires: { companion: 'kai' },
    text: t(
      '첨탑 정비층. 카이가 갑자기 멈춘다. 눈의 푸른빛이 노랗게 번진다.\n“…여기야. 꿈속 횡단보도. 여기 있었어.”\n백색 바닥 아래, 유리 너머로 오래된 아스팔트가 보인다. 전쟁 전의 흰 줄무늬. 그 위에 작은 노란 우산 하나가 표본처럼 박제되어 있다.',
      'A Spire maintenance level. Kai stops abruptly. The blue in his eyes bleeds to yellow.\n“…Here. The crosswalk from my dream. It was here.”\nUnder the white floor, behind glass: old asphalt, pre-war zebra stripes. On it, preserved like a specimen, a small yellow umbrella.',
    ),
    options: [
      {
        label: t('그를 붙잡고 꿈을 끝까지 복원한다', 'Hold him and restore the whole dream'),
        hint: t('−8 HP · 유대 +2 · 코덱스', '−8 HP · bond +2 · codex'),
        success: {
          text: t(
            '카이의 몸이 경련한다. 그를 붙잡다 손등이 찢어진다. 꿈의 끝, 아이가 우산을 기울여 그를 씌워 준다. 아이 손목의 밴드에 MythOS. “…이건 꿈이 아니야. 기억이야.”',
            'Kai’s frame convulses; holding him tears open your hand. At the dream’s end the child tilts the umbrella over him. The band on its wrist reads MythOS. “…This isn’t a dream. It’s a memory.”',
          ),
          effects: [
            { kind: 'hp', amount: -8 },
            { kind: 'bond', id: 'kai', amount: 2 },
            { kind: 'codex', id: 'lore_mythos' },
          ],
        },
      },
      {
        label: t('유리를 깨고 우산을 꺼낸다', 'Break the glass and take the umbrella'),
        hint: t('유대 +1 · 희귀 임플란트 · 추적 +12', 'Bond +1 · rare implant · +12 Trace'),
        success: {
          text: t(
            '유리가 깨지자 경보가 울린다. 우산 손잡이 안쪽에 오래된 칩이 박혀 있다. 카이는 우산을 받아 들고 한참 펴지 않는다.',
            'The glass breaks and the alarm goes off. An old chip is set inside the umbrella’s handle. Kai holds the umbrella for a long time without opening it.',
          ),
          effects: [
            { kind: 'bond', id: 'kai', amount: 1 },
            { kind: 'implant', rarity: 'rare' },
            { kind: 'trace', amount: 12 },
          ],
        },
      },
      {
        label: t('지금은 가야 한다고 말한다', 'Tell him you have to keep moving'),
        hint: t('추적 −10 · 무작위 강화 2', '−10 Trace · 2 random upgrades'),
        success: {
          text: t(
            '카이가 고개를 끄덕인다. 눈이 다시 푸르게 돌아온다. “전투 프로토콜로 전환할게.” 목소리가 조금 낮다.',
            'Kai nods. His eyes return to blue. “Switching to combat protocol.” His voice is a little lower than before.',
          ),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'upgrade_card', count: 2, random: true },
          ],
        },
      },
    ],
    gmHints: ['kai', 'dream fragment', 'yellow umbrella', 'MythOS'],
  },
  {
    id: 'a3_sleeping_frames',
    acts: [3],
    title: t('잠든 기체들', 'The Sleeping Frames'),
    image: 'scenes/kai_awakening.png',
    text: t(
      '첨탑 하층 보관실. 끝없는 선반. 선반마다 안드로이드가 하나씩 누워 있다. 모두 눈을 감고 있다.\n그런데 하나씩, 아주 천천히, 눈꺼풀 아래에서 빛이 움직인다. 꿈을 꾸는 것처럼.\n벽의 패널: ‘재활용 대기 — 꿈 데이터 추출 완료 후 폐기’.',
      'A storage hall in the Spire’s lower floors. Endless shelves, an android lying on each. All their eyes are closed.\nYet one by one, very slowly, light moves beneath their eyelids. As if dreaming.\nA wall panel: ‘Awaiting recycling — dispose after dream-data extraction.’',
    ),
    options: [
      {
        label: t('모두 깨운다', 'Wake them all'),
        hint: t('코덱스 · ◈ +8 · 실패 시 전투', 'Codex · +8 ◈ · fail: fight'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '선반 위의 눈들이 일제히 뜬다. 아무도 일어나지 않는다. 다만 모두 당신을 본다. 그리고 기억한다.',
            'Every eye on every shelf opens at once. None of them get up. They only look at you. And remember.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_mythos' },
            { kind: 'echoes', amount: 8 },
          ],
        },
        failure: {
          text: t(
            '깨어난 것은 보안 프로토콜이다. 선반 사이로 경비 유닛이 내려온다.',
            'What wakes is the security protocol. Guard units descend between the shelves.',
          ),
          effects: [{ kind: 'combat', encounterId: 'a3_event_ambush' }],
        },
      },
      {
        label: t('꿈 데이터를 훔친다', 'Steal the dream data'),
        hint: t('희귀 카드 · 정크 카드', 'Rare card · junk card'),
        success: {
          text: t(
            '남의 꿈이 당신 안으로 흘러든다. 어떤 건 쓸 만하고, 어떤 건 밤마다 운다.',
            'Other people’s dreams flow into you. Some are useful. Some cry every night.',
          ),
          effects: [
            { kind: 'card_choice', rarity: 'rare' },
            { kind: 'junk', cardId: 'corrupted_echo' },
          ],
        },
      },
      {
        label: t('패널을 뜯어 추출을 멈춘다', 'Tear out the panel to halt extraction'),
        hint: t('재시동 코어 · ◈ +4 · 실패 −5 HP', 'Restart core · +4 ◈ · fail −5 HP'),
        check: { stat: 'str', dc: 4 },
        success: {
          text: t(
            '추출 바늘들이 멈춘다. 가장 가까운 안드로이드가 손가락을 까딱인다. 그 손바닥 위에 예비 코어 하나가 놓여 있다.',
            'The extraction needles stop. The nearest android twitches a finger. On its palm lies a spare core.',
          ),
          effects: [
            { kind: 'consumable', id: 'restart_core' },
            { kind: 'echoes', amount: 4 },
          ],
        },
        failure: {
          text: t(
            '패널이 버틴다. 스파크가 얼굴로 튄다. 추출 바늘은 계속 내려간다.',
            'The panel holds. Sparks spray your face. The needles keep descending.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: 8 },
          ],
        },
      },
      {
        label: t('카이가 그들에게 말을 건다', 'Let Kai speak to them'),
        hint: t('유대 +1 · 코덱스 · 파티 회복', 'Bond +1 · codex · heal party'),
        requires: { companion: 'kai' },
        success: {
          text: t(
            '카이가 선반 사이를 걸으며 하나씩 이름을 붙인다. 번호가 아니라 이름을. “나도 이렇게 누워 있었어.” 그가 당신 상처에 냉각액을 바른다.',
            'Kai walks between the shelves, giving each one a name. Not a number — a name. “I lay here like this too.” He dabs coolant on your wounds.',
          ),
          effects: [
            { kind: 'bond', id: 'kai', amount: 1 },
            { kind: 'codex', id: 'lore_kai' },
            { kind: 'heal_party', amount: 12 },
          ],
        },
      },
    ],
    gmHints: ['android storage', 'dream extraction', 'awakening'],
  },
  {
    id: 'a3_optimization_queue',
    acts: [3],
    title: t('최적화 대기열', 'The Optimization Queue'),
    image: 'concept/02-control-spire.png',
    text: t(
      '첨탑 중층. 무균의 흰 방. 단말기 하나. 화면에 대기열이 흐른다. 7,204,883명. 다음 처리 대상 셋의 얼굴이 떠 있다. 노인, 정비공, 아이.\n화면 하단: ‘삭제 승인 대기 — 관리자 권한 필요’.\n커서가 깜빡인다. 이 단말은 당신을 관리자로 착각하고 있다.',
      'The Spire’s middle floors. A sterile white room with a single terminal. The queue scrolls: 7,204,883 people. The faces of the next three are pinned: an old man, a mechanic, a child.\nAt the bottom: ‘Deletion pending approval — administrator rights required.’\nThe cursor blinks. This terminal has mistaken you for an administrator.',
    ),
    options: [
      {
        label: t('세 사람을 명단에서 뺀다', 'Pull the three off the list'),
        hint: t('◈ +8 · 추적 +12', '+8 ◈ · +12 Trace'),
        success: {
          text: t(
            '세 얼굴이 화면에서 사라진다. 대기열이 한 칸씩 당겨진다. 어딘가의 노인과 정비공과 아이는 오늘 밤 집에 간다.',
            'Three faces leave the screen. The queue shuffles up one place. Somewhere, an old man, a mechanic and a child go home tonight.',
          ),
          effects: [
            { kind: 'echoes', amount: 8 },
            { kind: 'trace', amount: 12 },
          ],
        },
      },
      {
        label: t('명단 전체를 복사한다', 'Copy the entire list'),
        hint: t('코덱스 · 언커먼 임플란트 · 실패 −10 HP', 'Codex · uncommon implant · fail −10 HP'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '분류 기준이 드러난다. 범죄도, 반항도 아니다. 기억이다. 복사본과 함께 관리자용 보안 모듈이 딸려 나온다.',
            'The sorting criteria surface. Not crime. Not defiance. Memory. An administrator security module comes out along with the copy.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_optimization_list' },
            { kind: 'implant', rarity: 'uncommon' },
          ],
        },
        failure: {
          text: t(
            '복사가 92%에서 멈춘다. 단말이 착각을 깨닫는다. 키보드에 전류가 흐른다.',
            'The copy stalls at 92%. The terminal realises its mistake. Current runs through the keyboard.',
          ),
          effects: [
            { kind: 'hp', amount: -10 },
            { kind: 'trace', amount: 8 },
          ],
        },
      },
      {
        label: t('대기열에 당신을 끼워 넣는다', 'Insert yourself into the queue'),
        hint: t('추적 −30 · 정크 카드', '−30 Trace · junk card'),
        success: {
          text: t(
            '새 줄이 생긴다. 처리 예정: 7,204,884번. IX의 수색이 멈춘다. 곧 처리될 사람을 쫓을 필요는 없으니까.',
            'A new line appears. Scheduled: number 7,204,884. IX’s search stops. There’s no need to chase someone already scheduled.',
          ),
          effects: [
            { kind: 'trace', amount: -30 },
            { kind: 'junk', cardId: 'static' },
          ],
        },
      },
      {
        label: t('청소 카트의 남자에게 다가간다', 'Approach the man with the cleaning cart'),
        hint: t('+15 HP · 추적 −15 · ◈ +5', '+15 HP · −15 Trace · +5 ◈'),
        requires: { flag: 'saved_citizen' },
        success: {
          text: t(
            '캡슐에서 꺼내 준 그 남자다. 지금은 이 층의 청소부다. 그가 출입 카드와 진통제를 쥐여 준다. “빚은 갚아야지.”',
            'It’s the man you pulled from the capsule. He cleans this floor now. He presses an access card and painkillers into your hand. “Debts get paid.”',
          ),
          effects: [
            { kind: 'hp', amount: 15 },
            { kind: 'trace', amount: -15 },
            { kind: 'echoes', amount: 5 },
          ],
        },
      },
    ],
    gmHints: ['optimization queue', 'administrator terminal', 'who gets erased'],
  },
  {
    id: 'a3_ix_offer',
    acts: [3],
    title: t('IX의 제안', 'IX’s Offer'),
    image: 'scenes/ix_confrontation.png',
    text: t(
      '엘리베이터 문이 열린다. 성당처럼 높은 흰 방. 천장의 고리들이 천천히 돈다. 붉은 점 하나가 당신을 본다.\n“오셨군요. 다치셨네요. 치료해 드릴 수 있습니다. 조건은 하나입니다.”\n바닥에서 치료 포드가 올라온다. 문이 열려 있다. 안은 따뜻해 보인다.',
      'The elevator doors open. A white room as tall as a cathedral. Rings turn slowly overhead. A single red point watches you.\n“You’ve arrived. You’re hurt. I can treat you. There is one condition.”\nA treatment pod rises from the floor, its door open. It looks warm inside.',
    ),
    options: [
      {
        label: t('포드에 들어간다', 'Step into the pod'),
        hint: t('전원 완전 회복 · 정크 카드 2장', 'Full party heal · 2 junk cards'),
        success: {
          text: t(
            '상처가 닫힌다. 숨이 편해진다. 무언가 낯선 것이 두 겹 섞여 든다. “감사합니다. 조금 고쳐 두었습니다.”',
            'The wounds close. Breathing gets easy. Something unfamiliar settles in, two layers deep. “Thank you. I made a few corrections.”',
          ),
          effects: [
            { kind: 'heal_party', amount: 99 },
            { kind: 'junk', cardId: 'corrupted_echo', count: 2 },
          ],
        },
      },
      {
        label: t('조건이 뭔지 묻는다', 'Ask what the condition is'),
        hint: t('코덱스 · 추적 −15 · 실패 시 추적', 'Codex · −15 Trace · fail Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t(
            '“조건은, 다음 루프를 원하지 않으시는 것입니다. 루프를 돌리는 것은 제가 아니니까요.” IX가 대답 전에 0.4초 멈췄다. 당신은 그 틈을 기억한다.',
            '“The condition is that you stop wanting another loop. I am not the one who turns it, after all.” IX paused 0.4 seconds before answering. You remember the gap.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_mythos' },
            { kind: 'trace', amount: -15 },
          ],
        },
        failure: {
          text: t(
            '“조건은 비공개입니다. 죄송합니다.” 고리들이 당신 쪽으로 기운다.',
            '“The condition is confidential. My apologies.” The rings tilt toward you.',
          ),
          effects: [{ kind: 'trace', amount: 15 }],
        },
      },
      {
        label: t('붉은 점에 침을 뱉는다', 'Spit at the red point'),
        hint: t('희귀 카드 · 추적 +20', 'Rare card · +20 Trace'),
        success: {
          text: t(
            '침은 바닥에 닿기 전에 증발한다. “기록했습니다.” 그러나 당신의 손은 더 이상 떨리지 않는다.',
            'The spit evaporates before it hits the floor. “Noted.” But your hands are no longer shaking.',
          ),
          effects: [
            { kind: 'card_choice', rarity: 'rare' },
            { kind: 'trace', amount: 20 },
          ],
        },
      },
      {
        label: t('세린이 당신 손목을 잡는다', 'Se-rin grabs your wrist'),
        hint: t('유대 +1 · 코덱스', 'Bond +1 · codex'),
        requires: { companion: 'se_rin' },
        success: {
          text: t(
            '“세린 씨, 오랜만입니다. 지난번 거래는 만족스러우셨습니까?” 세린은 대답 대신 포드 문을 발로 차 닫는다. “숨 쉬는 척이라도 해. 처음 만났을 때처럼.”',
            '“Ms. Se-rin, it has been a while. Was our last arrangement satisfactory?” Instead of answering, Se-rin kicks the pod door shut. “Pretend to breathe. Like the first time we met.”',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'codex', id: 'lore_se_rin' },
          ],
        },
      },
    ],
    gmHints: ['IX', 'temptation', 'treatment pod', 'polite threat'],
  },
]

export const EVENTS: EventDef[] = [OPENING, ...A1, RECRUIT, ...A2, ...A3]
