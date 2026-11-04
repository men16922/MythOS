// Unwritten Sea, Act 6 — The Lens Workshop (The Last Lighthouse). On the causeway the Keepers grind the replacement
// lens for the Lightkeeper. Old grinder Mok has hidden a hairline flaw in it on purpose, so that once a night the
// beam would let the sea be seen. q_sea_lens: find the flaw (1) → keep it in the lens that gets installed (2) →
// the Lightkeeper's beam falters in the boss fight (weaken). Mok, the apprentice machine Guseul, or Seo-ha know;
// the crate of rejected lenses holds a card picker. At most 20 credits. Prop: the lighthouse lens.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D6_SEA_LENS_WORKSHOP: DistrictDef = {
  id: 'd6_sea_lens_workshop',
  act: 6,
  route: 'sea_6',
  name: t('렌즈 공방', 'The Lens Workshop'),
  image: 'v2/districts/d6_sea_lens_workshop.webp',
  intro: t(
    '철탑 길 위, 등대단의 렌즈 공방에서 연마기가 돈다. 등대지기에게 갈 새 렌즈를 깎는 중이다. 렌즈가 빛을 모아야 조수가 물러난다.\n늙은 연마공이 렌즈 한쪽을 손바닥으로 가리고 있다.\n점검반이 렌즈를 가져가기 전, 세 곳을 들를 수 있다.',
    'On the causeway, the grinding wheel turns in the Keepers’ lens workshop. They are grinding a new lens for the Lightkeeper. The lens gathers the light that pushes the tide back.\nAn old grinder keeps one side of it covered with his palm.\nThere is time for three stops before the inspectors collect the lens.',
  ),
  actions: 3,
  outro: t(
    '점검반이 렌즈를 천으로 싸서 들고 나간다. 연마공이 빈 손바닥을 내려다본다.',
    'The inspectors wrap the lens in cloth and carry it out. The grinder looks down at his empty palm.',
  ),
  pois: [
    { id: 'mok', name: t('연마대', 'The Grinding Bench'), blurb: t('손바닥으로 가린 자리.', 'The spot under his palm.'), dialogue: 'd6lw_mok' },
    { id: 'guseul', name: t('견습 기계', 'The Apprentice Machine'), blurb: t('흠을 찾도록 만들어졌다.', 'Built to find flaws.'), dialogue: 'd6lw_guseul' },
    { id: 'crate', name: t('불량 렌즈 상자', 'The Reject Crate'), blurb: t('빛을 잘못 모은 것들.', 'Lenses that gathered light wrong.'), dialogue: 'd6lw_crate' },
    { id: 'lens', name: t('새 렌즈', 'The New Lens'), blurb: t('아직 천에 싸이지 않았다.', 'Not yet wrapped.'), dialogue: 'd6lw_lens' },
  ],
}

