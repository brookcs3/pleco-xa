// BPMDetector.js - Refactored
import { onset_strength } from './xa-onset.js'  // Use the advanced onset envelope from xa-onset

/**
 * Detect BPM from an AudioBuffer using onset detection and autocorrelation.
 * @param {AudioBuffer} audioBuffer 
 * @param {Object} [options={}] - minBPM, maxBPM, hopLength, windowSize, useOnsetStrength, threshold
 * @returns {Promise<{bpm:number, confidence:number, onsets:number[], beats:number[], analysis:Object}>}
 */
export async function detectBPM(audioBuffer, options = {}) {
  const opts = {
    minBPM: 60,
    maxBPM: 180,
    hopLength: 512,
    windowSize: 1024,
    useOnsetStrength: true,
    threshold: 0.1,
    ...options
  }
  const sampleRate = audioBuffer.sampleRate;
  const audioData = _getMonoData(audioBuffer);

  // Compute onset strength envelope if enabled, else use raw audio data
  const onsetEnv = opts.useOnsetStrength 
    ? onset_strength(audioData, { sr: sampleRate, hop_length: opts.hopLength, frame_length: opts.windowSize })
    : audioData;

  // Estimate tempo via autocorrelation on onset envelope
  const tempoInfo = _estimateTempo(onsetEnv, sampleRate, opts);
  const { bpm: tempoEstimate, confidence } = tempoInfo;

  // Derive beat and onset timings
  const beatTimes = _extractBeats(onsetEnv, tempoEstimate, sampleRate, opts.hopLength);
  const onsetTimes = _extractOnsets(audioData, sampleRate, opts);

  return {
    bpm: Math.round(tempoEstimate * 10) / 10,  // rounded to one decimal place
    confidence: confidence || 0,
    beats: beatTimes,
    onsets: onsetTimes,
    analysis: {
      onsetStrength: onsetEnv,
      autocorr: tempoInfo.autocorr,    // the autocorrelation curve (optional)
      sampleRate: sampleRate
    }
  };
}

/**
 * A fast, synchronous BPM estimation using a simplified energy-based method.
 * @param {AudioBuffer} audioBuffer 
 * @param {Object} [options={}] - You may specify minBPM/maxBPM or hopLength.
 * @returns {number} Estimated BPM (rounded to one decimal).
 */
export function fastBPMDetect(audioBuffer, options = {}) {
  const opts = { minBPM: 60, maxBPM: 180, hopLength: 1024, ...options };
  const sr = audioBuffer.sampleRate;
  const data = _getMonoData(audioBuffer);
  const frame = opts.hopLength;
  const frames = Math.floor(data.length / frame);

  // Compute short-time energy for each frame
  const energy = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    const start = i * frame;
    const end = Math.min(start + frame, data.length);
    for (let j = start; j < end; j++) {
      sum += data[j] * data[j];
    }
    energy[i] = Math.sqrt(sum / (end - start));
  }

  // Autocorrelation to find best lag (peak) corresponding to tempo
  const minLag = Math.floor(((60 / opts.maxBPM) * sr) / frame);
  const maxLag = Math.floor(((60 / opts.minBPM) * sr) / frame);
  let bestLag = minLag;
  let maxCorr = 0;
  for (let lag = minLag; lag <= maxLag && lag < energy.length / 2; lag++) {
    let corr = 0;
    for (let i = 0; i < energy.length - lag; i++) {
      corr += energy[i] * energy[i + lag];
    }
    corr = corr / (energy.length - lag);
    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }
  const bpm = (60 * sr) / (bestLag * frame);
  return Math.round(bpm * 10) / 10;
}

// Private helper: mix AudioBuffer to mono Float32Array
function _getMonoData(buffer) {
  if (buffer.numberOfChannels <= 1) {
    return buffer.getChannelData(0).slice();  // return a copy of the mono channel data
  }
  const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
  const mono = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    mono[i] = (left[i] + right[i]) * 0.5;
  }
  return mono;
}

// Private helper: tempo estimation via autocorrelation of onset envelope
function _estimateTempo(onsetEnv, sampleRate, opts) {
  const { minBPM, maxBPM, hopLength } = opts;
  const minLag = Math.floor(((60 / maxBPM) * sampleRate) / hopLength);
  const maxLag = Math.floor(((60 / minBPM) * sampleRate) / hopLength);
  const length = maxLag - minLag + 1;
  const autocorr = new Float32Array(length);

  let bestLag = minLag;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < onsetEnv.length - lag; i++) {
      sum += onsetEnv[i] * onsetEnv[i + lag];
    }
    const corrAvg = (onsetEnv.length - lag) > 0 ? sum / (onsetEnv.length - lag) : 0;
    autocorr[lag - minLag] = corrAvg;
    if (corrAvg > bestCorr) {
      bestCorr = corrAvg;
      bestLag = lag;
    }
  }
  const bpm = (60 * sampleRate) / (bestLag * hopLength);
  // Confidence: ratio of best peak to average correlation
  const avgCorr = autocorr.reduce((a, v) => a + v, 0) / length || 0;
  const confidence = avgCorr > 0 ? Math.min(bestCorr / avgCorr, 1) : 0;
  return { bpm, confidence, autocorr };
}

// Private helper: extract beat times in seconds from onset envelope and BPM
function _extractBeats(onsetEnv, bpm, sampleRate, hopLength) {
  if (!bpm || bpm <= 0) return [];
  const beatIntervalFrames = ((60 / bpm) * sampleRate) / hopLength;
  const beats = [];
  // find index of the strongest onset in the first beat interval as starting beat
  let firstBeatIndex = 0;
  let maxStrength = 0;
  const searchMax = Math.min(onsetEnv.length, Math.floor(beatIntervalFrames));
  for (let i = 0; i < searchMax; i++) {
    if (onsetEnv[i] > maxStrength) {
      maxStrength = onsetEnv[i];
      firstBeatIndex = i;
    }
  }
  // accumulate beats at roughly equal intervals
  for (let frame = firstBeatIndex; frame < onsetEnv.length; frame += Math.round(beatIntervalFrames)) {
    const time = (frame * hopLength) / sampleRate;
    beats.push(time);
  }
  return beats;
}

// Private helper: detect onset times (in seconds) from raw audio using energy peaks
function _extractOnsets(audioData, sampleRate, opts) {
  const { windowSize, hopLength, threshold } = opts;
  const frameCount = Math.floor((audioData.length - windowSize) / hopLength) + 1;
  const energy = new Float32Array(frameCount);
  // calculate RMS energy per frame
  for (let f = 0; f < frameCount; f++) {
    let sum = 0;
    const start = f * hopLength;
    for (let i = start; i < start + windowSize && i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    energy[f] = Math.sqrt(sum / windowSize);
  }
  // pick local energy peaks above threshold
  const onsets = [];
  for (let f = 1; f < energy.length - 1; f++) {
    if (energy[f] > energy[f-1] && energy[f] > energy[f+1] && energy[f] > threshold) {
      const time = (f * hopLength) / sampleRate;
      onsets.push(time);
    }
  }
  return onsets;
}
