/**
 * Musical loop analysis and detection
 * Part of Pleco Xa audio analysis engine
 */

import { detectBPM } from './bpm-detector.js';
import { computeRMS, computePeak } from './audio-utils.js';
import { computeSpectrum, computeSpectralCentroid } from './spectral.js';
import { calculateBeatAlignment } from './musical-timing.js';
import { findZeroCrossing, findAudioStart, applyHannWindow } from '../utils/audio-utils.js';

/**
 * Main Librosa-style loop analysis with musical timing awareness
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @param {boolean} useReference - Whether to use reference template
 * @returns {Promise<Object>} Complete analysis results
 */
export async function librosaLoopAnalysis(audioBuffer, useReference = false) {
  console.log('Starting Musical Timing-Aware Analysis...');
  
  const audioData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // First, detect BPM and musical timing
  const bpmData = detectBPM(audioData, sampleRate);
  const beatsPerBar = 4; // Assume 4/4 time signature
  const barDuration = (60 / bpmData.bpm) * beatsPerBar;
  
  console.log(`Detected BPM: ${bpmData.bpm.toFixed(2)}, Bar duration: ${barDuration.toFixed(3)}s`);
  
  // Basic Librosa metrics
  const rms = computeRMS(audioBuffer);
  const peak = computePeak(audioBuffer);
  const spectrum = await computeSpectrum(audioBuffer);
  
  // Always use musical boundary-aware loop detection
  const loopPoints = await musicalLoopAnalysis(audioBuffer, bpmData);
  
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
  
  console.log(`Musical Analysis: Audio starts at ${audioStartTime.toFixed(3)}s`);
  
  const beatsPerBar = 4;
  const barDuration = (60 / bpmData.bpm) * beatsPerBar;
  const beatDuration = 60 / bpmData.bpm;
  
  console.log(`Musical Analysis: Bar=${barDuration.toFixed(3)}s, Beat=${beatDuration.toFixed(3)}s`);
  
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
    
    // Musical timing confidence boost
    const beatAlignment = calculateBeatAlignment(loopLength, bpmData.bpm);
    const musicalConfidence = Math.abs(correlation) * beatAlignment;
    
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
    
    console.log(`Testing ${(loopLength/barDuration).toFixed(1)} bars (${loopLength.toFixed(3)}s): correlation=${correlation.toFixed(4)}, confidence=${musicalConfidence.toFixed(4)}`);
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
        confidence: Math.abs(correlation) * 0.9, // Slightly lower for non-exact musical boundaries
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
      const sequentialConfidence = Math.abs(correlation) * beatAlignment * 0.8; // Slightly lower for sequential
      
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
      
      console.log(`Sequential candidate: ${sequentialStart.toFixed(3)}s - ${sequentialEnd.toFixed(3)}s (${(loopLength/barDuration).toFixed(1)} bars)`);
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
      console.log(`Short track: Using full length ${best.loopLength.toFixed(3)}s as loop`);
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
      console.log(`Short track: Created full-track loop ${best.loopLength.toFixed(3)}s`);
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
  
  console.log(`Best musical loop: ${(best.musicalDivision || 1).toFixed(2)} bars (${best.loopLength.toFixed(3)}s) at ${best.bpm.toFixed(1)} BPM`);
  
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

// Import function for zero crossing rate
function computeZeroCrossingRate(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  let crossings = 0;
  
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) {
      crossings++;
    }
  }
  
  return crossings / channelData.length;
}