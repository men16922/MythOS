// Signal+ camp nights (engine/crpg.ts campScene / startCamp): at a safehouse, a deployed companion whose approval has
// reached `minApproval` opens one quiet conversation, once per run. Small, concrete things the player has earned —
// never the beats of the bond cutscenes (cutscenes.ts) or the companion arcs (eventsArcs.ts / eventsMore.ts), and no
// arc is resolved here. Only IX remembers earlier loops: a companion may at most feel a faint déjà vu.
//
// Voices: Se-rin blunt 반말 · Tae-o short declaratives (~다.) · Han light slangy 반말 · Su-ah gentle 반말 ·
// Kai polite 해요체 · Lin-yue lazy, knowing 반말.
//   se_rin  — sews you a hidden pocket; her first run (thirty mandarins in a school bag)
//   tae_o   — trying to eat for ten minutes instead of four; asks to sit with his back to the door
//   han     — his album of error screens; entry 0001 has no photo
//   su_ah   — a tin of slag beads sorted by colour; the one grey bead she cannot read
//   kai     — wants to choose tonight's dream; asks to count your breaths
//   lin_yue — the steamed bun she leaves out as a "deposit" with luck
import type { CampSceneDef, DialogueDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

const SE_RIN: DialogueDef = {
  id: 'camp_se_rin',
  start: 'pocket',
  nodes: {
    pocket: {
      speaker: 'se_rin',
      text: t(
        '안가의 드럼통 불. 세린이 당신 외투를 뒤집어 무릎에 펼쳐 놓았다. 실을 입에 문 채 안감을 뜯는다. “가만있어. 주머니 하나 달아 주는 거야. 아무도 안 더듬는 자리에.”\n바늘이 세 번 들어갔다 나온다. 바느질이 엉망이다.',
        'A drum fire in the safehouse. Se-rin has your coat turned inside out across her knees, thread between her teeth, picking open the lining. “Hold still. I’m giving you a pocket. In the spot nobody ever pats down.”\nThe needle goes in and out three times. The stitching is a mess.',
      ),
      options: [
        {
          label: t('“바느질 진짜 못한다.”', '“You really can’t sew.”'),
          intent: 'insight',
          approval: { se_rin: 1 },
          success: {
            text: t('“바느질로 먹고산 적 없거든.” 이로 실을 끊는 소리. “이 주머니 첫 번째 규칙. 예쁘면 들켜.”', '“Never made a living sewing.” She bites the thread off. “First rule of this pocket: if it’s pretty, it gets found.”'),
            goto: 'oranges',
          },
        },
        {
          label: t('“이런 건 누구한테 배웠어?”', '“Who taught you this stuff?”'),
          intent: 'ask',
          success: { text: t('“배운 적 없어. 걸리면서 늘었지.” 세린이 바늘을 불빛에 비춰 본다.', '“Nobody. Got better by getting caught.” Se-rin holds the needle up to the firelight.'), goto: 'oranges' },
        },
        {
          label: t('“네가 하라는 대로 할게. 넌 늘 옳으니까.”', '“I’ll do whatever you say. You’re always right.”'),
          intent: 'persuade',
          approval: { se_rin: -2 },
          success: {
            text: t('바늘이 멈춘다. “그런 말 하는 놈이 제일 먼저 팔더라.” 세린이 다시 꿰맨다. 아까보다 조금 세게.', 'The needle stops. “The ones who talk like that sell you out first.” She goes back to sewing, a little harder than before.'),
            goto: 'oranges',
          },
        },
        {
          label: t('불가에 등을 기대고 눈을 감는다', 'Lean back by the fire and close your eyes'),
          intent: 'leave',
          success: { text: t('바늘 소리가 한동안 이어진다. 눈을 떴을 때 외투는 당신 무릎 위에 개어져 있다.', 'The sound of the needle goes on for a while. When you open your eyes, the coat is folded on your lap.') },
        },
      ],
    },
    oranges: {
      speaker: 'se_rin',
      text: t(
        '“열네 살. 첫 운반. 책가방에 귤 서른 개.” 세린이 피식 웃는다. “강 건너 검문소에서 걸렸어. 단속관이 가방을 열더니 ‘이게 뭐냐’ 그러더라. 내가 ‘숙제요’ 그랬지.”\n바늘이 멈춘다. “그 사람, 그냥 보내 줬어. 귤 하나만 가져가고. 그날 배웠어. 거짓말은 못해도 돼. 눈만 먼저 안 피하면.”',
        '“Fourteen. First run. Thirty mandarins in a school bag.” Se-rin snorts. “Got stopped at the checkpoint across the river. The enforcer opens the bag and goes, ‘What’s this?’ I say, ‘Homework.’”\nThe needle stops. “He let me go. Took one mandarin. That’s the day I learned: you don’t have to lie well. You just can’t look away first.”',
      ),
      options: [
        {
          label: t('새 주머니에 칩을 몰래 넣어 본다', 'Test the new pocket: palm a chip into it'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 12 },
          approval: { se_rin: 1 },
          success: {
            text: t('칩이 손바닥에서 사라져 안감 속으로 미끄러진다. 세린이 눈을 가늘게 뜬다. “…방금 거, 나도 못 봤다.” 그녀가 처음으로 소리 내어 웃는다.', 'The chip vanishes from your palm and slides into the lining. Se-rin narrows her eyes. “…Didn’t see that one. Even me.” For the first time she laughs out loud.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
            goto: 'mandarin',
          },
          failure: {
            text: t('칩이 소매에서 굴러 불가로 떨어진다. 집어 올리다 손끝을 덴다. 세린이 한숨을 쉰다. “눈은 안 피했네. 손이 피했지.”', 'The chip rolls out of your sleeve and drops by the fire. You burn a fingertip picking it up. Se-rin sighs. “Your eyes held. Your hand looked away.”'),
            effects: [{ kind: 'hp', amount: -2 }],
            goto: 'mandarin',
          },
        },
        {
          label: t('“그 단속관, 다시 만나면 어떻게 할 건데?”', '“If you met that enforcer again, what would you do?”'),
          intent: 'ask',
          approval: { se_rin: 1 },
          success: {
            text: t('세린이 한참 불을 본다. “귤값 받아야지.” 그러고는 덧붙인다. “…아니. 하나 더 줄 거야. 이번엔 내가 먼저.”', 'Se-rin watches the fire a long time. “Make him pay for the mandarin.” Then: “…No. I’d give him another one. Me first, this time.”'),
            goto: 'mandarin',
          },
        },
        {
          label: t('“난 ‘엄마 심부름’이라고 했었는데.”', '“Mine was ‘errand for my mum’.”'),
          intent: 'deceive',
          requires: { background: 'runner' },
          approval: { se_rin: 2 },
          success: {
            text: t('세린이 당신을 본다. 같은 다리를 건너온 사람을 보는 얼굴이다. “그게 더 낫네. 단속관들 엄마 얘기에 약해.” 그녀가 실을 새로 꿴다. 이번엔 꼼꼼하다.', 'Se-rin looks at you — the look for someone who crossed the same bridge. “That’s better. Enforcers go soft on mums.” She threads the needle again. Neater stitches this time.'),
            goto: 'mandarin',
          },
        },
        {
          label: t('“고마워. 잘 쓸게.”', '“Thanks. I’ll put it to use.”'),
          intent: 'leave',
          success: { text: t('“써. 쓰라고 단 거야.” 세린이 외투를 던져 준다.', '“Use it. That’s what it’s for.” Se-rin tosses you the coat.') },
        },
      ],
    },
    mandarin: {
      speaker: 'se_rin',
      text: t(
        '세린이 마지막 매듭을 이로 끊는다. 그리고 어디서 났는지 모를 귤 하나를 새 주머니에 밀어 넣는다. “첫 짐. 배달 사고 나면 너 책임이다.”',
        'Se-rin bites off the last knot. Then, from who knows where, she pushes a mandarin into the new pocket. “First cargo. If it goes missing, that’s on you.”',
      ),
      options: [
        {
          label: t('귤을 까서 반을 건넨다', 'Peel it and hand her half'),
          intent: 'offer',
          approval: { se_rin: 1 },
          success: {
            text: t('“배달품 까먹는 운반책이 어딨어.” 그래도 받는다. 둘이 귤을 먹는다. 시고, 차갑고, 생각보다 달다.', '“What kind of runner eats the cargo?” She takes it anyway. You eat it together. Sour, cold, sweeter than expected.'),
            effects: [{ kind: 'hp', amount: 3 }],
          },
        },
        {
          label: t('“끝날 때까지 안 먹을게. 끝까지 들고 간다.”', '“I won’t eat it till this is over. I’ll carry it all the way.”'),
          intent: 'offer',
          approval: { se_rin: 2 },
          success: {
            text: t('세린이 고개를 든다. 잠깐 웃음이 사라진다. “…그래. 끝까지 들고 가.” 그녀가 불을 뒤적인다. 그 뒤로 둘 다 말이 없다.', 'Se-rin looks up. For a moment the smirk is gone. “…Right. Carry it all the way.” She pokes the fire. Neither of you says anything after that.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('외투를 입는다', 'Put the coat on'),
          intent: 'leave',
          success: { text: t('새 주머니가 옆구리에서 묵직하다. 귤 하나 무게다.', 'The new pocket hangs heavy at your side. Exactly one mandarin heavy.') },
        },
      ],
    },
  },
}

const TAE_O: DialogueDef = {
  id: 'camp_tae_o',
  start: 'bowl',
  nodes: {
    bowl: {
      speaker: 'tae_o',
      text: t(
        '태오가 불가에서 국수 그릇을 들고 있다. 손목시계를 풀어 앞에 놓았다. 젓가락이 움직이다 멈추고, 다시 움직이다 멈춘다.\n“단속국 식사 시간은 사 분이다. 십 년을 사 분 안에 먹었다.” 그가 시계를 본다. “오늘은 십 분을 해 보려고 한다. 어렵다.”',
        'Tae-o sits by the fire with a bowl of noodles. He has taken off his watch and set it in front of him. His chopsticks move and stop, move and stop.\n“Enforcement gives you four minutes to eat. I ate in four minutes for ten years.” He glances at the watch. “Tonight I’m trying for ten. It’s hard.”',
      ),
      options: [
        {
          label: t('그릇을 들고 옆에 앉아 속도를 맞춘다', 'Bring your bowl, sit beside him, match his pace'),
          intent: 'offer',
          approval: { tae_o: 1 },
          success: {
            text: t('한 젓가락. 숨 한 번. 불 한 번 뒤적임. 당신이 속도를 맞추자 그의 어깨가 조금씩 내려간다.', 'One mouthful. One breath. One poke at the fire. As you match his pace, his shoulders come down a little at a time.'),
            goto: 'door',
          },
        },
        {
          label: t('“그 사 분짜리 십 년 동안, 몇 명이나 잡았어?”', '“In those four-minute years — how many did you catch?”'),
          intent: 'ask',
          approval: { tae_o: -1 },
          success: {
            text: t('젓가락이 멈춘다. “백열넷.” 대답이 너무 빠르다. 세어 둔 숫자다. “이름도 다 안다. 묻지 마라.” 그가 다시 먹는다. 사 분짜리 속도로.', 'The chopsticks stop. “A hundred and fourteen.” The answer comes too fast. A number he keeps counted. “I know every name. Don’t ask.” He eats again, at four-minute speed.'),
            goto: 'door',
          },
        },
        {
          label: t('“밤마다 이 가는 소리, 당신이었구나.”', '“The teeth-grinding every night — that was you.”'),
          intent: 'ask',
          requires: { background: 'medic' },
          approval: { tae_o: 2 },
          success: {
            text: t(
              '태오가 턱을 만진다. “…들렸나.” 당신이 구급 가방에서 실리콘 마우스피스를 꺼내 던진다. 그가 그것을 한참 들여다보다 짧게 웃는다. 처음 듣는 소리다. “집행관한테 이런 걸 주는 의사는 처음이다.”',
              'Tae-o touches his jaw. “…You heard.” You dig a silicone mouthguard out of your kit and toss it to him. He studies it a long time, then laughs once, short. You’ve never heard that sound from him. “First doctor who ever gave an enforcer one of these.”',
            ),
            goto: 'door',
          },
        },
        {
          label: t('“천천히 먹어.” 그 말만 하고 자리를 뜬다', '“Take your time.” Say only that and leave him to it'),
          intent: 'leave',
          success: { text: t('“그래.” 등 뒤에서 젓가락 소리가 이어진다. 아까보다 조금 느리게.', '“Mm.” The chopsticks keep going behind you. A little slower than before.') },
        },
      ],
    },
    door: {
      speaker: 'tae_o',
      text: t(
        '그릇이 비어 간다. 태오는 문을 마주 보는 자리에 앉아 있다. 어느 안가에서든 늘 그 자리다. 그가 문과 당신을 번갈아 본다.\n“부탁 하나 하자. 자리 좀 바꿔 앉아 줘라. 오늘은 문을 등지고 먹어 보고 싶다.”',
        'The bowl is nearly empty. Tae-o is sitting facing the door. In every safehouse it’s the same seat. He looks from the door to you and back.\n“One favour. Swap seats with me. Tonight I want to eat with my back to the door.”',
      ),
      options: [
        {
          label: t('자리를 바꾼다', 'Swap seats'),
          intent: 'offer',
          approval: { tae_o: 2 },
          success: {
            text: t(
              '그가 문을 등지고 앉는다. 처음 일 분은 등이 돌처럼 굳어 있다. 삼 분째에 국물을 마신다. 칠 분째에 눈을 감는다. 시계가 십 분을 넘긴다. 그는 시계를 보지 않는다.',
              'He sits with his back to the door. For the first minute his back is stone. At three minutes he drinks the broth. At seven he closes his eyes. The watch passes ten. He doesn’t look at it.',
            ),
            effects: [{ kind: 'heal_party', amount: 5 }],
          },
        },
        {
          label: t('문고리에 빈 깡통을 매단다', 'Hang an empty can on the door handle'),
          intent: 'insight',
          approval: { tae_o: 1 },
          success: {
            text: t('깡통이 문고리에서 달랑거린다. 문이 열리면 누구든 듣는다. 태오가 그것을 보다가 코로 웃는다. “집행관 교범엔 없는 방법이다.” 그래도 그는 자리를 바꿔 앉는다.', 'The can dangles from the handle. If the door opens, everyone hears. Tae-o looks at it and huffs a laugh through his nose. “Not in the enforcer’s manual.” He swaps seats anyway.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“아직 버리지 마. 그 습관이 우릴 살렸어.”', '“Don’t drop it yet. That habit has kept us alive.”'),
          intent: 'persuade',
          approval: { tae_o: -1 },
          success: {
            text: t('“…그래. 아직은.” 그가 자리를 지킨다. 남은 국수를 사 분 만에 비우고, 시계를 다시 찬다.', '“…Right. Not yet.” He keeps his seat, finishes the noodles in four minutes and straps the watch back on.'),
          },
        },
        {
          label: t('“다 먹었으면 자.”', '“If you’re done, get some sleep.”'),
          intent: 'leave',
          success: { text: t('“먼저 자라.” 그는 문을 마주 본 채 그릇을 내려놓는다.', '“You first.” He sets the bowl down, still facing the door.') },
        },
      ],
    },
  },
}

const HAN: DialogueDef = {
  id: 'camp_han',
  start: 'album',
  nodes: {
    album: {
      speaker: 'han',
      text: t(
        '한이 불가에서 손바닥만 한 수첩을 넘긴다. 페이지마다 영수증만 한 사진이 붙어 있다. 전부 오류 화면이다.\n“내 우표첩.” 그가 히죽 웃는다. “이건 열두 살 때 자판기. 일주일 동안 콜라가 공짜로 나왔지. 이건 지하철 개찰구. 이건… 아, 이건 말 못 해.”',
        'By the fire, Han flips through a palm-sized notebook. Every page has a receipt-sized photo stuck on it. All of them error screens.\n“My stamp album.” He grins. “This one’s a vending machine, when I was twelve. Free cola for a week. This one’s a subway gate. This one’s… ah, can’t talk about this one.”',
      ),
      options: [
        {
          label: t('“제일 아끼는 건 뭐야?”', '“Which one’s your favourite?”'),
          intent: 'ask',
          approval: { han: 1 },
          success: { text: t('“오, 좋은 질문.” 한이 수첩을 맨 뒤로 넘긴다.', '“Ooh, good question.” Han flips to the very back.'), goto: 'first' },
        },
        {
          label: t('“오늘 것도 하나 붙여. 우리 거.”', '“Add one from tonight. Ours.”'),
          intent: 'offer',
          approval: { han: 2 },
          success: {
            text: t('“우리 거?” 한이 그 말을 한 번 더 굴려 본다. “…좋다. 자리 비워 둘게.” 그가 맨 뒷장을 펴다 멈춘다.', '“Ours?” Han turns the word over once more. “…Nice. I’ll save a spot.” He opens to the last page and pauses.'),
            goto: 'first',
          },
        },
        {
          label: t('“이제 그만 찔러. 언젠가 IX가 널 찾아.”', '“Stop poking at it. One day IX will find you.”'),
          intent: 'persuade',
          approval: { han: -2 },
          success: {
            text: t('한이 수첩을 덮는다. “찾을 게 있어야 찾지.” 웃는데 눈은 안 웃는다. “걱정해 주는 건 알아. 근데 그 말, 관리망이 제일 좋아하는 말이야.”', 'Han shuts the notebook. “Has to be something there to find.” He smiles; his eyes don’t. “I know you’re worried. But that line is the control net’s favourite sentence.”'),
          },
        },
        {
          label: t('“자라. 내일 일찍 나가.”', '“Sleep. We head out early.”'),
          intent: 'leave',
          success: { text: t('“네, 네.” 한이 수첩을 품에 넣는다. 잠들 때까지 손이 그 위에 있다.', '“Yes, yes.” Han tucks the notebook inside his jacket. His hand stays on it until he’s asleep.') },
        },
      ],
    },
    first: {
      speaker: 'han',
      text: t(
        '맨 뒷장에는 사진 대신 손글씨 한 줄. ‘0001’.\n“이게 첫 번째야. 사진이 없어. 일곱 살 때 우리 동네 신호등을 내가 멈췄거든. 빨간불로. 그날 그 길에서 애 하나가 안 치였어.” 한이 어깨를 으쓱한다. “아무도 몰라. 증거도 없고. 그래서 제일 좋아.”',
        'On the last page, instead of a photo, one handwritten line: ‘0001’.\n“That’s the first. No photo. When I was seven I stopped the traffic light on our street. On red. A kid didn’t get hit on that road that day.” Han shrugs. “Nobody knows. No evidence. That’s why it’s my favourite.”',
      ),
      options: [
        {
          label: t('“이제 한 명은 알아.”', '“Now somebody knows.”'),
          intent: 'offer',
          approval: { han: 2 },
          success: {
            text: t('한이 수첩을 내려다본다. “…그러네.” 그가 펜을 꺼내 ‘0001’ 옆에 작은 점 하나를 찍는다. “증인 한 명. 이걸로 정식 기록이다.”', 'Han looks down at the notebook. “…Huh. Yeah.” He takes out a pen and puts one small dot beside ‘0001’. “One witness. Makes it official.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('한의 핫플레이트 제한기를 같이 뚫어 라면을 끓인다', 'Help Han crack the hotplate’s limiter and boil ramen'),
          intent: 'insight',
          check: { stat: 'int', dc: 12 },
          assist: 'han',
          approval: { han: 1 },
          success: {
            text: t('안전 제한기가 ‘정상’이라고 거짓말을 시작한다. 물이 끓는다. 한이 수첩 맨 뒤에 새 번호를 적는다. ‘0412 — 라면.’ “네 지분 절반.”', 'The safety limiter starts lying that everything is ‘normal’. The water boils. Han writes a new number at the back of the notebook: ‘0412 — ramen.’ “Half of it’s yours.”'),
            effects: [{ kind: 'heal_party', amount: 4 }],
          },
          failure: {
            text: t('핫플레이트가 퍽 소리를 내며 꺼진다. 냄비 손잡이에 손을 덴다. 한이 배를 잡고 웃는다. “이건 사진 찍는다. 무조건 찍는다.”', 'The hotplate dies with a pop. You burn your hand on the pot handle. Han doubles over laughing. “I’m photographing this. Absolutely photographing this.”'),
            effects: [{ kind: 'hp', amount: -2 }],
          },
        },
        {
          label: t('“증거 없는 게 제일 좋다니. 너답다.”', '“Your favourite has no evidence. Very you.”'),
          intent: 'leave',
          success: { text: t('“그치?” 한이 수첩을 덮고 불을 본다. 기분 좋은 얼굴이다.', '“Right?” Han closes the notebook and watches the fire, pleased with himself.') },
        },
      ],
    },
  },
}

const SU_AH: DialogueDef = {
  id: 'camp_su_ah',
  start: 'tin',
  nodes: {
    tin: {
      speaker: 'su_ah',
      text: t(
        '수아가 앞치마 주머니에서 낡은 사탕 깡통을 꺼낸다. 뚜껑을 열자 쌀알만 한 쇠구슬이 가득하다. 불빛에 색이 다 다르다. 파란 것, 주황 것, 거의 투명한 것.\n“찌꺼기 녹이고 남은 거야. 버리질 못하겠어서.” 그녀가 하나를 집어 든다. “주황색은 대개 밥 먹던 기억. 이건… 누가 누구한테 만두 빚어 주던 날이었을 거야.”',
        'Su-ah takes an old sweets tin from her apron pocket. Inside, beads of metal the size of rice grains. In the firelight they’re all different colours — blue, orange, nearly clear.\n“What’s left when I melt down the slag. I can’t bring myself to throw them out.” She picks one up. “Orange is usually a meal. This one… somebody was making dumplings for somebody.”',
      ),
      options: [
        {
          label: t('“하나 들어 봐도 돼?”', '“Can I hold one?”'),
          intent: 'ask',
          approval: { su_ah: 1 },
          success: {
            text: t('수아가 파란 구슬 하나를 당신 손바닥에 굴려 준다. 생각보다 차갑다. “파란 건 누굴 기다리던 거. 오래 쥐고 있으면 좀 쓸쓸해져.” 그녀가 깡통 바닥을 뒤적인다.', 'Su-ah rolls a blue bead into your palm. Colder than you expected. “Blue is waiting for someone. Hold it too long and you get a bit lonely.” She rummages at the bottom of the tin.'),
            goto: 'grey',
          },
        },
        {
          label: t('“이름표 붙이는 거 도와줄까? 색깔별로.”', '“Want help labelling them? By colour.”'),
          intent: 'offer',
          approval: { su_ah: 2 },
          success: {
            text: t('수아가 눈을 깜빡인다. 그러다 웃는다. “…그런 생각은 못 했네.” 둘이 종이를 찢어 작은 칸을 만든다. 밥. 기다림. 웃음. 마지막에 그녀의 손이 멈춘다.', 'Su-ah blinks. Then she smiles. “…Never thought of that.” You tear paper into little sections together. Meals. Waiting. Laughing. At the last one her hand stops.'),
            goto: 'grey',
          },
        },
        {
          label: t('“이거 시장에 내놓으면 값 꽤 나오겠는데.”', '“These would fetch a decent price at the market.”'),
          intent: 'offer',
          approval: { su_ah: -3, lin_yue: 1 },
          success: {
            text: t('수아가 뚜껑을 닫는다. 딸깍. “알아. 얼마 나오는지도 알아.” 그녀가 깡통을 다시 앞치마에 넣는다. “그래서 안 내놔.”', 'Su-ah closes the lid. Click. “I know. I know exactly what they’d fetch.” She puts the tin back in her apron. “That’s why they stay here.”'),
          },
        },
        {
          label: t('“예쁘다.” 그 말만 하고 같이 들여다본다', '“They’re pretty.” Say only that and look with her'),
          intent: 'leave',
          success: { text: t('“그치.” 수아가 깡통을 오래 들여다본다. 당신도 같이.', '“Aren’t they.” Su-ah gazes into the tin a long time. So do you.') },
        },
      ],
    },
    grey: {
      speaker: 'su_ah',
      text: t(
        '수아가 깡통 맨 밑에서 하나를 꺼낸다. 회색이다. 다른 것들처럼 빛나지 않는다.\n“이것만 몰라. 무슨 기억인지. 슬픈 것도 아니고 기쁜 것도 아니고.” 엄지로 굴린다. “가끔은 아무 일도 없던 날이었나 싶어. 그냥 화요일 같은. 그런 날도 누군가는 지키고 싶었나 봐.”',
        'From the bottom of the tin Su-ah takes one bead. Grey. It doesn’t shine like the others.\n“This is the only one I can’t read. Not sad, not happy.” She rolls it under her thumb. “Sometimes I think it was a day when nothing happened. Just a Tuesday. Someone wanted to keep even that.”',
      ),
      options: [
        {
          label: t('“화요일, 좋네. 그걸로 벼려 줘.”', '“A Tuesday. I like that. Forge me something from it.”'),
          intent: 'ask',
          approval: { su_ah: 1 },
          success: {
            text: t('수아가 웃는다. 휴대용 화로에 불을 올리고 회색 구슬을 쇳물에 떨어뜨린다. 한참 뒤 얇은 날 하나가 식으며 낮은 소리를 낸다. 특별할 것 없는 소리. “평범한 날로 벼린 날은 잘 안 부러져.”', 'Su-ah smiles. She lights the portable furnace and drops the grey bead into the melt. A long while later a thin edge cools with a low sound — nothing special about it. “An edge forged from an ordinary day doesn’t break easily.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('“네가 갖고 있어. 그게 제일 맞는 자리야.”', '“You keep it. That’s where it belongs.”'),
          intent: 'offer',
          approval: { su_ah: 2 },
          success: {
            text: t('수아가 회색 구슬을 깡통에 넣지 않는다. 가죽 끈에 꿰어 손목에 두 번 감는다. “…그러네. 이건 내가 갖고 있어야겠다.”', 'Su-ah doesn’t put the grey bead back in the tin. She threads it on a leather cord and wraps it twice around her wrist. “…Yeah. This one I should keep.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('조용히 불을 지킨다', 'Tend the fire in silence'),
          intent: 'leave',
          success: { text: t('수아가 구슬을 깡통에 다시 넣는다. 뚜껑 닫는 소리가 아주 조심스럽다.', 'Su-ah puts the bead back in the tin. She closes the lid very carefully.') },
        },
      ],
    },
  },
}

const KAI: DialogueDef = {
  id: 'camp_kai',
  start: 'dream',
  nodes: {
    dream: {
      speaker: 'kai',
      text: t(
        '카이가 불가에 무릎을 세우고 앉아 있다. 눈의 푸른빛을 가장 낮게 낮췄다.\n“오늘 밤엔 꿈을 골라서 꿔 보려고요. 사람들은 잠들기 전에 뭘 생각하면 그게 꿈에 나온다면서요.” 그가 당신을 본다. “근데 저는 생각할 게 없어요. 하나만 빌려주실래요?”',
        'Kai sits by the fire, knees drawn up, the blue in his eyes turned down as low as it goes.\n“Tonight I want to try choosing my dream. People say if you think about something before you sleep, it shows up.” He looks at you. “But I don’t have anything to think about. Would you lend me one?”',
      ),
      options: [
        {
          label: t('강가 국숫집 이야기를 해 준다', 'Tell him about a noodle stall by the river'),
          intent: 'offer',
          approval: { kai: 2 },
          success: {
            text: t('김 서린 유리문, 플라스틱 의자, 국물 위로 떨어지는 파. 카이가 하나하나 되묻는다. “파는 무슨 색이에요?” “초록.” “소리는요?” “칼이 도마에 닿는 소리.” 그가 눈을 감는다. “저장했어요.”', 'A fogged glass door, plastic stools, spring onion falling onto broth. Kai asks about each thing. “What colour is the onion?” “Green.” “And the sound?” “A knife on a chopping board.” He closes his eyes. “Saved.”'),
            goto: 'breath',
          },
        },
        {
          label: t('“네가 고른 걸 말해 봐. 빌릴 필요 없을걸.”', '“Tell me what you’d pick. I doubt you need to borrow.”'),
          intent: 'ask',
          approval: { kai: 1 },
          success: {
            text: t('카이가 오래 생각한다. “…지금 이거요. 불 앞에 앉아 있는 거.” 그가 스스로 놀란 얼굴을 한다. “이것도 돼요?”', 'Kai thinks for a long time. “…This. Sitting in front of the fire.” He looks surprised at himself. “Does that count?”'),
            goto: 'breath',
          },
        },
        {
          label: t('“꿈은 그냥 오류야. 고를 수 있는 게 아니야.”', '“Dreams are just errors. You don’t get to pick them.”'),
          intent: 'persuade',
          approval: { kai: -2 },
          success: {
            text: t('카이가 잠깐 아무 말도 하지 않는다. “…폐기 판정서에도 그렇게 적혀 있었어요.” 그가 웃으려다 만다. “그래도 오늘은 해 볼게요. 오류라도요.”', 'Kai says nothing for a moment. “…That’s what my disposal order said, too.” He starts to smile and stops. “I’ll still try tonight. Even if it’s an error.”'),
            goto: 'breath',
          },
        },
        {
          label: t('“오늘은 그냥 자.”', '“Just sleep tonight.”'),
          intent: 'leave',
          success: { text: t('“네.” 카이가 눈의 빛을 끈다. 꺼지기 직전 아주 작게 깜빡인다. 잘 자라는 인사처럼.', '“Okay.” Kai switches off the light in his eyes. Just before it goes out, it blinks once, very small — like saying good night.') },
        },
      ],
    },
    breath: {
      speaker: 'kai',
      text: t(
        '카이가 몸을 눕힌다. 가슴속 냉각팬이 덜컹덜컹 긁는 소리를 낸다. 그가 민망한 듯 가슴께를 누른다.\n“사람들은 숨소리를 세면서 잠든다면서요. 저는 숨을 안 쉬어서요… 당신 숨소리를 세도 돼요?” 잠깐 멈춘다. “이상해요. 이 말, 전에도 한 것 같아요. 그럴 리 없는데.”',
        'Kai lies down. The cooling fan in his chest rattles and scrapes. Embarrassed, he presses a hand over it.\n“People fall asleep counting breaths, right? I don’t breathe, so… could I count yours?” He pauses. “That’s strange. I feel like I’ve said this before. I can’t have.”',
      ),
      options: [
        {
          label: t('천천히 숨을 쉬어 준다', 'Breathe slowly for him'),
          intent: 'offer',
          approval: { kai: 2 },
          success: {
            text: t('들이쉬고, 내쉬고. 카이가 입속으로 센다. 하나, 둘. 서른일곱에서 숫자가 멈춘다. 팬 소리가 느려진다. 불빛 속에서 그의 손가락이 한 번 꿈틀한다. 무언가를 쥐는 것처럼.', 'In, out. Kai counts under his breath. One, two. At thirty-seven the counting stops. The fan slows. In the firelight his fingers twitch once, as if closing around something.'),
            effects: [{ kind: 'heal_party', amount: 4 }],
          },
        },
        {
          label: t('냉각팬 나사를 조여 준다', 'Tighten the screws on his cooling fan'),
          intent: 'insight',
          check: { stat: 'int', dc: 11 },
          assist: 'kai',
          approval: { kai: 1 },
          success: {
            text: t('외피 틈으로 드라이버를 넣는다. 반 바퀴. 덜컹거림이 멎고 팬이 낮게 웅웅거린다. 카이가 눈을 동그랗게 뜬다. “…조용해요. 제 안에서 이런 소리가 났었네요.”', 'You slide a screwdriver into a seam in his casing. Half a turn. The rattle stops; the fan settles into a low hum. Kai’s eyes go round. “…It’s quiet. So that’s the sound I make inside.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
          failure: {
            text: t('드라이버가 미끄러져 팬 날개를 건드린다. 카이가 움찔하다가 웃음 비슷한 소리를 낸다. “간지러워요.” 덜컹거림은 그대로다. 당신 손등에 작은 상처가 남는다.', 'The screwdriver slips and nicks a fan blade. Kai flinches, then makes a sound close to a laugh. “That tickles.” The rattle stays. A small cut stays on the back of your hand.'),
            effects: [{ kind: 'hp', amount: -1 }],
          },
        },
        {
          label: t('모포를 덮어 주고 물러난다', 'Pull a blanket over him and step away'),
          intent: 'leave',
          success: { text: t('“저 춥지 않아요.” 그래도 카이는 모포를 끌어 올린다. 턱 끝까지.', '“I don’t get cold.” Kai pulls the blanket up anyway. All the way to his chin.') },
        },
      ],
    },
  },
}

const LIN_YUE: DialogueDef = {
  id: 'camp_lin_yue',
  start: 'bun',
  nodes: {
    bun: {
      speaker: 'lin_yue',
      text: t(
        '린위에가 종이봉투에서 찐빵 두 개를 꺼낸다. 하나는 먹고, 하나는 불가 벽돌 위에 올려 둔다. 손대지 않는다. 김이 천천히 식는다.\n당신 시선을 느꼈는지 그녀가 눈을 굴린다. “낭비 아니야. 예치금이야. 야시장 미신. 하나 남겨 두면 운이 이자 붙여서 돌려준대.”',
        'Lin-yue takes two steamed buns from a paper bag. She eats one and sets the other on a brick by the fire. She doesn’t touch it. The steam slowly fades.\nShe feels you looking and rolls her eyes. “It’s not waste. It’s a deposit. Night-market superstition: leave one out and luck pays it back with interest.”',
      ),
      options: [
        {
          label: t('“네가 미신을 믿는다고?”', '“You believe in superstitions?”'),
          intent: 'ask',
          success: { text: t('“믿는 게 아니라 분산 투자야.” 린위에가 부채로 불을 살짝 부친다.', '“It’s not belief. It’s diversification.” Lin-yue fans the fire lightly.'), goto: 'interest' },
        },
        {
          label: t('벽돌 위 찐빵을 집어 먹는다', 'Take the bun off the brick and eat it'),
          intent: 'sneak',
          approval: { lin_yue: 1 },
          success: {
            text: t('린위에가 당신이 빵을 다 먹을 때까지 지켜본다. 그러고는 장부를 펼쳐 한 줄을 적는다. “찐빵 하나, 운 예치금 인출. 이자는 네가 갚아.” 입꼬리가 올라가 있다.', 'Lin-yue watches until you’ve finished the whole bun. Then she opens her ledger and writes a line. “One steamed bun, withdrawn from luck’s deposit. You owe the interest.” The corner of her mouth is up.'),
            effects: [{ kind: 'hp', amount: 4 }],
            goto: 'interest',
          },
        },
        {
          label: t('“그 예치금, 내가 지분 반 살게.”', '“I’ll buy a half stake in that deposit.”'),
          intent: 'offer',
          requires: { background: 'broker' },
          approval: { lin_yue: 2 },
          success: {
            text: t('린위에가 눈썹을 올린다. “운에 투자를?” 당신이 동전 하나를 빵 옆에 올린다. 그녀가 잠깐 계산하더니 동전 하나를 더 얹는다. “공동 명의. 손해 보면 반반이다.” 처음으로 소리 내어 웃는다.', 'Lin-yue raises an eyebrow. “Investing in luck?” You set a coin beside the bun. She does a quick sum, then adds a coin of her own. “Joint account. Losses split fifty-fifty.” For the first time she laughs out loud.'),
            goto: 'interest',
          },
        },
        {
          label: t('“운 좋길.”', '“Good luck with it.”'),
          intent: 'leave',
          success: { text: t('“운은 비는 게 아니라 맡기는 거야.” 린위에가 봉투를 접는다.', '“You don’t wish for luck. You deposit it.” Lin-yue folds up the paper bag.') },
        },
      ],
    },
    interest: {
      speaker: 'lin_yue',
      text: t(
        '불이 낮아진다. 린위에가 벽돌 쪽을 본다.\n“시장에서 처음 배운 셈이 그거야. 하나는 남겨 둬라. 다 쓰는 놈은 돌아올 데가 없다.” 그녀가 손가락으로 벽돌을 톡 친다. “…근데 이자 받으러 온 사람은 아직 한 번도 못 봤어.”',
        'The fire burns low. Lin-yue looks over at the brick.\n“First sum I ever learned at the market. Always leave one. Whoever spends everything has nowhere to come back to.” She taps the brick with one finger. “…Though I’ve never once seen anyone come to collect the interest.”',
      ),
      options: [
        {
          label: t('“내가 받으러 올게. 이자까지.”', '“I’ll come and collect. Interest and all.”'),
          intent: 'offer',
          approval: { lin_yue: 2 },
          success: {
            text: t('린위에가 당신을 오래 본다. 계산하는 눈이 아니다. “…약속은 장부에 안 적어. 적으면 빚이 되니까.” 그녀는 장부를 펴지 않는다.', 'Lin-yue looks at you a long time. Not her calculating look. “…I don’t write promises in the ledger. Written down, they turn into debts.” She leaves the ledger closed.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“이자는 홀짝 한 판으로 정하자.”', '“Let’s settle the interest with one round of odd-or-even.”'),
          intent: 'insight',
          check: { stat: 'obs', dc: 13 },
          approval: { lin_yue: 1 },
          success: {
            text: t('주먹 쥔 그녀의 손등 힘줄이 아주 조금 움직인다. “짝.” 손바닥을 펴자 동전 네 개. 린위에가 혀를 찬다. “내 손을 읽었어? 누구한테 배웠어.” 동전이 당신 쪽으로 미끄러진다.', 'The tendons on the back of her closed fist shift, just slightly. “Even.” She opens her palm: four coins. Lin-yue clicks her tongue. “You read my hand? Who taught you that?” The coins slide your way.'),
            effects: [{ kind: 'credits', amount: 12 }],
          },
          failure: {
            text: t('“홀.” 손바닥엔 동전 두 개. 린위에가 판돈을 거둬 가며 웃는다. “운에 기대는 놈은 운한테 이자를 내지.”', '“Odd.” Two coins in her palm. Lin-yue sweeps up the stake, smiling. “Lean on luck and you pay luck the interest.”'),
            effects: [{ kind: 'credits', amount: -8 }],
          },
        },
        {
          label: t('“잘 자, 린위에.”', '“Good night, Lin-yue.”'),
          intent: 'leave',
          success: { text: t('“수수료는 내일.” 그래도 그녀는 불을 조금 더 지핀다. 당신 쪽으로.', '“Fees tomorrow.” Still, she builds the fire up a little. On your side.') },
        },
      ],
    },
  },
}

export const CAMP_DIALOGUES: DialogueDef[] = [SE_RIN, TAE_O, HAN, SU_AH, KAI, LIN_YUE]

export const CAMP_SCENES: CampSceneDef[] = [
  { companion: 'se_rin', minApproval: 3, dialogue: 'camp_se_rin' },
  { companion: 'tae_o', minApproval: 3, dialogue: 'camp_tae_o' },
  { companion: 'han', minApproval: 3, dialogue: 'camp_han' },
  { companion: 'su_ah', minApproval: 3, dialogue: 'camp_su_ah' },
  { companion: 'kai', minApproval: 3, dialogue: 'camp_kai' },
  { companion: 'lin_yue', minApproval: 3, dialogue: 'camp_lin_yue' },
]
