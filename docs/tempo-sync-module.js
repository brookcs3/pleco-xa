// src/utils/TempoSync.js

/**
 * TempoSync - Advanced tempo detection and synchronization
 * Inspired by librosa's beat tracking algorithms
 */
export class TempoSync {
  constructor(audioContext) {
    this.context = audioContext;
    this.fftSize = 2048;
    this.hopSize = 512;
  }

  /**
   * Analyze audio buffer for tempo and beat grid
   */
  async analyzeBuffer(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Extract onset envelope
    const onsetEnvelope = await this.extractOnsetEnvelope(channelData, sampleRate);
    
    // Detect tempo using autocorrelation
    const tempo = this.detectTempo(onsetEnvelope, sampleRate);
    
    // Extract beat positions
    const beats = this.extractBeats(onsetEnvelope, tempo, sampleRate);
    
    // Find loop points
    const loopPoints = this.findOptimalLoopPoints(channelData, beats, sampleRate);
    
    return {
      tempo,
      beats,
      loopPoints,
      onsetEnvelope
    };
  }

  /**
   * Extract onset envelope using spectral flux
   */
  async extractOnsetEnvelope(channelData, sampleRate) {
    const frameCount = Math.floor((channelData.length - this.fftSize) / this.hopSize);
    const envelope = new Float32Array(frameCount);
    
    // Create offline context for analysis
    const offlineContext = new OfflineAudioContext(1, channelData.length, sampleRate);
    const source = offlineContext.createBufferSource();
    const analyser = offlineContext.createAnalyser();
    
    // Create buffer
    const buffer = offlineContext.createBuffer(1, channelData.length, sampleRate);
    buffer.copyToChannel(channelData, 0);
    source.buffer = buffer;
    
    // Setup analyser
    analyser.fftSize = this.fftSize;
    source.connect(analyser);
    analyser.connect(offlineContext.destination);
    
    source.start();
    
    // Process frames
    const magnitudes = new Float32Array(analyser.frequencyBinCount);
    const prevMagnitudes = new Float32Array(analyser.frequencyBinCount);
    
    for (let i = 0; i < frameCount; i++) {
      const startSample = i * this.hopSize;
      
      // Get frequency data for this frame
      const frameData = channelData.slice(startSample, startSample + this.fftSize);
      const spectrum = this.computeSpectrum(frameData);
      
      // Calculate spectral flux
      let flux = 0;
      for (let j = 0; j < spectrum.length; j++) {
        const diff = spectrum[j] - prevMagnitudes[j];
        if (diff > 0) flux += diff;
        prevMagnitudes[j] = spectrum[j];
      }
      
      envelope[i] = flux;
    }
    
    // Normalize and smooth
    return this.smoothEnvelope(this.normalizeArray(envelope));
  }

  /**
   * Compute magnitude spectrum using FFT
   */
  computeSpectrum(frameData) {
    // Apply window function
    const windowed = this.applyHannWindow(frameData);
    
    // Compute FFT (simplified - in production use Web Audio API or WASM)
    const real = new Float32Array(windowed);
    const imag = new Float32Array(windowed.length);
    
    // Simple DFT implementation (replace with optimized FFT)
    const N = windowed.length;
    const spectrum = new Float32Array(N / 2);
    
    for (let k = 0; k < N / 2; k++) {
      let sumReal = 0;
      let sumImag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        sumReal += windowed[n] * Math.cos(angle);
        sumImag += windowed[n] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
    }
    
    return spectrum;
  }

  /**
   * Apply Hann window to reduce spectral leakage
   */
  applyHannWindow(data) {
    const windowed = new Float32Array(data.length);
    const N = data.length;
    
    for (let i = 0; i < N; i++) {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
      windowed[i] = data[i] * window;
    }
    
    return windowed;
  }

  /**
   * Detect tempo using autocorrelation
   */
  detectTempo(envelope, sampleRate) {
    const frameRate = sampleRate / this.hopSize;
    
    // Define tempo range (60-180 BPM)
    const minPeriod = Math.floor(frameRate * 60 / 180); // Max BPM
    const maxPeriod = Math.floor(frameRate * 60 / 60);  // Min BPM
    
    // Compute autocorrelation
    const autocorr = this.autocorrelation(envelope, minPeriod, maxPeriod);
    
    // Find peak in autocorrelation
    let maxCorr = -Infinity;
    let bestPeriod = minPeriod;
    
    for (let period = minPeriod; period <= maxPeriod; period++) {
      if (autocorr[period - minPeriod] > maxCorr) {
        maxCorr = autocorr[period - minPeriod];
        bestPeriod = period;
      }
    }
    
    // Convert period to BPM
    const tempo = (frameRate * 60) / bestPeriod;
    
    // Refine tempo using peak picking
    return this.refineTempo(tempo, envelope, frameRate);
  }

