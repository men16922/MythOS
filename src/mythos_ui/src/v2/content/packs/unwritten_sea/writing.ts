import type { CompanionIntro, Text } from '../../../engine/types.ts'
import type { CutsceneDef } from '../../cutscenes.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const SEA_INTROS: Record<string, CompanionIntro> = {
  mujin: {
    bio: t(
      '해문항의 크레인 기사이자 마지막 하역조 반장. 여섯이 하던 일을 혼자 하면서도 교대 시간을 지킨다. 무거운 것을 내려놓는 법은 알지만, 먼저 자리를 뜨는 일은 아직 서툴다.',
      'A crane operator and the last dock foreman in Haemun. Mujin keeps the shift hours while doing the work of six. He knows how to lower a heavy load, but still struggles to leave before everyone else.',
    ),
    traits: [t('말 적은 반장', 'Few words'), t('몸에 밴 안전 수칙', 'Safety by habit'), t('늦은 퇴근', 'Always last to leave')],
    likes: t('힘들 때 바로 말하는 사람', 'People who speak up when the load gets heavy'),
    dislikes: t('사람이 있는데 출발하는 일', 'Leaving while someone is still behind'),
    quote: t('무거우면 말해. 떨어뜨리기 전에.', 'Say when it gets heavy. Before it falls.'),
    image: 'v2/recruit/mujin.webp',
    beats: [
      {
        who: 'narration',
        text: t(
          '남쪽 화물선로 끝. 빈 운반차가 경사진 바닥을 밀려 내려온다. 주황색 작업복의 남자가 바퀴 앞에 발을 넣고 어깨로 차체를 세운다.',
          'At the end of the southern freight line, an empty cargo trolley rolls down a slope. A man in an orange work jacket plants a boot before a wheel and braces the frame with his shoulder.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '뒤로. 바퀴 멎으면 지나가.',
          'Back. Cross when the wheels stop.',
        ),
      },
      {
        who: 'connector',
        text: t(
          '혼자 붙잡고 있었어? 같이 밀어 줄게.',
          'Have you been holding it alone? Let me help push.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '옆에서. 발 넣지 말고. 무진이다. 하역조 반장.',
          'From the side. Keep your feet clear. Mujin. Dock foreman.',
        ),
      },
      {
        who: 'narration',
        text: t(
          '운반차가 평지에 올라선다. 무진은 손을 뗀 뒤에도 바퀴가 움직이는지 잠깐 지켜본다. 당신이 숨을 고를 때까지 출발하지 않는다.',
          'The trolley reaches level ground. Mujin lets go, then watches the wheels a moment longer. He waits for you to catch your breath.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '남쪽으로 가나. 같이 가지. 멈출 땐 말해.',
          'Heading south? Coming with you. Say when you need to stop.',
        ),
      },
    ],
    choices: [
      {
        tone: 'trust',
        label: t('무진, 이번엔 같이 옮기자.', 'Mujin, we’ll carry it together.'),
        reply: t('좋아. 네 쪽 높이에 맞춘다.', 'Good. Lowering to your height.'),
      },
      {
        tone: 'guard',
        label: t('혼자 버티다가 다치지는 마.', 'Don’t hurt yourself holding everything alone.'),
        reply: t('알았다. 무거우면 부를게.', 'All right. Calling you when it gets heavy.'),
      },
      {
        tone: 'wit',
        label: t('빈 차도 이렇게 무거운데, 꽉 차면?', 'If an empty trolley weighs this much, what about a full one?'),
        reply: t('사람 더 부른다.', 'Get more people.'),
      },
    ],
    likesTone: 'guard',
    reunion: [
      t('왔나. 네 쪽은 비워 뒀다.', 'You’re here. Kept your side clear.'),
      t('이번엔 먼저 말할게. 혼자는 무겁다.', 'Saying it early this time. Heavy for one.'),
    ],
  },
  seo_ha: {
    bio: t(
      '해문항에서 배를 이끌던 은퇴 도선사. 배가 끊긴 뒤에도 물이 어느 골목으로 먼저 드는지 살핀다. 안전한 길을 찾으면 마지막 사람이 건널 때까지 그 자리에 남는다.',
      'A retired harbor pilot who once guided ships into Haemun. With no ships left to guide, Seo-ha watches which alleys the water reaches first. When she finds a safe crossing, she stays until the last person is through.',
    ),
    traits: [t('차분한 길잡이', 'Steady guide'), t('마른 농담', 'Dry humor'), t('마지막까지 배웅', 'Sees everyone through')],
    likes: t('모르는 길에서 잠깐 멈추는 일', 'Pausing when the way is unfamiliar'),
    dislikes: t('익숙한 길이라고 살피지 않는 버릇', 'Taking a familiar route without checking it'),
    quote: t('천천히 와요. 기다리는 쪽은 익숙해요.', 'Take your time. I’m used to waiting.'),
    image: 'v2/recruit/seo_ha.webp',
    beats: [
      {
        who: 'narration',
        text: t(
          '남쪽 화물 터널 입구. 은발의 여자가 벽에 분필로 짧은 선을 긋는다. 바닥을 적신 물이 그 선 아래까지 차 있다.',
          'At the southern freight tunnel, a silver-haired woman draws a short chalk line on the wall. Water covering the floor has risen just beneath it.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '거기서 기다려요. 들어갈 때보다 나올 때가 좁아지는 길이에요.',
          'Wait there. That passage gets narrower on the way out.',
        ),
      },
      {
        who: 'connector',
        text: t(
          '물이 더 들어와? 이 길을 알아?',
          'Is more water coming? Do you know this route?',
        ),
      },
      {
        who: 'companion',
        text: t(
          '서하예요. 도선사였어요. 길은 아는데, 오늘 물은 오늘 봐야죠.',
          'Seo-ha. Used to be a harbor pilot. I know the route. Still have to check today’s water.',
        ),
      },
      {
        who: 'narration',
        text: t(
          '물이 분필 선을 덮는다. 서하는 선을 높여 긋지 않고 옆 통로로 돌아선다. 젖지 않은 바닥을 밟아 본 뒤 당신에게 손짓한다.',
          'Water covers the chalk line. Instead of drawing it higher, Seo-ha turns toward a side passage. She tests the dry floor before waving you over.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '이쪽으로 같이 가요. 은퇴했는데 자꾸 출근을 하네요.',
          'Come this way with me. Retired, and somehow still turning up for work.',
        ),
      },
    ],
    choices: [
      {
        tone: 'trust',
        label: t('서하, 앞에서 길을 봐 줘.', 'Seo-ha, show me the way.'),
        reply: t('그래요. 발소리가 멀어지면 멈출게요.', 'All right. If your footsteps fall behind, I’ll stop.'),
      },
      {
        tone: 'guard',
        label: t('돌아올 길도 남겨 두자.', 'Let’s keep a way back open.'),
        reply: t('좋은 말이에요. 갈 때부터 봐 둬야 해요.', 'Good thinking. Best to look for it on the way in.'),
      },
      {
        tone: 'wit',
        label: t('배 없이도 도선료를 받아?', 'Do you charge a pilot’s fee without a ship?'),
        reply: t('걸어서 오면 무료예요. 업어 달라면 협상하고요.', 'Free if you walk. Being carried costs extra.'),
      },
    ],
    likesTone: 'guard',
    reunion: [
      t('발소리가 익네요. 오늘도 서두르지 말아요.', 'Familiar footsteps. No rushing today, either.'),
      t('기다렸어요. 이번 길은 같이 살펴요.', 'I’ve been waiting. Let’s check this route together.'),
    ],
  },
  parang: {
    bio: t(
      '해문항의 조수에서 건져 올린 아이. 출생 기록은 없고, 가 본 적 없는 집의 저녁과 만난 적 없는 사람의 손을 기억한다. 파랑이라는 이름으로 불리는 동안에는 눈앞의 목소리를 따라간다.',
      'A child pulled from the tide at Haemun. No birth record survives, but Parang remembers evenings in unfamiliar homes and the hands of people never met. Hearing the name Parang helps the child follow the voice close by.',
    ),
    traits: [t('빌려 온 기억', 'Borrowed memories'), t('낯선 손버릇', 'Unfamiliar habits'), t('오늘의 이름', 'A name for today')],
    likes: t('대답할 때까지 이름을 불러 주기', 'Hearing the name Parang until an answer comes'),
    dislikes: t('떠오르는 기억을 전부 설명하라는 말', 'Being asked to explain every memory'),
    quote: t('파랑이라고 불러 줘. 다른 이름은 너무 많아.', 'Say Parang. There are too many other names.'),
    image: 'v2/recruit/parang.webp',
    beats: [
      {
        who: 'narration',
        text: t(
          '화물선로 아래, 파란 우비의 아이가 풀린 신발 끈을 들고 앉아 있다. 왼손이 고리를 만들면 오른손이 자꾸 다른 쪽으로 잡아당긴다.',
          'Beneath the freight line, a child in a blue raincoat sits holding a loose shoelace. The left hand makes a loop; the right keeps pulling the other way.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '이렇게 묶으면 풀린댔어. 그런데 다른 손은 이렇게 배웠어.',
          'Someone said this knot comes loose. But the other hand learned it this way.',
        ),
      },
      {
        who: 'connector',
        text: t(
          '천천히 해도 돼. 뭐라고 부르면 돼?',
          'There’s time. What should I call you?',
        ),
      },
      {
        who: 'companion',
        text: t(
          '파랑. 그렇게 불러 줘. 가끔 다른 이름에 고개가 돌아가.',
          'Parang. Say Parang. Sometimes another name makes the head turn.',
        ),
      },
      {
        who: 'narration',
        text: t(
          '당신이 고리 한쪽을 잡자 작은 손이 나머지를 당긴다. 매듭이 잡힌 뒤에도 아이는 잠깐 손을 얹고 있다가 천천히 일어선다.',
          'You hold one loop while a small hand pulls the other. Once the knot holds, the child keeps a hand over it a moment, then slowly stands.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '같이 가도 돼? 모르는 길인데 발은 자꾸 가려고 해.',
          'Is it all right to come along? The road is strange, but the feet keep wanting to go.',
        ),
      },
    ],
    choices: [
      {
        tone: 'trust',
        label: t('파랑, 같이 가자.', 'Parang, come along.'),
        reply: t('응. 방금 부른 이름은 여기까지 잘 들렸어.', 'Yes. That name came through clearly.'),
      },
      {
        tone: 'guard',
        label: t('떠오르는 걸 다 말하지 않아도 돼.', 'You don’t have to tell every memory.'),
        reply: t('그럼 잠깐 조용히 갈래. 발소리는 들려줘.', 'Then a little quiet would be good. Keep the footsteps close.'),
      },
      {
        tone: 'wit',
        label: t('신발 끈은 어느 손 말을 들어?', 'Which hand gets to choose the knot?'),
        reply: t('걸어 보고. 안 풀리는 쪽.', 'Try walking. Whichever knot stays tied.'),
      },
    ],
    likesTone: 'trust',
    reunion: [
      t('그 발소리 알아. 오늘도 파랑이라고 불러 줘.', 'Those footsteps are familiar. Say Parang again today.'),
      t('이름을 듣기 전에 고개가 돌아갔어. 이번엔 맞았네.', 'The head turned before the name came. Right this time.'),
    ],
  },
}

