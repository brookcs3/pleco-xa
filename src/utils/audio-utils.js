/**
 * Audio utility functions
 * Part of Pleco Xa audio analysis engine
 */

/**
 * Find zero crossing point in audio data for clean boundaries
 * @param {Float32Array} data - Audio data
 * @param {number} startIndex - Starting index to search from
 * @returns {number} Index of zero crossing
 */
export function findZeroCrossing(data, startIndex) {
  for (let i = startIndex; i < data.length - 1; i++) {
    if (data[i] >= 0 && data[i + 1] < 0) {
      return i;
    }
  }
  return startIndex;
}

/**
 * Find first non-silent region in audio
 * @param {Float32Array} channelData - Audio channel data
 * @param {number} sampleRate - Sample rate
 * @param {number} threshold - Silence threshold (default 0.01)
 * @returns {number} Sample index where audio content starts
 */
export function findAudioStart(channelData, sampleRate, threshold = 0.01) {
  const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
  
  for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
    const window = channelData.slice(i, i + windowSize);
    const rms = Math.sqrt(window.reduce((sum, sample) => sum + sample * sample, 0) / windowSize);
    
    if (rms > threshold) {
      // Found audio content, back up slightly and find zero crossing
      const startSearch = Math.max(0, i - windowSize);
      return findZeroCrossing(channelData, startSearch);
    }
  }
  
  return 0; // Fallback to beginning
}

/**
 * Apply Hann window to audio data for spectral analysis
 * @param {Float32Array} data - Input audio data
 * @returns {Float32Array} Windowed audio data
 */
export function applyHannWindow(data) {
  const windowed = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (data.length - 1)));
    windowed[i] = data[i] * window;
  }
  return windowed;
}

/**
 * Create reference template from known-good loop
 * @param {AudioBuffer} audioBuffer - Audio buffer
 * @param {number} loopStart - Loop start time in seconds
 * @param {number} loopEnd - Loop end time in seconds
 * @returns {Promise<Object>} Reference template object
 */
export async function createReferenceTemplate(audioBuffer, loopStart, loopEnd) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(loopStart * sampleRate);
  const endSample = Math.floor(loopEnd * sampleRate);
  
  // Extract the reference loop segment
  const loopSegment = channelData.slice(startSample, endSample);
  
  // Import functions we need
  const { computeRMS, computePeak, computeZeroCrossingRate } = await import('../core/audio-utils.js');
  const { computeSpectralCentroid } = await import('../core/spectral.js');
  
  // Compute reference characteristics
  const template = {
    duration: loopEnd - loopStart,
    samples: loopSegment.length,
    rms: computeRMS(audioBuffer),
    peak: computePeak(audioBuffer),
    spectralCentroid: computeSpectralCentroid(audioBuffer),
    zeroCrossingRate: computeZeroCrossingRate(audioBuffer),
    segment: loopSegment,
    sampleRate: sampleRate
  };
  
  console.log('Reference template created:', template);
  return template;
}

/**
 * Analyze longer track using reference template
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @param {Object} template - Reference template
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeWithReference(audioBuffer, template) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = channelData.length;
  
  const templateLength = template.segment.length;
  const stepSize = Math.floor(sampleRate * 0.1); // Check every 100ms
  
  console.log(`Reference analysis: scanning ${totalSamples} samples with template of ${templateLength} samples`);
  
  let bestMatch = {
    position: 0,
    correlation: -Infinity,
    confidence: 0
  };
  
  // Slide the template across the audio to find best match
  for (let pos = 0; pos < totalSamples - templateLength; pos += stepSize) {
    const segment = channelData.slice(pos, pos + templateLength);
    
    // Skip if segment is mostly silence
    const segmentRMS = Math.sqrt(segment.reduce((sum, val) => sum + val * val, 0) / segment.length);
    if (segmentRMS < template.rms * 0.3) continue;
    
    // Cross-correlation with template
    let correlation = 0;
    for (let i = 0; i < templateLength; i++) {
      correlation += segment[i] * template.segment[i];
    }
    
    correlation /= templateLength;
    
    if (correlation > bestMatch.correlation) {
      bestMatch = {
        position: pos,
        correlation: correlation,
        confidence: correlation / Math.max(template.rms, segmentRMS)
      };
    }
  }
  
  // Refine the match with precise zero-crossing
  const startSample = findZeroCrossing(channelData, bestMatch.position);
  const endSample = findZeroCrossing(channelData, bestMatch.position + templateLength);
  
  const result = {
    loopStart: startSample / sampleRate,
    loopEnd: endSample / sampleRate,
    confidence: bestMatch.confidence,
    referenceMatch: bestMatch.correlation,
    templateUsed: true
  };
  
  console.log('Reference-guided result:', result);
  return result;
}