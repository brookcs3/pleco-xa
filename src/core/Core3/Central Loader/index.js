// index.js - Central loader for BPM analysis modules

// Re-export core analysis functions
export { detectBPM, fastBPMDetect } from './BPMDetector.js'
export { beatTrack, estimateTempo, trackBeats } from './xa-beat.js'
export { onsetDetect, onset_strength } from './xa-onset.js'
export { tempo, beat_track as advancedBeatTrack } from './xa-tempo.js'  // advanced analysis (alias beat_track if needed)

// Re-export file and audio I/O utilities for convenience
export { example, exampleBuffer, exampleAudio, listExamples, loadFile } from './xa-file.js'
export { play, stop, load as loadAudio, clicks } from './xa-audioio.js'

// Optionally, export the advanced BeatTracker class for specialized use
export { BeatTracker } from './xa-beat-tracker.js'

// The above exports let users import what they need from this index.
// For example: import { detectBPM, exampleBuffer, play } from 'pleco-xa-bpm/index.js';
