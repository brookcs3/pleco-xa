/**
 * AudioMath - Framework-agnostic audio mathematics utilities
 *
 * Provides pure mathematical functions for audio processing including
 * conversions, calculations, and signal processing utilities.
 * No Web Audio API dependencies - pure math functions.
 *
 * @module AudioMath
 * @author PlecoXA Audio Analysis
 */

/**
 * Audio mathematics constants
 */
export const AudioConstants = {
  // Reference values
  A4_FREQUENCY: 440,
  SILENCE_THRESHOLD: -96, // dB
  REFERENCE_AMPLITUDE: 1.0,

  // MIDI constants
  MIDI_A4: 69,
  MIDI_MIN: 0,
  MIDI_MAX: 127,

  // Time constants
  SECONDS_PER_MINUTE: 60,
  MS_PER_SECOND: 1000,

  // Mathematical constants
  TWO_PI: 2 * Math.PI,
  SQRT_2: Math.sqrt(2),
  LOG10_2: Math.log10(2),
  LN_10: Math.ln(10),
}

/**
 * Converts linear amplitude to decibels
 *
 * @param {number} amplitude - Linear amplitude value
 * @param {number} [reference=1.0] - Reference amplitude
 * @returns {number} Amplitude in decibels
 *
 * @example
 * ```javascript
 * import { amplitudeToDb } from './utils/AudioMath.js';
 *
 * const db = amplitudeToDb(0.5);     // -6.02 dB
 * const dbRef = amplitudeToDb(0.5, 0.707); // -3.01 dB
 * ```
 */
export function amplitudeToDb(
  amplitude,
  reference = AudioConstants.REFERENCE_AMPLITUDE,
) {
  if (amplitude <= 0) return AudioConstants.SILENCE_THRESHOLD
  return 20 * Math.log10(Math.abs(amplitude) / reference)
}

/**
 * Converts decibels to linear amplitude
 *
 * @param {number} db - Decibel value
 * @param {number} [reference=1.0] - Reference amplitude
 * @returns {number} Linear amplitude value
 *
 * @example
 * ```javascript
 * import { dbToAmplitude } from './utils/AudioMath.js';
 *
 * const amp = dbToAmplitude(-6);     // 0.501
 * const ampRef = dbToAmplitude(-6, 0.707); // 0.354
 * ```
 */
export function dbToAmplitude(
  db,
  reference = AudioConstants.REFERENCE_AMPLITUDE,
) {
  return reference * Math.pow(10, db / 20)
}

/**
 * Converts frequency to MIDI note number
 *
 * @param {number} frequency - Frequency in Hz
 * @returns {number} MIDI note number (69 = A4 = 440Hz)
 *
 * @example
 * ```javascript
 * import { frequencyToMidi } from './utils/AudioMath.js';
 *
 * const midi = frequencyToMidi(440);    // 69 (A4)
 * const midi2 = frequencyToMidi(880);   // 81 (A5)
 * ```
 */
export function frequencyToMidi(frequency) {
  if (frequency <= 0) return 0
  return (
    AudioConstants.MIDI_A4 +
    12 * Math.log2(frequency / AudioConstants.A4_FREQUENCY)
  )
}

/**
 * Converts MIDI note number to frequency
 *
 * @param {number} midiNote - MIDI note number
 * @returns {number} Frequency in Hz
 *
 * @example
 * ```javascript
 * import { midiToFrequency } from './utils/AudioMath.js';
 *
 * const freq = midiToFrequency(69);   // 440 Hz (A4)
 * const freq2 = midiToFrequency(81);  // 880 Hz (A5)
 * ```
 */
export function midiToFrequency(midiNote) {
  return (
    AudioConstants.A4_FREQUENCY *
    Math.pow(2, (midiNote - AudioConstants.MIDI_A4) / 12)
  )
}

/**
 * Converts frequency to musical note name
 *
 * @param {number} frequency - Frequency in Hz
 * @param {boolean} [useFlats=false] - Use flats instead of sharps
 * @returns {string} Note name (e.g., "A4", "C#3")
 *
 * @example
 * ```javascript
 * import { frequencyToNote } from './utils/AudioMath.js';
 *
 * const note = frequencyToNote(440);    // "A4"
 * const note2 = frequencyToNote(261.63); // "C4"
 * const flat = frequencyToNote(277.18, true); // "Db4"
 * ```
 */
export function frequencyToNote(frequency, useFlats = false) {
  const noteNames = useFlats
    ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  const midi = frequencyToMidi(frequency)
  const noteIndex = Math.round(midi) % 12
  const octave = Math.floor(Math.round(midi) / 12) - 1

  return noteNames[noteIndex] + octave
}

