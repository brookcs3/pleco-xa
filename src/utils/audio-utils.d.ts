// Type declarations for audio-utils.js to resolve import errors in TypeScript
export function computeRMS(audioBuffer: AudioBuffer): number
export function computePeak(audioBuffer: AudioBuffer): number
export function computeZeroCrossingRate(audioBuffer: AudioBuffer): number
export function findAllZeroCrossings(
  audioData: Float32Array,
  start: number,
): number[]
export function findAudioStart(
  audioData: Float32Array,
  sampleRate: number,
): number
export function applyHannWindow(audioData: Float32Array): Float32Array
