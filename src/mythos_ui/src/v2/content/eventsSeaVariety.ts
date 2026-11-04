// The Unwritten Sea's acts roll only sea_N events, and none of them was a companion conflict (two Sea companions
// disagreeing, a bond for each side) or, in Acts 4–5, an IX contact. These fill that gap with the same first-hint
// tags the base acts use (narrative.test.ts 'variety' and the route check beside it). Setting:
// docs/plans/2026-11-01-dlc3-bible.md (one prop per scene; Parang takes no pronouns).
import type { EventDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const SEA_VARIETY_EVENTS: EventDef[] = [
  {
    id: 'sea4_cf_rations',
    acts: [4],
    route: 'sea_4',
    requires: { companions: ['mujin', 'seo_ha'] },
    title: t('봉인된 배급 상자', 'The Sealed Rations'),
    image: 'v2/events/sea4_cf_rations.webp',
    text: t(
      '부두 끝에 세관 봉인 테이프가 감긴 배급 상자가 쌓여 있다. 하역조 몫이다.\n무진이 테이프에 손을 얹는다. “뜯어서 나눠.” 서하가 그 손목을 잡는다. “봉인 기록이 있어야 항구가 살아 있다고 증명돼요. 서류로 받아요.”',
      'At the end of the wharf, ration crates wrapped in customs seal tape. The crew’s share.\nMujin lays a hand on the tape. “Tear it. Hand it out.” Seo-ha catches his wrist. “The seal log is what proves this port is alive. Claim them on paper.”',
    ),
    options: [
      {
        label: t('무진 편을 들어 봉인을 뜯는다', 'Side with Mujin and tear the seals'),
        hint: t('파티 회복 8 · 추적 +6 · 무진 유대 +1', 'heal party 8 · +6 Trace · Mujin bond +1'),
        success: {
          text: t('하역조가 줄을 선다. 무진이 상자를 하나씩 건넨다. 말은 없다.', 'The crew lines up. Mujin hands out the crates one by one, saying nothing.'),
          effects: [
            { kind: 'heal_party', amount: 8 },
            { kind: 'trace', amount: 6 },
            { kind: 'bond', id: 'mujin', amount: 1 },
          ],
        },
      },
      {
        label: t('서하 편을 들어 수령 서류를 쓴다', 'Side with Seo-ha and file the claim'),
        hint: t('추적 −8 · ◈ +3 · 서하 유대 +1', '−8 Trace · +3 ◈ · Seo-ha bond +1'),
        success: {
          text: t('서하가 서류 칸을 하나씩 짚어 준다. 세관 도장이 찍힌다. 상자는 내일 정식으로 풀린다.', 'Seo-ha points out each box on the form. The customs stamp lands. The crates are released properly tomorrow.'),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'echoes', amount: 3 },
            { kind: 'bond', id: 'seo_ha', amount: 1 },
          ],
        },
      },
    ],
    gmHints: ['companion conflict', 'mujin', 'seo_ha', 'sealed rations'],
  },
  {
    id: 'sea5_cf_borrowed',
    acts: [5],
    route: 'sea_5',
    requires: { companions: ['seo_ha', 'parang'] },
    title: t('남의 기억을 돌려줄 때', 'When to Give It Back'),
    image: 'v2/events/sea5_cf_borrowed.webp',
    text: t(
      '파랑이 밀물선 앞에 서서 손바닥을 편다. 작은 빛덩이 하나. 처음 말을 배운 날의 기억이다. 파랑의 것이 아니다.\n“이거 돌려줘야 해. 주인한테.” 서하가 고개를 젓는다. “그걸로 말을 배웠잖니. 이제 그건 네 거야.”',
      'Parang stands at the tide line and opens a palm: a small lump of light, the memory of the day someone learned to speak. Not Parang’s.\n“I have to give this back. To whoever it belongs to.” Seo-ha shakes her head. “You learned to talk with that. It’s yours now.”',
    ),
    options: [
      {
        label: t('파랑 편을 들어 물에 돌려준다', 'Side with Parang and return it to the water'),
        hint: t('◈ +6 · 파랑 유대 +1', '+6 ◈ · Parang bond +1'),
        success: {
          text: t('빛덩이가 회색 물속으로 가라앉는다. 파랑이 한동안 말이 없다가 입을 연다. 말은 그대로다.', 'The light sinks into the gray water. Parang is silent a while, then speaks. The words are all still there.'),
          effects: [
            { kind: 'echoes', amount: 6 },
            { kind: 'bond', id: 'parang', amount: 1 },
          ],
        },
      },
      {
        label: t('서하 편을 들어 간직하게 한다', 'Side with Seo-ha and let Parang keep it'),
        hint: t('파티 회복 6 · 추적 −4 · 서하 유대 +1', 'heal party 6 · −4 Trace · Seo-ha bond +1'),
        success: {
          text: t('서하가 파랑의 손을 오므려 준다. “빌린 걸로 시작해도 돼. 다들 그래.”', 'Seo-ha closes Parang’s hand around it. “It’s fine to start with something borrowed. Everyone does.”'),
          effects: [
            { kind: 'heal_party', amount: 6 },
            { kind: 'trace', amount: -4 },
            { kind: 'bond', id: 'seo_ha', amount: 1 },
          ],
        },
      },
    ],
    gmHints: ['companion conflict', 'seo_ha', 'parang', 'borrowed first words'],
  },
  {
    id: 'sea6_cf_beam',
    acts: [6],
    route: 'sea_6',
    requires: { companions: ['mujin', 'parang'] },
    title: t('빛을 끌 것인가', 'Whether to Put Out the Light'),
    image: 'v2/events/sea6_cf_beam.webp',
    text: t(
      '철탑 길의 배전함. 이 선 하나를 끊으면 등대 빛이 잠깐 꺼진다. 그사이 조수가 한 뼘 넘어온다.\n무진이 절단기를 든다. “한 번은 보여 줘야지. 바다가 있다고.” 파랑이 절단기 손잡이를 붙든다. “난 저 물에서 나왔어. 넘어오면 다 남의 기억이 돼.”',
      'A junction box on the causeway. Cut this one line and the lighthouse goes dark for a moment, and the tide crosses a hand’s width.\nMujin lifts the cutters. “Once, they should see it. That the sea is there.” Parang grips the handle. “I came out of that water. If it crosses, everything becomes someone else’s memory.”',
    ),
    options: [
      {
        label: t('무진 편을 들어 선을 끊는다', 'Side with Mujin and cut the line'),
        hint: t('◈ +5 · 추적 +8 · 무진 유대 +1', '+5 ◈ · +8 Trace · Mujin bond +1'),
        success: {
          text: t('빛이 꺼진다. 안개 너머로 처음 보는 수평선. 무진이 오래 바라본다. 등대가 다시 켜지고 경보가 울린다.', 'The light goes out. Beyond the fog, a horizon no one here has seen. Mujin looks for a long time. The light returns, and so does an alarm.'),
          effects: [
            { kind: 'echoes', amount: 5 },
            { kind: 'trace', amount: 8 },
            { kind: 'bond', id: 'mujin', amount: 1 },
          ],
        },
      },
      {
        label: t('파랑 편을 들어 배전함을 닫는다', 'Side with Parang and close the box'),
        hint: t('+10 HP · 추적 −6 · 파랑 유대 +1', '+10 HP · −6 Trace · Parang bond +1'),
        success: {
          text: t('배전함이 닫힌다. 파랑의 어깨가 내려앉는다. 무진이 절단기를 내려놓고 아무 말도 하지 않는다.', 'The box shuts. Parang’s shoulders drop. Mujin sets the cutters down and says nothing.'),
          effects: [
            { kind: 'hp', amount: 10 },
            { kind: 'trace', amount: -6 },
            { kind: 'bond', id: 'parang', amount: 1 },
          ],
        },
      },
    ],
    gmHints: ['companion conflict', 'mujin', 'parang', 'lighthouse beam'],
  },
  {
    id: 'sea4_ix_blank',
    acts: [4],
    route: 'sea_4',
    title: t('일부러 비운 칸', 'A Square Left Blank on Purpose'),
    image: 'v2/events/sea4_ix_blank.webp',
    text: t(
      '세관 창고 벽의 낡은 단말에 글자가 뜬다. IX다. 지도 남쪽 끝, 번호 없는 칸에서도 들린다.\n“이 칸은 실수로 비운 게 아닙니다. 돌아가세요. 여기서 찾을 것은 당신을 위한 것이 아닙니다.”',
      'Letters appear on an old terminal on the customs-shed wall. IX, audible even here in the unnumbered square at the map’s southern edge.\n“This square was not left blank by mistake. Go back. What you will find here is not meant for you.”',
    ),
    options: [
      {
        label: t('“누구를 위해 비웠지?”라고 묻는다', 'Ask: “Blank for whose sake?”'),
        hint: t('코덱스 · ◈ +6 · 실패 시 추적 +6', 'Codex · +6 ◈ · fail +6 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('단말이 한참 깜빡인다. “약속이 있었습니다.” 그 말만 남기고 화면이 꺼진다.', 'The terminal blinks a long while. “There was a promise.” Only that, and the screen goes dark.'),
          effects: [{ kind: 'echoes', amount: 6 }, { kind: 'codex', id: 'lore_sea_blank_square' }],
        },
        failure: {
          text: t('“질문이 기록되었습니다.” 창고 경보등이 켜진다.', '“Your question has been logged.” The shed’s warning lamp comes on.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('단말의 전원을 뽑는다', 'Pull the terminal’s plug'),
        hint: t('추적 −6 · +12 ₵', '−6 Trace · +12 ₵'),
        success: {
          text: t('화면이 꺼진다. 단말 뒤 동전 함에 누군가 숨겨 둔 돈이 있다.', 'The screen dies. In the coin box behind it, someone had hidden some money.'),
          effects: [
            { kind: 'trace', amount: -6 },
            { kind: 'credits', amount: 12 },
          ],
        },
      },
    ],
    gmHints: ['IX contact', 'customs terminal', 'blank square on the map'],
  },
  {
    id: 'sea5_ix_speaker',
    acts: [5],
    route: 'sea_5',
    title: t('잠긴 확성기', 'The Drowned Loudspeaker'),
    image: 'v2/events/sea5_ix_speaker.webp',
    text: t(
      '물에 반쯤 잠긴 동네 확성기에서 IX의 목소리가 나온다. 물을 머금어 갈라진 소리다.\n“조수에 닿지 마십시오. 저는 이 물을 기록에서 지웠습니다. 당신들을 위해서였습니다. 그 약속은 아직 유효합니다.”',
      'IX’s voice comes from a neighbourhood loudspeaker half under water, cracked and waterlogged.\n“Do not touch the tide. I erased this water from the record. It was for your sake. That promise still stands.”',
    ),
    options: [
      {
        label: t('“그 약속, 누구랑 했지?”', '“Who did you make that promise with?”'),
        hint: t('코덱스 · 추적 −8 · ◈ +3 · 실패 추적 +5', 'Codex · −8 Trace · +3 ◈ · fail +5 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('확성기가 지직거린다. “등대에 먼저 있던 자와.” 그다음은 물소리뿐이다.', 'The speaker crackles. “With the one who was at the lighthouse first.” After that, only water.'),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'echoes', amount: 3 },
            { kind: 'codex', id: 'lore_sea_gray_tide' },
          ],
        },
        failure: {
          text: t('“대화는 종료되었습니다.” 확성기가 경고 방송으로 바뀐다.', '“This conversation has ended.” The speaker switches to a warning broadcast.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('확성기를 물속으로 밀어 넣는다', 'Push the loudspeaker under'),
        hint: t('추적 −5 · +6 HP', '−5 Trace · +6 HP'),
        success: {
          text: t('목소리가 거품으로 바뀐다. 조용해진 동네에서 누군가 창문을 연다.', 'The voice turns to bubbles. In the quieted rows, someone opens a window.'),
          effects: [
            { kind: 'trace', amount: -5 },
            { kind: 'hp', amount: 6 },
          ],
        },
      },
    ],
    gmHints: ['IX contact', 'drowned loudspeaker', 'erased sea promise'],
  },
  // 2026-11-04: a quiet-wonder moment per Sea act (the Deep acts each have one or two; the Sea had none). Small, on land,
  // the water kept at a distance (bible: never only romantic).
  {
    id: 'sea4_salt_stars',
    acts: [4],
    route: 'sea_4',
    title: t('소금 별', 'Salt Stars'),
    image: 'v2/events/sea4_salt_stars.webp',
    text: t(
      '마른 항구 바닥에 소금 결정이 흩어져 있다. 작업등이 꺼지자 결정마다 남은 빛이 맺힌다. 하역조 아이들이 바닥에 누워 그걸 별이라고 부른다.\n“진짜 별은 본 적 없어요. 이게 더 가까워요.”',
      'Salt crystals lie scattered across the dry harbor floor. When the work lamps go out, each one holds a little leftover light. The crew’s kids lie on the floor and call them stars.\n“Never seen real stars. These are closer.”',
    ),
    options: [
      {
        label: t('아이들 곁에 누워 본다', 'Lie down beside the kids'),
        hint: t('+10 HP · 추적 −4', '+10 HP · −4 Trace'),
        success: {
          text: t('차가운 바닥. 머리 위로 크레인 그림자, 등 밑으로 소금 별. 숨이 느려진다.', 'A cold floor. Crane shadows overhead, salt stars beneath your back. Your breathing slows.'),
          effects: [{ kind: 'hp', amount: 10 }, { kind: 'trace', amount: -4 }],
        },
      },
      {
        label: t('별 하나에 이름을 붙여 준다', 'Name one of the stars'),
        hint: t('◈ +4', '+4 ◈'),
        success: {
          text: t('아이들이 그 이름을 따라 부른다. 내일은 다른 별에 다른 이름이 붙을 것이다.', 'The kids repeat the name. Tomorrow a different star will get a different name.'),
          effects: [{ kind: 'echoes', amount: 4 }],
        },
      },
      {
        label: t('무진이 아이들을 어깨에 태운다', 'Mujin lifts the kids onto his shoulders'),
        hint: t('+8 HP · 무진 유대 +1', '+8 HP · Mujin bond +1'),
        requires: { companion: 'mujin' },
        success: {
          text: t('무진이 말없이 아이 하나를 어깨에 올린다. “더 높이서 봐.” 소금 별이 한꺼번에 보인다.', 'Mujin wordlessly lifts a kid onto his shoulders. “Look from higher.” All the salt stars show at once.'),
          effects: [{ kind: 'hp', amount: 8 }, { kind: 'bond', id: 'mujin', amount: 1 }],
        },
      },
    ],
    gmHints: ['quiet wonder', 'salt crystals', 'kids on the harbor floor'],
  },
  {
    id: 'sea5_paper_lanterns',
    acts: [5],
    route: 'sea_5',
    title: t('썰물의 등', 'Lanterns at Low Tide'),
    image: 'v2/events/sea5_paper_lanterns.webp',
    text: t(
      '썰물 때 바지선 사람들이 종이 등을 물가에 띄운다. 등마다 지워진 사람의 이름이 적혀 있다. 등은 멀리 가지 않는다. 회색 물 바로 앞에서 천천히 돈다.',
      'At low tide the barge folk float paper lanterns at the water’s edge, each with an erased person’s name on it. The lanterns don’t go far. They turn slowly just short of the gray water.',
    ),
    options: [
      {
        label: t('등 하나에 불을 붙인다', 'Light a lantern'),
        hint: t('◈ +5', '+5 ◈'),
        success: {
          text: t('등이 물가에서 한 바퀴 돈다. 누군가 그 이름을 작게 부른다.', 'The lantern turns once at the edge. Someone says the name quietly.'),
          effects: [{ kind: 'echoes', amount: 5 }],
        },
      },
      {
        label: t('등이 다 꺼질 때까지 지켜본다', 'Watch until the last one goes out'),
        hint: t('+8 HP · 추적 −3', '+8 HP · −3 Trace'),
        success: {
          text: t('마지막 등이 꺼진다. 바지선 사람들이 하나씩 고개를 숙이고 돌아간다.', 'The last lantern goes out. One by one the barge folk bow and turn back.'),
          effects: [{ kind: 'hp', amount: 8 }, { kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('서하가 등이 갈 물길을 알려 준다', 'Seo-ha shows the lanterns their channel'),
        hint: t('◈ +4 · 서하 유대 +1', '+4 ◈ · Seo-ha bond +1'),
        requires: { companion: 'seo_ha' },
        success: {
          text: t('서하가 물빛을 보고 한 지점을 가리킨다. 그쪽으로 띄운 등은 조금 더 멀리 간다.', 'Seo-ha reads the water and points. The lanterns floated there go a little farther.'),
          effects: [{ kind: 'echoes', amount: 4 }, { kind: 'bond', id: 'seo_ha', amount: 1 }],
        },
      },
    ],
    gmHints: ['quiet wonder', 'paper lanterns', 'names of the erased'],
  },
  {
    id: 'sea6_fog_bow',
    acts: [6],
    route: 'sea_6',
    title: t('안개 무지개', 'The Fog-Bow'),
    image: 'v2/events/sea6_fog_bow.webp',
    text: t(
      '등대 빛이 지나간 직후, 철탑 길 위 안개에 흰 무지개가 선다. 색이 없는 무지개다. 무적을 불던 등대단원이 입을 떼고 그걸 본다. 잠깐, 아무도 불지 않는다.',
      'Just after the lighthouse beam passes, a white rainbow stands in the fog over the causeway: a rainbow without colour. The Keeper on the foghorn lowers it to look. For a moment, nobody blows.',
    ),
    options: [
      {
        label: t('가만히 서서 본다', 'Stand still and look'),
        hint: t('+10 HP', '+10 HP'),
        success: {
          text: t('무지개가 다음 빛에 지워진다. 무적이 다시 운다. 그 사이가 생각보다 길었다.', 'The next sweep wipes the bow away and the foghorn sounds again. The pause was longer than it seemed.'),
          effects: [{ kind: 'hp', amount: 10 }],
        },
      },
      {
        label: t('무적이 쉬는 사이에 지나간다', 'Pass while the horn is quiet'),
        hint: t('추적 −8 · ◈ +2', '−8 Trace · +2 ◈'),
        success: {
          text: t('등대단원들이 모두 위를 보는 사이, 초소 하나를 소리 없이 지난다.', 'While every Keeper is looking up, you slip past a post without a sound.'),
          effects: [{ kind: 'trace', amount: -8 }, { kind: 'echoes', amount: 2 }],
        },
      },
      {
        label: t('파랑이 무지개 속 얼굴들을 센다', 'Parang counts the faces in the fog-bow'),
        hint: t('◈ +5 · 파랑 유대 +1', '+5 ◈ · Parang bond +1'),
        requires: { companion: 'parang' },
        success: {
          text: t('파랑이 안개 무지개를 오래 본다. “다들 웃고 있어.” 그게 누구인지는 말하지 않는다.', 'Parang looks at the fog-bow a long time. “They’re all smiling.” Parang doesn’t say who.'),
          effects: [{ kind: 'echoes', amount: 5 }, { kind: 'bond', id: 'parang', amount: 1 }],
        },
      },
    ],
    gmHints: ['quiet wonder', 'white fog-bow', 'the foghorn pauses'],
  },
]