/**
 * Converts BPM and note value to duration in seconds
 *
 * @param {number} bpm - Beats per minute
 * @param {number} [noteValue=4] - Note value (4=quarter, 8=eighth, etc.)
 * @returns {number} Duration in seconds
 *
 * @example
 * ```javascript
 * import { bpmToSeconds } from './utils/AudioMath.js';
 *
 * const quarter = bpmToSeconds(120, 4);    // 0.5 seconds
 * const eighth = bpmToSeconds(120, 8);     // 0.25 seconds
 * const whole = bpmToSeconds(120, 1);      // 2.0 seconds
 * ```
 */
export function bpmToSeconds(bpm, noteValue = 4) {
  return (AudioConstants.SECONDS_PER_MINUTE / bpm) * (4 / noteValue)
}

/**
 * Converts duration in seconds to BPM for given note value
 *
 * @param {number} seconds - Duration in seconds
 * @param {number} [noteValue=4] - Note value (4=quarter, 8=eighth, etc.)
 * @returns {number} BPM value
 *
 * @example
 * ```javascript
 * import { secondsToBpm } from './utils/AudioMath.js';
 *
 * const bpm = secondsToBpm(0.5, 4);      // 120 BPM
 * const bpm2 = secondsToBpm(1.0, 4);     // 60 BPM
 * ```
 */
export function secondsToBpm(seconds, noteValue = 4) {
  return (AudioConstants.SECONDS_PER_MINUTE * (4 / noteValue)) / seconds
}

/**
 * Calculates RMS (Root Mean Square) of an array
 *
 * @param {Float32Array|Array} samples - Audio sample array
 * @returns {number} RMS value
 *
 * @example
 * ```javascript
 * import { calculateRMS } from './utils/AudioMath.js';
 *
 * const samples = new Float32Array([0.5, -0.3, 0.8, -0.2]);
 * const rms = calculateRMS(samples);     // 0.516
 * ```
 */
export function calculateRMS(samples) {
  if (samples.length === 0) return 0

  let sumSquares = 0
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i]
  }

  return Math.sqrt(sumSquares / samples.length)
}

/**
 * Calculates peak amplitude in an array
 *
 * @param {Float32Array|Array} samples - Audio sample array
 * @returns {number} Peak amplitude (absolute value)
 *
 * @example
 * ```javascript
 * import { calculatePeak } from './utils/AudioMath.js';
 *
 * const samples = new Float32Array([0.5, -0.8, 0.3, -0.2]);
 * const peak = calculatePeak(samples);   // 0.8
 * ```
 */
export function calculatePeak(samples) {
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i])
    if (abs > peak) peak = abs
  }
  return peak
}

/**
 * Normalizes an array to specified peak level
 *
 * @param {Float32Array|Array} samples - Audio sample array
 * @param {number} [targetPeak=1.0] - Target peak level
 * @returns {Float32Array} Normalized array
 *
 * @example
 * ```javascript
 * import { normalize } from './utils/AudioMath.js';
 *
 * const samples = new Float32Array([0.2, -0.4, 0.1]);
 * const normalized = normalize(samples, 0.8);  // Scale to 0.8 peak
 * ```
 */
export function normalize(samples, targetPeak = 1.0) {
  const currentPeak = calculatePeak(samples)
  if (currentPeak === 0) return new Float32Array(samples)

  const scaleFactor = targetPeak / currentPeak
  const normalized = new Float32Array(samples.length)

  for (let i = 0; i < samples.length; i++) {
    normalized[i] = samples[i] * scaleFactor
  }

  return normalized
}

/**
 * Applies a fade in/out to an array
 *
 * @param {Float32Array|Array} samples - Audio sample array
 * @param {number} fadeInSamples - Number of samples for fade in
 * @param {number} fadeOutSamples - Number of samples for fade out
 * @param {string} [curve='linear'] - Fade curve: 'linear', 'exponential', 'logarithmic'
 * @returns {Float32Array} Faded array
 *
 * @example
 * ```javascript
 * import { applyFade } from './utils/AudioMath.js';
 *
 * const faded = applyFade(samples, 1000, 1000, 'exponential');
 * ```
 */
export function applyFade(
  samples,
  fadeInSamples,
  fadeOutSamples,
  curve = 'linear',
) {
  const result = new Float32Array(samples)
  const length = samples.length

  // Fade in
  for (let i = 0; i < Math.min(fadeInSamples, length); i++) {
    const progress = i / fadeInSamples
    const gain = getFadeGain(progress, curve)
    result[i] *= gain
  }

  // Fade out
  for (let i = 0; i < Math.min(fadeOutSamples, length); i++) {
    const sampleIndex = length - 1 - i
    const progress = i / fadeOutSamples
    const gain = getFadeGain(progress, curve)
    result[sampleIndex] *= gain
  }

  return result
}

