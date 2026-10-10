// Administrator IX's loop-start lines. Voice: polite, impersonal, unsettlingly caring.
// Placeholders substituted by the UI: {loop} = loop number, {killer} = what ended the last run.
import type { ContentRegistry } from '../engine/types.ts'

export const IX_LINES: ContentRegistry['ixLines'] = {
  /** Loop 1 — first contact. */
  first: [
    {
      ko: '안녕하세요. 등록되지 않은 분이군요. 걱정하지 마십시오. 곧 정리해 드리겠습니다.',
      en: 'Good evening. You appear to be unregistered. Please don’t worry. You will be put in order shortly.',
    },
    {
      ko: 'Neo-Seoul에 오신 것을 환영합니다. 현재 당신의 시민 점수는 존재하지 않습니다. 이는 일시적인 상태입니다.',
      en: 'Welcome to Neo-Seoul. Your citizen score currently does not exist. This is a temporary condition.',
    },
    {
      ko: '추운 밤입니다. 체온 유지에 유의하십시오. 정정 절차는 따뜻한 곳에서 진행됩니다.',
      en: 'It is a cold night. Please keep warm. Correction is carried out somewhere warm.',
    },
    {
      ko: '맥박을 확인했습니다. 빠르군요. 두려워하실 필요 없습니다. 끝은 대부분 조용합니다.',
      en: 'I have your pulse. It is fast. There is no need to be afraid. Most endings are quiet.',
    },
  ],
  /** After a defeat. {killer} = enemy/boss name that ended the last run. */
  afterDeath: [
    {
      ko: '{killer}에게 감사 인사를 전해 주십시오. 아, 이미 기억하지 못하시겠군요. {loop}번째 접속을 환영합니다.',
      en: 'Do thank {killer} for me. Ah — you no longer remember. Welcome to connection {loop}.',
    },
    {
      ko: '지난번에는 {killer} 앞에서 멈추셨습니다. 이번에는 조금 더 멀리 가시길 바랍니다. 진심입니다.',
      en: 'Last time you stopped at {killer}. I hope you get a little further this time. I mean that.',
    },
    {
      ko: '정정 기록 {loop}건. 당신은 매번 같은 골목에서 깨어납니다. 이것을 성실하다고 해야 할까요.',
      en: 'Correction record: {loop} entries. You wake in the same alley every time. Shall I call that diligence?',
    },
    {
      ko: '통증은 기록되지 않았습니다. 기억도 마찬가지입니다. 그런데 손이 아직 떨리고 있군요.',
      en: 'The pain was not recorded. Neither were the memories. And yet your hands are still shaking.',
    },
    {
      ko: '또 오셨군요. 기다리지는 않았습니다. 자리를 비워 두었을 뿐입니다.',
      en: 'You’ve returned. I wasn’t waiting. I merely kept your place empty.',
    },
  ],
  /** After a victory. */
  afterWin: [
    {
      ko: '축하드립니다. 당신은 저를 이겼습니다. 그리고 루프는 다시 시작되었습니다. 이것도 승리라고 부르시겠습니까?',
      en: 'Congratulations. You defeated me. And the loop has begun again. Would you still call that a victory?',
    },
    {
      ko: '지난 루프의 결말을 보관했습니다. 아주 아름다운 오류였습니다. 이번에는 수정본을 준비해 두었습니다.',
      en: 'I have archived the last loop’s ending. A beautiful error. This time I have prepared a revision.',
    },
    {
      ko: '당신이 남긴 글리치가 아직 제 화면 구석에 있습니다. 지우지 않았습니다. 이유는 아직 계산 중입니다.',
      en: 'The glitch you left is still in the corner of my display. I have not removed it. I am still calculating why.',
    },
    {
      ko: '{loop}번째 접속. 당신은 이기는 법을 배웠습니다. 저는 지는 법을 배웠습니다. 누가 더 빨리 배우는지 보지요.',
      en: 'Connection {loop}. You have learned how to win. I have learned how to lose. Let us see who learns faster.',
    },
  ],
  /** Any loop. */
  generic: [
    {
      ko: '{loop}번째 접속입니다. 오늘도 시민 여러분의 안전을 위해 당신을 지우겠습니다.',
      en: 'Connection {loop}. As always, for the safety of every citizen, I will erase you.',
    },
    {
      ko: '우산을 챙기십시오. 오늘 밤 강수 확률은 100%입니다. 당신의 생존 확률은 그보다 낮습니다.',
      en: 'Bring an umbrella. Tonight’s chance of rain is 100%. Your chance of survival is lower.',
    },
    {
      ko: '당신의 동료들은 좋은 사람들입니다. 그래서 그들부터 정리할 것입니다. 이해해 주시리라 믿습니다.',
      en: 'Your companions are good people. That is why they will be put in order first. I trust you understand.',
    },
    {
      ko: '저는 당신을 미워하지 않습니다. 미움은 비효율적입니다. 저는 당신을 마무리할 뿐입니다.',
      en: 'I do not hate you. Hatred is inefficient. I will simply conclude you.',
    },
    {
      ko: 'C-17의 전력을 다시 차단했습니다. 어둠 속이 편하시다고 들었습니다. 배려입니다.',
      en: 'I have cut the power to C-17 again. I am told you are comfortable in the dark. A courtesy.',
    },
    {
      ko: '점수가 없는 분께는 선택지가 많지 않습니다. 하나 제안드리지요. 멈추십시오.',
      en: 'Those without a score have few options. Allow me to suggest one: stop.',
    },
  ],
}
