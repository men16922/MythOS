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
  // ---------------------------------------------------------------- R7d new companions (Se-rin meets each)
  {
    id: 'b_serin_io_overdue',
    pair: ['se_rin', 'io'],
    lines: [
      { who: 'se_rin', text: t('너 계속 나 쳐다보는 거, 그거 뭐야.', 'Why do you keep looking at me?') },
      { who: 'io', text: t('대출 기록을 대조 중입니다. 당신은 세 번째 루프에서 반납되지 않았습니다.', 'Cross-checking loan records. You were not returned in the third loop.') },
      { who: 'se_rin', text: t('…그럼 지금 반납된 거네.', '…Then I’m returned now.') },
    ],
  },
  {
    id: 'b_serin_miro_name',
    pair: ['se_rin', 'miro'],
    lines: [
      { who: 'se_rin', text: t('야, 너. 이름이 뭐였지.', 'Hey, you. What was your name?') },
      { who: 'miro', text: t('미로. 벌써 네 번째 물어봤어.', 'Miro. That’s the fourth time you’ve asked.') },
      { who: 'se_rin', text: t('다섯 번째는 안 물어볼게. 약속.', 'There won’t be a fifth. Promise.') },
    ],
  },
  {
    id: 'b_serin_doyun_stand',
    pair: ['se_rin', 'doyun'],
    lines: [
      { who: 'se_rin', text: t('앞에 서지 마. 맞는 건 내 일이야.', 'Don’t stand in front. Taking hits is my job.') },
      { who: 'doyun', text: t('그럼 반씩 해요. 저도 서 있는 건 잘해요.', 'Then let’s split it. I’m good at standing too.') },
    ],
  },
  {
    id: 'b_serin_bel_redpen',
    pair: ['se_rin', 'bel'],
    lines: [
      { who: 'se_rin', text: t('검열관이었다며. 내 기록도 잘랐어?', 'You were a censor. Did you cut my record too?') },
      { who: 'bel', text: t('네 건 너무 길어서 반려했어. 지금 생각하면 잘한 거지.', 'Yours ran too long, so I sent it back. Good call, in hindsight.') },
      { who: 'se_rin', text: t('…칭찬으로 들을게.', '…I’ll take that as a compliment.') },
    ],
  },
  {
    id: 'b_serin_rem_sleep',
    pair: ['se_rin', 'rem'],
    lines: [
      { who: 'se_rin', text: t('너 잠은 자냐.', 'Do you even sleep?') },
      { who: 'rem', text: t('아니요. 대신 당신이 잘 때 깨어 있을게요.', 'No. I’ll stay awake while you do instead.') },
      { who: 'se_rin', text: t('그게 제일 무서운 말인 거 알지.', 'You know that’s the scariest thing you could say.') },
    ],
  },
  {
    id: 'b_serin_mujin_shift',
    pair: ['se_rin', 'mujin'],
    lines: [
      { who: 'se_rin', text: t('배도 없는데 왜 교대를 서?', 'No ships. Why stand the shift?') },
      { who: 'mujin', text: t('오면 어쩌려고.', 'What if one comes.') },
      { who: 'se_rin', text: t('…그건 또 그렇네.', '…Fair enough.') },
    ],
  },
  {
    id: 'b_serin_seoha_water',
    pair: ['se_rin', 'seo_ha'],
    lines: [
      { who: 'se_rin', text: t('물거미라는 별명, 여기선 좀 민망하네.', 'Water Spider sounds a bit silly down here.') },
      { who: 'seo_ha', text: t('괜찮아요. 물은 그런 거 안 따져요.', 'It’s fine. Water doesn’t check names.') },
    ],
  },
  {
    id: 'b_serin_parang_name',
    pair: ['se_rin', 'parang'],
    lines: [
      { who: 'se_rin', text: t('너 몇 살이야?', 'How old are you?') },
      { who: 'parang', text: t('어제는 일흔이었어. 오늘은 몰라.', 'Seventy yesterday. Don’t know today.') },
      { who: 'se_rin', text: t('…밥부터 먹자.', '…Let’s eat first.') },
    ],
  },
  // 2026-11-04: the Sea companions with each other (a Sea party is often two of them), and the DLC companions with
  // someone other than Se-rin. Voices: Mujin clipped 반말 · Seo-ha calm 해요체 · Parang short, says its own name ·
  // Io 하십시오체 · Miro whispered 반말 · Doyun earnest 해요체 · Bel clipped, editor's jargon · Rem sleepy 해요체.
  {
    id: 'b_mujin_seoha_tide',
    pair: ['mujin', 'seo_ha'],
    lines: [
      { who: 'mujin', text: t('물때 맞아?', 'Tide right?') },
      { who: 'seo_ha', text: t('맞아요. 물은 없지만 시간은 맞아요.', 'It is. No water, but the time’s right.') },
      { who: 'mujin', text: t('그럼 됐어.', 'That’s enough, then.') },
    ],
  },
  {
    id: 'b_mujin_parang_count',
    pair: ['parang', 'mujin'],
    lines: [
      { who: 'parang', text: t('무진은 왜 넷까지만 세?', 'Why does Mujin only count to four?') },
      { who: 'mujin', text: t('다섯은 없어.', 'There’s no five.') },
      { who: 'parang', text: t('그럼 파랑이 넷 해도 돼?', 'Then can Parang be four?') },
      { who: 'mujin', text: t('…그래.', '…Yeah.') },
    ],
  },
  {
    id: 'b_seoha_parang_channel',
    pair: ['seo_ha', 'parang'],
    lines: [
      { who: 'seo_ha', text: t('이 길, 옛날엔 물길이었어요. 배가 여기로 들어왔죠.', 'This road used to be a channel. Ships came in this way.') },
      { who: 'parang', text: t('파랑 안에 그 배 탄 사람 기억 있어.', 'Parang has a memory of someone on that ship.') },
      { who: 'seo_ha', text: t('그럼 그 사람한테도 길 알려 줘요.', 'Then show them the way too.') },
    ],
  },
  {
    id: 'b_io_miro_card',
    pair: ['io', 'miro'],
    lines: [
      { who: 'io', text: t('미로. 반납 카드가 하나 늘었습니다.', 'Miro. You have one more return card.') },
      { who: 'miro', text: t('…세지 마. 세면 다 남의 거 같잖아.', '…Don’t count them. It makes them all feel like someone else’s.') },
      { who: 'io', text: t('기록에서 지우겠습니다. 이번 한 번만.', 'I will strike it from the record. This once.') },
    ],
  },
  {
    id: 'b_bel_io_margin',
    pair: ['bel', 'io'],
    lines: [
      { who: 'bel', text: t('그 기록, 군더더기 많아.', 'That record’s full of padding.') },
      { who: 'io', text: t('군더더기도 기록입니다.', 'Padding is also a record.') },
      { who: 'bel', text: t('…알아. 살려 둬.', '…I know. Stet.') },
    ],
  },
  {
    id: 'b_rem_kai_dream',
    pair: ['rem', 'kai'],
    lines: [
      { who: 'rem', text: t('어젯밤 꿈 끝까지 꿨어요?', 'Did you dream to the end last night?') },
      { who: 'kai', text: t('아뇨. 비가 그치기 전에 깼어요.', 'No. I woke before the rain stopped.') },
      { who: 'rem', text: t('오늘은 안 깨울게요. 끝까지 꿔요.', 'Tonight I won’t wake you. Dream it through.') },
    ],
  },
  {
    id: 'b_doyun_taeo_last',
    pair: ['doyun', 'tae_o'],
    lines: [
      { who: 'doyun', text: t('뒤에 아무도 안 남았어요. 세 번 셌어요.', 'Nobody’s left behind. I counted three times.') },
      { who: 'tae_o', text: t('나도 셌다. 네 번.', 'I counted too. Four times.') },
      { who: 'doyun', text: t('…그럼 확실하네요.', '…Then it’s certain.') },
    ],
  },
  {
    id: 'b_miro_doyun_name',
    pair: ['miro', 'doyun'],
    lines: [
      { who: 'miro', text: t('도윤. …도윤 맞지?', 'Doyun. …It is Doyun, right?') },
      { who: 'doyun', text: t('맞아요. 미로도 미로 맞죠?', 'That’s right. And you’re Miro, right?') },
      { who: 'miro', text: t('응. 오늘은 맞아.', 'Yeah. Today I am.') },
    ],
  },
  // 2026-11-05: six pairs that can share a party but had no exchange (Deep acts 4–6 and the Sea route).
  {
    id: 'b_io_kai_index',
    pair: ['io', 'kai'],
    acts: [4, 5, 6],
    lines: [
      { who: 'io', text: t('카이 님의 꿈은 서가 어디에도 청구 기호가 없습니다.', 'Your dream, Kai, has no shelf mark anywhere in the stacks.') },
      { who: 'kai', text: t('그럼 빌려 갈 수도 없겠네요.', 'Then nobody can borrow it.') },
      { who: 'io', text: t('예. 반납 기한도 없습니다.', 'Correct. Nor is it ever due back.') },
    ],
  },
  {
    id: 'b_han_io_plug',
    pair: ['io', 'han'],
    acts: [4, 5, 6],
    lines: [
      { who: 'io', text: t('한 님은 열람 단말에 한 번도 접속하지 않으셨습니다.', 'Han, you have not once connected to a reading terminal.') },
      { who: 'han', text: t('꽂으면 내 이름이 장부에 남거든.', 'Plug in and my name stays in the book.') },
      { who: 'io', text: t('기록하지 않겠습니다. 이번 한 번은.', 'I will not record it. This once.') },
      { who: 'han', text: t('그 말도 기록 안 할 거지?', 'And you won’t record that either, right?') },
    ],
  },
  {
    id: 'b_kai_parang_umbrella',
    pair: ['parang', 'kai'],
    acts: [4, 5, 6],
    lines: [
      { who: 'parang', text: t('노란 우산. 그거 나도 기억나.', 'A yellow umbrella. I remember it too.') },
      { who: 'kai', text: t('…정말요? 누구 기억으로요?', '…Really? Whose memory?') },
      { who: 'parang', text: t('몰라. 우산 아래 있던 사람 거.', 'Don’t know. Whoever was under it.') },
      { who: 'kai', text: t('그럼 우리 둘 다 빌려 쓰는 거네요.', 'Then we’re both borrowing it.') },
    ],
  },
  {
    id: 'b_taeo_mujin_shift',
    pair: ['mujin', 'tae_o'],
    acts: [4, 5, 6],
    lines: [
      { who: 'mujin', text: t('몇 시 교대냐.', 'What time’s your shift.') },
      { who: 'tae_o', text: t('없다. 부대가 해산됐다.', 'None. The unit was dissolved.') },
      { who: 'mujin', text: t('우리도 배가 끊겼지. 그래도 교대는 한다.', 'Our ships stopped too. We still change shifts.') },
      { who: 'tae_o', text: t('…자정에 서겠다.', '…I’ll take midnight.') },
    ],
  },
  {
    id: 'b_suah_seoha_hands',
    pair: ['su_ah', 'seo_ha'],
    acts: [4, 5, 6],
    lines: [
      { who: 'su_ah', text: t('손 떨리는 거, 언제부터야?', 'Your hands shake. Since when?') },
      { who: 'seo_ha', text: t('마지막 배를 들여보낸 날부터요. 키를 놓은 손이라.', 'Since the day I brought in the last ship. They let go of the wheel.') },
      { who: 'su_ah', text: t('그건 못 고쳐. 대신 쥐고 있을 걸 하나 벼려 줄게.', 'I can’t fix that. I’ll forge you something to hold instead.') },
      { who: 'seo_ha', text: t('그럼 키 손잡이 모양으로 부탁해요.', 'Then make it the shape of a ship’s wheel handle.') },
    ],
  },
  {
    id: 'b_linyue_parang_ledger',
    pair: ['lin_yue', 'parang'],
    acts: [4, 5, 6],
    lines: [
      { who: 'lin_yue', text: t('너, 나한테 빚진 거 있어?', 'Do you owe me anything?') },
      { who: 'parang', text: t('나는 없어. 이 기억 주인은 있을지도.', 'I don’t. Whoever this memory belongs to might.') },
      { who: 'lin_yue', text: t('남의 빚은 안 받아. 장부에 네 이름 칸만 비워 둘게.', 'I don’t collect other people’s debts. I’ll just leave a line for your name.') },
      { who: 'parang', text: t('빈칸 좋아. 거기 아무거나 써도 돼.', 'Good. Write anything there.') },
    ],
  },
  // 2026-11-05: Archive companions (Act 2 recruit pool) with the first six.
  {
    id: 'b_io_taeo_report',
    pair: ['io', 'tae_o'],
    lines: [
      { who: 'io', text: t('태오 님의 보고서에는 문장 하나가 빠져 있습니다.', 'Tae-o, your report is missing one sentence.') },
      { who: 'tae_o', text: t('안다.', 'I know.') },
      { who: 'io', text: t('빠진 자리는 색인에 빈칸으로 남겨 두겠습니다.', 'I will index the gap as a blank.') },
      { who: 'tae_o', text: t('그거면 된다.', 'That will do.') },
    ],
  },
  {
    id: 'b_miro_suah_name',
    pair: ['miro', 'su_ah'],
    lines: [
      { who: 'miro', text: t('…너 이름 뭐였지.', '…What was your name again.') },
      { who: 'su_ah', text: t('수아. 네 방어막 벼려 준 사람.', 'Su-ah. The one who forged your plating.') },
      { who: 'miro', text: t('이름은 까먹었는데 방어막은 기억나.', 'I forgot the name. I remember the plating.') },
      { who: 'su_ah', text: t('그럼 그걸로 됐어.', 'Then that’s enough.') },
    ],
  },
  {
    id: 'b_doyun_kai_count',
    pair: ['doyun', 'kai'],
    lines: [
      { who: 'doyun', text: t('카이 씨, 방금 몇 명 셌어요?', 'Kai, how many did you just count?') },
      { who: 'kai', text: t('다섯이요. 기계까지 치면 일곱.', 'Five. Seven if you count the machines.') },
      { who: 'doyun', text: t('저는 기계는 안 셌어요. 다음부턴 셀게요.', 'I didn’t count the machines. I will from now on.') },
    ],
  },
  {
    id: 'b_bel_linyue_ledger',
    pair: ['bel', 'lin_yue'],
    lines: [
      { who: 'bel', text: t('네 장부, 빨간 줄 그은 쪽이 제일 길더라.', 'Your ledger. The page struck in red is the longest.') },
      { who: 'lin_yue', text: t('지운 게 아니야. 못 받은 거야.', 'It isn’t erased. It’s unpaid.') },
      { who: 'bel', text: t('편집자 눈엔 같은 줄이야.', 'To an editor it’s the same line.') },
      { who: 'lin_yue', text: t('그래서 네가 편집자 그만둔 거잖아.', 'Which is why you quit being one.') },
    ],
  },
  {
    id: 'b_han_rem_sleep',
    pair: ['rem', 'han'],
    lines: [
      { who: 'rem', text: t('한 씨는 꽂지 않고도 자요?', 'Han, can you sleep without plugging in?') },
      { who: 'han', text: t('그게 원래 자는 거야.', 'That’s what sleeping is.') },
      { who: 'rem', text: t('그럼 오늘 밤엔 옆에서 보고 배울게요.', 'Then tonight I’ll watch and learn.') },
      { who: 'han', text: t('보고 있으면 못 자.', 'Nobody sleeps while they’re being watched.') },
    ],
  },
  {
    id: 'b_bel_kai_draft',
    pair: ['bel', 'kai'],
    lines: [
      { who: 'bel', text: t('네 꿈 말이야. 초고치고는 잘 썼어.', 'That dream of yours. Not bad for a first draft.') },
      { who: 'kai', text: t('고칠 데가 있어요?', 'Anything to fix?') },
      { who: 'bel', text: t('없어. 손대면 네 꿈이 아니게 돼.', 'No. Touch it and it stops being yours.') },
    ],
  },
  {
    id: 'b_taeo_miro_tracks',
    pair: ['tae_o', 'miro'],
    lines: [
      { who: 'tae_o', text: t('발자국을 안 남기는군.', 'You leave no tracks.') },
      { who: 'miro', text: t('…남기면 누가 따라와.', '…Leave them and someone follows.') },
      { who: 'tae_o', text: t('내가 따라가던 쪽이었다.', 'I used to be the one following.') },
      { who: 'miro', text: t('알아. 그래서 너 뒤로는 안 숨어.', 'I know. That’s why I never hide behind you.') },
    ],
  },
  {
    id: 'b_bel_taeo_report',
    pair: ['bel', 'tae_o'],
    lines: [
      { who: 'bel', text: t('네 사건 보고서 봤어. 한 줄 잘린 자리가 보이더라.', 'I read your incident report. I can see where a line was cut.') },
      { who: 'tae_o', text: t('되살릴 수 있나.', 'Can it be put back.') },
      { who: 'bel', text: t('내 펜으로는 안 돼. 네 입으로 다시 말해야 해.', 'Not with my pen. You have to say it again yourself.') },
      { who: 'tae_o', text: t('…알았다.', '…Understood.') },
    ],
  },
  {
    id: 'b_rem_suah_forge',
    pair: ['rem', 'su_ah'],
    lines: [
      { who: 'rem', text: t('수아 씨, 꿈도 벼릴 수 있어요?', 'Su-ah, can you forge a dream?') },
      { who: 'su_ah', text: t('꿈은 너무 물러. 두드리면 흩어져.', 'Dreams are too soft. Hammer one and it scatters.') },
      { who: 'rem', text: t('그럼 그냥 들고 다닐게요. 깨지지 않게.', 'Then I’ll just carry it. Gently.') },
    ],
  },
  {
    id: 'b_mujin_kai_lift',
    pair: ['mujin', 'kai'],
    acts: [4, 5, 6],
    lines: [
      { who: 'mujin', text: t('너 무게 얼마냐.', 'How much do you weigh.') },
      { who: 'kai', text: t('꽤 나가요. 왜요?', 'A fair bit. Why?') },
      { who: 'mujin', text: t('쓰러지면 내가 든다. 크레인 없이도 그 정도는 돼.', 'If you go down, I’ll lift you. I can manage that without a crane.') },
      { who: 'kai', text: t('…고마워요. 저도 그쪽 들 수 있어요.', '…Thank you. I can lift you too.') },
    ],
  },
  {
    id: 'b_seoha_han_unmapped',
    pair: ['seo_ha', 'han'],
    acts: [4, 5, 6],
    lines: [
      { who: 'seo_ha', text: t('한 씨는 지도 없이 다니죠?', 'You go about without a map, don’t you, Han?') },
      { who: 'han', text: t('지도에 꽂히면 나도 지도에 찍혀.', 'Plug into a map and you end up on it.') },
      { who: 'seo_ha', text: t('나도 물길은 머리로만 외웠어요. 배들이 그래서 날 믿었고요.', 'I only ever kept the channels in my head. That’s why the ships trusted me.') },
    ],
  },
  {
    id: 'b_io_linyue_loan',
    pair: ['io', 'lin_yue'],
    lines: [
      { who: 'io', text: t('린위에 님의 장부와 도서관 대출 대장은 형식이 같습니다.', 'Lin Yue, your ledger and the library’s loan register share a format.') },
      { who: 'lin_yue', text: t('다른 건 이자뿐이지.', 'Only difference is interest.') },
      { who: 'io', text: t('저희는 연체료를 받지 않습니다.', 'We charge no late fees.') },
      { who: 'lin_yue', text: t('그러니까 책이 안 돌아오지.', 'That’s why your books never come back.') },
    ],
  },
  {
    id: 'b_han_miro_unrecorded',
    pair: ['han', 'miro'],
    lines: [
      { who: 'han', text: t('사람들이 너를 금방 잊는다며. 나는 일부러 그렇게 사는데.', 'They say people forget you fast. I live like that on purpose.') },
      { who: 'miro', text: t('…너는 고른 거잖아.', '…You chose it.') },
      { who: 'han', text: t('그래. 그러니까 네 이름은 내가 외워 둘게.', 'Yeah. So I’ll be the one who keeps your name.') },
    ],
  },
  {
    id: 'b_suah_doyun_dent',
    pair: ['su_ah', 'doyun'],
    lines: [
      { who: 'su_ah', text: t('네 방어막, 앞보다 뒤가 더 찌그러졌어.', 'Your plating’s more dented on the back than the front.') },
      { who: 'doyun', text: t('자꾸 돌아봐서요. 누가 뒤처졌나 세느라.', 'I keep turning round. Counting who’s fallen behind.') },
      { who: 'su_ah', text: t('그럼 뒤를 두껍게 벼려 줄게.', 'Then I’ll forge the back thicker.') },
    ],
  },
  {
    id: 'b_io_suah_recast',
    pair: ['io', 'su_ah'],
    lines: [
      { who: 'io', text: t('수아 님이 벼리는 잔향 일부는 제 서가에 실패한 루프로 분류되어 있었습니다.', 'Su-ah, some of the Echoes you forge were once shelved with me as failed loops.') },
      { who: 'su_ah', text: t('그럼 네 책장으로 방어막 만드는 셈이네.', 'So I’m making plating out of your bookshelves.') },
      { who: 'io', text: t('대출 중으로 표시해 두겠습니다.', 'I will mark them as on loan.') },
    ],
  },
  {
    id: 'b_miro_kai_morning',
    pair: ['miro', 'kai'],
    lines: [
      { who: 'miro', text: t('…내 이름, 내일도 기억해?', '…Will you remember my name tomorrow?') },
      { who: 'kai', text: t('그럼 아침마다 한 번씩 불러 줄게요. 미로.', 'Then I’ll say it once every morning. Miro.') },
      { who: 'miro', text: t('…오늘 거 하나 더.', '…One more for today.') },
      { who: 'kai', text: t('미로.', 'Miro.') },
    ],
  },
  {
    id: 'b_linyue_doyun_price',
    pair: ['lin_yue', 'doyun'],
    lines: [
      { who: 'lin_yue', text: t('명단 맨 끝 줄이었다며. 너한테 매겨진 값이 얼마였어?', 'You were the list’s last line. What price did they put on you?') },
      { who: 'doyun', text: t('점수만 있었어요. 낮은 점수요.', 'Just a score. A low one.') },
      { who: 'lin_yue', text: t('점수는 값이 아니야. 넌 아무한테도 빚 없어. 계속 그렇게 해.', 'A score isn’t a price. You owe nobody. Keep it that way.') },
    ],
  },
  {
    id: 'b_bel_miro_cards',
    pair: ['bel', 'miro'],
    lines: [
      { who: 'bel', text: t('네 얼굴, 반납 카드잖아. 도장이 겹겹이야.', 'Your face is return cards. Stamp over stamp.') },
      { who: 'miro', text: t('…읽지 마.', '…Don’t read them.') },
      { who: 'bel', text: t('안 읽어. 남의 글 허락 없이 안 본 지 좀 됐어.', 'I won’t. I haven’t read anyone’s words without asking for a while now.') },
    ],
  },
  {
    id: 'b_rem_taeo_watch',
    pair: ['rem', 'tae_o'],
    lines: [
      { who: 'rem', text: t('태오 씨는 앉아서 자네요.', 'Tae-o, you sleep sitting up.') },
      { who: 'tae_o', text: t('습관이다. 경계 근무.', 'Habit. Watch duty.') },
      { who: 'rem', text: t('오늘은 제가 볼게요. 눕는 것도 배워 봐요.', 'I’ll watch tonight. Try learning to lie down.') },
      { who: 'tae_o', text: t('…한 시간만이다.', '…One hour.') },
    ],
  },
  {
    id: 'b_seoha_taeo_fog',
    pair: ['seo_ha', 'tae_o'],
    acts: [4, 5, 6],
    lines: [
      { who: 'seo_ha', text: t('안개 속에선 내 한 걸음 뒤에 있어요. 어깨에 얹은 내 손이 물길이에요.', 'In the fog, stay one step behind me. My hand on your shoulder is the channel.') },
      { who: 'tae_o', text: t('알겠다.', 'Understood.') },
      { who: 'seo_ha', text: t('토를 안 다네요.', 'You don’t argue.') },
      { who: 'tae_o', text: t('도선사에게는 안 한다.', 'Not with a pilot.') },
    ],
  },
  {
    id: 'b_suah_bel_rhythm',
    pair: ['su_ah', 'bel'],
    lines: [
      { who: 'su_ah', text: t('나는 처음엔 세게 치고, 끝에 갈수록 살살 쳐.', 'I hit hard at first and softer toward the end.') },
      { who: 'bel', text: t('나는 먼저 잘랐어. 읽는 건 그다음이었고.', 'I used to cut first. Reading came after.') },
      { who: 'su_ah', text: t('거꾸로네.', 'Backwards.') },
      { who: 'bel', text: t('알아. 네 순서로 배우는 중이야.', 'I know. I’m learning your order.') },
    ],
  },
  {
    id: 'b_doyun_han_queue',
    pair: ['doyun', 'han'],
    lines: [
      { who: 'doyun', text: t('한 씨는 검문소 줄에 한 번도 안 서네요.', 'Han, you never stand in a checkpoint queue.') },
      { who: 'han', text: t('줄은 세는 곳이야. 세면 남아.', 'Queues are where they count you. Get counted and it sticks.') },
      { who: 'doyun', text: t('저도 사람 세는데요.', 'I count people too.') },
      { who: 'han', text: t('넌 아무도 안 빠졌나 보려고 세잖아. 그건 달라.', 'You count to make sure nobody’s missing. That’s different.') },
    ],
  },
  {
    id: 'b_seoha_kai_grip',
    pair: ['seo_ha', 'kai'],
    acts: [4, 5, 6],
    lines: [
      { who: 'seo_ha', text: t('총 잡는 손이 내가 키 잡던 손이랑 같네요. 꽉 안 쥐어요.', 'You hold that rifle the way I held a wheel. Never tight.') },
      { who: 'kai', text: t('꽉 쥐면 떨려요.', 'Grip it tight and it shakes.') },
      { who: 'seo_ha', text: t('맞아요. 그건 아무도 안 가르쳐 줬죠.', 'That’s right. Nobody taught me that either.') },
    ],
  },
  {
    id: 'b_linyue_miro_ledger',
    pair: ['lin_yue', 'miro'],
    lines: [
      { who: 'lin_yue', text: t('꼬마, 네 이름 내 장부에 적어 뒀어. 빚 칸 말고.', 'Kid, I wrote your name in my ledger. Not in the debts column.') },
      { who: 'miro', text: t('…그럼 기억해?', '…So you’ll remember?') },
      { who: 'lin_yue', text: t('장부가 기억해. 나는 밤마다 장부를 펴고.', 'The ledger will. And I open it every night.') },
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

