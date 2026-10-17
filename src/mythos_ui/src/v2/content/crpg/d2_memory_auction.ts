// Act 2 district — The Memory Auction (the Undercity Market act: where debts and memories change hands).
//
// Four points of interest, three actions. Quest q_sold_summer: Iseul sold the summer she was twelve (stage 1 from her,
// or from Palle's lot 41) → the auction ledger with the act boss's weak point (stage 2) can be bought from Palle
// (broker), coaxed or scared out of the collector Do, given by Iseul for her own chip back, or lifted from the cold
// room (by hand, or on the guards' shift change if the Act 1 patrol sheet was taken). Approval: Su-ah hates memories
// being sold, Lin Yue knows this trade and likes a fair deal and a paid debt, Tae-o protects the kid, Se-rin likes the
// theft, Kai has a dream the collector cannot price.
import type { DialogueDef, DistrictDef, NpcDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D2_MEMORY_AUCTION: DistrictDef = {
  id: 'd2_memory_auction',
  act: 2,
  name: t('기억 경매장', 'The Memory Auction'),
  image: 'v2/districts/d2_memory_auction.webp',
  intro: t(
    '바지선 세 척을 쇠사슬로 묶은 경매장. 무대 위 흰 천에 누군가의 기억이 3초씩 비친다. 객석에서 번호판이 올라갈 때마다 망치 소리가 강물 위로 번진다.\n마지막 물건이 낙찰되기 전까지, 둘러볼 수 있는 곳은 세 군데쯤.',
    'Three barges chained together make the auction house. On a white sheet above the stage, someone’s memory plays for three seconds at a time. Each time a paddle goes up, the crack of the hammer spreads out over the river.\nBefore the last lot falls, you have time for about three stops.',
  ),
  actions: 3,
  outro: t(
    '마지막 망치 소리. 등불이 하나씩 꺼지고, 낙찰된 기억들이 냉장 상자에 담겨 어둠 속으로 실려 나간다. 당신도 부교를 건너 빠져나간다.',
    'The last crack of the hammer. The lanterns go out one by one, and the sold memories are carried off into the dark in cold boxes. You cross the pontoon and slip away.',
  ),
  pois: [
    { id: 'stage', name: t('팔레의 무대', 'Palle’s Stage'), blurb: t('망치를 든 사람.', 'The man with the hammer.'), dialogue: 'd2m_palle' },
    { id: 'bench', name: t('출품자석', 'The Sellers’ Bench'), blurb: t('번호표를 찬 사람들.', 'People wearing lot numbers.'), dialogue: 'd2m_iseul' },
    { id: 'box', name: t('유리 칸막이석', 'The Glass Box'), blurb: t('어린 시절만 사는 손님.', 'A buyer who only buys childhoods.'), dialogue: 'd2m_do' },
    { id: 'cold_room', name: t('냉장 보관실', 'The Cold Room'), blurb: t('팔린 기억이 기다리는 곳.', 'Where sold memories wait.'), dialogue: 'd2m_cold_room' },
  ],
}

const PALLE: DialogueDef = {
  id: 'd2m_palle',
  npc: 'auctioneer_palle',
  start: 'podium',
  nodes: {
    podium: {
      speaker: 'auctioneer_palle',
      text: t(
        '연미복에 금테 단안경. 무대 끝의 남자가 망치로 당신을 가리킨다. 마이크도 없는데 목소리가 바지선 끝까지 닿는다. “신사 숙녀 여러분, 그리고 빚지신 여러분! 오늘 밤의 새 얼굴께 박수를! 입찰하시겠습니까, 출품하시겠습니까?”',
        'Tailcoat, gold-rimmed monocle. The man at the edge of the stage points his hammer at you. No microphone, yet his voice reaches the far end of the barges. “Ladies and gentlemen, and debtors! A hand for tonight’s new face! Will you be bidding, or consigning?”',
      ),
      options: [
        {
          label: t('“다음 물건은 뭡니까?”', '“What’s the next lot?”'),
          intent: 'ask',
          success: { text: t('팔레가 망치를 내리친다. 흰 천에 불이 들어온다.', 'Palle brings down the hammer. The white sheet lights up.'), goto: 'lot41' },
        },
        {
          label: t('기억 하나를 출품한다', 'Consign a memory'),
          intent: 'offer',
          approval: { su_ah: -2, lin_yue: 1 },
          success: {
            text: t(
              '조수가 차가운 집게를 관자놀이에 물린다. 뭔가가 빠져나간다. 무엇이었는지 벌써 가물가물하다. 팔레가 칩을 불빛에 비춘다. “35크레딧! 감사합니다. 반품은 없습니다.”',
              'An assistant clips cold tongs to your temple. Something drains out; already you can’t recall what it was. Palle holds the chip to the light. “Thirty-five credits! Thank you kindly. No returns.”',
            ),
            effects: [{ kind: 'remove_card', count: 1 }, { kind: 'credits', amount: 35 }],
          },
        },
        {
          label: t('“수수료 얘기 좀 하죠. 무대 뒤에서.”', '“Let’s talk commission. Backstage.”'),
          intent: 'persuade',
          requires: { background: 'broker' },
          approval: { lin_yue: 1 },
          success: {
            text: t('팔레의 단안경이 번쩍인다. 그가 객석에 손을 흔든다. “잠시 휴식! 술은 경매장이 냅니다!”', 'Palle’s monocle flashes. He waves to the seats. “A short intermission! Drinks are on the house!”'),
            goto: 'backroom',
          },
        },
        {
          label: t('객석으로 물러난다', 'Melt back into the seats'),
          intent: 'leave',
          success: { text: t('“구경도 입장료에 포함되어 있습니다!” 망치가 다음 사람을 가리킨다.', '“Watching is included in the admission!” The hammer swings to the next person.') },
        },
      ],
    },
    lot41: {
      speaker: 'auctioneer_palle',
      text: t(
        '흰 천 위로 3초짜리 미리보기. 옥상의 고무 물놀이 통, 손목을 타고 녹아내리는 하드, 누군가의 웃음소리. 화면이 꺼진다. “로트 41번! 열두 살의 여름! 원본 하나, 사본 없음! 시작가 40크레딧!” 앞줄에서 하얀 장갑 하나가 천천히 올라간다.',
        'A three-second preview on the sheet. A rubber paddling tub on a rooftop, a popsicle melting down a wrist, someone laughing. The screen goes dark. “Lot forty-one! A summer, age twelve! One original, no copies! We open at forty credits!” In the front row, a white glove rises slowly.',
      ),
      options: [
        {
          label: t('“출품자가 누굽니까?”', '“Who’s the seller?”'),
          intent: 'ask',
          success: {
            text: t(
              '“출품자의 비밀은 저희 경매장의 자산입니다.” 그렇게 말하면서도 팔레의 망치 끝이 무대 옆 출품자석으로 기운다. 손목에 41번을 찬 소녀가 무릎만 내려다보고 있다.',
              '“Our consignors’ privacy is this house’s finest asset.” Even as he says it, the tip of his hammer drifts toward the sellers’ bench. A girl with 41 on her wrist is staring at her knees.',
            ),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 1 }],
          },
        },
        {
          label: t('40크레딧에 입찰한다', 'Bid forty credits'),
          intent: 'offer',
          requires: { minCredits: 40 },
          approval: { su_ah: 2, lin_yue: -1 },
          success: {
            text: t(
              '하얀 장갑이 잠시 망설이다 내려간다. 망치가 떨어진다. “낙찰!” 벨벳 위로 작은 칩 하나가 건너온다. 손바닥에서 아직 따뜻하다.',
              'The white glove hesitates, then lowers. The hammer falls. “Sold!” A small chip comes over on velvet. It’s still warm in your palm.',
            ),
            effects: [{ kind: 'credits', amount: -40 }, { kind: 'quest', id: 'q_sold_summer', stage: 1 }, { kind: 'flag', key: 'bought_summer' }],
          },
        },
        {
          label: t('일어나 외친다. “저거 애 기억이잖아!”', 'Stand up and shout: “That’s a child’s memory!”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          approval: { tae_o: 2, su_ah: 1, lin_yue: -1 },
          success: {
            text: t(
              '객석이 술렁인다. 누군가 따라 외친다. 팔레가 단안경을 고쳐 쓰고, 한 박자 늦게 웃는다. “로트 41번은 출품자 사정으로 다음 경매로 미룹니다!” 무대 옆 소녀가 처음으로 고개를 든다.',
              'The seats stir. Someone shouts it after you. Palle adjusts his monocle and smiles a beat too late. “Lot forty-one is postponed to the next sale, at the consignor’s request!” The girl by the stage looks up for the first time.',
            ),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 1 }],
          },
          failure: {
            text: t(
              '아무도 따라 외치지 않는다. 덩치 둘이 양팔을 하나씩 잡고 당신을 부교 끝까지 끌고 간다. “소란은 환불되지 않습니다!”',
              'Nobody joins in. Two big men take an arm each and haul you to the end of the pontoon. “Disturbances are non-refundable!”',
            ),
            effects: [{ kind: 'hp', amount: -4 }, { kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('지켜본다', 'Just watch'),
          intent: 'leave',
          success: {
            text: t(
              '하얀 장갑이 손가락 하나를 든다. 아무도 따라붙지 않는다. “낙찰!” 그걸로 끝이다. 열두 살의 여름은 40크레딧이었다.',
              'The white glove lifts one finger. Nobody bids against it. “Sold!” That’s all. A summer, age twelve, went for forty credits.',
            ),
          },
        },
      ],
    },
    backroom: {
      speaker: 'auctioneer_palle',
      text: t(
        '무대 뒤 천막. 팔레가 단안경을 벗어 닦는다. 맨눈은 생각보다 피곤해 보인다. “브로커시군요. 걸음걸이로 압니다. 원하시는 물건을 말씀하십시오. 단, 이 경매장은 창립 이래 단 한 번도 환불한 적이 없습니다.”',
        'A tent behind the stage. Palle takes off his monocle to polish it. His bare eye looks more tired than you expected. “A broker. I can tell by the walk. Name what you want. But be advised: since its founding, this house has never once given a refund.”',
      ),
      options: [
        {
          label: t('“장부 사본. 누가 뭘 샀는지.”', '“A copy of the ledger. Who bought what.”'),
          intent: 'offer',
          requires: { minCredits: 30 },
          approval: { lin_yue: 1 },
          success: {
            text: t(
              '“정보는 반품이 안 됩니다.” 팔레가 장부에서 몇 장을 뜯어 접는다. 맨 끝 장에 이름 없는 구매자 한 줄. ‘미낙찰분 전량. 납품처: 7번 배수 터널.’ 그 아래 연필 메모. ‘먹이 줄 때 목 아래 판이 열림. 3초.’',
              '“Information is non-returnable.” Palle tears a few pages from the ledger and folds them. On the last page, one nameless buyer: ‘All unsold lots. Deliver to: Drain Tunnel 7.’ Beneath it, in pencil: ‘When it feeds, the plate under its throat opens. Three seconds.’',
            ),
            effects: [{ kind: 'credits', amount: -30 }, { kind: 'quest', id: 'q_sold_summer', stage: 2 }],
          },
        },
        {
          label: t('“돈 대신 손님을 드리죠. 오늘 밤 큰손 셋.”', '“Not money. Clients. Three big spenders, tonight.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          assist: 'lin_yue',
          approval: { se_rin: 1, lin_yue: 1 },
          success: {
            text: t(
              '팔레가 한참 당신을 본다. 그러다 웃는다. 무대에서와 똑같은 웃음이다. “거래는 언제나 환영입니다.” 장부에서 뜯은 몇 장이 건너온다. 맨 끝 장, 이름 없는 구매자. ‘미낙찰분 전량. 납품처: 7번 배수 터널.’ 연필 메모. ‘먹이 줄 때 목 아래 판이 열림. 3초.’',
              'Palle studies you for a long moment. Then he smiles, the same smile he wears on stage. “A deal is always welcome.” A few pages torn from the ledger come across. On the last, a nameless buyer: ‘All unsold lots. Deliver to: Drain Tunnel 7.’ In pencil: ‘When it feeds, the plate under its throat opens. Three seconds.’',
            ),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 2 }],
          },
          failure: {
            text: t(
              '“브로커의 약속은 이 경매장에서 담보로 잡지 않습니다.” 팔레가 단안경을 다시 낀다. 휴식 시간이 끝났다.',
              '“A broker’s promise is not accepted as collateral in this house.” Palle screws the monocle back in. Intermission is over.',
            ),
          },
        },
        {
          label: t('손을 젓는다', 'Wave it off'),
          intent: 'leave',
          success: { text: t('“현명하십니다. 정보는 비쌉니다.” 팔레가 객석으로 돌아간다. 박수가 그를 맞는다.', '“Wise. Information is expensive.” Palle returns to the seats. Applause greets him.') },
        },
      ],
    },
  },
}

