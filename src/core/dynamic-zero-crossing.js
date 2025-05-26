/**
 * Dynamic Zero Crossing with Micro Crossfades
 * Maintains musical accuracy while ensuring clean audio boundaries
 */

export class DynamicZeroCrossing {
  /**
   * Find optimal loop boundaries with zero crossing alignment
   * @param {Float32Array} audioData - Raw audio samples
   * @param {Object} musicalLoop - { start: 0-1, end: 0-1 } musical loop points
   * @param {number} sampleRate - Audio sample rate
   * @returns {Object} - Optimized loop with crossfade data
   */
  static optimizeLoopBoundaries(audioData, musicalLoop, sampleRate) {
    const startSample = Math.floor(musicalLoop.start * audioData.length);
    const endSample = Math.floor(musicalLoop.end * audioData.length);
    
    // Search window: ±5ms around musical points
    const searchWindow = Math.floor(0.005 * sampleRate); // 5ms
    
    // Find zero crossings near musical boundaries
    const startZero = this.findNearestZeroCrossing(audioData, startSample, searchWindow);
    const endZero = this.findNearestZeroCrossing(audioData, endSample, searchWindow);
    
    const result = {
      musical: musicalLoop,
      optimized: {
        start: startZero.sample / audioData.length,
        end: endZero.sample / audioData.length
      },
      crossfades: []
    };
    
    // Create micro crossfades if needed
    if (Math.abs(startZero.sample - startSample) > 10) {
      result.crossfades.push({
        type: 'start',
        musicalPoint: startSample,
        zeroPoint: startZero.sample,
        crossfadeDuration: Math.abs(startZero.sample - startSample)
      });
    }
    
    if (Math.abs(endZero.sample - endSample) > 10) {
      result.crossfades.push({
        type: 'end', 
        musicalPoint: endSample,
        zeroPoint: endZero.sample,
        crossfadeDuration: Math.abs(endZero.sample - endSample)
      });
    }
    
    return result;
  }
  
  /**
   * Find nearest zero crossing within search window
   * @param {Float32Array} audioData - Audio samples
   * @param {number} centerSample - Target sample position
   * @param {number} searchWindow - Samples to search around center
   * @returns {Object} - { sample: number, confidence: number }
   */
  static findNearestZeroCrossing(audioData, centerSample, searchWindow) {
    const startSearch = Math.max(0, centerSample - searchWindow);
    const endSearch = Math.min(audioData.length - 1, centerSample + searchWindow);
    
    let bestSample = centerSample;
    let bestDistance = Math.abs(audioData[centerSample]);
    
    for (let i = startSearch; i < endSearch - 1; i++) {
      // Check for zero crossing (sign change)
      if ((audioData[i] >= 0) !== (audioData[i + 1] >= 0)) {
        const distance = Math.min(Math.abs(audioData[i]), Math.abs(audioData[i + 1]));
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestSample = Math.abs(audioData[i]) < Math.abs(audioData[i + 1]) ? i : i + 1;
        }
      }
    }
    
    return {
      sample: bestSample,
      confidence: 1 - bestDistance, // Closer to zero = higher confidence
      distanceFromMusical: Math.abs(bestSample - centerSample)
    };
  }
  
  /**
   * Generate crossfade data for smooth loop transitions
   * @param {Float32Array} audioData - Audio samples
   * @param {Object} crossfadeInfo - Crossfade configuration
   * @returns {Float32Array} - Crossfaded audio segment
   */
  static generateMicroCrossfade(audioData, crossfadeInfo) {
    const { musicalPoint, zeroPoint, crossfadeDuration } = crossfadeInfo;
    const fadeLength = Math.min(crossfadeDuration, 441); // Max 10ms at 44.1kHz
    
    // Create fade curve (cosine for smooth transition)
    const fadeIn = new Float32Array(fadeLength);
    const fadeOut = new Float32Array(fadeLength);
    
    for (let i = 0; i < fadeLength; i++) {
      const position = i / fadeLength;
      fadeIn[i] = Math.cos((1 - position) * Math.PI / 2); // Smooth fade in
      fadeOut[i] = Math.cos(position * Math.PI / 2);       // Smooth fade out
    }
    
    return { fadeIn, fadeOut, length: fadeLength };
  }
}