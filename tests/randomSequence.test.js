const { randomSequence } = require('../src/core/loopPlayground.js');
const { AudioContext } = require('web-audio-test-api');

test('randomSequence returns correct length and function outputs', () => {
  const ctx = new AudioContext();
  const buffer = ctx.createBuffer(1, 44100, 44100);
  const seq = randomSequence(buffer, { minMs: 10, maxMs: buffer.duration * 1000, steps: 3 });
  expect(seq.length).toBe(3);
  seq.forEach(fn => {
    const res = fn();
    expect(res).toHaveProperty('buffer');
    expect(res).toHaveProperty('loop');
  });
});