const ISEUL: DialogueDef = {
  id: 'd2m_iseul',
  npc: 'iseul',
  start: 'bench',
  nodes: {
    bench: {
      speaker: 'iseul',
      text: t(
        '출품자석 맨 끝. 열여섯쯤 된 소녀가 손목에 41번 번호표를 차고 앉아 있다. 관자놀이에 동그란 패치 자국 두 개. 당신이 옆에 앉아도 고개를 돌리지 않는다. “구경은 저쪽이에요. 여긴 파는 사람 자리예요.”',
        'At the end of the sellers’ bench, a girl of about sixteen sits with lot tag 41 on her wrist. Two round patch marks on her temple. When you sit beside her, she doesn’t turn her head. “Watching’s over there. This is for sellers.”',
      ),
      options: [
        {
          label: t('“뭘 팔았는데?”', '“What did you sell?”'),
          intent: 'ask',
          success: {
            text: t('“여름이요.” 이슬이 번호표를 손톱으로 긁는다. “열두 살 때.”', '“A summer.” Iseul scratches at the tag with a fingernail. “When I was twelve.”'),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 1 }],
            goto: 'summer',
          },
        },
        {
          label: t('관자놀이 자국을 살핀다', 'Look at the marks on her temple'),
          intent: 'ask',
          requires: { background: 'medic' },
          approval: { su_ah: 2, tae_o: 1 },
          success: {
            text: t(
              '소녀가 피하지 않는다. 추출 화상, 둘 다 덜 아물었다. 연고를 바르며 말해 준다. 한 번 더 뽑으면 다음엔 이름부터 빠진다고. 이슬이 처음으로 당신을 본다. “…그건 몰랐어요.”',
              'She doesn’t pull away. Extraction burns, both still raw. You dab ointment on them and tell her: one more pull, and the next thing to go is her own name. For the first time Iseul looks at you. “…I didn’t know that.”',
            ),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 1 }],
            goto: 'summer',
          },
        },
        {
          label: t('일어선다', 'Get up'),
          intent: 'leave',
          success: { text: t('“네.” 그게 대답의 전부다.', '“Okay.” That is the whole reply.') },
        },
      ],
    },
    summer: {
      speaker: 'iseul',
      text: t(
        '“엄마 빚이 이자까지 300이에요. 여름이 제일 비싸게 팔린대서 그거 팔았어요.” 이슬이 무릎을 내려다본다. “뭐였는지는 몰라요. 뽑으면 모르게 돼요. 좋은 거였대요. 값이 잘 나왔으니까.”',
        '“Mom owes three hundred with interest. They said summers sell highest, so I sold that.” Iseul looks down at her knees. “I don’t know what it was. Once it’s pulled, you don’t. It was a good one, they said. It got a good price.”',
      ),
      options: [
        {
          label: t('“되찾아 줄게.”', '“I’ll get it back for you.”'),
          intent: 'offer',
          approval: { su_ah: 1, tae_o: 1 },
          success: {
            text: t(
              '“되찾으면 또 팔아야 돼요.” 이슬이 잠깐 입을 다문다. “…장부엔 다 적혀 있대요. 누가 뭘 샀는지. 뒤쪽 냉장실에 있어요. 저는 거기 못 들어가요.”',
              '“If I get it back, I’ll just have to sell it again.” She goes quiet for a moment. “…The ledger has everything, they say. Who bought what. It’s in the cold room out back. I’m not allowed in there.”',
            ),
          },
        },
        {
          label: t('낙찰받은 칩을 건넨다', 'Hand her the chip you won'),
          intent: 'offer',
          requires: { flag: 'bought_summer' },
          approval: { su_ah: 3, tae_o: 1 },
          success: {
            text: t(
              '이슬이 칩을 받아 든다. 꽂지는 않는다. 한참 손바닥에 올려만 둔다. “…빚 다 갚고 나서요.” 그러고는 주머니에서 접힌 종이를 꺼낸다. “출품자는 장부 사본을 받아요. 제 몫이에요. 저한텐 필요 없어요.” 맨 끝 줄에 연필 메모. ‘먹이 줄 때 목 아래 판이 열림. 3초.’',
              'Iseul takes the chip. She doesn’t plug it in; she just holds it on her palm for a long time. “…After the debt’s paid.” Then she pulls a folded paper from her pocket. “Sellers get a copy of the ledger. This is mine. I don’t need it.” On the last line, in pencil: ‘When it feeds, the plate under its throat opens. Three seconds.’',
            ),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 2 }],
          },
        },
        {
          label: t('빚 일부를 대신 갚아 준다', 'Pay part of the debt'),
          intent: 'offer',
          requires: { minCredits: 25 },
          approval: { tae_o: 2, lin_yue: 1 },
          success: {
            text: t(
              '이슬이 칩을 받아 센다. 두 번. “고마워요.” 목소리는 여전히 평평하다. “근데 다음 달에도 이자 나와요.” 그래도 그녀는 손목의 번호표를 풀어 바닥에 내려놓는다.',
              'Iseul counts the chip. Twice. “Thanks.” Her voice is still flat. “There’s interest again next month, though.” Still, she unbuckles the tag from her wrist and sets it on the floor.',
            ),
            effects: [{ kind: 'credits', amount: -25 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“잘 지내.”', '“Take care.”'),
          intent: 'leave',
          success: { text: t('“네.” 이슬은 다시 무릎을 본다.', '“Okay.” Iseul goes back to looking at her knees.') },
        },
      ],
    },
  },
}