export const SEA_CUTSCENES: CutsceneDef[] = [
  {
    id: 'mujin_open_gloves',
    companion: 'mujin',
    tier: 2,
    title: t('펴 놓은 장갑', 'Gloves Left Open'),
    text: t(
      '안가의 온풍구 앞. 무진이 젖은 작업 장갑을 벗어 놓는다. 굳은 가죽이 쥔 손 모양으로 남아 있다. 당신이 한쪽 손가락을 펴자 무진이 다른 쪽을 편다.\n“안 마르면 내일 손 다 까진다. 좀 같이 펴 줘.”\n둘이 번갈아 누르자 손바닥 안쪽까지 따뜻한 바람이 닿는다. 무진은 맨손을 무릎에 내려놓는다. 손가락이 다시 오므라들려다가 멎는다.',
      'By the safehouse vent, Mujin takes off his wet work gloves. The stiff leather keeps the shape of a clenched hand. You straighten one finger; he straightens another.\n“Wet leather takes the skin off tomorrow. Help me open these.”\nWorking from either side, you let warm air reach the palms. Mujin rests his bare hands on his knees. His fingers start to curl again, then stop.',
    ),
    image: 'v2/cutscenes/mujin_open_gloves.webp',
  },
  {
    id: 'mujin_pulled_chair',
    companion: 'mujin',
    tier: 3,
    title: t('당겨 둔 의자', 'A Chair Pulled Close'),
    text: t(
      '안가 문 옆에 앉던 무진이 의자를 끌고 당신 곁으로 온다. 바닥에 긁히는 소리가 길게 난다. 앉고 나서도 무릎은 잠깐 출입구 쪽을 향한다.\n“오늘은 깨우지 마. 네가 먼저 일어나면.”\n무진이 등을 기댄다. 당신이 몸을 고쳐 앉아도 눈을 뜨지 않는다. 벌어진 입술 사이로 고른 숨이 나오고, 의자 다리가 더는 바닥을 긁지 않는다.',
      'Mujin drags his chair from its usual place beside the safehouse door to sit near you. The legs scrape a long line across the floor. For a moment, his knees still point toward the exit.\n“If you wake first, leave me sleeping. Today.”\nHe leans back. When you shift in your seat, his eyes stay closed. His breathing settles through parted lips. The chair stays still.',
    ),
    image: 'v2/cutscenes/mujin_pulled_chair.webp',
  },
  {
    id: 'seo_ha_quiet_kettle',
    companion: 'seo_ha',
    tier: 2,
    title: t('끓기 전의 소리', 'Before the Water Boils'),
    text: t(
      '안가에서 주전자가 낮게 운다. 서하가 하던 말을 멈추고 귀를 기울인다. 물이 끓기 시작하자 굳었던 입가가 조금 풀린다.\n“이 소리에는 나갈 필요가 없어서 좋아요. 조금만 더 듣죠.”\n서하가 주전자를 불에서 내린다. 당신 곁에 앉은 뒤에도 안쪽에서 작은 소리가 난다. 손을 무릎에 포갠 채, 마지막 소리가 잦아들 때까지 듣는다.',
      'The safehouse kettle begins to hum. Seo-ha stops speaking and listens. As the water starts to boil, the tension around her mouth eases.\n“Nice to hear something that doesn’t mean going out. Let’s listen a little longer.”\nShe takes the kettle off the heat and sits beside you. Small sounds continue inside it. With her hands folded in her lap, she listens until the last one fades.',
    ),
    image: 'v2/cutscenes/seo_ha_quiet_kettle.webp',
  },
  {
    id: 'seo_ha_folded_towel',
    companion: 'seo_ha',
    tier: 3,
    title: t('접은 수건 높이', 'The Height of a Folded Towel'),
    text: t(
      '안가에서 서하가 접은 수건을 목 밑에 받친다. 한 번 누웠다가 다시 일어나 당신이 앉은 쪽으로 자리를 조금 옮긴다.\n“내일 첫 갈림길은 맡아 줘요. 아침에는 좀 늦게 눈뜨고 싶네요.”\n당신이 수건 모서리를 펴 주자 서하가 턱을 살짝 든다. 누운 자리에서 출입구는 보이지 않는다. 눈을 감은 뒤에도 고개를 돌리지 않는다.',
      'Seo-ha folds a towel beneath her neck in the safehouse. She lies down, then gets up to move a little closer to where you are sitting.\n“Take the first junction tomorrow. I’d like to wake a little later.”\nYou smooth a corner of the towel; she lifts her chin to make room. The doorway is out of sight from here. After closing her eyes, she does not turn to look for it.',
    ),
    image: 'v2/cutscenes/seo_ha_folded_towel.webp',
  },
  {
    id: 'parang_window_circle',
    companion: 'parang',
    tier: 2,
    title: t('오늘 그린 동그라미', 'Today’s Circle'),
    text: t(
      '안가 창문에 김이 서린다. 파랑이 손가락으로 복잡한 무늬를 그리다가 소매로 닦는다. 당신이 빈자리에 점을 찍자 그 둘레로 작은 원이 생긴다.\n“동그라미가 좋아. 오늘은.”\n파랑이 원 옆에 하나를 더 그린다. 두 번째는 조금 납작하다. 고치려던 손끝이 멈추고, 아이는 당신이 다음 점을 찍을 자리를 비워 둔다.',
      'Condensation clouds the safehouse window. Parang traces a complicated pattern, then wipes it away with a sleeve. You place a dot in the cleared space. A small circle grows around it.\n“Circles are nice. Today, anyway.”\nParang draws another beside it. The second is a little flat. A fingertip pauses before correcting it, leaving room for your next dot.',
    ),
    image: 'v2/cutscenes/parang_window_circle.webp',
  },
  {
    id: 'parang_morning_name',
    companion: 'parang',
    tier: 3,
    title: t('아침에 부를 이름', 'A Name for Morning'),
    text: t(
      '안가의 작은 취침등이 파란 우비 소매를 비춘다. 파랑이 눈을 감았다가 당신 쪽으로 얼굴을 돌린다. 멀리서 물 흐르는 소리가 들리지만 몸을 일으키지는 않는다.\n“아침에 또 불러 줘. 파랑이라고.”\n당신이 대답하자 소매를 쥐고 있던 손이 펴진다. 취침등을 낮추는 동안에도 눈은 감겨 있다. 아이의 숨이 길어지고, 당신은 불빛이 닿는 자리에서 조금 더 기다린다.',
      'A small safehouse nightlight falls across a blue raincoat sleeve. Parang closes both eyes, then turns toward you. Water runs somewhere far away, but the child stays lying down.\n“Say it again in the morning. Parang.”\nAt your answer, the hand gripping the sleeve opens. Both eyes stay closed as you dim the nightlight. The child’s breathing deepens. You wait a little longer within the remaining light.',
    ),
    image: 'v2/cutscenes/parang_morning_name.webp',
  },
]

