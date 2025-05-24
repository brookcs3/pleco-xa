import { analyzeLoop } from './loopAnalysis';

const file = Bun.argv[2];
if (!file) {
  console.error('Usage: bun run analyzeSample.ts <path>');
  process.exit(1);
}

analyzeLoop(file).then(({ loopStart, loopEnd }) => {
  console.log('loopStart', loopStart.toFixed(3), 'loopEnd', loopEnd.toFixed(3));
});

