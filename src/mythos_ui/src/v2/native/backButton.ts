// Android hardware/gesture back for the Capacitor app. The game has no history stack, so back maps onto the
// controls the web client already has (all DOM-level, so the shell and combat UIs need no native hooks):
//   1. an open modal (pause menu, settings, deck, confirm) → Escape, which Modal.tsx closes on;
//   2. combat with a card or item armed → Escape, which CombatScreen disarms on;
//   3. the prologue → Escape (skips it, as on desktop);
//   4. inside a run → the pause menu button (TopBar or the combat strip; both carry a "메뉴…/Menu…" title);
//   5. archive / setup → that screen's own back button;
//   6. the title screen → minimise (never exit: saves are local-first, the next launch resumes).

const MODAL = '.m2-modal-back'
const ARMED = '.m2c-slot.is-armed, .m2c-item.is-armed'
const PROLOGUE = '.m2p-root'
const MENU_BUTTON = 'button[title^="메뉴"], button[title^="Menu"]'
const SCREEN_BACK = '.m2-screen .m2-iconbtn[title^="타이틀로"], .m2-screen .m2-iconbtn[title^="아카이브로"], .m2-screen .m2-iconbtn[title^="Back to"]'

function pressEscape(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }))
}

function clickFirst(selector: string): boolean {
  const el = document.querySelector<HTMLButtonElement>(selector)
  if (!el || el.disabled) return false
  el.click()
  return true
}

/** Handle one back press. Returns 'minimize' when nothing in the game consumed it (the caller backgrounds the app). */
export function handleBack(): 'handled' | 'minimize' {
  if (document.querySelector(MODAL) || document.querySelector(ARMED) || document.querySelector(PROLOGUE)) {
    pressEscape()
    return 'handled'
  }
  if (clickFirst(MENU_BUTTON) || clickFirst(SCREEN_BACK)) return 'handled'
  return 'minimize'
}
