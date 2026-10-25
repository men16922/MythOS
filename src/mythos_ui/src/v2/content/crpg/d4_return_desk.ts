// Act 4 — The Returns Desk. Io's local clerk relays library policy; it is not Io and cannot grant vault access.
// q_return_record: investigate the first-record loan notice (1) → reconcile Miro's receipt and reserve a reading (2).
// Miro → slot is sufficient; the clerk or apprentice supplies optional third-stop clearance. The vault stays closed.
// One card picker, at the apprentice; maximum credits 20. Miro is the card-faced child from glass_library/events.ts.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D4_RETURN_DESK: DistrictDef = {
  id: 'd4_return_desk',
  act: 4,
  name: t('반납되지 않은 이름', 'The Unreturned Name'),
  image: 'v2/districts/d4_return_desk.webp',
  intro: t(
    '유리 도서관의 반납대에는 책보다 반납 전표가 많다. ‘첫 번째 접속 기록 — 대출 중’이라는 안내문 아래, 아이 하나가 빈손으로 번호표를 쥔다. 천장에는 사서 이오의 응답을 기다리는 작은 등이 켜져 있다.\n반납 창구가 닫히기 전 세 곳을 들를 수 있다.',
    'At the Glass Library returns desk, receipts outnumber books. Beneath a notice reading “First connector record — on loan,” a child holds a queue ticket in otherwise empty hands. A small ceiling light waits for librarian Io’s reply.\nThere is time for three stops before the counter closes.',
  ),
  actions: 3,
  outro: t(
    '반납구의 덮개가 내려온다. 빈손을 재던 저울이 멎고, 사서의 응답등만 복도 끝에서 천천히 깜빡인다.',
    'The return slot closes. The scales that weigh empty hands stop moving. Only the librarian’s reply light blinks slowly at the end of the corridor.',
  ),
  pois: [
    { id: 'clerk', name: t('응답 대기 창구', 'Awaiting Reply'), blurb: t('이오의 말을 받아 적는 기계.', 'A construct transcribing Io’s replies.'), dialogue: 'd4rd_clerk' },
    { id: 'miro', name: t('낮은 대기 의자', 'The Low Waiting Seat'), blurb: t('빌린 것은 정말 책일까.', 'Was it really a book?'), dialogue: 'd4rd_miro' },
    { id: 'censor', name: t('견습 검열대', 'The Apprentice’s Bench'), blurb: t('지우는 법부터 배운 손.', 'Hands taught erasure first.'), dialogue: 'd4rd_apprentice' },
    { id: 'slot', name: t('무인 반납구', 'The Unattended Slot'), blurb: t('기록과 독자를 따로 세어야 한다.', 'The record and the reader need separate counts.'), dialogue: 'd4rd_slot' },
  ],
}

