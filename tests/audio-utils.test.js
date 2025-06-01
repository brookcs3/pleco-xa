import {
  computeRMS,
  computePeak,
  computeZeroCrossingRate,
} from '../src/utils/audio-utils.js';

function createAudioBuffer(samples) {
  const data = Float32Array.from(samples);
  return {
    getChannelData: () => data,
  };
}

describe.skip('audio utils', () => {
  describe('computeRMS', () => {
    it('calculates RMS for alternating +1/-1 signal', () => {
      const buffer = createAudioBuffer([1, -1, 1, -1]);
      const rms = computeRMS(buffer);
      expect(rms).toBeCloseTo(1);
    });

    it('calculates RMS for half amplitude signal', () => {
      const buffer = createAudioBuffer([0.5, -0.5, 0.5, -0.5]);
      const rms = computeRMS(buffer);
      expect(rms).toBeCloseTo(0.5);
    });
  });

  describe('computePeak', () => {
    it('finds peak absolute amplitude', () => {
      const buffer = createAudioBuffer([-0.25, 0.5, -1, 0.75]);
      const peak = computePeak(buffer);
      expect(peak).toBeCloseTo(1);
    });
  });

  describe('computeZeroCrossingRate', () => {
    it('computes zero crossing rate for alternating +1/-1 signal', () => {
      const buffer = createAudioBuffer([1, -1, 1, -1]);
      const zcr = computeZeroCrossingRate(buffer);
      expect(zcr).toBeCloseTo(0.75);
    });

    it('is zero for constant positive signal', () => {
      const buffer = createAudioBuffer([1, 1, 1, 1]);
      const zcr = computeZeroCrossingRate(buffer);
      expect(zcr).toBe(0);
    });
  });
});
