import { detectBPM } from '../core/bpm-detector.js';

describe('detectBPM', () => {
  it('returns an object with bpm and confidence', () => {
    const sampleRate = 44100;
    const length = sampleRate * 2; // 2 seconds of silence
    const audioData = new Float32Array(length).fill(0);

    const result = detectBPM(audioData, sampleRate);

    expect(result).toHaveProperty('bpm');
    expect(result).toHaveProperty('confidence');
  });
});
