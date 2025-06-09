import { detectBPM } from '../scripts/analysis/BPMDetector.ts';
import { analyzeLoop } from '../scripts/analysis/LoopAnalyzer.ts';

self.onmessage = async (e) => {
  const { arrayBuffer } = e.data;
  if (!arrayBuffer) return;

  // Notify start
  self.postMessage({ progress: 0 });
  try {
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const bpmResult = await detectBPM(audioBuffer);
    self.postMessage({ progress: 0.5, bpm: bpmResult.bpm });

    const loopAnalysis = await analyzeLoop(audioBuffer);
    const best = loopAnalysis.best;
    const loopPoints = best ? { start: best.start, end: best.end } : null;

    self.postMessage({ progress: 1, bpm: bpmResult.bpm, loopPoints });
  } catch (err) {
    self.postMessage({ progress: 1, error: err.message });
  }
};
