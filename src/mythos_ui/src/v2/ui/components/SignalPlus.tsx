// Mythos 2.0 — Signal+ (monthly subscription): the plan row in Settings with the AI budget meter, and the offer modal.
// Signed-in players get AI lines within a monthly allowance; Signal+ raises it and opens the CRPG layer. Purchases run
// through the native billing seam (Android only); the web shows how to subscribe in the app.
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Lang } from '../../engine/types.ts'
import { loadPlan } from '../../net/api.ts'
import { billingControl, type PurchaseOutcome } from '../common/nativeBridge.ts'
import { useAuthStatus } from './account.ts'
import { Modal } from './Modal.tsx'
import { SIGNAL_PLUS_PERKS, usePlan } from './plan.ts'
import './signalplus.css'

function outcomeNote(o: PurchaseOutcome, ko: boolean): string {
  switch (o) {
    case 'subscribed':
      return ko ? 'Signal+ 접속 완료. 다음 런부터 구역이 열린다.' : 'Signal+ is on. Districts open from your next run.'
    case 'pending':
      return ko ? '결제가 처리 중이다. 끝나면 자동으로 적용된다.' : 'Payment pending. It applies once it clears.'
    case 'canceled':
      return ko ? '구독을 취소했다.' : 'Purchase canceled.'
    case 'sign-in':
      return ko ? '먼저 Google로 로그인해라. 구독은 계정에 묶인다.' : 'Sign in with Google first — the subscription follows your account.'
    case 'unverified':
      return ko ? '결제는 됐지만 확인이 늦어지고 있다. 잠시 후 "구매 복원"을 눌러라.' : 'Paid, but not confirmed yet. Try "Restore" in a moment.'
    default:
      return ko ? '지금은 구독할 수 없다. 잠시 후 다시 시도해라.' : 'Subscriptions are unavailable right now. Try again later.'
  }
}

export function SignalPlusModal({ lang, onClose, nested }: { lang: Lang; onClose: () => void; nested?: boolean }) {
  const ko = lang === 'ko'
  const plan = usePlan()
  const control = billingControl()
  const [price, setPrice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void control?.offer().then((o) => alive && setPrice(o?.price ?? null))
    return () => {
      alive = false
    }
  }, [control])
  const plus = plan.tier === 'plus'
  return (
    <Modal
      nested={nested}
      onClose={onClose}
      title="Signal+"
      actions={
        <>
          {control && !plus && (
            <button
              className="m2-btn m2-btn--primary"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void control.purchase().then((o) => {
                  setBusy(false)
                  setNote(outcomeNote(o, ko))
                })
              }}
            >
              {ko ? `구독하기${price ? ` · 월 ${price}` : ''}` : `Subscribe${price ? ` · ${price}/mo` : ''}`}
            </button>
          )}
          {control && (
            <button
              className="m2-btn"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void control.restore().then(() => setBusy(false))
              }}
            >
              {ko ? '구매 복원' : 'Restore'}
            </button>
          )}
          <button className="m2-btn" onClick={onClose}>
            {ko ? '닫기' : 'Close'}
          </button>
        </>
      }
    >
      <div className="m2-plus">
        <p className="m2-plus__lead">
          {ko
            ? '전투만이 전부가 아니다. 네오서울의 사람들과 말하고, 속이고, 설득해라.'
            : 'There is more to the grid than fights. Talk to Neo-Seoul’s people — persuade them, lie to them, read them.'}
        </p>
        <ul>
          {SIGNAL_PLUS_PERKS.map((p) => (
            <li key={p.en}>
              <Sparkles size={14} /> {ko ? p.ko : p.en}
            </li>
          ))}
        </ul>
        <small>
          {ko
            ? '오늘의 시드는 모두에게 같다 — 구독해도 리더보드 조건은 바뀌지 않는다. 구독은 Google Play에서 언제든 해지할 수 있다.'
            : 'The Daily Signal is the same for everyone — Signal+ never changes leaderboard runs. Cancel any time in Google Play.'}
        </small>
        {!control && (
          <small className="m2-plus__web">
            {ko
              ? 'Android 앱에서 구독할 수 있다. 같은 Google 계정으로 로그인하면 웹에서도 적용된다.'
              : 'Subscribe in the Android app; it applies on the web when you sign in with the same Google account.'}
          </small>
        )}
        {plus && plan.subscription?.expiresAt && (
          <small>
            {ko ? '구독 중 · 다음 갱신 ' : 'Subscribed · renews '}
            {new Date(plan.subscription.expiresAt).toLocaleDateString(ko ? 'ko-KR' : 'en-US')}
          </small>
        )}
        {note && <p className="m2-plus__note">{note}</p>}
      </div>
    </Modal>
  )
}

/** Settings row: tier, AI allowance left this month, and the way into the offer. */
export function PlanSection({ lang }: { lang: Lang }) {
  const ko = lang === 'ko'
  const plan = usePlan()
  const status = useAuthStatus()
  const signedIn = status.kind === 'signed-in'
  const [open, setOpen] = useState(false)
  useEffect(() => {
    void loadPlan()
  }, [signedIn])
  const plus = plan.tier === 'plus'
  const pct = Math.round(plan.budget.left * 100)
  return (
    <div className="m2-toggle m2-plan">
      <span className="m2-toggle__text">
        <b>{plan.admin ? (ko ? '관리자 · Signal+' : 'Admin · Signal+') : plus ? 'Signal+' : ko ? '무료 접속' : 'Free'}</b>
        <small>
          {plan.budget.unlimited
            ? ko
              ? '관리자 계정: 월 AI 한도 없음.'
              : 'Admin account: no monthly AI allowance.'
            : !plan.signedIn
            ? ko
              ? '로그인하면 매달 일정량의 AI 대사가 제공된다.'
              : 'Sign in for a monthly allowance of AI-written lines.'
            : ko
              ? `이번 달 AI 대사 남은 양 ${pct}% — 다 쓰면 미리 쓰인 대사로 이어진다.`
              : `AI lines left this month: ${pct}% — then the authored lines carry on.`}
        </small>
        {plan.signedIn && !plan.budget.unlimited && (
          <span className="m2-plan__meter" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
      <button className="m2-btn m2-btn--ghost" onClick={() => setOpen(true)}>
        {plus ? (ko ? '구독 정보' : 'Details') : 'Signal+'}
      </button>
      {open && <SignalPlusModal lang={lang} nested onClose={() => setOpen(false)} />}
    </div>
  )
}
