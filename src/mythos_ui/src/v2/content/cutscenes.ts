// Companion bond cutscenes (ported from 1.x `directives/companions/*.md`, retuned to 2.0's companions and speech
// registers). Two per companion, one per bond tier: tier 2 plays the first time that bond is reached at a safehouse
// ("they let you in a little"), tier 3 the first time it is maxed ("they trust you"). Quiet rest scenes — a gesture,
// one line of dialogue, no choice — deliberately NOT repeating the beats the companion arcs (eventsMore/eventsArcs)
// already play. Unlocked scenes are kept in the profile (`MetaProfile.cutscenes`) and replay from the Archive gallery.
//
// Voices: Se-rin blunt 반말 · Tae-o short declaratives (~다.) · Han light slangy 반말 · Su-ah gentle 반말 ·
// Kai polite 해요체 · Lin-yue lazy, knowing 반말.
import type { Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export type CutsceneTier = 2 | 3

export interface CutsceneDef {
  id: string
  companion: string
  /** Bond level that unlocks it (2 or 3). */
  tier: CutsceneTier
  title: Text
  text: Text
  /** `v2/cutscenes/<id>.webp` (scripts/v2_assets `cutscenes` group). */
  image: string
}

export const CUTSCENES: CutsceneDef[] = [
  // ---------------------------------------------------------------- Se-rin
  {
    id: 'se_rin_first_light',
    companion: 'se_rin',
    tier: 2,
    title: t('깜빡이는 신뢰', 'A Flickering Trust'),
    text: t(
      '세린이 낡은 네온 간판 아래 잠깐 멈춘다. 추격의 소음이 한 블록 뒤로 멀어지자 처음으로 정면으로 바라본다.\n“넌… 생각보다 오래 버티네.”\n경계가 아주 조금 풀린 목소리. 건네받은 합성 커피는 미지근하다. 이 도시에서 누군가 아무 대가 없이 뭘 내민 건 처음이다. 세린은 다시 어둠 쪽으로 시선을 돌리지만, 아까보다 한 발짝 가까이 서 있다.',
      'Se-rin stops under an old neon sign. When the pursuit noise falls a block behind, she looks straight at you for the first time.\n“You… last longer than I thought.”\nThe guard in her voice slips a little. The synthetic coffee she hands you is lukewarm. In this city nobody has handed you anything for free before. She looks back into the dark, but she is standing one step closer than before.',
    ),
    image: 'v2/cutscenes/se_rin_first_light.webp',
  },
  {
    id: 'se_rin_promise',
    companion: 'se_rin',
    tier: 3,
    title: t('약속의 잔향', 'Echo of a Promise'),
    text: t(
      '비상 계단 꼭대기. 세린이 헬멧을 벗자 멀리 첨탑의 불빛이 그녀의 윤곽을 차갑게 그린다.\n“다음 루프에서 내가 널 못 알아봐도.” 말을 고르느라 잠깐 멈춘다. “이 말만은 어딘가에 남겨 둬. 난 널 두고 먼저 사라지지 않아.”\n기억이 매번 지워지는 세계에서 지키지 못할 수도 있는 약속. 그래도 세린은 새끼손가락을 내민다. 어디에도 백업되지 않는 종류의 맹세다.',
      'The top of an emergency stair. Se-rin takes off her helmet; the Spire’s distant lights trace her outline in cold.\n“Even if I don’t recognise you next loop.” She pauses, picking the words. “Keep this somewhere. I don’t disappear on you first.”\nA promise she may not be able to keep, in a world that wipes its memory. She holds out her little finger anyway — the kind of oath that is backed up nowhere.',
    ),
    image: 'v2/cutscenes/se_rin_promise.webp',
  },
  // ---------------------------------------------------------------- Tae-o
  {
    id: 'tae_o_unlatched',
    companion: 'tae_o',
    tier: 2,
    title: t('잠그지 않은 홀스터', 'The Unlatched Holster'),
    text: t(
      '태오는 감시 카메라가 닿지 않는 계단참에서 제복의 휘장을 뜯어낸다. 총은 아직 허리에 있다. 홀스터의 잠금은 풀려 있다.\n“예전엔 명령이 틀렸는지 묻는 데 한 발이면 충분했다.”\n그가 휘장을 네 손에 쥐여 준다.\n“다시 사냥개가 되면 이걸 보여 줘라. 한 번은 내 선택으로 멈췄다는 증거다.”',
      'On a landing no camera reaches, Tae-o tears the insignia off his uniform. The gun is still on his hip. The holster is unlatched.\n“Once, one shot was enough to ask whether the order was wrong.”\nHe presses the insignia into your hand.\n“If I turn hound again, show me this. Proof that I stopped once, by my own choice.”',
    ),
    image: 'v2/cutscenes/tae_o_unlatched.webp',
  },
  {
    id: 'tae_o_dawn_watch',
    companion: 'tae_o',
    tier: 3,
    title: t('새벽 보초', 'Dawn Watch'),
    text: t(
      '모두가 잠든 안가. 태오는 문 옆에 등을 대고 앉아 밤새 한 번도 눈을 감지 않았다. 새벽빛이 창틈으로 들어오자 그가 식은 차를 네 쪽으로 민다.\n“십 년 동안 이 자세로 사람을 잡았다.”\n잠깐의 침묵.\n“지금은 지키는 쪽이다. 그쪽이 더 오래 앉아 있을 만하다.”',
      'The safehouse sleeps. Tae-o sits with his back to the door and has not closed his eyes all night. When dawn light slips through the shutter he nudges a cold cup of tea toward you.\n“Ten years in this posture, catching people.”\nA short silence.\n“Now I guard. This is a better thing to sit still for.”',
    ),
    image: 'v2/cutscenes/tae_o_dawn_watch.webp',
  },
  // ---------------------------------------------------------------- Han
  {
    id: 'han_dead_channel',
    companion: 'han',
    tier: 2,
    title: t('죽은 채널의 목소리', 'A Voice on a Dead Channel'),
    text: t(
      '한이 관리망이 오래전에 버린 주파수 하나를 열어 둔다. 잡음 사이로 네 심장 소리와 그의 키보드 소리만 오간다.\n“추적도 암호화도 없어. 그래서 아무도 안 듣는 채널이지.”\n침묵이 길어지자 그가 어색하게 덧붙인다.\n“연결이 꼭 정보 보내려고만 있는 건 아니잖아.”\n로그를 남기지 않는 해커가 그날만은 접속을 끊지 않는다.',
      'Han opens a frequency the grid abandoned long ago. Through the static pass only your heartbeat and his keyboard.\n“No tracing, no encryption. That’s why nobody listens.”\nWhen the silence runs long he adds, awkwardly:\n“A connection isn’t only for sending data, you know.”\nThe hacker who never leaves a log doesn’t hang up, this once.',
    ),
    image: 'v2/cutscenes/han_dead_channel.webp',
  },
  {
    id: 'han_name_field',
    companion: 'han',
    tier: 3,
    title: t('이름 칸', 'The Name Field'),
    text: t(
      '버려진 단말 앞. 이름 칸 하나만 깜박이는 낡은 등록 화면이다. 한이 한참 보다가 장난처럼 자판에 손을 올린다.\n“야, 웃지 마. 처음이야. 내가 나를 적는 거.”\n그는 세 글자를 천천히 친다. 저장 키 위에서 손가락이 멈칫한다. 그러다 한이 피식 웃으며 누른다.\n“됐다. 이제 나도 어딘가 있는 놈이네.”',
      'An abandoned terminal, an old registration screen with a single blinking name field. Han stares at it a long time, then rests his hands on the keys like it’s a joke.\n“Hey, don’t laugh. First time. Me, writing me.”\nHe types slowly. His finger hesitates over Save. Then he grins and presses it.\n“Done. Now I’m somewhere, too.”',
    ),
    image: 'v2/cutscenes/han_name_field.webp',
  },
  // ---------------------------------------------------------------- Su-ah
  {
    id: 'su_ah_warm_crystal',
    companion: 'su_ah',
    tier: 2,
    title: t('체온이 남은 기억', 'A Memory with Warmth'),
    text: t(
      '수아가 네 손바닥에 작은 기억 결정을 올려놓는다. 전투도 비밀도 아니다. 비 오는 날 누군가 창문을 닫아 주던 감각뿐이다.\n“쓸모없는 기억이라 관리망이 제일 먼저 버렸어.”\n결정은 곧 녹아 사라지지만 손에는 희미한 온기가 남는다. 수아가 웃는다.\n“사라져도 몸이 기억하는 게 있어. 다음 루프의 너도 그랬으면 좋겠다.”',
      'Su-ah sets a small memory crystal in your palm. Nothing about battle or secrets — only the feeling of someone closing a window for you on a rainy day.\n“Useless memory. The grid threw it out first.”\nThe crystal melts away, but a faint warmth stays in your hand. Su-ah smiles.\n“Some things the body keeps even when they’re gone. I hope next-loop you does too.”',
    ),
    image: 'v2/cutscenes/su_ah_warm_crystal.webp',
  },
  {
    id: 'su_ah_hammer_rhythm',
    companion: 'su_ah',
    tier: 3,
    title: t('망치의 박자', 'The Hammer’s Rhythm'),
    text: t(
      '불씨가 낮게 남은 작업대. 수아가 네 손에 작은 망치를 쥐여 주고 그 위에 자기 손을 얹는다.\n“세게 치는 게 아니야. 박자를 맞추는 거야.”\n한 번, 또 한 번. 쇠가 아주 조금씩 모양을 얻는다. 어느새 둘의 박자가 하나가 되어 있다.\n“봐. 소리가 맞으면 쇠가 말을 들어. 사람도 비슷하더라.”',
      'A workbench with a low ember. Su-ah puts a small hammer in your hand and lays her own over it.\n“It isn’t about hitting hard. It’s about keeping time.”\nOnce, then again. The metal takes shape a little at a time. Before you know it your rhythm and hers are one.\n“See? When the sound matches, the iron listens. People turn out to be similar.”',
    ),
    image: 'v2/cutscenes/su_ah_hammer_rhythm.webp',
  },
  // ---------------------------------------------------------------- Kai
  {
    id: 'kai_counting_stars',
    companion: 'kai',
    tier: 2,
    title: t('별을 세는 기계', 'The Machine That Counts Stars'),
    text: t(
      '카이가 폐쇄된 승강장의 광고 패널을 밤하늘처럼 어둡게 눌러 놓는다. 화면에 남은 불량 화소 열일곱 개를 가리킨다.\n“사람은 볼 수 없는 별에도 이름을 붙이나요?”\n그렇다고 답하자 카이는 그중 하나를 당신 이름으로 저장한다. 다음 루프에 지워진다는 경고가 떠도 그는 저장을 다시 누른다.\n“사라지는 것과 처음부터 없었던 것은 다르니까요.”',
      'Kai dims a shut-down platform’s ad panel to night-sky dark and points at the seventeen dead pixels left on the screen.\n“Do people name the stars they can’t see?”\nWhen you say yes, he saves one of them under your name. A warning says it will be wiped next loop. He presses Save again.\n“Disappearing is not the same as never having been.”',
    ),
    image: 'v2/cutscenes/kai_counting_stars.webp',
  },
  {
    id: 'kai_rain_sound',
    companion: 'kai',
    tier: 3,
    title: t('비 오는 소리', 'The Sound of Rain'),
    text: t(
      '안가의 구석. 카이가 작은 스피커로 빗소리를 낮게 튼다. 오래된 녹음이라 잡음이 섞여 있다.\n“저는 비를 맞아 본 적이 없어요.”\n그는 손바닥을 천천히 위로 펴 본다.\n“그래도 이 소리는 알아요. 누군가 옆에서 같이 듣고 있었던 소리예요. 지금처럼요.”\n빗소리 사이로 카이의 눈이 아주 조금 따뜻한 노란빛을 띤다.',
      'A corner of the safehouse. Kai plays rain through a small speaker, quietly. The recording is old and hissing.\n“I’ve never been rained on.”\nHe slowly turns his palm upward.\n“But I know this sound. Someone was beside me, listening to it too. Like now.”\nBetween the drops, Kai’s eyes take on the faintest warm yellow.',
    ),
    image: 'v2/cutscenes/kai_rain_sound.webp',
  },
  // ---------------------------------------------------------------- Lin-yue
  {
    id: 'lin_yue_margin',
    companion: 'lin_yue',
    tier: 2,
    title: t('장부의 여백', 'The Margin of the Ledger'),
    text: t(
      '야시장이 문을 닫은 뒤, 린위에가 홀로그램 장부에서 네 빚 한 줄을 지운다.\n“공짜라고 착각하진 마. 오늘은 내가 계산을 틀린 거야.”\n그런데 지워진 칸 옆에는 돈 대신 네가 무사히 돌아온 시각이 적혀 있다. 그녀는 화면을 접으며 시선을 피한다.\n거래만 믿는 사람에게 안부는, 기록할 계정이 없는 자산이다.',
      'After the night market closes, Lin-yue strikes one line of your debt from the holographic ledger.\n“Don’t mistake it for free. Today I miscounted.”\nBeside the erased cell, instead of a sum, the time you returned safely is written. She folds the screen away and looks elsewhere.\nTo someone who trusts only trade, worry is an asset with no account to be kept in.',
    ),
    image: 'v2/cutscenes/lin_yue_margin.webp',
  },
  {
    id: 'lin_yue_incense',
    companion: 'lin_yue',
    tier: 3,
    title: t('향 한 대', 'One Stick of Incense'),
    text: t(
      '바지선 선실의 불이 낮다. 린위에가 향 한 대를 피워 빈 잔 옆에 꽂는다. 연기가 천천히 천장으로 올라간다.\n“월광호 사람들 몫이야. 값은 내가 냈어.”\n그리고 하나를 더 꺼내 네 쪽으로 민다.\n“네 몫은 서비스야. 이거 소문내면 장부에 올린다.”\n그녀의 웃음은 평소처럼 능청스럽지만 눈은 연기 쪽에 오래 머문다.',
      'The barge cabin is dim. Lin-yue lights one stick of incense and sets it beside an empty cup. Smoke curls slowly toward the ceiling.\n“For the Moonlight’s crew. I paid for it.”\nShe takes out another and slides it toward you.\n“Yours is on the house. Tell anyone and it goes in the ledger.”\nHer smile is as slippery as ever, but her eyes stay on the smoke a long time.',
    ),
    image: 'v2/cutscenes/lin_yue_incense.webp',
  },
]

/** The scenes a companion has, in tier order. */
export function cutscenesFor(companion: string): CutsceneDef[] {
  return CUTSCENES.filter((c) => c.companion === companion).sort((a, b) => a.tier - b.tier)
}

/** The scene earned by reaching `bond` with `companion`, if there is one. */
export function cutsceneAtBond(companion: string, bond: number): CutsceneDef | undefined {
  return CUTSCENES.find((c) => c.companion === companion && c.tier === bond)
}

export function cutsceneById(id: string): CutsceneDef | undefined {
  return CUTSCENES.find((c) => c.id === id)
}
