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
  // 2026-11-05: Sea Act 4 had 20 ungated events (Deep Acts 1, 2, 4: 26). Three Dry Harbor scenes, one prop each.
  {
    id: 'sea4_ev_night_class',
    acts: [4],
    route: 'sea_4',
    title: t('딱지로 배우는 글', 'Reading from the Tags'),
    image: 'v2/events/sea4_ev_night_class.webp',
    text: t(
      '불 꺼진 하역 사무실에서 하역조 아이들이 압류 딱지를 한 장씩 소리 내어 읽는다. 교과서가 없어서 세관이 붙이고 간 딱지가 교재다. “정박할, 선박, 없음.” 한 아이가 마지막 칸에서 막힌다. 사유 칸이다.',
      'In the dark dock office the crew’s kids read seizure tags aloud, one at a time. There are no schoolbooks, so the tags Customs leaves behind are the lessons. “No. Vessel. To berth.” One kid stalls at the last box: the reason.',
    ),
    options: [
      {
        label: t('사유 칸 읽는 법을 같이 짚어 준다', 'Work through the reason box with them'),
        hint: t('매력 8 · 성공 인간성 +1 · ◈ +5', 'CHA 8 · success: +1 Humanity · +5 ◈'),
        check: { stat: 'cha', dc: 8 },
        success: {
          text: t('아이가 사유를 끝까지 읽는다. 그리고 묻는다. “배가 없으면 우리 집도 없는 거예요?” 다른 아이가 대신 답한다. “아니. 딱지에 그렇게 써 있을 뿐이야.”', 'The kid reads the reason through, then asks, “If there’s no ship, is there no house either?” Another kid answers: “No. That’s just what the tag says.”'),
          effects: [{ kind: 'axis', axis: 'humanity' }, { kind: 'echoes', amount: 5 }],
        },
        failure: {
          text: t('당신도 서류 말투에서 막힌다. 아이들이 웃는다. 수업은 다음 딱지로 넘어간다.', 'You stall on the paperwork phrasing too. The kids laugh, and the lesson moves on to the next tag.'),
          effects: [{ kind: 'echoes', amount: 2 }],
        },
      },
      {
        label: t('딱지 묶음에서 검수 번호 규칙을 읽어 낸다', 'Work out the inspection-number pattern from the stack'),
        hint: t('추적 −4 · 통찰 +1', '−4 Trace · +1 Insight'),
        success: {
          text: t('번호 앞자리는 날짜, 끝자리는 검수원이다. 오늘 이 골목을 맡은 검수원이 누군지 알게 된다. 그 사람의 순찰 길은 피하면 된다.', 'The leading digits are the date; the last ones, the inspector. Now you know who has this alley today, and which way they walk.'),
          effects: [{ kind: 'trace', amount: -4 }, { kind: 'axis', axis: 'insight' }],
        },
      },
      {
        label: t('수업을 방해하지 않고 지나간다', 'Pass by without interrupting'),
        hint: t('HP +4', '+4 HP'),
        success: {
          text: t('문밖 계단에 앉아 읽는 소리를 듣는다. 다리의 피로가 조금 풀린다.', 'You sit on the steps outside and listen to the reading. Some of the ache leaves your legs.'),
          effects: [{ kind: 'hp', amount: 4 }],
        },
      },
    ],
    gmHints: ['crew kids', 'seizure tags as schoolbooks', 'dark dock office'],
  },
  {
    id: 'sea4_ev_kite',
    acts: [4],
    route: 'sea_4',
    title: t('바람 없음으로 압류', 'Seized: No Wind'),
    image: 'v2/events/sea4_ev_kite.webp',
    text: t(
      '세관 창고 앞에서 신입 검수원이 아이의 연을 들고 서식을 쓰고 있다. 사유 칸에서 펜이 멈춘다. 아이는 울지 않고 옆에 서 있다. 연 꼬리에는 항구 바람에 쓸린 자국이 아직 남아 있다.',
      'Outside the customs shed a rookie inspector holds a child’s kite and fills in a form. His pen stops at the reason box. The child stands beside him, not crying. The kite’s tail still shows where the harbor wind frayed it.',
    ),
    options: [
      {
        label: t('“바람 없음”이라고 쓰라고 일러 준다', 'Tell him to write “no wind”'),
        hint: t('지능 9 · 성공 추적 −4 · 실패 추적 +4', 'INT 9 · success: −4 Trace · fail: +4 Trace'),
        check: { stat: 'int', dc: 9 },
        success: {
          text: t('검수원이 그대로 쓴다. 바람이 없으면 연은 날지 못하고, 날지 못하는 연은 화물이 아니다. 서식이 반려된다. 연이 아이 손으로 돌아간다.', 'He writes it. No wind means no flight, and a kite that can’t fly isn’t cargo. The form is rejected, and the kite goes back to the child.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
        failure: {
          text: t('검수원이 당신 얼굴을 서식 뒷면에 적어 둔다. “참고인입니다.”', 'He notes your face on the back of the form. “A witness.”'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('“사유가 없으면 압류도 없어요.”', '“No reason, no seizure.”'),
        hint: t('매력 9 · 성공 인간성 +1 · 크레딧 +12', 'CHA 9 · success: +1 Humanity · +12 ₵'),
        check: { stat: 'cha', dc: 9 },
        success: {
          text: t('검수원이 펜을 내려놓는다. 아이가 연을 받아 들고, 아이 엄마가 당신에게 동전 몇 개를 쥐여 준다. 거절하기엔 손이 너무 단단하다.', 'He sets the pen down. The child takes the kite back, and the mother presses a few coins into your hand, too firmly to refuse.'),
          effects: [{ kind: 'axis', axis: 'humanity' }, { kind: 'credits', amount: 12 }],
        },
        failure: {
          text: t('“사유는 제가 정합니다.” 검수원이 다시 펜을 든다. 아이가 당신 소매를 놓는다.', '“I decide the reason.” He picks up the pen again. The child lets go of your sleeve.'),
          effects: [{ kind: 'hp', amount: -2 }],
        },
      },
      {
        label: t('서식이 끝나기 전에 연을 들고 뛴다', 'Grab the kite and run before the form is done'),
        hint: t('지배 +1 · 추적 +5 · 소모품 1개', '+1 Dominance · +5 Trace · 1 consumable'),
        success: {
          text: t('연 꼬리를 쥐고 컨테이너 사이로 뛴다. 아이에게 연을 넘기는 사이, 압류 대기 상자에서 쓸 만한 물건 하나가 굴러 나온다.', 'You run through the containers with the kite tail in your fist. As you hand it to the child, something useful rolls out of the seizure bin.'),
          effects: [{ kind: 'axis', axis: 'dominance' }, { kind: 'trace', amount: 5 }, { kind: 'consumable' }],
        },
      },
      {
        label: t('린위에가 사유 칸 대신 금액 칸을 짚는다', 'Lin Yue points at the value box, not the reason'),
        hint: t('추적 −4 · 린위에 유대 +1', '−4 Trace · Lin Yue bond +1'),
        requires: { companion: 'lin_yue' },
        success: {
          text: t('린위에가 서식을 넘겨다본다. “압류하려면 가액을 적어야 해. 이 연 얼마야?” 검수원이 펜을 든 채 멈춘다. 값을 매길 수 없는 물건은 압류 대상이 아니다. 연이 아이에게 돌아간다.', 'Lin Yue reads over his shoulder. “To seize it you have to enter a value. What’s this kite worth?” The pen stops. An item with no value can’t be seized. The kite goes back to the child.'),
          effects: [{ kind: 'trace', amount: -4 }, { kind: 'bond', id: 'lin_yue', amount: 1 }],
        },
      },
    ],
    gmHints: ['rookie customs inspector', 'child’s kite', 'reason box on the form'],
  },
  {
    id: 'sea4_ev_container_kitchen',
    acts: [4],
    route: 'sea_4',
    title: t('비운영 연료 설비', 'Non-Operating Fuel Equipment'),
    image: 'v2/events/sea4_ev_container_kitchen.webp',
    text: t(
      '빈 컨테이너 하나가 하역조의 부엌이다. 교대 시간마다 여기서 밥을 짓는다. 오늘 아침 세관이 버너에 봉인을 붙였다. “비운영 항만 연료 설비.” 냄비에는 불리기만 한 쌀이 그대로 있다.',
      'One empty container is the crew’s kitchen; rice is cooked here at every shift change. This morning Customs sealed the burner: “Fuel equipment, non-operating port.” In the pot, the rice is soaked and never cooked.',
    ),
    options: [
      {
        label: t('봉인을 떼지 않고 버너 밑으로 선을 돌린다', 'Run a line under the burner without breaking the seal'),
        hint: t('지능 8 · 성공 파티 회복 6 · 실패 HP −4', 'INT 8 · success: party heals 6 · fail: −4 HP'),
        check: { stat: 'int', dc: 8 },
        success: {
          text: t('봉인은 그대로 붙어 있다. 불은 그 아래에서 켜진다. 밥이 된다. 하역조가 당신 그릇부터 채운다.', 'The seal stays in place; the flame lights beneath it. The rice cooks, and the crew fill your bowl first.'),
          effects: [{ kind: 'heal_party', amount: 6 }],
        },
        failure: {
          text: t('연결부가 새면서 불꽃이 손등을 핥는다. 봉인은 무사하다.', 'The joint leaks and a flame licks the back of your hand. The seal is fine.'),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('세관 이의 신청서를 대신 써 준다', 'Write the customs objection for them'),
        hint: t('크레딧 −10 · 카드 1장 선택', '−10 ₵ · pick 1 card'),
        requires: { minCredits: 10 },
        success: {
          text: t('인지값을 당신이 낸다. 신청서가 접수되는 동안 반장이 낡은 작업 수첩을 건넨다. 하역 순서를 적어 둔 것이다.', 'You pay the stamp fee. While the objection is logged, the foreman hands you a worn work notebook full of loading orders.'),
          effects: [{ kind: 'credits', amount: -10 }, { kind: 'card_choice' }],
        },
      },
      {
        label: t('무진이 냄비를 크레인 배기구 위에 올린다', 'Mujin sets the pot on the crane’s exhaust'),
        hint: t('HP +6 · 무진 유대 +1', '+6 HP · Mujin bond +1'),
        requires: { companion: 'mujin' },
        success: {
          text: t('무진이 크레인 시동을 건다. 배기구가 데워진다. 아무 말 없이 냄비를 올린다. 밥은 조금 탄다. 아무도 불평하지 않는다.', 'Mujin starts the crane, and the exhaust warms. He sets the pot on it without a word. The rice burns a little. Nobody complains.'),
          effects: [{ kind: 'hp', amount: 6 }, { kind: 'bond', id: 'mujin', amount: 1 }],
        },
      },
      {
        label: t('불린 쌀을 두고 나온다', 'Leave the soaked rice'),
        hint: t('추적 −2', '−2 Trace'),
        success: {
          text: t('컨테이너 문을 닫아 준다. 세관 순찰이 안을 들여다보지 않고 지나간다.', 'You close the container door for them. The customs patrol passes without looking in.'),
          effects: [{ kind: 'trace', amount: -2 }],
        },
      },
      {
        label: t('수아가 휴대 화로로 냄비를 데운다', 'Su-ah heats the pot on her travel forge'),
        hint: t('파티 회복 6 · 수아 유대 +1', 'Party heals 6 · Su-ah bond +1'),
        requires: { companion: 'su_ah' },
        success: {
          text: t('수아가 작은 화로를 꺼내 숯을 붙인다. “연료 설비는 버너잖아. 이건 대장간이야.” 쌀이 끓는다. 하역조가 수아 그릇부터 채운다.', 'Su-ah takes out a small forge and lights the coals. “The seal’s on the burner. This is a smithy.” The rice boils, and the crew fill her bowl first.'),
          effects: [{ kind: 'heal_party', amount: 6 }, { kind: 'bond', id: 'su_ah', amount: 1 }],
        },
      },
    ],
    gmHints: ['empty container kitchen', 'sealed burner', 'shift-change rice'],
  },
  // 2026-11-05: Sea Act 6 had 20 ungated events. Three causeway scenes, one prop each.
  {
    id: 'sea6_ev_rail_salt',
    acts: [6],
    route: 'sea_6',
    title: t('난간의 소금', 'Salt on the Rail'),
    image: 'v2/events/sea6_ev_rail_salt.webp',
    text: t(
      '철탑 길 난간에 소금이 두껍게 앉아 있다. 등대단원 하나가 교대마다 주걱으로 긁어낸다. 소금이 쌓이면 손이 미끄러지고, 안개 속에서 난간을 놓치면 아래는 물이다. “하루라도 거르면 다음 사람이 미끄러져요.”',
      'Salt crusts the causeway railing. One of the Keepers scrapes it off with a paddle every shift. Let it build and hands slip, and anyone who loses the rail in the fog goes into the water below. “Skip one day and the next person slips.”',
    ),
    options: [
      {
        label: t('주걱을 받아 다음 구간을 긁는다', 'Take a paddle and scrape the next stretch'),
        hint: t('근력 8 · 성공 회복력 +1 · 파티 회복 5', 'STR 8 · success: +1 Resilience · party +5 HP'),
        check: { stat: 'str', dc: 8 },
        success: {
          text: t('소금이 판 째로 떨어져 나간다. 다 긁고 나니 등대단원이 보온병 뚜껑에 따뜻한 물을 따라 일행에게 돌린다.', 'The salt comes off in sheets. When you finish, the Keeper pours warm water into a flask cap and passes it round your party.'),
          effects: [{ kind: 'axis', axis: 'resilience' }, { kind: 'heal_party', amount: 5 }],
        },
        failure: {
          text: t('주걱이 미끄러져 손등이 난간 모서리에 긁힌다. 소금이 상처에 스민다.', 'The paddle slips and the back of your hand scrapes the rail’s edge. Salt gets into the cut.'),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('긁어낸 소금을 자루에 담아 간다', 'Bag the scraped salt to sell'),
        hint: t('크레딧 +16', '+16 ₵'),
        success: {
          text: t('등대단원이 말리지 않는다. “어차피 내일 또 앉아요.” 자루가 생각보다 무겁다.', 'The Keeper doesn’t stop you. “It’ll settle again tomorrow.” The bag is heavier than you expected.'),
          effects: [{ kind: 'credits', amount: 16 }],
        },
      },
      {
        label: t('난간을 놓지 않고 그대로 지나간다', 'Keep a hand on the rail and walk on'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('손바닥이 소금에 쓸린다. 안개가 당신을 등대단원과 구분하지 못한다. 순찰 표지기가 그냥 지나간다.', 'The salt scours your palm. In the fog you look like any Keeper, and the patrol marker passes you by.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
    ],
    gmHints: ['salt-crusted causeway railing', 'Keeper with a scraping paddle', 'fog over the water below'],
  },
  {
    id: 'sea6_ev_spare_bulbs',
    acts: [6],
    route: 'sea_6',
    title: t('여분의 전구', 'Spare Bulbs'),
    image: 'v2/events/sea6_ev_spare_bulbs.webp',
    text: t(
      '등대단 창고 선반에 다 쓴 전구가 줄지어 있다. 버리지 않는다. 전구마다 꺼진 해가 적혀 있다. 맨 끝에 아직 쓰지 않은 전구 몇 개가 상자째 남아 있다. 창고지기가 장부를 펼친다. “가져가려면 꺼진 걸 하나 대신 두고 가요.”',
      'On the Keepers’ storeroom shelf, burnt-out bulbs stand in rows. None are thrown away; each is labelled with the year it went dark. At the end, a few unused bulbs are still in their box. The storekeeper opens a ledger. “Take one, and leave a dead one in its place.”',
    ),
    options: [
      {
        label: t('가진 고물 하나를 꺼진 전구 자리에 둔다', 'Leave a piece of your scrap in place of a dead bulb'),
        hint: t('소모품 1개 · 추적 +3', '1 consumable · +3 Trace'),
        success: {
          text: t('창고지기가 고물을 들어 보고 장부에 적는다. “꺼진 해는 오늘.” 새 전구 하나가 당신 가방에 들어간다.', 'The storekeeper weighs your scrap and logs it: “Went dark: today.” A new bulb goes into your bag.'),
          effects: [{ kind: 'consumable' }, { kind: 'trace', amount: 3 }],
        },
      },
      {
        label: t('장부에서 전구가 가장 많이 꺼진 해를 찾는다', 'Find the year the most bulbs went dark'),
        hint: t('관찰 9 · 성공 통찰 +1 · 카드 1장 선택', 'OBS 9 · success: +1 Insight · pick 1 card'),
        check: { stat: 'obs', dc: 9 },
        success: {
          text: t('한 해에 전구가 서른 개 넘게 꺼졌다. 그해 등대는 밤새 최대 출력으로 켜져 있었다. 장부 여백에 그날의 대응 순서가 적혀 있다.', 'In one year more than thirty bulbs burned out; the light ran at full power every night. In the margin, someone wrote down how they held.'),
          effects: [{ kind: 'axis', axis: 'insight' }, { kind: 'card_choice' }],
        },
        failure: {
          text: t('숫자가 안개에 젖어 번진다. 창고지기가 장부를 덮는다.', 'The numbers are blurred with fog-damp. The storekeeper closes the ledger.'),
          effects: [{ kind: 'hp', amount: -2 }],
        },
      },
      {
        label: t('서하가 전구 하나의 해를 읽는다', 'Seo-ha reads the year on one bulb'),
        hint: t('HP +6 · 서하 유대 +1', '+6 HP · Seo-ha bond +1'),
        requires: { companion: 'seo_ha' },
        success: {
          text: t('서하가 전구를 오래 들고 있다. “내가 마지막으로 배를 들여보낸 해구나.” 서하가 그 전구를 선반 앞쪽으로 옮겨 놓는다.', 'Seo-ha holds the bulb a long time. “The year I brought in my last ship.” She moves it to the front of the shelf.'),
          effects: [{ kind: 'hp', amount: 6 }, { kind: 'bond', id: 'seo_ha', amount: 1 }],
        },
      },
      {
        label: t('한이 꺼진 전구를 귀로 하나씩 대 본다', 'Han holds each dead bulb up to his ear'),
        hint: t('소모품 1개 · 한 유대 +1', '1 consumable · Han bond +1'),
        requires: { companion: 'han' },
        success: {
          text: t('한이 전구를 하나씩 흔들어 귀에 댄다. 다섯 번째에서 멈춘다. “이건 필라멘트가 살아 있어. 꺼진 게 아니라 뺀 거야.” 창고지기가 장부를 고치고, 그 전구를 당신 가방에 넣어 준다.', 'Han shakes each bulb by his ear and stops at the fifth. “The filament’s fine. This one didn’t burn out. Someone pulled it.” The storekeeper corrects the ledger and puts the bulb in your bag.'),
          effects: [{ kind: 'consumable' }, { kind: 'bond', id: 'han', amount: 1 }],
        },
      },
    ],
    gmHints: ['Keepers’ storeroom', 'burnt-out bulbs labelled by year', 'storekeeper’s ledger'],
  },
  {
    id: 'sea6_ev_one_way',
    acts: [6],
    route: 'sea_6',
    title: t('편도', 'One Way'),
    image: 'v2/events/sea6_ev_one_way.webp',
    text: t(
      '철탑 길 입구에 매표소가 있다. 다니는 배는 없다. 매표원은 그래도 표를 끊는다. 행선지는 하나뿐이다. “등대, 편도.” 돌아오는 표는 팔지 않는다. “돌아오는 사람은 표가 필요 없어서요.”',
      'At the head of the causeway stands a ticket booth. No boats run, but the clerk still punches tickets, all to one place: “Lighthouse, one way.” There are no return tickets. “People who come back don’t need one.”',
    ),
    options: [
      {
        label: t('편도표를 한 장 산다', 'Buy a one-way ticket'),
        hint: t('크레딧 −12 · 카드 1장 선택', '−12 ₵ · pick 1 card'),
        requires: { minCredits: 12 },
        success: {
          text: t('매표원이 표에 구멍을 뚫는다. 뒷면에 철탑 길의 안개 대피 지점이 인쇄되어 있다. 아무도 읽지 않는 면이다.', 'The clerk punches the ticket. On the back is a map of the causeway’s fog shelters, the side nobody reads.'),
          effects: [{ kind: 'credits', amount: -12 }, { kind: 'card_choice' }],
        },
      },
      {
        label: t('“돌아온 사람이 정말 있어요?”', '“Has anyone actually come back?”'),
        hint: t('매력 9 · 성공 인간성 +1 · ◈ +5', 'CHA 9 · success: +1 Humanity · +5 ◈'),
        check: { stat: 'cha', dc: 9 },
        success: {
          text: t('매표원이 서랍을 연다. 쓰지 않은 돌아오는 표가 한 묶음 있다. 직접 만든 것이다. “혹시 몰라서요.” 한 장을 당신에게 건넨다.', 'The clerk opens a drawer: a bundle of unused return tickets, handmade. “Just in case.” One goes to you.'),
          effects: [{ kind: 'axis', axis: 'humanity' }, { kind: 'echoes', amount: 5 }],
        },
        failure: {
          text: t('매표원이 창구 가림막을 내린다. “다음 손님.”', 'The clerk lowers the window shade. “Next.”'),
          effects: [{ kind: 'trace', amount: 3 }],
        },
      },
      {
        label: t('파랑이 표 한 장을 알아본다', 'Parang recognises a ticket'),
        hint: t('◈ +6 · 파랑 유대 +1', '+6 ◈ · Parang bond +1'),
        requires: { companion: 'parang' },
        success: {
          text: t('파랑이 창구에 붙은 견본 표를 가리킨다. “이거 쥐고 있었어. 내 손 말고, 그 사람 손.” 매표원이 견본을 떼어 파랑에게 준다.', 'Parang points at the sample ticket taped to the window. “I held this. Not my hand. Theirs.” The clerk peels it off and gives it to Parang.'),
          effects: [{ kind: 'echoes', amount: 6 }, { kind: 'bond', id: 'parang', amount: 1 }],
        },
      },
      {
        label: t('표를 사지 않고 지나간다', 'Walk past without a ticket'),
        hint: t('HP +4', '+4 HP'),
        success: {
          text: t('매표소 처마 밑에서 잠깐 안개를 피한다. 숨이 고르다.', 'You shelter from the fog under the booth’s eaves for a moment and get your breath back.'),
          effects: [{ kind: 'hp', amount: 4 }],
        },
      },
      {
        label: t('카이가 모두의 돌아오는 표를 부탁한다', 'Kai asks for return tickets for everyone'),
        hint: t('◈ +5 · 카이 유대 +1', '+5 ◈ · Kai bond +1'),
        requires: { companion: 'kai' },
        success: {
          text: t('카이가 창구에 손을 얹는다. “돌아오는 표 주세요. 일행 전부요.” 매표원이 한참 보다가 서랍을 연다. 손으로 만든 표를 사람 수대로 세어 건넨다.', 'Kai rests a hand on the counter. “Return tickets, please. For all of us.” The clerk looks at him a long while, then opens a drawer and counts out handmade tickets, one for each of you.'),
          effects: [{ kind: 'echoes', amount: 5 }, { kind: 'bond', id: 'kai', amount: 1 }],
        },
      },
    ],
    gmHints: ['causeway ticket booth', 'one-way tickets to the lighthouse', 'handmade return tickets'],
  },
  // 2026-11-05: Sea Act 5 was the thinnest pool left (21). Three everyday tide-line scenes, one prop each.
  {
    id: 'sea5_ev_flood_line',
    acts: [5],
    route: 'sea_5',
    title: t('오늘의 물 높이', 'Today’s Water Line'),
    image: 'v2/events/sea5_ev_flood_line.webp',
    text: t(
      '매립지 주택 계단 벽에 분필 선이 층층이 그어져 있다. 밀물마다 물이 닿은 자리에 그날 날짜를 적는다. 오늘 선은 어제보다 한 뼘 높다. 2층 할머니가 침대를 3층으로 올려야 한다며 계단에 앉아 있다.',
      'Chalk lines climb the stairwell wall of the reclamation estate. At every flood, residents mark where the water reached and write the date. Today’s line is a hand higher than yesterday’s. The old woman from the second floor sits on the stairs; her bed has to go up to the third.',
    ),
    options: [
      {
        label: t('침대를 3층까지 같이 들어 올린다', 'Carry the bed up to the third floor with her'),
        hint: t('근력 9 · 성공 인간성 +1 · 파티 +5 HP', 'STR 9 · success: +1 Humanity · party +5 HP'),
        check: { stat: 'str', dc: 9 },
        success: {
          text: t('침대가 3층 복도에 놓인다. 할머니가 분필을 꺼내 당신 이름 대신 “도와준 사람”이라고 벽에 적는다. 그리고 보리차를 끓여 일행에게 돌린다.', 'The bed reaches the third-floor hall. She takes out her chalk and writes “the one who helped” on the wall instead of your name, then brews barley tea for your party.'),
          effects: [{ kind: 'axis', axis: 'humanity' }, { kind: 'heal_party', amount: 5 }],
        },
        failure: {
          text: t('계단참에서 침대 다리가 미끄러진다. 정강이가 난간에 부딪힌다. 할머니가 다음 썰물까지 기다리자고 한다.', 'A bed leg slips on the landing and your shin hits the rail. She says to wait for the next ebb.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('분필 선들로 다음 밀물 시각을 읽는다', 'Read the next flood time from the chalk lines'),
        hint: t('지능 9 · 성공 추적 −4 · 통찰 +1', 'INT 9 · success: −4 Trace · +1 Insight'),
        check: { stat: 'int', dc: 9 },
        success: {
          text: t('날짜와 높이를 이어 보면 물이 오는 간격이 보인다. 다음 밀물 전에 큰길을 피해 갈 수 있다.', 'Line up the dates and heights and the interval shows. You can be off the main road before the next flood.'),
          effects: [{ kind: 'trace', amount: -4 }, { kind: 'axis', axis: 'insight' }],
        },
        failure: {
          text: t('선이 너무 많다. 계산이 끝나기 전에 계단 아래로 회색 물이 스민다. 서둘러 올라간다.', 'There are too many lines. Before you finish, gray water seeps up the bottom step and you climb fast.'),
          effects: [{ kind: 'trace', amount: 3 }],
        },
      },
      {
        label: t('위층 빈집에서 쉬어 간다', 'Rest in an empty flat upstairs'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('젖지 않은 방바닥에 등을 댄다. 아래층에서 물 빠지는 소리가 난다.', 'You lie back on a dry floor. Downstairs, the water drains away.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
      {
        label: t('태오가 침대를 혼자 들어 올린다', 'Tae-o lifts the bed by himself'),
        hint: t('인간성 +1 · 태오 유대 +1', '+1 Humanity · Tae-o bond +1'),
        requires: { companion: 'tae_o' },
        success: {
          text: t('태오가 말없이 침대를 어깨에 올린다. 계단참에서 한 번도 멈추지 않는다. 할머니가 3층 벽에 분필로 “말 없는 사람”이라고 적는다.', 'Tae-o shoulders the bed without a word and never stops on the landings. On the third-floor wall, the old woman chalks “the quiet one.”'),
          effects: [{ kind: 'axis', axis: 'humanity' }, { kind: 'bond', id: 'tae_o', amount: 1 }],
        },
      },
    ],
    gmHints: ['chalk flood marks on a stairwell', 'old woman moving her bed upstairs', 'gray water at the bottom step'],
  },
  {
    id: 'sea5_ev_stray_sweater',
    acts: [5],
    route: 'sea_5',
    title: t('주인 없는 스웨터', 'The Sweater Nobody Owns'),
    image: 'v2/events/sea5_ev_stray_sweater.webp',
    text: t(
      '썰물 사이 매립지 옥상마다 빨래가 걸린다. 한 줄 끝에 아무도 걸지 않은 스웨터가 매번 걸려 있다. 밀물이 지나가면 다시 나타난다. 동네 사람들은 그 스웨터를 걷지 않는다. 손에 닿으면 남의 겨울이 기억난다고 한다.',
      'Between tides, washing goes up on every rooftop of the reclamation estate. At the end of one line hangs a sweater nobody hung, every time; after each flood it is back. The neighbors never take it in. Touch it, they say, and you remember someone else’s winter.',
    ),
    options: [
      {
        label: t('소매 안쪽에 남은 이름표를 찾는다', 'Look inside the cuff for a name tag'),
        hint: t('관찰 9 · 성공 ◈ +6 · 인간성 +1', 'OBS 9 · success: +6 ◈ · +1 Humanity'),
        check: { stat: 'obs', dc: 9 },
        success: {
          text: t('소매 안쪽에 실로 수놓은 성 한 글자. 옆 줄 빨래를 걷던 남자가 그 글자를 보고 한참 서 있다. “우리 형이 이렇게 꿰맸어요.” 남자가 스웨터를 걷어 간다.', 'One surname character stitched inside the cuff. A man taking in the next line stops and stares at it. “My brother sewed his like that.” He takes the sweater in.'),
          effects: [{ kind: 'echoes', amount: 6 }, { kind: 'axis', axis: 'humanity' }],
        },
        failure: {
          text: t('손끝이 소매에 닿는다. 모르는 사람의 손 시린 아침이 잠깐 당신 것이 된다. 그러고는 빠져나간다.', 'Your fingertips touch the cuff. A stranger’s cold-handed morning is yours for a moment, then gone.'),
          effects: [{ kind: 'hp', amount: -3 }],
        },
      },
      {
        label: t('빨래집게를 하나 더 물려 둔다', 'Add a second peg so it won’t blow away'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('스웨터가 바람에 덜 흔들린다. 옥상 아래 순찰 드론이 움직이는 빨래만 세고 지나간다.', 'The sweater sways less. The patrol drone below counts only the moving washing and passes on.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('옆 줄 빨래를 걷는 걸 돕는다', 'Help take in the next line'),
        hint: t('크레딧 +12', '+12 ₵'),
        success: {
          text: t('빨래 주인이 고맙다며 동전을 쥐여 준다. 스웨터 쪽은 쳐다보지 않는다.', 'The owner of the washing presses some coins on you, and doesn’t look at the sweater.'),
          effects: [{ kind: 'credits', amount: 12 }],
        },
      },
    ],
    gmHints: ['rooftop washing lines between tides', 'a sweater that returns after each flood', 'neighbors who won’t touch it'],
  },
  {
    id: 'sea5_ev_plank_toll',
    acts: [5],
    route: 'sea_5',
    title: t('널빤지 통행료', 'The Plank Toll'),
    image: 'v2/events/sea5_ev_plank_toll.webp',
    text: t(
      '바지선과 바지선 사이에 널빤지가 걸려 있다. 아이 하나가 널빤지 끝에 앉아 통행료를 받는다. 한 장에 1크레딧이다. 아이가 널빤지 수를 손가락으로 센다. “여기서 시장 끝까지 열한 장. 물에 빠지면 환불 없어요.”',
      'Planks bridge the gaps between the barges. A kid sits at the end of one, taking tolls: one credit a plank. The kid counts on their fingers. “Eleven planks from here to the end of the market. Fall in, no refund.”',
    ),
    options: [
      {
        label: t('열한 장 값을 한꺼번에 낸다', 'Pay for all eleven at once'),
        hint: t('크레딧 −11 · 카드 강화 1', '−11 ₵ · upgrade 1 card'),
        requires: { minCredits: 11 },
        success: {
          text: t('아이가 동전을 세고 나서 귓속말을 한다. 일곱 번째 널빤지는 밟지 말라고. 그 옆 밧줄을 잡는 법도 보여 준다. 균형 잡는 요령이 몸에 남는다.', 'The kid counts the coins, then whispers: don’t step on the seventh plank. The kid shows you how to grip the rope beside it, and the balance stays in your body.'),
          effects: [{ kind: 'credits', amount: -11 }, { kind: 'upgrade_card', count: 1, random: true }],
        },
      },
      {
        label: t('널빤지 대신 밧줄을 타고 건넌다', 'Cross on the ropes instead of the planks'),
        hint: t('민첩 9 · 성공 민첩 +1 · 실패 HP −6', 'AGI 9 · success: +1 AGI · fail: −6 HP'),
        check: { stat: 'agi', dc: 9 },
        success: {
          text: t('밧줄이 출렁인다. 바지선 끝까지 버틴다. 아이가 박수를 친다. “통행료 면제.”', 'The ropes sway. You hold on to the last barge. The kid claps. “Toll waived.”'),
          effects: [{ kind: 'stat', stat: 'agi', amount: 1 }],
        },
        failure: {
          text: t('손이 미끄러져 회색 물에 무릎까지 빠진다. 아이가 장대를 내밀어 끌어 올린다. 물이 닿은 다리가 한동안 남의 걸음으로 저리다.', 'Your grip slips and you drop knee-deep into the gray water. The kid hauls you out with a pole. For a while your leg aches with someone else’s stride.'),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('파랑이 아이와 널빤지를 센다', 'Parang counts the planks with the kid'),
        hint: t('◈ +5 · 파랑 유대 +1', '+5 ◈ · Parang bond +1'),
        requires: { companion: 'parang' },
        success: {
          text: t('파랑이 아이 옆에 앉아 손가락을 같이 접는다. 열 장째에서 파랑이 멈춘다. “전엔 열두 장이었어.” 아이가 고개를 끄덕인다. “하나는 지난 밀물에 떠내려갔어요.” 아이가 통행료를 받지 않는다.', 'Parang sits beside the kid and folds fingers along. At ten, Parang stops. “There used to be twelve.” The kid nods. “One washed away last flood.” The kid waves off the toll.'),
          effects: [{ kind: 'echoes', amount: 5 }, { kind: 'bond', id: 'parang', amount: 1 }],
        },
      },
      {
        label: t('방파제를 돌아 먼 길로 간다', 'Take the long way round by the breakwater'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('방파제 길은 젖어 있고 아무도 없다. 시장의 소란이 등 뒤로 멀어진다. 아이가 다음 손님을 부른다.', 'The breakwater path is wet and empty. The market noise falls away behind you. The kid calls the next customer.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('세린이 아이와 밧줄 요령을 바꾼다', 'Se-rin trades rope tricks with the kid'),
        hint: t('◈ +4 · 세린 유대 +1', '+4 ◈ · Se-rin bond +1'),
        requires: { companion: 'se_rin' },
        success: {
          text: t('세린이 밧줄 매듭 하나를 아이에게 보여 준다. 아이가 일곱 번째 널빤지 비밀을 알려 준다. “통행료는?” “방금 냈잖아.”', 'Se-rin shows the kid one rope knot; the kid tells her the secret of the seventh plank. “What about the toll?” “You just paid it.”'),
          effects: [{ kind: 'echoes', amount: 4 }, { kind: 'bond', id: 'se_rin', amount: 1 }],
        },
      },
    ],
    gmHints: ['planks between barges', 'kid taking a toll per plank', 'gray water between the hulls'],
  },
]
