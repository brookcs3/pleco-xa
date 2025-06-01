/**
 * Pleco-XA: Professional Audio Analysis Toolkit
 * Designed for audio engineers and developers, Pleco-XA provides advanced tools for analyzing, processing, and visualizing audio data.
 * Core audio processing features (no UI components)
 */

// Core audio analysis modules
export { BPMDetector } from './scripts/analysis/bpm-detector.js'
export { LoopAnalyzer } from './scripts/analysis/LoopAnalyzer.js'
export { WaveformData } from './scripts/analysis/WaveformData.js'

// Audio playback and control
export { AudioPlayer } from './assets/audio/AudioPlayer.js'
export { LoopController } from './scripts/loop-controller.js'

// Visualization components
export { WaveformRenderer } from './scripts/WaveformRenderer.js'
export { SpectrumAnalyzer } from './scripts/SpectrumAnalyzer.js'

// Utility functions
// Export the main PlecoXA class, which provides core audio analysis and processing features, making it the primary export for npm consumers
export { PlecoXA } from './scripts/pleco-xa.js'