/**
 * Calculates crossfade between two arrays
 *
 * @param {Float32Array|Array} samplesA - First audio array
 * @param {Float32Array|Array} samplesB - Second audio array
 * @param {number} crossfadeLength - Length of crossfade in samples
 * @param {string} [curve='linear'] - Crossfade curve
 * @returns {Float32Array} Crossfaded result
 *
 * @example
 * ```javascript
 * import { crossfade } from './utils/AudioMath.js';
 *
 * const result = crossfade(samplesA, samplesB, 1000, 'exponential');
 * ```
 */
export function crossfade(
  samplesA,
  samplesB,
  crossfadeLength,
  curve = 'linear',
) {
  const minLength = Math.min(samplesA.length, samplesB.length)
  const fadeLength = Math.min(crossfadeLength, minLength)
  const result = new Float32Array(minLength)

  for (let i = 0; i < minLength; i++) {
    if (i < fadeLength) {
      // Crossfade region
      const progress = i / fadeLength
      const gainA = getFadeGain(1 - progress, curve)
      const gainB = getFadeGain(progress, curve)
      result[i] = samplesA[i] * gainA + samplesB[i] * gainB
    } else {
      // Use samplesB after crossfade
      result[i] = samplesB[i]
    }
  }

  return result
}

/**
 * Converts samples to time based on sample rate
 *
 * @param {number} samples - Number of samples
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {number} Time in seconds
 *
 * @example
 * ```javascript
 * import { samplesToTime } from './utils/AudioMath.js';
 *
 * const time = samplesToTime(44100, 44100);  // 1.0 second
 * ```
 */
export function samplesToTime(samples, sampleRate) {
  return samples / sampleRate
}

/**
 * Converts time to samples based on sample rate
 *
 * @param {number} time - Time in seconds
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {number} Number of samples
 *
 * @example
 * ```javascript
 * import { timeToSamples } from './utils/AudioMath.js';
 *
 * const samples = timeToSamples(1.0, 44100);  // 44100 samples
 * ```
 */
export function timeToSamples(time, sampleRate) {
  return Math.floor(time * sampleRate)
}

/**
 * Calculates the Nyquist frequency for given sample rate
 *
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {number} Nyquist frequency in Hz
 *
 * @example
 * ```javascript
 * import { nyquistFrequency } from './utils/AudioMath.js';
 *
 * const nyquist = nyquistFrequency(44100);  // 22050 Hz
 * ```
 */
export function nyquistFrequency(sampleRate) {
  return sampleRate / 2
}

/**
 * Checks if a frequency is within audible range
 *
 * @param {number} frequency - Frequency in Hz
 * @param {number} [minFreq=20] - Minimum audible frequency
 * @param {number} [maxFreq=20000] - Maximum audible frequency
 * @returns {boolean} True if frequency is audible
 *
 * @example
 * ```javascript
 * import { isAudibleFrequency } from './utils/AudioMath.js';
 *
 * const audible = isAudibleFrequency(440);    // true
 * const inaudible = isAudibleFrequency(25000); // false
 * ```
 */
export function isAudibleFrequency(frequency, minFreq = 20, maxFreq = 20000) {
  return frequency >= minFreq && frequency <= maxFreq
}

/**
 * Calculates cents difference between two frequencies
 *
 * @param {number} freq1 - First frequency in Hz
 * @param {number} freq2 - Second frequency in Hz
 * @returns {number} Difference in cents (1200 cents = 1 octave)
 *
 * @example
 * ```javascript
 * import { centsDifference } from './utils/AudioMath.js';
 *
 * const cents = centsDifference(440, 880);  // 1200 cents (1 octave)
 * const cents2 = centsDifference(440, 466); // ~100 cents
 * ```
 */
export function centsDifference(freq1, freq2) {
  if (freq1 <= 0 || freq2 <= 0) return 0
  return 1200 * Math.log2(freq2 / freq1)
}

/**
 * Linearly interpolates between two values
 *
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 *
 * @example
 * ```javascript
 * import { lerp } from './utils/AudioMath.js';
 *
 * const result = lerp(0, 100, 0.5);  // 50
 * const result2 = lerp(440, 880, 0.25); // 550
 * ```
 */
export function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

/**
 * Clamps a value between min and max
 *
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 *
 * @example
 * ```javascript
 * import { clamp } from './utils/AudioMath.js';
 *
 * const result = clamp(150, 0, 100);  // 100
 * const result2 = clamp(-5, 0, 100);  // 0
 * ```
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

// Private helper functions

/**
 * Get fade gain for different curve types
 * @private
 */
function getFadeGain(progress, curve) {
  switch (curve) {
    case 'exponential':
      return Math.pow(progress, 2)
    case 'logarithmic':
      return Math.sqrt(progress)
    case 'sine':
      return Math.sin((progress * Math.PI) / 2)
    case 'cosine':
      return 1 - Math.cos((progress * Math.PI) / 2)
    default: // linear
      return progress
  }
}
