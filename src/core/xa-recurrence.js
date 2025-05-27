/**
 * JavaScript recurrence matrix and loop structure analysis
 * For finding loop structures in audio
 */

/**
 * Compute chroma features from audio buffer
 */
export function computeChroma(audioBuffer, hopLength = 512) {
  const audioData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const frameLength = 2048;
  if (!audioData || audioData.length < frameLength + 1) {
    // Not enough data for even one frame
    return [];
  }
  const numFrames = Math.floor((audioData.length - frameLength) / hopLength);
  if (numFrames <= 0) {
    return [];
  }
  // 12 chroma bins (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
  const chroma = Array(12).fill(0).map(() => new Float32Array(numFrames));
  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopLength;
    const frameData = audioData.slice(start, start + frameLength);
    // Simple FFT to get frequency bins
    const fft = computeFFT(frameData);
    const magnitudes = new Float32Array(fft.length / 2);
    for (let i = 0; i < magnitudes.length; i++) {
      const real = fft[i * 2];
      const imag = fft[i * 2 + 1];
      magnitudes[i] = Math.sqrt(real * real + imag * imag);
    }
    // Map frequency bins to chroma bins
    for (let bin = 1; bin < magnitudes.length; bin++) {
      const freq = (bin * sampleRate) / frameLength;
      const chromaBin = frequencyToChroma(freq);
      if (chromaBin >= 0 && chromaBin < 12) {
        chroma[chromaBin][frame] += magnitudes[bin];
      }
    }
  }
  return chroma;
}

/**
 * Convert frequency to chroma bin (0-11)
 */
function frequencyToChroma(freq) {
  if (freq <= 0) return -1;
  
  // Convert to MIDI note number
  const midiNote = 12 * Math.log2(freq / 440) + 69;
  
  // Map to chroma (mod 12)
  return Math.floor(midiNote) % 12;
}

/**
 * Time-delay embedding to stack chroma features
 */
export function stackMemory(chroma, nSteps = 10, delay = 3) {
  if (!Array.isArray(chroma) || chroma.length === 0 || !Array.isArray(chroma[0]) || chroma[0].length === 0) {
    return [];
  }
  const numChroma = chroma.length;
  const numFrames = chroma[0].length;
  // Ensure all chroma rows have the same length
  if (!chroma.every(row => row.length === numFrames)) {
    throw new Error('All chroma rows must have the same length');
  }
  const stackedSize = numChroma * nSteps;
  const validFrames = numFrames - (nSteps - 1) * delay;
  if (validFrames <= 0) {
    return [];
  }
  const stacked = Array(stackedSize).fill(0).map(() => new Float32Array(validFrames));
  for (let frame = 0; frame < validFrames; frame++) {
    for (let step = 0; step < nSteps; step++) {
      const sourceFrame = frame + step * delay;
      for (let chroma_bin = 0; chroma_bin < numChroma; chroma_bin++) {
        const stackIndex = step * numChroma + chroma_bin;
        stacked[stackIndex][frame] = chroma[chroma_bin][sourceFrame];
      }
    }
  }
  return stacked;
}

/**
 * Generate similarity matrix (helper for recurrence_matrix)
 */
function gen_sim_matrix(data, k = null, metric = "euclidean", sparse = false, mode = "connectivity", bandwidth = null, hop_length = 1, win_length = null, axis = -1) {
  const [numFeatures, numFrames] = [data.length, data[0].length];
  const matrix = Array(numFrames).fill(0).map(() => new Float32Array(numFrames));
  
  for (let i = 0; i < numFrames; i++) {
    for (let j = 0; j < numFrames; j++) {
      // Compute cosine similarity (since euclidean is more complex)
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;
      
      for (let f = 0; f < numFeatures; f++) {
        const val1 = data[f][i];
        const val2 = data[f][j];
        dotProduct += val1 * val2;
        norm1 += val1 * val1;
        norm2 += val2 * val2;
      }
      
      const similarity = dotProduct / (Math.sqrt(norm1 * norm2) + 1e-8);
      
      if (mode === 'connectivity') {
        matrix[i][j] = similarity > 0.5 ? 1 : 0;
      } else if (mode === 'affinity') {
        matrix[i][j] = Math.max(0, similarity);
      } else if (mode === 'distance') {
        matrix[i][j] = 1 - similarity;
      }
    }
  }
  
  return matrix;
}

