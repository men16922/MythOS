// Quarkify PoC — 2nd measurement: mythos_runtime package (~10k LOC, incl. session.py 2,088 lines).
// Tests whether the grep→quark token saving grows at scale vs the small mythos_loop run.
//   cd ~/tools/quarkify && node quarkify.mjs <abs path to this file>
export default {
  name: 'mythos-runtime-poc',
  srcDir: '/Users/men1692/Desktop/local/MythOS',
  outDir: '/Users/men1692/Desktop/local/MythOS/.quarkify/mythos_runtime',

  sourceFiles: [
    'src/mythos_runtime/**/*.py',
  ],

  perfData: {},

  guessRole(name) {
    const n = name.toLowerCase();
    if (n.includes('session') || n.includes('service')) return 'orchestration';
    if (n.includes('store') || n.includes('persist')) return 'persistence';
    if (n.includes('combat')) return 'combat';
    if (n.includes('route') || n.includes('encounter') || n.includes('map')) return 'routing';
    if (n.includes('visual') || n.includes('image')) return 'visual';
    if (n.includes('cli')) return 'entrypoint';
    return 'runtime_core';
  },
};
