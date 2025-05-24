import { analyzeLoop } from './loopAnalysis';

const DEBUG_ENABLED = Boolean(process.env.PLECO_DEBUG);

function debugLog(...args: any[]) {
  if (DEBUG_ENABLED) {
    debugLog(...args);
  }
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node analyzeSample.js <path>');
  process.exit(1);
}

analyzeLoop(file).then(({ loopStart, loopEnd }) => {
  debugLog('loopStart', loopStart.toFixed(3), 'loopEnd', loopEnd.toFixed(3));
});

