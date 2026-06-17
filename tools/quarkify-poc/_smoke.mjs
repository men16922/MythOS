// Quarkify PoC — gate smoke: single Python file only.
// Verifies the Python parser actually decomposes a real MythOS file into a
// class/method/statement folder tree before we commit to the full package run.
export default {
  name: 'mythos-loop-smoke',
  srcDir: '/Users/men1692/Desktop/local/MythOS',
  outDir: '/Users/men1692/Desktop/local/MythOS/.quarkify/_smoke',

  sourceFiles: [
    'src/mythos_loop/validator.py',
  ],

  perfData: {},

  guessRole(name) {
    const n = name.toLowerCase();
    if (n.includes('validate') || n.includes('check')) return 'validation';
    return 'loop_core';
  },
};
