/**
 * Pleco-XA: Professional Audio Analysis Toolkit
 * Core audio processing features (no UI components)
 */

export { BPMDetector } from './core/bpm-detector.js';
export { LivePeakExtractor } from './core/live-peak-extractor.js';
export { LoopController } from './core/loop-controller.js';
export { VolumeAnalyzer } from './core/volume-analyzer.js';
export { WaveformProcessor } from './core/waveform-processor.js';
export { AudioLoader } from './core/audio-loader.js';
export { DynamicZeroCrossing } from './core/dynamic-zero-crossing.js';

// Main class that combines all audio analysis features
export { PlecoXA } from './pleco-xa.js';