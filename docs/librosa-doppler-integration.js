// src/utils/LibrosaDopplerScroll.js

import { EnhancedDopplerScroll } from './EnhancedDopplerScroll.js';

const DEBUG_ENABLED = Boolean(
  (typeof process !== 'undefined' && process.env && process.env.PLECO_DEBUG) ||
  (typeof window !== 'undefined' && window.PLECO_DEBUG)
);

function debugLog(...args) {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
}

/**
 * LibrosaDopplerScroll - Doppler Scroll with your Librosa loop analysis
 * Uses confidence-based windowing for tempo morphing based on scroll distance
 */
export class LibrosaDopplerScroll extends EnhancedDopplerScroll {
  constructor(options = {}) {
    super(options);
    
    // Additional options for xa-based morphing
    this.morphOptions = {
      windowFunction: 'hann', // Use Hann window from your implementation
      confidenceThreshold: 0.7,
      beatAlignmentBoost: true,
      spectralAnalysis: true,
      ...options.morphing
    };
    
    // Store detailed analysis from your librosa loop editor
    this.detailedAnalysis = {
      loop1: null,
      loop2: null
    };
  }

  /**
   * Analyze loops using your librosa loop analysis with musical timing
   */
  async analyzeLoopsWithLibrosa() {
    debugLog('🎵 Starting Musical Timing-Aware Analysis for Doppler Scroll...');
    
    // Analyze both loops with your musical analysis
    const [analysis1, analysis2] = await Promise.all([
      this.musicalLoopAnalysis(this.loops.loop1.buffer, 'loop1'),
      this.musicalLoopAnalysis(this.loops.loop2.buffer, 'loop2')
    ]);
    
    this.detailedAnalysis.loop1 = analysis1;
    this.detailedAnalysis.loop2 = analysis2;
    
    // Update tempo data with enhanced analysis
    this.tempoData.loop1 = {
      bpm: analysis1.bpm,
      beatGrid: analysis1.beats || [],
      loopPoints: {
        start: analysis1.loopStart,
        end: analysis1.loopEnd
      },
      confidence: analysis1.confidence,
      musicalDivision: analysis1.musicalDivision,
      spectralCentroid: analysis1.spectralCentroid,
      rms: analysis1.rms,
      peak: analysis1.peak
    };
    
    this.tempoData.loop2 = {
      bpm: analysis2.bpm,
      beatGrid: analysis2.beats || [],
      loopPoints: {
        start: analysis2.loopStart,
        end: analysis2.loopEnd
      },
      confidence: analysis2.confidence,
      musicalDivision: analysis2.musicalDivision,
      spectralCentroid: analysis2.spectralCentroid,
      rms: analysis2.rms,
      peak: analysis2.peak
    };
    
    debugLog('Loop 1 Analysis:', this.tempoData.loop1);
    debugLog('Loop 2 Analysis:', this.tempoData.loop2);
  }

  /**
   * Musical loop analysis from your xa-loop-editor
   */
  async musicalLoopAnalysis(audioBuffer, loopId) {
    const audioData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Detect BPM using your algorithm
    const bpmData = this.detectBPM(audioData, sampleRate);
    const beatsPerBar = 4;
    const barDuration = (60 / bpmData.bpm) * beatsPerBar;
    const beatDuration = 60 / bpmData.bpm;
    
    debugLog(`${loopId} - Detected BPM: ${bpmData.bpm.toFixed(2)}, Bar duration: ${barDuration.toFixed(3)}s`);
    
    // Basic Librosa metrics
    const rms = this.computeRMS(audioBuffer);
    const peak = this.computePeak(audioBuffer);
    const spectralCentroid = this.computeSpectralCentroid(audioBuffer);
    const zeroCrossingRate = this.computeZeroCrossingRate(audioBuffer);
    
    // Find optimal loop points with musical boundaries
    const loopPoints = await this.findMusicalLoopPoints(audioBuffer, bpmData);
    
    // Extract beat grid
    const beats = this.extractBeatsEnhanced(audioData, bpmData.bpm, sampleRate);
    
    return {
      loopStart: loopPoints.loopStart,
      loopEnd: loopPoints.loopEnd,
      confidence: loopPoints.confidence,
      bpm: bpmData.bpm,
      barDuration: barDuration,
      beatDuration: beatDuration,
      musicalDivision: loopPoints.musicalDivision,
      beats: beats,
      rms: rms,
      peak: peak,
      spectralCentroid: spectralCentroid,
      zeroCrossingRate: zeroCrossingRate,
      allCandidates: loopPoints.allCandidates || []
    };
  }

