export function reverseBufferSection(buffer, start, end) {
  const startSample = Math.floor(start * buffer.length);
  const endSample = Math.floor(end * buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < (endSample - startSample) / 2; i++) {
      const left = startSample + i;
      const right = endSample - 1 - i;
      const tmp = data[left];
      data[left] = data[right];
      data[right] = tmp;
    }
  }
  return buffer;
}

export function halfLoop(loop, minDur) {
  const dur = loop.end - loop.start;
  const newDur = dur / 2;
  if (newDur < minDur) return loop;
  return { start: loop.start, end: loop.start + newDur };
}

export function doubleLoop(loop, maxDur) {
  const dur = loop.end - loop.start;
  const newDur = Math.min(dur * 2, maxDur);
  return { start: loop.start, end: Math.min(1, loop.start + newDur) };
}

export function moveRandom(loop) {
  const dur = loop.end - loop.start;
  if (dur >= 1) return loop;
  const newStart = Math.random() * (1 - dur);
  return { start: newStart, end: newStart + dur };
}

export function randomSequence(buffer, { minMs = 10, maxMs = buffer.duration * 1000, steps = 4 } = {}) {
  const minDur = minMs / 1000 / buffer.duration;
  const maxDur = Math.min(maxMs / 1000, buffer.duration) / buffer.duration;
  let loop = { start: 0, end: Math.min(1, maxDur) };
  const actions = ['half', 'double', 'reverse', 'move'];
  const sequence = [];
  for (let i = 0; i < steps; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const fn = () => {
      switch (action) {
        case 'half':
          loop = halfLoop(loop, minDur);
          break;
        case 'double':
          loop = doubleLoop(loop, maxDur);
          break;
        case 'reverse':
          buffer = reverseBufferSection(buffer, loop.start, loop.end);
          break;
        case 'move':
        default:
          loop = moveRandom(loop);
          break;
      }
      return { buffer, loop: { ...loop } };
    };
    fn.action = action;
    sequence.push(fn);
  }
  return sequence;
}