export const SEA_OPENINGS: Record<string, Text[]> = {
  mujin: [
    t(
      '뺨 밑에서 바닥이 낮게 떨린다. 화물 열차가 골목 너머를 지나간다.',
      'The ground trembles beneath your cheek. A freight train passes beyond the alley.',
    ),
    t(
      '무진이 당신 앞에 쪼그려 앉는다. 일으켜 세우려던 손을 멈추고 눈이 마주칠 때까지 기다린다.',
      'Mujin crouches before you. He stops short of lifting you and waits until your eyes meet.',
    ),
    t(
      '“일어날 만한가. 안 되면 말해. 기다린다.”',
      '“Ready to stand? Say if you’re not. Waiting.”',
    ),
  ],
  seo_ha: [
    t(
      '차가운 물이 뺨 가까이 흐른다. 골목의 빗물이 막힌 배수구를 돌아간다.',
      'Cold water runs close to your cheek. Alley rainwater curls around a blocked drain.',
    ),
    t(
      '서하가 마른 바닥에 발을 디디고 손을 내민다. 당신이 앉을 쪽으로 자기 몸을 조금 옮긴다.',
      'Seo-ha plants her feet on dry ground and offers a hand, shifting to make room for you.',
    ),
    t(
      '“눈 떴네요. 일단 마른 데 앉아요. 길은 그다음에 보고요.”',
      '“You’re awake. Find a dry place to sit. We’ll look at the road after.”',
    ),
  ],
  parang: [
    t(
      '눈을 뜨기 전에 발소리가 멎는다. 얼굴 가까이 젖은 우비에서 물이 떨어진다.',
      'Footsteps stop before your eyes open. Water drips from a wet raincoat close to your face.',
    ),
    t(
      '파랑이 당신 곁에 웅크리고 있다. 작은 손이 어깨 위에서 망설이다가, 눈이 마주치자 내려간다.',
      'Parang crouches beside you. A small hand hesitates above your shoulder, then lowers when your eyes meet.',
    ),
    t(
      '“아까는 다른 이름이 나올 뻔했어. 오늘은 뭐라고 부를까?”',
      '“Another name nearly came out just now. What name should be used today?”',
    ),
  ],
}