  /**
   * Find musical loop points using your algorithm
   */
  async findMusicalLoopPoints(audioBuffer, bpmData) {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = channelData.length;
    
    const beatsPerBar = 4;
    const barDuration = (60 / bpmData.bpm) * beatsPerBar;
    
    // Test musical divisions as in your implementation
    const musicalDivisions = [0.5, 1, 2, 4, 8].map(div => div * barDuration);
    const results = [];
    
    for (const loopLength of musicalDivisions) {
      if (loopLength > 12.0 || loopLength > audioBuffer.duration / 2) continue;
      
      const loopSamples = Math.floor(loopLength * sampleRate);
      if (loopSamples * 2 > totalSamples) continue;
      
      // Use your Hann window approach
      const segment1 = this.applyHannWindow(channelData.slice(0, loopSamples));
      const segment2 = this.applyHannWindow(channelData.slice(loopSamples, loopSamples * 2));
      
      // Cross-correlation
      let correlation = 0;
      for (let i = 0; i < segment1.length; i++) {
        correlation += segment1[i] * segment2[i];
      }
      correlation /= segment1.length;
      
      // Find zero-crossings
      const startIndex = this.findZeroCrossing(channelData, 0);
      const endIndex = this.findZeroCrossing(channelData, loopSamples);
      
      // Musical timing confidence boost
      const beatAlignment = this.calculateBeatAlignment(loopLength, bpmData.bpm);
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
    }
    
    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    const best = results[0] || {
      loopStart: 0,
      loopEnd: Math.min(barDuration, audioBuffer.duration),
      confidence: 0.5,
      musicalDivision: 1
    };
    
    return {
      ...best,
      allCandidates: results.slice(0, 5)
    };
  }

  /**
   * Override transition state to use confidence-based windowing
   */
  setTransitionState(progress) {
    this.state.isTransitioning = true;
    
    // Calculate transition progress (0-1 within transition zone)
    const transitionProgress = (progress - 0.33) / 0.33;
    
    // Use confidence scores to determine morphing intensity
    const loop1Confidence = this.tempoData.loop1.confidence || 0.5;
    const loop2Confidence = this.tempoData.loop2.confidence || 0.5;
    
    // Calculate window size based on confidence and scroll distance
    const windowSize = this.calculateMorphWindow(transitionProgress, loop1Confidence, loop2Confidence);
    
    // Volume crossfade with confidence weighting
    const confidenceRatio = loop2Confidence / (loop1Confidence + loop2Confidence);
    const adjustedProgress = this.easeInOutCubic(transitionProgress) * confidenceRatio + 
                            transitionProgress * (1 - confidenceRatio);
    
    const loop1Volume = 1 - (adjustedProgress * 0.8);
    const loop2Volume = adjustedProgress * 0.8;
    
    this.loops.loop1.gain.gain.linearRampToValueAtTime(loop1Volume, this.context.currentTime + 0.05);
    this.loops.loop2.gain.gain.linearRampToValueAtTime(loop2Volume, this.context.currentTime + 0.05);
    
    // Enhanced filter frequencies based on spectral centroids
    const loop1Centroid = this.tempoData.loop1.spectralCentroid || 5000;
    const loop2Centroid = this.tempoData.loop2.spectralCentroid || 5000;
    
    // Dynamic filter ranges based on spectral content
    const loop1HighpassFreq = 20 + (transitionProgress * Math.min(1000, loop1Centroid * 0.2));
    const loop2LowpassFreq = Math.max(loop2Centroid * 2, 20000) - (transitionProgress * 15000);
    
    this.loops.loop1.filter.frequency.linearRampToValueAtTime(loop1HighpassFreq, this.context.currentTime + 0.05);
    this.loops.loop2.filter.frequency.linearRampToValueAtTime(loop2LowpassFreq, this.context.currentTime + 0.05);
    
    // Apply windowed tempo morphing
    this.applyWindowedTempoMorph(transitionProgress, windowSize);
    
    // Enhanced spatial positioning based on RMS levels
    const rmsRatio = (this.tempoData.loop1.rms || 0.1) / (this.tempoData.loop2.rms || 0.1);
    const spatialPosition = (transitionProgress - 0.5) * 2 * rmsRatio;
    
    this.loops.loop1.spatialPanner.pan.linearRampToValueAtTime(-spatialPosition * 0.5, this.context.currentTime + 0.05);
    this.loops.loop2.spatialPanner.pan.linearRampToValueAtTime(spatialPosition * 0.5, this.context.currentTime + 0.05);
    
    // Master switching with confidence threshold
    const switchThreshold = 0.5 + (0.2 * (loop2Confidence - loop1Confidence));
    if (transitionProgress >= switchThreshold && this.state.currentMaster === 'loop1') {
      this.switchMaster('loop2');
    } else if (transitionProgress < switchThreshold && this.state.currentMaster === 'loop2') {
      this.switchMaster('loop1');
    }
    
    // Emit detailed transition data
    this.emitter.emit('transitionUpdate', {
      progress: transitionProgress,
      windowSize: windowSize,
      loop1Volume: loop1Volume,
      loop2Volume: loop2Volume,
      filters: {
        loop1: loop1HighpassFreq,
        loop2: loop2LowpassFreq
      },
      confidence: {
        loop1: loop1Confidence,
        loop2: loop2Confidence
      }
    });
  }

