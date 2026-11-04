// Outside the List (DLC 2), Act 2 — The Night Laundry. Off-list workers' uniforms hang in a back-alley laundry with
// their name tags still sewn on; the Closing Crew's sweep finds people by reading those tags. q_outside_laundry:
// learn how the sweep finds people (1) → hide the tags before it arrives (2) → laundry carts parked as barricades in
// the boss fight (cover). Washer Yun or Do (a rookie on the Closing Crew) tell you; Bae the shutter-hook man sells a
// hook. One card picker at Bae; at most 20 credits district-wide. Prop: name tags.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D2_OUTSIDE_LAUNDRY: DistrictDef = {
  id: 'd2_outside_laundry',
  act: 2,
  route: 'outside',
  name: t('심야 세탁소', 'The Night Laundry'),
  image: 'v2/districts/d2_outside_laundry.webp',
  intro: t(
    '뒷골목 세탁소에 불이 켜져 있다. 빨랫줄마다 앞치마와 작업복이 걸려 있고, 가슴마다 이름표가 꿰매져 있다. 명단에 없는 이름들이다.\n폐점 정리반이 이 골목에 닿기 전, 세 곳을 들를 수 있다.',
    'A back-alley laundry still has its lights on. Aprons and work clothes hang on every line, each with a name tag sewn on the chest. Names that are not on the list.\nThere is time for three stops before the Closing Crew reaches this alley.',
  ),
  actions: 3,
  outro: t(
    '경광등이 골목 입구를 훑는다. 빨랫줄의 작업복들이 바람에 일제히 흔들린다.',
    'A beacon sweeps the mouth of the alley. The work clothes on the lines all sway at once.',
  ),
  pois: [
    { id: 'yun', name: t('세탁 카운터', 'The Laundry Counter'), blurb: t('이름표를 꿰매는 손.', 'The hands that sew the tags.'), dialogue: 'd2ol_yun' },
    { id: 'do', name: t('골목 입구', 'The Alley Mouth'), blurb: t('정리반 신입이 담배를 문다.', 'A Closing Crew rookie, smoking.'), dialogue: 'd2ol_do' },
    { id: 'bae', name: t('셔터 갈고리꾼', 'The Shutter-Hook Man'), blurb: t('셔터는 내리는 사람 마음.', 'A shutter comes down when he says.'), dialogue: 'd2ol_bae' },
    { id: 'line', name: t('빨랫줄', 'The Washing Lines'), blurb: t('이름표가 바람에 돈다.', 'Name tags turning in the wind.'), dialogue: 'd2ol_line' },
  ],
}

const YUN: DialogueDef = {
  id: 'd2ol_yun',
  npc: 'washer_yun',
  start: 'counter',
  nodes: {
    counter: {
      speaker: 'washer_yun',
      text: t(
        '윤이 다리미를 내려놓지 않고 말한다. “정리반은 얼굴을 안 봐요. 이름표를 읽지. 이름표만 있으면 문 안에 누가 사는지 다 알아요. 근데 이름표 없으면 옷을 안 돌려줘요. 다들.”',
        'Yun keeps the iron moving. “The Crew don’t look at faces. They read tags. A tag tells them who lives behind which door. But nobody takes their clothes back without one.”',
      ),
      options: [
        {
          label: t('이름표를 떼면 되지 않느냐고 묻는다', 'Ask why not just take the tags off'),
          intent: 'ask',
          success: {
            text: t('“떼면 누구 옷인지 몰라요. 숨기는 거면 몰라도.” 윤이 빨랫줄 쪽을 턱으로 가리킨다.', '“Take them off and nobody knows whose is whose. Hide them, maybe.” Yun nods toward the lines.'),
            effects: [{ kind: 'quest', id: 'q_outside_laundry', stage: 1 }],
          },
        },
        {
          label: t('다림질을 거든다', 'Help with the ironing'),
          intent: 'offer',
          approval: { tae_o: 1 },
          success: {
            text: t('작업복 열 벌. 윤이 동전을 쥐여 준다. “다음엔 깃도 세워 줘요.”', 'Ten work shirts. Yun presses coins into your hand. “Next time, do the collars too.”'),
            effects: [{ kind: 'credits', amount: 15 }],
          },
        },
        {
          label: t('카운터를 떠난다', 'Leave the counter'),
          intent: 'leave',
          success: { text: t('다리미 김이 오른다.', 'Steam rises from the iron.') },
        },
      ],
    },
  },
}

