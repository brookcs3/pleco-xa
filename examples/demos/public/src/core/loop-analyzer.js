// Re-export core analysis functions for demo tests
export { musicalLoopAnalysis, analyzeLoopPoints } from 'src/core/loop-analyzer.js';
/**
 * Musical loop analysis and detection
 * Part of Pleco Xa audio analysis engine
 */

import { detectBPM } from 'src/core/analysis/BPMDetector.js';
import {
  computeRMS,
  computePeak,
  computeZeroCrossingRate,
  findZeroCrossing,
  findAudioStart,
  applyHannWindow
} from '../../../../../src/utils/audio-utils.js';
import { computeSpectrum, computeSpectralCentroid } from './spectral.js';
import { calculateBeatAlignment } from './musical-timing.js';
import { debugLog } from '../../../../../src/utils/debug.js';

export async function loopAnalysis(audioBuffer) {
  debugLog('Starting Musical Timing-Aware Analysis');

  const audioData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const bpmData = await detectBPM(audioBuffer);
  const barDuration = (60 / bpmData.bpm) * 4; // 4/4 time signature

  debugLog(`Detected BPM: ${bpmData.bpm.toFixed(2)}, Bar duration: ${barDuration.toFixed(3)}s`);

  const rms = computeRMS(audioBuffer);
  const peak = computePeak(audioBuffer);
  const spectrum = await computeSpectrum(audioBuffer);

  const loopPoints = await musicalLoopAnalysis(audioBuffer, bpmData, barDuration);

  const spectralCentroid = computeSpectralCentroid(audioBuffer);
  const zeroCrossingRate = computeZeroCrossingRate(audioBuffer);

  return {
    ...loopPoints,
    rms,
    peak,
    spectrum,
    spectralCentroid,
    zeroCrossingRate,
    confidence: loopPoints.confidence * (1 - Math.abs(rms - 0.1)),
    bpm: bpmData.bpm,
    barDuration,
    musicalInfo: {
      bpm: bpmData.bpm,
      barDuration,
      beatDuration: 60 / bpmData.bpm
    }
  };
}

async function musicalLoopAnalysis(audioBuffer, bpmData, barDuration) {
  const data = audioBuffer.getChannelData(0);
  const rate = audioBuffer.sampleRate;
  const totalSamples = data.length;

  const audioStart = audioBuffer.duration > 15 ? findAudioStart(data, rate) : 0;
  debugLog(`Audio start: ${(audioStart / rate).toFixed(3)}s`);

  const musicalDivisions = [0.5, 1, 2, 4, 8].map(bars => bars * barDuration);
  const results = [];

  for (const lengthSec of musicalDivisions) {
    if (lengthSec > 12 || lengthSec > audioBuffer.duration / 2) continue;

    const loopSamples = Math.floor(lengthSec * rate);
    if (audioStart + 2 * loopSamples > totalSamples) continue;

    const segment1 = applyHannWindow(data.slice(audioStart, audioStart + loopSamples));
    const segment2 = applyHannWindow(data.slice(audioStart + loopSamples, audioStart + 2 * loopSamples));

    const correlation = segment1.reduce((sum, val, i) => sum + val * segment2[i], 0) / loopSamples;

    const beatAlignment = calculateBeatAlignment(lengthSec, bpmData.bpm);

    results.push({
      loopStart: findZeroCrossing(data, audioStart) / rate,
      loopEnd: findZeroCrossing(data, audioStart + loopSamples) / rate,
      loopLength: lengthSec,
      correlation,
      confidence: Math.abs(correlation) * beatAlignment,
      musicalDivision: lengthSec / barDuration,
      bpm: bpmData.bpm
    });

    debugLog(`Checked ${lengthSec}s (${(lengthSec / barDuration).toFixed(1)} bars): confidence=${(Math.abs(correlation) * beatAlignment).toFixed(4)}`);
  }

  results.sort((a, b) => b.confidence - a.confidence);

  const best = results[0] || {
    loopStart: 0,
    loopEnd: Math.min(barDuration, audioBuffer.duration),
    confidence: 0.5,
    musicalDivision: 1,
    bpm: bpmData.bpm
  };

  debugLog(`Best loop: ${best.loopLength}s (${best.musicalDivision} bars)`);

  return {
    loopStart: best.loopStart,
    loopEnd: best.loopEnd,
    confidence: best.confidence,
    musicalDivision: best.musicalDivision,
    bpm: best.bpm,
    candidates: results.slice(0, 5)
  };
}
