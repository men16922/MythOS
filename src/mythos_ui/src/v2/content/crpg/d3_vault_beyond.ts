// Act 3 — Beyond the Lock. ARK stores rejected memories behind a two-person safety seal.
// q_vault_beyond: learn the seal's purpose (1) → recover the cooling map without erasing its memories (2).
// Clerk → vault is a two-stop route; the technician or off-grid insider supplies an optional third-stop bypass.
// Su-ah's scene requires her presence. One card picker, at the insider; at most 20 credits across all stops.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D3_VAULT_BEYOND: DistrictDef = {
  id: 'd3_vault_beyond',
  act: 3,
  name: t('잠금 너머', 'Beyond the Lock'),
  image: 'v2/districts/d3_vault_beyond.webp',
  intro: t(
    'ARK 보관동의 문에는 손잡이가 둘이다. 한쪽은 반질거리고 다른 쪽은 천으로 덮여 있다. 유리 너머 기억들이 꺼졌다 켜질 때마다 문 안에서 작은 망치 소리가 난다.\n냉각 주기가 바뀌기 전, 세 곳을 들를 시간이 있다.',
    'The ARK vault door has two handles. One is polished smooth; the other is covered with cloth. Beyond the glass, memories blink off and on, each flicker accompanied by a tiny hammering inside.\nThere is time for three stops before the cooling cycle changes.',
  ),
  actions: 3,
  outro: t(
    '냉각관이 길게 울린다. 복도를 나서는 발소리 사이로, 문 안의 망치 소리가 한 번 더 들린다.',
    'The cooling pipes hum. Between your footsteps down the corridor, the little hammer sounds once more behind the door.',
  ),
  pois: [
    { id: 'intake', name: t('봉인 접수대', 'Seal Intake'), blurb: t('동행인 칸만 비어 있다.', 'Only the second operator field is blank.'), dialogue: 'd3vb_intake' },
    { id: 'coolant', name: t('냉각 작업대', 'Coolant Bench'), blurb: t('뜨거운 부품에 흰 천을 덮는다.', 'White cloth covers the hot components.'), dialogue: 'd3vb_coolant' },
    { id: 'service', name: t('반송품 통로', 'Rejected Goods Passage'), blurb: t('폐기함에 출근 도장이 찍힌다.', 'Someone clocks in at the scrap chute.'), dialogue: 'd3vb_insider' },
    { id: 'vault', name: t('두 손잡이 금고', 'The Two-Handle Vault'), blurb: t('혼자서는 열리지 않는 잠금.', 'A lock that cannot be opened alone.'), dialogue: 'd3vb_vault' },
  ],
}

