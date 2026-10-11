// Entry router: Mythos 2.0; the combat sandbox (dev) at /?sandbox=combat. The 1.x classic client is archived on
// branch `1.0`.
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('MythOS root element was not found.')
}

const params = new URLSearchParams(window.location.search)

if (params.get('sandbox') === 'combat') {
  void import('./v2/ui/combat/CombatSandbox.tsx').then((m) => m.mountCombatSandbox(rootElement))
} else {
  void import('./v2/App2.tsx').then((m) => m.mountApp2(rootElement))
}
