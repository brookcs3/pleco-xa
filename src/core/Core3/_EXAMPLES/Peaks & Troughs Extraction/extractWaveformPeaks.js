export function extractWaveformPeaks(y, { numPeaks = 1000 } = {}) {
  if (!y || y.length === 0) throw new Error('Audio data is empty')
  const samplesPerPeak = Math.floor(y.length / numPeaks)
  if (samplesPerPeak < 1) {
    // If audio is shorter than numPeaks, just return raw samples as peaks
    return Array.from(y)
  }
  const peaks = new Float32Array(numPeaks * 2)  // [min,max] for each segment
  for (let i = 0; i < numPeaks; i++) {
    const start = i * samplesPerPeak
    let min =  1.0
    let max = -1.0
    // Compute min and max in this segment
    for (let j = 0; j < samplesPerPeak && (start + j) < y.length; j++) {
      const sample = y[start + j]
      if (sample < min) min = sample
      if (sample > max) max = sample
    }
    peaks[i * 2]     = min
    peaks[i * 2 + 1] = max
  }
  return peaks
}
