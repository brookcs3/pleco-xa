export { signatureDemo } from './demoSequences.js';
export {
  detectLoop,
  halfLoop,
  doubleLoop,
  moveForward,
  reverseBufferSection,
} from './loopHelpers.js';
export { randomSequence, glitchBurst, randomLocal } from './loopPlayground.js';
export { startBeatGlitch } from './beatGlitcher.js';
export { GibClock } from './GibClock.js';

// DSP helper utilities
export {
  createLoopBuffer,
  exportBufferAsWav,
  computeRMS,
  defineMultipleLoopPoints,
  computePeak,
  computeZeroCrossingRate,
  findZeroCrossing,
  findAllZeroCrossings,
  findAudioStart,
  applyHannWindow,
} from '../scripts/audio-utils.js';

// Audio compression helpers
export { pitchBasedCompress, tempoBasedCompress } from '../scripts/compression.js';

// Musical timing utilities
export { calculateBeatAlignment } from '../scripts/musical-timing.js';

// Debug utilities
export { debugLog, setDebug, isDebugEnabled } from '../scripts/debug.js';
