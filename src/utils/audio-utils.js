/**
 * Audio utility functions
 * Part of Pleco Xa audio analysis engine
 */

import { debugLog } from './debug.js';

/**
 * Compute RMS (Root Mean Square) energy of an audio buffer
 * @param {AudioBuffer} audioBuffer - Web Audio API buffer
 * @returns {number} RMS value
 */
export function computeRMS(audioBuffer) {
  const channel = audioBuffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < channel.length; i++) {
    const v = channel[i];
    sum += v * v;
  }
  return Math.sqrt(sum / channel.length);
}

/**
 * Compute peak amplitude of an audio buffer
 * @param {AudioBuffer} audioBuffer - Web Audio API buffer
 * @returns {number} Peak amplitude value
 */
export function computePeak(audioBuffer) {
  const channel = audioBuffer.getChannelData(0);
  let max = 0;
  for (let i = 0; i < channel.length; i++) {
    const v = Math.abs(channel[i]);
    if (v > max) max = v;
  }
  return max;
}

/**
 * Compute zero crossing rate of an audio buffer
 * Indicates how often the signal changes sign
 * @param {AudioBuffer} audioBuffer - Web Audio API buffer
 * @returns {number} Zero crossing rate
 */
export function computeZeroCrossingRate(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  let crossings = 0;
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / channelData.length;
}

/**
 * Find zero crossing point in audio data for clean boundaries
 * @param {Float32Array} data - Audio data
 * @param {number} startIndex - Starting index to search from
 * @returns {number} Index of zero crossing
 */
export function findZeroCrossing(data, startIndex) {
  for (let i = startIndex; i < data.length - 1; i++) {
    if (data[i] >= 0 && data[i + 1] < 0) {
      return i;
    }
  }
  return startIndex;
}

/**
 * Find first non-silent region in audio
 * @param {Float32Array} channelData - Audio channel data
 * @param {number} sampleRate - Sample rate
 * @param {number} threshold - Silence threshold (default 0.01)
 * @returns {number} Sample index where audio content starts
 */
export function findAudioStart(channelData, sampleRate, threshold = 0.01) {
  const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
  
  for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
    const window = channelData.slice(i, i + windowSize);
    const rms = Math.sqrt(window.reduce((sum, sample) => sum + sample * sample, 0) / windowSize);
    
    if (rms > threshold) {
      // Found audio content, back up slightly and find zero crossing
      const startSearch = Math.max(0, i - windowSize);
      return findZeroCrossing(channelData, startSearch);
    }
  }
  
  return 0; // Fallback to beginning
}

/**
 * Apply Hann window to audio data for spectral analysis
 * @param {Float32Array} data - Input audio data
 * @returns {Float32Array} Windowed audio data
 */
export function applyHannWindow(data) {
  const windowed = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (data.length - 1)));
    windowed[i] = data[i] * window;
  }
  return windowed;
}

/**
 * Create reference template from known-good loop
 * @param {AudioBuffer} audioBuffer - Audio buffer
 * @param {number} loopStart - Loop start time in seconds
 * @param {number} loopEnd - Loop end time in seconds
 * @returns {Promise<Object>} Reference template object
 */
export async function createReferenceTemplate(audioBuffer, loopStart, loopEnd) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(loopStart * sampleRate);
  const endSample = Math.floor(loopEnd * sampleRate);
  
  // Extract the reference loop segment
  const loopSegment = channelData.slice(startSample, endSample);
  
  // Import heavy spectral helper lazily
  const { computeSpectralCentroid } = await import('../core/spectral.js');
  
  // Compute reference characteristics
  const template = {
    duration: loopEnd - loopStart,
    samples: loopSegment.length,
    rms: computeRMS(audioBuffer),
    peak: computePeak(audioBuffer),
    spectralCentroid: computeSpectralCentroid(audioBuffer),
    zeroCrossingRate: computeZeroCrossingRate(audioBuffer),
    segment: loopSegment,
    sampleRate: sampleRate
  };
  
  debugLog('Reference template created:', template);
  return template;
}

/**
 * Analyze longer track using reference template
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @param {Object} template - Reference template
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeWithReference(audioBuffer, template) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = channelData.length;
  
  const templateLength = template.segment.length;
  const stepSize = Math.floor(sampleRate * 0.1); // Check every 100ms
  
  debugLog(`Reference analysis: scanning ${totalSamples} samples with template of ${templateLength} samples`);
  
  let bestMatch = {
    position: 0,
    correlation: -Infinity,
    confidence: 0
  };
  
  // Slide the template across the audio to find best match
  for (let pos = 0; pos < totalSamples - templateLength; pos += stepSize) {
    const segment = channelData.slice(pos, pos + templateLength);
    
    // Skip if segment is mostly silence
    const segmentRMS = Math.sqrt(segment.reduce((sum, val) => sum + val * val, 0) / segment.length);
    if (segmentRMS < template.rms * 0.3) continue;
    
    // Cross-correlation with template
    let correlation = 0;
    for (let i = 0; i < templateLength; i++) {
      correlation += segment[i] * template.segment[i];
    }
    
    correlation /= templateLength;
    
    if (correlation > bestMatch.correlation) {
      bestMatch = {
        position: pos,
        correlation: correlation,
        confidence: correlation / Math.max(template.rms, segmentRMS)
      };
    }
  }
  
  // Refine the match with precise zero-crossing
  const startSample = findZeroCrossing(channelData, bestMatch.position);
  const endSample = findZeroCrossing(channelData, bestMatch.position + templateLength);
  
  const result = {
    loopStart: startSample / sampleRate,
    loopEnd: endSample / sampleRate,
    confidence: bestMatch.confidence,
    referenceMatch: bestMatch.correlation,
    templateUsed: true
  };
  
  debugLog('Reference-guided result:', result);
  return result;
}

/**
 * Compute RMS energy of raw PCM data
 * @param {Float32Array} y - Audio samples
 * @returns {number} RMS energy
 */
