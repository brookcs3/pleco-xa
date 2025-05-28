/**
 * Web Audio I/O module for loading audio and basic analysis.
 * Supports loading from URLs, File objects, or ArrayBuffers, mono conversion, resampling, and playback.
 */
let globalAudioContext = null;
let currentAudioBuffer = null;
let currentSourceNode = null;
let pausedAt = null;
let lastPlayTime = 0;
let lastLoop = false;

/** Decode an ArrayBuffer to an AudioBuffer using Web Audio API. */
async function decodeBuffer(arrayBuffer) {
  const tmpCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await tmpCtx.decodeAudioData(arrayBuffer);
  await tmpCtx.close();
  return audioBuffer;
}

/**
 * Load audio data from a URL, File, or ArrayBuffer.
 * @param {string|File|ArrayBuffer} source - Audio source (URL string, File object, or ArrayBuffer)
 * @param {Object} [options] - Load options
 * @param {number} [options.sr=22050] - Target sample rate (use null to keep native sample rate)
 * @param {boolean} [options.mono=true] - Whether to convert to mono
 * @param {number} [options.offset=0] - Start offset in seconds
 * @param {number|null} [options.duration=null] - Duration to load in seconds (null for full audio)
 * @returns {Promise<{y: Float32Array, sr: number}>} - Loaded audio data and sample rate
 */
export async function load(source, { sr = 22050, mono = true, offset = 0, duration = null } = {}) {
  let audioBuffer;
  if (typeof source === 'string') {
    // Fetch from URL
    const response = await fetch(source);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await decodeBuffer(arrayBuffer);
  } else if (source instanceof File || source instanceof Blob) {
    const arrayBuffer = await source.arrayBuffer();
    audioBuffer = await decodeBuffer(arrayBuffer);
  } else if (source instanceof ArrayBuffer) {
    audioBuffer = await decodeBuffer(source);
  } else {
    throw new Error('Unsupported audio source type');
  }
  const nativeSr = audioBuffer.sampleRate;
  const startSample = Math.floor(offset * nativeSr);
  const endSample = duration == null ? audioBuffer.length : Math.min(audioBuffer.length, startSample + Math.floor(duration * nativeSr));
  const sliceLength = endSample - startSample;
  // Extract channel data for specified segment
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, ch) =>
    audioBuffer.getChannelData(ch).slice(startSample, endSample)
  );
  // Mix down to mono if requested
  let y = mono ? toMono(channels) : Float32Array.from(channels.flat());
  // Resample if requested sample rate differs
  const targetSr = sr == null ? nativeSr : sr;
  if (targetSr !== nativeSr) {
    y = resample(y, { origSr: nativeSr, targetSr });
  }
  currentAudioBuffer = { y, sr: targetSr };
  return currentAudioBuffer;
}

/**
 * Play the currently loaded audio buffer using Web Audio API.
 * @param {Object} [options] - Playback options
 * @param {boolean} [options.loop=false] - Whether to loop playback
 */
export function play({ loop = false } = {}) {
  if (!currentAudioBuffer) {
    throw new Error('No audio loaded. Call load() first.');
  }
  // Stop any existing playback
  stop();
  // Initialize AudioContext if not already
  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  const { y, sr } = currentAudioBuffer;
  // Create AudioBuffer from Float32Array
  const audioBuffer = globalAudioContext.createBuffer(1, y.length, sr);
  audioBuffer.copyToChannel(y, 0);
  // Create source node for playback
  const source = globalAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(globalAudioContext.destination);
  source.loop = loop;
  // Determine start offset (if resuming from pause)
  const offset = pausedAt || 0;
  source.start(0, offset);
  lastPlayTime = globalAudioContext.currentTime;
  lastLoop = loop;
  currentSourceNode = source;
  pausedAt = null;
}

/** Pause playback, retaining position for resume. */
export function pause() {
  if (currentSourceNode && globalAudioContext) {
    try {
      // Calculate elapsed time since playback started
      const elapsed = globalAudioContext.currentTime - lastPlayTime;
      const { sr, y } = currentAudioBuffer;
      const trackDuration = y.length / sr;
      // Compute current playback position in seconds (handle looping)
      const currentPos = (pausedAt || 0) + elapsed;
      pausedAt = lastLoop ? (currentPos % trackDuration) : Math.min(currentPos, trackDuration);
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch (e) {
      // ignore errors if already stopped
    }
    currentSourceNode = null;
  }
}

/** Stop playback and reset position. */
export function stop() {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch (e) {
      // ignore if already stopped
    }
    currentSourceNode = null;
    pausedAt = null;
  }
}

