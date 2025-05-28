/**
 * Librosa-style onset detection - JavaScript port
 * High-performance implementation for real-time audio analysis
 * Provides spectral flux onset strength and peak picking.
 */
export function fft(signal) {
  const N = signal.length;
  if (N <= 1) return signal;

  // Ensure length is power of 2
  const nextPow2 = Math.pow(2, Math.ceil(Math.log2(N)));
  if (N !== nextPow2) {
    const padded = new Float32Array(nextPow2);
    padded.set(signal);
    return fft(padded);
  }

  // Bit-reversal permutation
  const reversed = new Float32Array(N * 2); // complex array: [real, imag, real, imag, ...]
  for (let i = 0; i < N; i++) {
    const j = reverseBits(i, Math.log2(N));
    reversed[j * 2] = signal[i];
    reversed[j * 2 + 1] = 0;
  }

  // Cooley-Tukey FFT
  for (let len = 2; len <= N; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wlen = [Math.cos(angle), Math.sin(angle)];
    for (let i = 0; i < N; i += len) {
      let w = [1, 0];
      for (let j = 0; j < len / 2; j++) {
        const uRe = reversed[(i + j) * 2];
        const uIm = reversed[(i + j) * 2 + 1];
        const vRe = reversed[(i + j + len / 2) * 2] * w[0] - reversed[(i + j + len / 2) * 2 + 1] * w[1];
        const vIm = reversed[(i + j + len / 2) * 2] * w[1] + reversed[(i + j + len / 2) * 2 + 1] * w[0];
        reversed[(i + j) * 2] = uRe + vRe;
        reversed[(i + j) * 2 + 1] = uIm + vIm;
        reversed[(i + j + len / 2) * 2] = uRe - vRe;
        reversed[(i + j + len / 2) * 2 + 1] = uIm - vIm;
        const temp = w[0] * wlen[0] - w[1] * wlen[1];
        w[1] = w[0] * wlen[1] + w[1] * wlen[0];
        w[0] = temp;
      }
    }
  }

  return reversed;
}

function reverseBits(num, bits) {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (num & 1);
    num >>= 1;
  }
  return result;
}

/**
 * Spectral flux onset detection function and peak picking.
 * @param {Float32Array} audioData - Mono audio signal
 * @param {number} sampleRate - Sampling rate of the audio data
 * @param {Object} [options] - Onset detection options
 * @param {number} [options.hopLength=512] - Hop length for STFT frames
 * @param {number} [options.frameLength=2048] - Frame length for STFT
 * @param {number} [options.delta=0.07] - Threshold offset for peak picking (increase for fewer onsets)
 * @param {number} [options.wait=20] - Minimum number of frames to wait between detected onsets
 * @returns {Object} - Onset detection result with times, strength envelope, and frame indices
 */
export function onsetDetect(audioData, sampleRate, { hopLength = 512, frameLength = 2048, delta = 0.07, wait = 20 } = {}) {
  console.time('onset_detect');
  // Step 1: Compute STFT of the signal
  const stft = computeSTFT(audioData, frameLength, hopLength);
  // Step 2: Compute spectral flux onset strength envelope
  const onsetStrength = computeSpectralFlux(stft);
  // Step 3: Peak picking on onset strength to find onset frame indices
  const onsetFrames = pickPeaks(onsetStrength, { delta, wait });
  // Step 4: Convert frame indices to times (seconds), refining using waveform peaks
  const onsetTimes = onsetFrames.map(frameIndex => {
    // Refine onset time by finding waveform peak near this frame
    const frameStart = frameIndex * hopLength;
    const searchStart = Math.max(0, frameStart - Math.floor(hopLength / 2));
    const searchEnd = Math.min(audioData.length, frameStart + Math.floor(hopLength / 2));
    let peakIndex = frameStart;
    let peakValue = 0;
    for (let i = searchStart; i < searchEnd; i++) {
      const value = Math.abs(audioData[i]);
      if (value > peakValue) {
        peakValue = value;
        peakIndex = i;
      }
    }
    return peakIndex / sampleRate;
  });
  console.timeEnd('onset_detect');
  return { onsetTimes, onsetStrength, onsetFrames };
}