const DO: DialogueDef = {
  id: 'd2m_do',
  npc: 'collector_do',
  start: 'box',
  nodes: {
    box: {
      speaker: 'collector_do',
      text: t(
        '유리 칸막이 안. 하얀 장갑을 낀 노신사가 칩 하나를 핀셋으로 집어 불빛에 비춘다. 테이블 위 칩마다 손글씨 라벨. ‘일곱 살, 운동회.’ ‘아홉 살, 첫 자전거.’ 그가 의자를 권한다. “앉으세요. 저는 어린 시절만 사요. 제 건 없거든요.”',
        'Inside the glass box, an old gentleman in white gloves lifts a chip with tweezers and holds it to the light. Every chip on his table has a handwritten label. ‘Age seven, sports day.’ ‘Age nine, first bicycle.’ He offers you a chair. “Sit. I only buy childhoods. I don’t have one of my own.”',
      ),
      options: [
        {
          label: t('“왜 하필 어린 시절이에요?”', '“Why childhoods?”'),
          intent: 'ask',
          success: { text: t('그가 칩을 벨벳에 눕힌다. 아기를 내려놓듯이.', 'He lays the chip on velvet, the way you’d lay down a baby.'), goto: 'why' },
        },
        {
          label: t('테이블 위 칩 하나를 슬쩍한다', 'Palm a chip off the table'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 13 },
          assist: 'se_rin',
          approval: { se_rin: 2 },
          success: {
            text: t(
              '그가 핀셋을 내려놓는 사이, ‘열 살, 태권도 승급 심사’가 당신 소매 속으로 사라진다. 모르는 아이의 발차기가 손끝까지 저릿하게 남는다.',
              'While he sets down the tweezers, ‘Age ten, taekwondo grading’ vanishes up your sleeve. A stranger’s childhood kick tingles all the way into your fingertips.',
            ),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t(
              '“그건 제 거예요.” 목소리는 여전히 부드럽다. 칸막이 밖의 경호원이 당신 손목을 비튼다. 뼈가 삐걱거린다.',
              '“That’s mine.” His voice stays soft. The bodyguard outside the box twists your wrist. The bones creak.',
            ),
            effects: [{ kind: 'hp', amount: -5 }, { kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('단속국 배지를 유리에 대고 민다', 'Press your old Enforcement badge to the glass'),
          intent: 'intimidate',
          requires: { background: 'enforcer' },
          approval: { tae_o: 2, se_rin: -1 },
          success: {
            text: t(
              '“미성년자 기억 매입. 몇 건입니까.” 노신사의 장갑 낀 손이 떨린다. 반납한 배지라는 걸 그는 묻지 않는다. 서류철 하나가 테이블을 건너온다. 구매자 사본 장부. 맨 끝 장에 이름 없는 구매자. ‘미낙찰분 전량. 납품처: 7번 배수 터널.’ 연필 메모. ‘먹이 줄 때 목 아래 판이 열림. 3초.’',
              '“Purchases of minors’ memories. How many?” The old man’s gloved hand trembles. He doesn’t ask whether the badge was handed back. A folder slides across the table: the buyers’ copy of the ledger. On the last page, a nameless buyer: ‘All unsold lots. Deliver to: Drain Tunnel 7.’ In pencil: ‘When it feeds, the plate under its throat opens. Three seconds.’',
            ),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 2 }],
          },
        },
        {
          label: t('자리를 뜬다', 'Leave the box'),
          intent: 'leave',
          success: { text: t('“다음엔 파실 거 가지고 오세요.” 그가 다시 핀셋을 든다.', '“Next time, bring something to sell.” He picks up the tweezers again.') },
        },
      ],
    },
    why: {
      speaker: 'collector_do',
      text: t(
        '“보육원 3동에서 일련번호로 컸어요. 생일도 IX가 정해 줬고요.” 그가 칩 하나를 관자놀이 가까이 들어 본다. 꽂지는 않는다. “밤마다 하나씩 꽂아요. 한 시간 동안은 저한테도 엄마가 있어요. …41번, 열두 살 여름. 그 나이가 제일 좋아요.”',
        '“I grew up as a serial number in Nursery Block 3. IX picked my birthday, too.” He raises a chip toward his temple, but doesn’t plug it in. “I plug in one a night. For an hour, I have a mother too. …Lot forty-one, a summer at twelve. That’s the best age.”',
      ),
      options: [
        {
          label: t('“그 여름 주인은 아직 저기 앉아 있어요.”', '“The girl that summer belongs to is still sitting out there.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          approval: { su_ah: 2, tae_o: 1 },
          success: {
            text: t(
              '노신사가 오래 출품자석 쪽을 본다. “…여름은 못 돌려드려요. 그건 이미 제 거예요.” 대신 서류철 하나를 민다. “이건 가져가요. 구매자 사본. 누가 누구 어린 시절을 샀는지 다 있어요.” 맨 끝 장, 이름 없는 구매자. ‘납품처: 7번 배수 터널.’ 연필 메모. ‘먹이 줄 때 목 아래 판이 열림. 3초.’',
              'The old man looks toward the sellers’ bench for a long time. “…I can’t give the summer back. It’s already mine.” Instead he slides a folder over. “Take this. The buyers’ copy. Whose childhood went to whom, all of it.” On the last page, a nameless buyer: ‘Deliver to: Drain Tunnel 7.’ In pencil: ‘When it feeds, the plate under its throat opens. Three seconds.’',
            ),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 2 }],
          },
          failure: {
            text: t('“그 애는 돈이 필요하고, 저는 여름이 필요해요. 누가 손해예요?” 그가 장갑 낀 손으로 칸막이 문을 가리킨다.', '“She needs money and I need a summer. Who loses?” He points to the door with a gloved hand.'),
          },
        },
        {
          label: t('카이가 자기 꿈 이야기를 꺼낸다', 'Kai tells him his dream'),
          intent: 'offer',
          requires: { companion: 'kai' },
          approval: { kai: 2 },
          success: {
            text: t(
              '“저는 어린 시절이 없어요. 꿈만 하나 있어요.” 카이가 말한다. 노란 우산, 불 꺼진 횡단보도, 이름을 붙여 준 아이. 노신사가 핀셋을 내려놓는다. 한참 뒤 장갑을 벗고, 맨손으로 카이의 손을 잡는다. “…값을 못 매기겠네요.” 그가 진열장에서 작은 상자 하나를 꺼내 준다.',
              '“I don’t have a childhood. I have one dream,” Kai says. A yellow umbrella, a dead crosswalk, a child who gave him a name. The old man sets down his tweezers. After a long while he takes off a glove and holds Kai’s hand, bare. “…I can’t put a price on that.” He takes a small box from his case and hands it over.',
            ),
            effects: [{ kind: 'consumable' }],
          },
        },
        {
          label: t('일어선다', 'Stand up'),
          intent: 'leave',
          success: { text: t('“좋은 밤 되세요.” 그가 칩을 관자놀이에 꽂는다. 눈을 감는다. 웃는다.', '“Good night.” He plugs the chip into his temple. Closes his eyes. Smiles.') },
        },
      ],
    },
  },
}

