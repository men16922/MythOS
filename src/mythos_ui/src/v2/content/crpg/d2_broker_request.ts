// Act 2 — Lin Yue's Quiet Commission: recover a sealed memory fragment from a pawn vault.
// q_fragment: accept the sealed commission → recover the fragment → hand it to Lin Yue or her courier.
// Sae → Gyeom → Mijin completes the quest in three visits; deployed Lin Yue can accept it at the vault.
// No route reads the client's memory without consent. br_delivered prevents a second handover.
// Budget: 20 credits at Mijin, one card pick at the workbench; boss payoff = marked.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D2_BROKER_REQUEST: DistrictDef = {
  id: 'd2_broker_request',
  act: 2,
  name: t('린위에의 은밀한 의뢰', 'Lin Yue’s Quiet Commission'),
  image: 'v2/districts/d2_broker_request.webp',
  intro: t(
    '야시장 전당포의 저울이 유리벽 안에서 혼자 흔들린다. 금고 정리일. 찾아가지 않은 기억에는 새 가격표가 붙는다. 접수대 위 봉투 하나에는 받는 사람 대신 금빛 비녀가 그려져 있다.\n금고가 야간 봉쇄되기 전까지 세 곳을 들를 수 있다.',
    'The pawnshop scales sway behind glass. Vault clearance night: new price tags go onto unclaimed memories. An envelope on the counter bears a gold hairpin instead of an addressee.\nThere is time for three stops before the vault locks for the night.',
  ),
  actions: 3,
  outro: t(
    '금고의 잠금쇠가 바깥쪽부터 차례로 닫힌다. 저울 아래의 영업 종료 팻말이 뒤집힌다. 시장의 흥정 소리가 다시 가까워진다.',
    'The vault bolts close in sequence from the outside in. The sign beneath the scales flips to CLOSED. Market bargaining grows loud again.',
  ),
  pois: [
    { id: 'contract', name: t('접수대의 밀봉 의뢰', 'The Sealed Commission'), blurb: t('가격표에 없는 조건.', 'A condition absent from the price tag.'), dialogue: 'd2br_sae' },
    { id: 'vault', name: t('전당 금고', 'The Pawn Vault'), blurb: t('분실물에도 보관료가 붙는다.', 'Even lost property accrues a fee.'), dialogue: 'd2br_gyeom' },
    { id: 'courier', name: t('회수인의 빈 상자', 'The Courier’s Empty Case'), blurb: t('내용보다 봉인을 확인한다.', 'Checks the seal, not the contents.'), dialogue: 'd2br_mijin' },
    { id: 'bench', name: t('감정 작업대', 'The Appraisal Bench'), blurb: t('기억을 열지 않고 읽는 흠집.', 'Marks you can read without opening a memory.'), dialogue: 'd2br_bench' },
  ],
}

