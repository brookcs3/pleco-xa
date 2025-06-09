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

export function glitchBurst(buffer, {
  ctx,
  durationMs = 8000,
  minMs = 100,
  maxMs = buffer.duration * 1000,
  onUpdate = () => {}
} = {}) {
  const start = performance.now();
  let loop = detectLoop(buffer);

  const weights = [
    { op: 'move', w: 40 },
    { op: 'half', w: 25 },
    { op: 'double', w: 20 },
    { op: 'reverse', w: 15 },
    { op: 'randomLocal', w: 10 }
  ];

  const totalW = weights.reduce((s, { w }) => s + w, 0);
  const pickOp = () => {
    const r = Math.random() * totalW;
    let sum = 0;
    for (const { op, w } of weights) {
      sum += w;
      if (r < sum) return op;
    }
    return 'move';
  };

  const applyOp = (op) => {
    switch (op) {
      case 'half':
        if ((loop.endSample - loop.startSample) / buffer.sampleRate / 2 >= minMs / 1000)
          loop = halfLoop(loop);
        break;
      case 'double':
        loop = doubleLoop(loop);
        break;
      case 'reverse':
        buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
        break;
      case 'move': {
        const len = loop.endSample - loop.startSample;
        let newStart = Math.floor(Math.random() * (buffer.length - len));
        loop = { startSample: newStart, endSample: newStart + len };
        break;
      }
      case 'randomLocal':
        return doRandomLocal();
    }
    return [op];
  };

  const doRandomLocal = () => {
    const subOps = [];
    subOps.push('reset');
    const count = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const maybeHalf = () =>
        (loop.endSample - loop.startSample) / buffer.sampleRate / 2 >= minMs / 1000;
      const maybeMove = () =>
        (loop.endSample - loop.startSample) / buffer.sampleRate < buffer.duration;

      const candidates = [
        maybeHalf() && 'half',
        'double',
        maybeMove() && 'move',
        'reverse'
      ].filter(Boolean);

      const op = candidates[Math.floor(Math.random() * candidates.length)];
      applyOp(op);
      subOps.push(op);
    }
    return subOps;
  };

  const step = () => {
    if (performance.now() - start >= durationMs) return;

    const op = pickOp();
    const subOps = applyOp(op);
    onUpdate(buffer, loop, op, subOps);

    setTimeout(step, 100 + Math.random() * 100);
  };

  step();
}
