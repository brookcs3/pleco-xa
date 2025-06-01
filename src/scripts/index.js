/**
 * Pleco-XA: Professional Audio Analysis Toolkit
 * Core audio processing features (no UI components)
 */

// Core audio analysis modules
export { BPMDetector } from './core/analysis/BPMDetector.js'
export { LoopAnalyzer } from './core/analysis/LoopAnalyzer.js'
export { WaveformData } from './core/analysis/WaveformData.js'

// Audio playback and control
export { AudioPlayer } from './core/assets/audio/AudioPlayer.js'
export { LoopController } from './core/loop-controller.js'

// Visualization components
export { WaveformRenderer } from './core/visualization/WaveformRenderer.js'
export { SpectrumAnalyzer } from './core/visualization/SpectrumAnalyzer.js'

// Utility functions
// Export the main PlecoXA class and its methods for npm consumers
export { PlecoXA } from './pleco-xa.js'

// Optionally, export core analysis modules for advanced users
export * from './core/index.js'
