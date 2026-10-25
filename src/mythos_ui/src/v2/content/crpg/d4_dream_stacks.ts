// Act 4 — Fragments of Kai's Dream. The Glass Library shelves a recurring pre-war scene, not proof of an origin.
// q_dream_fragment: find the dream's shelf mark (1) → read and preserve its unresolved ending (2).
// Catalogue → dream is sufficient; the binder and lost reader offer competing optional third stops.
// Kai only speaks on presence-gated branches. One card picker at the reader; at most 15 credits district-wide.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D4_DREAM_STACKS: DistrictDef = {
  id: 'd4_dream_stacks',
  act: 4,
  name: t('꿈의 서가', 'The Dream Stacks'),
  image: 'v2/districts/d4_dream_stacks.webp',
  intro: t(
    '유리 서가 안에서 전쟁 전의 오후가 접힌다. 책 한 권이 같은 장면을 되풀이한다. 작은 아이, 육교 난간, 돌아오지 않는 발소리. 책등에는 제목 대신 RX-09라는 색인 꼬리표가 달린다.\n검열자의 야간 제본이 시작되기 전, 세 곳을 들를 수 있다.',
    'A pre-war afternoon folds inside the glass shelves. One book repeats a scene: a small child, a footbridge railing, footsteps that never return. Its spine carries an RX-09 index tag in place of a title.\nThere is time for three stops before the censors begin the night binding.',
  ),
  actions: 3,
  outro: t(
    '서가가 접히며 오후의 빛을 안으로 거둔다. 마지막 책갈피가 닫힐 때, 멀리서 작은 발끝이 바닥을 두드린다.',
    'The shelves fold, drawing the afternoon light inside. As the last bookmark closes, a small foot taps the floor somewhere far away.',
  ),
  pois: [
    { id: 'catalogue', name: t('수면 색인대', 'Sleep Catalogue'), blurb: t('꿈꾼 사람과 등장인물은 다른 칸.', 'Dreamer and subject occupy different fields.'), dialogue: 'd4ds_catalogue' },
    { id: 'binder', name: t('꿈 제본틀', 'Dream Binding Frame'), blurb: t('끝나지 않는 장면을 묶는다.', 'Where unfinished scenes are bound.'), dialogue: 'd4ds_binder' },
    { id: 'reader', name: t('빈자리 독자', 'The Reader in the Empty Seat'), blurb: t('책에 없는 길을 기억한다.', 'Remembers a route absent from the book.'), dialogue: 'd4ds_reader' },
    { id: 'dream', name: t('육교의 오후', 'Afternoon on the Footbridge'), blurb: t('아이는 아직 기다린다.', 'The child is still waiting.'), dialogue: 'd4ds_dream' },
  ],
}

