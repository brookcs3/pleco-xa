import {
  halfLoop,
  doubleLoop,
  moveForward,
  reverseBufferSection,
  detectLoop,
} from './loopHelpers.js';

export function signatureDemo(buffer) {
  const steps = [];
  let loop = detectLoop(buffer);

  const push = (op, mutator) => {
    steps.push({
      op,
      fn: () => {
        mutator();
        return { buffer, loop, op };
      },
    });
  };

  while ((loop.endSample - loop.startSample) / buffer.sampleRate > 0.1) {
    push('half', () => {
      loop = halfLoop(loop);
    });
  }
  push('reverse', () => {
    buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
  });

  while (loop.startSample !== 0 || loop.endSample !== buffer.length) {
    push('double', () => {
      loop = doubleLoop(loop, buffer.length);
    });
    push('reverse', () => {
      buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
    });
  }

  const repeatHalfDoubleReverse = () => {
    while ((loop.endSample - loop.startSample) / buffer.sampleRate > 0.1) {
      push('half', () => {
        loop = halfLoop(loop);
      });
    }
    while (loop.startSample !== 0 || loop.endSample !== buffer.length) {
      push('double', () => {
        loop = doubleLoop(loop, buffer.length);
      });
      push('reverse', () => {
        buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
      });
    }
  };
  repeatHalfDoubleReverse();

  while ((loop.endSample - loop.startSample) / buffer.sampleRate > 0.1) {
    push('half', () => {
      loop = halfLoop(loop);
    });
  }
  while (loop.startSample !== 0 || loop.endSample !== buffer.length) {
    push('double', () => {
      loop = doubleLoop(loop, buffer.length);
    });
    push('double', () => {
      loop = doubleLoop(loop, buffer.length);
    });
    push('reverse', () => {
      buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
    });
  }

  while ((loop.endSample - loop.startSample) / buffer.sampleRate > 0.1) {
    push('half', () => {
      loop = halfLoop(loop);
    });
  }
  const mf = (n) => () => {
    loop = moveForward(loop, n, buffer.length);
  };

  push('move×3', mf(3));
  push('reverse', () => {
    buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
  });
  push('move×2', mf(2));
  push('reverse', () => {
    buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
  });
  push('move×1', mf(1));
  push('double', () => {
    loop = doubleLoop(loop, buffer.length);
  });
  push('double', () => {
    loop = doubleLoop(loop, buffer.length);
  });
  push('double', () => {
    loop = doubleLoop(loop, buffer.length);
  });
  push('reverse', () => {
    buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
  });
  push('move×2', mf(2));
  push('double', () => {
    loop = doubleLoop(loop, buffer.length);
  });
  push('reverse', () => {
    buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
  });
  push('move×1', mf(1));
  push('reverse', () => {
    buffer = reverseBufferSection(buffer, loop.startSample, loop.endSample);
  });

  return steps;
}