const INTAKE: DialogueDef = {
  id: 'd3vb_intake',
  npc: 'vault_clerk_yeon',
  start: 'desk',
  nodes: {
    desk: {
      speaker: 'vault_clerk_yeon',
      text: t(
        '연 주임이 접수지 두 장을 정확히 포갠다. “열람 목적과 동행인을 적으세요. 한 명이 안에서 잠들면 다른 한 명이 깨워야 합니다.” 펜 끝이 빈칸 위에서 기다린다.',
        'Clerk Yeon squares two forms. “State your purpose and your second operator. If one of you falls asleep inside, the other must wake them.” Her pen waits above the blank.',
      ),
      options: [
        {
          label: t('“안에는 무엇이 있죠?”', '“What is in there?”'),
          intent: 'ask',
          success: {
            text: t('“불량 판정된 기억입니다. 판정은 제 업무가 아닙니다.” 연이 두 번째 서식을 꺼낸다. 제목은 공동 열람 신청서다.', '“Memories judged defective. I do not make that judgment.” Yeon takes out a second form: joint access request.'),
            effects: [{ kind: 'quest', id: 'q_vault_beyond', stage: 1 }],
            goto: 'terms',
          },
        },
        {
          label: t('수아에게 열람 목적을 적어 달라고 한다', 'Ask Su-ah to write the purpose'),
          intent: 'offer',
          requires: { companion: 'su_ah' },
          approval: { su_ah: 2 },
          success: {
            text: t(
              '수아가 펜을 돌려 잡는다. “수선 가능 여부 확인. 됐지? 아직 보지도 않은 걸 불량이라고 쓰진 않을게.” 연이 그 문장을 그대로 접수한다.',
              'Su-ah turns the pen in her fingers. “Assess for repair. There. I’m not calling something defective before I’ve seen it.” Yeon files the sentence exactly as written.',
            ),
            effects: [{ kind: 'quest', id: 'q_vault_beyond', stage: 1 }],
            goto: 'terms',
          },
        },
        {
          label: t('서식을 내려놓는다', 'Put the forms down'),
          intent: 'leave',
          success: { text: t('연이 빈 종이의 모서리를 다시 맞춘다.', 'Yeon squares the blank sheets again.') },
        },
      ],
    },
    terms: {
      speaker: 'vault_clerk_yeon',
      text: t(
        '“동행인이 없으면 문에 붙은 보조팔을 쓰세요. 느리지만 허가된 장비입니다.” 연이 반출 조건에 밑줄을 긋는다. “냉각 지도는 복사 가능. 기억 원본은 삭제 금지. 지키실 수 있습니까?”',
        '“Without a second operator, use the assistance arm on the door. It is slow, but approved.” Yeon underlines the conditions. “You may copy the cooling map. You may not delete the original memories. Can you do that?”',
      ),
      options: [
        {
          label: t('“원본은 그대로 두겠습니다.”', '“The originals stay intact.”'),
          intent: 'persuade',
          approval: { su_ah: 1 },
          success: {
            text: t('연이 접수 도장을 찍는다. “그 약속도 기록합니다.” 금고 앞 대기등이 켜진다.', 'Yeon stamps the form. “That promise goes on the record too.” The waiting light at the vault comes on.'),
            effects: [{ kind: 'flag', key: 'vb_access' }],
          },
        },
        {
          label: t('공동 보관 계약으로 반출 책임을 나눈다', 'Draft a joint custody agreement'),
          intent: 'offer',
          requires: { background: 'broker' },
          approval: { lin_yue: 1, su_ah: 1 },
          success: {
            text: t(
              '반출과 소유를 다른 칸에 적는다. 연이 처음으로 펜을 놓는다. “이제 누가 무엇을 책임지는지 보이네요.” 신속 열람 도장이 찍힌다.',
              'You give access and ownership separate fields. Yeon finally puts her pen down. “Now I can see who is responsible for what.” She stamps expedited access.',
            ),
            effects: [{ kind: 'flag', key: 'vb_access' }, { kind: 'flag', key: 'vb_fast' }],
          },
        },
        {
          label: t('“도장 찍어요. 당신 이름도 감사에 올리기 전에.”', '“Stamp it, before your name goes to Audit.”'),
          intent: 'intimidate',
          check: { stat: 'cha', dc: 14 },
          approval: { su_ah: -1, tae_o: -1 },
          success: {
            text: t('도장이 세게 내려앉는다. 연은 당신의 얼굴을 별도 칸에 저장한다. “접수했습니다.”', 'The stamp lands hard. Yeon saves your face in a separate field. “Filed.”'),
            effects: [{ kind: 'flag', key: 'vb_access' }, { kind: 'trace', amount: 4 }],
          },
          failure: {
            text: t('“감사 요청도 접수했습니다.” 연이 금고의 보조팔만 가리킨다. 정식 절차는 여전히 열려 있다.', '“Your audit request is also filed.” Yeon points to the assistance arm. The standard procedure remains available.'),
            effects: [{ kind: 'trace', amount: 6 }],
            goto: 'terms',
          },
        },
        {
          label: t('조건만 외우고 돌아선다', 'Remember the terms and step away'),
          intent: 'leave',
          success: { text: t('연이 서식을 보류함에 넣는다. 금고의 대기등은 꺼져 있다.', 'Yeon puts the form in the pending tray. The vault waiting light stays dark.') },
        },
      ],
    },
  },
}

