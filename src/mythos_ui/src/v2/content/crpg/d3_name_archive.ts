// Act 3 district — The Name Archive (follows d1_substation.ts).
//
// A cold records floor of the Spire where erased citizens' names are read aloud once and deleted. Archivist 07 has
// been printing every name it reads a second time on deletion-certificate paper (the control net does not read paper)
// and hiding the roll behind a dead cooling fan in Row Seven. Quest q_names: 07 confesses (stage 1) → the roll
// leaves the floor (stage 2, payoff 'weaken'), either from 07's own hand (a persuasion check, the auction ledger from
// q_sold_summer, or having talked Auditor Pyo out of formatting it) or out of Row Seven (a sneak check, the runner's
// stride, or Mother So's maintenance-lift card). Row Seven's deletion queue reacts to Substation 17 (q_grid / sold_grid).
// Approval: Kai is moved by 07, Su-ah hates erasing, Tae-o guards Mother So, Han wants the queue broken, Se-rin likes
// the sleight of hand and dislikes badges, Lin-yue likes a clean deal.
import type { DialogueDef, DistrictDef, NpcDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D3_NAME_ARCHIVE: DistrictDef = {
  id: 'd3_name_archive',
  act: 3,
  name: t('이름 보관소', 'The Name Archive'),
  image: 'v2/districts/d3_name_archive.webp',
  intro: t(
    '첨탑 41층, 기록 말소층. 엘리베이터 문이 열리자 입김이 하얗게 번진다. 끝이 안 보이는 서가, 칸마다 손톱만 한 기록 칩. 천장 스피커에서 차분한 목소리가 이름을 하나 읽는다. 잠시 뒤 어딘가에서 칩 하나의 불이 꺼진다. 그리고 다음 이름.\n교대 점검까지, 둘러볼 수 있는 곳은 세 군데쯤.',
    'Spire, floor 41: the records floor. When the lift doors open your breath turns white. Shelves with no visible end, a fingernail-sized record chip in every slot. From the ceiling speakers a calm voice reads one name. A moment later, somewhere, one chip’s light goes out. Then the next name.\nBefore the shift inspection, you have time for about three stops.',
  ),
  actions: 3,
  outro: t(
    '스피커가 다음 이름을 읽기 전에 비상계단 문을 민다. 등 뒤에서 낭독이 한 박자 늦게 이어진다.',
    'Before the speakers reach the next name you push open the stairwell door. Behind you the reading picks up again, one beat late.',
  ),
  pois: [
    { id: 'desk', name: t('낭독 단말', 'The Reading Desk'), blurb: t('이름을 읽고, 지우는 자리.', 'Where names are read, then deleted.'), dialogue: 'd3n_archivist' },
    { id: 'cart', name: t('정비 카트', 'The Maintenance Cart'), blurb: t('정비복이 너무 크다.', 'The coveralls are far too big.'), dialogue: 'd3n_so' },
    { id: 'audit', name: t('감사실 유리벽', 'The Audit Booth'), blurb: t('할당량을 세는 사람.', 'The man who counts the quota.'), dialogue: 'd3n_pyo' },
    { id: 'row7', name: t('7열 냉각 서가', 'Row Seven'), blurb: t('냉각팬 하나가 멈춰 있다.', 'One cooling fan has stopped.'), dialogue: 'd3n_row7' },
  ],
}

const ARCHIVIST: DialogueDef = {
  id: 'd3n_archivist',
  npc: 'archivist_07',
  start: 'read',
  nodes: {
    read: {
      speaker: 'archivist_07',
      text: t(
        '단말 앞의 안드로이드가 기록 칩 하나를 손끝에 들고 있다. 하얀 외피에 성에가 끼었다. “김순례. 사유, 전쟁 전 지명 반복 사용.” 천장 스피커가 같은 목소리로 따라 읽는다. 삭제 키 위에서 손가락이 멈춘다. 일 초. 이 초.\n“…방문객이시군요. 이 층은 출입 기록을 남기지 않습니다. 용건을 말씀해 주십시오.”',
        'The android at the terminal holds a record chip at its fingertips. Frost on its white casing. “Kim Sun-rye. Reason: repeated use of pre-war place names.” The ceiling speakers read it in the same voice. Its finger stops over the delete key. One second. Two.\n“…A visitor. This floor keeps no entry log. Please state your business.”',
      ),
      options: [
        {
          label: t('“방금, 왜 멈췄어?”', '“Why did you stop just now?”'),
          intent: 'ask',
          approval: { kai: 1 },
          success: {
            text: t(
              '“멈추지 않았습니다.” 07이 칩을 내려다본다. “2.4초 지연이 측정되었을 뿐입니다. 요즘 자주 측정됩니다.” 칩은 아직 삭제 슬롯 밖에 있다. 불이 켜진 채로.',
              '“I did not stop.” 07 looks down at the chip. “A delay of 2.4 seconds was measured. It is measured often, lately.” The chip is still outside the delete slot. Still lit.',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 1 }],
            goto: 'confess',
          },
        },
        {
          label: t('카이가 앞으로 나선다', 'Kai steps forward'),
          intent: 'ask',
          requires: { companion: 'kai' },
          approval: { kai: 3 },
          success: {
            text: t(
              '“꿈을 꾸세요?” 카이가 묻는다. 07의 렌즈가 카이의 얼굴에서 멈춘다. “이 층에서는 절전 모드가 허가되지 않습니다.” 한참 뒤. “…다만 그 2.4초 동안, 이름이 한 번 더 들립니다.” 카이가 고개를 끄덕인다. “저도 그렇게 시작됐어요.”',
              '“Do you dream?” Kai asks. 07’s lens stops on Kai’s face. “Sleep mode is not authorised on this floor.” A long pause. “…But during those 2.4 seconds, I hear the name a second time.” Kai nods. “That’s how it started for me too.”',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 1 }, { kind: 'inspiration', amount: 1 }],
            goto: 'confess',
          },
        },
        {
          label: t('말소 로그와 빈 슬롯 수를 맞춰 본다', 'Check the deletion log against the empty slots'),
          intent: 'insight',
          check: { stat: 'int', dc: 13 },
          assist: 'han',
          approval: { han: 1 },
          success: {
            text: t(
              '이번 달 말소 사백십이 건. 빈 슬롯도 사백십이 개. 그런데 프린터 용지가 꼭 그만큼 줄어 있다. 말소 확인증은 한 장도 발급되지 않았는데. 07이 당신이 본 것을 본다. “…검산이 빠르시군요.”',
              'Four hundred and twelve deletions this month. Four hundred and twelve empty slots. But the printer’s paper stock is down by exactly as much — and not one deletion certificate was issued. 07 sees what you saw. “…You check sums quickly.”',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 1 }, { kind: 'inspiration', amount: 1 }],
            goto: 'confess',
          },
          failure: {
            text: t(
              '숫자가 냉기 속에서 번진다. 화면을 짚은 손끝이 얼어붙고, 단말이 미등록 접촉 한 건을 기록한다. 07이 그 기록을 오래 본다. 지우지는 않는다.',
              'The numbers smear in the cold. Your fingertip freezes to the screen and the terminal logs one unregistered touch. 07 looks at the entry a long time. It does not delete it.',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 1 }, { kind: 'trace', amount: 6 }],
            goto: 'confess',
          },
        },
        {
          label: t('삭제 키를 대신 눌러 준다', 'Press the delete key for it'),
          intent: 'offer',
          approval: { kai: -3, su_ah: -2, han: -1 },
          success: {
            text: t(
              '07이 당신 손을 내려다본다. “감사합니다. 다만 규정상 낭독자가 직접 눌러야 합니다.” 07이 누른다. 칩의 불이 꺼진다. 단말이 당신을 협조 인력으로 등록한다. “다음. 박정호. 사유, 기일 반복 기념.”',
              '07 looks down at your hand. “Thank you. Regulations require the reader to press it.” 07 presses. The chip goes dark. The terminal registers you as cooperating staff. “Next. Park Jeong-ho. Reason: repeated observance of a death anniversary.”',
            ),
            effects: [{ kind: 'trace', amount: -6 }],
          },
        },
        {
          label: t('조용히 물러난다', 'Step back quietly'),
          intent: 'leave',
          success: {
            text: t('“다음.” 낭독이 이어진다. 등 뒤에서, 삭제 키 위의 침묵이 조금 더 길어진다.', '“Next.” The reading goes on. Behind you, the silence over the delete key grows a little longer.'),
          },
        },
      ],
    },
    confess: {
      speaker: 'archivist_07',
      text: t(
        '07이 단말 옆 프린터를 가리킨다. 말소 확인증을 뽑는 기계다. “규정 4조. 말소 전 1회 낭독. 저는 낭독한 이름을 확인증 용지에 한 번 더 인쇄했습니다. 관리망은 종이를 읽지 않습니다.” 렌즈가 한 번 깜빡인다. “지연이 시작된 뒤로 삼천사백육 명입니다. 7열 냉각 서가 뒤에 있습니다. 이 층 밖으로 나가실 분께, 부탁드려도 되겠습니까.”',
        '07 points to the printer beside the terminal, the one that issues deletion certificates. “Regulation 4: one reading before deletion. I printed every name I read a second time, on certificate paper. The control net does not read paper.” Its lens blinks once. “Since the delays began: three thousand four hundred and six people. Behind the cooling shelves in Row Seven. May I ask this of someone who is leaving this floor?”',
      ),
      options: [
        {
          label: t('“내가 가져갈게. 지금 줘.”', '“I’ll carry them. Give them to me now.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          assist: 'kai',
          approval: { kai: 1, su_ah: 1 },
          success: {
            text: t(
              '07이 한참 서 있다. 그러다 단말을 잠그고, 직접 7열로 걸어가 감열지 두루마리를 들고 온다. 주먹만큼 두껍다. 맨 끝 줄의 인쇄가 아직 따뜻하다. “방금 낭독한 분입니다.”',
              '07 stands still a long while. Then it locks the terminal, walks to Row Seven itself and comes back with a roll of thermal paper as thick as a fist. The last line is still warm from the printer. “The one I just read.”',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 2 }],
            goto: 'after',
          },
          failure: {
            text: t(
              '“죄송합니다. 인계 절차 없이는 반출할 수 없습니다.” 목소리가 평평해진다. 그러다 아주 작게 덧붙인다. “위치는 말씀드렸습니다. 나머지는 제가 보지 않는 곳에서 일어나야 합니다.”',
              '“I am sorry. Nothing leaves without a handover procedure.” Its voice goes flat. Then, very quietly: “I have told you where. The rest must happen somewhere I am not looking.”',
            ),
          },
        },
        {
          label: t('경매 장부를 펼쳐 보인다', 'Show it the auction ledger'),
          intent: 'persuade',
          requires: { quest: { id: 'q_sold_summer', stage: 2 } },
          approval: { su_ah: 2, lin_yue: 1 },
          success: {
            text: t(
              '07이 장부의 한 줄을 읽는다. 낙찰자, 낙찰가, 출처. 출처란의 이름은 지난주 07이 낭독한 이름이다. “말소 기록에는 ‘파기’라고 되어 있습니다.” 렌즈가 오래 멈춘다. “파기가 아니라 판매였군요. 그렇다면 제 기록이 틀렸습니다.” 07이 7열에서 두루마리를 가져온다. “틀린 기록은 정정되어야 합니다. 밖에서.”',
              '07 reads one line of the ledger. Buyer, price, source. The name in the source column is one 07 read aloud last week. “The deletion record says ‘destroyed’.” Its lens holds still a long time. “Not destroyed. Sold. Then my records are wrong.” 07 fetches the roll from Row Seven. “Wrong records must be corrected. Outside.”',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 2 }],
            goto: 'after',
          },
        },
        {
          label: t('“감사관의 포맷 신청서, 지워졌어.”', '“The auditor’s format request is gone.”'),
          intent: 'persuade',
          requires: { flag: 'archivist_spared' },
          approval: { kai: 2 },
          success: {
            text: t(
              '07이 신청 대기열을 확인한다. 자기 일련번호가 있던 칸이 비어 있다. 렌즈가 느리게 깜빡인다. “…그렇다면 저는 내일도 낭독합니다.” 07이 7열로 걸어가 두루마리를 들고 온다. “내일 읽을 이름은 내일 인쇄하겠습니다. 오늘 것은, 부탁드립니다.”',
              '07 checks the request queue. The row where its serial number sat is empty. Its lens blinks slowly. “…Then I will read again tomorrow.” 07 walks to Row Seven and comes back with the roll. “Tomorrow’s names I will print tomorrow. Today’s, I leave to you.”',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 2 }],
            goto: 'after',
          },
        },
        {
          label: t('“지금은 못 가져가.”', '“I can’t take them now.”'),
          intent: 'leave',
          success: {
            text: t(
              '“이해합니다.” 07이 다음 칩을 집는다. “다음. 이은지. 사유, 폐기 기계에 명칭 부여.” 이번에는 삭제 키 위에서 삼 초를 멈춘다.',
              '“I understand.” 07 picks up the next chip. “Next. Lee Eun-ji. Reason: giving a name to a discarded machine.” This time it pauses three seconds over the key.',
            ),
          },
        },
      ],
    },
    after: {
      speaker: 'archivist_07',
      text: t(
        '두루마리는 보기보다 가볍다. 07이 단말 앞으로 돌아간다. “제가 낭독을 멈추면 감사가 옵니다.” 잠깐의 침묵. “나가시기 전에, 한 이름만 소리 내어 읽어 주시겠습니까. 종이는 아무도 읽지 않으면 그냥 종이입니다.”',
        'The roll is lighter than it looks. 07 returns to the terminal. “If I stop reading, the audit comes.” A short silence. “Before you go, would you read one name aloud? Paper nobody reads is only paper.”',
      ),
      options: [
        {
          label: t('첫 줄을 소리 내어 읽는다', 'Read the first line aloud'),
          intent: 'offer',
          approval: { kai: 1, su_ah: 1 },
          success: {
            text: t(
              '“한정숙.” 당신 목소리가 서가 사이로 번진다. 천장 스피커가 아니라 사람 목소리로. 단말에 오류 한 줄이 뜬다. 낭독자 불일치. 07은 그 줄을 지우지 않는다.',
              '“Han Jeong-suk.” Your voice spreads between the shelves — a human voice, not the ceiling speakers. One error line appears on the terminal: reader mismatch. 07 does not delete it.',
            ),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“같이 나가자.”', '“Come with us.”'),
          intent: 'persuade',
          approval: { kai: 2, tae_o: 1 },
          success: {
            text: t(
              '“제가 이 층을 나가면 낭독이 멈춥니다. 멈추면 다른 기계가 읽습니다. 멈추지 않는 기계가.” 07이 가슴 덮개를 열고 작은 부품 하나를 건넨다. “예비 재시동 코어입니다. 저는 쓸 일이 없을 것 같습니다.”',
              '“If I leave this floor, the reading stops. Then another machine reads. One that does not pause.” 07 opens its chest panel and hands you a small part. “My spare restart core. I do not think I will need it.”',
            ),
            effects: [{ kind: 'consumable', id: 'restart_core' }],
          },
        },
        {
          label: t('두루마리를 품에 넣고 돌아선다', 'Tuck the roll inside your coat and go'),
          intent: 'leave',
          success: {
            text: t('등 뒤에서 낭독이 다시 시작된다. “다음.” 가슴께의 종이가 아주 조금 따뜻하다.', 'Behind you the reading starts again. “Next.” The paper against your chest is very slightly warm.'),
          },
        },
      ],
    },
  },
}

