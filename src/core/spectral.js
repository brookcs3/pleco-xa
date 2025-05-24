/**
 * Spectral analysis functions
 * Part of Pleco Xa audio analysis engine
 */

/**
 * Compute spectrum using Web Audio API analyser
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @param {number} fftSize - FFT size (default 2048)
 * @returns {Promise<Array<number>>} Frequency domain data
 */
export async function computeSpectrum(audioBuffer, fftSize = 2048) {
  const offline = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = audioBuffer;
  const analyser = offline.createAnalyser();
  analyser.fftSize = fftSize;
  source.connect(analyser);
  analyser.connect(offline.destination);
  source.start();
  await offline.startRendering();
  const data = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(data);
  return Array.from(data);
}

/**
 * Compute spectral centroid (brightness) of audio buffer
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @returns {number} Spectral centroid in Hz
 */
export function computeSpectralCentroid(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  const fftSize = 2048;
  let centroid = 0;
  let magnitude = 0;
  
  for (let i = 0; i < channelData.length - fftSize; i += fftSize) {
    const frame = channelData.slice(i, i + fftSize);
    const fft = computeFFT(frame);
    
    let weightedSum = 0;
    let totalMagnitude = 0;
    
    for (let j = 0; j < fft.length / 2; j++) {
      const mag = Math.sqrt(fft[j * 2] ** 2 + fft[j * 2 + 1] ** 2);
      weightedSum += j * mag;
      totalMagnitude += mag;
    }
    
    if (totalMagnitude > 0) {
      centroid += weightedSum / totalMagnitude;
      magnitude += totalMagnitude;
    }
  }
  
  return centroid / (channelData.length / fftSize) * audioBuffer.sampleRate / fftSize;
}

/**
 * Simple FFT implementation for spectral analysis
 * @param {Float32Array} frame - Audio frame to transform
 * @returns {Float32Array} FFT result (interleaved real/imaginary)
 */
export function computeFFT(frame) {
  const N = frame.length;
  const real = new Float32Array(N);
  const imag = new Float32Array(N);
  
  for (let i = 0; i < N; i++) {
    real[i] = frame[i];
    imag[i] = 0;
  }
  
  // Simplified FFT (normally would use a proper FFT library)
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const angle = -2 * Math.PI * i * j / N;
      real[i] += frame[j] * Math.cos(angle);
      imag[i] += frame[j] * Math.sin(angle);
    }
  }
  
  const result = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    result[i * 2] = real[i];
    result[i * 2 + 1] = imag[i];
  }
  
  return result;
}
