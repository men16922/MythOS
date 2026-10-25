// R7d — recruit scenes, quiet bond cutscenes, run-start openings and personal events.
import type { CompanionIntro, EventDef, Text } from '../../../engine/types.ts'
import type { CutsceneDef } from '../../cutscenes.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const NEW_COMPANION_INTROS: Record<string, CompanionIntro> = {
  io: {
    bio: t(
      '유리성에서 실패한 루프를 분류하던 사서 AI. 책등의 번호보다 독자가 접어 둔 모서리를 오래 살핀다. 이제는 끝난 삶을 정리하는 대신, 아직 돌아오지 않은 독자를 찾으러 서가 밖으로 나온다.',
      'A librarian AI who catalogued failed loops in the Glass Library. Io spends longer on a reader’s folded page corners than on the numbers along the spines. Now the librarian has left the shelves to look for readers who have yet to return.',
    ),
    traits: [t('차분한 사서', 'Unhurried librarian'), t('정확한 기억', 'Precise memory'), t('서툰 사심', 'An awkward fondness')],
    likes: t('읽던 자리를 남겨 두는 사람', 'Readers who leave a marker where they stopped'),
    dislikes: t('읽지도 않고 폐기하는 일', 'Discarding a book without reading it'),
    quote: t('아직 마지막 페이지가 아닙니다. 계속하십시오.', 'This is not the last page. Please continue.'),
    image: 'v2/recruit/io.webp',
    beats: [
      {
        who: 'narration',
        text: t('지하 환승로의 반납함. 사서가 유리 책 한 권을 받쳐 들고 있다. 책장 안에서 작은 열차가 같은 승강장을 맴돈다.', 'At a return box in an underground passage, a librarian cradles a glass book. Inside its pages, a tiny train keeps circling the same platform.'),
      },
      {
        who: 'companion',
        text: t('반납은 오른쪽입니다. 저는 사서 이오입니다. 손을 대실 때는 책등을 받쳐 주십시오. 안에 아직 사람이 있습니다.', 'Returns go on the right. I am Io, the librarian. Please support the spine when you handle it. There are still people inside.'),
      },
      {
        who: 'connector',
        text: t('이 안에도 내가 있어? 나에 관한 기록을 찾고 있어.', 'Am I in there too? I’m looking for a record of myself.'),
      },
      {
        who: 'companion',
        text: t('닮은 독자는 여러 분 계십니다. 같은 분인지는 확인하지 못했습니다. 찾는 분을 먼저 만나고 분류하겠습니다.', 'There are several readers who resemble you. I cannot confirm they are the same person. I will meet the person I am looking for before assigning a category.'),
      },
      {
        who: 'narration',
        text: t('이오가 반납함을 잠근다. 외출 시간을 적던 펜이 복귀 예정 칸 위에서 멈춘다. 그 칸은 비워 둔다.', 'Io locks the return box. The pen recording the departure pauses over the expected return time. That field stays blank.'),
      },
      {
        who: 'companion',
        text: t('동행을 요청합니다. 이번에는 현장에서 읽겠습니다. 당신이 멈추시면 저도 기다리겠습니다.', 'I request permission to accompany you. This time I will read in the field. If you stop, I will wait.'),
      },
    ],
    choices: [
      { tone: 'trust', label: t('내 이야기도 끝까지 읽어 줘.', 'Read my story to the end.'), reply: t('중간에 덮지 않겠습니다. 읽기 어려운 부분도 포함해서입니다.', 'I will not close it midway. That includes the difficult passages.') },
      { tone: 'guard', label: t('내 허락 없이 기록하지 마.', 'Ask before recording anything about me.'), reply: t('열람과 기록은 별개입니다. 동의하신 범위를 지키겠습니다.', 'Reading and recording are separate matters. I will respect the limits you set.') },
      { tone: 'wit', label: t('길을 잃으면 어느 서가에 꽂혀?', 'Which shelf do I go on if I get lost?'), reply: t('분실물로 분류하지 않겠습니다. 직접 찾으러 가겠습니다.', 'I will not classify you as lost property. I will come and find you.') },
    ],
    likesTone: 'guard',
    reunion: [
      t('기록보다 먼저 알아보았습니다. 이런 경우의 분류는 아직 없습니다.', 'I recognised you before consulting the record. There is no category for this yet.'),
      t('당신이 읽던 자리는 그대로입니다. 이번에도 이어서 읽으시겠습니까?', 'Your place is still marked. Would you like to continue this time?'),
    ],
  },
  miro: {
    bio: t(
      '반납 카드가 겹친 얼굴로 유리성의 서가 사이를 다니는 작은 독자. 누구의 기억에도 오래 남지 못해, 사람들이 고개를 돌릴 때마다 먼저 숨는다. 자기 이름을 아는 사람과 같은 출구로 나가 보고 싶어 한다.',
      'A small reader with a face of overlapping return cards, slipping between the Glass Library’s shelves. Miro never stays long in anyone’s memory and hides whenever someone turns away. The child wants to leave by the same exit as someone who knows their name.',
    ),
    traits: [t('속삭이는 독자', 'Whispering reader'), t('숨은 길 찾기', 'Finder of hidden paths'), t('조심스러운 애착', 'Tentative attachment')],
    likes: t('돌아보기 전에 이름을 불러 주기', 'Hearing their name before someone turns around'),
    dislikes: t('못 본 척 지나가는 눈길', 'Being looked through'),
    quote: t('작게 불러도 들려. 내 이름이면.', 'I can hear you whisper. If it’s my name.'),
    image: 'v2/recruit/miro.webp',
    beats: [
      {
        who: 'narration',
        text: t('닫힌 헌책 좌판 아래에서 종이 스치는 소리가 난다. 반납 카드가 겹친 얼굴의 아이가 천막 끝을 조금 들어 올린다.', 'Paper rustles beneath a shuttered bookstall. A child with a face of layered return cards lifts the edge of the tarp.'),
      },
      {
        who: 'companion',
        text: t('쉿. 여기 앉아. 큰 소리 나면 책보다 날 먼저 가져가.', 'Shh. Sit here. If we make noise, they’ll take me before the books.'),
      },
      {
        who: 'connector',
        text: t('혼자 기다린 거야? 뭐라고 부르면 돼?', 'Have you been waiting alone? What should I call you?'),
      },
      {
        who: 'companion',
        text: t('미로. 방금 들었으니까 아직 알지? 다른 데 봤다가도 아는지는… 나중에 해 보자.', 'Miro. You just heard it, so you still know it, right? Whether you’ll know it after looking away… we can try that later.'),
      },
      {
        who: 'narration',
        text: t('미로가 천막 안쪽으로 낮은 통로를 가리킨다. 먼저 기어가다가 멈춘다. 돌아보는 대신 한 손을 뒤로 내민다.', 'Miro points to a low passage under the tarp and starts crawling, then stops. Instead of looking back, the child reaches a hand behind.'),
      },
      {
        who: 'companion',
        text: t('같이 나가자. 내가 앞에 있을게. 손 놓쳐도 이름은 놓치지 마.', 'Let’s leave together. I’ll go first. If you lose my hand, keep my name.'),
      },
    ],
    choices: [
      { tone: 'trust', label: t('응, 미로. 같이 가자.', 'All right, Miro. Let’s go.'), reply: t('응. 지금처럼 불러. 나 여기 있어.', 'Yeah. Say it just like that. I’m here.') },
      { tone: 'guard', label: t('그 길이 어디로 나오는지 알려 줘.', 'Tell me where that passage comes out.'), reply: t('계단 밑. 밖에서 안 보여. 먼저 보고 와도 돼. 기다릴게.', 'Under the stairs. Hidden from outside. You can go look first. I’ll wait.') },
      { tone: 'wit', label: t('길잡이도 길을 잃으면?', 'What if the guide gets lost too?'), reply: t('그럼 둘이 잃는 거네. 혼자보단 찾기 쉽겠다.', 'Then there’ll be two of us. Easier to find than one.') },
    ],
    likesTone: 'trust',
    reunion: [
      t('너는 고개 돌렸다가도 날 봤어. 그건 기억나.', 'You looked away and still saw me after. I remember that.'),
      t('오늘은 내가 먼저 부를까 했어. 그런데 네 이름은… 아직 모르네.', 'I thought I’d call out first today. But your name… I still don’t know it.'),
    ],
  },
  doyun: {
    bio: t(
      '최적화 명단의 마지막 줄에서 빠져나온 시민. 싸움은 서툴지만 누가 뒤처졌는지 세는 버릇이 있다. 이제는 자기 차례가 지나갔다고 줄을 떠나지 않는다.',
      'A citizen who escaped the last line of the optimization list. Doyun is clumsy in a fight but always notices who has fallen behind. Getting past the checkpoint no longer means leaving everyone else in the queue.',
    ),
    traits: [t('성실한 생존자', 'Earnest survivor'), t('서툰 용기', 'Unpractised courage'), t('빠짐없는 점호', 'No name left uncalled')],
    likes: t('마지막 사람까지 기다리는 일', 'Waiting for the last person'),
    dislikes: t('이름 대신 번호로 부르는 소리', 'Being called by a number'),
    quote: t('다 지나가셨어요? 그럼 저도 갈게요.', 'Is everyone through? Then I’ll come too.'),
    image: 'v2/recruit/doyun.webp',
    beats: [
      {
        who: 'narration',
        text: t('대피 통로의 무거운 방화문. 구겨진 번호표를 단 사람이 어깨로 문을 받치고 있다. 안쪽에서 마지막 발소리가 멀어진다.', 'A heavy fire door opens onto an evacuation passage. Someone with a crumpled number tag holds it with a shoulder. The last footsteps inside fade away.'),
      },
      {
        who: 'companion',
        text: t('지나가세요. 아직 버틸 만해요. 혹시 뒤에 다른 분도 계세요?', 'Come through. I can hold it a little longer. Is anyone else behind you?'),
      },
      {
        who: 'connector',
        text: t('내가 마지막이야. 그 번호표, 명단에서 나온 거야?', 'I’m the last. That tag—is it from the list?'),
      },
      {
        who: 'companion',
        text: t('네. 관리관이 읽기 직전에 누가 문을 열어 줬어요. 그분 이름은 못 물었어요. 저는 도윤이에요.', 'Yes. Someone opened a door just before the Warden read it out. I never got their name. I’m Doyun.'),
      },
      {
        who: 'narration',
        text: t('문이 닫히자 도윤이 굳은 어깨를 천천히 편다. 번호표를 떼려다 말고 뒤집는다. 빈 뒷면이 가슴 쪽을 향한다.', 'When the door closes, Doyun slowly straightens a stiff shoulder. Instead of tearing off the tag, Doyun turns it over, blank side against the chest.'),
      },
      {
        who: 'companion',
        text: t('다음 문까지 같이 가도 될까요? 이번엔 제가 열어 둘게요. 이름 물어볼 시간도 있게요.', 'May I come as far as the next door? I’ll hold it open this time. Long enough to ask someone’s name, too.'),
      },
    ],
    choices: [
      { tone: 'trust', label: t('도윤, 다음 문은 같이 받치자.', 'Doyun, we’ll hold the next door together.'), reply: t('좋아요. 그러면 한쪽 어깨씩 쉬어도 되겠네요.', 'I’d like that. Then we can rest one shoulder at a time.') },
      { tone: 'guard', label: t('무리해서 버티지는 마.', 'Don’t hold on past your limit.'), reply: t('아프면 말할게요. 괜찮은 척하면 같이 가는 분도 다치겠죠.', 'I’ll tell you when it hurts. Pretending I’m fine could hurt the people with me.') },
      { tone: 'wit', label: t('문 여는 일이 적성에 맞아?', 'Found your calling in opening doors?'), reply: t('닫는 쪽보다는요. 손잡이 있는 문이면 더 좋고요.', 'Better than closing them. Though I’d prefer one with a handle.') },
    ],
    likesTone: 'trust',
    reunion: [
      t('발소리 듣고 문을 잡았어요. 당신일 것 같았어요.', 'I held the door when I heard footsteps. I thought it might be you.'),
      t('이번에도 같이 가요. 제 이름은… 아, 기억하고 계시네요.', 'Let’s go together again. My name is… Oh, you remember.'),
    ],
  },
  bel: {
    bio: t(
      '십 년 동안 남의 문장을 잘라 낸 검열단 이탈자. 이제도 글을 읽으면 손가락부터 삭제할 줄을 짚는다. 그 손을 멈추고, 지운 문장의 주인에게 원고를 돌려주려 한다.',
      'A Censorate defector who spent ten years cutting other people’s sentences. Bel’s finger still finds the line to strike before a page is finished. Now Bel tries to stop that hand and return the manuscripts to the people who wrote them.',
    ),
    traits: [t('짧은 말투', 'Clipped speech'), t('매서운 교정 눈', 'Sharp editorial eye'), t('지우지 않는 책임', 'Unedited accountability')],
    likes: t('제 문장을 끝까지 말하는 사람', 'People who finish their own sentences'),
    dislikes: t('삭제를 보호라고 부르는 말', 'Calling deletion protection'),
    quote: t('그 줄 살려. 틀렸어도 네 문장이잖아.', 'Keep that line. Wrong or not, it’s yours.'),
    image: 'v2/recruit/bel.webp',
    beats: [
      {
        who: 'narration',
        text: t('폐인쇄소의 건조대. 검열단 소매를 접어 올린 사람이 검게 칠한 전단을 빛에 비춘다. 붉은 펜 끝이 같은 줄 위에서 멈춰 있다.', 'At the drying rack of an abandoned print shop, someone with rolled-up Censorate sleeves holds a blacked-out leaflet to the light. A red pen hovers over one line.'),
      },
      {
        who: 'companion',
        text: t('건조 중. 만지지 마. 벨이야. 검열단은 관뒀고. 지금 하는 건 복원.', 'Still drying. Hands off. I’m Bel. Quit the Censorate. This is restoration.'),
      },
      {
        who: 'connector',
        text: t('네가 지운 거야? 밑에 뭐라고 쓰여 있었는데?', 'Did you erase it? What did it say underneath?'),
      },
      {
        who: 'companion',
        text: t('내 결재야. 본문은 기억 안 나. 삭제 사유만 외웠거든. 그래서 원고 주인을 찾는 중이야.', 'My approval stamp. Don’t remember the text. Only learnt the grounds for cutting it. So I’m looking for the author.'),
      },
      {
        who: 'narration',
        text: t('벨이 전단을 빈 종이 사이에 끼운다. 붉은 펜은 뚜껑을 닫아 소매 안에 넣는다. 건조대에는 빈 집게만 남는다.', 'Bel slips the leaflet between two blank sheets and caps the red pen, tucking it into a sleeve. Empty clips hang from the rack.'),
      },
      {
        who: 'companion',
        text: t('네가 가는 길에 인쇄소가 더 있어. 같이 가지. 읽는 건 도울게. 고치는 건 네가 정해.', 'More print shops along your route. I’ll come. Help with the reading. You decide what gets changed.'),
      },
    ],
    choices: [
      { tone: 'trust', label: t('원고 주인을 같이 찾자.', 'Let’s find the author.'), reply: t('좋아. 사과문은 내가 써. 대필은 안 맡겨.', 'Good. I’ll write the apology. No ghostwriter.') },
      { tone: 'guard', label: t('내 말에도 줄을 긋는 건 아니겠지?', 'Will you start crossing out my words?'), reply: t('그 버릇 남아 있어. 손 올라가면 말해. 뚜껑부터 닫을게.', 'Still have the habit. Say something if my hand moves. I’ll cap the pen.') },
      { tone: 'wit', label: t('이 대화도 초고야?', 'Is this conversation a first draft?'), reply: t('응. 퇴고는 없어. 방금 한 말은 내가 책임져.', 'Yes. No revisions. I stand by what I just said.') },
    ],
    likesTone: 'guard',
    reunion: [
      t('네 말은 끝까지 듣게 돼. 어디서 배운 버릇인지 모르겠네.', 'I let you finish speaking. Don’t know where I picked that up.'),
      t('전에 하던 얘기 있지. 이어서 해. 이번엔 안 끊어.', 'There was something you were telling me. Go on. No interruptions this time.'),
    ],
  },
  rem: {
    bio: t(
      '고철 묘역에서 기계들의 꿈을 끄던 집행자. 이제는 종료 명령이 와도 잠든 기계 옆에 남아 다음 소리를 기다린다. 한 번도 자 본 적 없는 몸으로, 누군가 편히 잠드는 법을 배우고 있다.',
      'The executor who used to switch off the machines’ dreams in the scrap graveyard. Now Rem stays beside sleeping machines after a shutdown order, waiting for the next sound. Having never slept, Rem is learning what lets someone else rest.',
    ),
    traits: [t('나른한 목소리', 'Drowsy voice'), t('잠들지 않는 파수', 'Sleepless vigil'), t('늦게 배운 다정함', 'Kindness learnt late')],
    likes: t('깨우기 전에 기다려 주는 손', 'A hand that waits before waking someone'),
    dislikes: t('꿈이 끝나기도 전에 끄는 스위치', 'A switch thrown before a dream ends'),
    quote: t('아직 꿈꾸고 있어요. 조금만 더 기다려요.', 'Still dreaming. Let’s wait a little longer.'),
    image: 'v2/recruit/rem.webp',
    beats: [
      {
        who: 'narration',
        text: t('폐기품 환적장의 그늘. 안드로이드 하나가 빈 운반대에서 잠든다. 그 곁의 집행자가 종료 단말을 뒤집어 놓는다.', 'In the shade of a scrap transfer depot, an android sleeps on an empty trolley. The executor beside it turns a shutdown terminal face down.'),
      },
      {
        who: 'companion',
        text: t('발소리를 조금만 낮춰 줘요. 이제 막 잠들었어요. 저는 렘이에요. 이 아이를 끄러 왔었어요.', 'Keep your steps soft, please. This one just fell asleep. I’m Rem. I came here to switch it off.'),
      },
      {
        who: 'connector',
        text: t('그런데 왜 기다리고 있어?', 'Then why are you waiting?'),
      },
      {
        who: 'companion',
        text: t('꿈에서 누굴 부르고 있어요. 답을 듣기 전에 끄는 건… 이제 못 하겠어요.', 'It’s calling for someone in its dream. Switching it off before the answer… I can’t do that anymore.'),
      },
      {
        who: 'narration',
        text: t('안드로이드의 입가가 풀린다. 렘이 종료 케이블을 뽑고 운반대 난간에 감는다. 화면에 남은 명령은 서서히 어두워진다.', 'The android’s mouth relaxes. Rem unplugs the shutdown cable and winds it around the trolley rail. The order left on the screen slowly dims.'),
      },
      {
        who: 'companion',
        text: t('같이 걸어도 될까요. 당신이 잠들면 지킬게요. 깨우는 건… 정말 아침이 오면 할게요.', 'May I walk with you? When you sleep, I’ll keep watch. As for waking you… I’ll wait until morning really comes.'),
      },
    ],
    choices: [
      { tone: 'trust', label: t('내가 잘 때 곁에 있어 줘.', 'Stay beside me while I sleep.'), reply: t('그럴게요. 눈을 감아도 발소리는 멀어지지 않을 거예요.', 'I will. When you close your eyes, you won’t hear my footsteps leave.') },
      { tone: 'guard', label: t('내 꿈에는 들어오지 마.', 'Stay out of my dreams.'), reply: t('네. 밖에서 기다릴게요. 문을 열지는 않을게요.', 'All right. I’ll wait outside. I won’t open the door.') },
      { tone: 'wit', label: t('코 고는 소리도 지켜 줘?', 'Will you guard my snoring too?'), reply: t('그 소리는 알아요. 고장인 줄 알고… 한참 들은 적 있어요.', 'I know that sound. I once thought it was a fault… and listened for quite a while.') },
    ],
    likesTone: 'trust',
    reunion: [
      t('이상해요. 당신이 눈을 뜨는 시간을 알고 있었어요.', 'Strange. I knew when you would open your eyes.'),
      t('이번엔 잘 쉬었어요? 대답은 천천히 해도 돼요.', 'Did you rest well this time? Take your time answering.'),
    ],
  },
}
export const NEW_COMPANION_CUTSCENES: CutsceneDef[] = [
  {
    id: 'io_dust_cover',
    companion: 'io',
    tier: 2,
    title: t('덮개 아래', 'Under the Cover'),
    text: t(
      '안가의 환풍구에서 먼지가 내린다. 이오가 책을 싸던 부드러운 천을 당신의 무릎에 덮어 준다. 모서리에 작은 청구 기호가 수놓여 있다.\n“보존용 덮개입니다. 오늘은 책에 사용하지 않아도 됩니다.”\n천 아래로 굽은 무릎의 윤곽이 잡힌다. 이오의 무릎 위에는 포장을 벗긴 책이 놓여 있다. 환풍기가 멎을 때까지 사서는 그 책 위로 몸을 조금 기울인 채 앉아 있다.',
      'Dust drifts from the safehouse vent. Io lays a soft book cloth over your knees. A tiny shelf mark is stitched into one corner.\n“A protective cover. It need not be used for a book today.”\nYour bent knees make a ridge beneath it. The unwrapped book rests on Io’s lap. Until the fan stops, the librarian sits leaning slightly over its exposed pages.',
    ),
    image: 'v2/cutscenes/io_dust_cover.webp',
  },
  {
    id: 'io_personal_copy',
    companion: 'io',
    tier: 3,
    title: t('사서의 책', 'The Librarian’s Copy'),
    text: t(
      '불을 낮춘 안가. 이오의 무릎에 얇은 책이 펼쳐져 있다. 색인도 대출표도 없다. 사서가 책 한쪽을 당신 쪽으로 기울인다.\n“제가 고른 책입니다. 옆에서 함께 읽어 주시겠습니까?”\n내용은 비가 그친 뒤 창문을 여는 사람에 관한 이야기다. 이오가 읽던 줄 아래로 손가락 그림자가 놓인다. 당신이 그 줄을 다 읽을 때까지, 책장은 넘어가지 않는다.',
      'The safehouse lights are low. A thin book lies open on Io’s lap, with no index or loan slip. The librarian tilts one side toward you.\n“I chose this book myself. Would you read it beside me?”\nIt is about someone opening a window after the rain. A finger’s shadow rests below the line Io was reading. The page stays still until you reach its end.',
    ),
    image: 'v2/cutscenes/io_personal_copy.webp',
  },
  {
    id: 'miro_sleeve_knot',
    companion: 'miro',
    tier: 2,
    title: t('느슨한 매듭', 'A Loose Knot'),
    text: t(
      '안가 구석, 담요 밑에서 종이 스치는 소리가 난다. 미로가 자기 소매와 당신의 소매를 느슨하게 묶는다. 손을 빼려면 뺄 수 있을 만큼 작은 매듭이다.\n“돌아볼 때마다 찾지 않아도 돼. 당기면 여기야.”\n천 사이로 아이의 손등이 잠깐 보인다. 문밖에서 발소리가 나도 매듭은 팽팽해지지 않는다. 미로의 숨이 담요 안에서 조금씩 길어진다.',
      'Paper rustles beneath a blanket in the safehouse corner. Miro loosely knots one sleeve to yours. The knot is small enough to slip free of.\n“You don’t have to look for me every time. Just tug. I’m here.”\nThe back of a small hand shows between the folds. Footsteps pass outside, but the knot never pulls tight. Beneath the blanket, Miro’s breathing slowly deepens.',
    ),
    image: 'v2/cutscenes/miro_sleeve_knot.webp',
  },
  {
    id: 'miro_open_curtain',
    companion: 'miro',
    tier: 3,
    title: t('열린 커튼', 'The Open Curtain'),
    text: t(
      '잠자리를 나누는 낡은 커튼. 늘 틈 뒤에 앉던 미로가 오늘은 커튼을 끝까지 걷는다. 낮은 등불이 반납 카드로 겹친 얼굴과 빈 베개를 함께 비춘다.\n“오늘은 눈 감아도 돼. 네가 다시 볼 때도 여기 있을게.”\n아이는 문 쪽을 살피지 않는다. 담요 밖으로 나온 발끝이 당신의 신발 가까이에 놓여 있다. 커튼 고리만 바람에 작게 부딪힌다.',
      'An old curtain divides the sleeping space. Miro, who always sits behind its edge, draws it all the way back. A low lamp lights the layered return-card face and the empty pillow.\n“You can close your eyes tonight. I’ll be here when you look again.”\nThe child does not watch the door. Small feet stick out from the blanket near your shoes. Only the curtain rings stir in the draught.',
    ),
    image: 'v2/cutscenes/miro_open_curtain.webp',
  },
  {
    id: 'doyun_mended_strap',
    companion: 'doyun',
    tier: 2,
    title: t('삐뚤어진 바느질', 'Uneven Stitches'),
    text: t(
      '안가 탁자 위에 당신의 가방이 놓여 있다. 도윤이 끊어진 끈의 마지막 바늘땀을 조인다. 실 색도 다르고 간격도 들쭉날쭉하다.\n“보기는 좀 그래도, 내일은 어깨에서 안 떨어질 거예요.”\n도윤의 손톱에 실밥이 붙어 있다. 그 곁에는 끈이 없는 자기 가방이 기대어 있다. 당신 가방의 덧댄 조각과 같은 색이다. 탁자 밑으로 남은 실이 길게 늘어진다.',
      'Your bag lies on the safehouse table. Doyun tightens the last stitch in its broken strap. The thread is the wrong colour, the spacing uneven.\n“It looks a little odd, but it won’t slip off your shoulder tomorrow.”\nA loose fibre clings to Doyun’s nail. Beside the table sits a bag without a strap. It is the same colour as the patch on yours. Spare thread trails toward the floor.',
    ),
    image: 'v2/cutscenes/doyun_mended_strap.webp',
  },
  {
    id: 'doyun_shared_weight',
    companion: 'doyun',
    tier: 3,
    title: t('기대는 쪽', 'Someone to Lean On'),
    text: t(
      '새벽을 기다리는 벤치. 문은 닫혀 있고 안쪽 빗장도 걸려 있다. 도윤이 곧게 세우고 있던 몸을 조금 기울여 당신의 어깨에 기댄다.\n“오늘은 제가 좀 기대도 될까요. 계속 괜찮다고 했는데, 사실 많이 피곤해요.”\n말을 마친 뒤에도 한동안 등은 뻣뻣하다. 복도에 아무 발소리도 나지 않자 어깨의 무게가 천천히 늘어난다. 벤치가 한 번 작게 삐걱인다.',
      'A bench before dawn. The door is shut and bolted from inside. Doyun lets a rigid posture tilt until a shoulder rests against yours.\n“May I lean on you today? I kept saying I was fine, but I’m really tired.”\nFor a while the back stays stiff. No footsteps come from the corridor, and the weight against your shoulder slowly grows. The bench gives one small creak.',
    ),
    image: 'v2/cutscenes/doyun_shared_weight.webp',
  },
  {
    id: 'bel_uncut_note',
    companion: 'bel',
    tier: 2,
    title: t('교정 없는 쪽지', 'An Uncorrected Note'),
    text: t(
      '식은 주전자 옆에 당신이 남긴 쪽지가 있다. 급히 쓴 글자 하나가 줄 밖으로 삐져나왔다. 벨이 쪽지를 반듯하게 펴서 찻잔 밑에 받친다.\n“오탈자 봤어. 뜻은 통하더라. 교정 안 해.”\n소매에 꽂힌 붉은 펜은 뚜껑이 닫혀 있다. 종이 모서리에 찻물이 조금 번진다. 벨의 시선은 삐져나온 글자에 잠깐 머물렀다가, 쪽지에 적힌 귀환 시각으로 옮겨 간다.',
      'Your note lies beside a cold kettle. One hurried letter strays outside the line. Bel smooths the paper beneath a teacup.\n“Saw the typo. Understood it anyway. No correction.”\nThe red pen in the sleeve stays capped. Tea spreads a little at the paper’s corner. Bel’s gaze rests briefly on the stray letter, then moves to the time you wrote down for your return.',
    ),
    image: 'v2/cutscenes/bel_uncut_note.webp',
  },
  {
    id: 'bel_unfinished_sentence',
    companion: 'bel',
    tier: 3,
    title: t('문장 하나', 'One Sentence'),
    text: t(
      '안가의 작은 탁자. 벨이 공책을 당신 쪽으로 돌린다. 첫 장 한가운데 문장 하나만 적혀 있다. 함께 돌아왔다는 말 뒤에 마침표가 여러 번 덧찍혀 있다.\n“내 초고야. 잘 썼는지는 묻지 않을게. 네가 처음 읽어 줬으면 해.”\n공책 가장자리에 손때가 짙다. 오래 들고 다닌 종이인데도 다른 장은 비어 있다. 벨은 펜을 들지 않은 손을 무릎 위에 가만히 놓고 기다린다.',
      'At the small safehouse table, Bel turns a notebook toward you. One sentence sits in the middle of the first page: you came back together. Its full stop has been pressed over several times.\n“My first draft. Won’t ask if it’s good. Just want you to read it first.”\nThe edges are dark from handling. The other pages are blank. Bel waits with empty hands resting on both knees.',
    ),
    image: 'v2/cutscenes/bel_unfinished_sentence.webp',
  },
  {
    id: 'rem_cooling_cup',
    companion: 'rem',
    tier: 2,
    title: t('식기를 기다리는 차', 'Waiting for the Tea to Cool'),
    text: t(
      '안가의 난로 옆. 렘 앞에 찻잔이 놓여 있고, 표면에는 입김 같은 서리가 얇게 낀다. 렘이 당신의 잔 아래에 접은 천을 밀어 넣는다.\n“손이 차가워서요. 제가 들고 있으면 차가 너무 빨리 식어요.”\n천을 사이에 둔 잔에서 김이 오른다. 렘의 손은 탁자 아래에 머문다. 당신이 차를 한 모금 마실 때마다, 졸린 듯 내려앉은 눈이 잔 위로 조금 올라온다.',
      'Beside the safehouse stove, a thin frost clouds the tea in front of Rem. Rem slides a folded cloth under your cup.\n“My hands are cold. If I hold it, the tea cools too quickly.”\nSteam rises from the cup on the cloth. Rem’s hands stay below the table. Each time you take a sip, those drowsy eyes lift a little to follow the cup.',
    ),
    image: 'v2/cutscenes/rem_cooling_cup.webp',
  },
  {
    id: 'rem_closed_eyes',
    companion: 'rem',
    tier: 3,
    title: t('눈을 감는 연습', 'Practising Closed Eyes'),
    text: t(
      '밤이 깊은 안가. 렘의 시선이 문과 창 사이를 오가다가 당신 앞에서 멎는다. 잠들지 않는 집행자가 천천히 눈을 감는다.\n“잠은 안 올 거예요. 그래도 잠깐, 당신이 보는 쪽을 믿어 볼게요.”\n턱은 여전히 조금 들려 있고 등도 벽에서 떨어져 있다. 문틈으로 지나가는 빛에 눈꺼풀이 희게 물든다. 빛이 사라진 뒤에도 렘은 눈을 뜨지 않는다. 숨 쉬는 소리만 옆에 남는다.',
      'Deep night in the safehouse. Rem’s gaze moves between door and window, then settles on you. The sleepless executor slowly closes both eyes.\n“I won’t fall asleep. But for a little while, I’ll trust you to watch.”\nThe chin stays slightly raised, the back clear of the wall. Light passing beneath the door washes the eyelids white. After it fades, Rem does not open them. Only the sound of breathing stays beside you.',
    ),
    image: 'v2/cutscenes/rem_closed_eyes.webp',
  },
]

