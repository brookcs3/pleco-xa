import { analyzeLoop } from './loopAnalysis';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node analyzeSample.js <path>');
  process.exit(1);
}

analyzeLoop(file).then(({ loopStart, loopEnd }) => {
  console.log('loopStart', loopStart.toFixed(3), 'loopEnd', loopEnd.toFixed(3));
});

