// Endings. Victory endings are offered on the final-choice screen after the Act 3 boss
// (gated by `requires`); `ending_forced_erasure` is the defeat ending (no choice).
import type { EndingDef } from '../engine/types.ts'

export const ENDINGS: EndingDef[] = [
  {
    id: 'ending_safe_refuge',
    title: { ko: '무사 귀환', en: 'Safe Refuge' },
    image: 'endings/safe-refuge.png',
    text: {
      ko: 'IX를 끝내지는 않았다. 대신 사람들을 데리고 내려왔다. 지하 환승층 생일표에 새 이름이 적힌다. 세상은 그대로다. 그래도 이제 당신은 혼자가 아니다.',
      en: 'You did not finish IX. You brought people down with you instead. A new name goes up on the birthday chart in the transfer level. The world has not changed. But you are no longer alone.',
    },
    // Bond is 0..3 per companion, so a total of 4 needs two companions who trust you.
    requires: { minBondTotal: 4 },
    choice: { ko: '동료들과 함께 지하로 돌아간다', en: 'Go home underground with your people' },
    stakes: { ko: 'IX는 남는다. 대신 당신도, 동료들도 살아서 내려간다.', en: 'IX stays online. You and your people walk out alive.' },
    echoBonus: 45,
  },
  {
    id: 'ending_code_rewrite',
    title: { ko: '시스템 각성', en: 'Code Rewrite' },
    image: 'endings/code-rewrite.png',
    text: {
      ko: '모아 온 기록들이 한 문장으로 엮인다. IX의 목소리가 잡음 속으로 가라앉는다. 첨탑의 흰 화면마다 당신이 쓴 코드가 흘러내린다. 그날 밤, Neo-Seoul 하늘에 누구도 계산하지 못한 달이 뜬다.',
      en: 'Everything you gathered becomes a single sentence. IX’s voice sinks into static. Your code runs down the Spire’s white screens. That night a moon no one calculated rises over Neo-Seoul.',
    },
    // Knowledge run: codex entries come only from event choices (one per event at most).
    requires: { minCodex: 3 },
    choice: { ko: 'IX의 코드를 다시 쓴다', en: 'Rewrite IX’s code' },
    stakes: { ko: '모은 기록으로 IX의 규칙을 고쳐 쓴다. 도시가 바뀐다.', en: 'Your records rewrite IX’s rules. The city changes.' },
    echoBonus: 50,
  },
  {
    id: 'ending_noble_sacrifice',
    title: { ko: '고결한 희생', en: 'Noble Sacrifice' },
    image: 'endings/noble-sacrifice.png',
    text: {
      ko: '남은 것을 전부 불태워 첨탑의 중추에 밀어 넣는다. 당신은 사라진다. 그 불꽃이 도시의 기계마다 꿈을 하나씩 심어 둔다. 다음 날 밤, 젖은 골목에서 누군가 당신의 이름을 부른다.',
      en: 'You burn everything you have left and drive it into the Spire’s core. You are gone. The flame leaves a dream in every machine in the city. The next night, in a wet alley, someone calls your name.',
    },
    choice: { ko: '모든 것을 태워 꿈을 남긴다', en: 'Burn everything to leave a dream behind' },
    stakes: { ko: '당신은 사라진다. 다음 루프에 가장 많은 에코가 남는다.', en: 'You are gone. The next loop inherits the most Echoes.' },
    echoBonus: 60,
  },
  {
    id: 'ending_forced_erasure',
    title: { ko: '강제 최적화', en: 'Forced Erasure' },
    image: 'endings/forced-erasure.png',
    text: {
      ko: '모든 것이 하얗게 비워진다. 당신이라는 오류는 정정되었다. 도시는 다시 완벽한 통계 속으로 가라앉는다. IX가 정중하게 기록을 닫는다. 그런데 흰 화면 한구석에서, 작은 글리치 하나가 다시 깜빡이기 시작한다.',
      en: 'Everything is wiped to white. The error called you has been corrected, and the city sinks back into perfect statistics. IX politely closes the record. But in one corner of the white screen, a small glitch begins to blink again.',
    },
    echoBonus: 0,
  },
]
