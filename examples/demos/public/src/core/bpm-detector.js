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
  
  const candidates = [];
  
  for (let period = minPeriod; period <= maxPeriod && period < onsetStrength.length / 2; period++) {
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < onsetStrength.length - period; i++) {
      correlation += onsetStrength[i] * onsetStrength[i + period];
      count++;
    }
    
    correlation /= count;
    const bpm = 60 * sampleRate / (period * hopSize);
    
    candidates.push({
      bpm: bpm,
      correlation: correlation,
      period: period
    });
  }
  
  // Sort by correlation strength
  candidates.sort((a, b) => b.correlation - a.correlation);
  
  let bestBPM = candidates[0].bpm;
  let bestCorrelation = candidates[0].correlation;
  
  // Check for half-time/double-time issues
  // If the best BPM is under 90, check if double-time makes more sense
  if (bestBPM < 90) {
    const doubleBPM = bestBPM * 2;
    if (doubleBPM <= 180) {
      // Find correlation for double-time
      const doublePeriod = Math.floor(candidates[0].period / 2);
      if (doublePeriod >= minPeriod) {
        let doubleCorrelation = 0;
        let count = 0;
        
        for (let i = 0; i < onsetStrength.length - doublePeriod; i++) {
          doubleCorrelation += onsetStrength[i] * onsetStrength[i + doublePeriod];
          count++;
        }
        doubleCorrelation /= count;
        
        // If double-time correlation is reasonably strong, prefer it
        if (doubleCorrelation > bestCorrelation * 0.7) {
          bestBPM = doubleBPM;
          bestCorrelation = doubleCorrelation;
        }
      }
    }
  }
  
  // If the best BPM is over 160, check if half-time makes more sense
  if (bestBPM > 160) {
    const halfBPM = bestBPM / 2;
    if (halfBPM >= 60) {
      // Find correlation for half-time
      const halfPeriod = candidates[0].period * 2;
      if (halfPeriod <= maxPeriod && halfPeriod < onsetStrength.length / 2) {
        let halfCorrelation = 0;
        let count = 0;
        
        for (let i = 0; i < onsetStrength.length - halfPeriod; i++) {
          halfCorrelation += onsetStrength[i] * onsetStrength[i + halfPeriod];
          count++;
        }
        halfCorrelation /= count;
        
        // If half-time correlation is reasonably strong, prefer it
        if (halfCorrelation > bestCorrelation * 0.8) {
          bestBPM = halfBPM;
          bestCorrelation = halfCorrelation;
        }
      }
    }
  }
  
  return {
    bpm: bestBPM,
    confidence: bestCorrelation
  };
}
