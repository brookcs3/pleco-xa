/**
 * BPM Detection using autocorrelation on onset strength
 * Part of Pleco Xa audio analysis engine
 */

/**
 * Detect BPM (Beats Per Minute) from audio data
 * Uses autocorrelation on onset strength to find periodic patterns
 * 
 * @param {Float32Array} audioData - Raw audio samples
 * @param {number} sampleRate - Sample rate of the audio
 * @returns {Object} { bpm: number, confidence: number }
 */
export function detectBPM(audioData, sampleRate) {
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
  
  // Autocorrelation to find periodic patterns
  const minBPM = 60;
  const maxBPM = 180;
  const minPeriod = Math.floor((60 / maxBPM) * sampleRate / hopSize);
  const maxPeriod = Math.floor((60 / minBPM) * sampleRate / hopSize);
  
  let bestBPM = 120; // Default
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
      bestBPM = 60 * sampleRate / (period * hopSize);
    }
  }
  
  return {
    bpm: bestBPM,
    confidence: bestCorrelation
  };
}