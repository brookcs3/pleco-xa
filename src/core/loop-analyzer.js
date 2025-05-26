/**
 * Musical loop analysis and detection
 * Part of Pleco Xa audio analysis engine
 */

// Only keep imports needed for the old functions (in case they're still used elsewhere)
import { fastBPMDetect } from './librosa-beat.js';
import { computeRMS, computePeak } from './audio-utils.js';
import { computeZeroCrossingRate } from '../core/audio-utils.js';
import { computeSpectrum, computeSpectralCentroid } from './spectral.js';
import { calculateBeatAlignment } from './musical-timing.js';
import { findZeroCrossing, findAudioStart, applyHannWindow } from '../utils/audio-utils.js';
import { debugLog } from '../utils/debug.js';

/**
 * Main Librosa-style loop analysis with musical timing awareness
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @param {boolean} useReference - Whether to use reference template
 * @returns {Promise<Object>} Complete analysis results
 */
export async function librosaLoopAnalysis(audioBuffer, useReference = false) {
  debugLog('Starting Musical Timing-Aware Analysis...');
  
  const audioData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // First, detect BPM and musical timing using fast librosa-style detection
  const bpmData = fastBPMDetect(audioData, sampleRate);
  const beatsPerBar = 4; // Assume 4/4 time signature
  const barDuration = (60 / bpmData.bpm) * beatsPerBar;
  
  debugLog(`Detected BPM: ${bpmData.bpm.toFixed(2)}, Bar duration: ${barDuration.toFixed(3)}s`);
  
  // Basic Librosa metrics
  const rms = computeRMS(audioBuffer);
  const peak = computePeak(audioBuffer);
  const spectrum = await computeSpectrum(audioBuffer);
  
  // Use fast onset-based loop detection for better performance
  const loopPoints = await fastOnsetLoopAnalysis(audioBuffer, bpmData);
  
  // Spectral analysis for better loop detection
  const spectralCentroid = computeSpectralCentroid(audioBuffer);
  const zeroCrossingRate = computeZeroCrossingRate(audioBuffer);
  
  return {
    ...loopPoints,
    rms: rms,
    peak: peak,
    spectrum: spectrum,
    spectralCentroid: spectralCentroid,
    zeroCrossingRate: zeroCrossingRate,
    confidence: loopPoints.confidence * (1 - Math.abs(rms - 0.1)), // Adjust confidence based on RMS
    bpm: bpmData.bpm,
    barDuration: barDuration,
    musicalInfo: {
      bpm: bpmData.bpm,
      barDuration: barDuration,
      beatDuration: 60 / bpmData.bpm
    }
  };
}

/**
 * Musical boundary-aware loop detection
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @param {Object} bpmData - BPM detection results
 * @returns {Promise<Object>} Loop analysis results
 */
