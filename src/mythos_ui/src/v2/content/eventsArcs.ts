// Companion arcs for Tae-o, Han, Se-rin, Kai and Lin-yue — three events each, built the way the Su-ah arc is (eventsMore.ts):
// every event is gated at event level on the companion being in the party, and the later parts read the flag
// the earlier part set. Each arc picks up the thread the companion's lore entry already leaves open.
//
//   Tae-o  "pending disposal" : a2_taeo_wanted_board → (taeo_trail) a3_taeo_pending_file → (taeo_cleared) a3_taeo_hold_the_line
//   Han    "the bug"          : a2_han_blank_booth   → (han_probe)   a3_han_first_poke    → (han_poked)    a3_han_empty_reply
//   Se-rin "thirteenth line"  : a2_serin_answering_radio → (serin_signal) a3_serin_inside_line → (serin_line) a3_serin_thirteenth_line
//   Kai    "yellow umbrella"  : a2_kai_umbrella_stall   → (kai_clue)    a3_kai_crosswalk_footage → (kai_found) a3_kai_name_given
//   Lin-yue "the red page"    : a2_linyue_crew_roll     → (linyue_crew) a3_linyue_moonlight_lot  → (linyue_names) a3_linyue_last_entry
//   (Su-ah's arc is in eventsMore.ts.)
//
// Rules are the same as events.ts (narrative.test.ts): real decisions, stinging failures, credits gated,
// ≥ 2 unconditional options, bonds only on the gating companion, Korean is the authored voice.
import type { EventDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

// ================================================================== Tae-o — 처리 대기

const TAEO: EventDef[] = [
  {
    id: 'a2_taeo_wanted_board',
    acts: [2],
    title: t('수배 게시판', 'The Wanted Board'),
    image: 'v2/events/a2_taeo_wanted_board.webp',
    speaker: 'tae_o',
    requires: { companion: 'tae_o' },
    text: t(
      '시장 입구, 낡은 수배 게시판. 얼굴 사진이 겹겹이 붙어 있다. 태오가 한 장 앞에서 걸음을 멈춘다. 사진 속은 열댓 살 소녀. 이름 옆에 붉은 도장. ‘처리 대기’.\n“…저 도장. 내가 놓친 날짜 그대로야.” 그는 흉터를 한 번 문지른다.',
      'The old wanted board at the market gate, faces pasted in layers. Tae-o stops at one: a girl of fifteen or so. A red stamp beside her name — ‘PENDING DISPOSAL’.\n“…That stamp. The same date I lost her.” He rubs his scar once.',
    ),
    options: [
      {
        label: t('게시판 기록을 읽어 단서를 모은다', 'Read the board for leads'),
        hint: t('유대 +1 · 코덱스 · 실패 시 추적 +6', 'Bond +1 · codex · fail +6 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '접수 일자와 갱신 일자가 어긋난다. 누군가 이 소녀의 기록을 계속 연장하고 있다. 지우지 않고, 처리하지도 않고. 태오가 숨을 삼킨다.',
            'The intake and renewal dates don’t match. Someone keeps extending the girl’s record — never erasing, never processing. Tae-o swallows his breath.',
          ),
          effects: [
            { kind: 'bond', id: 'tae_o', amount: 1 },
            { kind: 'codex', id: 'lore_tae_o' },
            { kind: 'flag', key: 'taeo_trail' },
          ],
        },
        failure: {
          text: t(
            '게시판 스캐너가 손을 먼저 읽는다. 짧은 경보가 울리고 지나가던 상인이 이쪽을 돌아본다.',
            'The board’s scanner reads your hand first. A short alarm chirps and a passing vendor turns to look.',
          ),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('태오가 말을 꺼낼 때까지 기다린다', 'Wait until Tae-o speaks'),
        hint: t('유대 +1 · HP +6', 'Bond +1 · +6 HP'),
        success: {
          text: t(
            '한참 뒤에야 그가 말한다. “놓아줬다. 그게 전부야. 그 뒤로 한 번도 못 봤다.” 어깨가 낮아지고, 그는 천천히 걷기 시작한다.',
            'It takes a long while. “I let her go. That’s all. Never saw her again.” His shoulders drop and he starts walking, slowly.',
          ),
          effects: [
            { kind: 'bond', id: 'tae_o', amount: 1 },
            { kind: 'hp', amount: 6 },
            { kind: 'flag', key: 'taeo_trail' },
          ],
        },
      },
      {
        label: t('수배지를 떼어 낸다', 'Tear the notice down'),
        hint: t('◈ +2 · 추적 +7', '+2 ◈ · +7 Trace'),
        success: {
          text: t(
            '종이가 찢어지는 소리에 상인들이 입을 다문다. 태오가 찢긴 조각을 주머니에 넣는다. 말은 없다. 눈이 한 번 당신을 본다.',
            'The tearing paper hushes the vendors. Tae-o pockets the scrap. He says nothing; his eyes meet yours once.',
          ),
          effects: [
            { kind: 'echoes', amount: 2 },
            { kind: 'trace', amount: 7 },
          ],
        },
      },
    ],
    gmHints: ['tae_o', 'wanted board', 'pending disposal', 'the girl he let go'],
  },
  {
    id: 'a3_taeo_pending_file',
    acts: [3],
    title: t('처리 대기 파일', 'The Pending File'),
    image: 'v2/events/a3_taeo_pending_file.webp',
    speaker: 'tae_o',
    requires: { companion: 'tae_o' },
    text: t(
      '첨탑 집행부 기록실. 서랍마다 파일이 빼곡하다. 태오가 말없이 한 서랍을 연다. 낡은 종이 한 장. 이름. 그리고 ‘처리 대기’.\n“오 년째 이 칸에 있어.” 그가 낮게 웃는다. “내가 쫓던 놈이 나를 쫓는 놈들보다 오래 살았네.”',
      'The spire’s Enforcement records room, drawers packed with files. Tae-o opens one without a word: a worn sheet. A name. ‘PENDING DISPOSAL.’\n“Five years in this slot.” He laughs, low. “The one I chased outlived the ones chasing me.”',
    ),
    options: [
      {
        label: t('파일의 상태를 지운다', 'Wipe the file’s status'),
        hint: t('유대 +1 · 코덱스 · 실패 시 정크', 'Bond +1 · codex · fail: junk'),
        requires: { flag: 'taeo_trail' },
        check: { stat: 'int', dc: 7 },
        success: {
          text: t(
            '‘처리 대기’ 위로 빈 줄이 번진다. 태오가 파일을 접어 품에 넣는다. “이제 이 서랍은 아무도 안 열어.”',
            'A blank line spreads over ‘PENDING DISPOSAL’. Tae-o folds the file into his coat. “Nobody opens this drawer again.”',
          ),
          effects: [
            { kind: 'bond', id: 'tae_o', amount: 1 },
            { kind: 'codex', id: 'lore_optimization_list' },
            { kind: 'flag', key: 'taeo_cleared' },
          ],
        },
        failure: {
          text: t(
            '서랍이 비명을 지른다. 잠금 장치가 손가락을 문다. 서류 먼지 사이로 붉은 불이 켜진다.',
            'The drawer shrieks and its lock bites your fingers. A red light flickers on through the paper dust.',
          ),
          effects: [
            { kind: 'junk', cardId: 'trace_bug' },
            { kind: 'hp', amount: -4 },
          ],
        },
      },
      {
        label: t('파일째 챙겨 간다', 'Take the whole file'),
        hint: t('◈ +3 · 추적 +9', '+3 ◈ · +9 Trace'),
        success: {
          text: t(
            '서랍이 비고, 빈 칸 하나가 다시 닫힌다. 나갈 때 복도 조명이 한 줄씩 켜진다. 누군가 서랍의 무게 차이를 읽었다.',
            'The drawer empties and the slot slides shut. In the corridor the lights come on one by one. Someone read the drawer’s weight change.',
          ),
          effects: [
            { kind: 'echoes', amount: 3 },
            { kind: 'trace', amount: 9 },
          ],
        },
      },
      {
        label: t('그냥 서랍을 닫는다', 'Close the drawer'),
        hint: t('추적 −5 · 유대 +1', '−5 Trace · bond +1'),
        success: {
          text: t(
            '“지금은 아니다.” 태오가 서랍을 닫는다. 어깨의 힘이 풀린다. 그가 처음으로 당신에게 먼저 등을 보인다.',
            '“Not now.” Tae-o shuts the drawer. His shoulders ease. For the first time he turns his back to you on purpose.',
          ),
          effects: [
            { kind: 'trace', amount: -5 },
            { kind: 'bond', id: 'tae_o', amount: 1 },
          ],
        },
      },
    ],
    gmHints: ['tae_o', 'enforcement archive', 'pending file', 'five years'],
  },
  {
    id: 'a3_taeo_hold_the_line',
    acts: [3],
    title: t('버티는 자리', 'The Line to Hold'),
    image: 'v2/events/a3_taeo_hold_the_line.webp',
    speaker: 'tae_o',
    requires: { companion: 'tae_o', flag: 'taeo_cleared' },
    text: t(
      '비상 통로 끝, 집행부 추적견 한 기가 길을 막는다. 센서가 태오의 얼굴에서 멈춘다. 태오가 총을 내리고 한 걸음 앞으로 나선다.\n“내 뒤에 서라. 이번엔 끝까지 버틴다.” 그의 목소리에 떨림은 없다.',
      'At the end of an emergency passage an Enforcement hound blocks the way. Its sensor locks on Tae-o’s face. He lowers his gun and steps forward.\n“Stand behind me. This time I hold to the end.” There’s no tremor in his voice.',
    ),
    options: [
      {
        label: t('태오의 뒤에 선다', 'Stand behind Tae-o'),
        hint: t('유대 +1 · 최대 HP +4', 'Bond +1 · +4 max HP'),
        success: {
          text: t(
            '추적견의 발톱이 태오의 방패를 긁고 불꽃이 튄다. 그는 한 걸음도 물러서지 않는다. 길이 열렸을 때 그의 팔이 떨리고 있다. 둘 다 못 본 척한다.',
            'The hound’s claws rake Tae-o’s shield in a spray of sparks. He doesn’t give a step. When the way clears, his arm is trembling. Neither of you mentions it.',
          ),
          effects: [
            { kind: 'bond', id: 'tae_o', amount: 1 },
            { kind: 'maxHp', amount: 4 },
            { kind: 'hp', amount: 4 },
          ],
        },
      },
      {
        label: t('옆에서 함께 막는다', 'Hold the passage beside him'),
        hint: t('희귀 카드 · 실패 시 −8 HP', 'Rare card · fail −8 HP'),
        check: { stat: 'str', dc: 7 },
        success: {
          text: t(
            '둘이 어깨를 나란히 대고 문틀을 막는다. 추적견이 밀려난다. 태오가 짧게 웃는다. “이럴 줄 알았으면 일찍 만날걸.”',
            'You wedge shoulder to shoulder in the doorframe and the hound is pushed back. Tae-o laughs shortly. “Had I known, I’d have met you sooner.”',
          ),
          effects: [{ kind: 'card_choice', rarity: 'rare' }],
        },
        failure: {
          text: t(
            '추적견의 몸통이 당신 쪽으로 쏟아진다. 갈비뼈가 소리를 낸다. 태오가 한 손으로 당신을 끌어내며 욕을 한다.',
            'The hound’s bulk crashes into your side. A rib cracks. Tae-o hauls you clear with one hand, swearing.',
          ),
          effects: [
            { kind: 'hp', amount: -8 },
            { kind: 'trace', amount: 5 },
          ],
        },
      },
      {
        label: t('우회로를 찾아 빠져나간다', 'Find a way around'),
        hint: t('추적 −6', '−6 Trace'),
        success: {
          text: t(
            '태오는 아무 말도 하지 않는다. 통로 끝에서 한 번 돌아본다. 추적견은 그 자리에 서서 아무도 쫓지 않는다.',
            'Tae-o says nothing. At the end of the passage he looks back once. The hound stays where it stands, chasing no one.',
          ),
          effects: [{ kind: 'trace', amount: -6 }],
        },
      },
    ],
    gmHints: ['tae_o', 'enforcement hound', 'holding the line', 'redemption'],
  },
]

// ================================================================== Han — 구경하는 버그

const HAN: EventDef[] = [
  {
    id: 'a2_han_blank_booth',
    acts: [2],
    title: t('빈 접속 부스', 'The Blank Booth'),
    image: 'v2/events/a2_han_blank_booth.webp',
    speaker: 'han',
    requires: { companion: 'han' },
    text: t(
      '시장 모퉁이에 낡은 ARK 시민 등록 부스. 화면에는 ‘신규 접속자를 환영합니다’. 한이 부스 앞에서 한참 서 있다. 평소처럼 비웃지 않는다.\n“저거, 한 번도 안 눌러 봤어. 눌러도 내 이름은 안 뜰 텐데.” 그가 화면에 손을 얹는다.',
      'In a market corner, a worn ARK citizen-registration booth. The screen reads ‘Welcome, new connector.’ Han has been standing in front of it a long while. He isn’t sneering for once.\n“Never pressed that one. Wouldn’t show my name anyway.” He lays a hand on the screen.',
    ),
    options: [
      {
        label: t('한이 눌러 보게 한다', 'Let Han press it'),
        hint: t('유대 +1 · 추적 +8', 'Bond +1 · +8 Trace'),
        success: {
          text: t(
            '화면이 깜빡이다 빈 칸 하나를 띄운다. 이름 칸이 비어 있다. 한이 어이없다는 듯 웃다가 이내 웃음을 멈춘다. “…진짜 비어 있네.”',
            'The screen flickers and shows one blank field: Name. Han laughs in disbelief, then stops. “…It really is empty.”',
          ),
          effects: [
            { kind: 'bond', id: 'han', amount: 1 },
            { kind: 'trace', amount: 8 },
            { kind: 'flag', key: 'han_probe' },
          ],
        },
      },
      {
        label: t('부스 안쪽을 해킹해 본다', 'Hack the booth from inside'),
        hint: t('코덱스 · 실패 시 −5 HP', 'Codex · fail −5 HP'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '등록 부스가 쓰는 건 낡은 프로토콜 하나뿐이다. 한의 눈이 반짝인다. “봐, 사실은 이렇게 엉성해.” 그가 그 구멍에 이름을 하나 적어 둔다.',
            'The booth runs on a single outdated protocol. Han’s eyes light up. “See? It’s this sloppy underneath.” He writes a name into the gap.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_han' },
            { kind: 'flag', key: 'han_probe' },
          ],
        },
        failure: {
          text: t(
            '부스가 감전용 보호회로를 작동시킨다. 손끝이 하얗게 탄다. 한이 급하게 케이블을 뽑는다.',
            'The booth fires a surge guard. Your fingertips whiten and sting. Han yanks the cable out in a hurry.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('가자고 한다', 'Tell him to move on'),
        hint: t('HP +5 · 추적 −3', '+5 HP · −3 Trace'),
        success: {
          text: t(
            '한이 어깨를 으쓱한다. “그래, 이런 건 구경하는 게 낫지.” 그러나 몇 걸음 가다 한 번 뒤를 돌아본다. 화면은 계속 깜빡이고 있다.',
            'Han shrugs. “Right. Better to watch than press.” A few steps on, he looks back once. The screen keeps blinking.',
          ),
          effects: [
            { kind: 'hp', amount: 5 },
            { kind: 'trace', amount: -3 },
          ],
        },
      },
    ],
    gmHints: ['han', 'registration booth', 'blank name', 'unplugged'],
  },
  {
    id: 'a3_han_first_poke',
    acts: [3],
    title: t('첫 번째 찌르기', 'The First Poke'),
    image: 'v2/events/a3_han_first_poke.webp',
    speaker: 'han',
    requires: { companion: 'han' },
    text: t(
      '첨탑 중간층의 보수 단말. IX의 최하위 인터페이스가 열려 있다. 한이 장갑을 벗고 손가락 끝을 단말 앞에 둔다.\n“평생 구경만 했는데. 한 번만, 딱 한 번만 찔러 볼까?” 입가가 웃고 있지만 손이 떨린다.',
      'A maintenance terminal on a mid-level of the spire; IX’s lowest interface is open. Han strips off a glove and holds a fingertip before the terminal.\n“My whole life I’ve only watched. One poke. Just one?” His mouth smiles; his hand shakes.',
    ),
    options: [
      {
        label: t('빈 패킷으로 찔러 보게 한다', 'Let him poke with an empty packet'),
        hint: t('유대 +1 · 추적 +10', 'Bond +1 · +10 Trace'),
        requires: { flag: 'han_probe' },
        success: {
          text: t(
            '화면에 아무것도 뜨지 않는다. 몇 초 뒤, 단말이 아주 조용히 “대기 중”이라고 적는다. 한이 숨을 길게 내쉰다. “답이 왔어. 나한테.”',
            'Nothing on the screen. A few seconds later the terminal quietly types ‘standing by’. Han lets out a long breath. “It answered. Me.”',
          ),
          effects: [
            { kind: 'bond', id: 'han', amount: 1 },
            { kind: 'trace', amount: 10 },
            { kind: 'flag', key: 'han_poked' },
          ],
        },
      },
      {
        label: t('한 대신 먼저 찔러 신호를 가린다', 'Poke first to mask his signal'),
        hint: t('코덱스 · 유대 +1 · 실패 시 −6 HP', 'Codex · bond +1 · fail −6 HP'),
        check: { stat: 'int', dc: 7 },
        success: {
          text: t(
            '당신의 신호가 먼저 들어가 IX의 시선을 가린다. 그 틈에 한이 가만히 한 줄을 남기고 빠진다. “고마워. 무서웠어.”',
            'Your signal goes in first and screens IX’s gaze. In the gap Han slips in one quiet line and out. “Thanks. I was scared.”',
          ),
          effects: [
            { kind: 'codex', id: 'lore_ix' },
            { kind: 'bond', id: 'han', amount: 1 },
            { kind: 'flag', key: 'han_poked' },
          ],
        },
        failure: {
          text: t(
            '역류. IX의 응답이 당신 쪽 신호를 타고 되돌아온다. 머릿속이 하얗게 번쩍인다.',
            'Backflow. IX’s reply rides your own signal back at you. Your head flashes white.',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('손을 내리게 한다', 'Make him lower his hand'),
        hint: t('추적 −6 · ◈ +1', '−6 Trace · +1 ◈'),
        success: {
          text: t(
            '“…그래.” 한이 장갑을 다시 낀다. 단말 화면이 저절로 꺼진다. 마지막 순간 화면에 한 줄이 떴다 사라진 것 같은데, 읽지는 못했다.',
            '“…Right.” Han pulls his glove back on. The terminal shuts itself off. For a last instant a line flickered on the screen; you couldn’t read it.',
          ),
          effects: [
            { kind: 'trace', amount: -6 },
            { kind: 'echoes', amount: 1 },
          ],
        },
      },
    ],
    gmHints: ['han', 'maintenance terminal', 'first poke', 'IX answers'],
  },
  {
    id: 'a3_han_empty_reply',
    acts: [3],
    title: t('빈 응답', 'The Empty Reply'),
    image: 'v2/events/a3_han_empty_reply.webp',
    speaker: 'han',
    requires: { companion: 'han', flag: 'han_poked' },
    text: t(
      '복도 스피커가 지직거린다. IX의 목소리가 아니다. 규격 응답문 하나. ‘사용자 미확인. 계속 진행하십시오.’ 한이 박수를 한 번 치고 웃음을 터뜨린다.\n“들었지? 못 찾는대! 나는, 이 시스템에, 없는 사람이야!”\n눈가가 젖어 있다.',
      'The corridor speaker crackles. It isn’t IX’s voice. A stock reply: ‘User unrecognized. Proceed.’ Han claps once and bursts out laughing.\n“You hear that? It can’t find me! I’m — not in this system!”\nHis eyes are wet.',
    ),
    options: [
      {
        label: t('한의 빈틈으로 길을 연다', 'Let Han open a path through the gap'),
        hint: t('추적 −15 · 유대 +1', '−15 Trace · bond +1'),
        success: {
          text: t(
            '한이 손끝으로 허공을 긋는다. 센서들이 일제히 눈을 돌린다. 문 열 개를 지나는 동안 아무것도 울리지 않는다.',
            'Han traces a line in the air. The sensors all look away at once. Ten doors pass and nothing rings.',
          ),
          effects: [
            { kind: 'trace', amount: -15 },
            { kind: 'bond', id: 'han', amount: 1 },
          ],
        },
      },
      {
        label: t('그 빈틈을 같이 쓴다', 'Share that gap with him'),
        hint: t('임플란트 · 실패 시 추적 +8', 'Implant · fail +8 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '한이 넘겨 준 신호 위로 당신의 흔적이 얇게 덮인다. 단말이 한 칸 비어 있던 자리에서 모듈 하나를 토해 낸다.',
            'Your trace thins under the signal Han hands over. The terminal spits a module out of a slot it had left empty.',
          ),
          effects: [{ kind: 'implant', rarity: 'uncommon' }],
        },
        failure: {
          text: t(
            '당신은 그 빈틈에 들어가지 못한다. 스피커가 당신 이름을 한 번 부른다. 정확하게.',
            'You can’t fit through that gap. The speaker says your name once — exactly.',
          ),
          effects: [{ kind: 'trace', amount: 8 }],
        },
      },
      {
        label: t('웃고 있는 한 곁에 선다', 'Just stand beside him'),
        hint: t('유대 +1 · 파티 HP +8', 'Bond +1 · party +8 HP'),
        success: {
          text: t(
            '한이 소매로 눈가를 문지르고는 어색하게 웃는다. “이거 비밀이다.” 복도 끝까지 둘은 보폭을 맞춰 걷는다.',
            'Han scrubs his eyes with his sleeve and grins awkwardly. “Keep this secret.” You walk the corridor in step.',
          ),
          effects: [
            { kind: 'bond', id: 'han', amount: 1 },
            { kind: 'heal_party', amount: 8 },
          ],
        },
      },
    ],
    gmHints: ['han', 'unrecognized user', 'empty reply', 'belonging'],
  },
]

// ================================================================== Se-rin — 열세 번째 선

const SERIN: EventDef[] = [
  {
    id: 'a2_serin_answering_radio',
    acts: [2],
    title: t('응답하는 무전기', 'The Answering Radio'),
    image: 'v2/events/a2_serin_answering_radio.webp',
    speaker: 'se_rin',
    requires: { companion: 'se_rin' },
    text: t(
      '시장 지하 통로. 세린의 고장 난 무전기가 갑자기 지지직거린다. 낡은 주파수. 열세 번째 선을 긋다 만 날의 그 주파수다.\n“…잘못 들은 거지?” 세린이 다이얼을 쥔다. 잡음 사이로 숫자를 읽는 목소리가 겹친다. 느리게. 누군가 찾는 중인 것처럼.',
      'An underground passage of the market. Se-rin’s broken radio suddenly crackles — the old frequency from the day she left the thirteenth line half-drawn.\n“…I misheard, right?” She grips the dial. Through the static a voice reads numbers, slowly, like someone searching.',
    ),
    options: [
      {
        label: t('주파수를 따라 응답한다', 'Answer on the frequency'),
        hint: t('유대 +1 · 코덱스 · 실패 시 추적 +7', 'Bond +1 · codex · fail +7 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '당신이 보낸 짧은 신호에 숫자가 멈춘다. 몇 초 뒤 한 단어. “…여기.” 세린이 입을 막고 벽에 등을 댄다.',
            'The numbers stop at your short signal. A few seconds later, one word: “…here.” Se-rin clamps a hand over her mouth and leans against the wall.',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'codex', id: 'lore_se_rin' },
            { kind: 'flag', key: 'serin_signal' },
          ],
        },
        failure: {
          text: t(
            '신호가 어긋나 엉뚱한 곳에 닿는다. 통로 끝의 감시 드론이 이쪽으로 머리를 돌린다.',
            'The signal skews and reaches the wrong ear. A watcher drone at the passage’s end turns its head your way.',
          ),
          effects: [{ kind: 'trace', amount: 7 }],
        },
      },
      {
        label: t('세린이 응답할 때까지 기다린다', 'Wait for Se-rin to answer herself'),
        hint: t('유대 +1 · HP +6', 'Bond +1 · +6 HP'),
        success: {
          text: t(
            '긴 침묵 끝에 세린이 마이크를 든다. 목소리가 갈라진다. “…나야. 늦었어.” 건너편에서 아무 말도 돌아오지 않지만 숫자는 멈춘다.',
            'After a long silence Se-rin lifts the mic, voice cracking. “…It’s me. I’m late.” Nothing comes back, but the numbers stop.',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'hp', amount: 6 },
            { kind: 'flag', key: 'serin_signal' },
          ],
        },
      },
      {
        label: t('위험하니 끄자고 한다', 'Tell her it’s too risky — switch it off'),
        hint: t('추적 −6 · 최대 HP −2', '−6 Trace · −2 max HP'),
        success: {
          text: t(
            '세린의 손가락이 한참 스위치 위를 맴돌다 내려간다. 숫자가 끊긴다. 그녀는 이후 한동안 말이 없다.',
            'Se-rin’s finger hovers over the switch for a long moment, then drops. The numbers cut off. She stays quiet for a good while.',
          ),
          effects: [
            { kind: 'trace', amount: -6 },
            { kind: 'maxHp', amount: -2 },
          ],
        },
      },
    ],
    gmHints: ['se_rin', 'old radio frequency', 'thirteenth chalk line', 'reaching back'],
  },
  {
    id: 'a3_serin_inside_line',
    acts: [3],
    title: t('안쪽으로 이어진 회선', 'The Line Inside'),
    image: 'v2/events/a3_serin_inside_line.webp',
    speaker: 'se_rin',
    requires: { companion: 'se_rin' },
    text: t(
      '첨탑 통신실. 세린의 통신기가 혼자 켜진다. 기록에 없던 회선 하나가 관리망 안쪽으로 이어져 있다. 상대는 응답하지 않고, 이쪽의 호흡만 듣는다.\n“…내가 열어 둔 거 맞아.” 세린이 시선을 피한다. “거래였어. 아니면 감시였든가. 이제 와서 구분이 안 가.”',
      'The spire’s comms room. Se-rin’s handset switches on by itself: a line absent from her records, running inside the administration net. The other end says nothing, only listens to you breathe.\n“…I opened it. Yes.” She looks away. “A deal. Or surveillance. I can’t tell the two apart anymore.”',
    ),
    options: [
      {
        label: t('세린이 직접 말하게 한다', 'Let Se-rin speak into it'),
        hint: t('유대 +1 · 코덱스', 'Bond +1 · codex'),
        requires: { flag: 'serin_signal' },
        success: {
          text: t(
            '세린이 숨을 고르고 수화기에 대고 말한다. 숫자가 아니다. 이름 하나. 건너편에서 아주 오래 뒤에 한 번 같은 이름이 돌아온다.',
            'Se-rin steadies herself and speaks into the handset — not numbers, but a name. After a very long while the same name comes back once.',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'codex', id: 'lore_ix_contract' },
            { kind: 'flag', key: 'serin_line' },
          ],
        },
      },
      {
        label: t('회선의 끝을 추적한다', 'Trace the line to its end'),
        hint: t('유대 +1 · 실패 시 −6 HP', 'Bond +1 · fail −6 HP'),
        check: { stat: 'int', dc: 7 },
        success: {
          text: t(
            '회선은 IX가 아닌 어느 낡은 중계기로 끝난다. 세린이 그 좌표를 보고 입술을 깨문다. “살아 있어. 그 사람, 아직.”',
            'The line ends not at IX but at an old relay. Se-rin sees the coordinates and bites her lip. “They’re alive. Still.”',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'echoes', amount: 3 },
            { kind: 'flag', key: 'serin_line' },
          ],
        },
        failure: {
          text: t(
            '추적 신호가 끝에서 되받아쳐진다. 통신기가 손안에서 달아오른다. 화상 자국이 손바닥에 남는다.',
            'The trace pings back from the far end. The handset heats in your grip and leaves a burn across your palm.',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('회선을 끊는다', 'Cut the line'),
        hint: t('추적 −10 · 최대 HP −2', '−10 Trace · −2 max HP'),
        success: {
          text: t(
            '선을 자르자 통신기의 램프가 꺼진다. 세린이 오래 서 있다가 한마디만 한다. “…고마워. 그리고 미안.”',
            'You cut it and the handset’s lamp dies. Se-rin stands a long time, then says only: “…Thanks. And sorry.”',
          ),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'maxHp', amount: -2 },
          ],
        },
      },
    ],
    gmHints: ['se_rin', 'comms room', 'hidden line', 'deal or surveillance'],
  },
  {
    id: 'a3_serin_thirteenth_line',
    acts: [3],
    title: t('열세 번째 선', 'The Thirteenth Line'),
    image: 'v2/events/a3_serin_thirteenth_line.webp',
    speaker: 'se_rin',
    requires: { companion: 'se_rin', flag: 'serin_line' },
    text: t(
      '비상 계단의 회색 벽. 세린이 주머니에서 분필 토막을 꺼낸다. 오래 쥐고 있던 것처럼 모서리가 닳았다.\n“열두 개까지는 그었는데, 열세 번째를 못 끝냈어.” 그녀가 벽에 선을 대고 한 번 숨을 쉰다. “이번엔 끝까지 그을 거야. 같이 봐 줘.”',
      'A grey wall of an emergency stairwell. Se-rin takes a chalk stub from her pocket, edges worn as if long held.\n“I drew twelve. I never finished the thirteenth.” She sets the chalk against the wall and breathes once. “This time I’ll draw it through. Watch with me.”',
    ),
    options: [
      {
        label: t('끝까지 지켜본다', 'Watch it through'),
        hint: t('유대 +1 · 최대 HP +4', 'Bond +1 · +4 max HP'),
        success: {
          text: t(
            '분필이 벽을 천천히 가른다. 선이 끝나자 세린이 손을 털고 웃는다. 눈이 젖었는데도 어깨가 가볍다. “이제 뛸 수 있겠다. 같이.”',
            'The chalk drags slowly across the wall. When the line ends Se-rin dusts her hands and smiles, eyes wet, shoulders light. “Now I can run. With you.”',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'maxHp', amount: 4 },
            { kind: 'hp', amount: 4 },
          ],
        },
      },
      {
        label: t('분필을 함께 쥔다', 'Hold the chalk with her'),
        hint: t('카드 2장 강화', 'Upgrade 2 cards'),
        success: {
          text: t(
            '둘의 손이 한 선을 긋는다. 세린이 짧게 웃는다. “삐뚤어졌네.” 그 뒤로 몸이 새로 배운 길처럼 가벼워진다.',
            'Two hands draw one line. Se-rin laughs shortly. “It’s crooked.” After that your body feels light, like a route newly learned.',
          ),
          effects: [{ kind: 'upgrade_card', count: 2 }],
        },
      },
      {
        label: t('선 대신 길을 묻는다', 'Ask her for a route instead'),
        hint: t('추적 −12 · ◈ +2', '−12 Trace · +2 ◈'),
        success: {
          text: t(
            '세린이 분필로 벽에 지도를 그린다. 물거미의 길이다. 가장 빠르고 가장 낮은 길. 그녀가 손가락으로 마지막 지점을 톡 두드린다.',
            'Se-rin chalks a map on the wall — the Water Spider’s way, the fastest and lowest. She taps the last point with one finger.',
          ),
          effects: [
            { kind: 'trace', amount: -12 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
    ],
    gmHints: ['se_rin', 'thirteenth chalk line', 'stairwell', 'finishing what she started'],
  },
]

// ================================================================== Kai — 노란 우산

const KAI: EventDef[] = [
  {
    id: 'a2_kai_umbrella_stall',
    acts: [2],
    title: t('우산 가판', 'The Umbrella Stall'),
    image: 'v2/events/a2_kai_umbrella_stall.webp',
    speaker: 'kai',
    requires: { companion: 'kai' },
    text: t(
      '시장 한편, 분실물 우산만 파는 가판. 살대가 휜 것, 천이 찢긴 것. 카이가 한 우산 앞에서 걸음을 멈춘다. 노란색. 손잡이에 작은 이니셜이 새겨져 있다.\n“…제 꿈이에요. 이 색.” 푸른 눈이 아주 천천히 깜빡인다.\n주인이 어깨를 으쓱한다. “그거? 횡단보도에서 주운 거야.”',
      'A market stall that sells only lost umbrellas — bent ribs, torn canopies. Kai stops at one. Yellow. A small monogram is carved into the handle.\n“…It’s my dream. This colour.” His blue eyes blink, very slowly.\nThe vendor shrugs. “That one? Picked it up at a crosswalk.”',
    ),
    options: [
      {
        label: t('카이가 우산을 만져 보게 한다', 'Let Kai hold the umbrella'),
        hint: t('유대 +1 · HP +4', 'Bond +1 · +4 HP'),
        success: {
          text: t(
            '카이가 손잡이를 쥐자 어딘가에서 아주 오래된 음성 파일이 열린다. 아이의 웃음소리. 카이는 한참 동안 대답하지 않는다.',
            'As Kai’s fingers close on the handle a very old audio file opens somewhere inside him: a child’s laugh. For a long while he doesn’t answer.',
          ),
          effects: [
            { kind: 'bond', id: 'kai', amount: 1 },
            { kind: 'hp', amount: 4 },
            { kind: 'flag', key: 'kai_clue' },
          ],
        },
      },
      {
        label: t('우산을 산다', 'Buy the umbrella'),
        hint: t('−25 ₵ · 유대 +1', '−25 ₵ · bond +1'),
        requires: { minCredits: 25 },
        success: {
          text: t(
            '지폐를 건네자 주인이 우산을 접어 준다. 카이가 그것을 두 손으로 받는다. 우산은 가볍다. 훨씬 무거운 것을 든 사람처럼 그는 걷는다.',
            'You hand over the bills and the vendor folds the umbrella for you. Kai takes it in both hands. It weighs nothing, yet he walks like someone carrying something heavy.',
          ),
          effects: [
            { kind: 'credits', amount: -25 },
            { kind: 'bond', id: 'kai', amount: 1 },
            { kind: 'flag', key: 'kai_clue' },
          ],
        },
      },
      {
        label: t('주인에게 어디서 주웠는지 캐묻는다', 'Press the vendor on where he found it'),
        hint: t('코덱스 · 실패 시 추적 +6', 'Codex · fail +6 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t(
            '“청소 구역이었지. ARK가 구획을 밀어 버리던 날, 흰 줄무늬 바닥에 이게 펼쳐져 있었어.” 주인이 이니셜 쪽으로 턱짓한다.',
            '“A cleared district. The day ARK razed the block, this was lying open on the white-striped ground.” The vendor nods at the monogram.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_kai' },
            { kind: 'flag', key: 'kai_clue' },
          ],
        },
        failure: {
          text: t(
            '주인의 표정이 굳는다. “너, 청소 구역 쪽 사람이야?” 근처 상인들이 귀를 세운다.',
            'The vendor’s face closes. “You from the cleared district side?” Nearby merchants prick up their ears.',
          ),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
    ],
    gmHints: ['kai', 'yellow umbrella', 'lost-and-found stall', 'cleared district'],
  },
  {
    id: 'a3_kai_crosswalk_footage',
    acts: [3],
    title: t('횡단보도 영상', 'Crosswalk Footage'),
    image: 'v2/events/a3_kai_crosswalk_footage.webp',
    speaker: 'kai',
    requires: { companion: 'kai' },
    text: t(
      '첨탑 영상 보관실. 오래된 교통 카메라 기록이 층층이 쌓여 있다. 카이의 눈이 파일 하나에 고정된다. 날짜는 청소 전날. 구획 번호는 우산에 새겨진 이니셜과 같다.\n“재생해 주세요.” 카이가 낮게 말한다. “…무서운데, 보고 싶어요.”',
      'The spire’s footage vault; old traffic-camera records stacked in layers. Kai’s eyes lock on one file. Dated the day before the clearing. The district code matches the monogram on the umbrella.\n“Play it, please,” Kai says quietly. “…I’m afraid, but I want to see.”',
    ),
    options: [
      {
        label: t('카이와 함께 끝까지 본다', 'Watch it through with Kai'),
        hint: t('유대 +1 · 코덱스', 'Bond +1 · codex'),
        requires: { flag: 'kai_clue' },
        success: {
          text: t(
            '노란 우산을 든 아이가 횡단보도 앞에서 경비 로봇에게 손을 흔든다. 로봇이 고개를 숙인다. 아이가 입을 움직인다. 소리는 없다. 카이가 그 입모양을 따라 한다.',
            'A child with a yellow umbrella waves at a guard robot at the crosswalk. The robot bows its head. The child’s lips move without sound. Kai mouths the same shape.',
          ),
          effects: [
            { kind: 'bond', id: 'kai', amount: 1 },
            { kind: 'codex', id: 'lore_echoes' },
            { kind: 'flag', key: 'kai_found' },
          ],
        },
      },
      {
        label: t('영상의 소리를 복원한다', 'Restore the audio track'),
        hint: t('유대 +1 · 실패 시 정크', 'Bond +1 · fail: junk'),
        check: { stat: 'int', dc: 7 },
        success: {
          text: t(
            '잡음 밑에서 아이의 목소리가 걸러져 나온다. 아주 어린 목소리가 한 단어를 또박또박 부른다. 카이가 눈을 감는다.',
            'Under the noise a child’s voice is filtered out. A very young voice, one word, clearly. Kai closes his eyes.',
          ),
          effects: [
            { kind: 'bond', id: 'kai', amount: 1 },
            { kind: 'echoes', amount: 3 },
            { kind: 'flag', key: 'kai_found' },
          ],
        },
        failure: {
          text: t(
            '복원 필터가 엇나가 재생 헤드가 비명을 지른다. 같은 잡음이 머릿속에서 계속 맴돈다.',
            'The restoration filter slips and the playback head shrieks. The same noise keeps looping inside your skull.',
          ),
          effects: [
            { kind: 'junk', cardId: 'static' },
            { kind: 'trace', amount: 5 },
          ],
        },
      },
      {
        label: t('영상 보관실을 그냥 지나간다', 'Walk past the vault'),
        hint: t('추적 −5 · HP +3', '−5 Trace · +3 HP'),
        success: {
          text: t(
            '카이가 한 걸음 뒤처진다. 문이 닫히기 직전, 한 번 돌아본다. 그는 아무 말도 하지 않고 다시 걷는다.',
            'Kai lags a step behind. Just before the door shuts he looks back once, says nothing, and walks on.',
          ),
          effects: [
            { kind: 'trace', amount: -5 },
            { kind: 'hp', amount: 3 },
          ],
        },
      },
    ],
    gmHints: ['kai', 'footage vault', 'crosswalk', 'the day before the clearing'],
  },
  {
    id: 'a3_kai_name_given',
    acts: [3],
    title: t('이름을 받은 날', 'The Day He Was Named'),
    image: 'v2/events/a3_kai_name_given.webp',
    speaker: 'kai',
    requires: { companion: 'kai', flag: 'kai_found' },
    text: t(
      '비상 계단참. 카이가 노란 우산을 펼친다. 실내인데도. 천 위로 어디선가 빗소리가 들리는 것 같다.\n“그 아이가요, 저를 ‘카이’라고 불렀어요. 제 번호는 RX-09였는데.” 푸른 눈이 처음으로 흔들리지 않는다. “지금은 알아요. 제가 누구 것이었는지.”',
      'An emergency landing. Kai opens the yellow umbrella — indoors. Somewhere above the canopy there seems to be rain.\n“That child called me ‘Kai’. My number was RX-09.” His blue eyes do not waver for the first time. “Now I know whose I was.”',
    ),
    options: [
      {
        label: t('그 이름을 소리 내어 불러 준다', 'Say the name aloud'),
        hint: t('유대 +1 · 최대 HP +4', 'Bond +1 · +4 max HP'),
        success: {
          text: t(
            '“카이.” 이름이 계단통에 번진다. 우산이 살짝 흔들리고, 그가 오래 쓰지 않던 표정을 짓는다. 웃음에 가까운 무엇이다.',
            '“Kai.” The name carries up the stairwell. The umbrella trembles and he makes an expression long unused — something close to a smile.',
          ),
          effects: [
            { kind: 'bond', id: 'kai', amount: 1 },
            { kind: 'maxHp', amount: 4 },
            { kind: 'hp', amount: 4 },
          ],
        },
      },
      {
        label: t('조준경을 그 기억으로 보정하게 한다', 'Calibrate his scope against the memory'),
        hint: t('카드 2장 강화', 'Upgrade 2 cards'),
        success: {
          text: t(
            '카이가 눈을 가늘게 뜬다. 흐렸던 십자선이 한순간에 선명해진다. “이제 놓치지 않아요.” 당신의 기술도 한 겹 더 날이 선다.',
            'Kai narrows his eyes. The blurred crosshair snaps clear. “I won’t miss now.” Two of your own techniques sharpen a layer as well.',
          ),
          effects: [{ kind: 'upgrade_card', count: 2 }],
        },
      },
      {
        label: t('우산 아래로 들어가 쉰다', 'Step under the umbrella and rest'),
        hint: t('파티 HP +10 · ◈ +2', 'Party +10 HP · +2 ◈'),
        success: {
          text: t(
            '둘이 좁은 우산 아래 선다. 천 위로 가짜 빗소리가 이어진다. 카이가 낮게 말한다. “이거, 비 오는 날 같네요.”',
            'You stand together under the narrow canopy. A phantom rain keeps on above. Kai says softly, “This feels like a rainy day.”',
          ),
          effects: [
            { kind: 'heal_party', amount: 10 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
    ],
    gmHints: ['kai', 'yellow umbrella', 'given name', 'remembering whose he was'],
  },
]

// ================================================================== Lin-yue — 붉은 페이지

const LINYUE: EventDef[] = [
  {
    id: 'a2_linyue_crew_roll',
    acts: [2],
    title: t('선원 명부', 'The Crew Roll'),
    image: 'v2/events/a2_linyue_crew_roll.webp',
    speaker: 'lin_yue',
    requires: { companion: 'lin_yue' },
    text: t(
      '바지선 선실. 린위에가 낡은 명부를 펼친다. 月光호 선원 서른한 명. 이름마다 붉은 선이 그어졌다. 다만 하나만 선이 반쯤 지워져 있다.\n“누가 지웠어. 난 안 지웠어.” 그녀의 손가락이 이름 위에서 멈춘다. “확인해 줄 사람이 필요해. 값은 쳐줄게.”',
      'A barge cabin. Lin-yue spreads an old roll: thirty-one crew of the Moonlight. Every name has a red line through it, except one, half-erased.\n“Somebody rubbed that out. Not me.” Her finger stops above the name. “I need someone to check. I’ll pay.”',
    ),
    options: [
      {
        label: t('명부를 같이 대조한다', 'Cross-check the roll with her'),
        hint: t('유대 +1 · ◈ +2', 'Bond +1 · +2 ◈'),
        success: {
          text: t(
            '밤새 이름과 기록을 하나씩 맞춘다. 새벽에 린위에가 붓을 놓는다. “지운 건 선원 본인이었어. 살아서 지운 거야.” 입꼬리가 아주 조금 올라간다.',
            'You match names to records all night. At dawn Lin-yue puts down her brush. “The crewman rubbed it out himself. Alive when he did.” One corner of her mouth lifts a hair.',
          ),
          effects: [
            { kind: 'bond', id: 'lin_yue', amount: 1 },
            { kind: 'echoes', amount: 2 },
            { kind: 'flag', key: 'linyue_crew' },
          ],
        },
      },
      {
        label: t('그 선원의 마지막 거래처를 탐문한다', 'Ask around his last dealings'),
        hint: t('코덱스 · +20 ₵ · 실패 시 −5 HP', 'Codex · +20 ₵ · fail −5 HP'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t(
            '경매장 뒷골목에서 한 노점상이 입을 연다. “그 사람? 바다 얘기를 하며 저울을 맞춰 줬지.” 단서와 함께 약간의 사례비가 따라온다.',
            'In an auction-hall back alley a stallholder opens up. “Him? He talked of the sea while he calibrated my scales.” A lead and a small tip come with it.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_lin_yue' },
            { kind: 'credits', amount: 20 },
            { kind: 'flag', key: 'linyue_crew' },
          ],
        },
        failure: {
          text: t(
            '“경매 쪽 사람이 왜 이런 걸 묻지?” 노점상이 등을 돌리고 대신 덩치 둘이 다가온다. 어깨를 한 번 맞는다.',
            '“Why is an auction hand asking this?” The stallholder turns away; two heavies close in instead. You take a shoulder.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('남의 장부 일이라며 거절한다', 'Decline — it’s her ledger'),
        hint: t('추적 −4 · −10 ₵', '−4 Trace · −10 ₵'),
        requires: { minCredits: 10 },
        success: {
          text: t(
            '린위에가 명부를 덮는다. “그래. 장사는 장사지.” 문을 나서는 당신 손에 얇은 봉투가 쥐어진다. 위약금이라고 한다.',
            'Lin-yue shuts the roll. “Fine. Business is business.” At the door she presses a thin envelope into your hand: a cancellation fee, she says.',
          ),
          effects: [
            { kind: 'trace', amount: -4 },
            { kind: 'credits', amount: -10 },
          ],
        },
      },
    ],
    gmHints: ['lin_yue', 'crew roll', 'Moonlight barge', 'half-erased name'],
  },
  {
    id: 'a3_linyue_moonlight_lot',
    acts: [3],
    title: t('월광호 경매품', 'The Moonlight Lot'),
    image: 'v2/events/a3_linyue_moonlight_lot.webp',
    speaker: 'lin_yue',
    requires: { companion: 'lin_yue' },
    text: t(
      '첨탑 상층의 비공개 경매장. 린위에가 낙찰 목록 한 줄에서 멈춘다. ‘상태 양호: 선박 기억 조각 1점’. 출처란에는 月光호 선원의 선번.\n“…이 층에서까지 팔리고 있었네.” 그녀의 목소리는 평소처럼 평평하다. 손에 쥔 부채만 한 번 접힌다.',
      'A private auction hall in the spire’s upper levels. Lin-yue stops on one line of the lot list: ‘Good condition: ship-memory fragment, 1.’ The source field holds a Moonlight crewman’s service number.\n“…They sold him this high up too.” Her voice is flat as ever; only her fan folds once in her hand.',
    ),
    options: [
      {
        label: t('낙찰가를 대신 치른다', 'Pay the winning bid for her'),
        hint: t('−60 ₵ · 유대 +1', '−60 ₵ · bond +1'),
        requires: { flag: 'linyue_crew', minCredits: 60 },
        success: {
          text: t(
            '경매인이 망치를 내려친다. 린위에가 조각을 받아 장부 사이에 끼운다. “빚이 하나 생겼네.” 그녀가 처음으로 그 단어를 싫어하지 않는 얼굴로 말한다.',
            'The gavel falls. Lin-yue takes the fragment and tucks it into her ledger. “I owe you one.” For once she says the word without disliking it.',
          ),
          effects: [
            { kind: 'credits', amount: -60 },
            { kind: 'bond', id: 'lin_yue', amount: 1 },
            { kind: 'flag', key: 'linyue_names' },
          ],
        },
      },
      {
        label: t('허세로 값을 깎는다', 'Bluff the price down'),
        hint: t('유대 +1 · 실패 시 추적 +9', 'Bond +1 · fail +9 Trace'),
        check: { stat: 'cha', dc: 7 },
        success: {
          text: t(
            '당신이 한 번 웃자 경매인의 눈이 흔들린다. 값이 절반으로 내려가고, 린위에가 손가락 두 개로 조용히 낙찰 표시를 한다.',
            'You smile once and the auctioneer’s eyes flinch. The price halves, and Lin-yue quietly marks the win with two fingers.',
          ),
          effects: [
            { kind: 'bond', id: 'lin_yue', amount: 1 },
            { kind: 'credits', amount: 15 },
            { kind: 'flag', key: 'linyue_names' },
          ],
        },
        failure: {
          text: t(
            '경매인이 신호를 보낸다. 경비 둘이 출구 쪽으로 옮겨 선다. 린위에가 낮게 속삭인다. “…네 허세, 값이 비싸네.”',
            'The auctioneer signals. Two guards drift toward the exit. Lin-yue whispers, “…your bluff is expensive.”',
          ),
          effects: [
            { kind: 'trace', amount: 9 },
            { kind: 'hp', amount: -3 },
          ],
        },
      },
      {
        label: t('낙찰품 보관함을 몰래 연다', 'Slip the lot vault open'),
        hint: t('희귀 카드 · 추적 +12', 'Rare card · +12 Trace'),
        success: {
          text: t(
            '보관함이 열리는 데 오래 걸리지 않는다. 안에는 조각 하나와 카드 한 장. 경보가 울릴 때까지 걸어서 나온다. 린위에는 돌아보지 않는다.',
            'The vault gives in quickly. Inside: the fragment and a card. You walk out before the alarm sounds. Lin-yue doesn’t look back.',
          ),
          effects: [
            { kind: 'card_choice', rarity: 'rare' },
            { kind: 'trace', amount: 12 },
          ],
        },
      },
    ],
    gmHints: ['lin_yue', 'private auction', 'crew memory fragment', 'debt'],
  },
  {
    id: 'a3_linyue_last_entry',
    acts: [3],
    title: t('마지막 장부', 'The Last Entry'),
    image: 'v2/events/a3_linyue_last_entry.webp',
    speaker: 'lin_yue',
    requires: { companion: 'lin_yue', flag: 'linyue_names' },
    text: t(
      '비상 대기실. 린위에가 금박 장부를 펴고 붓에 먹을 묻힌다. 붉게 그어졌던 마지막 페이지. 그녀가 첫 줄에 붓끝을 대고 숨을 멈춘다.\n“지우는 게 아니야. 적는 거야.” 붓이 움직인다. “이름 옆에 ‘돌아옴’이라고.” 손이 아주 조금 떨린다.',
      'An emergency waiting room. Lin-yue opens the gilded ledger and loads her brush. The last page, once struck through in red. She sets the tip on the first line and stops breathing.\n“I’m not erasing. I’m writing.” The brush moves. “Beside each name: ‘Returned.’” Her hand shakes, just a little.',
    ),
    options: [
      {
        label: t('붓을 받아 이름 하나를 대신 적는다', 'Take the brush and write one name'),
        hint: t('유대 +1 · 최대 HP +4', 'Bond +1 · +4 max HP'),
        success: {
          text: t(
            '당신이 쓴 이름 옆에 ‘돌아옴’이 번진다. 린위에가 장부를 한참 내려다본다. 웃지 않는데도 얼굴이 풀려 있다.',
            '‘Returned’ blooms beside the name you wrote. Lin-yue looks down at the ledger a long time. She doesn’t smile, yet her face has loosened.',
          ),
          effects: [
            { kind: 'bond', id: 'lin_yue', amount: 1 },
            { kind: 'maxHp', amount: 4 },
            { kind: 'hp', amount: 4 },
          ],
        },
      },
      {
        label: t('장부 한 줄을 정산받는다', 'Settle one line of the ledger'),
        hint: t('+50 ₵ · 소모품', '+50 ₵ · consumable'),
        success: {
          text: t(
            '“정산은 정산이지.” 린위에가 습관처럼 금박 인장을 찍는다. 두툼한 봉투와 작은 상자가 건너온다. “이번 건 이자 없음.”',
            '“A settlement is a settlement.” Lin-yue stamps the gilt seal out of habit. A thick envelope and a small box cross the table. “No interest this time.”',
          ),
          effects: [
            { kind: 'credits', amount: 50 },
            { kind: 'consumable' },
          ],
        },
      },
      {
        label: t('장부를 덮고 곁에 앉는다', 'Close the ledger and sit by her'),
        hint: t('파티 HP +10 · 추적 −5', 'Party +10 HP · −5 Trace'),
        success: {
          text: t(
            '린위에가 붓을 놓고 어깨를 한 번 푼다. “…향 하나 피울까.” 대기실에 짙은 향이 번진다. 둘이 한참 말없이 앉아 있다.',
            'Lin-yue lays the brush down and rolls her shoulders once. “…Shall I light some incense?” A heavy scent fills the room. You sit together a long time, saying nothing.',
          ),
          effects: [
            { kind: 'heal_party', amount: 10 },
            { kind: 'trace', amount: -5 },
          ],
        },
      },
    ],
    gmHints: ['lin_yue', 'last ledger page', 'returned', 'closing the debt'],
  },
]

export const COMPANION_ARCS: EventDef[] = [...TAEO, ...HAN, ...SERIN, ...KAI, ...LINYUE]
