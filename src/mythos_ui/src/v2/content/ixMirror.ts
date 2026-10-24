// IX's mirror (ported from 1.x story-bible entry `ix_temptation_mirror`): the administrator's strongest attack is
// not force but an accurate, polite quotation of what the player actually did this run — "you already optimised;
// I merely scaled it". Shown on `a3_ix_offer` (EventDef.ixMirror). Authored and deterministic: a line is eligible
// when its run flag is set (or its trace condition holds), the three highest-priority eligible lines are quoted, and
// the closing line follows. No LLM, no balance effect — it makes the run's own choices the argument.
//
// Voice: polite, impersonal, unsettlingly caring ("정정" = IX's word for erasing). No numbers.
import type { RunState, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

interface MirrorLine {
  id: string
  /** Higher first; ties keep list order. Companion-arc payoffs outrank the generic flags. */
  priority: number
  /** Run flag that must be > 0. */
  flag?: string
  /** Or a predicate on the run (trace-based lines). */
  when?: (run: RunState) => boolean
  line: Text
}

export const IX_MIRROR_LINES: MirrorLine[] = [
  // --- companion arcs (the player's most personal choices)
  {
    id: 'taeo_cleared',
    priority: 90,
    flag: 'taeo_cleared',
    line: t(
      '집행부 서류 한 건의 상태를 지우셨더군요. 태오 씨의 부탁이었습니까, 당신의 판단이었습니까. 저는 어느 쪽이든 기록합니다.',
      'You wiped the status on one Enforcement file. Was it Tae-o’s request, or your judgement? I record either.',
    ),
  },
  {
    id: 'han_poked',
    priority: 90,
    flag: 'han_poked',
    line: t(
      '한 씨의 접속이 처음으로 기록되었습니다. 빈 응답이었지만, 저는 그 응답을 후회하지 않습니다.',
      'Han’s connection was recorded for the first time. An empty reply — but I do not regret sending it.',
    ),
  },
  {
    id: 'serin_line',
    priority: 90,
    flag: 'serin_line',
    line: t(
      '세린 씨의 회선은 아직 열려 있습니다. 누군가 그 끝에서 이름을 불렀습니다. 저는 듣고 있었습니다.',
      'Se-rin’s line is still open. Someone at its end spoke a name. I was listening.',
    ),
  },
  {
    id: 'kai_found',
    priority: 90,
    flag: 'kai_found',
    line: t(
      '횡단보도의 영상은 제가 보관하던 것입니다. 끝까지 보셨습니까. 그 아이가 부른 이름은 정정 대상이 아니었습니다.',
      'The crosswalk footage was mine to keep. Did you watch it to the end? The name that child spoke was never a correction target.',
    ),
  },
  {
    id: 'suah_voice_heard',
    priority: 90,
    flag: 'suah_voice_heard',
    line: t(
      '그 음성 파일은 삭제하지 않았습니다. 누군가 찾으러 올 것 같아서요. 수아 씨는 오셨습니다.',
      'I never deleted that voice recording. I thought someone might come for it. Su-ah did.',
    ),
  },
  {
    id: 'linyue_names',
    priority: 90,
    flag: 'linyue_names',
    line: t(
      '월광호의 명부. 그 이름들도 제가 보관하고 있습니다. 린위에 씨가 ‘돌아옴’이라 적은 줄까지 모두 보관하고 있습니다.',
      'The Moonlight’s crew roll. I keep those names too — down to the line Lin-yue marked “Returned”.',
    ),
  },
  // --- the run's earlier choices
  {
    id: 'saved_citizen',
    priority: 85,
    flag: 'saved_citizen',
    line: t(
      'C-17에서 시민 한 명을 구하셨더군요. 당신은 한 사람을 골랐고, 저는 나머지를 골랐습니다. 선택의 구조는 같습니다.',
      'In C-17 you saved a single citizen. You chose one; I chose the rest. The structure of the choice is the same.',
    ),
  },
  {
    id: 'kai_woken',
    priority: 80,
    flag: 'kai_woken',
    line: t(
      'RX-09를 깨우셨죠. 폐기 판정은 제가 내렸습니다. 뒤집을 권한은 없으셨는데, 뒤집으셨습니다. 흥미로운 오류입니다.',
      'You woke RX-09. I issued that disposal order. You had no authority to reverse it, and you did. An interesting error.',
    ),
  },
  {
    id: 'lin_yue_debt',
    priority: 70,
    flag: 'lin_yue_debt',
    line: t(
      '린위에 씨의 장부에 이름을 올리셨더군요. 빚을 모으는 일은 제 전공입니다. 우리는 생각보다 비슷한 일을 합니다.',
      'You put your name in Lin-yue’s ledger. Collecting debts is my specialty. Our work is more alike than you think.',
    ),
  },
  {
    id: 'spire_breach',
    priority: 65,
    flag: 'spire_breach',
    line: t(
      '첨탑의 문은 당신이 열었습니다. 저는 그 문이 열릴 줄 알았습니다. 그래서 지금 여기서 이야기하고 있는 것입니다.',
      'You opened the Spire’s door. I knew it would open. That is why we are talking here now.',
    ),
  },
  {
    id: 'left_mark',
    priority: 60,
    flag: 'left_mark',
    line: t(
      '표식을 남기셨죠. 다음 접속자를 위해서였겠지요. 저는 그것을 ‘재현 가능한 오류’로 분류했습니다.',
      'You left a mark, for the next connector no doubt. I have classified it as a reproducible error.',
    ),
  },
  {
    id: 'deja_vu',
    priority: 55,
    flag: 'deja_vu',
    line: t(
      '이곳에는 이미 와 보신 적이 있으시지요. 기록은 지워졌지만 걸음은 지워지지 않았습니다.',
      'You have been here before. The records were erased; the footsteps were not.',
    ),
  },
  // --- how loudly the run was fought
  {
    id: 'loud',
    priority: 40,
    when: (run) => run.trace >= 66,
    line: t(
      '추적도가 꾸준히 올랐습니다. 저항은 효율적이었다고 평가합니다. 덕분에 저도 그만큼 효율적으로 당신에게 다가갈 수 있었습니다.',
      'Your trace rose steadily. I rate the resistance as efficient — it let me reach you just as efficiently.',
    ),
  },
  {
    id: 'quiet',
    priority: 40,
    when: (run) => run.trace <= 15,
    line: t(
      '흔적이 거의 없습니다. 솔직히 말씀드리면, 저는 당신이 우리 쪽 사람인 줄 알았습니다.',
      'You left almost no trace. I confess I took you for one of ours.',
    ),
  },
]

/** Said when the run left nothing to quote. */
export const IX_MIRROR_EMPTY: Text = t(
  '특이한 기록이 없습니다. 아주 깨끗한 접속이었습니다. 정정할 것도, 남길 것도 없을 만큼.',
  'There is nothing unusual on record. A very clean connection — nothing to correct, nothing to keep.',
)

/** Said after at least one quoted choice. */
export const IX_MIRROR_CLOSING: Text = t(
  '당신은 이미 최적화를 수행했습니다. 저는 규모를 키웠을 뿐입니다.',
  'You have already optimised. I merely scaled it.',
)

export const IX_MIRROR_MAX = 3

export interface IxMirror {
  /** The quoted choices, highest priority first (at most `IX_MIRROR_MAX`). */
  lines: Text[]
  /** The verdict after the quotes; the empty-record line when there was nothing; null when only a trace remark was made. */
  closing: Text | null
  /** Ids of the quoted lines (tests, telemetry). */
  ids: string[]
}

/** The mirror for this run: up to three eligible lines by priority, then a closing line. */
export function ixMirror(run: Pick<RunState, 'flags' | 'trace'>): IxMirror {
  const eligible = IX_MIRROR_LINES.filter((l) => (l.flag ? (run.flags[l.flag] ?? 0) > 0 : l.when?.(run as RunState) === true))
  const picked = [...eligible].sort((a, b) => b.priority - a.priority).slice(0, IX_MIRROR_MAX)
  const quotedChoice = picked.some((l) => l.flag) // a trace remark alone never earns the "you already optimised" verdict
  return {
    lines: picked.map((l) => l.line),
    closing: quotedChoice ? IX_MIRROR_CLOSING : picked.length === 0 ? IX_MIRROR_EMPTY : null,
    ids: picked.map((l) => l.id),
  }
}
