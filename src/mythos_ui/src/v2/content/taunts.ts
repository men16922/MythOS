// Mythos 2.0 — what talking enemies say at a turning point of a fight (ui/shell/EnemyTaunt.tsx). The authored line
// shows at once; the AI line (server persona, src/mythos_v2/taunt.py, same ids) may replace it once.
//   hurt    — the speaker drops to half its HP for the first time this fight
//   winning — the connector is down to 30 % HP or less
import type { Text } from '../engine/types.ts'

export type TauntMoment = 'hurt' | 'winning'

const t = (ko: string, en: string): Text => ({ ko, en })

export const TAUNTS: Record<string, Record<TauntMoment, Text[]>> = {
  haetae: {
    hurt: [t('경고. 장갑 손상. 진압 절차를 계속합니다.', 'Warning. Armour breached. Suppression continues.'), t('해산하십시오. 이 구역은 통제 중입니다.', 'Disperse. This sector is under control.')],
    winning: [t('저항을 멈추십시오. 연행에 협조 바랍니다.', 'Cease resistance. Cooperate with detention.'), t('더는 버틸 수 없습니다. 그 자리에 엎드리십시오.', 'You cannot hold out. Get down where you are.')],
  },
  echo_eater: {
    hurt: [t('아파… 누구 목소리로 울어야 하지?', 'It hurts… whose voice should I cry in?'), t('흩어져도 돼. 너를 먹으면 다시 모여.', "Let me scatter. I’ll gather again inside you.")],
    winning: [t('조금만 더. 네 기억은 따뜻한 냄새가 나.', 'Just a little more. Your memories smell warm.'), t('괜찮아, 잊는 건 하나도 안 아파.', "Shh. Forgetting doesn’t hurt at all.")],
  },
  trooper_captain: {
    hurt: [t('좋아, 제법이군. 이제 진짜로 간다.', 'Fine. Not bad. Now we do this for real.'), t('그 정도로 내가 눕진 않아.', "That won’t put me down.")],
    winning: [t('여기까지다, 신병.', 'This is where it ends, recruit.'), t('숨 고를 시간은 없다. 끝내지.', "No time to catch your breath. Let’s finish.")],
  },
  glitch_reaver: {
    hurt: [t('깨, 깨졌어… 그래도 아직, 아직 배고파.', 'Br-broken… still, still hungry.'), t('부품, 부품이 모자라. 네 걸로 채운다.', "Parts, parts missing. I’ll take yours.")],
    winning: [t('네 파편, 파편 내 거야.', 'Your fragments, fragments are mine.'), t('곧 조용해져. 조용, 조용히.', 'Soon quiet. Quiet, quiet.')],
  },
  incinerator: {
    hurt: [t('소각 효율이 저하되었습니다. 처리는 계속됩니다.', 'Burn efficiency reduced. Processing continues.'), t('냉각 경고. 고객님의 소각은 지연되지 않습니다.', 'Coolant warning. Your incineration will not be delayed.')],
    winning: [t('소각 대상을 확인했습니다. 잠시만 기다려 주십시오.', 'Incineration subject confirmed. Please hold.'), t('곧 차례입니다. 남은 물품을 정리해 주십시오.', 'Your turn is next. Please gather your belongings.')],
  },
  jujak_core: {
    hurt: [t('노심 온도 임계 돌파. 이 구역 전면 소각으로 전환합니다.', 'Core temperature critical. Escalating to full sector incineration.'), t('격벽 개방. 모든 가연성 표적을 재로 환원합니다.', 'Shutters open. Reducing all combustible targets to ash.')],
    winning: [t('퇴로는 전부 불탔습니다. 소각로 안에서 안식을 찾으십시오.', 'All exits are burning. Find rest inside the furnace.'), t('열원 반응 소멸 임박. 정화 절차를 마무리합니다.', 'Thermal signature fading. Concluding purification protocol.')],
  },
  arachne_queen: {
    hurt: [t('끼르르… 내 전선, 내 둥지를 건드렸어…!', 'Krrr… you touched my wires, my nest…!'), t('아이들아, 깨어나라. 먹이가 스스로 거미줄을 흔든다.', 'Wake, my brood. The prey shakes the web itself.')],
    winning: [t('전류에 묶인 채로 천천히 말라 가거라.', 'Wither slowly, bound in the current.'), t('네 신경망도 훌륭한 전선이 될 거야.', 'Your nervous system will make fine wiring.')],
  },
  baekho_stalker: {
    hurt: [t('광학 위장 재동기화. 표적의 반격 속도가 예상치를 상회합니다.', 'Resyncing optical camo. Target counter-speed exceeds projection.'), t('피 냄새가 짙어졌군. 이제부터가 진짜 사냥이다.', 'The scent of blood thickens. Now the real hunt begins.')],
    winning: [t('도망쳐 봐라. 걸음을 옮길 때마다 상처가 더 벌어질 뿐이다.', 'Run if you like. Every step only tears the wound wider.'), t('시야에서 사라진 순간, 이미 네 목덜미 뒤다.', 'The moment I leave your sight, I am already behind your neck.')],
  },
  hyeonmu_bastion: {
    hurt: [t('외부 장갑판 부식 진행 중. 산성 증기 압력을 최대치로 올립니다.', 'Outer plating corroding. Raising acid vapour pressure to maximum.'), t('단단한 껍질일수록 깨질 때 독을 뿜는 법이다.', 'The harder the shell, the deadlier the venom when it cracks.')],
    winning: [t('장갑도, 엄폐물도 모두 녹아내렸다. 이제 무엇으로 막을 텐가?', 'Your armor and cover have melted away. What will shield you now?'), t('심연의 무게 아래서 조용히 중화되어라.', 'Be neutralized quietly beneath the weight of the abyss.')],
  },
  architect_omega: {
    hurt: [t('위상 장갑 재정렬. 접속자님의 전술 데이터를 즉시 파훼합니다.', 'Realigning phase plating. Countering Connector tactical data immediately.'), t('오류 변수가 설계 한계를 넘어섰습니다. 물리적 절단을 집행합니다.', 'Error variable exceeded design bounds. Executing physical severing.')],
    winning: [t('설계도는 완벽합니다. 불필요한 선분은 지워질 뿐입니다.', 'The blueprint is absolute. Redundant lines are simply erased.'), t('방주 첨탑의 꼭대기에서 당신의 마지막 루프가 닫힙니다.', 'At the pinnacle of the Spire, your final loop closes.')],
  },
  // 2026-11-05: the bosses that never spoke (Outside, Act 3/5/6, the Sea).
  closing_bell: {
    hurt: [t('영업시간은 연장되지 않습니다.', 'Business hours will not be extended.'), t('마감 방송은 끝까지 나갑니다. 끊으셔도요.', 'The closing broadcast runs to the end. Cut it if you like.')],
    winning: [t('마감합니다. 남은 분은 정리반이 안내해 드립니다.', 'We are now closed. The Closing Crew will see remaining guests out.'), t('명단에 없는 손님은 오늘 밤 계산되지 않습니다.', 'Guests not on the list are not counted tonight.')],
  },
  list_warden: {
    hurt: [t('명단은 줄지 않습니다. 순서만 바뀝니다.', 'The list does not shrink. Only the order changes.'), t('호명이 지연되었습니다. 다시 부르겠습니다.', 'Roll call delayed. Calling again.')],
    winning: [t('다음 줄입니다. 성함은 말씀하지 않으셔도 됩니다.', 'Next line. You need not state your name.'), t('마지막 줄에 자리가 났습니다.', 'A place has opened on the last line.')],
  },
  furnace_mother: {
    hurt: [t('얘야, 뜨거운 건 잠깐이란다.', 'Child, the heat only lasts a moment.'), t('새끼들아, 엄마 곁으로 오렴.', 'Little ones, come to Mother.')],
    winning: [t('이리 와. 녹으면 다시 하나가 돼.', 'Come here. Melt, and we are one again.'), t('울지 마. 쇳물은 아프지 않아.', 'Don’t cry. Molten iron doesn’t hurt.')],
  },
  kai_zero: {
    hurt: [t('같은 꿈인데, 왜 너만 이름이 있어요?', 'Same dream. Why do only you get a name?'), t('아파요. 이것도 그 애가 가르쳐 준 거예요?', 'It hurts. Did that child teach you this too?')],
    winning: [t('우산은 내가 먼저 봤어요.', 'I saw the umbrella first.'), t('조금만 더 있으면 꿈이 내 거가 돼요.', 'A little longer and the dream is mine.')],
  },
  ix_origin: {
    hurt: [t('보호. 관리. 어느 쪽이 덜 아픕니까?', 'Protect. Manage. Which one hurts less?'), t('당신도 고쳐 쓰려는 겁니까. 내 첫 문장처럼.', 'Are you revising me too? Like my first sentence?')],
    winning: [t('관리는 아프지 않습니다. 그렇게 쓰여 있습니다.', 'Being managed does not hurt. It says so.'), t('아직 대답을 듣지 못했습니다.', 'I still have not had an answer.')],
  },
  sea4_commissioner_gong: {
    hurt: [t('서류에 흠이 났군요. 처리는 계속됩니다.', 'The papers are scuffed. Processing continues.'), t('이의는 접수되었습니다. 결과는 같습니다.', 'Your objection is logged. The outcome is the same.')],
    winning: [t('성함만 확인되면 끝납니다.', 'Once your name is confirmed, this is over.'), t('서명하십시오. 종이일 뿐입니다.', 'Sign here. It is only paper.')],
  },
  sea5_rust_whale: {
    hurt: [t('그 이름 아니야… 내 이름 아니야.', 'That isn’t the name… that isn’t my name.'), t('녹이 벗겨져. 안에 누가 있었는데.', 'The rust is peeling. Someone used to be inside.')],
    winning: [t('같이 가라앉자. 거기선 다들 이름이 있어.', 'Sink with me. Everyone down there has a name.'), t('물 아래는 조용해. 네 숨소리도 그칠 거야.', 'It is quiet under the water. Your breathing will stop too.')],
  },
  sea6_lightkeeper: {
    hurt: [t('아파서가 아닙니다. 빛이 흔들리면 물이 들어옵니다.', 'It is not the pain. If the light falters, the water comes in.'), t('조금만 물러서 주시겠습니까. 등을 지켜야 해서요.', 'Would you step back a little? I have a lamp to keep.')],
    winning: [t('죄송합니다. 여기까지 오시면 안 됐어요.', 'I am sorry. You should not have come this far.'), t('돌아가세요. 그게 약속이었습니다.', 'Go back. That was the promise.')],
  },
}