/**
 * Convert multiple channel audio data to mono by averaging channels.
 * @param {Array<Float32Array>} channelArrays - Array of channel data arrays
 * @returns {Float32Array} Mono audio data
 */
export function toMono(channelArrays) {
  if (channelArrays.length === 1) return channelArrays[0];
  const len = channelArrays[0].length;
  const output = new Float32Array(len);
  const mInv = 1 / channelArrays.length;
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let ch = 0; ch < channelArrays.length; ch++) {
      sum += channelArrays[ch][i];
    }
    output[i] = sum * mInv;
  }
  return output;
}

/**
 * Resample a signal to a target sample rate using linear interpolation.
 * @param {Float32Array} y - Input signal at original sample rate
 * @param {Object} opts - Resample options
 * @param {number} opts.origSr - Original sample rate of y
 * @param {number} opts.targetSr - Target sample rate
 * @returns {Float32Array} Resampled signal
 */
export function resample(y, { origSr, targetSr }) {
  if (!y || origSr === targetSr) return y;
  const ratio = targetSr / origSr;
  const nOut = Math.ceil(y.length * ratio);
  const output = new Float32Array(nOut);
  for (let i = 0; i < nOut; i++) {
    const t = i / ratio;
    const k = Math.floor(t);
    const frac = t - k;
    const v0 = y[k];
    const v1 = y[Math.min(k + 1, y.length - 1)];
    output[i] = v0 + frac * (v1 - v0);
  }
  return output;
}

/** Get duration of an audio signal in seconds. */
export const getDuration = (y, sr) => y.length / sr;

/** Get sample rate of a Web Audio AudioBuffer. */
export const getSampleRate = (audioBuffer) => audioBuffer.sampleRate;

/**
 * Count zero-crossings of a waveform.
 * @param {Float32Array} y - Audio signal
 * @param {Object} [options] - Options
 * @param {number} [options.threshold=1e-10] - Amplitude threshold to consider as zero
 * @param {boolean} [options.pad=true] - Whether to count a leading edge at start
 * @param {boolean} [options.zeroPos=true] - If true, treat zero as positive
 * @returns {Uint8Array} Array with 1 at indices where a zero-crossing occurs, else 0
 */
export function zeroCrossings(y, { threshold = 1e-10, pad = true, zeroPos = true } = {}) {
  const N = y.length;
  const crossings = new Uint8Array(N);
  let prev = y[0];
  if (pad) crossings[0] = 1;
  for (let i = 1; i < N; i++) {
    let x0 = prev;
    let x1 = y[i];
    if (Math.abs(x0) <= threshold) x0 = 0;
    if (Math.abs(x1) <= threshold) x1 = 0;
    const s0 = zeroPos ? x0 >= 0 : Math.sign(x0);
    const s1 = zeroPos ? x1 >= 0 : Math.sign(x1);
    crossings[i] = s0 !== s1 ? 1 : 0;
    prev = x1;
  }
  return crossings;
}

/**
 * Autocorrelate a signal (naive implementation).
 * @param {Float32Array} y - Input signal
 * @param {number} [maxLag=y.length] - Maximum lag to compute
 * @returns {Float32Array} Autocorrelation values for lags 0...maxLag-1
 */
export function autocorrelate(y, maxLag = y.length) {
  const N = y.length;
  const M = Math.min(maxLag, N);
  const result = new Float32Array(M);
  for (let lag = 0; lag < M; lag++) {
    let sum = 0;
    for (let i = lag; i < N; i++) {
      sum += y[i] * y[i - lag];
    }
    result[lag] = sum;
  }
  return result;
}

/**
 * Extract waveform peak and trough values in segments of the signal.
 * Useful for visualizing waveform envelope.
 * @param {Float32Array} y - Audio signal
 * @param {Object} [options] - Options
 * @param {number} [options.samplesPerPeak=1024] - Number of samples per segment (window size)
 * @returns {Object} Object with arrays of peak (max) and trough (min) values for each segment
 */
export function extractWaveformPeaks(y, { samplesPerPeak = 1024 } = {}) {
  const N = y.length;
  const segmentCount = Math.ceil(N / samplesPerPeak);
  const peaks = new Float32Array(segmentCount);
  const troughs = new Float32Array(segmentCount);
  for (let seg = 0; seg < segmentCount; seg++) {
    const start = seg * samplesPerPeak;
    const end = Math.min(N, start + samplesPerPeak);
    let maxVal = -Infinity;
    let minVal = Infinity;
    for (let i = start; i < end; i++) {
      const sample = y[i];
      if (sample > maxVal) maxVal = sample;
      if (sample < minVal) minVal = sample;
    }
    peaks[seg] = maxVal;
    troughs[seg] = minVal;
  }
  return { peaks, troughs };
}
