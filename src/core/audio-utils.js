/**
 * Basic audio processing utilities
 * Part of Pleco Xa audio analysis engine
 */

/**
 * Load audio buffer from URL
 * @param {string} url - URL to audio file
 * @param {AudioContext} context - Web Audio API context
 * @returns {Promise<AudioBuffer>} Decoded audio buffer
 */
export async function loadAudioBuffer(url, context = new AudioContext()) {
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  return await context.decodeAudioData(arr);
}

/**
 * Compute RMS (Root Mean Square) energy of audio buffer
 * @param {AudioBuffer} audioBuffer - Web Audio API buffer
 * @returns {number} RMS value
 */
export function computeRMS(audioBuffer) {
  const channel = audioBuffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < channel.length; i++) {
    const v = channel[i];
    sum += v * v;
  }
  return Math.sqrt(sum / channel.length);
}

/**
 * Compute peak amplitude of audio buffer
 * @param {AudioBuffer} audioBuffer - Web Audio API buffer
 * @returns {number} Peak amplitude value
 */
export function computePeak(audioBuffer) {
  const channel = audioBuffer.getChannelData(0);
  let max = 0;
  for (let i = 0; i < channel.length; i++) {
    const v = Math.abs(channel[i]);
    if (v > max) max = v;
  }
  return max;
}

/**
 * Compute zero crossing rate of audio buffer
 * Indicates the rate at which the signal changes from positive to negative
 * @param {AudioBuffer} audioBuffer - Web Audio API buffer
 * @returns {number} Zero crossing rate
 */
export function computeZeroCrossingRate(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  let crossings = 0;
  
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) {
      crossings++;
    }
  }
  
  return crossings / channelData.length;
}
