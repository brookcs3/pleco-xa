// xa-beat.js - Refactored Beat Tracking Module
import { onsetDetect } from './xa-onset.js'

/**
 * Perform beat tracking on audio data. Returns estimated tempo and beat positions.
 * @param {Float32Array} audioData - Mono audio samples
 * @param {number} sampleRate - Sample rate of the audio
 * @param {Object} [options={}] - hopLength, startBpm, tightness, units ('time' or 'frames')
 * @returns {{ tempo: number, beats: number[], beatFrames: number[], confidence: number, onsetStrength: Float32Array }}
 */
export function beatTrack(audioData, sampleRate, options = {}) {
  const { 
    hopLength = 512, 
    startBpm = 120, 
    tightness = 100, 
    units = 'time' 
  } = options;

  // 1. Onset detection to get onset strength curve
  const onsetResult = onsetDetect(audioData, sampleRate, { hopLength });
  const onsetStrength = onsetResult.onsetStrength;  // Float32Array of onset strength per frame

  // 2. Estimate tempo (BPM) from the onset strength
  const tempoEst = estimateTempo(onsetStrength, sampleRate, hopLength, startBpm);
  const tempoBpm = tempoEst.bpm;
  const tempoConfidence = tempoEst.confidence;

  // 3. Determine beat frames via dynamic programming / peak tracking
  const beatFrames = trackBeats(onsetStrength, tempoBpm, sampleRate, hopLength, tightness);

  // 4. Convert to times if requested
  const beatTimes = (units === 'time')
    ? beatFrames.map(frame => (frame * hopLength) / sampleRate)
    : beatFrames;

  return {
    tempo: tempoBpm,
    confidence: tempoConfidence,
    beats: beatTimes,
    beatFrames: beatFrames,
    onsetStrength: onsetStrength
  };
}

/**
 * Estimate the predominant tempo (BPM) from an onset strength envelope via autocorrelation.
 * @param {Float32Array} onsetStrength - Onset strength values (per frame)
 * @param {number} sampleRate 
 * @param {number} hopLength 
 * @param {number} [startBpm=120] - An initial guess (used if no clear peak found)
 * @returns {{ bpm: number, confidence: number, allCandidates?: Array }}
 */
export function estimateTempo(onsetStrength, sampleRate, hopLength = 512, startBpm = 120) {
  const minBPM = 60, maxBPM = 200;
  const minLag = Math.floor((60 * sampleRate) / (maxBPM * hopLength));
  const maxLag = Math.floor((60 * sampleRate) / (minBPM * hopLength));

  const autocorr = new Float32Array(maxLag - minLag + 1);
  for (let lag = minLag; lag <= maxLag && lag < onsetStrength.length; lag++) {
    let sum = 0;
    for (let i = 0; i < onsetStrength.length - lag; i++) {
      sum += onsetStrength[i] * onsetStrength[i + lag];
    }
    autocorr[lag - minLag] = (onsetStrength.length - lag) ? sum / (onsetStrength.length - lag) : 0;
  }

  // Find all local peaks in autocorrelation
  const peaks = [];
  for (let i = 1; i < autocorr.length - 1; i++) {
    if (autocorr[i] > autocorr[i-1] && autocorr[i] > autocorr[i+1]) {
      const lag = i + minLag;
      const bpm = (60 * sampleRate) / (lag * hopLength);
      peaks.push({ bpm, strength: autocorr[i], lag });
    }
  }
  peaks.sort((a, b) => b.strength - a.strength);

  if (peaks.length === 0) {
    return { bpm: startBpm, confidence: 0 };
  }
  let top = peaks[0];

  // Half-time/double-time adjustment: if best BPM is very low or high, check for a multiple
  if (top.bpm < 90) {
    // try double
    const dbl = top.bpm * 2;
    const cand = peaks.find(p => Math.abs(p.bpm - dbl) < 5);
    if (cand && cand.strength > top.strength * 0.7) {
      top = { bpm: dbl, strength: cand.strength };
    }
  } else if (top.bpm > 160) {
    // try half
    const half = top.bpm / 2;
    if (half >= 60) {
      top.bpm = half;
      // strength remains top.strength (we assume half tempo still strong)
    }
  }

  const confidence = top.strength;
  return { bpm: Math.round(top.bpm), confidence: confidence, allCandidates: peaks.slice(0,5) };
}

/**
 * Identify beat frame positions given an onset strength curve and a tempo.
 * @param {Float32Array} onsetStrength 
 * @param {number} bpm - Estimated tempo in BPM
 * @param {number} sampleRate 
 * @param {number} hopLength 
 * @param {number} tightness - How strictly to adhere to tempo (not heavily used in this simple version)
 * @returns {number[]} Array of beat indices (frames)
 */
export function trackBeats(onsetStrength, bpm, sampleRate, hopLength = 512, tightness = 100) {
  if (!bpm || bpm <= 0) return [];

  const framesPerBeat = (60 * sampleRate) / (bpm * hopLength);
  const numFrames = onsetStrength.length;
  const beats = [];

  if (numFrames < framesPerBeat * 2) {
    // audio too short for even two beats at given tempo
    return beats;
  }
  // We will iterate beat by beat, always looking around the expected position for the strongest onset.
  let frame = 0;
  // find first beat: look in the first beat interval for the highest onset
  let firstInterval = Math.floor(framesPerBeat);
  if (firstInterval < 1) firstInterval = numFrames;
  let maxVal = 0, maxIdx = 0;
  for (let i = 0; i < Math.min(numFrames, firstInterval); i++) {
    if (onsetStrength[i] > maxVal) {
      maxVal = onsetStrength[i];
      maxIdx = i;
    }
  }
  beats.push(maxIdx);
  frame = maxIdx;

  // now step through subsequent beats
  while (true) {
    frame += Math.round(framesPerBeat);
    if (frame >= numFrames) break;
    const start = Math.max(0, frame - Math.round(framesPerBeat * 0.2));
    const end   = Math.min(numFrames - 1, frame + Math.round(framesPerBeat * 0.2));
    // find the strongest onset in [start, end]
    let best = frame;
    let bestStrength = onsetStrength[frame] || 0;
    for (let j = start; j <= end; j++) {
      if (onsetStrength[j] > bestStrength) {
        bestStrength = onsetStrength[j];
        best = j;
      }
    }
    beats.push(best);
  }

  return beats;
}
