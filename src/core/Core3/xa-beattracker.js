/**
 * Advanced beat tracking and tempo detection module.
 * Provides high-precision BPM detection with confidence scoring, beat timing (frames or seconds),
 * and basic phrase detection for structural segmentation.
 */
import { onset_strength } from './xa-onset.js';

/**
 * Estimate the global tempo (BPM) of an audio signal.
 * Uses autocorrelation of the onset strength envelope to find the predominant tempo.
 * @param {Float32Array} onsetEnvelope - Onset strength values (e.g., from onset_strength)
 * @param {number} sampleRate - Sample rate of the original audio
 * @param {number} hopLength - Hop length used for onset envelope
 * @param {number} [startBpm=120] - Initial tempo guess (used if detection fails)
 * @returns {{ bpm: number, confidence: number, allCandidates: Array<{bpm: number, strength: number}> }}
 *          Detected tempo in BPM, confidence (0-1), and top candidate tempos
 */
export function estimateTempo(onsetEnvelope, sampleRate, hopLength = 512, startBpm = 120) {
  const minBpm = 60;
  const maxBpm = 200;
  // Convert BPM range to lag range (frames)
  const minLag = Math.floor((60 * sampleRate) / (maxBpm * hopLength));
  const maxLag = Math.floor((60 * sampleRate) / (minBpm * hopLength));
  const autocorr = new Float32Array(maxLag - minLag + 1);
  let bestLag = minLag;
  let bestCorr = 0;
  // Compute autocorrelation for lags in range
  for (let lag = minLag; lag <= maxLag && lag < onsetEnvelope.length; lag++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < onsetEnvelope.length - lag; i++) {
      sum += onsetEnvelope[i] * onsetEnvelope[i + lag];
      count++;
    }
    const corrValue = count > 0 ? sum / count : 0;
    autocorr[lag - minLag] = corrValue;
    if (corrValue > bestCorr) {
      bestCorr = corrValue;
      bestLag = lag;
    }
  }
  if (bestCorr === 0) {
    // No correlation found (e.g., too short or no onsets)
    return { bpm: startBpm, confidence: 0, allCandidates: [] };
  }
  // Find local peaks in autocorrelation
  const peaks = [];
  for (let idx = 1; idx < autocorr.length - 1; idx++) {
    if (autocorr[idx] > autocorr[idx - 1] && autocorr[idx] > autocorr[idx + 1]) {
      const lag = idx + minLag;
      const bpm = (60 * sampleRate) / (lag * hopLength);
      peaks.push({ bpm, strength: autocorr[idx] });
    }
  }
  // Sort peaks by strength
  peaks.sort((a, b) => b.strength - a.strength);
  // Determine best peak (consider edge cases)
  let bestPeak;
  if (peaks.length === 0 || bestCorr > (peaks[0]?.strength || 0)) {
    const bpmEdge = (60 * sampleRate) / (bestLag * hopLength);
    bestPeak = { bpm: bpmEdge, strength: bestCorr };
  } else {
    bestPeak = peaks[0];
  }
  // Adjust for half-time or double-time confusion
  if (bestPeak.bpm < 90) {
    const doubleBpm = bestPeak.bpm * 2;
    const match = peaks.find(p => Math.abs(p.bpm - doubleBpm) < 5);
    if (match && match.strength > bestPeak.strength * 0.7) {
      bestPeak = { bpm: doubleBpm, strength: match.strength };
    }
  } else if (bestPeak.bpm > 160) {
    const halfBpm = bestPeak.bpm / 2;
    if (halfBpm >= 60) {
      bestPeak = { ...bestPeak, bpm: halfBpm };
    }
  }
  // Compute confidence as ratio of best correlation to zero-lag autocorrelation (signal energy)
  const energy = onsetEnvelope.reduce((s, v) => s + v * v, 0) / onsetEnvelope.length;
  const confidence = energy > 1e-8 ? Math.min(bestPeak.strength / energy, 1) : 0;
  // Round BPM to one decimal
  const bpm = Math.round(bestPeak.bpm * 10) / 10;
  // Assemble top candidates list
  let candidates;
  if (peaks.length === 0 || bestCorr > (peaks[0]?.strength || 0)) {
    candidates = [{ bpm: Math.round(bpm * 10) / 10, strength: bestPeak.strength }, ...peaks.slice(0, 4).map(p => ({ bpm: Math.round(p.bpm * 10) / 10, strength: p.strength }))];
  } else {
    candidates = peaks.slice(0, 5).map(p => ({ bpm: Math.round(p.bpm * 10) / 10, strength: p.strength }));
  }
  return { bpm, confidence, allCandidates: candidates };
}