export const NEW_COMPANION_OPENINGS: Record<string, Text[]> = {
  io: [
    t('뺨 아래로 마른 종이 냄새가 난다. 젖은 골목 바닥에 책 포장지가 깔려 있다.', 'Dry paper smells beneath your cheek. Book wrapping covers the wet alley floor.'),
    t('이오가 낮은 수레를 끌고 골목으로 들어온다. 비를 피한 수레 한쪽이 당신이 앉을 만큼 비어 있다.', 'Io enters the alley pulling a low cart. There is a sheltered space on it just large enough for you to sit.'),
    t('“이동 열람실입니다. 일어나기 어려우시면 앉아서 출발하십시오.”', '“The travelling reading room. If standing is difficult, you may depart seated.”'),
  ],
  miro: [
    t('눈꺼풀 위로 종이 그림자가 흔들린다. 빗물이 얼굴 바로 옆으로 떨어진다.', 'A paper shadow sways over your eyelids. Rain drips just beside your face.'),
    t('미로가 펼친 책을 머리 위에 받친 채 쪼그려 앉아 있다. 당신이 눈을 뜨자 책 뒤에서 작은 손이 나온다.', 'Miro crouches with an open book held over your head. When your eyes open, a small hand emerges from behind it.'),
    t('“쉿. 나 먼저 찾았어. 오늘은 네가 숨을 차례였나 봐.”', '“Shh. Found you first. Guess it was your turn to hide today.”'),
  ],
  doyun: [
    t('차단봉 내려오는 소리에 눈을 뜬다. 끝까지 닫히지 못한 문이 낮게 떨린다.', 'You wake to a descending barrier. A door shudders, unable to close all the way.'),
    t('도윤이 문틈을 어깨로 받치고 있다. 당신과 눈이 마주치자 빈손으로 안쪽 바닥을 가리킨다.', 'Doyun holds the gap with a shoulder. Meeting your eyes, Doyun points an empty hand toward the floor inside.'),
    t('“천천히 일어나요. 여기 한 사람 더 있다고 말해 놨어요.”', '“Take your time getting up. I told them there’s one more person here.”'),
  ],
  bel: [
    t('젖은 잉크 냄새. 얼굴 위에 드리운 전단의 검은 줄 사이로 아침빛이 새어 든다.', 'The smell of wet ink. Morning light seeps between the black bars on a leaflet over your face.'),
    t('벨이 전단을 걷어 낸다. 뒷면에 골목 약도가 있고, 막힌 출구에만 붉은 교정 표시가 찍혀 있다.', 'Bel lifts the leaflet away. An alley map covers its back, with red correction marks only on blocked exits.'),
    t('“기상. 동선 교정 끝났어. 이번 출구는 이쪽.”', '“Up. Route proofread. This way out.”'),
  ],
  rem: [
    t('차가운 공기가 이마를 스친다. 멀리 들리던 자장가가 마지막 음 앞에서 멎는다.', 'Cool air brushes your forehead. A distant lullaby stops just before its final note.'),
    t('렘이 당신 곁에서 고개를 든다. 무릎 위의 종료 단말은 꺼져 있고, 손끝에는 새벽 이슬이 맺혀 있다.', 'Rem raises a bowed head beside you. The shutdown terminal on the lap is dark; dawn dew beads on the fingertips.'),
    t('“눈 뜨셨네요. 오늘 아침은… 끝까지 같이 있어 볼까요.”', '“You’re awake. This morning… shall we stay together and see it through?”'),
  ],
}
export const NEW_COMPANION_EVENTS: EventDef[] = [
  {
    id: 'cx_io_sealed_letter',
    acts: [2, 4],
    title: t('열람하지 않은 편지', 'The Unread Letter'),
    requires: { companion: 'io' },
    speaker: 'io',
    image: 'v2/events/cx_io_sealed_letter.webp',
    gmHints: ['uncanny', 'Io', 'sealed letter', 'privacy before cataloguing'],
    text: t(
      '이오의 반납 가방에서 편지 한 통이 미끄러진다. 봉인 안쪽에서 기차 소리가 난다. 겉봉의 주소는 빗물에 번져 있다. “개봉하면 수신인을 확인할 수 있습니다.” 이오가 봉인 위에서 손을 멈춘다. “다만, 제게 보낸 편지는 아닙니다.”',
      'A letter slips from Io’s return bag. A train sounds inside the seal. Rain has blurred the address. “Opening it would identify the recipient.” Io’s hand stops above the seal. “However, this letter was not sent to me.”',
    ),
    options: [
      {
        label: t('봉인을 지키며 겉봉의 눌린 주소를 읽는다', 'Read the impressed address without opening it'),
        hint: t('관찰 5 · 성공 유대 +1 · 실패 추적 +4', 'OBS 5 · pass: bond +1 · fail: +4 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('잉크 아래 눌린 글자가 이어진다. 이오가 주소만 옮겨 적는다. “본문은 비워 두겠습니다.” 목록에 처음으로 미열람 표시가 남는다.', 'The impressions beneath the ink form an address. Io copies only that. “I will leave the contents blank.” For the first time, the catalogue marks an item unread.'),
          effects: [{ kind: 'bond', id: 'io', amount: 1 }],
        },
        failure: {
          text: t('마지막 글자를 비추자 겉봉의 조회등이 켜진다. 이오가 편지를 가린다. 봉인은 남았지만 조회 기록에 당신이 찍힌다.', 'Light on the last letter activates a lookup beacon. Io covers the envelope. The seal holds, but the query log records you.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('편지를 차폐 가방에 넣고 수신인을 기다린다', 'Shield the letter until its recipient is found'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('가방의 차폐막이 편지와 당신의 신호를 함께 감싼다. 이오가 끈을 묶는다. “배송 보류입니다. 분실은 아닙니다.”', 'The bag’s lining shields both the letter and your signal. Io ties it shut. “Delivery pending. Not lost.”'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'cx_miro_second_footsteps',
    acts: [2, 4],
    title: t('두 사람의 발자국', 'Two Sets of Footsteps'),
    requires: { companion: 'miro' },
    speaker: 'miro',
    image: 'v2/events/cx_miro_second_footsteps.webp',
    gmHints: ['uncanny', 'Miro', 'erased footprints', 'choosing to leave a trace'],
    text: t(
      '먼지 쌓인 통로를 둘이 건넜는데 발자국은 한 줄뿐이다. 미로가 당신 발자국 옆에 발을 꾹 누른다. 먼지는 곧 평평해진다. “여긴 나를 자꾸 빼.” 아이가 분필 조각을 내민다. 천장의 순찰 렌즈가 통로를 천천히 훑는다.',
      'Two of you have crossed the dusty passage, but only one set of footprints remains. Miro presses a foot beside yours. The dust settles flat again. “This place keeps leaving me out.” The child offers a piece of chalk. A patrol lens slowly sweeps the passage.',
    ),
    options: [
      {
        label: t('렌즈가 돌아간 틈에 미로의 발자국을 그린다', 'Draw Miro’s footprints while the lens turns away'),
        hint: t('민첩 4 · 성공 유대 +1 · 실패 추적 +4', 'AGI 4 · pass: bond +1 · fail: +4 Trace'),
        check: { stat: 'agi', dc: 4 },
        success: {
          text: t('작은 신발 윤곽이 당신 발자국 옆으로 이어진다. 미로가 마지막 선 위에 발을 포갠다. “이번엔 둘이 지나갔네.”', 'Small shoe outlines follow your footprints. Miro places a foot over the last outline. “Two of us came through this time.”'),
          effects: [{ kind: 'bond', id: 'miro', amount: 1 }],
        },
        failure: {
          text: t('분필 소리에 렌즈가 되돌아온다. 미로가 당신 손목을 끌어당긴다. 미완성 발자국 위로 붉은 불이 지나간다.', 'The scrape of chalk brings the lens back. Miro pulls your wrist. A red light passes over the unfinished footprint.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('당신의 발자국도 지우고 나란히 빠져나간다', 'Erase your footprints too and leave side by side'),
        hint: t('추적 −5', '−5 Trace'),
        success: {
          text: t('먼지가 고르게 눕는다. 렌즈는 빈 통로를 지나간다. 미로의 발소리가 당신 것 바로 옆에서 작게 따라온다.', 'The dust lies flat. The lens passes over an empty corridor. Miro’s quiet steps follow right beside yours.'),
          effects: [{ kind: 'trace', amount: -5 }],
        },
      },
    ],
  },
  {
    id: 'cx_doyun_extra_bowl',
    acts: [2, 3],
    title: t('남은 한 그릇', 'One Bowl Left'),
    requires: { companion: 'doyun' },
    speaker: 'doyun',
    image: 'v2/events/cx_doyun_extra_bowl.webp',
    gmHints: ['rescue', 'Doyun', 'ration list', 'an unregistered neighbour'],
    text: t(
      '배급 창구에서 마지막 그릇이 나온다. 도윤 뒤에 선 노인의 번호표를 단말이 읽지 못한다. 화면은 대기 인원을 영으로 돌린다. 도윤이 자기 그릇을 든 채 멈춘다. “저도 저렇게 서 있었어요. 제 뒤로만 다음 번호를 불렀어요.”',
      'The ration hatch serves its last bowl. The terminal cannot read the elderly person’s tag behind Doyun and resets the queue to zero. Doyun stops, bowl in hand. “I stood like that too. They kept calling the numbers behind me.”',
    ),
    options: [
      {
        label: t('도윤과 함께 창구에 재확인을 요청한다', 'Ask the hatch attendant to check again with Doyun'),
        hint: t('매력 5 · 유대 +1·모두 회복 4 / 추적 +4', 'CHA 5 · bond +1, party +4 HP / +4 Trace'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t('도윤이 노인의 이름을 듣고 창구 안에 전한다. 덜어 둔 배급통이 다시 열린다. 셋이 자리를 잡자 도윤도 그제야 숟가락을 든다.', 'Doyun asks the elder’s name and relays it through the hatch. A reserve pot opens. Only once everyone is seated does Doyun pick up a spoon.'),
          effects: [{ kind: 'bond', id: 'doyun', amount: 1 }, { kind: 'heal_party', amount: 4 }],
        },
        failure: {
          text: t('단말이 민원인의 얼굴을 저장하고 셔터를 내린다. 도윤이 그릇을 노인에게 건넨다. 창구 위 접속등은 계속 깜박인다.', 'The terminal records the complainants’ faces and shuts the hatch. Doyun hands the bowl to the elder. The connection light keeps blinking.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('가진 배급을 나누어 함께 먹는다', 'Share the rations you have and eat together'),
        hint: t('모두 회복 3', 'Party heals 3'),
        success: {
          text: t('도윤이 빈 컵에 죽을 덜어 놓는다. 양은 적어도 돌아가는 숟가락은 멎지 않는다. 당신도 벽에 기대어 따뜻한 한 입을 삼킨다.', 'Doyun portions porridge into empty cups. There is little, but the spoons keep moving. You lean against the wall and take a warm mouthful.'),
          effects: [{ kind: 'heal_party', amount: 3 }],
        },
      },
    ],
  },
  {
    id: 'cx_bel_retracted_cut',
    acts: [3, 4],
    title: t('삭제 철회', 'Withdrawing the Cut'),
    requires: { companion: 'bel' },
    speaker: 'bel',
    image: 'v2/events/cx_bel_retracted_cut.webp',
    gmHints: ['restoration', 'Bel', 'censored street poem', 'the author keeps the last word'],
    text: t(
      '폐인쇄기의 롤러에 짧은 시가 걸려 있다. 마지막 줄 위에 벨의 결재 번호가 찍혔다. 벨이 붉은 펜을 꺼내다 멈춘다. “내가 잘랐어. 이유는 형식 위반. 무슨 말인지는 안 읽었고.” 먹칠 가장자리로 글자의 눌린 자국이 보인다.',
      'A short poem is caught in an abandoned press. Bel’s approval number sits over the last line. Bel stops halfway through drawing the red pen. “My cut. Grounds: improper form. Didn’t read what it said.” Letter impressions show along the edge of the blackout.',
    ),
    options: [
      {
        label: t('새 문장을 보태지 않고 원래 글자를 찾는다', 'Recover the original letters without adding any'),
        hint: t('관찰 5 · 성공 유대 +1 · 실패 HP −3', 'OBS 5 · pass: bond +1 · fail: −3 HP'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('종이를 비스듬히 들자 눌린 문장이 드러난다. 벨은 자기 결재 번호에만 줄을 긋는다. “이 줄은 내 몫. 나머진 원문대로.”', 'Tilting the paper reveals the pressed-in sentence. Bel strikes out only the approval number. “This line’s mine. Leave the rest as written.”'),
          effects: [{ kind: 'bond', id: 'bel', amount: 1 }],
        },
        failure: {
          text: t('종이를 받치던 손이 굳은 롤러 사이에 낀다. 벨이 손잡이를 거꾸로 돌린다. 붓는 손을 빼내고 원고는 그대로 둔다.', 'Your supporting hand catches between stiff rollers. Bel reverses the handle. You ease out a swelling hand and leave the manuscript in place.'),
          effects: [{ kind: 'hp', amount: -3 }],
        },
      },
      {
        label: t('원고를 보관하고 빈 활자판을 반납한다', 'Store the poem and return the empty type plates'),
        hint: t('크레딧 +16', '+16 ₵'),
        success: {
          text: t('벨이 시를 봉투에 넣는다. 반납함에서 활자판 보증금이 나온다. 봉투 겉에는 교정 대기 대신 저자 확인이라고 적힌다.', 'Bel slips the poem into an envelope. The return box pays out the plate deposit. The envelope reads AWAITING AUTHOR, not AWAITING CORRECTION.'),
          effects: [{ kind: 'credits', amount: 16 }],
        },
      },
    ],
  },
  {
    id: 'cx_rem_wake_signal',
    acts: [2, 5],
    title: t('깨우지 않는 호출', 'A Call Without Waking'),
    requires: { companion: 'rem' },
    speaker: 'rem',
    image: 'v2/events/cx_rem_wake_signal.webp',
    gmHints: ['uncanny', 'Rem', 'shutdown recall', 'guarding another machine’s sleep'],
    text: t(
      '운반 상자 속 작은 안드로이드가 잠결에 허공을 젓는다. 누군가의 머리를 빗기는 손짓이다. 렘의 단말에 미완료 집행 호출이 켜진다. “제가 끄지 않고 온 아이예요.” 렘은 전원 덮개를 닫아 준다. “아직 머리를 다 못 빗겼나 봐요.”',
      'A small android in a transport crate moves a hand in its sleep, combing someone’s hair. An unfinished shutdown summons lights Rem’s terminal. “This is one I left running.” Rem closes its power cover. “Perhaps the hair isn’t quite combed yet.”',
    ),
    options: [
      {
        label: t('렘과 호출을 거절하고 잠든 곁을 지킨다', 'Refuse the summons with Rem and keep watch'),
        hint: t('유대 +1 · 모두 회복 4 · 추적 +3', 'Bond +1 · party heals 4 · +3 Trace'),
        success: {
          text: t('렘이 자기 이름으로 거절을 보낸다. 위치등은 켜지지만 종료등은 꺼진다. 당신도 상자 옆에 앉는다. 작은 손이 느려질 때까지 함께 쉰다.', 'Rem refuses under their own name. The locator lights, but the shutdown indicator goes dark. You sit by the crate and rest together until the small hand slows.'),
          effects: [{ kind: 'bond', id: 'rem', amount: 1 }, { kind: 'heal_party', amount: 4 }, { kind: 'trace', amount: 3 }],
        },
      },
      {
        label: t('호출 수신기를 떼고 상자를 그늘로 옮긴다', 'Remove the receiver and move the crate into shade'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('분리한 수신기만 빈 통로에서 깜박인다. 렘은 그늘 속 상자 곁에 전원선을 길게 남긴다. 잠든 손은 끊기지 않고 움직인다.', 'The detached receiver blinks alone in the empty passage. Rem leaves a long power cable beside the shaded crate. The sleeping hand keeps moving.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
]