  /**
   * Calculate morph window size based on confidence and distance
   */
  calculateMorphWindow(progress, confidence1, confidence2) {
    // Base window size from your implementation (0.5 seconds)
    const baseWindow = 0.5;
    
    // Adjust based on confidence scores
    const avgConfidence = (confidence1 + confidence2) / 2;
    const confidenceFactor = Math.pow(avgConfidence, 0.5); // Square root for smoother scaling
    
    // Distance from center of transition affects window size
    const distanceFromCenter = Math.abs(progress - 0.5) * 2;
    const distanceFactor = 1 - (distanceFromCenter * 0.5);
    
    // Calculate final window size
    const windowSize = baseWindow * confidenceFactor * distanceFactor;
    
    return Math.max(0.1, Math.min(1.0, windowSize)); // Clamp between 0.1 and 1.0 seconds
  }

  /**
   * Apply windowed tempo morphing using Hann window
   */
  applyWindowedTempoMorph(progress, windowSize) {
    const masterLoop = this.state.currentMaster;
    const slaveLoop = masterLoop === 'loop1' ? 'loop2' : 'loop1';
    
    const masterTempo = this.tempoData[masterLoop].bpm;
    const slaveTempo = this.tempoData[slaveLoop].bpm;
    
    // Calculate tempo ratio with windowed interpolation
    const windowedProgress = this.applyHannWindowToProgress(progress, windowSize);
    const targetRatio = 1 + (masterTempo / slaveTempo - 1) * windowedProgress;
    
    // Apply smooth tempo adjustment
    if (this.loops[slaveLoop].source && this.loops[slaveLoop].source.playbackRate) {
      this.loops[slaveLoop].source.playbackRate.linearRampToValueAtTime(
        targetRatio,
        this.context.currentTime + windowSize
      );
    }
    
    // Also adjust pitch compensation if needed
    const pitchCompensation = Math.log2(targetRatio) * 1200; // Convert to cents
    if (this.loops[slaveLoop].source && this.loops[slaveLoop].source.detune) {
      this.loops[slaveLoop].source.detune.linearRampToValueAtTime(
        -pitchCompensation * 0.5, // Partial compensation
        this.context.currentTime + windowSize
      );
    }
  }

  /**
   * Apply Hann window to progress value for smooth morphing
   */
  applyHannWindowToProgress(progress, windowSize) {
    // Create a virtual Hann window centered at 0.5
    const x = progress;
    const center = 0.5;
    const width = windowSize;
    
    if (Math.abs(x - center) > width / 2) {
      return x < center ? 0 : 1;
    }
    
    const normalizedPos = (x - center + width / 2) / width;
    const hannValue = 0.5 * (1 - Math.cos(2 * Math.PI * normalizedPos));
    
    return hannValue;
  }

  /**
   * Calculate beat alignment from your implementation
   */
  calculateBeatAlignment(loopLength, bpm) {
    const beatDuration = 60 / bpm;
    const beatsInLoop = loopLength / beatDuration;
    
    // Prefer whole numbers of beats
    const beatAlignment = 1 - Math.abs(beatsInLoop - Math.round(beatsInLoop));
    
    // Extra boost for common musical divisions
    const commonDivisions = [1, 2, 4, 8, 16];
    const nearestDivision = commonDivisions.reduce((prev, curr) => 
      Math.abs(curr - beatsInLoop) < Math.abs(prev - beatsInLoop) ? curr : prev
    );
    
    const divisionBonus = Math.max(0, 1 - Math.abs(nearestDivision - beatsInLoop) / 2);
    
    return beatAlignment * 0.7 + divisionBonus * 0.3;
  }

  /**
   * Easing function for smoother transitions
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Enhanced spectral centroid calculation from your implementation
   */
  computeSpectralCentroid(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const fftSize = this.analysisOptions.fftSize;
    let centroid = 0;
    let frameCount = 0;
    
    for (let i = 0; i < channelData.length - fftSize; i += this.analysisOptions.hopSize) {
      const frame = channelData.slice(i, i + fftSize);
      const windowed = this.applyHannWindow(frame);
      const spectrum = this.dft(windowed);
      
      let weightedSum = 0;
      let magnitudeSum = 0;
      
      for (let j = 0; j < spectrum.length; j++) {
        const freq = (j * audioBuffer.sampleRate) / (2 * spectrum.length);
        weightedSum += freq * spectrum[j];
        magnitudeSum += spectrum[j];
      }
      
      if (magnitudeSum > 0) {
        centroid += weightedSum / magnitudeSum;
        frameCount++;
      }
    }
    
    return frameCount > 0 ? centroid / frameCount : 0;
  }

  /**
   * Zero crossing rate calculation
   */
  computeZeroCrossingRate(audioBuffer) {
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
   * Get current analysis state for visualization
   */
  getAnalysisState() {
    return {
      loop1: this.detailedAnalysis.loop1,
      loop2: this.detailedAnalysis.loop2,
      currentMaster: this.state.currentMaster,
      scrollProgress: this.state.scrollProgress,
      isTransitioning: this.state.isTransitioning,
      morphWindow: this.calculateMorphWindow(
        (this.state.scrollProgress - 0.33) / 0.33,
        this.tempoData.loop1.confidence || 0.5,
        this.tempoData.loop2.confidence || 0.5
      )
    };
  }
}