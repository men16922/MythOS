import type { CompanionIntro, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const COMPANION_INTROS: Record<string, CompanionIntro> = {
  se_rin: {
    bio: t(
      '물거미라 불리는 데이터 밀수꾼. 비접속자들이 숨은 골목으로 물건과 소식을 나르며, 길 잃은 사람에게도 무심한 척 길을 내준다. 데려온 사람을 무사히 내보내는 것까지가 자기 일이라고 여긴다.',
      'A data smuggler known as Water Spider. She carries goods and news through the alleys where the off-grid hide, making room for lost strangers while pretending not to care. To her, a job ends only when everyone she brought in gets out safely.',
    ),
    traits: [
      t('무뚝뚝한 길잡이', 'Blunt guide'),
      t('재빠른 판단', 'Quick judgment'),
      t('감춘 다정함', 'Hidden kindness'),
    ],
    likes: t('약속한 곳에 제때 오는 사람', 'People who show up where and when they promised'),
    dislikes: t('남을 버리고 혼자 빠지는 짓', 'Leaving others behind to save yourself'),
    quote: t('출구는 내가 찾아. 넌 따라올 생각이나 해.', 'I find the exit. You just make sure you keep up.'),
    image: 'v2/recruit/se_rin.webp',
    beats: [
      {
        who: 'narration',
        text: t(
          '네오서울의 고가도로 아래. 젖은 배달 상자 뒤에서 여자가 손짓한다. 허리춤의 저장 칩들이 서로 부딪힌다.',
          'Beneath a Neo-Seoul overpass, a woman beckons from behind rain-soaked delivery crates. Storage chips clink at her waist.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '거기 서 있으면 얼굴 찍혀. 두 걸음 왼쪽. 그래, 거기. 난 세린. 길 모르면 일단 내 말 들어.',
          'Stay there and the camera gets your face. Two steps left. Good, there. I’m Se-rin. Until you know your way around, listen to me.',
        ),
      },
      {
        who: 'connector',
        text: t(
          '눈을 떠 보니 여기였어. 이름도 없고… 내가 사람인지 버그인지도 모르겠어.',
          'I woke up here. No name, and… I don’t even know whether I’m a person or a bug.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '그건 걸으면서 고민해. 이 안쪽에 비접속자들이 살아. 누구한테든 여기 오는 길은 말하지 마.',
          'Think about that while we walk. People live off-grid back here. Don’t tell anyone how to get in.',
        ),
      },
      {
        who: 'narration',
        text: t(
          '세린이 철망 틈을 벌린다. 먼저 들어가지 않고, 당신의 발이 걸리지 않게 아래쪽을 밟아 누른다.',
          'Se-rin pulls open a gap in the fence. She waits for you, pinning the bottom edge under her boot so it won’t catch your feet.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '내가 앞장설게. 뒤처지면 불러. 혼자 잘 따라오는 척하다 없어지는 게 제일 귀찮으니까.',
          'I’ll lead. Call out if you fall behind. Nothing’s more trouble than someone pretending to keep up and going missing.',
        ),
      },
    ],
    choices: [
      {
        tone: 'trust',
        label: t('길을 맡겨도 될까?', 'Can I trust you to lead?'),
        reply: t('길은 맡겨. 나머지는 좀 보고 정해.', 'The route, sure. Give the rest some time.'),
      },
      {
        tone: 'guard',
        label: t('날 돕는 이유부터 듣자.', 'First, why help me?'),
        reply: t(
          '좋아, 그 정도는 물어야지. 네가 붙잡혀서 이 골목까지 뒤집히는 건 사양이거든.',
          'Good. You ought to ask. I’d rather you didn’t get caught and bring a search down on this alley.',
        ),
      },
      {
        tone: 'wit',
        label: t('길치도 환불이 돼?', 'Refunds for getting lost?'),
        reply: t('요금도 안 냈으면서. 농담할 숨 있으면 발부터 옮겨.', 'You haven’t even paid. If you’ve got breath for jokes, start walking.'),
      },
    ],
    likesTone: 'guard',
    reunion: [
      t('너, 전에 내 뒤에서 걷지 않았어? 발소리가 익숙한데.', 'Haven’t you walked behind me before? I know those footsteps.'),
      t('이상하네. 오늘은 자꾸 네가 따라오는지 보게 돼.', 'Strange. I keep checking to see if you’re still with me today.'),
    ],
  },
  tae_o: {
    bio: t(
      '사냥개라 불리던 마흔대의 탈주 집행관. 명령을 따르며 저지른 일을 기억하고, 얼굴의 흉터를 변명으로 내세우지 않는다. 이제는 누군가를 잡으러 가는 대신 그 앞을 지키려 한다.',
      'A deserter enforcer in his forties, once called the Hound. He remembers what he did under orders and offers no excuses, not even the scar on his face. Now he wants to stand between people and their pursuers.',
    ),
    traits: [
      t('과묵한 파수꾼', 'Taciturn sentry'),
      t('무거운 죄책감', 'Burdened by guilt'),
      t('꺾이지 않는 책임감', 'Unshakable responsibility'),
    ],
    likes: t('말보다 행동을 보는 태도', 'Judging deeds before words'),
    dislikes: t('명령 뒤에 숨는 변명', 'Using orders as an excuse'),
    quote: t('이번에 막을 문은 내가 고른다.', 'This time, I choose which door to hold.'),
    image: 'v2/recruit/tae_o.webp',
    beats: [
      {
        who: 'narration',
        text: t(
          '폐쇄된 검문소. 얼굴에 흉터가 난 중년 남자가 방패로 차단봉을 받친다. 낡은 집행관 제복 아래로 빈 손이 보인다.',
          'At a closed checkpoint, a scarred, middle-aged man props up the barrier with his shield. His hands hang empty below an old enforcer’s uniform.',
        ),
      },
      {
        who: 'companion',
        text: t('멈춰라. 바닥의 붉은 선을 밟으면 경보가 울린다. 오른쪽으로 돌아와라.', 'Stop. Step on the red line and the alarm sounds. Come around to the right.'),
      },
      {
        who: 'connector',
        text: t('집행관이 왜 길을 열어 줘? 날 데려가려는 거야?', 'Why is an enforcer letting me through? Are you taking me in?'),
      },
      {
        who: 'companion',
        text: t(
          '전직이다. 태오라고 한다. 이 문으로 사람을 넘긴 적이 있다. 최적화 명단에 오르면 어떻게 되는지 알면서도.',
          'Former enforcer. Tae-o. I handed people over at this gate. I knew what happened to those on the optimization list.',
        ),
      },
      {
        who: 'narration',
        text: t(
          '태오가 흉터에 올리던 손을 내린다. 차단봉 너머를 살핀 뒤, 당신이 지나갈 자리를 비운다.',
          'Tae-o lowers a hand before it reaches his scar. He checks beyond the barrier, then steps aside to let you pass.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '용서해 달라는 말은 아니다. 같이 가겠다. 다음 검문소에서는 내가 먼저 나선다.',
          'I’m not asking for forgiveness. I’ll go with you. At the next checkpoint, I step forward first.',
        ),
      },
    ],
    choices: [
      {
        tone: 'trust',
        label: t('함께 가 줘서 고마워.', 'Thank you for coming.'),
        reply: t('고맙다는 말은 나중에 해라. 아직 지킨 게 없다.', 'Thank me later. I haven’t protected anyone yet.'),
      },
      {
        tone: 'guard',
        label: t('행동을 보고 판단할게.', 'I’ll judge you by what you do.'),
        reply: t('그래야 한다. 내가 다시 명령을 핑계 삼으면 그때도 그렇게 해라.', 'You should. If I hide behind orders again, hold me to that.'),
      },
      {
        tone: 'wit',
        label: t('길 안내치곤 방패가 크네.', 'Big shield for a tour guide.'),
        reply: t('길이 험하다. 둘이 숨기엔 이만한 게 낫다.', 'It’s a rough route. Better to have room for two behind it.'),
      },
    ],
    likesTone: 'guard',
    reunion: [
      t('처음 보는 얼굴인데, 어느 쪽에 세워야 할지 알고 있었다.', 'A face I’ve never seen, yet I knew which side to put you on.'),
      t('전에 너를 기다린 것 같다. 어디였는지는 기억나지 않는다.', 'I think I waited for you once. I can’t remember where.'),
    ],
  },
  han: {
    bio: t(
      '신호 파괴자라는 별명을 쓰는 스무 살 갓 넘은 비접속자 해커. 관리망 밖에서 잠금을 뜯고 흔적을 지우는 솜씨를 자랑한다. IX에게도 빈틈이 있다고 큰소리치지만, 정작 그 앞에 서는 일은 아직 두렵다.',
      'An off-grid hacker barely into his twenties who goes by Signal Breaker. He prides himself on cracking locks and scrubbing traces from outside the grid. He insists even IX has weaknesses, though facing it still frightens him.',
    ),
    traits: [
      t('불붙는 호기심', 'Fierce curiosity'),
      t('건방진 재주꾼', 'Cocky talent'),
      t('서툰 친밀감', 'Awkward with closeness'),
    ],
    likes: t('겁나도 한마디 받아치는 사람', 'People who can joke back even when scared'),
    dislikes: t('등록부터 하라는 말', 'Being told to register first'),
    quote: t('잠겼다고? 그럼 열리는지도 봐야지.', 'Locked? Then we’d better see if it opens.'),
    image: 'v2/recruit/han.webp',
    beats: [
      {
        who: 'narration',
        text: t(
          '문 닫은 전자상가의 수리대. 젊은 남자가 의자를 거꾸로 타고 앉아 자판을 두드린다. 천장의 카메라가 벽 쪽으로 돌아간다.',
          'At a repair counter in a shuttered electronics arcade, a young man straddles a chair backward, typing. The ceiling camera turns to face the wall.',
        ),
      },
      {
        who: 'companion',
        text: t('야, 방금 봤냐? 저거 고개 돌리는 데 세 줄이면 돼. 난 한. 감탄은 작게 해.', 'Hey, see that? Three lines of code to turn its head. I’m Han. Keep the applause down.'),
      },
      {
        who: 'connector',
        text: t('내 기록도 볼 수 있어? 깨어나기 전 일이 하나도 기억 안 나.', 'Can you look up my records too? I remember nothing before waking up.'),
      },
      {
        who: 'companion',
        text: t(
          '볼 수 있는 것부터 보자. 난 비접속자라 정문은 안 써. ARK 등록창에 네 손부터 올리진 말고.',
          'Let’s see what I can find. I’m off-grid; I don’t use the front door. Just don’t go putting your hand on an ARK registration screen.',
        ),
      },
      {
        who: 'narration',
        text: t(
          '한이 옆 의자의 부품 더미를 치운다. 앉을 자리가 드러나자 다시 자판으로 고개를 숙인다.',
          'Han clears a heap of parts off the next chair. Once there’s room to sit, he ducks back toward his keyboard.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '네가 움직여야 단서도 나오겠네. 나도 갈게. 혼자 여기서 문만 따는 건 슬슬 지겹거든.',
          'We’ll need you out there to turn up any leads. I’m coming too. Getting tired of sitting here picking locks by myself.',
        ),
      },
    ],
    choices: [
      {
        tone: 'trust',
        label: t('기억 찾는 걸 도와줘.', 'Help me find my memories.'),
        reply: t('어, 해 볼게. 다 찾는다고는 못 해도, 찾은 걸 숨기진 않을게.', 'Yeah, I’ll try. Can’t promise I’ll find everything, but I won’t hide what I do find.'),
      },
      {
        tone: 'guard',
        label: t('내 기록은 건드리지 마.', 'Don’t change my records.'),
        reply: t('알았어, 읽기만. 네 거 건드릴 땐 먼저 물어볼게.', 'Fine. Read-only. I’ll ask before touching anything of yours.'),
      },
      {
        tone: 'wit',
        label: t('박수도 세 줄로 쳐 줘?', 'Want applause in three lines?'),
        reply: t('하, 말 좀 하네. 좋아, 넌 옆에서 계속 떠들어도 돼.', 'Ha! You’re quick. All right, you can keep talking while I work.'),
      },
    ],
    likesTone: 'wit',
    reunion: [
      t('어? 네 자리 비워 놨는데. 내가 왜 그랬지?', 'Huh? I kept your seat clear. Why did I do that?'),
      t('너랑 하던 농담이 있었는데… 끝이 기억 안 나네.', 'There was this joke we had… Can’t remember the punchline.'),
    ],
  },
  su_ah: {
    bio: t(
      '안경 너머로 잔향의 결을 살피는 기억의 대장장이. 버려진 기억을 도구와 장갑판으로 벼리며, 작은 균열 하나에도 하던 말을 잊는다. 쓸모없다며 지워진 것들이 다시 누군가를 지켜 주길 바란다.',
      'The Memory Smith studies the grain of echoes through her glasses. She forges discarded memories into tools and armor, losing her train of thought over the smallest crack. She wants what was erased as useless to protect someone again.',
    ),
    traits: [
      t('몰두하는 장인', 'Absorbed craftswoman'),
      t('세심한 손길', 'Careful hands'),
      t('조용한 고집', 'Quiet persistence'),
    ],
    likes: t('필요한 것을 솔직히 말하기', 'Honest requests for what you need'),
    dislikes: t('기억을 불량품이라 부르는 말', 'Calling a memory defective'),
    quote: t('버리기 전에 이리 줘. 아직 잡을 데가 있어.', 'Let me see it before you throw it away. There’s still something to work with.'),
    image: 'v2/recruit/su_ah.webp',
    beats: [
      {
        who: 'narration',
        text: t(
          '골목 끝 작은 대장간. 안경이 코끝까지 내려온 여자가 빛나는 조각을 집게로 돌려 본다. 작업대에는 손잡이 없는 도구들이 놓여 있다.',
          'A small forge at the end of an alley. A woman with glasses slipping down her nose turns a glowing shard in her tongs. Tools without handles lie across the bench.',
        ),
      },
      {
        who: 'companion',
        text: t('잠깐만. 이쪽 금이… 아, 손님이네. 수아야. 뜨거우니까 흰 천 위만 만져.', 'One moment. This crack here… Oh, a visitor. I’m Su-ah. It’s hot; only touch what’s on the white cloth.'),
      },
      {
        who: 'connector',
        text: t('그 빛나는 건 뭐야? 안에서 누가 말하는 것 같아.', 'What’s that glowing piece? It sounds like someone talking inside.'),
      },
      {
        who: 'companion',
        text: t(
          '잔향. 누군가 문을 고치던 기억이야. 버려져 있길래 주웠어. 손에 맞는 공구로 벼리는 중이고.',
          'An echo. Someone’s memory of fixing a door. I found it thrown away. I’m forging it into a tool that fits the hand.',
        ),
      },
      {
        who: 'narration',
        text: t(
          '수아가 조각을 천 위에 내려놓는다. 당신의 빈손을 보고, 벽에 걸린 휴대용 화로를 꺼낸다.',
          'Su-ah sets the shard on the cloth. She notices your empty hands and takes a portable furnace down from the wall.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '나갈 거면 같이 가자. 뭘 쥐여 줘야 할지 걸으면서 보면 알겠지. 아픈 데가 있으면 참지 말고 말해.',
          'If you’re heading out, let’s go together. I’ll get a better idea of what to make you along the way. Tell me if anything hurts; don’t put up with it.',
        ),
      },
    ],
    choices: [
      {
        tone: 'trust',
        label: t('사실, 빈손이라 무서워.', 'Honestly, I’m scared without gear.'),
        reply: t('말해 줘서 고마워. 꽉 쥐지 않아도 놓치지 않을 손잡이부터 만들자.', 'Thanks for telling me. Let’s start with a handle you can hold without gripping too hard.'),
      },
      {
        tone: 'guard',
        label: t('내 기억도 재료로 쓸 거야?', 'Will you use my memories too?'),
        reply: t('허락 없이는 안 써. 네가 내밀어도 돌려받고 싶어지면 말해.', 'Not without permission. Even if you offer one, tell me if you want it back.'),
      },
      {
        tone: 'wit',
        label: t('겁도 두드리면 펴질까?', 'Can you hammer fear flat?'),
        reply: t('그건 아직 안 해 봤네. 망치 쥔 손부터 떨릴 것 같은데.', 'Haven’t tried that one yet. I think my hammer hand would start shaking first.'),
      },
    ],
    likesTone: 'trust',
    reunion: [
      t('네 손 크기를 왜 알고 있지? 전에 뭘 만들어 줬나?', 'Why do I know the size of your hand? Did I make you something before?'),
      t('어디서 만났는진 모르겠는데, 네가 오니까 하던 일이 잘 풀리네.', 'I don’t know where we met, but the work goes better with you here.'),
    ],
  },
  kai: {
    bio: t(
      '폐기 판정을 받은 안드로이드 RX-09는 자신을 카이라고 소개한다. 정밀한 조준 능력을 지녔지만, 꿈에서 본 얼굴을 설명할 때면 말을 고른다. 사람인지 장비인지 답을 찾으며 자기 뜻으로 걸어갈 곳을 고르고 싶어 한다.',
      'The discarded android RX-09 introduces himself as Kai. His aim is precise, but he searches for words when describing a face from his dreams. Unsure whether he is a person or equipment, he wants to choose for himself where to go.',
    ),
    traits: [
      t('조심스러운 다정함', 'Tentative kindness'),
      t('꿈꾸는 관찰자', 'Dreaming observer'),
      t('선택을 배우는 중', 'Learning to choose'),
    ],
    likes: t('대답할 때까지 기다려 주기', 'Being given time to answer'),
    dislikes: t('물건처럼 주인을 정해 주기', 'Being assigned an owner like an object'),
    quote: t('목적지가 없어도, 같이 걷고 싶을 수 있나요?', 'Can you want to walk with someone even without a destination?'),
    image: 'v2/recruit/kai.webp',
    beats: [
      {
        who: 'narration',
        text: t(
          '폐기물 적재장의 덮개 아래. 가슴에 RX-09가 새겨진 안드로이드가 접이식 의자에 앉아 있다. 당신이 다가가자 푸른 눈이 켜진다.',
          'Under a canopy in a scrap depot, an android sits on a folding chair, RX-09 stamped on his chest. Blue eyes light up as you approach.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '수거하러 오셨나요? 저는… 카이라고 해요. 폐기 표시는 아직 붙어 있지만, 일어날 수 있어요.',
          'Are you here to collect me? I’m… Kai. The disposal label is still attached, but I can stand.',
        ),
      },
      {
        who: 'connector',
        text: t('수거하러 온 건 아니야. 너도 여기서 깨어났어?', 'I’m not here to collect you. Did you wake up here too?'),
      },
      {
        who: 'companion',
        text: t(
          '네. 잠든 동안 누군가를 기다리는 꿈을 꿨어요. 장비에도 그런 꿈이 필요한지 모르겠어요.',
          'Yes. While I slept, I dreamed I was waiting for someone. I don’t know whether equipment needs dreams like that.',
        ),
      },
      {
        who: 'narration',
        text: t(
          '카이가 의자를 접고 일어선다. 발끝을 출구로 돌린 채, 당신의 대답을 기다린다.',
          'Kai folds the chair and stands. His feet point toward the exit as he waits for your answer.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '멀리 보는 건 잘해요. 앞에 뭐가 있는지 알려 드릴 수 있어요. 제가 같이 가고 싶다고 해도 될까요?',
          'I’m good at seeing things far away. I could tell you what’s ahead. May I say that I’d like to come with you?',
        ),
      },
    ],
    choices: [
      {
        tone: 'trust',
        label: t('네가 원한다면 같이 가자.', 'If you want to, come with me.'),
        reply: t('네, 원해요. 대답을 기다려 주셔서 고마워요.', 'Yes, I want to. Thank you for waiting for my answer.'),
      },
      {
        tone: 'guard',
        label: t('누군가의 명령을 받은 거야?', 'Did someone order you to do this?'),
        reply: t('받은 명령은 없어요. 그래도 의심되시면 보이는 곳에서 걸을게요.', 'I haven’t received any orders. If you’re still unsure, I’ll stay where you can see me.'),
      },
      {
        tone: 'wit',
        label: t('꿈속 길 안내는 사양할게.', 'No dream-route tours, please.'),
        reply: t('그건 저도 길을 자주 잃어요. 깨어 있을 때는 조금 더 잘해요.', 'I get lost there often too. I’m a little better when I’m awake.'),
      },
    ],
    likesTone: 'trust',
    reunion: [
      t('꿈에서 본 분 같아요. 얼굴보다 걸음이 먼저 생각났어요.', 'I think I saw you in a dream. I remembered your walk before your face.'),
      t('이번에도 같이… 이상하네요. 왜 이번이라고 했을까요?', 'Could I come with you again… Strange. Why did I say again?'),
    ],
  },
  lin_yue: {
    bio: t(
      '청록빛 한복에 금빛 회로를 두른 야시장의 환전상. 돈과 정보, 호의까지 저울에 올리지만 장부 깊숙이 감춘 이름들에는 쉽게 값을 매기지 못한다. 손해를 싫어하면서도 정산하지 못한 거래를 끝내러 나선다.',
      'The night market’s Exchanger wears a teal hanbok traced with gold circuitry. She weighs money, information, even favors, yet struggles to price the names tucked deep in her ledger. She hates a loss, but unfinished business still draws her out.',
    ),
    traits: [
      t('우아한 흥정꾼', 'Elegant negotiator'),
      t('능청스러운 미소', 'Knowing smile'),
      t('쉽게 못 끊는 인연', 'Ties she cannot quite sever'),
    ],
    likes: t('웃으며 받아치는 흥정', 'A counteroffer delivered with a smile'),
    dislikes: t('대가를 숨기는 호의', 'Favors with hidden costs'),
    quote: t('값은 물어봐도 돼. 판다고 한 적은 없지만.', 'You may ask the price. I never said it was for sale.'),
    image: 'v2/recruit/lin_yue.webp',
    beats: [
      {
        who: 'narration',
        text: t(
          '야시장 환전대. 청록빛 한복의 금색 회로가 등불 아래 빛난다. 여자가 비녀를 고쳐 꽂고 빈 저울 접시를 당신 쪽으로 민다.',
          'At a night-market exchange counter, gold circuitry glows along a teal hanbok in the lamplight. A woman adjusts her hairpin and slides an empty weighing pan toward you.',
        ),
      },
      {
        who: 'companion',
        text: t('린위에야. 돈이 없으면 소식도 받아. 그렇게 빈손만 보고 있으면 저울이 민망하잖아.', 'Lin Yue. If you’re out of money, I take news too. Don’t leave the poor scales staring at empty hands.'),
      },
      {
        who: 'connector',
        text: t('팔 만한 기억도 없어. 내가 누군지부터 알아야 하는데.', 'I don’t even have memories to sell. I need to find out who I am first.'),
      },
      {
        who: 'companion',
        text: t(
          '그럼 앞으로 볼 걸로 거래하지. 가는 길에 월광호라는 배 이름을 보면 내게 알려 줘. 묵은 장부가 좀 있어서.',
          'Then let’s trade in what you’ll see. If you come across a ship called the Moonlight, tell me. I have some old accounts to settle.',
        ),
      },
      {
        who: 'narration',
        text: t(
          '린위에가 장부 사이의 붉은 종이를 손끝으로 밀어 넣는다. 환전대에 영업 종료 팻말을 걸고 부채를 편다.',
          'Lin Yue tucks a red sheet deeper between the ledger’s pages. She hangs a CLOSED sign on the counter and opens her fan.',
        ),
      },
      {
        who: 'companion',
        text: t(
          '난 길과 거래처를 대고, 넌 본 걸 숨기지 않는 걸로. 직접 같이 가야 수지가 맞는지 알겠네. 조건은 어때?',
          'I provide routes and contacts; you tell me what you see. I’ll come along and see whether it pays. How do those terms sound?',
        ),
      },
    ],
    choices: [
      {
        tone: 'trust',
        label: t('알게 된 건 다 말할게.', 'I’ll tell you what I learn.'),
        reply: t('듣기 좋은 말이네. 네가 지키면 나도 내 몫을 지킬게.', 'That sounds promising. Keep your end, and I’ll keep mine.'),
      },
      {
        tone: 'guard',
        label: t('숨겨 둔 수수료는 없지?', 'Any hidden fees?'),
        reply: t('의심은 잘하네. 추가로 받을 게 생기면 먼저 말할 테니, 그때 거절해.', 'You’re suitably suspicious. If I need anything extra, I’ll ask first; you can say no then.'),
      },
      {
        tone: 'wit',
        label: t('내 말동무 값은 빼 줘.', 'Deduct my conversation fee.'),
        reply: t('빈손으로 와서 값을 부르네? 좋아, 심심하지 않게 해 주면 쳐줄게.', 'Empty hands, and you’re naming a price? All right, keep me entertained and I’ll count it.'),
      },
    ],
    likesTone: 'wit',
    reunion: [
      t('이상하지. 얼굴은 낯선데 네 흥정은 들어 본 것 같아.', 'Strange. A new face, but I think I’ve heard you bargain before.'),
      t('장부엔 없는데 받을 게 남은 기분이야. 돈은 아니고.', 'Nothing in the ledger, yet I feel you still owe me something. Not money.'),
    ],
  },
}
