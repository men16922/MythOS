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
  { ko: '매달 더 많은 AI 내레이션과 NPC·동료 대화', en: 'More AI narration and NPC/companion dialogue each month' },
  { ko: '같은 Google 계정으로 앱과 웹에서 이용', en: 'Use it in the app and on the web with the same Google account' },
]