const DO: DialogueDef = {
  id: 'd2ol_do',
  npc: 'closing_crew_do',
  start: 'mouth',
  nodes: {
    mouth: {
      speaker: 'closing_crew_do',
      text: t(
        '정리반 조끼를 입은 청년이 골목 입구에서 담배를 문다. 조끼가 아직 빳빳하다. “이름표 읽고, 문 닫고, 안쪽 지우고. 첫 주예요. 생각보다 이름이 많네.”',
        'A young man in a Closing Crew vest smokes at the alley mouth. The vest is still stiff. “Read the tag, shut the door, wipe the inside. First week. More names than I thought.”',
      ),
      options: [
        {
          label: t('“이름표가 안 보이면 못 읽겠네요.”', '“Can’t read a tag you can’t see.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          approval: { se_rin: 1 },
          success: {
            text: t('도가 담배를 한참 본다. “…안 보이면 보고서에 안 써도 되죠. 규정상.” 정리반이 이름표로 사람을 찾는다는 걸 확인해 준 셈이다.', 'Do studies the cigarette a long while. “…If I can’t see it, I don’t have to report it. By the rules.” He has just confirmed the sweep runs on tags.'),
            effects: [{ kind: 'quest', id: 'q_outside_laundry', stage: 1 }, { kind: 'flag', key: 'outside_ld_do' }],
          },
          failure: {
            text: t('도가 무전기를 든다. “…수상한 사람 하나.” 말끝이 흐리지만, 보고는 보고다.', 'Do lifts his radio. “…One suspicious person.” He trails off, but a report is a report.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('담뱃불을 빌려 준다', 'Give him a light'),
          intent: 'offer',
          success: {
            text: t('도가 고맙다며 고개를 숙인다. 정리반 순찰 순서를 무심코 흘린다. 세탁소는 세 번째다.', 'Do thanks you with a nod and lets the patrol order slip. The laundry is third.'),
            effects: [{ kind: 'trace', amount: -3 }],
          },
        },
        {
          label: t('전직 단속관으로서 도에게 말을 건다', 'Talk to Do as a former officer'),
          intent: 'ask',
          requires: { background: 'enforcer' },
          success: {
            text: t('도가 당신 말투에 자세를 고친다. “선배님이셨어요?” 이름표 이야기가 술술 나온다. 안 보이면 보고 안 한다는 것까지.', 'Do straightens at your tone. “You were on the job?” The name-tag business spills out, down to “if I can’t see it, I don’t report it”.'),
            effects: [{ kind: 'quest', id: 'q_outside_laundry', stage: 1 }, { kind: 'flag', key: 'outside_ld_do' }],
          },
        },
        {
          label: t('입구를 피해 간다', 'Avoid the alley mouth'),
          intent: 'leave',
          success: { text: t('담배 연기가 경광등 빛에 섞인다.', 'Smoke mixes with the beacon light.') },
        },
      ],
    },
  },
}

const BAE: DialogueDef = {
  id: 'd2ol_bae',
  npc: 'shutter_hook_bae',
  start: 'hook',
  nodes: {
    hook: {
      speaker: 'shutter_hook_bae',
      text: t(
        '배 씨가 쇠갈고리를 어깨에 걸치고 셔터 줄을 센다. “폐점 시간엔 셔터가 금이야. 내려 주면 돈, 안 내려 주면 더 큰 돈. 갈고리 하나 빌려줄까?”',
        'Bae has an iron hook over his shoulder and counts the shutters. “At closing, shutters are gold. Pull one down, that’s money. Don’t, that’s more. Want to rent a hook?”',
      ),
      options: [
        {
          label: t('갈고리를 빌린다', 'Rent a hook'),
          intent: 'offer',
          requires: { minCredits: 20 },
          success: {
            text: t('배 씨가 녹슨 갈고리를 내민다. “빨랫줄 위 셔터, 그거 아직 안 내렸어.”', 'Bae hands over a rusty hook. “The shutter over the washing lines. Nobody’s pulled that one yet.”'),
            effects: [{ kind: 'credits', amount: -20 }, { kind: 'flag', key: 'outside_ld_hook' }],
          },
        },
        {
          label: t('갈고리 쓰는 법을 배운다', 'Learn how he uses the hook'),
          intent: 'ask',
          check: { stat: 'str', dc: 12 },
          success: {
            text: t('배 씨가 동작 셋을 보여 준다. 걸고, 당기고, 비튼다. “싸울 때도 똑같아.”', 'Bae shows three moves: hook, pull, twist. “Same in a fight.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('갈고리가 미끄러져 정강이를 친다. 배 씨가 혀를 찬다.', 'The hook slips and cracks your shin. Bae clicks his tongue.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('갈고리꾼을 지나친다', 'Pass him by'),
          intent: 'leave',
          success: { text: t('셔터 하나가 철컥 내려간다.', 'A shutter clangs down.') },
        },
      ],
    },
  },
}

const LINE: DialogueDef = {
  id: 'd2ol_line',
  start: 'tags',
  nodes: {
    tags: {
      text: t(
        '빨랫줄 수십 개에 작업복이 빼곡하다. 이름표가 바람에 돌며 골목 쪽을 향했다가, 다시 돌아선다.',
        'Dozens of lines are packed with work clothes. The name tags turn in the wind, face the alley, then turn away again.',
      ),
      options: [
        {
          label: t('이름표를 전부 안쪽으로 뒤집어 꿰맨다', 'Turn every tag inward and pin it'),
          intent: 'offer',
          approval: { doyun: 1 },
          requires: { quest: { id: 'q_outside_laundry', stage: 1 } },
          check: { stat: 'agi', dc: 12 },
          success: {
            text: t('손끝이 바늘에 찔린다. 마지막 이름표가 안쪽으로 숨는다. 윤이 세탁 수레를 골목 입구로 밀어 둔다.', 'The needle pricks your fingers. The last tag hides inside. Yun pushes the laundry carts toward the alley mouth.'),
            effects: [{ kind: 'quest', id: 'q_outside_laundry', stage: 2 }],
          },
          failure: {
            text: t('반쯤 뒤집었을 때 경광등이 골목을 비춘다. 서둘러 숨는다.', 'Halfway through, the beacon lights the alley. You duck out of sight.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('셔터를 끌어내려 빨랫줄을 가린다', 'Pull the shutter down over the lines'),
          intent: 'offer',
          requires: { flag: 'outside_ld_hook', quest: { id: 'q_outside_laundry', stage: 1 } },
          success: {
            text: t('셔터가 빨랫줄 위로 덜컹 내려앉는다. 밖에서는 닫힌 가게로만 보인다. 세탁 수레들이 셔터 앞에 줄을 선다.', 'The shutter rattles down over the lines. From outside it is just another closed shop. The laundry carts line up in front of it.'),
            effects: [{ kind: 'quest', id: 'q_outside_laundry', stage: 2 }],
          },
        },
        {
          label: t('도에게 이름표 바구니를 맡긴다', 'Hand Do a basket of tags to “lose”'),
          intent: 'offer',
          requires: { flag: 'outside_ld_do', quest: { id: 'q_outside_laundry', stage: 1 } },
          approval: { tae_o: 1 },
          success: {
            text: t('도가 바구니를 받아 정리반 수거함 뒤에 내려놓는다. “분실물이네요. 규정상.” 그가 처음으로 웃는다.', 'Do takes the basket and sets it behind the Crew’s collection bin. “Lost property. By the rules.” He smiles for the first time.'),
            effects: [{ kind: 'quest', id: 'q_outside_laundry', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('빨랫줄을 두고 간다', 'Leave the lines'),
          intent: 'leave',
          success: { text: t('이름표가 다시 골목 쪽으로 돈다.', 'The tags turn toward the alley again.') },
        },
      ],
    },
  },
}

export const D2_OUTSIDE_LAUNDRY_DIALOGUES: DialogueDef[] = [YUN, DO, BAE, LINE]

export const D2_OUTSIDE_LAUNDRY_NPCS: NpcDef[] = [
  { id: 'washer_yun', name: t('윤', 'Yun'), role: t('명단 밖 사람들의 작업복을 빠는 세탁부', 'Washer who launders the off-list workers’ uniforms'), faction: 'offgrid', portrait: 'v2/npcs/washer_yun.webp' },
  { id: 'closing_crew_do', name: t('도', 'Do'), role: t('첫 주를 맞은 폐점 정리반 신입', 'A Closing Crew rookie in his first week'), faction: 'grid', portrait: 'v2/npcs/closing_crew_do.webp' },
  { id: 'shutter_hook_bae', name: t('배 씨', 'Mr. Bae'), role: t('폐점 시간에 셔터를 내려 주는 갈고리꾼', 'Hook man who pulls shutters down at closing'), faction: 'market', portrait: 'v2/npcs/shutter_hook_bae.webp' },
]

export const D2_OUTSIDE_LAUNDRY_QUESTS: QuestDef[] = [{
  id: 'q_outside_laundry',
  title: t('심야 세탁소', 'The Night Laundry'),
  stages: [
    t('폐점 정리반이 사람을 찾는 방법을 알아낸다.', 'Learn how the Closing Crew finds people.'),
    t('정리반이 오기 전에 이름표를 숨긴다.', 'Hide the name tags before the Crew arrives.'),
  ],
  payoff: { stage: 2, bossMod: 'cover', text: t('세탁 수레들이 골목에 바리케이드로 선다.', 'The laundry carts stand in the alley as barricades.') },
}]
