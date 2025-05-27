/**
 * BPMDetector.js - Consolidated BPM detection module
 * Combines the best of your existing implementations
 */

import EventEmitter from 'events';

export default class BPMDetector extends EventEmitter {
  constructor(audioEngine) {
    super();
    this.audio = audioEngine;
    this.current = 0;
    this.confidence = 0;
    this.isAnalyzing = false;
    
    // Configuration
    this.config = {
      minBPM: 60,
      maxBPM: 180,
      hopLength: 512,
      method: 'onset' // 'onset', 'autocorr', or 'peaks'
    };
    
    // Listen to audio events
    this.audio.on('loaded', () => this.reset());
  }
  
  /**
   * Main analysis method - auto-selects best algorithm
   */
  async analyze(audioBuffer = null) {
    const buffer = audioBuffer || this.audio.buffer;
    if (!buffer) throw new Error('No audio loaded');
    
    this.isAnalyzing = true;
    this.emit('analyzing');
    
    try {
      // Use onset-based detection for accuracy
      const result = await this._detectWithOnsets(buffer);
      
      // Validate and apply corrections
      this.current = this._validateBPM(result.bpm);
      this.confidence = result.confidence;
      
      this.emit('detected', {
        bpm: this.current,
        confidence: this.confidence,
        method: result.method
      });
      
      // Start beat tracking if playing
      if (this.audio.isPlaying) {
        this._startBeatTracking();
      }
      
      return this.current;
    } finally {
      this.isAnalyzing = false;
    }
  }
  
  /**
   * Quick BPM estimation (for real-time)
   */
  quickEstimate(audioBuffer = null) {
    const buffer = audioBuffer || this.audio.buffer;
    if (!buffer) return 120; // Default
    
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // Simple peak-based estimation
    const peaks = this._findPeaks(channelData, sampleRate);
    if (peaks.length < 2) return 120;
    
    // Calculate average interval
    const intervals = [];
    for (let i = 1; i < Math.min(peaks.length, 20); i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }
    
    const avgInterval = intervals.reduce((a,b) => a+b, 0) / intervals.length;
    const bpm = 60 / avgInterval;
    
    return this._validateBPM(bpm);
  }
  
  /**
   * Onset-based detection (most accurate)
   */
  async _detectWithOnsets(buffer) {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // Compute onset strength
    const onsets = this._computeOnsetStrength(channelData, sampleRate);
    
    // Autocorrelation on onset strength
    const tempo = this._tempoFromOnsets(onsets, sampleRate);
    
    return {
      bpm: tempo.bpm,
      confidence: tempo.confidence,
      method: 'onset'
    };
  }
  
  /**
   * Compute onset strength envelope
   */
  _computeOnsetStrength(channelData, sampleRate) {
    const hopLength = this.config.hopLength;
    const frameLength = 2048;
    const frames = Math.floor((channelData.length - frameLength) / hopLength) + 1;
    const onsetStrength = new Float32Array(frames);
    
    // Hann window
    const window = new Float32Array(frameLength);
    for (let i = 0; i < frameLength; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameLength - 1)));
    }
    
    let prevEnergy = 0;
    
    for (let i = 0; i < frames; i++) {
      const start = i * hopLength;
      let energy = 0;
      
      // Apply window and compute energy
      for (let j = 0; j < frameLength && start + j < channelData.length; j++) {
        const sample = channelData[start + j] * window[j];
        energy += sample * sample;
      }
      
      // Onset strength is positive energy difference
      onsetStrength[i] = Math.max(0, energy - prevEnergy);
      prevEnergy = energy;
    }
    
    return onsetStrength;
  }
  
  /**
   * Extract tempo from onset strength
   */
  _tempoFromOnsets(onsetStrength, sampleRate) {
    const hopLength = this.config.hopLength;
    const minLag = Math.floor(60 * sampleRate / (this.config.maxBPM * hopLength));
    const maxLag = Math.floor(60 * sampleRate / (this.config.minBPM * hopLength));
    
    let maxCorr = 0;
    let bestLag = minLag;
    
    // Autocorrelation
    for (let lag = minLag; lag <= maxLag && lag < onsetStrength.length / 2; lag++) {
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < onsetStrength.length - lag; i++) {
        correlation += onsetStrength[i] * onsetStrength[i + lag];
        count++;
      }
      
      if (count > 0) {
        correlation /= count;
        if (correlation > maxCorr) {
          maxCorr = correlation;
          bestLag = lag;
        }
      }
    }
    
    const bpm = 60 * sampleRate / (bestLag * hopLength);
    
    return {
      bpm: bpm,
      confidence: Math.min(1, maxCorr / (maxCorr + 1))
    };
  }
  
  /**
   * Simple peak detection for quick estimation
   */
  _findPeaks(channelData, sampleRate) {
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
    const peaks = [];
    
    for (let i = windowSize; i < channelData.length - windowSize; i += windowSize) {
      let isPeak = true;
      const current = Math.abs(channelData[i]);
      
      // Check if local maximum
      for (let j = -windowSize; j <= windowSize; j += Math.floor(windowSize/4)) {
        if (Math.abs(channelData[i + j]) > current) {
          isPeak = false;
          break;
        }
      }
      
      if (isPeak && current > 0.1) {
        peaks.push(i / sampleRate);
      }
    }
    
    return peaks;
  }
  
  /**
   * Validate and correct BPM
   */
  _validateBPM(bpm) {
    // Common corrections
    if (bpm < this.config.minBPM / 2) {
      return bpm * 2; // Double time
    } else if (bpm > this.config.maxBPM * 1.5) {
      return bpm / 2; // Half time
    }
    
    // Snap to common tempos if close
    const commonTempos = [60, 70, 80, 90, 100, 110, 120, 128, 140, 150, 160, 170, 174];
    for (const tempo of commonTempos) {
      if (Math.abs(bpm - tempo) < 3) {
        return tempo;
      }
    }
    
    return Math.round(bpm * 10) / 10;
  }
  
  /**
   * Start beat tracking for visualization
   */
  _startBeatTracking() {
    if (this.beatInterval) return;
    
    const beatDuration = 60 / this.current;
    let lastBeat = this.audio.context.currentTime;
    
    this.beatInterval = setInterval(() => {
      const now = this.audio.context.currentTime;
      const elapsed = now - lastBeat;
      
      if (elapsed >= beatDuration) {
        lastBeat = now;
        this.emit('beat', {
          time: now,
          bpm: this.current,
          strength: 1.0
        });
      }
    }, 10); // Check every 10ms
  }
  
  /**
   * Stop beat tracking
   */
  stopBeatTracking() {
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
  }
  
  /**
   * Reset detector state
   */
  reset() {
    this.current = 0;
    this.confidence = 0;
    this.stopBeatTracking();
  }
  
  /**
   * Configure detector
   */
  configure(options) {
    Object.assign(this.config, options);
  }
}

// Convenience functions for standalone use
export function quickBPM(audioBuffer) {
  const detector = new BPMDetector({ buffer: audioBuffer });
  return detector.quickEstimate();
}

export async function detectBPM(audioBuffer, options = {}) {
  const detector = new BPMDetector({ buffer: audioBuffer });
  detector.configure(options);
  return detector.analyze();
}