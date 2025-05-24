/**
 * Pleco Xa - Browser-native audio analysis engine
 * Author: Cameron Brooks
 * 
 * Main exports for the Pleco Xa audio analysis library
 */

// Core audio analysis functions
export { detectBPM } from './core/bpm-detector.js';
export { musicalLoopAnalysis, librosaLoopAnalysis, analyzeLoopPoints } from './core/loop-analyzer.js';
export { computeSpectralCentroid, computeSpectrum, computeFFT } from './core/spectral.js';
export { calculateBeatAlignment } from './core/musical-timing.js';

// Basic audio processing
export { loadAudioBuffer, computeRMS, computePeak, computeZeroCrossingRate } from './core/audio-utils.js';

// Audio manipulation
export { pitchBasedCompress, tempoBasedCompress } from './core/compression.js';

// Utility functions
export { 
  findZeroCrossing, 
  findAudioStart, 
  applyHannWindow,
  createReferenceTemplate,
  analyzeWithReference
} from './utils/audio-utils.js';

// Interactive classes
export { WaveformEditor } from './classes/WaveformEditor.js';
export { LoopPlayer } from './classes/LoopPlayer.js';

// Version info
export const version = '1.0.0';
export const name = 'Pleco Xa';
export const author = 'Cameron Brooks';