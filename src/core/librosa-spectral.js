/**
 * Librosa-style spectral analysis - JavaScript port
 * High-performance spectral feature extraction
 */

import { fft, computeSTFT } from './librosa-onset.js';

/**
 * Port of librosa.feature.spectral_centroid()
 * Much faster and more accurate than our basic implementation
 */
export function spectralCentroid(audioData, sampleRate, {
  hopLength = 512,
  frameLength = 2048,
  window = 'hann'
} = {}) {
  
  console.time('spectral_centroid');
  
  // Compute STFT
  const stft = computeSTFT(audioData, frameLength, hopLength);
  const numFrames = stft.length;
  const numBins = frameLength / 2;
  
  const centroids = new Float32Array(numFrames);
  const freqBins = new Float32Array(numBins);
  
  // Pre-compute frequency bins
  for (let i = 0; i < numBins; i++) {
    freqBins[i] = i * sampleRate / frameLength;
  }
  
  // Calculate centroid for each frame
  for (let frame = 0; frame < numFrames; frame++) {
    const fftFrame = stft[frame];
    let weightedSum = 0;
    let totalMagnitude = 0;
    
    for (let bin = 1; bin < numBins; bin++) { // Skip DC component
      const real = fftFrame[bin * 2];
      const imag = fftFrame[bin * 2 + 1];
      const magnitude = Math.sqrt(real * real + imag * imag);
      
      weightedSum += freqBins[bin] * magnitude;
      totalMagnitude += magnitude;
    }
    
    centroids[frame] = totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
  }
  
  console.timeEnd('spectral_centroid');
  
  // Return mean centroid for simplicity, but also frame-by-frame data
  const meanCentroid = centroids.reduce((sum, c) => sum + c, 0) / numFrames;
  
  return {
    centroid: meanCentroid,
    centroids: Array.from(centroids),
    sampleRate,
    hopLength
  };
}

/**
 * Port of librosa.feature.spectral_rolloff()
 * Frequency below which X% of energy is contained
 */
export function spectralRolloff(audioData, sampleRate, {
  hopLength = 512,
  frameLength = 2048,
  rollPercent = 0.85
} = {}) {
  
  const stft = computeSTFT(audioData, frameLength, hopLength);
  const numFrames = stft.length;
  const numBins = frameLength / 2;
  
  const rolloffs = new Float32Array(numFrames);
  const freqBins = new Float32Array(numBins);
  
  // Pre-compute frequency bins
  for (let i = 0; i < numBins; i++) {
    freqBins[i] = i * sampleRate / frameLength;
  }
  
  for (let frame = 0; frame < numFrames; frame++) {
    const fftFrame = stft[frame];
    const magnitudes = new Float32Array(numBins);
    let totalEnergy = 0;
    
    // Calculate magnitudes and total energy
    for (let bin = 0; bin < numBins; bin++) {
      const real = fftFrame[bin * 2];
      const imag = fftFrame[bin * 2 + 1];
      magnitudes[bin] = real * real + imag * imag; // Power spectrum
      totalEnergy += magnitudes[bin];
    }
    
    // Find rolloff frequency
    let cumulativeEnergy = 0;
    const targetEnergy = totalEnergy * rollPercent;
    
    for (let bin = 0; bin < numBins; bin++) {
      cumulativeEnergy += magnitudes[bin];
      if (cumulativeEnergy >= targetEnergy) {
        rolloffs[frame] = freqBins[bin];
        break;
      }
    }
  }
  
  const meanRolloff = rolloffs.reduce((sum, r) => sum + r, 0) / numFrames;
  
  return {
    rolloff: meanRolloff,
    rolloffs: Array.from(rolloffs)
  };
}

/**
 * Port of librosa.feature.spectral_bandwidth()
 * Spectral bandwidth around the centroid
 */
export function spectralBandwidth(audioData, sampleRate, options = {}) {
  const centroidResult = spectralCentroid(audioData, sampleRate, options);
  const { hopLength = 512, frameLength = 2048 } = options;
  
  const stft = computeSTFT(audioData, frameLength, hopLength);
  const numFrames = stft.length;
  const numBins = frameLength / 2;
  
  const bandwidths = new Float32Array(numFrames);
  const freqBins = new Float32Array(numBins);
  
  // Pre-compute frequency bins
  for (let i = 0; i < numBins; i++) {
    freqBins[i] = i * sampleRate / frameLength;
  }
  
  for (let frame = 0; frame < numFrames; frame++) {
    const fftFrame = stft[frame];
    const centroid = centroidResult.centroids[frame];
    
    let weightedVariance = 0;
    let totalMagnitude = 0;
    
    for (let bin = 1; bin < numBins; bin++) {
      const real = fftFrame[bin * 2];
      const imag = fftFrame[bin * 2 + 1];
      const magnitude = Math.sqrt(real * real + imag * imag);
      
      const freqDiff = freqBins[bin] - centroid;
      weightedVariance += magnitude * freqDiff * freqDiff;
      totalMagnitude += magnitude;
    }
    
    bandwidths[frame] = totalMagnitude > 0 ? Math.sqrt(weightedVariance / totalMagnitude) : 0;
  }
  
  const meanBandwidth = bandwidths.reduce((sum, b) => sum + b, 0) / numFrames;
  
  return {
    bandwidth: meanBandwidth,
    bandwidths: Array.from(bandwidths)
  };
}

