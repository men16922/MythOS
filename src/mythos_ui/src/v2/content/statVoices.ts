// Stat voices — the five stats talk back after a check (Disco-Elysium-style inner voices, ported from 1.x
// `directives/stat_voices.md`, rewritten for 2.0's short authored outcomes). One short line per outcome, picked
// deterministically from (event, option) so the same moment always sounds the same, no LLM, no balance effect.
//
// Voices (each must stay distinct — narrative.test.ts checks shape, not tone):
//   str  — a big, blunt body. Rough 반말, wants to break things, loyal.
//   agi  — a jumpy kid. Short breaths, commands, exclamation marks.
//   int  — a cold analyst. Flat 합쇼체, odds and optimisation, mildly condescending.
//   cha  — a soft, teasing older sister. ~잖아 / ~렴, reads the person behind the mask.
//   obs  — an old, patient watcher. Dry plain declaratives (~다), notices what is off.
//
// No numbers in the lines (the game's own chips show the numbers), no names, no hints about hidden state.
import type { StatKey, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export interface StatVoice {
  /** The voice's tag shown before the line. */
  tag: Text
  success: Text[]
  failure: Text[]
}

export const STAT_VOICES: Record<StatKey, StatVoice> = {
  str: {
    tag: t('근력', 'Strength'),
    success: [
      t('봤지? 쇠붙이는 부서지게 돼 있어.', 'See? Metal was made to break.'),
      t('정면이 제일 빠른 길이라니까.', 'Straight through is always the fastest way.'),
      t('좋아. 어깨가 아직 쓸 만하네.', 'Good. The shoulders still work.'),
      t('쫄지 말랬잖아. 밀면 열려.', 'Told you not to flinch. Push and it opens.'),
    ],
    failure: [
      t('…다음엔 더 세게. 아니, 더 일찍.', '…Harder next time. No — earlier.'),
      t('이 정도로 포기하냐. 팔은 아직 붙어 있는데.', 'You give up for this? Your arms are still attached.'),
      t('아프냐. 아파야 기억하지.', 'Hurts? Good. That is how you remember.'),
      t('벽이 먼저 웃었네. 다음엔 내가 웃는다.', 'The wall laughed first. Next time it’s me.'),
    ],
  },
  agi: {
    tag: t('민첩', 'Agility'),
    success: [
      t('됐어, 됐어! 숨 쉬어도 돼!', 'Yes, yes! You can breathe now!'),
      t('봐! 몸이 먼저 알았다니까!', 'See! The body knew first!'),
      t('지금이었어! 한 박자만 늦었어도!', 'That was the moment! One beat later and—!'),
      t('가볍다, 가볍다! 이 느낌 기억해!', 'Light, so light! Remember this feeling!'),
    ],
    failure: [
      t('앗, 발! 발이 말을 안 들어!', 'Ah — my feet! They won’t listen!'),
      t('망설였잖아! 망설이면 끝이라고 했지!', 'You hesitated! I said hesitation is the end!'),
      t('숙여, 숙였어야지! 다음엔 먼저 뛰어!', 'Duck — you should have ducked! Next time, run first!'),
      t('심장이 터질 것 같아… 다시는 안 해!', 'My heart’s going to burst… never again!'),
    ],
  },
  int: {
    tag: t('지능', 'Intelligence'),
    success: [
      t('예측 범위 내입니다. 감정은 불필요했습니다.', 'Within the predicted range. Emotion was unnecessary.'),
      t('최적 경로였습니다. 기록해 두겠습니다.', 'That was the optimal path. I will log it.'),
      t('가설이 입증되었습니다. 이번에는.', 'The hypothesis holds. This time.'),
      t('오차는 허용치 안입니다. 계속하십시오.', 'The error is within tolerance. Continue.'),
    ],
    failure: [
      t('변수를 하나 놓쳤습니다. 당신의 몫입니다.', 'One variable was missed. It was yours.'),
      t('오판입니다. 감정적 판단은 권장하지 않았습니다.', 'A misjudgment. I advised against emotional reasoning.'),
      t('실패 확률은 계산되어 있었습니다. 읽지 않으셨을 뿐입니다.', 'The failure odds were computed. You did not read them.'),
      t('데이터가 부족했습니다. 다음에는 더 모으십시오.', 'The data was insufficient. Gather more next time.'),
    ],
  },
  cha: {
    tag: t('매력', 'Charisma'),
    success: [
      t('봐, 마음이 열렸잖아. 따뜻한 눈길 한 번이면 돼.', 'See, they opened up. One warm look is all it takes.'),
      t('잘했어. 가면 뒤의 사람이 웃더라.', 'Well done. The person behind the mask smiled.'),
      t('그 목소리, 좋았어. 다들 듣고 있었잖아.', 'That voice of yours — lovely. Everyone was listening.'),
      t('이렇게 쉬운 걸. 사람은 늘 듣고 싶은 말을 기다려.', 'So easy. People always wait to hear what they want to hear.'),
    ],
    failure: [
      t('아이고, 너무 서둘렀잖아. 눈을 먼저 보렴.', 'Oh dear, too hasty. Look at the eyes first.'),
      t('저 사람, 문을 닫았네. 괜찮아, 다시 두드리면 되지.', 'They closed the door. It’s fine — knock again.'),
      t('말이 앞서갔어. 마음이 못 따라왔을 뿐이야.', 'Your words ran ahead. The heart just couldn’t keep up.'),
      t('화내지 마. 거절도 대답의 하나잖아.', 'Don’t be cross. A refusal is an answer too.'),
    ],
  },
  obs: {
    tag: t('관측', 'Perception'),
    success: [
      t('어긋난 곳을 포착했다. 거기가 틈이다.', 'Caught what was out of place. There is the gap.'),
      t('이질감의 출처를 확인함. 간단한 속임수였다.', 'Source of the wrongness confirmed. A simple trick.'),
      t('발자국이 하나 더 있었다. 이제 맞는다.', 'There was one more footprint. Now it fits.'),
      t('규칙을 읽었다. 규칙은 늘 어딘가 어긋난다.', 'The pattern is read. Patterns always slip somewhere.'),
    ],
    failure: [
      t('놓쳤다. 눈앞에 있었는데.', 'Missed it. It was right in front of us.'),
      t('본 것과 있는 것은 다르다. 이번엔 전자였다.', 'What is seen and what is there differ. This time it was the former.'),
      t('너무 오래 쳐다보면 보이지 않는다. 기억해 둬라.', 'Stare too long and you stop seeing. Remember that.'),
      t('작은 어긋남을 흘렸다. 작은 것이 큰 것을 부른다.', 'A small mismatch slipped by. Small things call the large.'),
    ],
  },
}

/** A stable small hash so the same (event, option) always draws the same line. */
function hash(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return h >>> 0
}

/** The voice line for a resolved check. `seed` is e.g. `${eventId}:${optionIndex}`. */
export function statVoiceLine(stat: StatKey, success: boolean, seed: string): { tag: Text; line: Text } {
  const voice = STAT_VOICES[stat]
  const pool = success ? voice.success : voice.failure
  return { tag: voice.tag, line: pool[hash(`${stat}:${success ? 1 : 0}:${seed}`) % pool.length] as Text }
}
