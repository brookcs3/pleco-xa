/**
 * Pleco-XA: Professional Audio Analysis Toolkit
 * Designed for audio engineers and developers, Pleco-XA provides advanced tools for analyzing, processing, and visualizing audio data.
 * Core audio processing features (no UI components)
 */

// Core audio analysis modules
export { BPMDetector } from './src/scripts/analysis/bpm-detector.js'
export { LoopAnalyzer } from './src/scripts/analysis/LoopAnalyzer.js'
export { WaveformData } from './src/scripts/analysis/WaveformData.js'

// Audio playback and control
export { AudioPlayer } from './src/assets/audio/AudioPlayer.js'
export { LoopController } from './src/scripts/LoopController.js'

// Visualization components
export { WaveformRenderer } from './src/scripts/waveformRenderer.js'
export { SpectrumAnalyzer } from './src/scripts/SpectrumAnalyzer.js'

// Utility functions
// Export the main PlecoXA class, which provides core audio analysis and processing features, making it the primary export for npm consumers
export { PlecoXA } from './src/scripts/pleco-xa.js'

// Optionally, export core analysis modules for advanced users.
// Advanced users are developers who need direct access to low-level audio analysis tools.
// Examples of use cases include custom audio processing pipelines or integration with third-party libraries.
export { BPMDetector, LoopAnalyzer, WaveformData, AudioPlayer, LoopController, WaveformRenderer, SpectrumAnalyzer, PlecoXA } from './src/scripts/index.js'