  /**
   * Compute autocorrelation for tempo detection
   */
  autocorrelation(data, minLag, maxLag) {
    const result = new Float32Array(maxLag - minLag + 1);
    
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < data.length - lag; i++) {
        sum += data[i] * data[i + lag];
      }
      result[lag - minLag] = sum / (data.length - lag);
    }
    
    return result;
  }

  /**
   * Refine tempo estimate using peak analysis
   */
  refineTempo(initialTempo, envelope, frameRate) {
    // Test tempos around initial estimate
    const tempoRange = 5; // +/- 5 BPM
    const tempoStep = 0.1;
    
    let bestTempo = initialTempo;
    let bestScore = -Infinity;
    
    for (let tempo = initialTempo - tempoRange; tempo <= initialTempo + tempoRange; tempo += tempoStep) {
      const period = frameRate * 60 / tempo;
      const score = this.evaluateTempoHypothesis(envelope, period);
      
      if (score > bestScore) {
        bestScore = score;
        bestTempo = tempo;
      }
    }
    
    return Math.round(bestTempo * 10) / 10; // Round to 1 decimal
  }

  /**
   * Evaluate how well a tempo hypothesis fits the onset envelope
   */
  evaluateTempoHypothesis(envelope, period) {
    let score = 0;
    const tolerance = period * 0.1; // 10% tolerance
    
    // Check how well beats align with peaks
    for (let beatTime = 0; beatTime < envelope.length; beatTime += period) {
      const beatIndex = Math.round(beatTime);
      
      // Find nearest peak within tolerance
      let maxValue = 0;
      const startIdx = Math.max(0, Math.floor(beatIndex - tolerance));
      const endIdx = Math.min(envelope.length - 1, Math.ceil(beatIndex + tolerance));
      
      for (let i = startIdx; i <= endIdx; i++) {
        maxValue = Math.max(maxValue, envelope[i]);
      }
      
      score += maxValue;
    }
    
    return score;
  }

  /**
   * Extract beat positions from onset envelope
   */
  extractBeats(envelope, tempo, sampleRate) {
    const frameRate = sampleRate / this.hopSize;
    const beatPeriod = frameRate * 60 / tempo;
    const beats = [];
    
    // Dynamic programming beat tracking
    const numFrames = envelope.length;
    const scores = new Float32Array(numFrames);
    const predecessors = new Int32Array(numFrames);
    
    // Initialize
    scores[0] = envelope[0];
    predecessors[0] = -1;
    
    // Forward pass
    for (let i = 1; i < numFrames; i++) {
      scores[i] = envelope[i];
      predecessors[i] = -1;
      
      // Look for previous beats within tempo range
      const minPrev = Math.max(0, i - Math.round(beatPeriod * 1.2));
      const maxPrev = Math.max(0, i - Math.round(beatPeriod * 0.8));
      
      for (let j = minPrev; j <= maxPrev; j++) {
        const interval = i - j;
        const tempoCost = Math.abs(interval - beatPeriod) / beatPeriod;
        const transitionScore = scores[j] - tempoCost * 0.5;
        
        if (transitionScore > scores[i]) {
          scores[i] = transitionScore;
          predecessors[i] = j;
        }
      }
      
      scores[i] += envelope[i];
    }
    
    // Backward pass to extract beats
    let currentFrame = numFrames - 1;
    while (currentFrame >= 0) {
      const beatTime = (currentFrame * this.hopSize) / sampleRate;
      beats.unshift(beatTime);
      currentFrame = predecessors[currentFrame];
    }
    
    return beats;
  }

  /**
   * Find optimal loop points based on beat grid and audio similarity
   */
  findOptimalLoopPoints(channelData, beats, sampleRate) {
    if (beats.length < 4) {
      return { start: 0, end: channelData.length / sampleRate };
    }
    
    // Look for repeating patterns in beat structure
    const targetLoopLength = 4; // 4 beats
    let bestScore = -Infinity;
    let bestStart = 0;
    let bestEnd = beats[targetLoopLength];
    
    for (let i = 0; i < beats.length - targetLoopLength * 2; i++) {
      const startBeat = i;
      const endBeat = i + targetLoopLength;
      
      if (endBeat >= beats.length) break;
      
      const startTime = beats[startBeat];
      const endTime = beats[endBeat];
      
      // Compare audio similarity
      const score = this.compareAudioSegments(
        channelData,
        startTime * sampleRate,
        endTime * sampleRate,
        (endTime - startTime) * sampleRate
      );
      
      if (score > bestScore) {
        bestScore = score;
        bestStart = startTime;
        bestEnd = endTime;
      }
    }
    
    // Refine to zero crossings
    const startSample = this.findNearestZeroCrossing(channelData, bestStart * sampleRate);
    const endSample = this.findNearestZeroCrossing(channelData, bestEnd * sampleRate);
    
    return {
      start: startSample / sampleRate,
      end: endSample / sampleRate
    };
  }

  /**
   * Compare similarity of two audio segments
   */
  compareAudioSegments(data, start1, start2, length) {
    let correlation = 0;
    const samples = Math.min(length, data.length - start2);
    
    for (let i = 0; i < samples; i++) {
      const idx1 = Math.floor(start1 + i);
      const idx2 = Math.floor(start2 + i);
      
      if (idx1 < data.length && idx2 < data.length) {
        correlation += data[idx1] * data[idx2];
      }
    }
    
    return correlation / samples;
  }

  /**
   * Find nearest zero crossing
   */
  findNearestZeroCrossing(data, targetSample) {
    const searchRange = 1000; // Search within 1000 samples
    const start = Math.max(0, targetSample - searchRange);
    const end = Math.min(data.length - 1, targetSample + searchRange);
    
    let nearestCrossing = targetSample;
    let minDistance = Infinity;
    
    for (let i = start; i < end - 1; i++) {
      if ((data[i] >= 0 && data[i + 1] < 0) || (data[i] < 0 && data[i + 1] >= 0)) {
        const distance = Math.abs(i - targetSample);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCrossing = i;
        }
      }
    }
    
    return nearestCrossing;
  }

  /**
   * Normalize array to 0-1 range
   */
  normalizeArray(array) {
    const max = Math.max(...array);
    const min = Math.min(...array);
    const range = max - min;
    
    if (range === 0) return array;
    
    return array.map(val => (val - min) / range);
  }

  /**
   * Smooth envelope using moving average
   */
  smoothEnvelope(envelope, windowSize = 5) {
    const smoothed = new Float32Array(envelope.length);
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < envelope.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(envelope.length - 1, i + halfWindow); j++) {
        sum += envelope[j];
        count++;
      }
      
      smoothed[i] = sum / count;
    }
    
    return smoothed;
  }

  /**
   * Synchronize two loops by adjusting playback rate
   */
  syncLoops(masterTempo, slaveTempo, slaveSource) {
    const tempoRatio = masterTempo / slaveTempo;
    
    // Gradually adjust playback rate to avoid artifacts
    if (slaveSource.playbackRate) {
      const currentRate = slaveSource.playbackRate.value;
      const targetRate = tempoRatio;
      const rampTime = 0.5; // 500ms transition
      
      slaveSource.playbackRate.setValueAtTime(currentRate, this.context.currentTime);
      slaveSource.playbackRate.linearRampToValueAtTime(targetRate, this.context.currentTime + rampTime);
    }
    
    return tempoRatio;
  }

  /**
   * Phase align two loops at their beat grids
   */
  phaseAlign(masterBeats, slaveBeats, slaveSource, currentTime) {
    // Find nearest beat in master
    const masterBeatIndex = this.findNearestBeatIndex(masterBeats, currentTime);
    const slaveBeatIndex = this.findNearestBeatIndex(slaveBeats, currentTime);
    
    // Calculate phase offset
    const masterBeatTime = masterBeats[masterBeatIndex];
    const slaveBeatTime = slaveBeats[slaveBeatIndex];
    const phaseOffset = masterBeatTime - slaveBeatTime;
    
    // Apply phase correction
    if (slaveSource.detune) {
      // Temporarily adjust pitch to catch up/slow down
      const correction = phaseOffset * 100; // Convert to cents
      slaveSource.detune.setValueAtTime(correction, this.context.currentTime);
      slaveSource.detune.linearRampToValueAtTime(0, this.context.currentTime + 1);
    }
    
    return phaseOffset;
  }

  /**
   * Find nearest beat index to given time
   */
  findNearestBeatIndex(beats, time) {
    let nearestIndex = 0;
    let minDistance = Math.abs(beats[0] - time);
    
    for (let i = 1; i < beats.length; i++) {
      const distance = Math.abs(beats[i] - time);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    return nearestIndex;
  }
}