const CATALOGUE: DialogueDef = {
  id: 'd4ds_catalogue',
  npc: 'dream_cataloguer_sio',
  start: 'index',
  nodes: {
    index: {
      speaker: 'dream_cataloguer_sio',
      text: t(
        '시오의 몸을 이룬 색인 서랍들이 작은 박자로 열린다. “찾는 것은 꿈입니까, 꿈꾼 사람입니까?” 손가락 대신 긴 청구 기호가 유리 위를 걷는다. RX-09 아래에 날짜가 셋, 모두 서로 다르다.',
        'The index drawers that make up Sio’s body open in little beats. “Are you seeking the dream, or the dreamer?” Long shelf marks walk across the glass in place of fingers. Three dates sit beneath RX-09; none agree.',
      ),
      options: [
        {
          label: t('“먼저 그 꿈을 찾을게요.”', '“The dream first.”'),
          intent: 'ask',
          success: {
            text: t('서랍 하나가 열리고 육교 모양의 청구 기호가 나온다. “전쟁 전 장면. 반복 열람 흔적 있음. 원래 소유자는 확인되지 않습니다.”', 'A drawer opens and produces a shelf mark shaped like a footbridge. “Pre-war scene. Repeated access detected. Original ownership unconfirmed.”'),
            effects: [{ kind: 'quest', id: 'q_dream_fragment', stage: 1 }],
            goto: 'attribution',
          },
        },
        {
          label: t('카이가 꿈에서 본 난간을 그리게 한다', 'Let Kai draw the railing from his dream'),
          intent: 'offer',
          requires: { companion: 'kai' },
          approval: { kai: 2 },
          success: {
            text: t(
              '카이가 끊긴 선 하나를 덧그린다. “여기는 늘 손이 닿지 않아요.” 시오가 같은 금이 간 색인표를 꺼낸다. 닮은 모양 옆에 확인 불가 도장을 찍는다.',
              'Kai adds one broken line. “I can never reach this part.” Sio produces an index card with the same crack, then stamps unverified beside the resemblance.',
            ),
            effects: [{ kind: 'quest', id: 'q_dream_fragment', stage: 1 }],
            goto: 'attribution',
          },
        },
        {
          label: t('“RX-09가 아이의 이름이라고 적어 줘.”', '“Write RX-09 as the child’s name.”'),
          intent: 'deceive',
          approval: { kai: -2 },
          success: {
            text: t('서랍들이 일제히 닫힌다. “색인 번호를 이름으로 옮길 근거가 없습니다.” 시오가 허위 정정 요청만 보관한다.', 'The drawers shut together. “No basis for moving an index number into the name field.” Sio files only the false amendment request.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('색인대에서 물러난다', 'Step away from the catalogue'),
          intent: 'leave',
          success: { text: t('날짜 셋이 서로 다른 속도로 흐른다.', 'The three dates advance at different speeds.') },
        },
      ],
    },
    attribution: {
      speaker: 'dream_cataloguer_sio',
      text: t(
        '“꿈에 들어간 독자가 주인공인 것은 아닙니다.” 시오가 청구 기호를 건넨다. “표지 열람은 허용됩니다. 안쪽은 올의 제본 허가를 받으세요. 빈자리의 독자는 다른 방법을 알지만, 목록에는 없습니다.”',
        '“A reader entering a dream is not necessarily its protagonist.” Sio hands over the shelf mark. “You may read the cover. For the interior, obtain Ol’s binding permit. The reader in the empty seat knows another way. It is not in the catalogue.”',
      ),
      options: [
        {
          label: t('“모르는 것은 모른다고 남겨 주세요.”', '“Keep the unknown parts marked unknown.”'),
          intent: 'persuade',
          approval: { kai: 1 },
          success: {
            text: t('시오가 빈 칸 위에 덮개를 올린다. “정정하지 않음. 그것도 유효한 요청입니다.”', 'Sio lowers a cover over the empty field. “No amendment. That is a valid request too.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('날짜가 겹치는 가장자리를 읽는다', 'Read where the dates overlap'),
          intent: 'insight',
          check: { stat: 'int', dc: 13 },
          assist: 'kai',
          success: {
            text: t('복사 날짜와 꿈꾼 날짜가 한 칸씩 밀려 있다. 순서를 잡자 감시 색인의 순회 간격도 드러난다.', 'Copy dates and dream dates are shifted by one field. Sorting them reveals the surveillance index’s patrol interval too.'),
            effects: [{ kind: 'combat_mod', mod: 'intel' }],
          },
          failure: {
            text: t('한 날짜를 잡자 다른 날짜에 당신의 방문 시각이 들어간다. 시오가 손을 떼라고 조용히 말한다.', 'Touching one date inserts your visit time into another. Sio quietly asks you to let go.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('청구 기호를 챙긴다', 'Take the shelf mark'),
          intent: 'leave',
          success: { text: t('손안의 작은 육교가 서가 한쪽을 가리킨다.', 'The little footbridge in your hand points toward a shelf.') },
        },
      ],
    },
  },
}

const BINDER: DialogueDef = {
  id: 'd4ds_binder',
  npc: 'dream_binder_ol',
  start: 'frame',
  nodes: {
    frame: {
      speaker: 'dream_binder_ol',
      text: t(
        '올의 앞치마 아래에는 몸 대신 제본 실타래가 돈다. “반복은 마모를 부릅니다. 기다림이 끝나지 않는 책은 닫아야 합니다.” 바늘 끝에 아이의 그림자가 걸려 있지만 아직 꿰매지는 않는다.',
        'Spools turn beneath Ol’s apron where a body should be. “Repetition causes wear. A book whose waiting never ends must be closed.” A child’s shadow hangs from the needle, not yet stitched.',
      ),
      options: [
        {
          label: t('“끝을 쓰지 않고 읽기만 하겠습니다.”', '“We will read without writing an ending.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          assist: 'kai',
          approval: { kai: 1, su_ah: 1 },
          success: {
            text: t('올이 바늘을 틀에 꽂는다. “미완 상태 보존. 한 차례만.” 느슨한 실고리가 열람 허가가 된다.', 'Ol sets the needle in its frame. “Preserve the unfinished state. One reading.” A loose thread loop becomes your permit.'),
            effects: [{ kind: 'flag', key: 'ds_open' }],
          },
          failure: {
            text: t('“독자는 언제나 자기가 마지막 장이라고 생각하지요.” 올이 책을 한 겹 더 감싼다. 표지는 아직 읽을 수 있다.', '“Readers always think they are the final chapter.” Ol adds another wrapping. The cover remains readable.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('봉합 대신 지지대를 제안한다', 'Propose a support instead of a closing stitch'),
          intent: 'offer',
          requires: { background: 'medic' },
          approval: { kai: 1, su_ah: 1 },
          success: {
            text: t('움직임을 남긴 채 가장자리만 받친다. 올이 새로 만든 지지대를 살핀다. “마모 방지. 폐쇄 불필요. 이 방식은 보관하겠습니다.”', 'You brace the edges while leaving room to move. Ol examines the support. “Wear prevented. Closure unnecessary. I will retain this method.”'),
            effects: [{ kind: 'flag', key: 'ds_open' }],
          },
        },
        {
          label: t('열람자로 이름을 남기고 보존 책임을 진다', 'Sign as reader and accept responsibility for preservation'),
          intent: 'offer',
          success: {
            text: t('올이 당신의 이름으로 실고리를 묶는다. “되풀이가 늘어나면 이 이름으로 찾겠습니다.” 책을 여는 허가와 추적 꼬리표가 함께 생긴다.', 'Ol ties the loop in your name. “If the repetition worsens, this is the name I will call.” The permit comes with a tracking tag.'),
            effects: [{ kind: 'flag', key: 'ds_open' }, { kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('바늘에서 손을 뗀다', 'Keep clear of the needle'),
          intent: 'leave',
          success: { text: t('올이 실의 장력을 잰다. 아이의 그림자가 아직 조금 움직인다.', 'Ol tests the thread’s tension. The child’s shadow can still move a little.') },
        },
      ],
    },
  },
}

const READER: DialogueDef = {
  id: 'd4ds_reader',
  npc: 'dream_reader_bom',
  start: 'seat',
  nodes: {
    seat: {
      speaker: 'dream_reader_bom',
      text: t(
        '빈 의자 위에서 책갈피들이 사람 모양으로 흔들린다. 봄이 자기 자리를 손으로 더듬는다. “앉았던 기억은 있는데 의자는 나를 몰라. 넌 저 아이를 깨우러 왔어, 기다려 주러 왔어?”',
        'Bookmarks sway into a human outline above an empty chair. Bom feels for the seat. “I remember sitting here. The chair doesn’t know me. Did you come to wake that child, or wait with them?”',
      ),
      options: [
        {
          label: t('“기다릴 자리를 찾아 왔어.”', '“I came to find somewhere to wait.”'),
          intent: 'persuade',
          approval: { kai: 2 },
          success: {
            text: t(
              '봄이 책갈피 하나를 바닥에 펼친다. “옆으로 들어가. 결말로 가는 문은 잠겨 있지만 여백은 열려 있어.” 육교의 청구 기호와 여백 통로가 드러난다.',
              'Bom spreads a bookmark on the floor. “Go in sideways. The door to the ending is locked, but the margin is open.” It reveals the footbridge shelf mark and a passage through its margin.',
            ),
            effects: [{ kind: 'quest', id: 'q_dream_fragment', stage: 1 }, { kind: 'flag', key: 'ds_open' }],
          },
        },
        {
          label: t('흩어지는 책갈피를 손으로 받친다', 'Catch the scattering bookmarks'),
          intent: 'offer',
          check: { stat: 'agi', dc: 11 },
          approval: { kai: 1, se_rin: 1 },
          success: {
            text: t('봄의 윤곽이 제자리로 돌아온다. 여분 책갈피에는 도망치는 독자의 발놀림이 남아 있다. “그건 가져가. 난 앉는 쪽을 연습할게.”', 'Bom’s outline settles. A spare bookmark holds the footwork of a fleeing reader. “Take that. I’ll practise sitting down.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('손가락 사이로 책갈피가 빠져나간다. 봄이 벽에 기대 윤곽을 추스른다. “괜찮아. 급하면 더 흩어져.”', 'Bookmarks slip through your fingers. Bom leans against the wall to gather an outline. “It’s all right. Rushing scatters me more.”'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('의자의 낡은 고정쇠를 고쳐 준다', 'Fix the chair’s loose bracket'),
          intent: 'offer',
          success: {
            text: t('의자가 흔들리지 않는다. 봄이 오래된 독서 수당을 놓는다. “앉을 자리는 생겼네. 내가 앉는 건 조금 더 걸리겠지만.”', 'The chair stops rocking. Bom leaves an old reading stipend on it. “Somewhere to sit, at least. Sitting may take me a little longer.”'),
            effects: [{ kind: 'credits', amount: 15 }],
          },
        },
        {
          label: t('빈자리를 밟지 않고 돌아선다', 'Leave without stepping through the empty seat'),
          intent: 'leave',
          success: { text: t('봄이 당신 발끝을 보고 작게 고개를 끄덕인다.', 'Bom watches your feet and gives a small nod.') },
        },
      ],
    },
  },
}

const DREAM: DialogueDef = {
  id: 'd4ds_dream',
  start: 'cover',
  nodes: {
    cover: {
      text: t(
        '투명한 표지 안에서 아이가 육교 계단을 센다. 발끝의 먼지가 올라갔다 내려온다. 매번 같은 계단이다. 책등의 RX-09 표시는 아이가 아니라 열람 흔적을 가리킨다.',
        'Inside the transparent cover, a child counts the footbridge steps. Dust rises and falls around small shoes. The same step, every time. The RX-09 tag points to a reading trace, not to the child.',
      ),
      options: [
        {
          label: t('카이에게 책을 열지 먼저 묻는다', 'Ask Kai whether he wants to open it'),
          intent: 'offer',
          requires: { companion: 'kai', flag: 'ds_open', quest: { id: 'q_dream_fragment', stage: 1 } },
          approval: { kai: 2 },
          success: {
            text: t('카이가 한동안 표지를 본다. “네. 끝을 아는 척하지 않고 볼게요.” 그가 먼저 손을 댄 뒤에 책을 펼친다.', 'Kai studies the cover for a while. “Yes. I’ll read without pretending I know the ending.” Only after he touches it do you open the book.'),
            goto: 'kai',
          },
        },
        {
          label: t('허가된 틈으로 마지막 여백을 읽는다', 'Read the last margin through the permitted opening'),
          intent: 'insight',
          requires: { flag: 'ds_open', quest: { id: 'q_dream_fragment', stage: 1 } },
          success: {
            text: t(
              '아이의 다음 걸음은 적혀 있지 않다. 여백을 그대로 보존하자 바깥 검열 색인의 회전 간격이 보인다. 책을 닫아도 그 박자가 손에 남는다.',
              'The child’s next step is unwritten. Preserving the margin reveals the turning interval of the censor index outside it. The rhythm stays in your hand after the book closes.',
            ),
            effects: [{ kind: 'quest', id: 'q_dream_fragment', stage: 2 }],
          },
        },
        {
          label: t('표지 밖에서 장면이 돌아올 때까지 기다린다', 'Wait outside the cover for the scene to return'),
          intent: 'insight',
          requires: { quest: { id: 'q_dream_fragment', stage: 1 } },
          success: {
            text: t(
              '열람 시간이 길게 기록된다. 되풀이의 틈마다 빈 마지막 장과 감시 색인의 회전이 겹친다. 아이의 정체는 빈칸으로 두고 그 박자만 옮겨 적는다.',
              'The access timer keeps running. Between repetitions, the blank last page overlaps the surveillance index’s turn. You leave the child’s identity blank and copy only the timing.',
            ),
            effects: [{ kind: 'quest', id: 'q_dream_fragment', stage: 2 }, { kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('청구 기호를 확인하러 물러난다', 'Step back to check the shelf mark'),
          intent: 'leave',
          success: { text: t('아이의 발끝이 다시 같은 계단에 닿는다.', 'The child’s foot touches the same step again.') },
        },
      ],
    },
    kai: {
      speaker: 'kai',
      text: t(
        '“이 아이가 저였는지는 모르겠어요.” 카이가 난간에서 조금 떨어져 앉는다. “꿈에서는 늘 누가 돌아올지 계산했어요. 오늘은… 안 돌아와도 여기 조금 더 있어도 될까요?” 아이는 대답 대신 옆자리를 남긴다.',
        '“I don’t know whether this child was me.” Kai sits a little way from the railing. “In the dream I always calculated who might return. Today… could I stay a little longer, even if nobody does?” The child leaves room beside them instead of answering.',
      ),
      options: [
        {
          label: t('카이 옆에 앉아 기다린다', 'Sit beside Kai and wait'),
          intent: 'offer',
          approval: { kai: 2 },
          success: {
            text: t(
              '아이의 발이 처음으로 흔들림을 멈춘다. “이번엔 제가 고른 거예요.” 카이가 빈 마지막 장을 그대로 덮고 검열 색인의 간격을 기억한다.',
              'For the first time, the child’s foot stops swinging. “This time I chose.” Kai closes the last page without filling it in, remembering the censor index’s interval.',
            ),
            effects: [{ kind: 'quest', id: 'q_dream_fragment', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('출구에서 기다리겠다고 말한다', 'Tell him you will wait at the exit'),
          intent: 'leave',
          success: {
            text: t('“금방 갈게요.” 카이가 스스로 책을 덮고 나온다. 마지막 장은 비어 있고, 손끝에는 밖에서 쓰일 감시 간격이 남는다.', '“I won’t be long.” Kai closes the book himself and comes out. The last page stays blank; his fingers retain a patrol interval useful outside.'),
            effects: [{ kind: 'quest', id: 'q_dream_fragment', stage: 2 }],
          },
        },
      ],
    },
  },
}

export const D4_DREAM_STACKS_DIALOGUES: DialogueDef[] = [CATALOGUE, BINDER, READER, DREAM]

export const D4_DREAM_STACKS_NPCS: NpcDef[] = [
  {
    id: 'dream_cataloguer_sio',
    name: t('시오', 'Sio'),
    role: t('꿈꾼 사람과 등장인물을 구분하는 색인 존재', 'Catalogue being that distinguishes dreamers from subjects'),
    faction: 'grid',
    portrait: 'v2/npcs/dream_cataloguer_sio.webp',
  },
  {
    id: 'dream_binder_ol',
    name: t('올', 'Ol'),
    role: t('끝나지 않는 꿈을 제본하는 검열자', 'Censor who binds dreams that will not end'),
    faction: 'grid',
    portrait: 'v2/npcs/dream_binder_ol.webp',
  },
  {
    id: 'dream_reader_bom',
    name: t('봄', 'Bom'),
    role: t('자기 의자에게 잊힌 책갈피 독자', 'Bookmark reader forgotten by their own chair'),
    faction: 'offgrid',
    portrait: 'v2/npcs/dream_reader_bom.webp',
  },
]

export const D4_DREAM_STACKS_QUESTS: QuestDef[] = [{
  id: 'q_dream_fragment',
  title: t('카이의 꿈 단편', 'Fragments of Kai’s Dream'),
  stages: [
    t('RX-09 열람 흔적이 남은 꿈의 청구 기호를 찾는다. 아이의 정체는 확인되지 않는다.', 'Find the shelf mark of a dream bearing an RX-09 reading trace. The child’s identity remains unconfirmed.'),
    t('꿈의 마지막 장을 빈 채로 보존하고 검열 색인의 순회 간격을 알아낸다.', 'Preserve the dream’s blank last page and learn the censor index’s patrol interval.'),
  ],
  payoff: { stage: 2, bossMod: 'intel', text: t('꿈의 여백에서 읽은 간격으로 보스의 감시가 돌아오기 전에 움직인다.', 'Use the interval read in the dream’s margin to act before the boss surveillance turns back.') },
}]