export async function musicalLoopAnalysis(audioBuffer, bpmData) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = channelData.length;
  
  // Skip silence at the beginning for long tracks
  const isLongTrack = audioBuffer.duration > 15;
  const audioStartSample = isLongTrack ? findAudioStart(channelData, sampleRate) : 0;
  const audioStartTime = audioStartSample / sampleRate;
  
  debugLog(`Musical Analysis: Audio starts at ${audioStartTime.toFixed(3)}s`);
  
  const beatsPerBar = 4;
  const barDuration = (60 / bpmData.bpm) * beatsPerBar;
  const beatDuration = 60 / bpmData.bpm;
  
  debugLog(`Musical Analysis: Bar=${barDuration.toFixed(3)}s, Beat=${beatDuration.toFixed(3)}s`);
  
  // Test musical divisions: 1/2 bar, 1 bar, 2 bars, 4 bars
  const musicalDivisions = [0.5, 1, 2, 4, 8].map(div => div * barDuration);
  const results = [];
  
  for (const loopLength of musicalDivisions) {
    // Don't test loops longer than 12 seconds or longer than half the track
    if (loopLength > 12.0 || loopLength > audioBuffer.duration / 2) continue;
    
    const loopSamples = Math.floor(loopLength * sampleRate);
    if (audioStartSample + loopSamples * 2 > totalSamples) continue;
    
    // Extract segments starting from actual audio content, not silence
    const segment1 = applyHannWindow(channelData.slice(audioStartSample, audioStartSample + loopSamples));
    const segment2 = applyHannWindow(channelData.slice(audioStartSample + loopSamples, audioStartSample + loopSamples * 2));
    
    // Cross-correlation for similarity
    let correlation = 0;
    for (let i = 0; i < segment1.length; i++) {
      correlation += segment1[i] * segment2[i];
    }
    correlation /= segment1.length;
    
    // Find zero-crossings for clean loop boundaries, starting from audio content
    const startIndex = findZeroCrossing(channelData, audioStartSample);
    const endIndex = findZeroCrossing(channelData, audioStartSample + loopSamples);
    
    // Musical timing confidence boost - normalize to 0-100%
    const beatAlignment = calculateBeatAlignment(loopLength, bpmData.bpm);
    const rawConfidence = Math.abs(correlation) * beatAlignment;
    const musicalConfidence = Math.min(100, rawConfidence * 100);
    
    results.push({
      loopStart: startIndex / sampleRate,
      loopEnd: endIndex / sampleRate,
      loopLength: loopLength,
      correlation: correlation,
      confidence: musicalConfidence,
      musicalDivision: loopLength / barDuration,
      bpm: bpmData.bpm,
      isMusicalBoundary: true
    });
    
    debugLog(`Testing ${(loopLength/barDuration).toFixed(1)} bars (${loopLength.toFixed(3)}s): correlation=${correlation.toFixed(4)}, confidence=${musicalConfidence.toFixed(4)}`);
  }
  
  // Add fine-grained analysis around promising musical divisions
  const bestMusical = results.reduce((best, curr) => 
    curr.confidence > best.confidence ? curr : best, results[0]);
  
  if (bestMusical) {
    const baseLength = bestMusical.loopLength;
    for (let offset = -0.05; offset <= 0.05; offset += 0.01) {
      const testLength = baseLength + offset;
      if (testLength <= 0) continue;
      
      const loopSamples = Math.floor(testLength * sampleRate);
      if (loopSamples * 2 > totalSamples) continue;
      
      const segment1 = applyHannWindow(channelData.slice(0, loopSamples));
      const segment2 = applyHannWindow(channelData.slice(loopSamples, loopSamples * 2));
      
      let correlation = 0;
      for (let i = 0; i < segment1.length; i++) {
        correlation += segment1[i] * segment2[i];
      }
      correlation /= segment1.length;
      
      const startIndex = findZeroCrossing(channelData, 0);
      const endIndex = findZeroCrossing(channelData, loopSamples);
      
      results.push({
        loopStart: startIndex / sampleRate,
        loopEnd: endIndex / sampleRate,
        loopLength: testLength,
        correlation: correlation,
        confidence: Math.min(100, Math.abs(correlation) * 90), // Normalize to 0-100%, slightly lower for non-exact boundaries
        musicalDivision: testLength / barDuration,
        bpm: bpmData.bpm,
        isMusicalBoundary: false
      });
    }
  }
  
  // For longer tracks, add sequential loop candidates starting from the end of the best loop
  if (audioBuffer.duration > 10 && bestMusical) {
    const firstLoopEnd = bestMusical.loopEnd;
    const remainingDuration = audioBuffer.duration - firstLoopEnd;
    
    // Add sequential loops starting where the first one ends
    for (const loopLength of musicalDivisions) {
      if (loopLength > remainingDuration || loopLength > 12.0) continue;
      
      const sequentialStart = firstLoopEnd;
      const sequentialEnd = sequentialStart + loopLength;
      
      if (sequentialEnd > audioBuffer.duration) continue;
      
      const startSample = Math.floor(sequentialStart * sampleRate);
      const endSample = Math.floor(sequentialEnd * sampleRate);
      const loopSamples = endSample - startSample;
      
      // Test this sequential segment
      const segment1 = applyHannWindow(channelData.slice(startSample, endSample));
      const segment2 = applyHannWindow(channelData.slice(endSample, endSample + loopSamples));
      
      if (endSample + loopSamples > totalSamples) continue;
      
      let correlation = 0;
      for (let i = 0; i < segment1.length; i++) {
        correlation += segment1[i] * segment2[i];
      }
      correlation /= segment1.length;
      
      const beatAlignment = calculateBeatAlignment(loopLength, bpmData.bpm);
      const rawSequentialConfidence = Math.abs(correlation) * beatAlignment * 0.8; // Slightly lower for sequential
      const sequentialConfidence = Math.min(100, rawSequentialConfidence * 100); // Normalize to 0-100%
      
      results.push({
        loopStart: sequentialStart,
        loopEnd: sequentialEnd,
        loopLength: loopLength,
        correlation: correlation,
        confidence: sequentialConfidence,
        musicalDivision: loopLength / barDuration,
        bpm: bpmData.bpm,
        isMusicalBoundary: true,
        isSequential: true
      });
      
      debugLog(`Sequential candidate: ${sequentialStart.toFixed(3)}s - ${sequentialEnd.toFixed(3)}s (${(loopLength/barDuration).toFixed(1)} bars)`);
    }
  }
  
  // Sort by confidence and return best
  results.sort((a, b) => b.confidence - a.confidence);
  
  // Smart logic: For short tracks (under 15 seconds), assume entire length is the desired loop
  const isShortTrack = audioBuffer.duration < 15;
  
  let best;
  if (isShortTrack && results.length > 0) {
    // For short tracks, prefer loops that use most/all of the track
    const fullTrackCandidate = results.find(r => 
      Math.abs(r.loopLength - audioBuffer.duration) < 0.5
    );
    
    if (fullTrackCandidate) {
      best = fullTrackCandidate;
      debugLog(`Short track: Using full length ${best.loopLength.toFixed(3)}s as loop`);
    } else {
      // Create a full-track loop option
      best = {
        loopStart: 0,
        loopEnd: audioBuffer.duration,
        loopLength: audioBuffer.duration,
        correlation: 0.8,
        confidence: 0.8,
        musicalDivision: audioBuffer.duration / barDuration,
        bpm: bpmData.bpm,
        isMusicalBoundary: false,
        isFullTrack: true
      };
      debugLog(`Short track: Created full-track loop ${best.loopLength.toFixed(3)}s`);
    }
  } else {
    best = results[0] || {
      loopStart: 0,
      loopEnd: Math.min(barDuration, audioBuffer.duration),
      loopLength: Math.min(barDuration, audioBuffer.duration),
      correlation: 0.5,
      confidence: 0.5,
      musicalDivision: 1,
      bpm: bpmData.bpm,
      isMusicalBoundary: true
    };
  }
  
  debugLog(`Best musical loop: ${(best.musicalDivision || 1).toFixed(2)} bars (${best.loopLength.toFixed(3)}s) at ${best.bpm.toFixed(1)} BPM`);
  
  return {
    loopStart: best.loopStart,
    loopEnd: best.loopEnd,
    confidence: best.confidence,
    musicalDivision: best.musicalDivision || 1,
    bpm: best.bpm,
    allCandidates: results.slice(0, 5),
    isFullTrack: best.isFullTrack || false
  };
}

