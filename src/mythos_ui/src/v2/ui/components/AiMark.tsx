// Mythos 2.0 — the mark on a line a model just wrote for this run (GM card, IX comms, enemy taunts, companion and
// NPC chat). Authored and local lines never carry it, so the player can see exactly where the AI is at work.
import type { Lang } from '../../engine/types.ts'

export function AiMark({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <span
      className={`m2-aimark${className ? ` ${className}` : ''}`}
      title={lang === 'ko' ? 'AI가 이 판의 상황을 읽고 방금 쓴 대사 (표시 없는 대사는 미리 쓰인 문장)' : 'Written just now by AI from this run (unmarked lines are pre-written)'}
    >
      ✦ AI
    </span>
  )
}
