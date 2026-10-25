// Signal+ party banter (plan C7): the two deployed companions trade a few lines on the map between nodes. UI-only
// flavour (never in RunState): ui/shell/MapBanter.tsx picks one per map arrival, deterministically from the run.
// Voices follow src/mythos_v2/talk.py personas: Se-rin short and blunt, Tae-o clipped '~다.', Han slangy and cocky,
// Su-ah warm, Kai polite and wondering (해요체), Lin Yue smooth and transactional.
import type { ActId, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export interface BanterDef {
  id: string
  /** Both must be deployed. The first speaks first. */
  pair: [string, string]
  /** Acts it may play in (default: any). */
  acts?: ActId[]
  lines: { who: string; text: Text }[]
}

export const BANTER: BanterDef[] = [
  {
    id: 'b_serin_taeo_rain',
    pair: ['se_rin', 'tae_o'],
    lines: [
      { who: 'se_rin', text: t('너 걸을 때 발소리 안 나는 거, 그거 단속국에서 배운 거지.', 'You walk without a sound. Enforcement taught you that.') },
      { who: 'tae_o', text: t('그렇다.', 'It did.') },
      { who: 'se_rin', text: t('…기분 나빠. 계속 그렇게 해.', '…Creepy. Keep doing it.') },
    ],
  },
  {
    id: 'b_serin_taeo_debt',
    pair: ['tae_o', 'se_rin'],
    acts: [2, 3],
    lines: [
      { who: 'tae_o', text: t('네 배에서 압수한 화물. 내가 서명했다.', 'The cargo seized off your boat. I signed for it.') },
      { who: 'se_rin', text: t('알아. 그래서 너 앞에 세우는 거야. 총 맞을 거면 네가 먼저 맞아.', 'I know. That’s why you walk in front. If anyone gets shot, it’s you first.') },
    ],
  },
  {
    id: 'b_serin_han_signal',
    pair: ['han', 'se_rin'],
    lines: [
      { who: 'han', text: t('야, 저 감시탑 내가 삼 초면 끈다. 진짜로.', 'Yo, I can kill that watchtower in three seconds. For real.') },
      { who: 'se_rin', text: t('끄지 마. 꺼지면 오는 놈들이 더 귀찮아.', 'Don’t. When it goes dark, the ones who come check are worse.') },
      { who: 'han', text: t('…쳇, 맞는 말이라 더 짜증 나네.', '…Ugh. Annoying because you’re right.') },
    ],
  },
  {
    id: 'b_serin_suah_hands',
    pair: ['su_ah', 'se_rin'],
    lines: [
      { who: 'su_ah', text: t('손 좀 줘 봐. 또 손등 다 까졌잖아.', 'Give me your hand. You’ve scraped it raw again.') },
      { who: 'se_rin', text: t('괜찮아.', 'It’s fine.') },
      { who: 'su_ah', text: t('괜찮은지는 내가 정해.', 'I decide what’s fine.') },
    ],
  },
  {
    id: 'b_serin_kai_umbrella',
    pair: ['kai', 'se_rin'],
    lines: [
      { who: 'kai', text: t('세린 씨는 비 올 때 왜 우산을 안 써요?', 'Se-rin, why don’t you use an umbrella in the rain?') },
      { who: 'se_rin', text: t('두 손 다 비어 있어야 도망가지.', 'Need both hands free to run.') },
      { who: 'kai', text: t('그럼 제가 들어 드릴게요. 저는 안 도망가니까요.', 'Then I’ll hold one for you. I don’t run.') },
    ],
  },
  {
    id: 'b_serin_linyue_price',
    pair: ['lin_yue', 'se_rin'],
    lines: [
      { who: 'lin_yue', text: t('물거미, 너 요즘 시세 알아? 네 목에 걸린 현상금 말이야.', 'Water Spider, know your going rate these days? The bounty on your head, I mean.') },
      { who: 'se_rin', text: t('팔 생각이면 지금 말해.', 'If you’re selling, say so now.') },
      { who: 'lin_yue', text: t('아직은 들고 있는 게 이득이야. 아직은.', 'Still worth more to hold. For now.') },
    ],
  },
  {
    id: 'b_taeo_han_orders',
    pair: ['han', 'tae_o'],
    lines: [
      { who: 'han', text: t('너는 명령 없으면 뭐 해? 그냥 서 있어?', 'What do you even do without orders? Just stand there?') },
      { who: 'tae_o', text: t('고른다.', 'I choose.') },
      { who: 'han', text: t('…오. 생각보다 멋있는 대답이네.', '…Oh. Cooler answer than I expected.') },
    ],
  },
  {
    id: 'b_taeo_suah_quiet',
    pair: ['su_ah', 'tae_o'],
    lines: [
      { who: 'su_ah', text: t('태오, 넌 밤에 잠은 자?', 'Tae-o, do you ever sleep at night?') },
      { who: 'tae_o', text: t('잔다. 짧게.', 'I do. Briefly.') },
      { who: 'su_ah', text: t('다음 은신처에선 내가 먼저 깨어 있을게. 넌 길게 자.', 'Next safehouse, I’ll take first watch. You sleep long.') },
    ],
  },
  {
    id: 'b_taeo_kai_scan',
    pair: ['kai', 'tae_o'],
    lines: [
      { who: 'kai', text: t('태오 씨는 저를 폐기하라는 명령, 받아 본 적 있어요?', 'Tae-o, were you ever ordered to dispose of something like me?') },
      { who: 'tae_o', text: t('있다. 따랐다.', 'I was. I obeyed.') },
      { who: 'kai', text: t('…지금은요?', '…And now?') },
      { who: 'tae_o', text: t('지금은 네 뒤를 본다.', 'Now I watch your back.') },
    ],
  },
  {
    id: 'b_taeo_linyue_ledger',
    pair: ['lin_yue', 'tae_o'],
    lines: [
      { who: 'lin_yue', text: t('집행관 나리, 장부에 적힌 이름 지워 본 적 있어?', 'Mister Enforcer, ever crossed a name out of a ledger?') },
      { who: 'tae_o', text: t('많다.', 'Many.') },
      { who: 'lin_yue', text: t('난 다시 써 넣는 쪽이야. 우리 합치면 본전이네.', 'I write them back in. Together we break even.') },
    ],
  },
  {
    id: 'b_han_suah_forge',
    pair: ['han', 'su_ah'],
    lines: [
      { who: 'han', text: t('수아, 너 망치질 소리 무슨 주파수 같아. 녹음해도 돼?', 'Su-ah, your hammering sounds like a frequency. Can I record it?') },
      { who: 'su_ah', text: t('녹음하지 말고 그냥 들어. 그게 더 오래 남아.', 'Don’t record it. Just listen. It stays longer that way.') },
    ],
  },
  {
    id: 'b_han_kai_dream',
    pair: ['han', 'kai'],
    lines: [
      { who: 'han', text: t('카이, 너 꿈꿀 때 로그 남아? 나 그거 보고 싶어.', 'Kai, do your dreams leave logs? I wanna see them.') },
      { who: 'kai', text: t('남지 않아요. 그래서 꿈인가 봐요.', 'They don’t. Maybe that’s what makes them dreams.') },
      { who: 'han', text: t('…와. 그 말 좀 쩐다.', '…Whoa. That’s kind of deep.') },
    ],
  },
  {
    id: 'b_han_linyue_deal',
    pair: ['lin_yue', 'han'],
    lines: [
      { who: 'lin_yue', text: t('꼬마 해커, 너 그 실력이면 야시장에서 한 달에 얼마 버는 줄 알아?', 'Little hacker, know how much you’d make a month in the market with those hands?') },
      { who: 'han', text: t('몰라. 근데 IX 망가뜨리는 건 공짜로 해 줄 수 있어.', 'Dunno. But I’d break IX for free.') },
      { who: 'lin_yue', text: t('공짜가 제일 비싼 거야. 기억해 둬.', 'Free is the most expensive price there is. Remember that.') },
    ],
  },
  {
    id: 'b_suah_kai_warm',
    pair: ['su_ah', 'kai'],
    lines: [
      { who: 'su_ah', text: t('카이, 손 차갑지? 이리 와, 화로 옆에.', 'Kai, your hands are cold, aren’t they? Come here, by the brazier.') },
      { who: 'kai', text: t('저는 차가워도 괜찮은데… 그래도 갈게요.', 'I’m fine cold… but I’ll come anyway.') },
    ],
  },
  {
    id: 'b_suah_linyue_memory',
    pair: ['lin_yue', 'su_ah'],
    acts: [2, 3],
    lines: [
      { who: 'lin_yue', text: t('수아, 기억 한 조각에 요즘 얼마 쳐주는지 알아?', 'Su-ah, know what a memory goes for these days?') },
      { who: 'su_ah', text: t('알아. 그래서 안 팔아.', 'I do. That’s why I don’t sell.') },
      { who: 'lin_yue', text: t('…그래. 그런 사람이 하나쯤은 있어야지.', '…Fair. Someone has to be that person.') },
    ],
  },
  {
    id: 'b_kai_linyue_value',
    pair: ['kai', 'lin_yue'],
    lines: [
      { who: 'kai', text: t('린위에 씨, 저는 얼마예요?', 'Lin Yue, how much am I worth?') },
      { who: 'lin_yue', text: t('고철값이면 칠십 크레딧. 근데 너는 비매품이야.', 'As scrap, seventy credits. But you’re not for sale.') },
      { who: 'kai', text: t('비매품… 좋은 말이네요.', 'Not for sale… I like that.') },
    ],
  },
]

/** Banter the two deployed companions can have in this act. */
export function banterFor(party: readonly string[], act: ActId): BanterDef[] {
  if (party.length < 2) return []
  const [a, b] = party
  return BANTER.filter((x) => ((x.pair[0] === a && x.pair[1] === b) || (x.pair[0] === b && x.pair[1] === a)) && (!x.acts || x.acts.includes(act)))
}

/** Act 1 solo-companion <-> Connector exchanges so the map feels alive even before a second companion joins. */
export const SOLO_BANTER: BanterDef[] = [
  {
    id: 'b_solo_serin_signal',
    pair: ['se_rin', 'connector'],
    lines: [
      { who: 'se_rin', text: t('잠깐, 귀에 대 봐. 이 구역 중계기… 방금 네 이름을 흘렸어.', 'Hold up, listen. That relay tower just leaked your callsign.') },
      { who: 'connector', text: t('IX가 벌써 주파수를 역추적하고 있군.', 'IX is already back-tracing our frequency.') },
      { who: 'se_rin', text: t('쫄지 마. 내가 뒷골목 우회로 다 외워 놨으니까.', 'Don’t sweat it. I know every back-alley bypass in this sector.') },
    ],
  },
  {
    id: 'b_solo_serin_neon',
    pair: ['se_rin', 'connector'],
    lines: [
      { who: 'se_rin', text: t('저기 네온 간판 깜빡이는 박자 보여? 순찰 드론 교대 신호야.', 'See the rhythm on that flickering neon sign? Patrol drone shift change.') },
      { who: 'connector', text: t('타이밍 맞춰서 치고 빠지면 되겠어.', 'Then we strike right on the beat and slip through.') },
    ],
  },
  {
    id: 'b_solo_taeo_watch',
    pair: ['tae_o', 'connector'],
    lines: [
      { who: 'tae_o', text: t('전방 삼십 미터. 단속국 검문소 잔해다.', 'Thirty meters ahead. Wreckage of an Enforcement checkpoint.') },
      { who: 'connector', text: t('익숙한 풍경이겠군, 태오.', 'Must be a familiar sight for you, Tae-o.') },
      { who: 'tae_o', text: t('과거형이다. 지금은 네 신호만 따른다.', 'Past tense. Now I follow your signal alone.') },
    ],
  },
  {
    id: 'b_solo_han_ping',
    pair: ['han', 'connector'],
    lines: [
      { who: 'han', text: t('야야, 방금 내 덱에 이상한 에코 패킷이 스쳤는데? 이거 지난 루프 거 아냐?', 'Yo, a weird echo packet just grazed my deck. Isn’t this from last loop?') },
      { who: 'connector', text: t('잡음에 한눈팔지 마. 사거리 안에 적기가 있어.', 'Don’t get distracted by static. Hostiles are in range.') },
      { who: 'han', text: t('알았다고~ 그래도 로그는 따 놓을 거야!', 'Yeah, yeah~ Still saving the log though!') },
    ],
  },
  {
    id: 'b_solo_suah_breath',
    pair: ['su_ah', 'connector'],
    lines: [
      { who: 'su_ah', text: t('호흡이 조금 빨라졌어. 접속 부하가 올라오나 봐.', 'Your breathing’s quicker. The neural link load must be climbing.') },
      { who: 'connector', text: t('아직 버틸 만해. 다음 교차로까진 문제없어.', 'Still manageable. I can hold until the next junction.') },
      { who: 'su_ah', text: t('무리하진 마. 네가 흔들리면 신호도 흔들리니까.', 'Don’t push too hard. If you waver, the signal wavers with you.') },
    ],
  },
  {
    id: 'b_solo_kai_rain',
    pair: ['kai', 'connector'],
    lines: [
      { who: 'kai', text: t('접속자님, 빗소리가 매 루프마다 조금씩 다른 것 같아요.', 'Connector, I think the rain sounds a little different every loop.') },
      { who: 'connector', text: t('네 감각 센서가 점점 사람처럼 변하고 있나 보네.', 'Maybe your sensory array is growing more human, Kai.') },
    ],
  },
  {
    id: 'b_solo_linyue_odds',
    pair: ['lin_yue', 'connector'],
    lines: [
      { who: 'lin_yue', text: t('이번 판 배당률이 꽤 높게 잡혔어. 살아남기만 하면 대박이야.', 'The odds on this run are stacked high. Survive, and we cash in big.') },
      { who: 'connector', text: t('수수료 계산은 이 구역을 뚫고 나서 해.', 'Save the commission math until after we breach this sector.') },
    ],
  },
]

export function soloBanterFor(companionId: string, act: ActId): BanterDef[] {
  return SOLO_BANTER.filter((x) => x.pair[0] === companionId && (!x.acts || x.acts.includes(act)))
}

