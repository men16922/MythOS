// R7d — five new companions from the Deep Signal acts (plan §7.1): Io and Miro from the Glass Library (Act 4),
// Doyun from the optimization list (Act 3), Bel the Censorate defector (Act 4), Rem the Dream Executor turned (Act 5).
// Archive unlocks (unlocks.ts) put them in the Act 2 recruit pool like the base companions.
//
// Voices: Io calm 하십시오체, like a library catalogue · Miro whispering 반말 · Doyun earnest 해요체 · Bel clipped
// 반말 with editor's jargon · Rem soft, sleepy 하오체-tinged 해요체.
import type { CompanionDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const NEW_COMPANIONS: CompanionDef[] = [
  {
    id: 'io',
    name: t('이오', 'Io'),
    alias: t('유리성의 사서', 'The Glass Librarian'),
    role: t('사서 AI · 회상과 정보', 'Librarian AI · recall & intel'),
    sprite: 'io-ally',
    portrait: 'characters/io.png',
    maxHp: 18,
    move: 3,
    cards: ['io_recall', 'io_index_beam'],
    bondCards: ['io_reading_lamp'],
    passiveText: t('열람 기록: 카드 보상 선택지 +1.', 'Reading log: +1 card option on rewards.'),
    passive: { rewardChoices: 1 },
    combatPassive: {
      name: t('회상 색인', 'Recall Index'),
      text: t('턴마다 첫 기술 카드를 쓰면 카드 1장을 뽑는다.', 'The first skill you play each turn draws 1 card.'),
      triggers: [
        { on: 'play_skill', limit: 'turn', effects: [{ kind: 'draw', amount: 1 }] },
      ],
    },
    ultimate: {
      name: t('열람 허가', 'Access Granted'),
      text: t('소멸한 카드 2장을 손으로 되돌리고 1장을 뽑는다. 모든 적에게 표식 2.', "Return 2 exhausted cards to your hand and draw 1. Every enemy gets Mark 2."),
      effects: [{ kind: 'recall', count: 2 }, { kind: 'draw', amount: 1 }, { kind: 'status', status: 'mark', amount: 2, to: 'all_enemies' }],
    },
    bondLines: [
      t('대출 기록을 확인했습니다. 당신은 반납 기한을 한 번도 지키지 않았군요.', 'I have checked your loan record. You have never once returned anything on time.'),
      t('실패한 루프를 꽂아 두는 일이 제 일이었습니다. 당신 칸은 비워 두겠습니다.', 'Shelving failed loops was my work. I will leave your shelf empty.'),
      t('이 페이지는 색인하지 않겠습니다. 저만 알고 싶어서요.', 'I will not index this page. I would like to be the only one who knows it.'),
    ],
    barks: [t('색인 완료.', 'Indexed.'), t('참조하십시오.', 'For your reference.'), t('기록해 두겠습니다.', 'Noted.'), t('정숙.', 'Quiet, please.')],
  },
  {
    id: 'miro',
    name: t('미로', 'Miro'),
    alias: t('잊힌 독자', 'The Forgotten Reader'),
    role: t('정찰 · 은신과 기습', 'Scout · stealth & ambush'),
    sprite: 'miro',
    portrait: 'characters/miro.png',
    maxHp: 18,
    move: 4,
    cards: ['miro_shadow_step', 'miro_paper_cut'],
    bondCards: ['miro_margin_note'],
    passiveText: t('길 아는 자: 추적 획득 −15%.', 'Knows the back ways: 15% less Trace gained.'),
    passive: { traceMult: -0.15 },
    combatPassive: {
      name: t('그림자 독서', 'Reading in the Dark'),
      text: t('전투 시작 시 아군 모두 회피 1.', 'At the start of each fight, every ally gains Evade 1.'),
      triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'evade', amount: 1, to: 'all_allies' }] }],
    },
    ultimate: {
      name: t('그림자 기습', 'Shadow Ambush'),
      text: t('모든 적에게 피해 4. 모든 아군 회피 2.', "Deal 4 to every enemy. All allies gain Evade 2."),
      effects: [{ kind: 'damage', amount: 4, to: 'all_enemies' }, { kind: 'status', status: 'evade', amount: 2, to: 'all_allies' }],
    },
    bondLines: [
      t('쉿. 아무도 날 기억 못 해. 그게 편해.', 'Shh. Nobody remembers me. It’s easier that way.'),
      t('너는 내 이름을 두 번 불렀어. 이상하지. 두 번째가 더 크게 들렸어.', 'You said my name twice. Funny. The second time was louder.'),
      t('이 책갈피, 너 줄게. 내가 사라져도 여기까지 읽었다는 거 알 수 있게.', 'Take this bookmark. So you’ll know how far I read, even if I disappear.'),
    ],
    barks: [t('여기.', 'Here.'), t('안 보였지?', "Didn't see me, did you?"), t('조용히.', 'Quietly.'), t('다음 줄.', 'Next line.')],
  },
  {
    id: 'doyun',
    name: t('도윤', 'Doyun'),
    alias: t('명단 밖의 이름', 'The Name Off the List'),
    role: t('수호 · 몸으로 막는다', 'Guardian · takes the hit'),
    sprite: 'doyun',
    portrait: 'characters/doyun.png',
    maxHp: 24,
    move: 3,
    cards: ['doyun_stand_in', 'doyun_shoulder'],
    bondCards: ['doyun_roll_call'],
    passiveText: t('살아남은 사람: 최대 HP +5.', 'Survivor: +5 max HP.'),
    passive: { maxHp: 5 },
    combatPassive: {
      name: t('대신 맞기', 'Taking the Hit'),
      text: t('접속자가 피해를 입으면(턴마다 1번) 접속자에게 방어막 4.', 'When the connector takes damage (once a turn), the connector gains 4 Block.'),
      triggers: [{ on: 'damage_taken', limit: 'turn', effects: [{ kind: 'block', amount: 4, to: 'connector' }] }],
    },
    ultimate: {
      name: t('인간 방벽', 'Living Wall'),
      text: t('접속자 방어막 12. 모든 아군 가시 2, 도윤 수호 3.', "The Connector gains 12 block. All allies gain Thorns 2; Doyun gains Guard 3."),
      effects: [{ kind: 'block', amount: 12, to: 'connector' }, { kind: 'status', status: 'thorns', amount: 2, to: 'all_allies' }, { kind: 'status', status: 'guard', amount: 3, to: 'owner' }],
    },
    bondLines: [
      t('명단에서 제 이름이 지워진 날, 처음으로 제 이름을 소리 내서 말해 봤어요.', 'The day my name came off the list, I said it out loud for the first time.'),
      t('저는 싸우는 법은 몰라요. 서 있는 법은 알아요.', 'I don’t know how to fight. I know how to stand.'),
      t('이번엔 제가 먼저 설게요. 당신이 그렇게 해 줬으니까요.', 'This time I’ll stand in front. You did it for me.'),
    ],
    barks: [t('제가 막을게요!', "I've got it!"), t('괜찮아요.', "I'm okay."), t('뒤로 오세요.', 'Get behind me.'), t('아직 서 있어요.', 'Still standing.')],
  },
  {
    id: 'bel',
    name: t('벨', 'Bel'),
    alias: t('검열단 이탈자', 'The Censor Who Quit'),
    role: t('교란 · 약화와 감전', 'Disruptor · weaken & shock'),
    sprite: 'bel',
    portrait: 'characters/bel.png',
    maxHp: 18,
    move: 3,
    cards: ['bel_red_pen', 'bel_blackout'],
    bondCards: ['bel_uncensored'],
    passiveText: t('편집자의 눈: 사건의 관찰 판정 +1.', "Editor's eye: +1 to Observation checks in events."),
    passive: { stats: { obs: 1 } },
    combatPassive: {
      name: t('붉은 줄', 'Red Line'),
      text: t('턴마다 첫 전술 카드를 쓰면 무작위 적 하나에게 약화 1.', 'The first tactic you play each turn gives a random enemy Weak 1.'),
      triggers: [{ on: 'play_tactic', limit: 'turn', effects: [{ kind: 'status', status: 'weak', amount: 1, to: 'random_enemy' }] }],
    },
    ultimate: {
      name: t('검열 해제', 'Uncensored'),
      text: t('모든 적에게 약화 2, 침식 3.', "Every enemy gets Weak 2 and Corrode 3."),
      effects: [{ kind: 'status', status: 'weak', amount: 2, to: 'all_enemies' }, { kind: 'status', status: 'corrode', amount: 3, to: 'all_enemies' }],
    },
    bondLines: [
      t('난 십 년 동안 남의 문장을 잘랐어. 이제 내 문장을 써 보려고.', 'I cut other people’s sentences for ten years. I want to write one of my own.'),
      t('검열관은 다 읽어. 그래서 제일 먼저 질려.', 'Censors read everything. That’s why we’re the first to get sick of it.'),
      t('네 이야기는 한 줄도 안 지울 거야. 오탈자까지.', 'I won’t cut a line of your story. Not even the typos.'),
    ],
    barks: [t('삭제.', 'Struck.'), t('반려.', 'Rejected.'), t('교정 들어간다.', 'Going in with the red pen.'), t('그 줄 빼.', 'Cut that line.')],
  },
  {
    id: 'rem',
    name: t('렘', 'Rem'),
    alias: t('깨어난 집행자', 'The Executor Who Woke'),
    role: t('통제 · 빙결과 되감기', 'Control · freeze & rewind'),
    sprite: 'rem-ally',
    portrait: 'characters/rem-ally.png',
    maxHp: 20,
    move: 3,
    cards: ['rem_lullaby', 'rem_dream_blade'],
    bondCards: ['rem_rewind'],
    passiveText: t('깊은 잠: 은신처 휴식 회복 +10%.', 'Deep sleep: safehouse rest heals 10% more.'),
    passive: { restHeal: 10 },
    combatPassive: {
      name: t('자장가', 'Lullaby'),
      text: t('내 턴이 끝날 때 무작위 적 하나에게 빙결 1(그 턴 움직이지 못한다).', 'At the end of your turn a random enemy is Frozen 1 (it cannot move that turn).'),
      triggers: [{ on: 'turn_end', limit: 'turn', effects: [{ kind: 'status', status: 'freeze', amount: 1, to: 'random_enemy' }] }],
    },
    ultimate: {
      name: t('꿈의 정지', 'Dream Stop'),
      text: t('모든 적을 기절시킨다.', "Stun every enemy."),
      effects: [{ kind: 'status', status: 'stun', amount: 1, to: 'all_enemies' }],
    },
    bondLines: [
      t('기계들의 꿈을 끄는 게 제 일이었어요. 당신 꿈은… 켜 두고 싶어요.', 'Switching off the machines’ dreams was my work. Yours… I’d like to leave on.'),
      t('잠이 오지 않아요. 집행자는 원래 자지 않으니까요. 그래도 옆에 있어도 될까요.', 'I can’t sleep. Executors don’t. May I stay beside you anyway?'),
      t('한 번만 되감을 수 있다면, 당신을 처음 본 밤으로 갈게요.', 'If I could rewind just once, I’d go back to the night I first saw you.'),
    ],
    barks: [t('쉬어요.', 'Rest.'), t('조금만 되감을게요.', 'Rewinding a little.'), t('잘 자요.', 'Sleep well.'), t('깨어 있어요.', 'Stay awake.')],
  },
]
