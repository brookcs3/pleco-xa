/**
 * Pleco Xa - Astro Components
 * Entry point for Astro-specific exports
 */

// Export Astro components (these will be .astro files)
export { default as PlecoAnalyzer } from './PlecoAnalyzer.astro';
export { default as WaveformEditor } from './WaveformEditor.astro';
export { default as BPMDetector } from './BPMDetector.astro';
export { default as LoopPlayer } from './LoopPlayer.astro';

// Re-export core functions for convenience
export * from '../src/index.js';