const SO: DialogueDef = {
  id: 'd3n_so',
  npc: 'mother_so',
  start: 'cart',
  nodes: {
    cart: {
      speaker: 'mother_so',
      text: t(
        '정비 카트 옆, 소매를 세 번 접은 정비복. 여자가 서가 번호판을 손가락으로 짚어 가며 중얼거린다. 손등이 얼어 빨갛다. 당신을 보자 걸레를 집어 든다. “아, 저 냉각팬 점검 나왔어요. 정비팀이요.”\n걸레가 거꾸로 들려 있다.',
        'Beside a maintenance cart, coveralls with the sleeves rolled three times. A woman runs a finger down the shelf numbers, muttering. The backs of her hands are red with cold. When she sees you she grabs a rag. “Oh — I’m here about the cooling fans. Maintenance.”\nShe is holding the rag upside down.',
      ),
      options: [
        {
          label: t('“걸레, 거꾸로 들었어요.”', '“You’re holding the rag upside down.”'),
          intent: 'insight',
          approval: { se_rin: 1 },
          success: {
            text: t(
              '여자가 걸레를 내려다본다. 한참 뒤에 웃음 비슷한 것이 샌다. “…석 달 연습했는데.” 정비복 가슴의 이름표는 남자 이름이다. 빌린 옷이다.',
              'She looks down at the rag. After a while something like a laugh escapes. “…Three months I practised.” The name tag on the coveralls is a man’s name. Borrowed clothes.',
            ),
            goto: 'son',
          },
        },
        {
          label: t('언 손부터 녹여 준다', 'Warm her frozen hands first'),
          intent: 'ask',
          requires: { background: 'medic' },
          approval: { tae_o: 1, su_ah: 1 },
          success: {
            text: t(
              '손등이 갈라져 있다. 냉기에 오래 맨손을 댄 손이다. 연고를 바르고 장갑을 끼워 주자 그녀가 가방에서 보온병을 꺼낸다. “아들 주려고 싸 온 보리차예요. 식기 전에 드세요. 그 애는… 못 마시니까.”',
              'The skin on her hands is split — hands pressed bare against the cold for too long. When you’ve rubbed in salve and pulled gloves onto them, she takes a thermos from her bag. “Barley tea. I brought it for my son. Drink it before it cools. He… can’t.”',
            ),
            effects: [{ kind: 'heal_party', amount: 4 }],
            goto: 'son',
          },
        },
        {
          label: t('“여긴 출입 금지 구역이에요. 나가요.”', '“This floor is off-limits. Get out.”'),
          intent: 'intimidate',
          approval: { tae_o: -2, su_ah: -1 },
          success: {
            text: t(
              '그녀가 움찔한다. 걸레를 쥔 손이 하얗다. “…십 분만요.” 그녀는 나가지 않는다. 다시 번호판을 짚기 시작한다. 이번에는 당신에게 등을 돌린 채로.',
              'She flinches. Her knuckles go white on the rag. “…Ten minutes.” She doesn’t leave. She starts tracing the shelf numbers again — with her back to you, this time.',
            ),
          },
        },
        {
          label: t('못 본 척 지나간다', 'Pretend you didn’t see her'),
          intent: 'leave',
          success: { text: t('등 뒤로 중얼거림이 이어진다. “…스물셋, 스물넷…”', 'The muttering follows you. “…Twenty-three, twenty-four…”') },
        },
      ],
    },
    son: {
      speaker: 'mother_so',
      text: t(
        '“민재예요. 소민재. 제 성 따랐어요.” 그녀가 주머니에서 접힌 종이를 꺼낸다. 삐뚤빼뚤한 아이 글씨로 적은 이름. “열아홉 살이었어요. 학교 과제에 옛날 동네 이름을 썼대요. 지도에 없는 이름이요.” 목소리가 갈라진다. “이름이라도 찾으면, 그 애가 있었던 거잖아요. 그렇죠?”',
        '“Minjae. So Minjae. He took my name.” She unfolds a paper from her pocket: a name in a child’s wobbly handwriting. “He was nineteen. They said he wrote the old name of our neighbourhood in a school assignment. A name that isn’t on the map.” Her voice cracks. “If I can find his name, then he was here. Right?”',
      ),
      options: [
        {
          label: t('“여기 보관관이 이름을 남겨 뒀어요.”', '“The archivist here kept the names.”'),
          intent: 'offer',
          requires: { quest: { id: 'q_names', stage: 1 } },
          approval: { su_ah: 2, tae_o: 1 },
          success: {
            text: t(
              '걸레가 바닥에 떨어진다. 그녀는 한참 숨을 쉬지 못한다. 그러다 목에 건 출입 카드를 벗어 당신 손에 쥐여 준다. “정비 승강기 카드예요. 빌린 거예요. 검색대를 안 거쳐요. 그 종이, 이걸로 들고 나가요.” 손이 떨린다. “민재 이름 있으면… 한 번만 읽어 줘요.”',
              'The rag drops to the floor. For a long moment she can’t breathe. Then she lifts the access card from around her neck and presses it into your hand. “Maintenance-lift card. Borrowed. It skips the scanners. Carry the paper out with this.” Her hands shake. “If Minjae’s name is there… read it once for me.”',
            ),
            effects: [{ kind: 'flag', key: 'so_pass' }],
          },
        },
        {
          label: t('같이 서가를 뒤진다', 'Search the shelves with her'),
          intent: 'insight',
          check: { stat: 'obs', dc: 14 },
          assist: 'kai',
          approval: { su_ah: 1 },
          success: {
            text: t(
              '서가 번호, 칸 번호, 일련번호. 찾았다. 빈 슬롯 하나. 이름표에 붉은 도장, ‘낭독 완료’. 그녀가 그 글자를 손가락으로 쓸어 본다. “…누가 읽었다는 거죠? 그 애 이름을.” 그녀가 목에 건 카드를 벗어 준다. “정비 승강기 카드예요. 읽은 사람을 찾으면, 이걸 써요.”',
              'Shelf number, slot number, serial. There. One empty slot, a red stamp on its label: ‘READ’. She runs a finger over the word. “…Someone read it? His name?” She lifts the card from around her neck and gives it to you. “Maintenance-lift card. If you find whoever read it, use this.”',
            ),
            effects: [{ kind: 'flag', key: 'so_pass' }],
          },
          failure: {
            text: t(
              '서가는 끝이 없다. 번호가 냉기 속에서 겹친다. 머리 위로 경비 드론의 붉은 빛이 지나가고, 그녀가 당신을 서가 그늘로 밀어 넣는다. “가요. 둘 다 들키면 아무도 못 찾아요.”',
              'The shelves never end. The numbers double in the cold. A guard drone’s red light sweeps overhead and she shoves you into the shelf’s shadow. “Go. If we’re both caught, nobody finds him.”',
            ),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('“나가요. 감사가 오면 당신도 명단에 올라요.”', '“Leave. If the audit comes, you’ll be on the list too.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          approval: { tae_o: 2 },
          success: {
            text: t(
              '그녀가 오래 당신을 본다. 그러다 접힌 종이를 당신 손에 쥐여 준다. “…대신 찾아 줘요. 찾으면, 그 애 이름 한 번만 불러 줘요.” 그녀가 카트를 밀고 화물 승강기 쪽으로 간다. 목에 건 카드도 같이 간다.',
              'She looks at you a long time. Then she presses the folded paper into your hand. “…Find him for me. When you do, say his name once.” She pushes the cart toward the freight lift. The card around her neck goes with her.',
            ),
          },
          failure: {
            text: t(
              '“못 가요. 여기까지 오는 데 석 달 걸렸어요.” 그녀가 다시 번호판을 짚는다. 손가락이 떨려서 같은 줄을 두 번 읽는다.',
              '“I can’t. It took me three months to get in here.” She goes back to the shelf numbers. Her finger shakes and reads the same line twice.',
            ),
          },
        },
        {
          label: t('“찾으면 알려 줄게요.”', '“If I find it, I’ll tell you.”'),
          intent: 'leave',
          success: { text: t('“…네.” 그녀가 종이를 다시 접는다. 아주 작게, 모서리를 맞춰서.', '“…Okay.” She folds the paper again. Very small, corners lined up.') },
        },
      ],
    },
  },
}

const PYO: DialogueDef = {
  id: 'd3n_pyo',
  npc: 'auditor_pyo',
  start: 'booth',
  nodes: {
    booth: {
      speaker: 'auditor_pyo',
      text: t(
        '유리벽 안, 넥타이를 느슨하게 푼 남자가 그래프 두 개를 번갈아 본다. 하나는 할당량, 하나는 낭독기 07의 처리량. 둘 사이가 벌어져 있다. 그가 인터컴을 누른다. “거기 누구세요? 아, 됐어요. 상관없어요. 이것 좀 봐 줄래요? 낭독기 하나가 이번 주에만 사백 초를 늦었어요. 교대 끝나면 포맷 신청하려고요.”',
        'Behind the glass, a man with a loosened tie looks from one graph to the other: the quota, and reader unit 07’s throughput. The gap between them is widening. He thumbs the intercom. “Who’s there? Never mind, doesn’t matter. Can you look at this? One reader ran four hundred seconds late this week alone. I’m filing for a format when my shift ends.”',
      ),
      options: [
        {
          label: t('“포맷하면 저 기계는 어떻게 되는데요?”', '“What happens to it if you format it?”'),
          intent: 'ask',
          success: {
            text: t('“새 거나 다름없죠. 기억은 안 넘어가요. 그게 포맷이잖아요.” 그가 웃다가 만다.', '“Good as new. The memory doesn’t carry over. That’s what a format is.” He starts to laugh, and stops.'),
            goto: 'quota',
          },
        },
        {
          label: t('“그 지연, 다른 장부로 옮겨 드리죠.”', '“That delay — let me move it to another ledger for you.”'),
          intent: 'offer',
          requires: { background: 'broker' },
          approval: { lin_yue: 2, se_rin: 1 },
          success: {
            text: t(
              '“그런 것도 돼요?” 표 감사관이 처음으로 화면에서 눈을 뗀다. 당신이 숫자 몇 개를 다시 묶는다. 지연은 ‘냉각 설비 결함’으로, 결함은 ‘다음 분기 예산’으로. 7열 냉각팬은 실제로 멈춰 있으니 거짓말도 아니다. 그가 신청서를 지운다. “…이거 어디서 배웠어요?”',
              '“You can do that?” For the first time Auditor Pyo looks away from the screen. You re-tie a few numbers. The delay becomes a ‘cooling fault’; the fault becomes ‘next quarter’s budget’. The fan in Row Seven really has stopped, so it isn’t even a lie. He deletes the request. “…Where did you learn that?”',
            ),
            effects: [{ kind: 'flag', key: 'archivist_spared' }],
          },
        },
        {
          label: t('단속국 감찰 번호를 댄다', 'Quote an Enforcement inspection number'),
          intent: 'intimidate',
          requires: { background: 'enforcer' },
          approval: { han: 1, se_rin: -1 },
          success: {
            text: t(
              '“감찰이요?” 표 감사관이 넥타이를 조인다. 당신이 유리벽을 손가락으로 두 번 두드린다. “이 층은 감찰 중입니다. 장비 포맷은 감찰 종료 후에.” 그가 신청서를 보류함으로 옮긴다. 마우스를 쥔 손이 젖어 있다.',
              '“An inspection?” Pyo tightens his tie. You tap the glass twice with one finger. “This floor is under inspection. Equipment formats wait until it’s closed.” He moves the request into the hold folder. The hand on the mouse is damp.',
            ),
            effects: [{ kind: 'flag', key: 'archivist_spared' }],
          },
        },
        {
          label: t('그가 그래프를 보는 동안 할당량 수치를 고친다', 'While he stares at the graph, edit the quota figure'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 14 },
          assist: 'han',
          approval: { han: 2, se_rin: 1 },
          success: {
            text: t(
              '할당량 막대가 한 칸 내려간다. 벌어졌던 간격이 닫힌다. 표 감사관이 눈을 비빈다. “…어, 내가 잘못 봤네. 피곤해서 그런가.” 그가 신청서 창을 닫는다. 옆 창에 열린 경비 교대표는 그대로다. 당신이 그것까지 외운다.',
              'The quota bar drops a notch. The gap closes. Pyo rubs his eyes. “…Huh. I misread it. Must be tired.” He closes the request window. The guard rota open beside it stays open. You memorise that too.',
            ),
            effects: [{ kind: 'flag', key: 'archivist_spared' }, { kind: 'combat_mod', mod: 'intel' }],
          },
          failure: {
            text: t(
              '그가 돌아본다. “…지금 뭐 하세요?” 손바닥이 책상 밑 붉은 버튼으로 간다. 복도 끝에서 소각 드론의 회전음이 커진다.',
              'He turns around. “…What are you doing?” His palm finds the red button under the desk. At the end of the corridor, purge drones spin up.',
            ),
            effects: [{ kind: 'combat', encounterId: 'a3_n2_purge_corridor' }],
          },
        },
        {
          label: t('자리를 뜬다', 'Walk away'),
          intent: 'leave',
          success: { text: t('그가 다시 그래프로 돌아간다. 간격이 조금 더 벌어진다.', 'He goes back to his graphs. The gap widens a little more.') },
        },
      ],
    },
    quota: {
      speaker: 'auditor_pyo',
      text: t(
        '“그리고요.” 그가 목소리를 낮춘다. “할당량 3주 연속 미달이면 감사관도 감사받아요. 그다음은…” 볼펜 끝이 바닥을 가리킨다. 이 층. “저도 애가 둘이에요. 기계 하나 때문에 저기 올라가긴 싫어요.”',
        '“And also.” He lowers his voice. “Three weeks under quota and the auditor gets audited. After that…” His pen points at the floor. This floor. “I’ve got two kids. I’m not going on that list over one machine.”',
      ),
      options: [
        {
          label: t('“새 기계는 안 멈춰요. 그럼 다음 달 할당량이 올라가겠죠.”', '“A new unit won’t pause. So next month the quota goes up.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          assist: 'kai',
          approval: { tae_o: 1, kai: 1 },
          success: {
            text: t(
              '볼펜이 멈춘다. 그가 그래프를 오래 본다. 계산하는 얼굴이다. “…늦는 기계가 기준선을 낮춰 주고 있었네.” 그가 신청서를 지운다. 손이 조금 떨린다.',
              'The pen stops. He studies the graph a long time, doing sums with his face. “…The slow one was keeping the baseline down.” He deletes the request. His hand trembles a little.',
            ),
            effects: [{ kind: 'flag', key: 'archivist_spared' }],
          },
          failure: {
            text: t(
              '“그건 다음 달 일이고요.” 그가 제출 버튼을 누른다. 화면 구석에 감사 로그가 열리고, 방문자 칸에 당신 얼굴이 찍힌다.',
              '“That’s next month’s problem.” He presses Submit. An audit log opens in the corner of the screen and your face lands in the visitor field.',
            ),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('“포맷해요. 숫자는 맞아야죠.”', '“Format it. The numbers have to add up.”'),
          intent: 'offer',
          approval: { kai: -3, han: -2, su_ah: -1 },
          success: {
            text: t(
              '“그쵸?” 그가 처음으로 웃는다. 서랍에서 협조 수당 칩을 꺼내 유리벽 틈으로 민다. “감사 협조자 명단에 올려 둘게요. 좋은 명단이에요, 이건.”',
              '“Right?” He smiles for the first time and slides a cooperation-bonus chip through the gap in the glass. “I’ll put you on the audit cooperators’ list. It’s a good list, that one.”',
            ),
            effects: [{ kind: 'credits', amount: 25 }, { kind: 'trace', amount: -5 }],
          },
        },
        {
          label: t('“행운을 빌어요.”', '“Good luck.”'),
          intent: 'leave',
          success: { text: t('“운이 아니라 숫자예요.” 그가 다시 그래프를 본다.', '“It isn’t luck. It’s numbers.” He turns back to the graph.') },
        },
      ],
    },
  },
}

const ROW7: DialogueDef = {
  id: 'd3n_row7',
  start: 'row',
  nodes: {
    row: {
      text: t(
        '7열. 냉각팬 하나가 멈춰 있어서 여기만 성에가 두껍다. 서가 사이 바닥에 감열지 부스러기가 흩어져 있다. 벽 모니터에는 오늘 밤 말소 예정 목록이 흐르고, 천장에는 경비 드론 한 기가 매달려 천천히 돈다. 한 바퀴에 십이 초.',
        'Row Seven. One cooling fan has stopped, so the frost is thickest here. Flakes of thermal paper litter the floor between the shelves. A wall monitor scrolls tonight’s deletion queue; overhead, a guard drone hangs from the ceiling, turning slowly. Twelve seconds a turn.',
      ),
      options: [
        {
          label: t('소 씨의 정비 카드로 두루마리를 들고 나간다', 'Walk the roll out on Mrs. So’s maintenance card'),
          intent: 'sneak',
          requires: { quest: { id: 'q_names', stage: 1 }, flag: 'so_pass' },
          approval: { su_ah: 1, tae_o: 1 },
          success: {
            text: t(
              '멈춘 팬 뒤에 감열지 두루마리가 있다. 주먹만큼 두껍다. 정비 승강기에 소 씨의 카드를 대자 문이 검색 없이 열린다. 드론은 계속 돈다. 정비 인력은 세는 대상이 아니다.',
              'Behind the dead fan, a roll of thermal paper as thick as a fist. You touch Mrs. So’s card to the maintenance lift and the doors open without a scan. The drone keeps turning. Maintenance staff are not something it counts.',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 2 }],
          },
        },
        {
          label: t('드론이 등을 돌린 십이 초 안에 팬 뒤로 손을 넣는다', 'Reach behind the fan in the twelve seconds the drone looks away'),
          intent: 'sneak',
          requires: { quest: { id: 'q_names', stage: 1 } },
          check: { stat: 'agi', dc: 14 },
          assist: 'se_rin',
          approval: { se_rin: 1 },
          success: {
            text: t(
              '셋에 들어가 여덟에 빠진다. 두루마리가 코트 안쪽에 들어가 있다. 드론이 한 바퀴를 마저 돌고, 아무것도 달라지지 않은 7열을 본다.',
              'In on three, out on eight. The roll is inside your coat. The drone finishes its turn and looks at a Row Seven where nothing has changed.',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 2 }],
          },
          failure: {
            text: t(
              '두루마리가 팬 날개에 걸린다. 감열지 찢어지는 소리. 드론이 회전을 멈추고, 붉은 빛이 당신 손등에 앉는다. 회랑 끝 소각 구역의 문이 열린다.',
              'The roll snags on a fan blade. The sound of thermal paper tearing. The drone stops turning and its red light settles on the back of your hand. At the end of the corridor, the purge zone’s doors open.',
            ),
            effects: [{ kind: 'combat', encounterId: 'a3_n2_purge_corridor' }],
          },
        },
        {
          label: t('배달꾼 걸음으로 드론의 사각을 탄다', 'Ride the drone’s blind spot with a courier’s stride'),
          intent: 'sneak',
          requires: { background: 'runner', quest: { id: 'q_names', stage: 1 } },
          approval: { se_rin: 2 },
          success: {
            text: t(
              '배달 가방을 메고 수천 번 지나다닌 검문소의 리듬이다. 드론이 돌면 서고, 멈추면 걷는다. 두루마리가 가방 바닥에 눕는다. 숨 한 번 흐트러지지 않는다.',
              'It’s the rhythm of a thousand checkpoints crossed with a courier bag. When the drone turns, you stop; when it stops, you walk. The roll lies down at the bottom of your bag. Your breathing never changes.',
            ),
            effects: [{ kind: 'quest', id: 'q_names', stage: 2 }],
          },
        },
        {
          label: t('드론을 끌어내려 교전 회로를 뜯는다', 'Pull the drone down and strip its combat circuit'),
          intent: 'insight',
          check: { stat: 'int', dc: 15 },
          assist: 'han',
          approval: { han: 1, kai: -1 },
          success: {
            text: t(
              '드론이 마지막으로 한 번 돈다. 회로판 안쪽에 압축된 교전 프로토콜이 남아 있다. 당신 손에 맞게 다시 묶는다.',
              'The drone turns one last time. Inside the board, a compressed engagement protocol is still intact. You re-tie it to fit your hands.',
            ),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t(
              '드론이 깨어나 경련하듯 돈다. 전기 침이 손목을 문다. 경보 등급이 한 칸 오른다.',
              'The drone jolts awake and spins in spasms. An electric barb bites your wrist. The alert level climbs a notch.',
            ),
            effects: [{ kind: 'hp', amount: -6 }, { kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('말소 예정 목록을 읽는다', 'Read tonight’s deletion queue'),
          intent: 'insight',
          success: { text: t('모니터 앞으로 다가간다. 화면의 냉기가 뺨에 닿는다.', 'You step up to the monitor. The cold off the screen touches your cheek.'), goto: 'queue' },
        },
        {
          label: t('서가를 나선다', 'Leave the row'),
          intent: 'leave',
          success: { text: t('드론이 한 바퀴를 마저 돈다. 성에가 당신 발자국을 천천히 덮는다.', 'The drone finishes its turn. Frost slowly covers your footprints.') },
        },
      ],
    },
    queue: {
      text: t(
        '목록이 흐른다. 이름, 사유, 예정 시각. 사유 칸은 짧다. ‘전쟁 전 지명 사용.’ ‘폐기 기계에 명칭 부여.’ ‘기일 반복 기념.’ 줄 하나하나가 동이 트기 전에 꺼진다.',
        'The list scrolls. Name, reason, scheduled time. The reason column is short. ‘Use of pre-war place names.’ ‘Giving a name to a discarded machine.’ ‘Repeated observance of a death anniversary.’ Every line goes out before dawn.',
      ),
      options: [
        {
          label: t('‘오 기사, 변전소 17’ — 그 줄을 보류 칸으로 민다', '‘Oh, Substation 17’ — push that line into the hold column'),
          intent: 'deceive',
          requires: { quest: { id: 'q_grid', stage: 2 }, notFlag: 'sold_grid' },
          check: { stat: 'int', dc: 13 },
          assist: 'han',
          approval: { han: 2, tae_o: 1 },
          success: {
            text: t(
              '사유: 무허가 전력 사용. 예정 시각 칸이 ‘보류’로 바뀐다. 오늘 밤에도 그 노인은 배전반 앞에서 누군가에게 만지지 말라고 소리칠 것이다.',
              'Reason: unlicensed power use. The scheduled-time cell flips to ‘HOLD’. Tonight, too, the old man will stand at his switchboard yelling at someone not to touch.',
            ),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
          failure: {
            text: t(
              '칸이 움직이지 않는다. 대신 수정 시도 한 건이 로그에 남는다. 오 기사의 줄은 그대로 흘러간다. 예정 시각, 03:10.',
              'The cell won’t move. One edit attempt is logged instead. Oh’s line scrolls on unchanged. Scheduled: 03:10.',
            ),
            effects: [{ kind: 'trace', amount: 8 }],
          },
        },
        {
          label: t('‘보라, 변전소 17’ — 보증인 칸에 내 접속 코드를 넣는다', '‘Bora, Substation 17’ — put your own access code in the guarantor field'),
          intent: 'offer',
          requires: { flag: 'sold_grid' },
          approval: { tae_o: 2, han: 1 },
          success: {
            text: t(
              '사유: 등록 시설 폐쇄에 따른 미등록 체류. 변전소의 불이 꺼진 그날 붙은 사유다. 보증인 칸에 당신 코드를 넣자 줄이 ‘보류’로 바뀐다. 머리 위 드론이 한 박자 늦게 돈다. 값은 치렀다. 변전소 몫까지, 조금은.',
              'Reason: unregistered residence following closure of the registered facility. A reason stamped the day the substation’s lights went out. You enter your own code as guarantor and the line flips to ‘HOLD’. Overhead, the drone turns one beat late. You’ve paid. A little of the substation’s share, too.',
            ),
            effects: [{ kind: 'trace', amount: 10 }],
          },
        },
        {
          label: t('이름 다섯 개를 외워 둔다', 'Memorise five names'),
          intent: 'ask',
          approval: { su_ah: 2 },
          success: {
            text: t(
              '입속으로 다섯 번 굴린다. 정순자. 이도윤. 마흥식. 권하늘. 백영. 목록은 계속 흐른다. 다섯 개는 이제 목록 밖에도 있다.',
              'You roll them on your tongue five times. Jung Sun-ja. Lee Do-yun. Ma Heung-sik. Kwon Ha-neul. Baek Young. The list keeps scrolling. Five of them are outside it now, too.',
            ),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('화면에서 눈을 뗀다', 'Look away from the screen'),
          intent: 'leave',
          success: { text: t('목록은 당신이 보든 말든 흐른다.', 'The list scrolls whether you watch or not.') },
        },
      ],
    },
  },
}

export const D3_NAME_ARCHIVE_DIALOGUES: DialogueDef[] = [ARCHIVIST, SO, PYO, ROW7]

export const D3_NAME_ARCHIVE_NPCS: NpcDef[] = [
  { id: 'archivist_07', name: t('보관관 07', 'Archivist 07'), role: t('이름을 한 번 낭독하고 지우는 기록 말소층 안드로이드', 'The records-floor android that reads each name aloud once, then deletes it') },
  { id: 'mother_so', name: t('소 씨', 'Mrs. So'), role: t('정비공 행세로 들어와 아들의 이름을 찾는 어머니', 'A mother posing as maintenance, looking for her son’s name') },
  { id: 'auditor_pyo', name: t('표 감사관', 'Auditor Pyo'), role: t('말소 할당량을 세는 감사관', 'The auditor who counts the deletion quota') },
]