/**
 * Port of librosa.feature.zero_crossing_rate()
 * Rate of sign changes in the signal
 */
export function zeroCrossingRate(audioData, {
  frameLength = 2048,
  hopLength = 512,
  threshold = 1e-10
} = {}) {
  
  const numFrames = Math.floor((audioData.length - frameLength) / hopLength) + 1;
  const zcrs = new Float32Array(numFrames);
  
  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopLength;
    let crossings = 0;
    
    for (let i = start + 1; i < start + frameLength && i < audioData.length; i++) {
      if (Math.abs(audioData[i]) > threshold && Math.abs(audioData[i - 1]) > threshold) {
        if ((audioData[i] > 0) !== (audioData[i - 1] > 0)) {
          crossings++;
        }
      }
    }
    
    zcrs[frame] = crossings / (frameLength - 1);
  }
  
  const meanZCR = zcrs.reduce((sum, z) => sum + z, 0) / numFrames;
  
  return {
    zcr: meanZCR,
    zcrs: Array.from(zcrs)
  };
}

/**
 * Fast multi-feature extraction
 * Compute multiple spectral features in one pass for efficiency
 */
export function extractSpectralFeatures(audioData, sampleRate, options = {}) {
  console.time('extract_spectral_features');
  
  const { hopLength = 512, frameLength = 2048 } = options;
  
  // Compute STFT once and reuse
  const stft = computeSTFT(audioData, frameLength, hopLength);
  const numFrames = stft.length;
  const numBins = frameLength / 2;
  
  // Pre-compute frequency bins
  const freqBins = new Float32Array(numBins);
  for (let i = 0; i < numBins; i++) {
    freqBins[i] = i * sampleRate / frameLength;
  }
  
  // Initialize feature arrays
  const centroids = new Float32Array(numFrames);
  const rolloffs = new Float32Array(numFrames);
  const bandwidths = new Float32Array(numFrames);
  const flatness = new Float32Array(numFrames);
  
  // Compute all features in one pass
  for (let frame = 0; frame < numFrames; frame++) {
    const fftFrame = stft[frame];
    
    let weightedSum = 0;
    let totalMagnitude = 0;
    let totalEnergy = 0;
    let geometricMean = 0;
    let arithmeticMean = 0;
    
    const magnitudes = new Float32Array(numBins);
    
    // First pass: basic calculations
    for (let bin = 1; bin < numBins; bin++) {
      const real = fftFrame[bin * 2];
      const imag = fftFrame[bin * 2 + 1];
      const magnitude = Math.sqrt(real * real + imag * imag);
      const power = magnitude * magnitude;
      
      magnitudes[bin] = magnitude;
      weightedSum += freqBins[bin] * magnitude;
      totalMagnitude += magnitude;
      totalEnergy += power;
      
      if (magnitude > 1e-10) {
        geometricMean += Math.log(magnitude);
        arithmeticMean += magnitude;
      }
    }
    
    // Centroid
    centroids[frame] = totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
    
    // Rolloff (85% energy)
    let cumulativeEnergy = 0;
    const targetEnergy = totalEnergy * 0.85;
    for (let bin = 1; bin < numBins; bin++) {
      cumulativeEnergy += magnitudes[bin] * magnitudes[bin];
      if (cumulativeEnergy >= targetEnergy) {
        rolloffs[frame] = freqBins[bin];
        break;
      }
    }
    
    // Bandwidth (around centroid)
    let weightedVariance = 0;
    for (let bin = 1; bin < numBins; bin++) {
      const freqDiff = freqBins[bin] - centroids[frame];
      weightedVariance += magnitudes[bin] * freqDiff * freqDiff;
    }
    bandwidths[frame] = totalMagnitude > 0 ? Math.sqrt(weightedVariance / totalMagnitude) : 0;
    
    // Spectral flatness (geometric mean / arithmetic mean)
    if (arithmeticMean > 0) {
      geometricMean = Math.exp(geometricMean / (numBins - 1));
      arithmeticMean = arithmeticMean / (numBins - 1);
      flatness[frame] = geometricMean / arithmeticMean;
    }
  }
  
  console.timeEnd('extract_spectral_features');
  
  return {
    spectralCentroid: centroids.reduce((sum, c) => sum + c, 0) / numFrames,
    spectralRolloff: rolloffs.reduce((sum, r) => sum + r, 0) / numFrames,
    spectralBandwidth: bandwidths.reduce((sum, b) => sum + b, 0) / numFrames,
    spectralFlatness: flatness.reduce((sum, f) => sum + f, 0) / numFrames,
    
    // Frame-by-frame data
    centroids: Array.from(centroids),
    rolloffs: Array.from(rolloffs),
    bandwidths: Array.from(bandwidths),
    flatness: Array.from(flatness)
  };
}