export const SEA_WRITING_ART: Record<string, string> = {
  'v2/recruit/mujin.webp':
    'Wide 1600 by 900 narrative still, painterly cyberpunk realism, eye level, natural proportions. Mujin, a broad Korean dock foreman in his fifties with short iron-gray hair, a faded orange work jacket and heavy work boots, braces an empty industrial cargo trolley on a sloping freight platform at the southern edge of Neo-Seoul. An adult traveler approaches from the safe side. Clear wheel placement, believable weight and restrained physical effort. Corroded infrastructure, muted amber work lights and cold gray daylight. The trolley is the sole prominent prop. No text, lettering, logos or watermarks.',
  'v2/recruit/seo_ha.webp':
    'Wide 1600 by 900 narrative still, painterly cyberpunk realism, eye level, natural proportions. Seo-ha, a Korean retired harbor pilot in her sixties with silver hair tied low, a weathered face and a faded teal waterproof coat, crouches at a southern freight tunnel entrance and draws a single short chalk line on a damp wall. Shallow water is about to cover the line. An adult traveler waits on dry ground behind her. Practical caution, subdued teal industrial lighting and ordinary human anatomy. The chalk is the sole prominent handheld prop. No text, lettering, numerals, logos or watermarks.',
  'v2/recruit/parang.webp':
    'Wide 1600 by 900 narrative still, painterly cyberpunk realism, eye level at the seated child, natural proportions. Parang, an androgynous Korean child about eleven with uneven dark hair, an oversized faded blue raincoat and scuffed shoes, sits beneath an industrial freight line trying to tie one loose shoelace. An adult traveler kneels nearby and steadies one loop while the child pulls the other. Small ordinary hands with anatomically correct fingers, careful attention and tentative companionship. Damp concrete and restrained reflected harbor light. The shoelace is the sole focal prop. No text, lettering, logos or watermarks.',
  'v2/cutscenes/mujin_open_gloves.webp':
    'Wide 1600 by 900 quiet safehouse still, painterly cyberpunk realism, eye level, natural proportions. Mujin, a broad Korean man in his fifties with short iron-gray hair and a faded orange work jacket, sits beside an adult traveler near a warm air vent. Both gently straighten the fingers of a single pair of stiff wet work gloves placed before the vent. Mujin’s bare hands are weathered and anatomically correct. Small practical gesture of trust, subdued amber warmth against cool industrial walls. The gloves are the sole focal prop. No text, lettering, logos or watermarks.',
  'v2/cutscenes/mujin_pulled_chair.webp':
    'Wide 1600 by 900 quiet safehouse still, painterly cyberpunk realism, eye level, natural proportions. Mujin, a broad Korean dock foreman in his fifties with short iron-gray hair and a faded orange work jacket, sleeps leaning back in a plain sturdy chair pulled close to a seated adult traveler. The safehouse doorway is distant at the edge of the composition. Relaxed weathered hands, believable resting posture and tired facial muscles. Low warm light, modest industrial shelter. The chair is the sole prominent prop. No text, lettering, logos or watermarks.',
  'v2/cutscenes/seo_ha_quiet_kettle.webp':
    'Wide 1600 by 900 quiet safehouse still, painterly cyberpunk realism, eye level, natural proportions. Seo-ha, a Korean woman in her sixties with silver hair tied low, a weathered kind face and a faded teal waterproof coat, sits beside an adult traveler listening to a plain kettle recently removed from the heat. Her hands rest folded in her lap and her expression eases into quiet relief. A faint wisp of steam, sheltered amber lighting and worn industrial walls. The kettle is the sole prominent prop. No text, lettering, logos or watermarks.',
  'v2/cutscenes/seo_ha_folded_towel.webp':
    'Wide 1600 by 900 quiet safehouse still, painterly cyberpunk realism, eye level beside a low resting platform, natural proportions. Seo-ha, a Korean retired harbor pilot in her sixties with silver hair tied low and a faded teal coat, lies resting with a folded plain towel supporting her neck. A seated adult traveler gently smooths one corner of the towel. Her eyes are closed and her face is relaxed. Intimate restrained composition, soft predawn light and a modest industrial interior. The towel is the sole focal prop. No text, lettering, logos or watermarks.',
  'v2/cutscenes/parang_window_circle.webp':
    'Wide 1600 by 900 quiet safehouse still, painterly cyberpunk realism, eye level at the child, natural proportions. Parang, an androgynous Korean child about eleven with uneven dark hair and an oversized faded blue raincoat, draws two imperfect circles with a fingertip on a condensation-covered window. An adult traveler’s hand has placed a simple dot nearby. Small ordinary hands, absorbed curiosity and a hint of satisfaction. Cool glass against warm sheltered light. Only simple circles and dots on the glass, no symbols resembling writing. No text, lettering, logos or watermarks.',
  'v2/cutscenes/parang_morning_name.webp':
    'Wide 1600 by 900 quiet safehouse still, painterly cyberpunk realism, eye level beside a low sleeping platform, natural proportions. Parang, an androgynous Korean child about eleven with uneven dark hair and an oversized faded blue raincoat, lies asleep with one small hand relaxed beside a blue sleeve. An adult traveler sits nearby, dimming a small plain nightlight. Ordinary child anatomy, gentle breathing suggested by a natural resting posture, protected domestic quiet within a worn industrial shelter. The nightlight is the sole prominent prop. No text, lettering, logos or watermarks.',
}