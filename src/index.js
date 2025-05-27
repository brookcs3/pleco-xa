/**
 * Pleco-XA: Professional Audio Analysis Toolkit
 * Core audio processing features (no UI components)
 */

// Core audio analysis modules
export { BPMDetector } from './core/analysis/BPMDetector.js';
export { LoopAnalyzer } from './core/analysis/LoopAnalyzer.js';
export { WaveformData } from './core/analysis/WaveformData.js';

// Audio playback and control
export { AudioPlayer } from './core/audio/AudioPlayer.js';
export { LoopController } from './core/loop-controller.js';

// Visualization components
export { WaveformRenderer } from './core/visualization/WaveformRenderer.js';
export { SpectrumAnalyzer } from './core/visualization/SpectrumAnalyzer.js';

// Utility functions
export { analyzeAudio } from './utils/audio-utils.js';
export { updateTrackInfo, updateLoopInfo, showError } from './utils/ui-utils.js';
export { playAudio, stopAudio } from './utils/playback-utils.js';
export { halfLoop, doubleLoop, moveForward } from './utils/loop-utils.js';
export { drawWaveform } from './utils/waveform-utils.js';