/**
 * Track beat positions given an onset strength envelope and estimated tempo.
 * @param {Float32Array} onsetEnvelope - Onset strength envelope
 * @param {number} bpm - Tempo in beats per minute
 * @param {number} sampleRate - Sample rate of original audio
 * @param {number} hopLength - Hop length used for onset envelope
 * @param {number} [tightness=100] - (Unused in this simple tracker; for compatibility)
 * @returns {Array<number>} Detected beat positions (frame indices)
 */
export function trackBeats(onsetEnvelope, bpm, sampleRate, hopLength = 512, tightness = 100) {
  const frameInterval = (60 * sampleRate) / (bpm * hopLength);
  // Determine first beat frame by finding strongest onset in first beat interval
  let firstBeatFrame = 0;
  let maxOnset = 0;
  const maxFrame = Math.min(onsetEnvelope.length, Math.floor(frameInterval));
  for (let i = 0; i < maxFrame; i++) {
    if (onsetEnvelope[i] > maxOnset) {
      maxOnset = onsetEnvelope[i];
      firstBeatFrame = i;
    }
  }
  // If no clear onset in first interval, find first non-zero onset frame
  if (firstBeatFrame === 0 && onsetEnvelope.findIndex(val => val > 0) > 0) {
    firstBeatFrame = onsetEnvelope.findIndex(val => val > 0);
  }
  // Generate beat frames at regular intervals
  const beatFrames = [];
  let n = 0;
  while (true) {
    const targetFrame = firstBeatFrame + n * frameInterval;
    const beatFrame = Math.round(targetFrame);
    if (beatFrame >= onsetEnvelope.length) break;
    beatFrames.push(beatFrame);
    n++;
  }
  return beatFrames;
}

/**
 * End-to-end beat tracking: detects tempo and beat times from audio.
 * @param {Float32Array} audioData - Mono audio signal
 * @param {number} sampleRate - Sample rate of the audio
 * @param {Object} [options] - Beat tracking options
 * @param {number} [options.hopLength=512] - Hop length for onset analysis
 * @param {number} [options.startBpm=120] - Initial BPM guess for tempo estimation
 * @param {number} [options.tightness=100] - (Unused; for compatibility with advanced trackers)
 * @param {boolean} [options.trim=true] - (Unused; for compatibility)
 * @param {string} [options.units='time'] - 'time' for seconds, 'frames' for frame indices, or 'samples' for sample indices
 * @returns {{ tempo: number, confidence: number, beats: Array<number>, beatFrames: Array<number> }}
 *          Detected tempo and confidence, beat times (or frames), and beat frame indices
 */
export function beatTrack(audioData, sampleRate, { hopLength = 512, startBpm = 120, tightness = 100, trim = true, units = 'time' } = {}) {
  console.time('beat_track');
  // Step 1: Compute onset strength envelope
  const onsetEnv = onset_strength(audioData, { sr: sampleRate, hop_length: hopLength, frame_length: 2048 });
  if (!onsetEnv.some(val => val > 0)) {
    console.timeEnd('beat_track');
    return { tempo: 0.0, confidence: 0.0, beats: [], beatFrames: [] };
  }
  // Step 2: Estimate tempo and confidence
  const tempoResult = estimateTempo(onsetEnv, sampleRate, hopLength, startBpm);
  // Step 3: Determine beat frames
  const beatFrames = trackBeats(onsetEnv, tempoResult.bpm || startBpm, sampleRate, hopLength, tightness);
  // Step 4: Convert to requested units
  let beatPositions;
  if (units === 'time') {
    beatPositions = beatFrames.map(frame => (frame * hopLength) / sampleRate);
  } else if (units === 'samples') {
    beatPositions = beatFrames.map(frame => frame * hopLength);
  } else {
    beatPositions = beatFrames;
  }
  console.timeEnd('beat_track');
  return { tempo: tempoResult.bpm, confidence: tempoResult.confidence, beats: beatPositions, beatFrames };
}

/**
 * Detect approximate phrase boundaries from beat times.
 * Groups beats into phrases of a given length.
 * @param {Array<number>} beatPositions - Array of beat positions (in seconds or frames)
 * @param {Object} [options] - Phrase detection options
 * @param {number} [options.beatsPerPhrase=16] - Number of beats per phrase
 * @returns {Array<number>} Array of phrase start positions (same units as input beatPositions)
 */
export function detectBeatPhrases(beatPositions, { beatsPerPhrase = 16 } = {}) {
  const phrases = [];
  if (!beatPositions || beatPositions.length === 0) return phrases;
  for (let i = 0; i < beatPositions.length; i += beatsPerPhrase) {
    phrases.push(beatPositions[i]);
  }
  return phrases;
}
