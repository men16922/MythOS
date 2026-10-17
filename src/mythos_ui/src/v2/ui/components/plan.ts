// Signal+ plan hook and copy shared by SignalPlus.tsx and the CRPG screens.
import { useSyncExternalStore } from 'react'
import { currentPlan, onPlan, type Plan } from '../../net/api.ts'

function subscribe(listener: () => void): () => void {
  return onPlan(() => listener())
}

export function usePlan(): Plan {
  return useSyncExternalStore(subscribe, currentPlan, currentPlan)
}

export const SIGNAL_PLUS_PERKS: { ko: string; en: string }[] = [
  { ko: '구역 탐색 — 막마다 한 번, 사람과 장소가 있는 지역을 직접 돌아다닌다', en: 'Districts — once an act, explore a place with people in it' },
  { ko: 'd20 대화 판정, 출신, 동료 승인, 막을 넘는 퀘스트', en: 'd20 dialogue checks, backgrounds, companion approval, quests across acts' },
  { ko: 'NPC에게 하고 싶은 말을 직접 입력한다 — AI가 그 사람의 목소리로 답한다', en: 'Say anything to NPCs — the AI answers in their voice' },
  { ko: '매달 AI 대사 한도가 크게 늘어난다', en: 'A much larger monthly allowance of AI lines' },
]