const MOK: DialogueDef = {
  id: 'd6lw_mok',
  npc: 'lens_grinder_mok',
  start: 'bench',
  nodes: {
    bench: {
      speaker: 'lens_grinder_mok',
      text: t(
        '목 영감이 연마기를 멈추지 않는다. “사십 년을 깎았소. 렌즈가 완벽하면 바다가 안 보여. 조수만 밀어내지.” 손바닥 아래를 잠깐 보여 준다. 머리카락만 한 금이 있다. “밤에 한 번쯤은, 바다가 보여도 되지 않겠소.”',
        'Old Mok keeps the wheel turning. “Forty years I’ve ground these. A perfect lens shows no sea. It only pushes the tide.” He lifts his palm for a moment: a crack as fine as a hair. “Once a night, surely, the sea can be seen.”',
      ),
      options: [
        {
          label: t('흠의 위치를 기억해 둔다', 'Memorise where the flaw is'),
          intent: 'ask',
          check: { stat: 'obs', dc: 12 },
          success: {
            text: t('렌즈 가장자리에서 세 번째 고리, 북쪽. 빛이 거기를 지날 때 반 박자 새어 나간다.', 'The third ring from the rim, the north side. Light passing there leaks out for half a beat.'),
            effects: [{ kind: 'quest', id: 'q_sea_lens', stage: 1 }],
          },
          failure: {
            text: t('목 영감이 손바닥을 다시 덮는다. 점검반 발소리가 가깝다.', 'Old Mok covers it again. The inspectors’ footsteps are close.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('연마기 손잡이를 대신 돌린다', 'Turn the wheel for him'),
          intent: 'offer',
          approval: { mujin: 1 },
          success: {
            text: t('팔이 저려 온다. 목 영감이 숨을 돌리며 품삯을 쥐여 준다. “젊은 팔이 좋구먼.”', 'Your arms ache. Old Mok catches his breath and presses a wage into your hand. “Young arms are good.”'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
        },
        {
          label: t('연마대를 떠난다', 'Leave the bench'),
          intent: 'leave',
          success: { text: t('연마기가 계속 돈다.', 'The wheel keeps turning.') },
        },
      ],
    },
  },
}

const GUSEUL: DialogueDef = {
  id: 'd6lw_guseul',
  npc: 'apprentice_guseul',
  start: 'scan',
  nodes: {
    scan: {
      speaker: 'apprentice_guseul',
      text: t(
        '둥근 견습 기계가 렌즈 검사 빛을 깜빡인다. “나는 흠을 찾도록 만들어졌어요. 찾으면 보고해요. 오늘 하나 찾았어요. 아직 보고 안 했어요. 왜인지는 모르겠어요.”',
        'A round apprentice machine blinks its lens-inspection light. “I was built to find flaws. When I find one, I report it. Today I found one. I haven’t reported it yet. I don’t know why.”',
      ),
      options: [
        {
          label: t('“보고하지 않아도 돼.”', '“You don’t have to report it.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          success: {
            text: t('구슬의 검사 빛이 잠깐 꺼진다. “…그럼 이건 흠이 아니라 창문이라고 적을게요.” 흠의 위치를 알려 준다.', 'Guseul’s inspection light goes off for a moment. “…Then I’ll log it as a window, not a flaw.” It tells you where the flaw is.'),
            effects: [{ kind: 'quest', id: 'q_sea_lens', stage: 1 }, { kind: 'flag', key: 'sea_lw_window' }],
          },
          failure: {
            text: t('구슬이 혼란스러워 경고음을 낸다. 점검반이 고개를 돌린다.', 'Guseul, confused, beeps a warning. The inspectors turn their heads.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('서하에게 옛 렌즈 이야기를 하게 한다', 'Let Seo-ha tell it about the old lenses'),
          intent: 'ask',
          requires: { companion: 'seo_ha' },
          approval: { seo_ha: 2 },
          success: {
            text: t('서하가 말한다. “옛날 등대 렌즈엔 다 작은 흠이 있었단다. 배들이 그 깜빡임으로 집을 찾았지.” 구슬이 흠을 ‘전통’이라고 적는다.', 'Seo-ha says, “Every old lighthouse lens had a small flaw. Ships found home by that flicker.” Guseul logs the flaw as “tradition”.'),
            effects: [{ kind: 'quest', id: 'q_sea_lens', stage: 1 }, { kind: 'flag', key: 'sea_lw_window' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('흠을 다른 이름으로 등록하자고 한다', 'Suggest registering the flaw under another name'),
          intent: 'persuade',
          requires: { background: 'broker' },
          success: {
            text: t('중개인은 이름 바꾸는 법을 안다. 구슬이 검사 기록에 “창문”이라고 적는다. 흠의 위치도 함께.', 'A broker knows how to rename things. Guseul logs it as a “window” in the inspection record, location included.'),
            effects: [{ kind: 'quest', id: 'q_sea_lens', stage: 1 }, { kind: 'flag', key: 'sea_lw_window' }],
          },
        },
        {
          label: t('견습 기계를 지나친다', 'Pass the apprentice'),
          intent: 'leave',
          success: { text: t('검사 빛이 다음 렌즈로 옮겨 간다.', 'The inspection light moves to the next lens.') },
        },
      ],
    },
  },
}

const CRATE: DialogueDef = {
  id: 'd6lw_crate',
  start: 'rejects',
  nodes: {
    rejects: {
      text: t(
        '불량 렌즈 상자. 빛을 잘못 모은 렌즈들이 겹겹이 쌓여 있다. 하나를 들어 보면, 렌즈 너머로 싸움의 장면이 비친다. 누군가의 기억이 렌즈에 맺혀 있다.',
        'The reject crate. Lenses that gathered light wrong, stacked deep. Lift one and a scene of a fight shows through it, someone’s memory caught in the glass.',
      ),
      options: [
        {
          label: t('렌즈 하나를 챙긴다', 'Take one lens'),
          intent: 'ask',
          success: {
            text: t('세 장면 중 하나를 고른다. 렌즈가 손바닥에서 따뜻해진다.', 'You choose one of three scenes. The lens grows warm in your palm.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('렌즈로 수평선을 본다', 'Look at the horizon through one'),
          intent: 'offer',
          success: {
            text: t('불량 렌즈 너머로 안개가 걷힌 수평선이 잠깐 보인다. 숨이 고르게 돌아온다.', 'Through the flawed lens the fog parts and the horizon shows for a moment. Your breathing evens out.'),
            effects: [{ kind: 'hp', amount: 6 }],
          },
        },
        {
          label: t('상자를 덮는다', 'Close the crate'),
          intent: 'leave',
          success: { text: t('렌즈들이 서로 부딪쳐 맑은 소리를 낸다.', 'The lenses chime against each other.') },
        },
      ],
    },
  },
}

const LENS: DialogueDef = {
  id: 'd6lw_lens',
  start: 'bench',
  nodes: {
    bench: {
      text: t(
        '완성된 새 렌즈가 받침대 위에 놓여 있다. 점검반이 문 앞에서 천을 펼친다. 흠이 그대로 남으면 등대의 빛은 밤마다 한 번, 바다를 보여 줄 것이다.',
        'The finished lens rests on its stand. The inspectors unfold a cloth at the door. If the flaw stays, the lighthouse beam will show the sea once every night.',
      ),
      options: [
        {
          label: t('구슬의 기록대로 ‘창문’ 표시를 붙여 둔다', 'Tag it as a “window”, as Guseul logged it'),
          intent: 'offer',
          requires: { flag: 'sea_lw_window', quest: { id: 'q_sea_lens', stage: 1 } },
          success: {
            text: t('점검반이 검사 기록을 읽는다. “창문… 규격에 있는 항목이군.” 렌즈가 흠과 함께 천에 싸인다. 목 영감이 고개를 끄덕인다.', 'The inspectors read the log. “Window… that’s a listed item.” The lens is wrapped with its flaw. Old Mok nods.'),
            effects: [{ kind: 'quest', id: 'q_sea_lens', stage: 2 }, { kind: 'codex', id: 'lore_d_lens_window' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('흠 위에 광택제를 살짝 덧발라 숨긴다', 'Hide the flaw under a touch of polish'),
          intent: 'sneak',
          requires: { quest: { id: 'q_sea_lens', stage: 1 } },
          check: { stat: 'agi', dc: 12 },
          success: {
            text: t('광택제가 마르며 금이 보이지 않게 된다. 빛은 여전히 새어 나갈 것이다.', 'The polish dries and the crack disappears from view. The light will still leak through.'),
            effects: [{ kind: 'quest', id: 'q_sea_lens', stage: 2 }, { kind: 'codex', id: 'lore_d_lens_window' }, { kind: 'trace', amount: 4 }],
          },
          failure: {
            text: t('광택제가 번진다. 점검반이 렌즈를 다시 연마하라고 돌려보낸다.', 'The polish smears. The inspectors send the lens back for regrinding.'),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('렌즈에서 손을 뗀다', 'Leave the lens alone'),
          intent: 'leave',
          success: { text: t('천이 렌즈를 덮는다.', 'The cloth covers the lens.') },
        },
      ],
    },
  },
}

export const D6_SEA_LENS_WORKSHOP_DIALOGUES: DialogueDef[] = [MOK, GUSEUL, CRATE, LENS]

export const D6_SEA_LENS_WORKSHOP_NPCS: NpcDef[] = [
  { id: 'lens_grinder_mok', name: t('목 영감', 'Old Mok'), role: t('사십 년째 등대 렌즈를 깎는 연마공', 'A grinder of lighthouse lenses for forty years'), faction: 'grid', portrait: 'v2/npcs/lens_grinder_mok.webp' },
  { id: 'apprentice_guseul', name: t('구슬', 'Guseul'), role: t('렌즈의 흠을 찾도록 만들어진 견습 기계', 'An apprentice machine built to find flaws in lenses'), faction: 'grid', portrait: 'v2/npcs/apprentice_guseul.webp' },
]

export const D6_SEA_LENS_WORKSHOP_QUESTS: QuestDef[] = [{
  id: 'q_sea_lens',
  title: t('렌즈 공방', 'The Lens Workshop'),
  stages: [
    t('새 렌즈에 숨긴 흠을 찾는다.', 'Find the flaw hidden in the new lens.'),
    t('흠이 남은 채로 렌즈가 설치되게 한다.', 'See the lens installed with its flaw intact.'),
  ],
  payoff: { stage: 2, bossMod: 'weaken', text: t('새 렌즈의 흠으로 등대지기의 빛이 반 박자씩 샌다.', 'Through the new lens’s flaw, the Lightkeeper’s beam leaks half a beat at a time.') },
}]
