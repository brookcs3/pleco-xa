import { signatureDemo } from '../src/core/index.js';
import { AudioContext } from '../web-audio-test-api/index.js';

describe('signatureDemo', () => {
  it('returns expected number of steps', () => {
    const ctx = new AudioContext({ sampleRate: 44100 });
    const buffer = ctx.createBuffer(1, 44100, 44100);
    const steps = signatureDemo(buffer);
    expect(steps).toHaveLength(54);
  });
});