const SAE: DialogueDef = {
  id: 'd2br_sae',
  npc: 'br_sae',
  start: 'envelope',
  nodes: {
    envelope: {
      speaker: 'br_sae',
      text: t(
        '접수원 새가 봉투를 뒤집는다. “린위에 씨 의뢰예요. 분실한 기억 조각 하나. 월광호 화물에서 이 금고로 잘못 들어왔대요.” 손톱이 마지막 문장을 짚는다. “열지 말고 돌려줄 것.”',
        'Sae turns the envelope over. “A commission from Lin Yue. One lost memory fragment. Misrouted here from Moonlight cargo.” A fingernail underlines the last sentence. “Return unopened.”',
      ),
      options: [
        {
          label: t('“봉인은 그대로. 회수 절차를 알려 주세요.”', '“Seal stays intact. Tell me the recovery procedure.”'),
          intent: 'offer',
          approval: { lin_yue: 2, su_ah: 1 },
          success: {
            text: t('새가 인수란을 펼친다. “금고에서 찾고, 회수인 미진에게 맡기세요. 의뢰인이 오셨다면 직접 드려도 되고요.”', 'Sae unfolds the receipt. “Collect it at the vault and give it to Mijin, the courier. If the client is here, hand it over directly.”'),
            effects: [{ kind: 'quest', id: 'q_fragment', stage: 1 }],
            goto: 'terms',
          },
        },
        {
          label: t('린위에에게 숨겨 둔 조건부터 묻는다', 'Ask Lin Yue for every condition up front'),
          intent: 'ask',
          requires: { companion: 'lin_yue' },
          approval: { lin_yue: 2 },
          success: {
            text: t('린위에가 부채를 접는다. “좋아. 조건 듣기도 전에 고개부터 끄덕이는 사람은 비싸게 치르더라.”', 'Lin Yue folds her fan. “Good. People who nod before hearing the terms usually pay dearly.”'),
            effects: [{ kind: 'quest', id: 'q_fragment', stage: 1 }],
            goto: 'lin',
          },
        },
        {
          label: t('“기억 내용을 먼저 알려 줘야 움직이죠.”', '“Tell me what’s in the memory before I do anything.”'),
          intent: 'intimidate',
          approval: { lin_yue: -2, su_ah: -1 },
          success: {
            text: t('새가 봉투를 덮는다. “회수 의뢰예요. 감정 의뢰가 아니라.” 서류는 다시 서랍으로 들어간다.', 'Sae covers the envelope. “Recovery. Not appraisal.” The papers return to the drawer.'),
          },
        },
        {
          label: t('봉투를 내려놓는다', 'Put the envelope down'),
          intent: 'leave',
          success: { text: t('새가 봉투 모서리를 접수대 끝에 맞춘다.', 'Sae aligns the envelope with the edge of the counter.') },
        },
      ],
    },
    lin: {
      speaker: 'lin_yue',
      text: t(
        '“월광호에서 오기로 한 물건이야. 돈으로 끝냈다고 적어 둔 거래인데, 그쪽엔 아직 남은 게 있었나 봐.” 린위에가 봉투의 비녀 그림을 가린다. “누구 기억인지는 말 안 할게. 그 조건이 싫으면 지금 거절해.”',
        '“It was meant to come from the Moonlight. I’d marked that account settled. Seems the other side still had something left.” Lin Yue covers the hairpin drawing. “I won’t say whose memory it is. If that doesn’t suit you, refuse now.”',
      ),
      options: [
        {
          label: t('“회수할게. 대신 추가 조건은 먼저 말해.”', '“I’ll recover it. Any new terms, tell me first.”'),
          intent: 'offer',
          approval: { lin_yue: 3 },
          success: {
            text: t('“당연하지. 네 몫까지 멋대로 계산하진 않아.” 린위에가 접수원에게 인수란을 펴 달라고 한다.', '“Of course. I don’t get to price your share for you.” Lin Yue asks the clerk to unfold the receipt.'),
            goto: 'terms',
          },
        },
        {
          label: t('“이번엔 호의로 해 줄게. 나중에 갚아.”', '“Call it a favour. You can repay me later.”'),
          intent: 'offer',
          approval: { lin_yue: -1 },
          success: {
            text: t('“나중에 얼마인지부터 정해. 빈칸 있는 장부는 싫어.” 린위에가 봉투를 그대로 둔다.', '“Then name the price before later arrives. I dislike blank entries.” Lin Yue leaves the envelope where it is.'),
            goto: 'terms',
          },
        },
        {
          label: t('조건을 받아들이지 않는다', 'Decline the terms'),
          intent: 'leave',
          success: { text: t('“알았어. 거절도 거래의 일부지.” 린위에가 부채를 다시 편다.', '“Fair enough. Refusing is part of a deal too.” Lin Yue opens her fan again.') },
        },
      ],
    },
    terms: {
      speaker: 'br_sae',
      text: t(
        '“물건 번호, 봉인 모양, 보관함 위치. 이 세 개는 공개예요.” 새가 금고 표를 내민다. 보관료 칸에 ‘오배송 책임 미확정’이라고 적혀 있다.',
        '“Item number, seal pattern, locker location. Those three are public.” Sae hands over the vault slip. The fee column reads: “Liability for misrouting unresolved.”',
      ),
      options: [
        {
          label: t('브로커 관행에 따라 오배송 수수료를 보류시킨다', 'Invoke brokerage practice to suspend the misrouting fee'),
          intent: 'persuade',
          requires: { background: 'broker' },
          approval: { lin_yue: 2 },
          success: {
            text: t('새가 정정 도장을 찍는다. “책임 확정 전 청구 불가. 겸 씨한테 이 줄을 보여 주세요.”', 'Sae stamps a correction. “No billing until liability is established. Show Gyeom this line.”'),
            effects: [{ kind: 'flag', key: 'br_receipt' }],
          },
        },
        {
          label: t('공개된 번호와 봉인만 받아 적는다', 'Copy only the public number and seal'),
          intent: 'insight',
          success: {
            text: t('새가 내용란을 가린 채 서류를 기울여 준다. 봉인은 금빛 실 두 줄. 빠진 매듭은 없다.', 'Sae tilts the paper with its contents field covered. Two gold threads form the seal. No knots are missing.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('접수대를 떠난다', 'Leave the counter'),
          intent: 'leave',
          success: { text: t('새가 서류의 내용란부터 접는다.', 'Sae folds the contents field out of sight first.') },
        },
      ],
    },
  },
}

const GYEOM: DialogueDef = {
  id: 'd2br_gyeom',
  npc: 'br_gyeom',
  start: 'vault',
  nodes: {
    vault: {
      speaker: 'br_gyeom',
      text: t(
        '금고지기 겸이 유리 상자들을 수평으로 맞춘다. “열쇠보다 장부가 먼저예요.” 금빛 실로 봉한 조각 하나가 분실물 칸에 있다. 겸이 손등으로 유리의 먼지를 닦는다.',
        'Vault keeper Gyeom levels the glass cases. “Ledger before keys.” A fragment bound with gold thread rests in lost property. Gyeom wipes dust from the glass with the back of a hand.',
      ),
      options: [
        {
          label: t('밀봉 의뢰의 물건 번호를 제시한다', 'Present the sealed commission’s item number'),
          intent: 'ask',
          requires: { quest: { id: 'q_fragment', stage: 1 } },
          success: {
            text: t('겸이 번호를 대조하고 분실물 서랍을 연다. “맞아요. 미정산 보관료가 남았고요.”', 'Gyeom checks the number and opens the lost-property drawer. “That’s it. Storage fees remain unsettled.”'),
            goto: 'fee',
          },
        },
        {
          label: t('자물쇠의 마모를 살펴 전당포 경비 방식을 배운다', 'Study worn locks to understand the pawnshop’s security'),
          intent: 'insight',
          check: { stat: 'obs', dc: 12 },
          assist: 'lin_yue',
          success: {
            text: t('교체한 자물쇠만 새로 빛난다. 겸이 경비 드론의 점검 위치도 가리킨다. “파손은 그쪽에서 생겨요.”', 'Only the replacement locks shine. Gyeom points out the guard drone’s inspection points. “That’s where the damage happens.”'),
            effects: [{ kind: 'combat_mod', mod: 'marked' }],
          },
          failure: {
            text: t('유리 반사에 눈이 부신다. 겸이 조명을 낮추지만 눈앞의 잔상은 남는다.', 'Reflections dazzle you. Gyeom dims the light, but the afterimage lingers.'),
          },
        },
        {
          label: t('금고에서 물러난다', 'Step away from the vault'),
          intent: 'leave',
          success: { text: t('겸이 유리 상자의 수평을 다시 맞춘다.', 'Gyeom levels the glass cases again.') },
        },
      ],
    },
    fee: {
      speaker: 'br_gyeom',
      text: t(
        '“보관료는 스무 크레딧. 이의 신청도 받아요. 다만 외부 감사망에 신청자 얼굴이 남죠.” 겸이 봉인에 손대지 않고 상자를 돌린다. 옆면에 잘못 찍힌 입고 날짜가 보인다.',
        '“Twenty credits for storage. You can dispute it, but the external audit grid records the claimant’s face.” Gyeom turns the case without touching its seal. The intake date on its side is plainly misprinted.',
      ),
      options: [
        {
          label: t('새의 정정 도장을 보여 준다', 'Show Sae’s correction stamp'),
          intent: 'persuade',
          requires: { flag: 'br_receipt' },
          approval: { lin_yue: 1 },
          success: {
            text: t('겸이 미정산 칸을 지운다. “서류가 먼저라니까요.” 밀봉 상자가 당신 쪽으로 온다.', 'Gyeom clears the unsettled-fee field. “Ledger before keys, as I said.” The sealed case slides toward you.'),
            effects: [{ kind: 'quest', id: 'q_fragment', stage: 2 }],
            goto: 'sealed',
          },
        },
        {
          label: t('보관료를 낸다 (20크레딧)', 'Pay storage (20 credits)'),
          intent: 'offer',
          requires: { minCredits: 20 },
          success: {
            text: t('겸이 영수증을 상자 밑에 끼워 준다. 금빛 실은 처음 그대로다.', 'Gyeom slips the receipt beneath the case. The gold threads remain untouched.'),
            effects: [{ kind: 'credits', amount: -20 }, { kind: 'quest', id: 'q_fragment', stage: 2 }],
            goto: 'sealed',
          },
        },
        {
          label: t('입고 날짜의 모순을 설명해 청구를 취소시킨다', 'Explain the intake-date error and challenge the charge'),
          intent: 'persuade',
          check: { stat: 'int', dc: 14 },
          assist: 'lin_yue',
          approval: { lin_yue: 2 },
          success: {
            text: t('도착하기 전부터 요금이 붙었다. 겸이 날짜를 다시 읽고 고개를 끄덕인다. “이건 청구 못 하겠네요.”', 'The charges began before the shipment arrived. Gyeom rereads the dates and nods. “Can’t bill that.”'),
            effects: [{ kind: 'quest', id: 'q_fragment', stage: 2 }],
            goto: 'sealed',
          },
          failure: {
            text: t('“제가 취소하려면 감사 접수가 필요해요.” 겸이 신청을 올린다. 당신 얼굴이 기록된 뒤, 수수료가 지워지고 상자가 나온다.', '“I need an audit filing to cancel this.” Gyeom submits it. Your face is logged, the fee is cleared, and the case comes out.'),
            effects: [{ kind: 'trace', amount: 6 }, { kind: 'quest', id: 'q_fragment', stage: 2 }],
            goto: 'sealed',
          },
        },
        {
          label: t('신원을 남기고 정식 이의를 신청한다', 'File a formal dispute under your own identity'),
          intent: 'persuade',
          success: {
            text: t('감사 렌즈가 얼굴을 훑는다. 오배송 표가 확인되자 겸이 비용을 지우고 상자를 건넨다.', 'The audit lens scans your face. Once the misrouting slip is verified, Gyeom clears the fee and hands over the case.'),
            effects: [{ kind: 'trace', amount: 6 }, { kind: 'quest', id: 'q_fragment', stage: 2 }],
            goto: 'sealed',
          },
        },
        {
          label: t('회수를 보류한다', 'Postpone collection'),
          intent: 'leave',
          success: { text: t('겸이 상자를 분실물 칸으로 되돌린다.', 'Gyeom returns the case to lost property.') },
        },
      ],
    },
    sealed: {
      text: t(
        '기억 조각은 불투명한 상자 안에서 작게 울린다. 봉인은 금빛 실 두 줄. 회수인 미진의 인수 도장 자리가 뚜껑 위에 비어 있다.',
        'The memory fragment hums inside its opaque case. Two gold threads seal it. A space for courier Mijin’s receipt stamp lies empty on the lid.',
      ),
      options: [
        {
          label: t('린위에에게 봉인째 건넨다', 'Hand the sealed case to Lin Yue'),
          intent: 'offer',
          requires: { companion: 'lin_yue', notFlag: 'br_delivered' },
          approval: { lin_yue: 3 },
          success: {
            text: t('린위에가 매듭을 세고 상자를 소매 안에 넣는다. “정산 끝. 이건 내 몫.” 그녀가 경비 장비 약점이 적힌 별도 쪽지를 준다. 기억 상자는 열지 않는다.', 'Lin Yue counts the knots and slips the case into her sleeve. “Account settled. My part.” She gives you a separate note listing guard-equipment weaknesses. The memory case stays shut.'),
            effects: [{ kind: 'quest', id: 'q_fragment', stage: 3 }, { kind: 'flag', key: 'br_delivered' }],
          },
        },
        {
          label: t('상자를 챙겨 회수인에게 갈 준비를 한다', 'Pack the case for delivery to the courier'),
          intent: 'leave',
          approval: { lin_yue: 1 },
          success: {
            text: t('겸이 완충재를 덧대 준다. “미진 씨는 바깥 계단에 있어요. 봉인부터 보여 주세요.”', 'Gyeom adds padding. “Mijin is on the outer stairs. Show her the seal first.”'),
          },
        },
      ],
    },
  },
}

const MIJIN: DialogueDef = {
  id: 'd2br_mijin',
  npc: 'br_mijin',
  start: 'case',
  nodes: {
    case: {
      speaker: 'br_mijin',
      text: t(
        '미진이 빈 운반 상자 옆에서 인수 도장을 닦는다. “받는 사람은 린위에. 내용은 모릅니다. 그게 제 일이에요.” 열린 손바닥이 상자가 들어갈 자리를 가리킨다.',
        'Mijin cleans a receipt stamp beside an empty carrying case. “Recipient: Lin Yue. Contents: unknown. That’s my job.” Her open palm indicates where the parcel goes.',
      ),
      options: [
        {
          label: t('회수한 기억 조각의 봉인을 보여 주고 맡긴다', 'Show the recovered fragment’s seal and entrust it to her'),
          intent: 'offer',
          requires: { quest: { id: 'q_fragment', stage: 2 }, notFlag: 'br_delivered' },
          approval: { lin_yue: 2, su_ah: 1 },
          success: {
            text: t('미진이 매듭을 확인하고 도장을 찍는다. “수령.” 답례 봉투에는 의뢰인이 따로 준비한 경비 장비 약점표가 들어 있다. 운반 상자가 잠긴다.', 'Mijin checks the knots and stamps the lid. “Received.” A return envelope contains the client’s separately prepared notes on guard-equipment weaknesses. The carrying case locks shut.'),
            effects: [{ kind: 'quest', id: 'q_fragment', stage: 3 }, { kind: 'flag', key: 'br_delivered' }],
          },
        },
        {
          label: t('“의뢰인에게 직접 전달했어요.”', '“I handed it to the client herself.”'),
          intent: 'ask',
          requires: { flag: 'br_delivered' },
          success: {
            text: t('미진이 인수 기록을 확인한다. “네, 접수됐네요. 빈 상자라도 확인은 해야죠.” 뚜껑을 닫는다.', 'Mijin checks the receipt log. “Yes, recorded. Even an empty case needs accounting for.” She closes the lid.'),
          },
        },
        {
          label: t('빈 운반 상자를 계단 위까지 날라 준다', 'Carry empty transit cases up the stairs'),
          intent: 'offer',
          check: { stat: 'str', dc: 11 },
          success: {
            text: t('상자들이 정해진 선 안에 쌓인다. 미진이 운반비를 건넨다. “의뢰하고는 별개예요. 일하신 값.”', 'The cases stack inside their marked lines. Mijin pays the carrying fee. “Separate from the commission. For your work.”'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
          failure: {
            text: t('모서리가 난간에 걸린다. 상자는 무사하지만 어깨에 무게가 몰린다. 미진이 반대편을 받아 든다.', 'A corner catches on the railing. The case is fine, but the weight strains your shoulder. Mijin takes the other end.'),
            effects: [{ kind: 'hp', amount: -2 }],
          },
        },
        {
          label: t('계단을 비켜 준다', 'Clear the stairs'),
          intent: 'leave',
          success: { text: t('미진이 도장 뚜껑을 닫고 다음 발소리를 기다린다.', 'Mijin caps her stamp and waits for the next footsteps.') },
        },
      ],
    },
  },
}

const BENCH: DialogueDef = {
  id: 'd2br_bench',
  start: 'glass',
  nodes: {
    glass: {
      text: t('감정 작업대에는 내용이 지워진 연습용 칩과 확대경이 놓여 있다. 안내문에 ‘봉인은 뜯지 마시오’라고 적혀 있다. 칩 외피에도 읽을 것은 많다.', 'Blank practice chips and a magnifier lie on the appraisal bench. A notice reads: “Do not break seals.” There is plenty to read on a chip’s casing.'),
      options: [
        {
          label: t('연습용 칩으로 정밀 조작을 익힌다', 'Practise precision work on the blank chips'),
          intent: 'insight',
          success: {
            text: t('확대경 아래서 접점 하나가 길처럼 넓어진다. 옆에 놓인 훈련 도식 중 하나를 골라 손에 익힌다.', 'Under the lens, one contact widens into a road. You pick a training diagram and practise until the motion settles into your hands.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('분실품 외피의 이동 흔적만 조사한다', 'Study transit marks on the lost-property casings'),
          intent: 'insight',
          check: { stat: 'obs', dc: 13 },
          assist: 'lin_yue',
          approval: { lin_yue: 1, su_ah: 1 },
          success: {
            text: t('봉인에 손대지 않고도 어느 검사대를 거쳤는지 보인다. 순찰이 적은 반출 시간을 찾아 적는다.', 'Without touching a seal, you can tell which inspection desks a case passed. You note a dispatch interval with fewer patrols.'),
            effects: [{ kind: 'trace', amount: -4 }],
          },
          failure: {
            text: t('흠집이 너무 겹쳐 있다. 확실하지 않은 추측은 적지 않는다.', 'Too many scratches overlap. You leave uncertain guesses off the page.'),
          },
        },
        {
          label: t('확대경을 덮는다', 'Cover the magnifier'),
          intent: 'leave',
          success: { text: t('먼지 덮개 아래에서 칩의 빛이 흐려진다.', 'The chips dim beneath the dust cover.') },
        },
      ],
    },
  },
}

export const D2_BROKER_REQUEST_DIALOGUES: DialogueDef[] = [SAE, GYEOM, MIJIN, BENCH]

export const D2_BROKER_REQUEST_NPCS: NpcDef[] = [
  { id: 'br_sae', name: t('새', 'Sae'), role: t('공개 조건만 읽어 주는 전당포 접수원', 'A pawn clerk who reads only the public terms'), portrait: 'v2/npcs/br_sae.webp', faction: 'market' },
  { id: 'br_gyeom', name: t('겸', 'Gyeom'), role: t('봉인과 장부를 지키는 금고지기', 'A vault keeper guarding seals and ledgers'), portrait: 'v2/npcs/br_gyeom.webp', faction: 'market' },
  { id: 'br_mijin', name: t('미진', 'Mijin'), role: t('내용을 묻지 않는 기억 회수인', 'A memory courier who never asks what is inside'), portrait: 'v2/npcs/br_mijin.webp', faction: 'market' },
]

export const D2_BROKER_REQUEST_QUESTS: QuestDef[] = [{
  id: 'q_fragment',
  title: t('열지 않은 상자', 'The Unopened Case'),
  stages: [
    t('린위에의 의뢰를 받았다. 전당 금고의 기억 조각을 봉인째 회수해야 한다.', 'You take Lin Yue’s commission: recover the memory fragment from the pawn vault with its seal intact.'),
    t('밀봉 상자를 회수했다. 린위에에게 직접 주거나 회수인 미진에게 맡겨야 한다.', 'You recover the sealed case. Give it directly to Lin Yue or entrust it to courier Mijin.'),
    t('봉인된 기억을 전달했다. 답례로 받은 별도 문서에는 경비 장비의 약점이 적혀 있다.', 'You deliver the sealed memory. The separate document you receive in return lists guard-equipment weaknesses.'),
  ],
  payoff: { stage: 3, bossMod: 'marked', text: t('린위에의 약점표로 보스에게 표식을 남긴다.', 'Lin Yue’s equipment notes let you mark the boss’s weak points.') },
}]