const COLD_ROOM: DialogueDef = {
  id: 'd2m_cold_room',
  start: 'drawers',
  nodes: {
    drawers: {
      text: t(
        '경매장 바지선 아래층. 냉기가 발목을 문다. 서랍마다 낙찰된 칩이 성에를 뒤집어쓴 채 실려 나갈 차례를 기다린다. 벽에 박힌 철제 함 하나, 세 자리 다이얼 자물쇠. 계단 위에서 경비 둘이 담배 한 개비를 나눠 피운다.',
        'The lower deck of the auction barge. The cold bites at your ankles. In every drawer, sold chips furred with frost wait to be shipped out. One steel box bolted to the wall, a three-digit dial lock. At the top of the stairs, two guards are sharing a cigarette.',
      ),
      options: [
        {
          label: t('다이얼을 돌린다', 'Work the dial'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 14 },
          assist: 'se_rin',
          approval: { se_rin: 1 },
          success: {
            text: t(
              '딸깍. 세 번째 숫자에서 함이 열린다. 경매 장부. 누가 무엇을 얼마에 샀는지. 맨 끝 장에 이름 없는 구매자 한 줄. ‘미낙찰분 전량. 납품처: 7번 배수 터널.’ 그 아래 연필 메모. ‘먹이 줄 때 목 아래 판이 열림. 3초.’',
              'Click. The box opens on the third number. The auction ledger: who bought what, for how much. On the last page, one nameless buyer: ‘All unsold lots. Deliver to: Drain Tunnel 7.’ Beneath it, in pencil: ‘When it feeds, the plate under its throat opens. Three seconds.’',
            ),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 2 }],
          },
          failure: {
            text: t('얼어붙은 다이얼이 끽 소리를 낸다. 담배 불빛 두 개가 동시에 이쪽으로 돈다. “누구야!”', 'The frozen dial squeals. Two cigarette tips turn your way at once. “Who’s there!”'),
            effects: [{ kind: 'combat', encounterId: 'a2_event_ambush' }],
          },
        },
        {
          label: t('순찰표에 적힌 교대 시간을 기다린다', 'Wait for the shift change on the patrol sheet'),
          intent: 'sneak',
          requires: { quest: { id: 'q_schedule', stage: 2 } },
          approval: { se_rin: 1 },
          success: {
            text: t(
              '구 여사의 순찰표에 이 바지선 경비도 적혀 있다. 단속국이 부업으로 빌려준 사람들. 교대는 02시 10분. 담배 불빛이 계단 위로 사라진 사이, 함의 경첩을 통째로 뽑는다. 장부 맨 끝 장. ‘미낙찰분 전량. 납품처: 7번 배수 터널.’ 연필 메모. ‘먹이 줄 때 목 아래 판이 열림. 3초.’',
              'Madam Ku’s patrol sheet lists this barge’s guards too: Enforcement men moonlighting. Shift change at 02:10. While the cigarette tips disappear up the stairs, you pull the box’s hinges clean out. The ledger’s last page: ‘All unsold lots. Deliver to: Drain Tunnel 7.’ In pencil: ‘When it feeds, the plate under its throat opens. Three seconds.’',
            ),
            effects: [{ kind: 'quest', id: 'q_sold_summer', stage: 2 }],
          },
        },
        {
          label: t('서랍을 뒤진다', 'Search the drawers'),
          intent: 'insight',
          check: { stat: 'int', dc: 12 },
          assist: 'su_ah',
          approval: { su_ah: 1 },
          success: {
            text: t(
              '송장이 붙지 않은 칩 하나. 아무도 입찰하지 않은 기억이다. 손바닥 체온에 성에가 녹자, 모르는 사람의 손놀림 하나가 손끝으로 건너온다. 오래 연습한 동작이다.',
              'One chip with no invoice: a memory nobody bid on. As the frost melts in your palm, a stranger’s practised movement passes into your fingertips.',
            ),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('서랍이 얼어붙어 있다. 억지로 당기다 손가락 끝이 하얗게 언다.', 'The drawers are frozen shut. You yank at one and your fingertips go white with frostbite.'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('계단을 올라간다', 'Head back up'),
          intent: 'leave',
          success: { text: t('등 뒤에서 서랍 하나가 저절로 덜컹 닫힌다. 냉각기 소리만 남는다.', 'Behind you, a drawer bangs shut on its own. Only the hum of the chillers remains.') },
        },
      ],
    },
  },
}

export const D2_MEMORY_AUCTION_DIALOGUES: DialogueDef[] = [PALLE, ISEUL, DO, COLD_ROOM]

export const D2_MEMORY_AUCTION_NPCS: NpcDef[] = [
  { id: 'auctioneer_palle', name: t('팔레', 'Palle'), role: t('기억 경매장의 경매사', 'Auctioneer of the Memory Auction') },
  { id: 'iseul', name: t('이슬', 'Iseul'), role: t('빚 때문에 자기 기억을 파는 소녀', 'A girl selling her own memories to pay a debt') },
  { id: 'collector_do', name: t('도 선생', 'Mr. Do'), role: t('어린 시절만 사는 수집가', 'A collector who only buys childhoods') },
]
