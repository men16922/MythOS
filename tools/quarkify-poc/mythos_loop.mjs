// Quarkify PoC — full mythos_loop package.
// Decomposes the loop state machine (engine / validator / events) into a quark
// topology so we can A/B test quark-tree navigation vs grep-loop baseline.
// Run from the Quarkify clone:
//   cd ~/tools/quarkify && node quarkify.mjs <abs path to this file>
export default {
  name: 'mythos-loop-poc',
  srcDir: '/Users/men1692/Desktop/local/MythOS',
  outDir: '/Users/men1692/Desktop/local/MythOS/.quarkify/mythos_loop',

  sourceFiles: [
    'src/mythos_loop/**/*.py',
  ],

  perfData: {},

  guessRole(name) {
    const n = name.toLowerCase();
    if (n.includes('engine')) return 'state_machine';
    if (n.includes('validator') || n.includes('validate')) return 'validation';
    if (n.includes('events') || n.includes('event')) return 'event_builder';
    return 'loop_core';
  },
};