/**
 * Original loop analysis from 2023 research (fallback)
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @returns {Promise<Object>} Loop analysis results
 */
export async function analyzeLoopPoints(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = channelData.length;
  
  const window = Math.min(Math.floor(sampleRate * 0.5), Math.floor(totalSamples / 2));
  const startSlice = applyHannWindow(channelData.subarray(0, window));
  const endSlice = applyHannWindow(channelData.subarray(totalSamples - window));
  
  let bestOffset = 0;
  let bestScore = -Infinity;
  
  for (let offset = 0; offset < window; offset++) {
    let score = 0;
    for (let i = 0; i < window - offset; i++) {
      score += startSlice[i] * endSlice[i + offset];
    }
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  
  const startIndex = findZeroCrossing(channelData, 0);
  const endIndex = findZeroCrossing(channelData, totalSamples - window + bestOffset);
  
  return {
    loopStart: startIndex / sampleRate,
    loopEnd: endIndex / sampleRate,
    confidence: bestScore / window,
    bestOffset: bestOffset,
    windowSize: window
  };
}

/**
 * Simple energy calculation for onset detection
 */
function getEnergy(audioData, start, end) {
  let energy = 0;
  for (let i = start; i < end; i++) {
    energy += audioData[i] * audioData[i];
  }
  return energy / (end - start);
}

/**
 * Working BPM detection using autocorrelation on onset strength
 * (From the librosa-loop-editor.html that was working)
 */
function simpleBPMDetect(audioData, sampleRate) {
  console.log('Starting BPM detection using onset strength...');
  
  // Simple BPM detection using autocorrelation on onset strength
  const frameSize = 2048;
  const hopSize = 512;
  const numFrames = Math.floor((audioData.length - frameSize) / hopSize);
  
  // Calculate onset strength
  const onsetStrength = [];
  for (let i = 1; i < numFrames; i++) {
    const start = i * hopSize;
    const frame = audioData.slice(start, start + frameSize);
    
    // RMS energy difference for onset detection
    const currentRMS = Math.sqrt(frame.reduce((sum, s) => sum + s * s, 0) / frameSize);
    const prevFrame = audioData.slice((i-1) * hopSize, start);
    const prevRMS = Math.sqrt(prevFrame.reduce((sum, s) => sum + s * s, 0) / frameSize);
    
    onsetStrength.push(Math.max(0, currentRMS - prevRMS));
  }
  
  console.log(`Created onset strength signal with ${onsetStrength.length} frames`);
  
  // Autocorrelation to find periodic patterns
  const minBPM = 60;
  const maxBPM = 180;
  const minPeriod = Math.max(2, Math.floor((60 / maxBPM) * sampleRate / hopSize));
  const maxPeriod = Math.min(onsetStrength.length / 3, Math.floor((60 / minBPM) * sampleRate / hopSize));
  
  let bestBPM = null;
  let bestCorrelation = 0;
  
  for (let period = minPeriod; period <= maxPeriod && period < onsetStrength.length / 2; period++) {
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < onsetStrength.length - period; i++) {
      correlation += onsetStrength[i] * onsetStrength[i + period];
      count++;
    }
    
    correlation /= count;
    
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      const candidateBPM = 60 * sampleRate / (period * hopSize);
      
      // Sanity check - only accept reasonable BPM values
      if (candidateBPM >= 60 && candidateBPM <= 180) {
        bestBPM = candidateBPM;
      }
    }
  }
  
  console.log(`Best BPM: ${bestBPM ? bestBPM.toFixed(1) : 'none'} with correlation ${bestCorrelation.toFixed(6)}`);
  
  if (bestBPM === null || bestCorrelation === 0) {
    throw new Error('No BPM found - no periodic patterns detected');
  }
  
  return { 
    bpm: bestBPM, 
    confidence: bestCorrelation 
  };
}

