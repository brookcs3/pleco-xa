import { xaLoopAnalysis, analyzeLoopPoints } from '../core/loop-analyzer.js';
import { AudioContext } from '../../../web-audio-test-api/index.js';  


function createLoopBuffer(loopLengthSeconds, repeats, sampleRate = 44100) {
  const ctx = new AudioContext({ sampleRate });
  const length = Math.floor(sampleRate * loopLengthSeconds * repeats);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  const segmentLength = Math.floor(sampleRate * loopLengthSeconds);

  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < segmentLength; i++) {
      const t = i / sampleRate;
      data[r * segmentLength + i] = Math.sin(2 * Math.PI * 440 * t);
    }
  }
  return buffer;
}

describe('xaLoopAnalysis', () => {
  it('detects loop boundaries for repeating audio', async () => {
    const buffer = createLoopBuffer(8, 2); // 16 seconds total duration
    const result = await xaLoopAnalysis(buffer);

    expect(result.loopStart).toBeCloseTo(0, 2);
    expect(result.loopEnd).toBeCloseTo(buffer.duration, 1);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.bpm).toBeGreaterThan(0);
  });
});

describe('analyzeLoopPoints', () => {
  it('finds loop points in repeating audio', async () => {
    const buffer = createLoopBuffer(2, 2);
    const result = await analyzeLoopPoints(buffer);

    expect(result.loopStart).toBeCloseTo(0, 2);
    expect(result.loopEnd).toBeGreaterThan(3);
    expect(result.loopEnd).toBeLessThanOrEqual(buffer.duration);
  });
});
