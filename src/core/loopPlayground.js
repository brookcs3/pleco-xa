export function randomSequence(buffer, { minMs = 10, maxMs = buffer.duration * 1000, steps = 4 } = {}) {
  let loop = { start: 0, end: 1 };
  const ops = [halfLoop, doubleLoop, reverseBufferSection, moveRandom];
  const seq = [];
  for (let i = 0; i < steps; i++) {
    const fn = ops[Math.floor(Math.random() * ops.length)];
    const wrapped = () => {
      const result = fn(buffer, loop, { minMs, maxMs });
      buffer = result.buffer;
      loop = result.loop;
      return result;
    };
    wrapped.op = fn.name;
    seq.push(wrapped);
  }
  return seq;
}

function halfLoop(buffer, loop, { minMs }) {
  const duration = buffer.duration;
  const loopDurSec = (loop.end - loop.start) * duration;
  if (loopDurSec / 2 < minMs / 1000) return { buffer, loop };
  return { buffer, loop: { start: loop.start, end: loop.start + (loop.end - loop.start) / 2 } };
}

function doubleLoop(buffer, loop, { maxMs }) {
  const duration = buffer.duration;
  let newLenSec = (loop.end - loop.start) * duration * 2;
  newLenSec = Math.min(newLenSec, maxMs / 1000, duration);
  return { buffer, loop: { start: loop.start, end: Math.min(1, loop.start + newLenSec / duration) } };
}

function moveRandom(buffer, loop) {
  const loopDur = loop.end - loop.start;
  const newStart = Math.random() * (1 - loopDur);
  return { buffer, loop: { start: newStart, end: newStart + loopDur } };
}

function reverseBufferSection(buffer, loop) {
  const newBuffer = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    const out = newBuffer.getChannelData(ch);
    out.set(data);
    const start = Math.floor(loop.start * buffer.length);
    const end = Math.floor(loop.end * buffer.length);
    const len = end - start;
    for (let i = 0; i < len; i++) {
      out[start + i] = data[start + (len - 1 - i)];
    }
  }
  return { buffer: newBuffer, loop };
}