/**
 * Fast onset-based loop analysis - much faster than the slow musical analysis
 */
export async function fastOnsetLoopAnalysis(audioBuffer, bpmData = null) {
  console.time('fast_onset_loop_analysis');
  
  try {
    // Use librosa-style recurrence matrix for loop detection
    const { recurrenceLoopDetection } = await import('./librosa-recurrence.js');
    const result = await recurrenceLoopDetection(audioBuffer);
    
    console.timeEnd('fast_onset_loop_analysis');
    console.log(`Recurrence detection: ${result.loopStart.toFixed(3)}s - ${result.loopEnd.toFixed(3)}s`);
    
    return result;
    
  } catch (error) {
    console.error('Recurrence matrix failed, falling back:', error);
    
    // Fallback to simple method
    const duration = audioBuffer.duration;
    return {
      loopStart: 0,
      loopEnd: Math.min(5.0, duration),
      confidence: 50,
      bpm: 120,
      musicalDivision: 2
    };
  }
}

/**
 * Quick scoring of loop repetition
 */
function scoreLoopRepetition(audioData, sampleRate, startTime, endTime) {
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const loopLength = endSample - startSample;
  
  // Check if we have enough audio to test repetition
  if (endSample + loopLength > audioData.length) {
    return 0;
  }
  
  // Extract both segments
  const segment1 = audioData.slice(startSample, endSample);
  const segment2 = audioData.slice(endSample, endSample + loopLength);
  
  // Simple correlation
  let correlation = 0;
  for (let i = 0; i < loopLength; i++) {
    correlation += segment1[i] * segment2[i];
  }
  
  return Math.abs(correlation) / loopLength;
}
