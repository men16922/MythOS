// Entry router: Mythos 2.0 by default; 1.x classic at /?classic=1; dev sandboxes at /?sandbox=<name>.
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('MythOS root element was not found.')
}

const params = new URLSearchParams(window.location.search)

if (params.has('classic')) {
  void import('./classic.tsx').then((m) => m.mountClassic(rootElement))
} else if (params.get('sandbox') === 'combat') {
  void import('./v2/ui/combat/CombatSandbox.tsx').then((m) => m.mountCombatSandbox(rootElement))
} else {
  void import('./v2/App2.tsx').then((m) => m.mountApp2(rootElement))
}
