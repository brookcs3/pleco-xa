import { detectBPM } from '../src/core/bpm-detector.js';

function createPulseSample(bpm, sampleRate, durationSeconds) {
  const length = Math.floor(sampleRate * durationSeconds);
  const data = new Float32Array(length);
  const samplesPerBeat = sampleRate * 60 / bpm;

  for (let i = 0; i < length; i += samplesPerBeat) {
    data[Math.floor(i)] = 1; // simple impulse on each beat
  }

  return data;
}

describe('detectBPM', () => {
  it('returns an object with bpm and confidence for a short synthetic sample', () => {
    const sampleRate = 44100;
    const audioData = createPulseSample(120, sampleRate, 2);

    const result = detectBPM(audioData, sampleRate);

    expect(result).toEqual(
      expect.objectContaining({
        bpm: expect.any(Number),
        confidence: expect.any(Number),
      }),
    );
  });
});
