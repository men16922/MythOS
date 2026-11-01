// Residue (DLC 3): a companion who went down last run carries a small habit into the next. Words only: nothing crosses a run
// as power (docs/plans/2026-11-01-dlc3-plan.md §3).
import type { Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const RESIDUE: Record<string, Text> = {
  se_rin: t('세린이 왼쪽 어깨를 돌린다. 어디서 다쳤는지는 본인도 모른다.', 'Se-rin rolls her left shoulder. She cannot say where she hurt it.'),
  tae_o: t('태오가 방패 끈을 두 번 조인다. 예전에는 한 번이었다.', 'Tae-o tightens his shield strap twice. It used to be once.'),
  han: t('한이 문을 나서기 전에 뒤를 한 번 더 본다. 왜 그러냐고 물으면 "그냥"이라고 한다.', 'Han glances back once more before every door. Ask why and he says, “No reason.”'),
  su_ah: t('수아가 쉬는 동안에도 망치 손잡이를 놓지 않는다.', 'Su-ah keeps a hand on her hammer even at rest.'),
  kai: t('카이가 꿈 기록에 없는 장면 하나를 적는다. 바닥에 누워 천장을 보는 장면이다.', 'Kai logs a dream that is not on file: lying on a floor, looking at a ceiling.'),
  lin_yue: t('린위에가 장부에 빚 하나를 적었다가 지운다. 누구한테 진 빚인지 기억나지 않는다.', 'Lin Yue writes down a debt and strikes it out. She cannot recall who she owes.'),
  io: t('이오가 자기 기록에서 빈 칸 하나를 발견했다고 보고한다. 채우지 않겠다고 한다.', 'Io reports a blank in her own record. She says she will leave it empty.'),
  miro: t('미로가 오늘은 한 걸음 더 가까이 걷는다.', 'Miro walks one step closer today.'),
  doyun: t('도윤이 맞을 자리에 먼저 가 서 있다. 스스로는 알아채지 못한다.', 'Doyun is already standing where the hit will land. He does not notice he does it.'),
  bel: t('벨이 붉은 펜 뚜껑을 닫지 않고 다닌다.', 'Bel keeps the cap off her red pen now.'),
  rem: t('렘이 잠들기 전에 숫자를 센다. 예전에는 세지 않았다.', 'Rem counts before she sleeps. She never used to.'),
  mujin: t('무진이 교대 시간보다 십 분 먼저 나와 있다. 말은 없다.', 'Mujin turns up ten minutes before the shift. He says nothing about it.'),
  seo_ha: t('서하가 물 없는 바닥을 보고도 수심을 읊는다.', 'Seo-ha recites the depth over dry ground.'),
  parang: t('파랑이 모르는 사람의 이름을 하나 더 안다.', 'Parang knows one more stranger’s name.'),
}
