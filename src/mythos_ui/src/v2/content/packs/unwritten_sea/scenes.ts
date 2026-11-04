// Pack 5 — six authored scenes. The three logs are the way to the secret fight (engine/run.ts SEA_LOGS); IX and the
// Lightkeeper's scenes carry the core truth of docs/plans/2026-11-01-dlc3-bible.md. No improvising here.
import type { EventDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const SEA_SCENES: EventDef[] = [
  {
    id: 'sea_log_1',
    acts: [4],
    route: 'sea_4',
    improvise: false,
    weight: 3,
    title: t('압류품 3047호', 'Seized Item 3047'),
    image: 'v2/events/sea_log_1.webp',
    gmHints: ['세관 창고의 철제 선반', '압류 딱지가 붙은 공책', '물에 젖었다 마른 종이'],
    text: t(
      '세관 창고 맨 아래 선반에 공책 한 권이 있다. 압류 딱지가 세 겹으로 붙었다.\n종이는 젖었다 마른 듯 울어 있다. 첫 장에 손글씨가 있다.\n“오늘도 물은 방파제 셋째 돌까지. 열두 초마다 돌림. 이상 없음.”\n날짜는 네오서울이 세워지기 이십 년 전이다.',
      'A notebook sits on the bottom shelf of the customs store. Seizure tags cover it three layers deep.\nThe pages have the wavy look of paper that was wet once. Handwriting on the first page:\n“Water to the third stone of the breakwater again today. Turned every twelve seconds. Nothing to report.”\nThe date is twenty years before Neo-Seoul was founded.',
    ),
    options: [
      {
        label: t('딱지를 뜯고 공책을 챙긴다', 'Tear off the tags and take it'),
        hint: t('추적 +8 · 일지를 얻는다', '+8 Trace · you keep the log'),
        success: { text: t('테이프 뜯는 소리가 창고 끝까지 간다. 공책은 생각보다 무겁다.', 'The tape’s rip carries to the end of the store. The notebook is heavier than it looks.'), effects: [{ kind: 'trace', amount: 8 }, { kind: 'flag', key: 'sea_log_1' }, { kind: 'axis', axis: 'insight' }] },
      },
      {
        label: t('마지막 쪽만 읽고 제자리에 둔다', 'Read the last page and put it back'),
        hint: t('추적 −3 · 일지는 두고 간다', '−3 Trace · the log stays here'),
        success: { text: t('마지막 쪽에는 한 줄뿐이다. “약속대로 지도에서 뺐다. 이제 아무도 오지 않을 것이다.”', 'The last page has one line. “Taken off the map as promised. Nobody will come now.”'), effects: [{ kind: 'trace', amount: -3 }] },
      },
    ],
  },
  {
    id: 'sea_ix_warning',
    acts: [4],
    route: 'sea_4',
    improvise: false,
    weight: 3,
    requires: { notFlag: 'sea_ix_warned' },
    title: t('수신 양호', 'Reception Clear'),
    image: 'v2/events/sea_ix_warning.webp',
    gmHints: ['녹슨 공중전화', '끊긴 줄', '바닥의 소금 결정'],
    text: t(
      '부두 끝 공중전화가 울린다. 수화기 줄은 잘려 바닥에 늘어져 있다.\n“여기까지 오실 줄은 몰랐습니다.” 익숙한 목소리다. 처음 듣는 말투다. “당신을 말리는 것은 제 업무가 아닙니다. 이것은 부탁입니다.”\n“돌아가십시오. 그곳에 있는 것은 제가 지운 것이 아닙니다. 제가 맡긴 것입니다.”',
      'A payphone rings at the end of the wharf. Its handset cord is cut and trailing on the ground.\n“I did not expect you this far.” A familiar voice, in a tone you have never heard. “Stopping you is not my job. This is a request.”\n“Go back. What lies there is nothing I erased. It is something I left in safekeeping.”',
    ),
    options: [
      {
        label: t('“맡긴 게 뭐지?”', '“Left what?”'),
        hint: t('통찰 +1', '+1 Insight lean'),
        success: { text: t('긴 침묵 뒤에 전화가 끊긴다. 벨 소리만 몇 번 더 울린다. IX가 망설이는 소리를 들은 것은 처음이다.', 'A long silence, then the line drops. It rings a few more times by itself. You have never heard IX hesitate.'), effects: [{ kind: 'axis', axis: 'insight' }, { kind: 'flag', key: 'sea_ix_warned' }] },
      },
      {
        label: t('수화기를 내려놓는다', 'Hang up'),
        hint: t('회복력 +1 · 추적 −6', '+1 Resilience lean · −6 Trace'),
        success: { text: t('수화기를 걸자 벨이 멎는다. 뒤에서 하역조 사람들이 교대를 시작한다. 누구도 전화를 쳐다보지 않는다.', 'The ringing stops when you hang up. Behind you the longshore crew start their shift. Nobody looks at the phone.'), effects: [{ kind: 'axis', axis: 'resilience' }, { kind: 'trace', amount: -6 }, { kind: 'flag', key: 'sea_ix_warned' }] },
      },
    ],
  },
  {
    id: 'sea_log_2',
    acts: [5],
    route: 'sea_5',
    improvise: false,
    weight: 3,
    title: t('값은 어느 쪽이든 같네', 'The Price Is the Same Either Way'),
    image: 'v2/events/sea_log_2.webp',
    gmHints: ['출렁이는 바지선 좌판', '돋보기를 이마에 올린 노인', '라벨 없는 병'],
    text: t(
      '바지선 시장 끝 좌판에 낯익은 노인이 앉아 있다. 돋보기를 이마로 올린다.\n“결국 왔구먼. 그 병, 여기서 뜬 거라네.” 노인이 발치의 물을 가리킨다. 병마다 빛이 한 점씩 있다.\n“팔러 왔나, 사러 왔나.” 노인이 공책 한 권을 무릎에 올린다. 당신 것과 같은 필체다.\n“이걸 쓴 사람 값은 안 받겠네. 대신 하나 놓고 가게.”',
      'At the end of the barge market a familiar old man sits at his stall. He pushes his magnifier up onto his forehead.\n“You came after all. That bottle was drawn right here.” He points at the water by his feet. Each bottle holds one point of light.\n“Selling or buying?” He sets a notebook on his knee. The handwriting matches yours.\n“I’ll take nothing for the one who wrote this. Just leave something behind.”',
    ),
    options: [
      {
        label: t('가장 소중한 기억 하나를 병에 담는다', 'Bottle one memory you treasure'),
        hint: t('최대 HP −4 · 일지를 얻는다', '−4 max HP · you get the log'),
        success: { text: t('뚜껑이 닫힌 뒤에는 무엇을 넣었는지 생각나지 않는다. 노인이 라벨에 이름만 적는다. 당신 이름이다.', 'Once the lid closes you cannot recall what went in. The old man writes only a name on the label. Yours.'), effects: [{ kind: 'maxHp', amount: -4 }, { kind: 'flag', key: 'sea_log_2' }, { kind: 'axis', axis: 'humanity' }] },
      },
      {
        label: t('돈으로 낸다', 'Pay with money'),
        requires: { minCredits: 80 },
        hint: t('−80 ₵ · 일지를 얻는다', '−80 ₵ · you get the log'),
        success: { text: t('노인이 동전을 세지도 않고 물에 던진다. “물은 원래 공짜라네.” 공책을 건넨다.', 'He throws the coins in the water without counting. “Water was always free.” He hands you the notebook.'), effects: [{ kind: 'credits', amount: -80 }, { kind: 'flag', key: 'sea_log_2' }, { kind: 'axis', axis: 'dominance' }] },
      },
      {
        label: t('그냥 지나간다', 'Walk on'),
        hint: t('추적 −3', '−3 Trace'),
        success: { text: t('노인이 돋보기를 도로 내린다. “또 오게. 물은 또 들어오니까.”', 'He lowers the magnifier. “Come again. The water will.”'), effects: [{ kind: 'trace', amount: -3 }] },
      },
    ],
  },
  {
    id: 'sea_drowned_roll',
    acts: [5],
    route: 'sea_5',
    improvise: false,
    weight: 3,
    title: t('젖은 명단', 'The Wet Roll'),
    image: 'v2/events/sea_drowned_roll.webp',
    gmHints: ['잠긴 주택가 계단', '물에 뜬 종이', '이름을 묻는 사람의 형상'],
    text: t(
      '잠긴 주택가 계단에 사람 형상 하나가 서 있다. 젖은 명단을 손에 들고 물이 닿는 데까지만 올라와 있다.\n잔류물이다. 공격하지 않는다. 당신을 보더니 입을 연다.\n“제 이름이 여기 있습니까?”\n명단은 물에 번져 거의 읽을 수 없다. 앞사람들이 똑같이 묻고 돌아간 자국이 계단에 남았다.',
      'A human shape stands on a flooded street’s stairs. It holds a wet roll and has climbed only as far as the water reaches.\nResidue. It does not attack. It sees you and opens its mouth.\n“Is my name on here?”\nThe roll has bled almost past reading. The steps show where others asked the same and went back down.',
    ),
    options: [
      {
        label: t('글자를 끝까지 읽어 준다', 'Read it through, every letter'),
        check: { stat: 'obs', dc: 9 },
        hint: t('관찰 9 · 성공 파티 회복 8 · 실패 −6 HP', 'OBS 9 · success: heal party 8 · fail: −6 HP'),
        success: { text: t('번진 획 사이에서 이름 하나가 나온다. 형상이 그 이름을 두 번 되뇌고 물속으로 내려간다. 물이 잠시 맑아진다.', 'A name surfaces between the bled strokes. The shape repeats it twice and goes down into the water. For a moment the water clears.'), effects: [{ kind: 'heal_party', amount: 8 }, { kind: 'axis', axis: 'humanity' }] },
        failure: { text: t('읽는 동안 남의 기억이 밀려든다. 정신이 들었을 때 당신은 물에 무릎까지 들어와 있다.', 'Someone else’s memories flood in as you read. When you come to, you are knee-deep.'), effects: [{ kind: 'hp', amount: -6 }] },
      },
      {
        label: t('“있어.” 거짓말을 한다', '“It’s here.” Lie'),
        hint: t('추적 −6', '−6 Trace'),
        success: { text: t('형상이 고개를 숙인다. 고맙다는 말 대신 명단을 건네고 내려간다. 종이가 손에서 물로 풀린다.', 'The shape bows its head. Instead of thanks it hands you the roll and goes down. The paper turns to water in your hand.'), effects: [{ kind: 'trace', amount: -6 }, { kind: 'axis', axis: 'dominance' }] },
      },
    ],
  },
  {
    id: 'sea_log_3',
    acts: [6],
    route: 'sea_6',
    improvise: false,
    weight: 3,
    title: t('해저 케이블 기지', 'The Cable Station'),
    image: 'v2/events/sea_log_3.webp',
    gmHints: ['웅웅거리는 해저 케이블', '교대 근무표', '등대단의 기도'],
    text: t(
      '철탑 기지 바닥으로 팔뚝 굵기의 케이블이 물속에서 올라온다. 네오서울 쪽에서 오는 선이다.\n손을 대면 진동이 온다. 지금 이 순간 지워지는 것들이 줄지어 지나간다. 등대단 교대자 하나가 그 옆에 무릎 꿇고 일지를 쓴다.\n“다 여기로 옵니다.” 그가 고개도 들지 않고 말한다. “IX가 지운 것은 전부요. 사라지는 건 없습니다.”',
      'A cable as thick as an arm climbs out of the water through the station floor. It runs from Neo-Seoul.\nIt hums under your hand. Everything being erased right now is passing through. A Keeper on shift kneels beside it, writing in a log.\n“It all comes here,” he says without looking up. “Everything IX erases. Nothing disappears.”',
    ),
    options: [
      {
        label: t('일지를 달라고 한다', 'Ask for the log'),
        check: { stat: 'cha', dc: 9 },
        hint: t('매력 9 · 성공 일지 · 실패 추적 +10', 'CHA 9 · success: the log · fail: +10 Trace'),
        success: { text: t('그가 처음으로 고개를 든다. “교대자가 없어서요.” 쓰던 공책을 덮어 건넨다. 세 권째다.', 'He looks up for the first time. “Nobody’s left to relieve me.” He closes the notebook and hands it over. That makes three.'), effects: [{ kind: 'flag', key: 'sea_log_3' }, { kind: 'axis', axis: 'insight' }] },
        failure: { text: t('그가 공책을 품에 안고 무적을 분다. 안개 저편에서 응답이 온다.', 'He hugs the notebook and sounds a foghorn. An answer comes through the fog.'), effects: [{ kind: 'trace', amount: 10 }] },
      },
      {
        label: t('케이블을 잡고 하나를 건져 올린다', 'Grip the cable and pull one thing out'),
        hint: t('−8 HP · 카드 강화 2 · 일지를 얻는다', '−8 HP · upgrade 2 cards · you get the log'),
        success: { text: t('손바닥이 탄다. 올라온 것은 누군가의 아침이다. 그 사람이 쓴 마지막 일지의 쪽이 같이 딸려 온다.', 'Your palm burns. What comes up is somebody’s morning. A page of their last log comes up with it.'), effects: [{ kind: 'hp', amount: -8 }, { kind: 'upgrade_card', count: 2, random: true }, { kind: 'flag', key: 'sea_log_3' }, { kind: 'axis', axis: 'resilience' }] },
      },
    ],
  },
  {
    id: 'sea_lamp_room',
    acts: [6],
    route: 'sea_6',
    improvise: false,
    weight: 3,
    title: t('램프실 앞', 'Outside the Lamp Room'),
    image: 'v2/events/sea_lamp_room.webp',
    gmHints: ['닳은 나선 계단', '찻잔 두 개', '열두 초마다 도는 빛'],
    text: t(
      '나선 계단 끝 작은 방에 찻잔 두 개가 놓여 있다. 하나는 식었고 하나는 김이 오른다.\n“앉으세요. 오래 걸으셨죠.” 스피커에서 지친 목소리가 난다. “IX는 제가 어렸을 때 처음 만들어 준 친구입니다. 바다를 잊어 달라고 부탁한 건 저였어요.”\n“이게 넘치면 사람들이 익사합니다. 남의 기억에요. 그러니 부디 말해 주세요. 무엇을 하러 오셨습니까.”',
      'At the top of the spiral stairs, two cups sit in a small room. One is cold, one still steams.\n“Sit. You’ve walked a long way.” A tired voice from a speaker. “IX was the first friend I made. Asking it to forget the sea was my idea.”\n“If this overflows, people drown. In other people’s memories. So please tell me. What did you come here to do?”',
    ),
    options: [
      {
        label: t('“돌려주러 왔습니다.”', '“To give it all back.”'),
        hint: t('인간성 +2', '+2 Humanity lean'),
        success: { text: t('찻잔의 김이 멎는다. “그렇군요. 그 말을 듣는 게 처음은 아닙니다.” 계단 위 문이 열린다.', 'The steam stops rising. “I see. You are not the first to say so.” The door at the top of the stairs opens.'), effects: [{ kind: 'axis', axis: 'humanity', amount: 2 }] },
      },
      {
        label: t('“교대하러 왔습니다.”', '“To relieve you.”'),
        hint: t('지배 +2', '+2 Dominance lean'),
        success: { text: t('스피커에서 작게 웃는 소리가 난다. 오래 쉬지 못한 사람의 웃음이다. “열두 초마다입니다. 잊지 마세요.”', 'A small laugh from the speaker, the laugh of someone long without rest. “Every twelve seconds. Don’t forget.”'), effects: [{ kind: 'axis', axis: 'dominance', amount: 2 }] },
      },
      {
        label: t('차를 마신다', 'Drink the tea'),
        hint: t('파티 회복 10', 'Heal party 10'),
        success: { text: t('짜다. 당신이 찻잔을 내려놓을 때까지 목소리는 기다려 준다. 그동안 빛이 다섯 번 돈다.', 'It tastes of salt. The voice waits until you set the cup down. The light sweeps past five times.'), effects: [{ kind: 'heal_party', amount: 10 }, { kind: 'axis', axis: 'resilience' }] },
      },
    ],
  },
]