/**
 * Proper recurrence matrix (xa-style)
 */
export function recurrenceMatrix(data, k = null, width = 1, metric = "euclidean", sym = false, axis = -1, sparse = false, mode = "connectivity", bandwidth = null, hop_length = 1, win_length = null) {
  let S = gen_sim_matrix(data, k, metric, sparse, mode, bandwidth, hop_length, win_length, axis);
  
  if (sym && !sparse) {
    // S = S + S.T, then divide diagonal by 2
    const numFrames = S.length;
    for (let i = 0; i < numFrames; i++) {
      for (let j = 0; j < numFrames; j++) {
        S[i][j] = S[i][j] + S[j][i];
      }
      S[i][i] = S[i][i] / 2;
    }
  }
  
  if (!sparse) {
    // Add small constant to avoid zeros
    const minVal = Math.min(...S.flat());
    const numFrames = S.length;
    for (let i = 0; i < numFrames; i++) {
      for (let j = 0; j < numFrames; j++) {
        S[i][j] = S[i][j] * 0.5 + minVal * 0.5;
      }
      S[i][i] = 1; // Set diagonal to 1
    }
  }
  
  if (width > 1) {
    // Apply width filtering (simplified)
    const filtered = Array(S.length).fill(0).map(() => new Float32Array(S[0].length));
    for (let i = 0; i < S.length; i++) {
      for (let j = 0; j < S[0].length; j++) {
        if (Math.abs(i - j) <= width) {
          filtered[i][j] = 0;
        } else {
          filtered[i][j] = S[i][j];
        }
      }
    }
    S = filtered;
  }
  
  return S;
}

/**
 * Convert recurrence matrix to lag representation (xa-style)
 */
export function recurrenceToLag(recurrence, pad = true, axis = -1) {
  if (axis !== 0 && axis !== 1 && axis !== -1) {
    throw new Error('Invalid target axis: ' + axis);
  }
  if (!Array.isArray(recurrence) || recurrence.length === 0 || !Array.isArray(recurrence[0]) || recurrence[0].length === 0) {
    return [];
  }
  // Check for square matrix
  const originalSize = recurrence.length;
  if (!recurrence.every(row => Array.isArray(row) && row.length === originalSize)) {
    throw new Error('Recurrence matrix must be square');
  }
  let R = recurrence;
  if (pad) {
    // Pad the matrix
    const newSize = originalSize * 2;
    const padded = Array(newSize).fill(0).map(() => new Float32Array(newSize));
    // Copy original matrix to padded
    for (let i = 0; i < originalSize; i++) {
      for (let j = 0; j < originalSize; j++) {
        padded[i][j] = R[i][j];
      }
    }
    R = padded;
  }
  const numFrames = R.length;
  const lagMatrix = Array(numFrames).fill(0).map(() => new Float32Array(numFrames));
  // Convert to lag representation
  for (let i = 0; i < numFrames; i++) {
    for (let j = 0; j < numFrames; j++) {
      const lag = Math.abs(i - j);
      if (lag < numFrames) {
        lagMatrix[lag][Math.min(i, j)] += R[i][j];
      }
    }
  }
  return lagMatrix;
}

/**
 * Convert frames to time (xa-style)
 */
export function framesToTime(frames, hopLength = 512, sr = 22050) {
  if (Array.isArray(frames)) {
    return frames.map(frame => frame * hopLength / sr);
  } else {
    return frames * hopLength / sr;
  }
}

/**
 * Find peaks in lag matrix to identify loop points
 */