const COOLANT: DialogueDef = {
  id: 'd3vb_coolant',
  npc: 'vault_tech_dam',
  start: 'bench',
  nodes: {
    bench: {
      speaker: 'vault_tech_dam',
      text: t(
        '담 기사가 뜨거운 밸브를 집게로 돌린다. “손대지 마세요. 식은 것처럼 보이는 게 더 뜨겁습니다.” 그의 장갑에는 같은 자리를 기운 자국이 세 겹이다.',
        'Technician Dam turns a hot valve with tongs. “Hands off. The ones that look cool are hotter.” Three layers of repairs cover the same spot on his glove.',
      ),
      options: [
        {
          label: t('냉각음의 어긋난 박자를 찾는다', 'Listen for the missed beat in the cooling cycle'),
          intent: 'insight',
          check: { stat: 'obs', dc: 12 },
          assist: 'su_ah',
          approval: { su_ah: 1 },
          success: {
            text: t('세 번째 진동 뒤에 밸브가 늦게 닫힌다. 담이 조절 나사를 풀자 보조팔이 부드럽게 움직인다. “이걸 듣는 사람이 또 있네요.”', 'The valve closes late after the third vibration. Dam loosens a screw and the assistance arm moves freely. “Someone else can hear it.”'),
            effects: [{ kind: 'flag', key: 'vb_fast' }],
          },
          failure: {
            text: t('배관 소리가 한꺼번에 겹친다. 담이 당신을 증기 밖으로 밀어낸다. “귀보다 손이 먼저 나가면 안 돼요.”', 'The pipes all sound at once. Dam pushes you clear of the steam. “Don’t let your hand get ahead of your ears.”'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('식은 부품을 분류해 준다', 'Sort the cooled components for him'),
          intent: 'offer',
          success: {
            text: t('흰 천 위에 크기별로 부품을 놓는다. 담이 작업비를 건넨다. “불량함은 저쪽입니다. 기억 조각은 넣지 마세요.”', 'You arrange the parts by size on white cloth. Dam hands over a service fee. “Reject bin is over there. Keep memory shards out of it.”'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
        },
        {
          label: t('수선용 천을 산다 (15크레딧)', 'Buy repair cloth (15 credits)'),
          intent: 'offer',
          requires: { minCredits: 15 },
          success: {
            text: t('담이 봉투째 건넨다. “안쪽은 깨끗합니다. 장갑 대신 쓰지는 마세요.”', 'Dam hands you the sealed packet. “Clean on the inside. Don’t use it as a glove.”'),
            effects: [{ kind: 'credits', amount: -15 }, { kind: 'consumable', id: 'nanopatch' }],
          },
        },
        {
          label: t('작업 공간을 비켜 준다', 'Give him room to work'),
          intent: 'leave',
          success: { text: t('집게가 다시 밸브에 걸린다. 천이 천천히 부풀어 오른다.', 'The tongs find the valve again. The cloth slowly billows.') },
        },
      ],
    },
  },
}

const INSIDER: DialogueDef = {
  id: 'd3vb_insider',
  npc: 'vault_insider_naru',
  start: 'chute',
  nodes: {
    chute: {
      speaker: 'vault_insider_naru',
      text: t(
        '나루가 ARK 작업복의 이름표를 뒤집는다. 목덜미에는 접속 단자가 없다. “반송품은 센서가 두 번 안 세. 사람도 반송품처럼 걷는 날이 있지.” 손안의 기억 조각에서 문을 받치는 손이 빛난다.',
        'Naru turns an ARK name badge inward. There is no port at the nape of her neck. “Sensors don’t count rejected goods twice. Some days, people walk like rejected goods.” A hand bracing a door glows inside the shard she holds.',
      ),
      options: [
        {
          label: t('“그 조각은 버리지 않을게.”', '“I won’t throw that shard away.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          assist: 'su_ah',
          approval: { su_ah: 2, han: 1 },
          success: {
            text: t('나루가 조각을 손바닥에 올려 준다. “문 고치던 사람이야. 이름은 없어. 손 쓰는 법은 남았어.” 빛이 당신 손가락의 움직임을 따라간다.', 'Naru sets the shard in your palm. “Someone who fixed doors. No name left. Still knows what to do with a hand.” The light follows your fingers.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('나루가 손을 닫는다. “약속이 너무 빠르네. 아직 어떤 기억인지도 모르잖아.”', 'Naru closes her hand. “Quick promise. You don’t even know whose memory it is.”'),
          },
        },
        {
          label: t('“금고 앞까지 안내해 줄 수 있어?”', '“Can you show me the vault procedure?”'),
          intent: 'ask',
          success: {
            text: t(
              '나루가 벽의 순서도를 짚는다. “접수대에서 원본 보존에 서약해. 보조팔이 늦으면 네 흔적도 오래 남아. 담 기사한테 물어봐.”',
              'Naru points at the wall diagram. “Promise the clerk you’ll preserve the originals. If the arm is slow, your signal stays exposed longer. Ask Dam about it.”',
            ),
          },
        },
        {
          label: t('배송 대장에 보조팔 부품을 긴급 반송으로 적는다', 'Log the arm component as an urgent return'),
          intent: 'deceive',
          requires: { background: 'runner' },
          approval: { se_rin: 1, han: -1 },
          success: {
            text: t('나루가 거짓 배송표를 내려다본다. “내 통로에 기록을 남겼네.” 우선 정비등이 켜지지만 그녀는 이름표를 더 깊이 감춘다.', 'Naru looks down at the false docket. “You put my passage on a record.” Priority maintenance comes on; she tucks her badge farther out of sight.'),
            effects: [{ kind: 'flag', key: 'vb_fast' }, { kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('이름표를 못 본 척한다', 'Let the turned badge stay unseen'),
          intent: 'leave',
          success: { text: t('나루가 반송함을 밀고 센서 아래를 지난다.', 'Naru wheels the returns bin beneath the sensor.') },
        },
      ],
    },
  },
}

const VAULT: DialogueDef = {
  id: 'd3vb_vault',
  start: 'handles',
  nodes: {
    handles: {
      text: t(
        '천을 걷자 두 번째 손잡이가 드러난다. 옆의 보조팔이 천천히 손가락을 편다. 문틈에서는 오래전에 끝난 수선 작업의 소리가 난다. 열람등 아래에 원본 보존 서약이 떠 있다.',
        'Lifting the cloth reveals the second handle. Beside it, an assistance arm slowly opens its fingers. Through the seam comes the sound of repairs finished long ago. The preservation pledge glows under the access light.',
      ),
      options: [
        {
          label: t('수아와 손잡이를 하나씩 맡는다', 'Take one handle each with Su-ah'),
          intent: 'offer',
          requires: { companion: 'su_ah', flag: 'vb_access' },
          approval: { su_ah: 2 },
          success: {
            text: t('수아가 당신의 손 위치를 고쳐 준다. “여기. 같이 열자. 힘은 내가 말할 때 줘.” 두 손잡이가 같은 속도로 돈다.', 'Su-ah adjusts your grip. “Here. We open it together. Pull when I say.” Both handles turn at the same speed.'),
            goto: 'together',
          },
        },
        {
          label: t('정비된 보조팔과 문을 연다', 'Open it with the serviced arm'),
          intent: 'insight',
          requires: { flag: 'vb_fast', quest: { id: 'q_vault_beyond', stage: 1 } },
          success: {
            text: t(
              '보조팔이 당신의 움직임을 맞춘다. 공개된 보존 서약에 손을 대자 문이 열린다. 냉각 지도를 복사하고 원본 조각들은 제자리에 놓는다.',
              'The arm matches your movement. You touch the posted preservation pledge and the door opens. You copy the cooling map, leaving the original shards in place.',
            ),
            effects: [{ kind: 'quest', id: 'q_vault_beyond', stage: 2 }],
          },
        },
        {
          label: t('정식 보조팔의 느린 동작을 기다린다', 'Wait through the standard arm cycle'),
          intent: 'offer',
          requires: { flag: 'vb_access' },
          success: {
            text: t(
              '열람 기록이 길게 쌓이는 동안 손잡이를 놓지 않는다. 문이 열리자 냉각 지도만 복사한다. 기억들은 안에서 계속 작은 망치를 두드린다.',
              'You hold the handle as the access log grows. When the door opens, you copy only the cooling map. The memories keep tapping their little hammers inside.',
            ),
            effects: [{ kind: 'quest', id: 'q_vault_beyond', stage: 2 }, { kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('손잡이를 놓는다', 'Release the handle'),
          intent: 'leave',
          success: { text: t('보조팔도 손을 편다. 서약서는 접수대를 가리킨다.', 'The arm opens its hand too. The pledge directs you back to Intake.') },
        },
      ],
    },
    together: {
      speaker: 'su_ah',
      text: t(
        '수아가 열린 금고 안에 흰 천을 편다. “여기 있었네. 버린 게 아니라 못 꺼내던 거였어.” 작은 기억 하나가 그녀의 집게를 따라 움직인다. “지도는 복사하면 돼. 이건 다시 식혀 놓자.”',
        'Su-ah spreads white cloth inside the open vault. “There you are. Not thrown away. Just stuck.” A tiny memory follows her tongs. “We can copy the map. Let’s put this back to cool.”',
      ),
      options: [
        {
          label: t('천의 반대쪽을 잡아 준다', 'Hold the other end of the cloth'),
          intent: 'offer',
          approval: { su_ah: 2 },
          success: {
            text: t(
              '“거기서 기다려. 좋아, 이제 됐어.” 기억이 받침에 안착한다. 냉각 지도의 경비 전원선까지 복사된다. 수아가 빈 집게로 당신 손등을 가볍게 두드린다.',
              '“Hold there. Good. That’s it.” The memory settles on its cradle. The map copies, guard power lines included. Su-ah taps your hand lightly with the empty tongs.',
            ),
            effects: [{ kind: 'quest', id: 'q_vault_beyond', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('지도만 복사하고 문을 받친다', 'Copy the map and hold the door'),
          intent: 'leave',
          success: {
            text: t('수아가 혼자 조각을 내려놓고 나온다. “닫아도 돼.” 지도의 경비 전원선이 손안에서 희미하게 빛난다.', 'Su-ah sets the shard down and steps out. “You can close it.” The guard power lines on the copied map glow faintly in your hand.'),
            effects: [{ kind: 'quest', id: 'q_vault_beyond', stage: 2 }],
          },
        },
      ],
    },
  },
}

export const D3_VAULT_BEYOND_DIALOGUES: DialogueDef[] = [INTAKE, COOLANT, INSIDER, VAULT]

export const D3_VAULT_BEYOND_NPCS: NpcDef[] = [
  {
    id: 'vault_clerk_yeon',
    name: t('연 주임', 'Clerk Yeon'),
    role: t('공동 열람 서약을 받는 ARK 접수원', 'ARK clerk responsible for joint access pledges'),
    faction: 'grid',
    portrait: 'v2/npcs/vault_clerk_yeon.webp',
  },
  {
    id: 'vault_tech_dam',
    name: t('담 기사', 'Technician Dam'),
    role: t('기억보다 먼저 배관 소리를 듣는 ARK 기사', 'ARK technician who listens to pipes before memories'),
    faction: 'grid',
    portrait: 'v2/npcs/vault_tech_dam.webp',
  },
  {
    id: 'vault_insider_naru',
    name: t('나루', 'Naru'),
    role: t('반송품 사이에서 기억을 건지는 비접속자', 'Off-grid insider salvaging memories from rejected goods'),
    faction: 'offgrid',
    portrait: 'v2/npcs/vault_insider_naru.webp',
  },
]

export const D3_VAULT_BEYOND_QUESTS: QuestDef[] = [{
  id: 'q_vault_beyond',
  title: t('잠금 너머', 'Beyond the Lock'),
  stages: [
    t('ARK 금고의 원본 보존 조건을 듣는다. 공동 열람이나 보조팔로 문을 열 수 있다.', 'Learn the ARK vault preservation terms. A second operator or assistance arm can open the door.'),
    t('기억을 지우지 않고 냉각 지도를 복사한다. 경비 전원선의 우회 지점이 드러난다.', 'Copy the cooling map without erasing its memories. A bypass in the guard power supply becomes visible.'),
  ],
  payoff: { stage: 2, bossMod: 'weaken', text: t('냉각 지도의 우회선을 끊어 보스 호위대의 전력을 낮춘다.', 'Cut the bypass shown on the cooling map to drain power from the boss escort.') },
}]