export function rms_energy(y) {
  const sum = y.reduce((acc, v) => acc + v * v, 0);
  return Math.sqrt(sum / y.length);
}

/**
 * Convert linear amplitude to decibels
 * @param {number} level - Linear amplitude
 * @param {number} ref - Reference level (default 1.0)
 * @returns {number} Level in dB
 */
export function amplitude_to_db(level, ref = 1.0) {
  return 20 * Math.log10(Math.abs(level) / ref);
}

/**
 * Convert dB back to linear amplitude
 * @param {number} db - Level in dB
 * @param {number} ref - Reference level (default 1.0)
 * @returns {number} Linear amplitude
 */
export function db_to_amplitude(db, ref = 1.0) {
  return ref * Math.pow(10, db / 20);
}

/**
 * Convert frames to sample indices
 * @param {Array|number} frames
 * @param {number} hop_length
 * @returns {Array|number}
 */
export function frames_to_samples(frames, hop_length = 512) {
  if (Array.isArray(frames)) {
    return frames.map((f) => Math.round(f * hop_length));
  }
  return Math.round(frames * hop_length);
}

/**
 * Convert frame indices to time values
 * @param {Array|number} frames
 * @param {number} sr
 * @param {number} hop_length
 * @returns {Array|number}
 */
export function frames_to_time(frames, sr = 22050, hop_length = 512) {
  if (Array.isArray(frames)) {
    return frames.map((f) => (f * hop_length) / sr);
  }
  return (frames * hop_length) / sr;
}

/**
 * Convert samples to frame indices
 * @param {Array|number} samples
 * @param {number} hop_length
 * @returns {Array|number}
 */
export function samples_to_frames(samples, hop_length = 512) {
  if (Array.isArray(samples)) {
    return samples.map((s) => Math.round(s / hop_length));
  }
  return Math.round(samples / hop_length);
}

/**
 * Convert time values to frame indices
 * @param {Array|number} times
 * @param {number} sr
 * @param {number} hop_length
 * @returns {Array|number}
 */
export function time_to_frames(times, sr = 22050, hop_length = 512) {
  if (Array.isArray(times)) {
    return times.map((t) => Math.round((t * sr) / hop_length));
  }
  return Math.round((times * sr) / hop_length);
}

/**
 * Normalize raw PCM data to a target peak amplitude
 * @param {Float32Array} y
 * @param {number} peak
 * @returns {Float32Array}
 */
export function normalize_audio(y, peak = 1.0) {
  const current = Math.max(...y.map((x) => Math.abs(x)));
  if (current === 0) return y;
  const scale = peak / current;
  return y.map((s) => s * scale);
}

/**
 * Apply fade in/out to audio
 * @param {Float32Array} y
 * @param {number} fade_in_samples
 * @param {number} fade_out_samples
 * @returns {Float32Array}

 */
export function apply_fade(y, fade_in_samples = 0, fade_out_samples = 0) {
  const result = new Float32Array(y);
  for (let i = 0; i < Math.min(fade_in_samples, y.length); i++) {
    result[i] *= i / fade_in_samples;
  }
  for (let i = 0; i < Math.min(fade_out_samples, y.length); i++) {
    const alpha = i / fade_out_samples;
    result[y.length - 1 - i] *= alpha;

  }
  return result;
}

/**
 * Compute zero crossing rate over frames
 * @param {Float32Array} y
 * @param {number} frame_length
 * @param {number} hop_length
 * @returns {Array<number>}

 */
export function zero_crossing_rate(y, frame_length = 2048, hop_length = 512) {
  const zcr = [];
  for (let i = 0; i <= y.length - frame_length; i += hop_length) {
    const frame = y.slice(i, i + frame_length);
    let crossings = 0;
    for (let j = 1; j < frame.length; j++) {
      if ((frame[j] >= 0) !== (frame[j - 1] >= 0)) {
        crossings++;
      }
    }
    zcr.push(crossings / frame_length);
  }
  return zcr;
}

/**
 * Simple peak detection
 * @param {Array<number>} signal
 * @param {number} threshold
 * @param {number} min_distance
 * @returns {Array<number>}

 */
export function find_peaks(signal, threshold = 0.1, min_distance = 10) {
  const peaks = [];
  for (let i = 1; i < signal.length - 1; i++) {
    if (
      signal[i] > threshold &&
      signal[i] > signal[i - 1] &&
      signal[i] > signal[i + 1]
    ) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= min_distance) {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

/**
 * Moving average smoothing
 * @param {Array<number>} signal
 * @param {number} window_size
 * @returns {Array<number>}
 */
export function moving_average(signal, window_size = 5) {
  const out = new Array(signal.length);

  const half = Math.floor(window_size / 2);
  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    let count = 0;
    for (
      let j = Math.max(0, i - half);
      j <= Math.min(signal.length - 1, i + half);
      j++
    ) {
      sum += signal[j];
      count++;
    }
    out[i] = sum / count;
  }
  return out;

}
