import {
  detectLoop,
  halfLoop,
  doubleLoop,
  moveForward,
  reverseBufferSection,
} from './loopHelpers.js';

export function randomSequence(
  buffer,
  { minMs = 10, maxMs = buffer.duration * 1000, steps = 4 } = {},
) {
  const minSamples = Math.floor((minMs / 1000) * buffer.sampleRate);
  const maxSamples = Math.min(
    Math.floor((maxMs / 1000) * buffer.sampleRate),
    buffer.length,
  );

  let loop = detectLoop(buffer);
  loop.endSample = Math.min(loop.startSample + maxSamples, buffer.length);

  const actions = ['half', 'double', 'move', 'reverse'];
  const sequence = [];

  for (let i = 0; i < steps; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const fn = () => {
      switch (action) {
        case 'half':
          if (loop.endSample - loop.startSample >= 2 * minSamples) {
            loop = halfLoop(loop);
          }
          break;
        case 'double':
          loop = doubleLoop(loop, maxSamples);
          break;
        case 'move': {
          const len = loop.endSample - loop.startSample;
          const maxMove = buffer.length - len;
          const step = Math.floor(Math.random() * (maxMove + 1));
          loop = moveForward(loop, step, buffer.length);
          break;
        }
        case 'reverse':
          buffer = reverseBufferSection(
            buffer,
            loop.startSample,
            loop.endSample,
          );
          break;
      }
      return { buffer, loop, op: action };
    };
    fn.op = action;
    sequence.push(fn);
  }

  return sequence;
}
