/**
 * BPM Detection Module
 * Handles tempo detection and beat tracking
 */

/**
 * Detect BPM from audio buffer
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @param {Object} options - Detection options
 * @returns {Promise<Object>} BPM result
 */
export async function detectBPM(audioBuffer, options = {}) {
  const defaultOptions = {
    minBPM: 60,
    maxBPM: 180,
    windowSize: 2048,
    hopSize: 512
  };
  
  const opts = { ...defaultOptions, ...options };
  
  try {
    // Quick BPM estimation for immediate feedback
    const quickResult = await quickBPMDetect(audioBuffer, opts);
    
    // Apply musical corrections
    let bpm = quickResult.bpm;
    let confidence = quickResult.confidence || 0.7;
    
    // Simple sanity correction for extreme values
    if (bpm > 160) {
      bpm = bpm / 2;
    } else if (bpm < 55) {
      bpm = bpm * 2;
    }
    
    return {
      bpm,
      confidence,
      original: quickResult.bpm
    };
  } catch (error) {
    console.error('BPM detection failed:', error);
    
    // Fallback to a default BPM
    return {
      bpm: 120,
      confidence: 0.5,
      error: error.message
    };
  }
}

/**
 * Quick BPM detection using onset strength
 * @private
 */
async function quickBPMDetect(audioBuffer, options) {
  // For demo purposes, we'll use a simplified algorithm
  // In a real implementation, this would use proper onset detection and autocorrelation
  
  const channel = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;
  
  // Use only a portion of the audio for faster processing
  const maxSamples = Math.min(channel.length, sr * 30); // Max 30 seconds
  const data = channel.subarray(0, maxSamples);
  
  // Calculate energy changes (very simplified onset detection)
  const frameSize = options.windowSize || 2048;
  const hopSize = options.hopSize || 512;
  const energyChanges = [];
  
  let prevEnergy = 0;
  for (let i = 0; i + frameSize < data.length; i += hopSize) {
    // Calculate frame energy
    let energy = 0;
    for (let j = 0; j < frameSize; j++) {
      energy += data[i + j] * data[i + j];
    }
    energy /= frameSize;
    
    // Calculate energy change (onset strength)
    const change = Math.max(0, energy - prevEnergy);
    energyChanges.push(change);
    
    prevEnergy = energy;
  }
  
  // Find peaks in onset strength
  const peaks = findPeaks(energyChanges, 0.5);
  
  // Calculate intervals between peaks
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }
  
  // Convert to BPM
  const frameRate = sr / hopSize;
  const medianInterval = median(intervals);
  const bpm = 60 * frameRate / medianInterval;
  
  // Ensure BPM is in the specified range
  let finalBpm = bpm;
  while (finalBpm < options.minBPM) finalBpm *= 2;
  while (finalBpm > options.maxBPM) finalBpm /= 2;
  
  return {
    bpm: finalBpm,
    confidence: 0.7
  };
}

/**
 * Find peaks in a signal
 * @private
 */
function findPeaks(signal, threshold = 0.5) {
  const peaks = [];
  
  // Normalize the signal
  const max = Math.max(...signal);
  const normalizedSignal = signal.map(val => val / max);
  
  // Find peaks
  for (let i = 1; i < normalizedSignal.length - 1; i++) {
    if (normalizedSignal[i] > threshold && 
        normalizedSignal[i] > normalizedSignal[i - 1] && 
        normalizedSignal[i] > normalizedSignal[i + 1]) {
      peaks.push(i);
    }
  }
  
  return peaks;
}

/**
 * Calculate median of an array
 * @private
 */
function median(values) {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}