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
    hurt: [t('아파… 누구 목소리로 울어야 하지?', 'It hurts… whose voice should I cry in?'), t('흩어져도 돼. 너를 먹으면 다시 모여.', "Let me scatter. I'll gather again inside you.")],
    winning: [t('조금만 더. 네 기억은 따뜻한 냄새가 나.', 'Just a little more. Your memories smell warm.'), t('괜찮아, 잊는 건 하나도 안 아파.', "Shh. Forgetting doesn't hurt at all.")],
  },
  trooper_captain: {
    hurt: [t('좋아, 제법이군. 이제 진짜로 간다.', 'Fine. Not bad. Now we do this for real.'), t('그 정도로 내가 눕진 않아.', "That won't put me down.")],
    winning: [t('여기까지다, 신병.', 'This is where it ends, recruit.'), t('숨 고를 시간은 없다. 끝내지.', "No time to catch your breath. Let's finish.")],
  },
  glitch_reaver: {
    hurt: [t('깨, 깨졌어… 그래도 아직, 아직 배고파.', 'Br-broken… still, still hungry.'), t('부품, 부품이 모자라. 네 걸로 채운다.', "Parts, parts missing. I'll take yours.")],
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
}