const CLERK: DialogueDef = {
  id: 'd4rd_clerk',
  npc: 'returns_clerk_tess',
  start: 'window',
  nodes: {
    window: {
      speaker: 'returns_clerk_tess',
      text: t(
        '테스의 유리 가슴 안에서 작은 인쇄기가 돈다. “반납 담당 테스입니다. 사서 이오의 답변을 중계합니다.” 인쇄지가 한 줄 내려온다. ‘그 기록은 존재합니다. 현재 열람은 승인되지 않았습니다.’',
        'A little printer turns inside Tess’s glass chest. “Tess, returns clerk. Relaying librarian Io’s response.” One line feeds out: “The record exists. Access has not been approved.”',
      ),
      options: [
        {
          label: t('“안내문에는 대출 중이라고 되어 있는데요.”', '“The notice says it is on loan.”'),
          intent: 'ask',
          success: {
            text: t(
              '테스가 안내문과 응답지를 나란히 놓는다. “대출 항목은 있습니다. 반출된 물건의 항목은 비어 있습니다.” 두 종이 사이에 오래된 반납 번호가 떠오른다.',
              'Tess lays the notice beside the reply. “There is a loan entry. The item removed field is empty.” An old return number appears between the sheets.',
            ),
            effects: [{ kind: 'quest', id: 'q_return_record', stage: 1 }],
            goto: 'loan',
          },
        },
        {
          label: t('“네가 이오지? 문을 열어.”', '“You’re Io. Open the vault.”'),
          intent: 'intimidate',
          approval: { kai: -1 },
          success: {
            text: t('“저는 테스입니다. 반납 담당입니다.” 인쇄기가 정체 확인 문장을 두 번 찍는다. 위협 신고 전표가 별도 함으로 들어간다.', '“I am Tess. Returns clerk.” The printer repeats its identification twice. A threat report feeds into a separate tray.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('응답지를 남겨 두고 비켜선다', 'Leave the reply and step aside'),
          intent: 'leave',
          success: { text: t('테스가 다음 번호를 부른다. 아이는 자리에서 일어나지 않는다.', 'Tess calls the next number. The child does not get up.') },
        },
      ],
    },
    loan: {
      speaker: 'returns_clerk_tess',
      text: t(
        '“같은 번호를 가진 독자가 대기 중입니다. 미로.” 테스가 낮은 의자를 가리킨다. “본인 전표와 이 번호를 무인 반납구에서 대조하세요. 반납 정정은 열람 예약까지만 연결됩니다. 보관고 문은 별도입니다.”',
        '“A reader with the same number is waiting. Miro.” Tess indicates the low seat. “Compare the reader’s receipt with this number at the unattended slot. Correcting a return can lead to a reservation. The vault door is a separate matter.”',
      ),
      options: [
        {
          label: t('“독자에게 직접 물어볼게요.”', '“I’ll ask the reader.”'),
          intent: 'persuade',
          approval: { kai: 1 },
          success: {
            text: t('테스가 대조 번호를 내준다. “누가 빌렸는지와 무엇을 빌렸는지를 같은 칸에 쓰지 마세요.”', 'Tess supplies the comparison number. “Do not put who borrowed and what was borrowed in the same field.”'),
          },
        },
        {
          label: t('채무와 물품을 분리하는 장부 양식을 제안한다', 'Propose separate ledger fields for debt and property'),
          intent: 'offer',
          requires: { background: 'broker' },
          approval: { lin_yue: 2 },
          success: {
            text: t('테스가 양식을 복사한다. 이오의 짧은 응답이 내려온다. ‘정정 양식은 사용할 수 있습니다.’ 반납 대조 과정의 감시 대기열도 줄어든다.', 'Tess copies the form. A brief reply arrives from Io: “The amended form may be used.” The surveillance queue for return comparisons shortens too.'),
            effects: [{ kind: 'flag', key: 'rd_clear_form' }],
          },
        },
        {
          label: t('대출 날짜 아래의 작은 문자를 읽는다', 'Read the fine print beneath the loan date'),
          intent: 'insight',
          check: { stat: 'obs', dc: 12 },
          assist: 'kai',
          success: {
            text: t('‘문턱 임시 대여’라는 오래된 분류가 보인다. 테스가 그 줄의 대조 승인을 찍는다. “표제와 물품명이 다를 수 있습니다.”', 'An old classification reads temporary threshold loan. Tess stamps that line for comparison. “A heading and an item name may differ.”'),
            effects: [{ kind: 'flag', key: 'rd_clear_form' }],
          },
          failure: {
            text: t('작은 문자가 눈동자의 움직임을 따라 달아난다. 방문 시간만 한 줄 더 기록된다.', 'The fine print flees with each movement of your eyes. Another line is added to your visit log.'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('번호를 외우고 창구를 비운다', 'Remember the number and clear the window'),
          intent: 'leave',
          success: { text: t('테스가 종이 끝을 안으로 말아 넣는다.', 'Tess rolls the end of the paper back inside.') },
        },
      ],
    },
  },
}

const MIRO: DialogueDef = {
  id: 'd4rd_miro',
  npc: 'miro_reader',
  start: 'seat',
  nodes: {
    seat: {
      speaker: 'miro_reader',
      text: t(
        '미로의 얼굴을 이룬 반납 카드들이 번호표를 향해 기울어진다. 아이의 발은 바닥에 닿지 않는다. “내 번호는 불렀는데 내 이름은 안 불렀어. 그래서 아직 앉아 있어.”',
        'The return cards that make up Miro’s face tilt toward the queue ticket. The child’s feet do not reach the floor. “They called my number. Not my name. So I’m still sitting here.”',
      ),
      options: [
        {
          label: t('“미로. 뭘 빌렸는지 말해 줄래?”', '“Miro. Can you tell me what you borrowed?”'),
          intent: 'ask',
          approval: { kai: 1 },
          success: {
            text: t(
              '이름을 듣자 카드들이 한 장씩 제자리를 찾는다. “나갈 때 밟는 걸 빌렸어. 책은 너무 높이 있었고.” 미로가 접힌 전표를 무릎에 놓는다.',
              'Hearing the name, the cards settle one by one. “I borrowed something to step on when leaving. The book was too high.” Miro lays a folded receipt on small knees.',
            ),
            effects: [{ kind: 'quest', id: 'q_return_record', stage: 1 }],
            goto: 'receipt',
          },
        },
        {
          label: t('“첫 기록을 숨겼지? 내놓으면 용서해 줄게.”', '“You hid the first record. Give it back and I’ll forgive you.”'),
          intent: 'intimidate',
          approval: { kai: -3, tae_o: -2 },
          success: {
            text: t('미로가 빈손을 편다. 카드 얼굴이 번호표 뒤로 숨어 버린다. 창구가 아이 대신 당신의 목소리를 기록한다.', 'Miro opens empty hands. The card-face retreats behind the ticket. The counter records your voice instead of the child.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('옆자리만 비워 두고 물러난다', 'Leave the next seat empty and step away'),
          intent: 'leave',
          success: { text: t('미로가 빈 의자에 번호표를 잠깐 올렸다 다시 집는다.', 'Miro rests the ticket on the empty chair, then picks it up again.') },
        },
      ],
    },
    receipt: {
      speaker: 'miro_reader',
      text: t(
        '전표에는 ‘첫 번째 접속 기록 열람실’과 ‘문턱 한 칸’이 다른 줄에 적혀 있다. “나오는 길이 없어져서 빌렸어. 돌아오니까 발판은 제자리에 있는데, 빚은 내 이름에 남았어.” 미로가 마지막 접힌 부분을 만지작거린다.',
        'The receipt lists first connector record reading room and one threshold step on separate lines. “The way out was gone, so I borrowed it. When I came back, the step was here, but the debt stayed in my name.” Miro fingers the last fold.',
      ),
      options: [
        {
          label: t('“네가 펴 줄 때까지 기다릴게.”', '“I’ll wait until you’re ready to unfold it.”'),
          intent: 'offer',
          approval: { kai: 2 },
          success: {
            text: t(
              '미로가 천천히 전표를 편다. 반납구 모서리와 맞는 발자국이 나타난다. “내 이름은 여기 둬. 빚 옆 말고.” 대조용 사본만 당신에게 건넨다.',
              'Miro slowly unfolds it. A footprint matches the return slot’s corner. “Keep my name here. Just not next to the debt.” You receive only the comparison copy.',
            ),
            effects: [{ kind: 'flag', key: 'rd_receipt' }],
          },
        },
        {
          label: t('접힌 순서를 기억의 순서와 맞춘다', 'Match the folds to the order of recollection'),
          intent: 'insight',
          check: { stat: 'obs', dc: 13 },
          assist: 'kai',
          approval: { kai: 1 },
          success: {
            text: t(
              '대출 뒤에 반납 도장이 숨어 있다. 미로가 도장을 손끝으로 확인한다. “돌려줬다고 써 있네.” 전표 사본의 대조 칸까지 채워진다.',
              'A return stamp hides behind the loan entry. Miro checks it with a fingertip. “It says I gave it back.” The copy’s comparison fields fill themselves in.',
            ),
            effects: [{ kind: 'flag', key: 'rd_receipt' }, { kind: 'flag', key: 'rd_clear_form' }],
          },
          failure: {
            text: t('전표를 빨리 펴자 얼굴의 카드들도 흔들린다. 미로가 종이를 무릎에 누른다. “잠깐만. 내가 할게.”', 'Unfolding too quickly shakes the cards of Miro’s face. The child pins the paper to their knees. “Wait. Let me.”'),
            goto: 'wait',
          },
        },
        {
          label: t('전표를 받지 않고 일어난다', 'Get up without taking the receipt'),
          intent: 'leave',
          success: { text: t('미로가 발자국이 있는 면을 바깥으로 접는다.', 'Miro folds the footprint side outward.') },
        },
      ],
    },
    wait: {
      speaker: 'miro_reader',
      text: t(
        '미로가 한 번 접고 다시 편다. “이쪽이 어제야. 아니, 내가 어제라고 부르는 쪽.” 마지막 도장이 바깥으로 나온다. 아이가 당신 손이 움직이지 않는지 살핀다.',
        'Miro folds once and opens it again. “This side is yesterday. Or what I call yesterday.” The final stamp emerges. The child checks that your hands are still.',
      ),
      options: [
        {
          label: t('미로가 건넨 사본만 받는다', 'Accept only the copy Miro offers'),
          intent: 'offer',
          success: {
            text: t('“이건 가져가도 돼.” 미로가 원본을 품에 넣는다. 당신 손에는 발판을 돌려준 날짜가 남는다.', '“You can take this.” Miro tucks away the original. Your copy bears the date the step was returned.'),
            effects: [{ kind: 'flag', key: 'rd_receipt' }],
          },
        },
        {
          label: t('지금은 일어나지 말라고 하고 떠난다', 'Tell Miro there is no need to get up yet, and leave'),
          intent: 'leave',
          success: { text: t('미로가 고개를 끄덕인다. 번호표는 더 이상 꽉 쥐지 않는다.', 'Miro nods. The grip on the queue ticket loosens.') },
        },
      ],
    },
  },
}

const APPRENTICE: DialogueDef = {
  id: 'd4rd_apprentice',
  npc: 'returns_apprentice_ves',
  start: 'bench',
  nodes: {
    bench: {
      speaker: 'returns_apprentice_ves',
      text: t(
        '베스가 지우개 가루를 한 줄로 모은다. “연체자를 지우면 연체도 사라진다고 배웠습니다.” 장부에서 미로의 이름이 반쯤 흐려져 있다. “그런데 빈칸에도 이자가 붙습니다.”',
        'Ves gathers eraser dust into a line. “I was taught that erasing an overdue reader erases the debt.” Miro’s name is half faded in the ledger. “But the blank is still accruing interest.”',
      ),
      options: [
        {
          label: t('“물건을 확인하기 전까지 이름은 남겨 둬.”', '“Keep the name until you check the item.”'),
          intent: 'persuade',
          approval: { kai: 1, tae_o: 1 },
          success: {
            text: t(
              '베스가 지우개를 내려놓고 대출 번호를 옮겨 준다. “첫 기록 열람실. 물품명 공란. 미로에게 원본 전표가 있습니다.” 정정 양식도 따라온다.',
              'Ves puts down the eraser and copies the loan number. “First record reading room. Item blank. Miro has the original receipt.” An amendment form follows.',
            ),
            effects: [{ kind: 'quest', id: 'q_return_record', stage: 1 }, { kind: 'flag', key: 'rd_clear_form' }],
          },
        },
        {
          label: t('삭제 대기 전술 페이지를 보존하자고 설득한다', 'Argue for preserving the tactical pages awaiting erasure'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 15 },
          assist: 'lin_yue',
          approval: { su_ah: 1 },
          success: {
            text: t(
              '베스가 이미 중복 판정된 페이지 한 장을 꺼낸다. “보존 위치 변경. 삭제가 아니니까 제 업무는 늘어나겠네요.” 종이 속 손동작이 다시 이어진다.',
              'Ves extracts a page already marked duplicate. “Storage location changed. Not deleted. That means more work for me.” The gesture within the page resumes.',
            ),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('“제 권한으로는 안 됩니다.” 베스가 신청서를 상급 검열함에 넣는다. 당신의 열람 흔적도 붙는다.', '“Outside my authority.” Ves files the request for a senior censor. Your access trace is attached.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('버려진 금속 장부 고리를 분류한다', 'Sort the discarded metal ledger rings'),
          intent: 'offer',
          success: {
            text: t('베스가 재료비를 건넨다. “이름은 안 지워도 되겠네요. 고리만 비우면 되니까.”', 'Ves pays for the salvage. “No names need erasing here. Just empty the rings.”'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
        },
        {
          label: t('장부에서 손을 뗀다', 'Leave the ledger alone'),
          intent: 'leave',
          success: { text: t('베스가 지우개를 집었다가 다시 내려놓는다.', 'Ves picks up the eraser, then puts it down again.') },
        },
      ],
    },
  },
}

const SLOT: DialogueDef = {
  id: 'd4rd_slot',
  start: 'compare',
  nodes: {
    compare: {
      text: t(
        '반납구 아래에는 아이 신발만 한 발판이 붙어 있다. 모서리의 발자국과 전표를 맞추는 홈이 같은 모양이다. 화면에는 독자 삭제와 물품 대조 버튼이 나란히 켜진다.',
        'A step the size of a child’s shoe sits beneath the slot. Its footprint-shaped corner matches the receipt recess. Delete reader and compare item glow side by side on the screen.',
      ),
      options: [
        {
          label: t('미로의 전표와 반납구의 발자국을 직접 대조한다', 'Compare Miro’s receipt with the footprint on the slot'),
          intent: 'insight',
          requires: { flag: 'rd_receipt', quest: { id: 'q_return_record', stage: 1 }, notFlag: 'rd_filed' },
          check: { stat: 'int', dc: 12 },
          assist: 'han',
          success: {
            text: t(
              '대출 중 표시는 열람실 발판 항목으로 옮겨간 뒤 반납 완료로 바뀐다. 최초 기록은 여전히 보관고 안이다. 예약표 가장자리에 검열 렌즈의 대조 지점이 찍힌다.',
              'The on-loan notice moves to the reading-room step, then changes to returned. The first record remains in its vault. A reservation prints with censor-lens reference points along its edge.',
            ),
            effects: [{ kind: 'quest', id: 'q_return_record', stage: 2 }, { kind: 'flag', key: 'rd_filed' }],
          },
          failure: {
            text: t(
              '자동 대조가 멈춘다. 화면이 방문 기록을 첨부한 수동 접수를 제안한다. 미로의 원본은 당신에게 없다. 보낼 것은 사본뿐이다.',
              'Automatic comparison stalls. The screen offers manual filing with your visit log attached. You do not hold Miro’s original. Only the copy will be submitted.',
            ),
            goto: 'manual',
          },
        },
        {
          label: t('사본을 넣고 접수 방식을 고른다', 'Insert the copy and choose a filing method'),
          intent: 'offer',
          requires: { flag: 'rd_receipt', quest: { id: 'q_return_record', stage: 1 }, notFlag: 'rd_filed' },
          success: {
            text: t('단말이 사본을 받는다. 사전 대조 승인 여부를 확인할 때까지 접수 화면이 열린 채 기다린다.', 'The terminal accepts the copy. The filing screen stays open while it waits for comparison clearance.'),
            goto: 'manual',
          },
        },
        {
          label: t('빈손을 저울에서 뗀다', 'Lift your empty hands off the scales'),
          intent: 'leave',
          success: { text: t('화면이 미로의 전표와 대출 번호를 요청한다. 발판은 움직이지 않는다.', 'The screen requests Miro’s receipt and the loan number. The step stays where it is.') },
        },
      ],
    },
    manual: {
      text: t(
        '두 줄의 접수 방식이 뜬다. 사전 대조 승인, 또는 방문 기록을 첨부한 수동 확인. 어느 쪽도 미로의 이름을 지우지 않는다. 사서 이오의 응답등이 새 전표를 기다린다.',
        'Two filing methods appear: prior comparison clearance, or manual verification with your visit log. Neither erases Miro’s name. Librarian Io’s reply light waits for the new receipt.',
      ),
      options: [
        {
          label: t('대조 승인을 적용한다', 'Apply the comparison clearance'),
          intent: 'offer',
          requires: { flag: 'rd_clear_form' },
          approval: { kai: 1 },
          success: {
            text: t(
              '미로의 빚이 닫히고 기록 열람 예약표가 나온다. 이오의 응답이 찍힌다. ‘예약 접수. 열람 승인은 별도입니다.’ 가장자리의 렌즈 위치표까지 챙긴다.',
              'Miro’s debt closes and a reading reservation prints. Io’s reply follows: “Reservation received. Access approval is separate.” You keep the lens-position chart printed along its edge.',
            ),
            effects: [{ kind: 'quest', id: 'q_return_record', stage: 2 }, { kind: 'flag', key: 'rd_filed' }],
          },
        },
        {
          label: t('내 방문 기록을 붙여 수동 접수한다', 'Attach your visit log and file manually'),
          intent: 'offer',
          approval: { kai: 1, tae_o: 1 },
          success: {
            text: t(
              '당신의 방문이 길게 기록되고 미로의 연체 항목이 닫힌다. 최초 기록은 보관고에 남는다. 이오가 보낸 예약표에는 입구 검열 렌즈의 위치가 작게 찍혀 있다.',
              'Your visit is logged in full and Miro’s overdue entry closes. The first record stays in its vault. Io’s reservation slip carries a small map of the entrance censor lenses.',
            ),
            effects: [{ kind: 'quest', id: 'q_return_record', stage: 2 }, { kind: 'flag', key: 'rd_filed' }, { kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('사본을 돌려받고 창을 닫는다', 'Retrieve the copy and close the window'),
          intent: 'leave',
          success: { text: t('반납구가 사본을 밀어낸다. 원본은 여전히 미로의 품에 있다.', 'The slot returns the copy. The original remains in Miro’s arms.') },
        },
      ],
    },
  },
}

export const D4_RETURN_DESK_DIALOGUES: DialogueDef[] = [CLERK, MIRO, APPRENTICE, SLOT]

export const D4_RETURN_DESK_NPCS: NpcDef[] = [
  {
    id: 'returns_clerk_tess',
    name: t('테스', 'Tess'),
    role: t('사서 이오의 응답을 중계하는 반납 담당 기계', 'Returns construct relaying librarian Io’s replies'),
    faction: 'grid',
    portrait: 'v2/npcs/returns_clerk_tess.webp',
  },
  {
    id: 'miro_reader',
    name: t('미로', 'Miro'),
    role: t('반납 카드 얼굴로 자기 이름을 기다리는 잊힌 독자', 'Forgotten card-faced reader waiting to hear their name'),
    faction: 'offgrid',
    portrait: 'v2/npcs/miro_reader.webp',
  },
  {
    id: 'returns_apprentice_ves',
    name: t('베스', 'Ves'),
    role: t('이름을 지워도 남는 빚을 이해하지 못하는 견습 검열자', 'Apprentice censor puzzled by debts that outlive erased names'),
    faction: 'grid',
    portrait: 'v2/npcs/returns_apprentice_ves.webp',
  },
]

export const D4_RETURN_DESK_QUESTS: QuestDef[] = [{
  id: 'q_return_record',
  title: t('첫 기록의 대출 전표', 'The First Record’s Loan Slip'),
  stages: [
    t('첫 번째 접속 기록의 대출 안내와 이오의 응답이 다르다. 미로가 같은 번호의 전표를 갖고 있다.', 'The first connector record loan notice conflicts with Io’s reply. Miro holds a receipt bearing the same number.'),
    t('열람실 발판의 반납을 정정하고 기록 열람을 예약한다. 기록 자체는 아직 보관고에 있다.', 'Correct the reading-room step’s return and reserve a reading. The record itself remains inside the vault.'),
  ],
  payoff: { stage: 2, bossMod: 'marked', text: t('예약표에 찍힌 검열 렌즈의 위치로 보스 경비의 약점을 짚는다.', 'Use the censor-lens locations on the reservation to pinpoint weak spots in the boss guard.') },
}]
