// Signal+ purchase on Android: the local BillingPlugin (android/.../BillingPlugin.java) runs Google Play Billing; the
// purchase token goes to the server (`POST /api/v2/plan/play`), which verifies it with Google, checks it was bought
// for this player and acknowledges it. The web build has no checkout: a subscription bought in the app follows the
// Google account to the web through `GET /plan`.
import { Capacitor, registerPlugin } from '@capacitor/core'
import { currentPlan, loadPlan, redeemPlayPurchase, type Plan } from '../net/api.ts'
import { registerBilling, type PurchaseOutcome } from '../ui/common/nativeBridge.ts'

interface BillingProduct {
  productId: string
  title: string
  price: string
  offerToken: string
}

interface BillingPlugin {
  products(opts: { productIds: string[] }): Promise<{ products: BillingProduct[] }>
  purchase(opts: { productId: string; accountId: string }): Promise<{ purchaseToken: string; productId: string; pending: boolean }>
  owned(): Promise<{ purchases: { purchaseToken: string; productId: string }[] }>
}

const Billing = registerPlugin<BillingPlugin>('Billing')

export function canPurchase(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

/** The Signal+ offer as Play prices it in the player's currency, or null (web, offline, product not live yet). */
export async function signalPlusOffer(plan: Plan = currentPlan()): Promise<BillingProduct | null> {
  if (!canPurchase() || plan.skus.length === 0) return null
  try {
    const { products } = await Billing.products({ productIds: plan.skus })
    return products[0] ?? null
  } catch {
    return null
  }
}

/** Buy Signal+ and redeem it with the server. Never throws. */
export async function purchaseSignalPlus(): Promise<PurchaseOutcome> {
  const plan = await loadPlan()
  if (!plan.signedIn || !plan.accountId) return 'sign-in'
  const offer = await signalPlusOffer(plan)
  if (!offer) return 'unavailable'
  try {
    const bought = await Billing.purchase({ productId: offer.productId, accountId: plan.accountId })
    if (bought.pending) return 'pending'
    const res = await redeemPlayPurchase(bought.purchaseToken)
    return res.kind === 'ok' && res.plan.tier === 'plus' ? 'subscribed' : 'unverified'
  } catch (err) {
    const code = (err as { code?: unknown }).code
    return code === 'canceled' ? 'canceled' : 'unavailable'
  }
}

/** Re-send the subscriptions this Play account owns (after a reinstall or a redeem that failed offline). */
export async function restoreSignalPlus(): Promise<Plan> {
  if (!canPurchase()) return loadPlan()
  try {
    const { purchases } = await Billing.owned()
    for (const p of purchases) await redeemPlayPurchase(p.purchaseToken)
  } catch {
    /* Play unavailable: fall through to the server's view */
  }
  return loadPlan()
}

export function initBilling(): void {
  if (!canPurchase()) return
  registerBilling({
    offer: async () => {
      const o = await signalPlusOffer()
      return o ? { title: o.title, price: o.price } : null
    },
    purchase: purchaseSignalPlus,
    restore: async () => {
      await restoreSignalPlus()
    },
  })
}