export function findLoopCandidates(lagMatrix, frameTime = 512 / 44100) {
  const lagSums = lagMatrix.map(row => 
    row.reduce((sum, val) => sum + val, 0)
  );
  
  // Find peaks (local maxima)
  const peaks = [];
  const threshold = Math.max(...lagSums) * 0.1;
  
  for (let i = 2; i < lagSums.length - 2; i++) {
    if (lagSums[i] > threshold &&
        lagSums[i] > lagSums[i-1] && 
        lagSums[i] > lagSums[i+1] &&
        lagSums[i] > lagSums[i-2] && 
        lagSums[i] > lagSums[i+2]) {
      peaks.push({
        lagFrames: i,
        lagSeconds: i * frameTime,
        confidence: lagSums[i]
      });
    }
  }
  
  // Sort by confidence
  peaks.sort((a, b) => b.confidence - a.confidence);
  
  return peaks.slice(0, 10); // Return top 10 candidates
}

/**
 * Simple FFT implementation
 */
function computeFFT(signal) {
  const N = signal.length;
  if (N <= 1) return signal;
  
  // Pad to power of 2
  const nextPow2 = Math.pow(2, Math.ceil(Math.log2(N)));
  const padded = new Float32Array(nextPow2 * 2); // Complex: [real, imag, real, imag, ...]
  
  for (let i = 0; i < N; i++) {
    padded[i * 2] = signal[i];
    padded[i * 2 + 1] = 0;
  }
  
  return fftRecursive(padded);
}

function fftRecursive(signal) {
  const N = signal.length / 2;
  if (N <= 1) return signal;
  
  // Divide
  const even = new Float32Array(N);
  const odd = new Float32Array(N);
  
  for (let i = 0; i < N / 2; i++) {
    even[i * 2] = signal[i * 4];
    even[i * 2 + 1] = signal[i * 4 + 1];
    odd[i * 2] = signal[i * 4 + 2];
    odd[i * 2 + 1] = signal[i * 4 + 3];
  }
  
  // Conquer
  const evenFFT = fftRecursive(even);
  const oddFFT = fftRecursive(odd);
  
  // Combine
  const result = new Float32Array(N * 2);
  
  for (let i = 0; i < N / 2; i++) {
    const angle = -2 * Math.PI * i / N;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const oddReal = oddFFT[i * 2] * cos - oddFFT[i * 2 + 1] * sin;
    const oddImag = oddFFT[i * 2] * sin + oddFFT[i * 2 + 1] * cos;
    
    result[i * 2] = evenFFT[i * 2] + oddReal;
    result[i * 2 + 1] = evenFFT[i * 2 + 1] + oddImag;
    result[(i + N / 2) * 2] = evenFFT[i * 2] - oddReal;
    result[(i + N / 2) * 2 + 1] = evenFFT[i * 2 + 1] - oddImag;
  }
  
  return result;
}

/**
 * Main loop detection using recurrence matrix
 */
export async function recurrenceLoopDetection(audioBuffer) {
  console.time('recurrence_loop_detection');
  
  const hopLength = 512;
  const frameTime = hopLength / audioBuffer.sampleRate;
  
  console.log('Computing chroma features...');
  const chroma = computeChroma(audioBuffer, hopLength);
  
  console.log('Time-delay embedding...');
  const chromaStack = stackMemory(chroma, 10, 3);
  
  console.log('Computing recurrence matrix...');
  const recMatrix = recurrenceMatrix(chromaStack, 3, 'affinity');
  
  console.log('Converting to lag representation...');
  const lagMatrix = recurrenceToLag(recMatrix);
  
  console.log('Finding loop candidates...');
  const candidates = findLoopCandidates(lagMatrix, frameTime);
  
  console.timeEnd('recurrence_loop_detection');
  
  if (candidates.length === 0) {
    throw new Error('No loop candidates found');
  }
  
  const bestCandidate = candidates[0];
  console.log(`Best loop candidate: ${bestCandidate.lagSeconds.toFixed(3)}s (confidence: ${bestCandidate.confidence.toFixed(2)})`);
  
  const estimatedBPM = 60 / (bestCandidate.lagSeconds / 4); // Estimate BPM assuming 4-beat loop
  const beatDuration = 60 / estimatedBPM;
  
  return {
    loopStart: 0,
    loopEnd: bestCandidate.lagSeconds,
    confidence: Math.min(100, bestCandidate.confidence / 10),
    bpm: estimatedBPM,
    musicalDivision: bestCandidate.lagSeconds / (beatDuration * 4), // Loop length in bars
    allCandidates: candidates
  };
}