/**
 * Compute Short-Time Fourier Transform (STFT) with Hann window.
 * @param {Float32Array} audioData - Mono audio signal
 * @param {number} frameLength - Number of samples per frame
 * @param {number} hopLength - Hop length (advance) in samples between frames
 * @returns {Array<Float32Array>} STFT result as array of complex spectra (Float32Array of interleaved real/imag)
 */
export function computeSTFT(audioData, frameLength = 2048, hopLength = 512) {
  const numFrames = Math.floor((audioData.length - frameLength) / hopLength) + 1;
  const stft = [];
  // Pre-compute Hann window coefficients
  const window = new Float32Array(frameLength);
  for (let i = 0; i < frameLength; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameLength - 1)));
  }
  // For each frame, apply window and compute FFT
  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopLength;
    const segment = new Float32Array(frameLength);
    for (let j = 0; j < frameLength && start + j < audioData.length; j++) {
      segment[j] = audioData[start + j] * window[j];
    }
    const spectrum = fft(segment);
    stft.push(spectrum);
  }
  return stft;
}

/**
 * Compute spectral flux onset strength envelope from STFT.
 * Spectral flux measures the increase in spectral energy between consecutive frames.
 * @param {Array<Float32Array>} stft - Array of complex spectra (as produced by computeSTFT)
 * @returns {Float32Array} Onset strength (spectral flux) for each frame
 */
export function computeSpectralFlux(stft) {
  const frames = stft.length;
  const onsetStrength = new Float32Array(frames);
  onsetStrength[0] = 0;
  for (let i = 1; i < frames; i++) {
    const prevSpectrum = stft[i - 1];
    const currSpectrum = stft[i];
    let flux = 0;
    // Sum of positive differences in magnitude spectrum
    for (let bin = 0; bin < currSpectrum.length; bin += 2) {
      const prevMag = Math.sqrt(prevSpectrum[bin] ** 2 + prevSpectrum[bin + 1] ** 2);
      const currMag = Math.sqrt(currSpectrum[bin] ** 2 + currSpectrum[bin + 1] ** 2);
      flux += Math.max(0, currMag - prevMag);
    }
    onsetStrength[i] = flux;
  }
  return onsetStrength;
}

/**
 * Compute onset strength envelope from audio or STFT, mirroring librosa.onset.onset_strength().
 * @param {Float32Array|Array<Float32Array>} input - Audio signal or pre-computed STFT
 * @param {Object} [opts] - Options for STFT if input is audio
 * @param {number} [opts.sr=22050] - Sample rate (required if input is audio)
 * @param {number} [opts.hop_length=512] - Hop length for STFT (if input is audio)
 * @param {number} [opts.frame_length=2048] - Frame length for STFT (if input is audio)
 * @returns {Float32Array} Onset strength envelope array
 */
// eslint-disable-next-line camelcase
export function onset_strength(input, opts = {}) {
  const { sr = 22050, hop_length = 512, frame_length = 2048 } = opts;
  const isAudio =
    (typeof Float32Array !== 'undefined' && input instanceof Float32Array) ||
    (Array.isArray(input) && typeof input[0] === 'number');
  const stft = isAudio ? computeSTFT(input, frame_length, hop_length) : input;
  return computeSpectralFlux(stft);
}

/**
 * Peak picking on an onset strength envelope.
 * Finds local maxima above a threshold with a minimum wait between peaks.
 * @param {Float32Array|Array<number>} onsetStrength - Onset strength values
 * @param {Object} [options] - Peak picking options
 * @param {number} [options.delta=0.07] - Threshold offset added to mean onset strength
 * @param {number} [options.wait=20] - Minimum frames to wait after a peak is picked
 * @returns {Array<number>} Indices of detected peaks in the onset strength array
 */
export function pickPeaks(onsetStrength, { delta = 0.07, wait = 20 } = {}) {
  const peaks = [];
  let lastPeak = -Infinity;
  // Adaptive threshold: mean onset strength plus delta
  const meanStrength = onsetStrength.reduce((sum, val) => sum + val, 0) / onsetStrength.length;
  const threshold = meanStrength + delta;
  for (let i = 1; i < onsetStrength.length - 1; i++) {
    if (
      onsetStrength[i] > threshold &&
      onsetStrength[i] > onsetStrength[i - 1] &&
      onsetStrength[i] > onsetStrength[i + 1] &&
      i > lastPeak + wait
    ) {
      peaks.push(i);
      lastPeak = i;
    }
  }
  return peaks;
}
