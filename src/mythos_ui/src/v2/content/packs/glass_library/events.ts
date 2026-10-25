// Act 4 — failed loops, borrowed memories and the readers left between the shelves.
import type { EventDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const GLASS_EVENTS: EventDef[] = [
  {
    id: 'a4_catalog_shards',
    acts: [4],
    title: t('흩어진 청구 기호', 'Scattered Shelf Marks'),
    image: 'v2/events/a4_catalog_shards.webp',
    gmHints: ['broken catalogue', 'Io', 'palm lines'],
    text: t(
      '깨진 목록실 천장에 유리 색인 카드들이 매달려 있다. 이오가 빈 서랍을 받쳐 든다. “기록은 남아 있습니다. 주소가 부서졌을 뿐입니다.” 카드 하나에 당신의 손금과 같은 금이 가 있다.',
      'Glass index cards hang from the ceiling of the broken catalogue. Io holds up an empty drawer. “The records remain. Only their addresses have broken.” One card is cracked along the same lines as your palm.',
    ),
    options: [
      {
        label: t('금이 이어지는 순서로 카드를 맞춘다', 'Fit the cards together along their cracks'),
        hint: t('관찰 5 · 성공 관찰 +1 · 실패 HP −4', 'OBS 5 · success: +1 OBS · fail: −4 HP'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('금들이 하나의 길로 이어진다. 서가를 볼 때마다 흩어진 주소가 먼저 눈에 들어온다.', 'The cracks join into a single path. Now the scattered addresses catch your eye whenever you look at a shelf.'),
          effects: [{ kind: 'stat', stat: 'obs', amount: 1 }, { kind: 'codex', id: 'lore_a4_shelf_marks' }],
        },
        failure: {
          text: t('잘못 맞춘 카드가 손안에서 터진다. 이오가 말없이 유리 가루를 털어 준다.', 'A mismatched card bursts in your hand. Io quietly brushes away the glass dust.'),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('바닥에 떨어진 서랍 손잡이를 모은다', 'Gather the drawer handles from the floor'),
        hint: t('크레딧 +20', '+20 ₵'),
        success: {
          text: t('이오가 손잡이 수를 세고 수선비를 지급한다. 빈 서랍에도 이제 잡을 곳이 생긴다.', 'Io counts the handles and pays you for the repair. Even the empty drawers have something to hold now.'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
      },
    ],
  },
  {
    id: 'a4_miro_high_shelf',
    acts: [4],
    title: t('가장 작은 독자의 책', 'The Smallest Reader’s Book'),
    image: 'v2/events/a4_miro_high_shelf.webp',
    gmHints: ['borrowed childhood', 'Miro', 'shifting ladder'],
    text: t(
      '기울어진 사다리 아래, 반납 카드가 겹친 얼굴의 아이가 맨 위 서가를 올려다본다. 미로가 당신의 소매 끝을 잡는다. “저 책은 내가 빌렸어. 내 키가 더 컸을 때.” 책등에서 작은 발자국들이 흘러내린다.',
      'Below a leaning ladder, a child with a face of overlapping return cards looks up at the highest shelf. Miro takes the edge of your sleeve. “I borrowed that book. When I was taller.” Tiny footprints spill down its spine.',
    ),
    options: [
      {
        label: t('움직이는 사다리를 타고 책을 내려 준다', 'Climb the shifting ladder and fetch the book'),
        hint: t('민첩 4 · 성공 카드 1장 선택 · 실패 HP −4', 'AGI 4 · success: pick 1 card · fail: −4 HP'),
        check: { stat: 'agi', dc: 4 },
        success: {
          text: t('미로가 책을 품에 안고 접힌 전술 페이지를 건넨다. “이건 이제 안 무서워.”', 'Miro hugs the book and gives you a folded tactical page. “This part doesn’t scare me anymore.”'),
          effects: [{ kind: 'card_choice' }],
        },
        failure: {
          text: t('사다리가 한 칸 접히며 무릎을 찧는다. 미로가 두 팔로 아래쪽을 붙잡아 추락을 막는다.', 'A rung folds and bruises your knee. Miro grips the bottom with both arms to keep you from falling.'),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('미로와 함께 낮은 반납구로 돌아간다', 'Take the low return passage with Miro'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('미로가 몸을 낮추자 카드 얼굴도 납작해진다. 둘의 그림자가 수거기의 감시선 아래로 빠져나간다.', 'Miro crouches, the card-face flattening too. Both your shadows slip beneath the collector’s scanning beam.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'a4_loop_flood_manual',
    acts: [4],
    title: t('물에 잠긴 루프의 정비서', 'Manual from a Drowned Loop'),
    image: 'v2/events/a4_loop_flood_manual.webp',
    gmHints: ['uncanny', 'drowned loop', 'borrowed breath'],
    text: t(
      '펼쳐진 정비서 위로 손바닥만 한 지하철이 물에 잠긴다. 실패한 루프에서 누군가 적은 차단 순서가 페이지 가장자리에 남아 있다. 첫 줄을 읽자 폐 안으로 찬물이 밀려드는 감각이 든다.',
      'A palm-sized subway floods above an open maintenance manual. Along the page edge, someone in a failed loop has written the shutdown sequence. Reading the first line brings the sensation of cold water filling your lungs.',
    ),
    options: [
      {
        label: t('숨을 고르고 차단 순서를 끝까지 읽는다', 'Steady your breathing and read the whole sequence'),
        hint: t('지능 5 · 성공 지능 +1 · 실패 HP −5', 'INT 5 · success: +1 INT · fail: −5 HP'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t('세 번째 차단기를 먼저 내린다. 작은 열차에 불이 꺼지고, 복잡한 회로를 읽는 순서가 머릿속에 남는다.', 'You lower the third breaker first. The little train goes dark, leaving you with a method for reading complex circuits.'),
          effects: [{ kind: 'stat', stat: 'int', amount: 1 }, { kind: 'codex', id: 'lore_a4_failed_loops' }],
        },
        failure: {
          text: t('다음 줄을 읽는 순간 물이 목까지 찬다. 책을 덮고 한참 기침한다.', 'The next line sends water up your throat. You shut the book and cough for a long time.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('책을 덮고 표지의 구조 신호를 끈다', 'Close the book and switch off its distress beacon'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('젖은 표지의 붉은 점이 꺼진다. 당신의 신호에 겹쳐 있던 오래된 구조 요청도 사라진다.', 'The red dot on the wet cover goes dark. The old distress call tangled with your signal falls silent.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('한에게 표지 밖에서 회로를 읽어 달라고 한다', 'Ask Han to read the circuit from outside the cover'),
        hint: t('한 필요 · 카드 1장 강화', 'Requires Han · upgrade 1 card'),
        requires: { companion: 'han' },
        success: {
          text: t('“여기서도 선은 보여.” 한이 책등에 탐침을 대고 기억에 잠기지 않은 채 회로만 복사한다.', '“I can see the wires from here.” Han sets a probe against the spine and copies the circuit without entering the memory.'),
          effects: [{ kind: 'upgrade_card', count: 1 }],
        },
      },
    ],
  },
  {
    id: 'a4_io_silent_petition',
    acts: [4],
    title: t('소리 없는 신청서', 'The Silent Petition'),
    image: 'v2/events/a4_io_silent_petition.webp',
    gmHints: ['IX contact', 'Io', 'silent petition'],
    text: t(
      '무음 열람실 유리창 너머에서 이오가 입술을 움직인다. 창 아래 신청서에는 질문을 적을 칸 대신 손바닥 모양이 파여 있다. 유리에 IX의 접속 표시와 자막이 맺힌다. “열람 사유를 보여 주시겠습니까?”',
      'Beyond the reading room’s glass partition, Io’s lips move without sound. The form below the window has a palm-shaped hollow instead of a space for questions. IX’s connection indicator lights up on the glass beside the words: “Would you show me your reason for reading?”',
    ),
    options: [
      {
        label: t('빈손을 펴고 찾는 사람을 떠올린다', 'Offer an empty palm and picture the person you seek'),
        hint: t('매력 6 · 성공 카드 1장 선택 · 실패 추적 +5', 'CHA 6 · success pick 1 card · fail +5 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('손금 사이에 얼굴 하나가 비친다. 이오가 그 사람이 남긴 대응 기록을 창 아래로 밀어 준다.', 'A face appears between the lines of your palm. Io slides that person’s tactical record beneath the window.'),
          effects: [{ kind: 'card_choice' }],
        },
        failure: {
          text: t('IX의 답이 뜬다. “사유를 확인하지 못했습니다.” 유리가 손바닥을 붉게 복사하고 방문 기록만 접수한다.', 'IX replies: “I could not verify your reason.” The glass makes a red copy of your palm and logs only your visit.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('신청서를 돌려주고 대기석에 앉는다', 'Return the form and sit in the waiting area'),
        hint: t('HP +6', '+6 HP'),
        success: {
          text: t('이오가 유리 너머로 조명을 낮춘다. 등을 기댄 채 기다리자 어깨의 떨림이 멎는다.', 'Io dims the lights from behind the glass. You lean back and wait until your shoulders stop trembling.'),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
    ],
  },
  {
    id: 'a4_loop_barricade',
    acts: [4],
    title: t('끝까지 버틴 문', 'The Door That Held'),
    image: 'v2/events/a4_loop_barricade.webp',
    gmHints: ['last stand', 'borrowed strength', 'iron door'],
    text: t(
      '붉은 천으로 싼 책 사이에 철문 모형이 끼어 있다. 지난 루프의 방어 일지다. 문을 받친 독자의 손이 마지막 페이지에 눌려 있고, 손자국을 읽을 때마다 팔에 무게가 실린다.',
      'A miniature iron door is wedged into a book wrapped in red cloth. It is a defence journal from a past loop. The last page bears the hands of the reader who braced the door; reading those impressions loads weight onto your arms.',
    ),
    options: [
      {
        label: t('손자국에 손을 포개고 마지막 장을 읽는다', 'Match the handprints and read the final page'),
        hint: t('근력 6 · 성공 근력 +1 · 실패 HP −6', 'STR 6 · success: +1 STR · fail: −6 HP'),
        check: { stat: 'str', dc: 6 },
        success: {
          text: t('발을 뒤로 빼고 무게를 받는다. 그 독자가 버티던 자세를 몸이 기억한다.', 'You move one foot back and take the weight. Your body remembers how that reader held firm.'),
          effects: [{ kind: 'stat', stat: 'str', amount: 1 }],
        },
        failure: {
          text: t('기억 속 경첩이 터지며 팔이 꺾인다. 책에서 손을 떼도 멍은 남는다.', 'The remembered hinges burst and wrench your arms. The bruises remain after you let go of the book.'),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('책갈피로 쓰인 배급권을 회수한다', 'Recover the ration voucher used as a bookmark'),
        hint: t('크레딧 +20', '+20 ₵'),
        success: {
          text: t('도서관 환급기에 배급권을 넣는다. 오래 기다린 식사 대신 크레딧이 떨어진다.', 'You feed the voucher into the library’s refund machine. Credits drop out in place of a meal that never came.'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
      },
      {
        label: t('태오와 양쪽에서 문을 받친다', 'Brace the door together with Tae-o'),
        hint: t('태오 필요 · HP −3 · 카드 1장 강화', 'Requires Tae-o · −3 HP · upgrade 1 card'),
        requires: { companion: 'tae_o' },
        success: {
          text: t('“이번엔 혼자 버티지 마.” 태오가 어깨를 대자 팔의 욱신거림 너머로 둘이 버티는 자세가 몸에 남는다.', '“Don’t hold it alone this time.” Tae-o braces his shoulder beside yours, and through the ache in your arms, the shared stance becomes part of your tactics.'),
          effects: [{ kind: 'hp', amount: -3 }, { kind: 'upgrade_card', count: 1 }],
        },
      },
    ],
  },
  {
    id: 'a4_censor_name_ribbons',
    acts: [4],
    title: t('이름을 자르는 가위', 'Scissors for Names'),
    image: 'v2/events/a4_censor_name_ribbons.webp',
    gmHints: ['censorship', 'name ribbons', 'scissors'],
    text: t(
      '하얀 앞치마를 두른 검열자가 긴 이름 띠를 가위로 자른다. 잘린 글자들이 발밑 통 안에서 입 모양으로 뭉친다. 작업대 끝에는 아직 잘리지 않은 당신 이름의 첫 글자가 걸려 있다.',
      'A censor in a white apron cuts long ribbons of names with scissors. The severed letters gather into the shapes of mouths in a bin below. At the table’s edge hangs the first letter of your name, still uncut.',
    ),
    options: [
      {
        label: t('검열자가 눈을 내리는 순간 이름 띠를 바꾼다', 'Swap the ribbon when the censor looks down'),
        hint: t('관찰 6 · 성공 추적 −8 · 실패 추적 +6', 'OBS 6 · success: −8 Trace · fail: +6 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('빈 띠가 가위 아래로 들어간다. 당신을 가리키던 색인 몇 줄이 함께 잘려 나간다.', 'A blank ribbon slides beneath the scissors. Several index entries pointing to you are cut away with it.'),
          effects: [{ kind: 'trace', amount: -8 }, { kind: 'flag', key: 'record_2' }],
        },
        failure: {
          text: t('가위가 멈추고 검열자의 손가락이 당신을 가리킨다. 이름 옆에 붉은 대조 표시가 찍힌다.', 'The scissors stop and the censor points at you. A red cross-reference mark appears beside your name.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('폐기함의 금속 실패만 챙긴다', 'Take only the metal spools from the scrap bin'),
        hint: t('크레딧 +15', '+15 ₵'),
        success: {
          text: t('이름을 건드리지 않고 빈 실패를 꺼낸다. 금속 회수구가 무게를 재고 값을 내준다.', 'You lift the empty spools without touching the names. A metal recycler weighs them and pays you.'),
          effects: [{ kind: 'credits', amount: 15 }],
        },
      },
      {
        label: t('가위를 붙잡고 검열을 막는다', 'Seize the scissors and stop the cutting'),
        hint: t('서가 매복 전투', 'Ambush in the stacks'),
        success: {
          text: t('가위 날을 탁자에 박아 넣는다. 제본 집행자 뒤로 색인 드론과 페이지 늑대가 서가 사이를 막아선다.', 'You drive the scissors into the table. Behind a Binding Enforcer, an Index Drone and a Page Wolf block the gaps between shelves.'),
          effects: [{ kind: 'combat', encounterId: 'a4_event_ambush' }],
        },
      },
    ],
  },
  {
    id: 'a4_loop_rooftop_atlas',
    acts: [4],
    title: t('추락 직전의 지도책', 'Atlas Before the Fall'),
    image: 'v2/events/a4_loop_rooftop_atlas.webp',
    gmHints: ['gamble', 'failed escape', 'last leap'],
    text: t(
      '검은 지도책 위에 빗물 고인 옥상들이 계단처럼 솟는다. 실패한 루프의 도주 경로가 점선으로 이어져 있다. 페이지를 읽는 발끝 아래로 그때의 높이가 벌어지고, 마지막 옥상에는 착지 자국이 없다.',
      'Rain-soaked rooftops rise like steps from a black atlas. A dotted line traces an escape through a failed loop. As you read, the old height opens beneath your toes; the final rooftop has no landing marks.',
    ),
    options: [
      {
        label: t('점선을 따라 읽으며 마지막 도약을 바꾼다', 'Follow the dotted line and change the final leap'),
        hint: t('민첩 5 · 성공 민첩 +1 · 실패 HP −5', 'AGI 5 · success: +1 AGI · fail: −5 HP'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t('난간 대신 배수관을 잡는다. 책을 덮은 뒤에도 발목은 새 착지 각도를 기억한다.', 'You catch the drainpipe instead of the railing. Your ankles remember the new landing angle after the book closes.'),
          effects: [{ kind: 'stat', stat: 'agi', amount: 1 }],
        },
        failure: {
          text: t('점선이 허공에서 끊긴다. 바닥에 주저앉자 지난 루프의 충격이 발뒤꿈치에 박힌다.', 'The dotted line ends in midair. You drop to the floor as the old loop’s impact drives into your heels.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('표지 안쪽의 비상 주머니만 연다', 'Open only the emergency pouch inside the cover'),
        hint: t('소모품 1개 · 추적 +3', '+1 consumable · +3 Trace'),
        success: {
          text: t('비상 물품의 봉인을 뜯는다. 빌린 사람을 기록하는 작은 등이 켜진다.', 'You break the seal on the emergency supplies. A small light comes on to log the borrower.'),
          effects: [{ kind: 'consumable' }, { kind: 'trace', amount: 3 }],
        },
      },
      {
        label: t('세린에게 지도 여백에 우회로를 그려 달라고 한다', 'Ask Se-rin to draw a detour in the margin'),
        hint: t('세린 필요 · 추적 −6', 'Requires Se-rin · −6 Trace'),
        requires: { companion: 'se_rin' },
        success: {
          text: t('“지붕만 길인 건 아니지.” 세린이 처마 아래 선을 긋자 당신을 쫓던 지도 위 불빛이 옥상에 남는다.', '“Rooftops aren’t the only way.” Se-rin draws a route under the eaves, leaving the lights following you on the map stranded above.'),
          effects: [{ kind: 'trace', amount: -6 }],
        },
      },
    ],
  },
  {
    id: 'a4_bindery_offcut',
    acts: [4],
    title: t('압착기 아래의 여백', 'The Margin Under the Press'),
    image: 'v2/events/a4_bindery_offcut.webp',
    gmHints: ['deleted tactics', 'bindery press', 'salvage'],
    text: t(
      '검열자의 제본실 한쪽에서 거대한 압착판이 흰 책을 짓누른다. 잘려 나온 여백에는 삭제된 전술의 손동작이 비친다. 검열자는 손동작까지 지우려고 판 위에 추를 하나 더 얹는다.',
      'In a corner of the censors’ bindery, a huge press bears down on a white book. Severed margins show hand movements from deleted tactics. A censor adds another weight to erase even those gestures.',
    ),
    options: [
      {
        label: t('압착판을 들어 여백을 빼낸다', 'Lift the press and pull out the margin'),
        hint: t('근력 7 · 희귀 카드 1장 선택 / 실패 HP −6', 'STR 7 · pick 1 rare card / fail: −6 HP'),
        check: { stat: 'str', dc: 7 },
        success: {
          text: t('떨리는 틈으로 여백을 빼낸다. 손바닥에 닿자 삭제되던 동작이 끝까지 이어진다.', 'You pull the margin through the trembling gap. Against your palm, the gesture completes itself before it can be erased.'),
          effects: [{ kind: 'card_choice', rarity: 'rare' }, { kind: 'codex', id: 'lore_a4_censorate' }],
        },
        failure: {
          text: t('추가 미끄러지며 압착판이 내려앉는다. 손은 빼냈지만 어깨가 뜨겁게 저린다.', 'A weight slips and the press drops. You free your hands, but your shoulder burns and tingles.'),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('식은 제본 철사를 감아 회수한다', 'Coil and salvage the cooled binding wire'),
        hint: t('크레딧 +25', '+25 ₵'),
        success: {
          text: t('버려진 철사를 작은 고리로 감는다. 재료 회수함이 묶음 값을 지급한다.', 'You wind the discarded wire into small loops. The salvage chute pays for the bundle.'),
          effects: [{ kind: 'credits', amount: 25 }],
        },
      },
    ],
  },
  {
    id: 'a4_overdue_voice',
    acts: [4],
    title: t('반납되지 않은 목소리', 'The Unreturned Voice'),
    image: 'v2/events/a4_overdue_voice.webp',
    gmHints: ['unfinished farewell', 'red telephone', 'patience'],
    text: t(
      '반납되지 않은 복도 끝에 붉은 전화기 하나가 수화기를 늘어뜨리고 있다. 수화기에서 “곧 돌아갈게”라는 말이 반복된다. 반납 전표의 날짜는 수백 번 고쳐 썼지만 통화 종료 칸은 비어 있다.',
      'At the end of the unreturned corridor, a red telephone hangs with its receiver dangling. “I’ll be home soon” repeats from the earpiece. The return slip’s date has been rewritten hundreds of times, but the call’s end time is blank.',
    ),
    options: [
      {
        label: t('수화기를 들고 작별 인사를 끝까지 듣는다', 'Pick up and listen through the farewell'),
        hint: t('매력 5 · 성공 매력 +1 · 실패 추적 +5', 'CHA 5 · success: +1 CHA · fail: +5 Trace'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t('말을 재촉하지 않자 마지막 숨소리가 들린다. 누군가의 말을 끝까지 기다리는 법이 남는다.', 'When you stop trying to hurry the words, a final breath comes through. You carry away the patience to hear someone out.'),
          effects: [{ kind: 'stat', stat: 'cha', amount: 1 }],
        },
        failure: {
          text: t('대답하려는 순간 당신 목소리가 녹음된다. 복도 전화기들이 차례로 당신을 부른다.', 'Your reply is recorded before you can finish it. Phones down the corridor begin calling for you in turn.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('통화 내용은 건드리지 않고 회선만 정리한다', 'Tidy the cable without disturbing the call'),
        hint: t('크레딧 +15', '+15 ₵'),
        success: {
          text: t('꼬인 선을 풀어 벽 고리에 건다. 보수 단말에서 소액의 작업비가 나온다.', 'You untangle the cable and hang it on a wall hook. The maintenance terminal pays a small service fee.'),
          effects: [{ kind: 'credits', amount: 15 }],
        },
      },
    ],
  },
  {
    id: 'a4_first_reader_errata',
    acts: [4],
    title: t('첫 번째 독자의 정오표', 'The First Reader’s Errata'),
    image: 'v2/events/a4_first_reader_errata.webp',
    gmHints: ['future corrections', 'first reader', 'contradiction'],
    text: t(
      '최초 기록 보관고 앞 탁자에 붉은 교정선으로 뒤덮인 낱장이 놓여 있다. 서명은 ‘첫 번째 독자’. “여기서 왼손을 먼저 쓴다”는 주석 아래, 당신이 아직 하지 않은 동작의 오류가 적혀 있다.',
      'On a table outside the first record vault lies a sheet covered in red corrections. It is signed “The First Reader.” Beneath “Use the left hand first,” a note marks the error in a movement you have not made yet.',
    ),
    options: [
      {
        label: t('정오표의 모순을 찾아 전술을 고친다', 'Find the contradiction and revise your tactic'),
        hint: t('지능 6 · 성공 카드 1장 강화 · 실패 매복 전투', 'INT 6 · upgrade 1 card / fail: ambush combat'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('주석 두 개가 서로 반대인 것을 찾아낸다. 한 줄을 지우자 손이 더 짧은 동작으로 움직인다.', 'Two notes contradict each other. You cross one out and your hand finds a shorter movement.'),
          effects: [{ kind: 'upgrade_card', count: 1 }, { kind: 'flag', key: 'record_3' }, { kind: 'codex', id: 'lore_a4_first_reader' }],
        },
        failure: {
          text: t('고친 문장이 종이 밖으로 번진다. 색인 드론이 붉게 깜박이고, 제본 집행자와 페이지 늑대가 서가 사이에서 다가온다.', 'Your revision bleeds off the paper. An Index Drone flashes red as a Binding Enforcer and a Page Wolf close in between the shelves.'),
          effects: [{ kind: 'combat', encounterId: 'a4_event_ambush' }],
        },
      },
      {
        label: t('정오표를 뒤집어 서명을 감춘다', 'Turn the errata face down and hide the signature'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('탁자 위 감시 렌즈가 읽을 것을 잃고 돌아간다. 당신 동작의 기록도 잠시 끊긴다.', 'The lens above the table turns away with nothing to read. For a moment, the record of your movements breaks off too.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'a4_io_mending_tray',
    acts: [4],
    title: t('사서의 수선 쟁반', 'The Librarian’s Mending Tray'),
    image: 'v2/events/a4_io_mending_tray.webp',
    gmHints: ['reader repairs', 'Io', 'treatment record'],
    text: t(
      '이오가 은빛 쟁반 위에 바늘과 밀봉된 보존 물품을 나란히 놓는다. 유리 손가락 사이에는 독자들의 낡은 붕대가 걸려 있다. “책과 독자 모두 수선이 필요합니다. 진료 기록은 남습니다만.”',
      'Io arranges needles and sealed preservation supplies on a silver tray. Old readers’ bandages hang between glass fingers. “Books and readers both need mending. A treatment record will be kept, however.”',
    ),
    options: [
      {
        label: t('상처를 수선받는다', 'Let Io mend your wounds'),
        hint: t('HP +8 · 추적 +3', '+8 HP · +3 Trace'),
        success: {
          text: t('바늘이 상처 가장자리를 지나가고 통증이 잦아든다. 이오가 당신 이름으로 진료표를 접는다.', 'The needle passes along the wound and the pain eases. Io folds a treatment slip bearing your name.'),
          effects: [{ kind: 'hp', amount: 8 }, { kind: 'trace', amount: 3 }],
        },
      },
      {
        label: t('지난 방문표를 수거함에 넣는다', 'Place your old visit slip in the collection box'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('이오가 지난 방문을 종료 처리한다. 서가 위에서 당신을 찾던 표시등 하나가 꺼진다.', 'Io closes out the earlier visit. One of the lights searching the shelves for you goes out.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('밀봉된 보존 물품을 산다', 'Buy sealed preservation supplies'),
        hint: t('크레딧 −25 · 소모품 1개', '−25 ₵ · +1 consumable'),
        requires: { minCredits: 25 },
        success: {
          text: t('이오가 포장을 살펴보고 쟁반에서 내려 준다. “개봉 후에는 반납하실 수 없습니다.”', 'Io checks the wrapping and lifts the supplies from the tray. “These cannot be returned once opened.”'),
          effects: [{ kind: 'credits', amount: -25 }, { kind: 'consumable' }],
        },
      },
    ],
  },
  {
    id: 'a4_miro_return_faces',
    acts: [4],
    requires: { companions: ['se_rin', 'han'] },
    title: t('얼굴에 붙은 반납표', 'Return Slips on a Face'),
    image: 'v2/events/a4_miro_return_faces.webp',
    gmHints: ['companion conflict', 'se_rin', 'han', 'borrowed identity'],
    text: t(
      '미로가 낮은 거울 앞에서 얼굴의 반납표 한 장을 들춰 본다. 그 아래에도 반납표가 있다. “내 게 아닌 건 떼어도 될까?” 아이가 내민 표에는 당신이 버리고 싶었던 동작 하나가 그려져 있다. 세린이 말한다. “뭘 남길지는 미로가 정해야지.” 한이 표를 들여다본다. “이 아래 뭐가 있는지부터 알아야 돼.”',
      'At a low mirror, Miro lifts a return slip from their face. There is another beneath it. “Can I take off the ones that aren’t mine?” The slip the child offers shows a movement you have wanted to leave behind. Se-rin says, “Miro should choose what stays.” Han studies the slip. “We need to know what’s underneath first.”',
    ),
    options: [
      {
        label: t('세린 편을 들어 내 기억에서 그 동작을 떼어 낸다', 'Side with Se-rin and peel the movement from your memory'),
        hint: t('HP −4 · 카드 1장 제거 · 세린 유대 +1', '−4 HP · remove 1 card · Se-rin bond +1'),
        success: {
          text: t('관자놀이가 따끔해지고 손에 밴 동작 하나가 사라진다. 미로의 얼굴에도 작은 틈이 생긴다.', 'Your temple stings as a familiar movement leaves your hands. A small gap opens in Miro’s face as well.'),
          effects: [{ kind: 'hp', amount: -4 }, { kind: 'remove_card', count: 1 }, { kind: 'bond', id: 'se_rin', amount: 1 }],
        },
      },
      {
        label: t('한 편을 들어 표를 남기고 함께 바닥을 정리한다', 'Side with Han, keep the slips and help tidy the floor'),
        hint: t('크레딧 +15 · 한 유대 +1', '+15 ₵ · Han bond +1'),
        success: {
          text: t('거울 밑에서 분실된 크레딧을 찾는다. 미로가 당신 몫을 손바닥에 세어 놓는다.', 'You find lost credits beneath the mirror. Miro counts your share into your palm.'),
          effects: [{ kind: 'credits', amount: 15 }, { kind: 'bond', id: 'han', amount: 1 }],
        },
      },
    ],
  },
  {
    id: 'a4_star_moths',
    acts: [4],
    title: t('서가의 별나방', 'Star Moths in the Stacks'),
    image: 'v2/events/a4_star_moths.webp',
    gmHints: ['quiet wonder', 'lost stars', 'moonlight'],
    text: t(
      '유리 돔 아래 흰 나방들이 빛나는 문장 부호를 날개에 달고 돈다. 폐기된 세계의 밤하늘 지도에서 빠져나온 별들이다. 한 마리가 당신의 무릎에 내려앉자 서가마다 작은 달이 켜진다.',
      'Beneath the glass dome, white moths circle with luminous punctuation on their wings. They are stars escaped from a discarded world’s night-sky chart. One lands on your knee, and tiny moons light up along the shelves.',
    ),
    options: [
      {
        label: t('나방이 다시 날 때까지 가만히 앉아 있는다', 'Sit still until the moth takes flight'),
        hint: t('HP +6', '+6 HP'),
        success: {
          text: t('날개가 펴졌다 접힐 때마다 숨을 고른다. 나방이 떠난 무릎 위에는 따뜻한 빛이 잠시 남는다.', 'You steady your breathing with each opening and closing of its wings. Warm light lingers on your knee after it leaves.'),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
      {
        label: t('별나방 무리를 따라 서가를 걷는다', 'Walk among the shelves with the star moths'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('작은 빛들이 당신의 신호를 둘러싼다. 목록 렌즈는 별자리만 기록한다.', 'The small lights gather around your signal. The catalogue lens records only a constellation.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
    ],
  },
  {
    id: 'a4_unwritten_aquarium',
    acts: [4],
    title: t('쓰이지 않은 바다', 'The Unwritten Sea'),
    image: 'v2/events/a4_unwritten_aquarium.webp',
    gmHints: ['unwritten world', 'glass sea', 'rest'],
    text: t(
      '빈 유리 책 한 권 안에서 푸른 물고기들이 헤엄친다. 아직 어느 세계에도 쓰이지 않은 바다다. 책을 받친 돌에는 조개 모양 보관함이 있고, 물고기들은 당신이 다가가도 흩어지지 않는다.',
      'Blue fish swim inside an empty glass book. This sea has not yet been written into any world. A shell-shaped storage box rests in the stone beneath the book, and the fish do not scatter as you approach.',
    ),
    options: [
      {
        label: t('물고기의 그림자를 바라보며 쉰다', 'Rest and watch the fishes’ shadows'),
        hint: t('HP +6', '+6 HP'),
        success: {
          text: t('바닥에 비친 지느러미가 느리게 지나간다. 당신도 신발 끈을 풀고 다리를 편다.', 'Reflected fins drift slowly across the floor. You loosen your laces and stretch out your legs.'),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
      {
        label: t('방문객용 조개 보관함을 연다', 'Open the shell-shaped visitor box'),
        hint: t('소모품 1개', '+1 consumable'),
        success: {
          text: t('보관함에는 방수 포장된 물품이 한 개 남아 있다. 뚜껑을 닫자 물고기 한 마리가 둥글게 돈다.', 'One waterproof packet remains inside. As you close the lid, a fish swims a circle.'),
          effects: [{ kind: 'consumable' }],
        },
      },
    ],
  },
  {
    id: 'a4_blank_impression',
    acts: [4],
    title: t('백지가 지나간 자리', 'Where the Blank Passed'),
    image: 'v2/events/a4_blank_impression.webp',
    gmHints: ['erasure', 'THE BLANK', 'surviving tactic'],
    text: t(
      '길게 눌린 흰 자국이 서가와 바닥을 가로지른다. 백지가 지나가며 책 제목까지 평평하게 밀어 버렸다. 자국 가장자리의 얇은 막에는 지워지기 직전의 전술 하나가 손바닥처럼 부풀어 있다.',
      'A long white impression cuts across shelves and floor. THE BLANK has passed here, pressing even the book titles flat. At its edge, a thin membrane bulges like a palm around a tactic caught just before erasure.',
    ),
    options: [
      {
        label: t('손을 밀어 넣어 남은 전술을 꺼낸다', 'Push your hand in and retrieve the surviving tactic'),
        hint: t('HP −6 · 희귀 카드 1장 선택', '−6 HP · pick a rare card'),
        success: {
          text: t('막이 손등의 살을 얇게 벗겨 낸다. 끌어낸 전술은 피에 닿자 다시 입체가 된다.', 'The membrane peels a thin layer from the back of your hand. The tactic takes shape again as it touches your blood.'),
          effects: [{ kind: 'hp', amount: -6 }, { kind: 'card_choice', rarity: 'rare' }],
        },
      },
      {
        label: t('흰 자국 안으로 발자국을 옮긴다', 'Step into the white impression'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('당신 발자국이 이미 지워진 바닥에 겹친다. 뒤따르던 렌즈가 빈 바닥을 훑고 지나간다.', 'Your footprints overlap the erased floor. The lens behind you scans the blank surface and moves on.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'a4_red_thread_bookmark',
    acts: [4],
    title: t('붉은 실 책갈피', 'The Red Thread Bookmark'),
    image: 'v2/events/a4_red_thread_bookmark.webp',
    gmHints: ['borrowed motion', 'red thread', 'painful lesson'],
    text: t(
      '닫힌 책들 사이로 붉은 실 한 가닥이 이어져 손목 높이에서 매듭을 이룬다. 매듭마다 같은 독자가 다른 순서로 움직이는 장면이 맺혀 있다. 느슨한 끝을 잡으면 가장 짧은 동작 쪽으로 실이 당긴다.',
      'A red thread runs between closed books and knots at wrist height. Each knot holds a scene of the same reader moving in a different sequence. The loose end pulls toward the shortest movement when you take hold of it.',
    ),
    options: [
      {
        label: t('실을 손목에 감고 동작을 따라간다', 'Wind the thread around your wrist and follow it'),
        hint: t('HP −4 · 카드 1장 강화', '−4 HP · upgrade 1 card'),
        success: {
          text: t('실이 살을 파고들며 손목을 바로잡는다. 매듭이 풀린 뒤에도 군더더기 없는 동작이 남는다.', 'The thread cuts into your skin as it corrects your wrist. The clean movement stays after the knot comes undone.'),
          effects: [{ kind: 'hp', amount: -4 }, { kind: 'upgrade_card', count: 1 }],
        },
      },
      {
        label: t('풀린 끝의 은제 추를 회수한다', 'Retrieve the silver weight from the loose end'),
        hint: t('크레딧 +20', '+20 ₵'),
        success: {
          text: t('쓰지 않는 추만 조심히 떼어 낸다. 반납 저울이 은의 무게만큼 크레딧을 내준다.', 'You carefully detach the unused weight. The return scale pays out credits for the silver.'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
      },
    ],
  },
  {
    id: 'a4_loop_supper',
    acts: [4],
    title: t('아직 따뜻한 저녁', 'Supper Still Warm'),
    image: 'v2/events/a4_loop_supper.webp',
    gmHints: ['remembered supper', 'empty chair', 'home address'],
    text: t(
      '낡은 요리책 위에 두 사람 몫의 밥상이 떠 있고 한쪽 의자는 비어 있다. 폐기된 루프가 끝나기 직전의 저녁이다. 레시피를 한 줄 읽자 참기름 냄새가 나고, 빈 의자 쪽에서 숟가락 소리가 난다.',
      'A supper table for two floats above a worn cookbook, one chair empty. It is the evening just before a discarded loop ended. One line of the recipe brings the smell of sesame oil and a spoon’s clink from the empty chair.',
    ),
    options: [
      {
        label: t('레시피를 끝까지 읽고 기억 속 저녁을 먹는다', 'Read the full recipe and eat the remembered supper'),
        hint: t('HP +10 · 추적 +5', '+10 HP · +5 Trace'),
        success: {
          text: t('속이 따뜻해지고 손에 힘이 돌아온다. 빈 의자의 주인이 당신 신호를 집 주소로 적는다.', 'Warmth fills your stomach and strength returns to your hands. The empty chair’s owner writes down your signal as a home address.'),
          effects: [{ kind: 'hp', amount: 10 }, { kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('식사 대신 요리책의 대출 보증금을 돌려받는다', 'Return the cookbook for its loan deposit'),
        hint: t('크레딧 +15', '+15 ₵'),
        success: {
          text: t('책을 닫아 반납대에 놓는다. 밥상은 접히고 보증금만 접시처럼 둥글게 남는다.', 'You close the book and place it on the return desk. The table folds away, leaving the deposit in a small, plate-shaped pile.'),
          effects: [{ kind: 'credits', amount: 15 }],
        },
      },
    ],
  },
  {
    id: 'a4_miro_pocket_sun',
    acts: [4],
    title: t('미로의 주머니 해', 'Miro’s Pocket Sun'),
    image: 'v2/events/a4_miro_pocket_sun.webp',
    gmHints: ['small courage', 'Miro', 'pocket sun'],
    text: t(
      '미로의 투명한 주머니 안에서 단추만 한 해가 빛난다. 아이는 어두운 어린이 서가 앞에서 멈추더니 이번에는 먼저 걸어 들어간다. “이건 내가 켤 줄 알아.” 반납표 얼굴이 금빛으로 물든다.',
      'A button-sized sun shines inside Miro’s transparent pocket. The child pauses before the dark children’s shelves, then steps in ahead of you. “I know how to turn this one on.” The return-card face turns gold.',
    ),
    options: [
      {
        label: t('빛 아래 드러난 분실함을 함께 연다', 'Open the lost-property drawer revealed by the light'),
        hint: t('크레딧 +20', '+20 ₵'),
        success: {
          text: t('미로가 주인 없는 동전을 골라 나눠 준다. 해는 주머니 안에서도 한동안 꺼지지 않는다.', 'Miro sorts out the unclaimed coins and shares them with you. The sun keeps shining inside the pocket for a while.'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
      },
      {
        label: t('미로 옆에 앉아 손을 녹인다', 'Sit beside Miro and warm your hands'),
        hint: t('HP +6', '+6 HP'),
        success: {
          text: t('미로가 해를 두 사람 사이에 놓는다. 뻣뻣했던 손가락이 천천히 펴진다.', 'Miro sets the sun between you. Your stiff fingers slowly uncurl.'),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
    ],
  },
  {
    id: 'a4_unmade_door',
    acts: [4],
    title: t('그리지 않은 출구', 'The Undrawn Exit'),
    image: 'v2/events/a4_unmade_door.webp',
    gmHints: ['forgotten motion', 'undrawn exit', 'fingerprints'],
    text: t(
      '반납되지 않은 복도 벽에 문손잡이 하나만 달려 있다. 문틀이 있어야 할 자리에는 지운 연필 자국이 보인다. 손잡이를 잡으면 몸보다 먼저 익숙한 동작 하나가 반대편으로 빠져나가려 한다.',
      'A lone doorknob sits on the wall of the unreturned corridor. Erased pencil marks show where its frame should be. When you take hold, a familiar movement tries to pass through before your body does.',
    ),
    options: [
      {
        label: t('필요 없어진 동작을 문 너머로 보낸다', 'Send an unwanted movement through the door'),
        hint: t('HP −6 · 카드 1장 제거', '−6 HP · remove 1 card'),
        success: {
          text: t('관절을 따라 가느다란 통증이 빠져나간다. 손잡이를 놓자 그 동작으로 돌아가는 길도 닫힌다.', 'A thin pain pulls through your joints. When you release the knob, the way back to that movement closes too.'),
          effects: [{ kind: 'hp', amount: -6 }, { kind: 'remove_card', count: 1 }],
        },
      },
      {
        label: t('손잡이에 묻은 지문만 닦는다', 'Wipe only your fingerprints from the knob'),
        hint: t('추적 −5', '−5 Trace'),
        success: {
          text: t('지문이 지워지자 벽 속에서 돌던 색인 바늘이 멎는다. 문은 끝내 열리지 않는다.', 'As the fingerprints vanish, an indexing needle inside the wall stops turning. The door never opens.'),
          effects: [{ kind: 'trace', amount: -5 }],
        },
      },
    ],
  },
  {
    id: 'a4_io_vault_lamp',
    acts: [4],
    title: t('보관고 앞의 등불', 'The Lamp Before the Vault'),
    image: 'v2/events/a4_io_vault_lamp.webp',
    gmHints: ['restricted record', 'Io', 'early shadow'],
    text: t(
      '최초 기록 보관고의 닫힌 문 앞에서 이오가 작은 등불을 닦는다. 빛 안에 당신 손의 그림자가 한 박자 먼저 움직인다. “그 기록은 존재합니다. 다만, 존재한다고 해서 열람 가능한 것은 아닙니다.” 이오가 문 대신 등불을 내민다.',
      'Before the closed first record vault, Io polishes a small lamp. In its light, the shadow of your hand moves a beat ahead. “That record exists. Its existence does not, however, make it available to read.” Io offers the lamp instead of opening the door.',
    ),
    options: [
      {
        label: t('등불 아래서 앞서 움직이는 손을 따라 한다', 'Follow the hand moving ahead of you in the lamplight'),
        hint: t('카드 1장 강화 · 추적 +5', 'Upgrade 1 card · +5 Trace'),
        success: {
          text: t('손과 그림자가 같은 순간에 멈춘다. 이오가 개선된 동작과 당신의 방문을 함께 기록한다.', 'Your hand and its shadow stop together. Io records both the improved movement and your visit.'),
          effects: [{ kind: 'upgrade_card', count: 1 }, { kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('문 앞 벤치에서 등불의 온기를 쬔다', 'Warm yourself by the lamp on the bench outside'),
        hint: t('HP +6', '+6 HP'),
        success: {
          text: t('“잠시 쉬셔도 됩니다.” 이오가 등불을 벤치 옆에 내려놓자 문틈의 찬 기운이 무릎에 닿지 않는다.', '“You may rest a while.” Io sets the lamp beside the bench, keeping the cold from beneath the door away from your knees.'),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
    ],
  },
]
