// Run-start vignettes (ported from 1.x `directives/opening_<companion>.md`): on a re-entry (loop 2+, not the
// daily) the Act 1 intro ends with three short lines about how THIS loop's starting companion found you — a
// sensation, their entrance, one line in their own voice. Authored, no choice, no AI. (1.x had the companion's
// signal arrive before you met; in 2.0 they have already joined, so these tell how they reached you.)
//
// Voices follow content/companions.ts registers: Se-rin blunt 반말 · Tae-o short ~다 · Han slangy 반말 ·
// Su-ah gentle 반말 · Kai polite 해요체 · Lin-yue lazy, knowing 반말.
import type { Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const OPENINGS: Record<string, Text[]> = {
  se_rin: [
    t('젖은 아스팔트 냄새. 이 골목이 처음이 아니라는 걸 몸이 먼저 안다.', 'The smell of wet asphalt. Your body knows before you do: this alley is not new.'),
    t('골목 끝에서 바이크 헤드라이트가 비를 가르며 다가온다. 시간을 맞춰 오는 사람은 세린뿐이다.', 'At the alley’s end a bike’s headlight cuts the rain. Only Se-rin ever arrives on time.'),
    t('“이번엔 꾸물대지 마. 일어나.”', '“Don’t dawdle this time. Up.”'),
  ],
  tae_o: [
    t('복지 블록 초입. 지난 루프에는 없던 것이 있다. 폐가구와 고철을 쌓아 만든 바리케이드.', 'The edge of the welfare block. Something new since last loop: a barricade of junk furniture and scrap.'),
    t('그 너머에서 커다란 실루엣이 당신을 보고 말없이 안전한 쪽을 가리킨다. 옷자락 뒤에서 아이 하나가 내다본다.', 'Beyond it a large silhouette sees you and points, wordless, toward the safe side. A child peeks out from behind his coat.'),
    t('“이쪽이다.” 태오의 목소리는 낮고 짧다.', '“This way.” Tae-o’s voice is low and short.'),
  ],
  han: [
    t('닫히는 보안 셔터의 경고음. 순찰 시간대의 구획 봉쇄다.', 'A security shutter’s warning chime as it comes down — the patrol-hour lockdown.'),
    t('셔터가 내려오기 직전, 어둠 속에서 누군가 발끝으로 배수로 덮개를 툭 친다. 순찰이 닿지 않는 지름길이다.', 'Just before it shuts, someone in the dark taps a drain cover with a toe. A shortcut the patrols never reach.'),
    t('“야, 안 가? 곧 닫혀. 아, 나 한이야. 그냥 구경 중.”', '“Hey, you coming? It’s about to shut. Oh, I’m Han. Just watching.”'),
  ],
  su_ah: [
    t('감시 카메라가 겹겹이 교차하는 네온 거리. 시야 구석에서 승인 서명 없는 핑 신호가 깜박인다.', 'A neon street under crossing cameras. In the corner of your vision an unsigned ping blinks.'),
    t('머리 위 드론의 수색 궤적에 구멍이 하나 뚫려 있다. 누군가 감시망을 실시간으로 구부려 길을 만들어 두었다.', 'There is a hole in the drones’ search pattern overhead. Someone is bending the net in real time to make you a path.'),
    t('“맞아, 거기야. 서두르지 말고 내 박자에 맞춰 와.”', '“Yes, there. Don’t rush — come in time with me.”'),
  ],
  kai: [
    t('폐기층 쪽 어귀. 죽어 있던 공용 단말이 저절로 켜진다.', 'The mouth of the disposal level. A dead public terminal switches itself on.'),
    t('관리망 바깥에서 뚫고 들어온 신호가 잡음 사이로 좌표 조각 하나를 흘린다.', 'A signal punched in from outside the grid leaks a coordinate fragment through the static.'),
    t('“지워지기 싫으면 기억해 두세요. 저는… 여기서 기다릴게요.”', '“If you don’t want to be erased, remember this. I’ll… wait here.”'),
  ],
  lin_yue: [
    t('한강 야시장 뒷골목, 좌판 방수포 밑에서 눈을 뜬다.', 'You wake under a stall tarp in a back alley of the Han River night market.'),
    t('방수포 틈에 젖은 쪽지가 끼워져 있다. ‘일할 생각 있으면 시장으로. 값은 쳐준다. — L.Y.’ 모서리에 환전상의 신용 표식이 눌려 있다.', 'A damp note is wedged in the tarp. ‘Want work? Come to the market. I pay well. — L.Y.’ A broker’s credit mark is pressed into the corner.'),
    t('“일어났네. 시간 딱 맞췄지? 나는 원래 정확해.”', '“You’re up. Right on time, no? I’m always exact.”'),
  ],
}

/** The vignette for this run's start, or [] (first loop has the prologue; the daily is identical for everyone). */
export function openingLines(run: { loop: number; act: number; daily?: string; party: { id: string }[] }): Text[] {
  if (run.act !== 1 || run.loop < 2 || run.daily) return []
  const first = run.party[0]
  return (first ? OPENINGS[first.id] : undefined) ?? []
}
