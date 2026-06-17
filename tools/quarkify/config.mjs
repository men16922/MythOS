// Quarkify — whole-src config for Project MythOS.
// Decomposes the entire Python backend (src/**/*.py, ~18k LOC across the
// mythos_* packages) into one quark topology under .quarkify/src/.
// One tree is enough: quark folder names embed the full path
// (file__src_mythos_<pkg>_<module>_…), so packages are self-namespaced and
// `_mirror/by_role/` aggregates roles across the whole codebase.
//
// Run (via Makefile): `make quarkify`  (which calls tools/quarkify/generate.sh)
// Direct:  node "$QUARKIFY_HOME/quarkify.mjs" <abs path to this file>
export default {
  name: 'mythos-src',
  srcDir: '/Users/men1692/Desktop/local/MythOS',
  outDir: '/Users/men1692/Desktop/local/MythOS/.quarkify/src',

  sourceFiles: [
    'src/**/*.py',
  ],

  perfData: {},

  // Coarse role tags used by _mirror/by_role/. Order matters: first match wins.
  guessRole(name) {
    const n = name.toLowerCase();
    if (n.includes('cli')) return 'entrypoint';
    if (n.includes('session') || n.includes('service')) return 'orchestration';
    if (n.includes('store') || n.includes('postgres') || n.includes('persist')) return 'persistence';
    if (n.includes('director') || n.includes('parser') || n.includes('prompt') || n.includes('narrative')) return 'narrative_gen';
    if (n.includes('flux') || n.includes('generator') || n.includes('image') || n.includes('visual')) return 'image_gen';
    if (n.includes('combat') || n.includes('encounter') || n.includes('skill')) return 'combat';
    if (n.includes('route') || n.includes('map')) return 'routing';
    if (n.includes('valid')) return 'validation';
    if (n.includes('engine') || n.includes('loop')) return 'state_machine';
    if (n.includes('event')) return 'event_builder';
    if (n.includes('model') || n.includes('schema') || n.includes('ids') || n.includes('seed') || n.includes('clock')) return 'domain';
    if (n.includes('api') || n.includes('server') || n.includes('router')) return 'api';
    if (n.includes('observ') || n.includes('telemetry') || n.includes('log')) return 'observability';
    return 'runtime_core';
  },
};
