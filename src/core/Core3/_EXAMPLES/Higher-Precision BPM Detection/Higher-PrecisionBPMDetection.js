export function estimateTempo(onsetStrength, sampleRate, hopLength = 512, { minBPM = 60, maxBPM = 180 } = {}) {
  const minLag = Math.floor((60 * sampleRate) / (maxBPM * hopLength))
  const maxLag = Math.ceil((60 * sampleRate) / (minBPM * hopLength))
  const autocorr = new Float32Array(maxLag + 1)  // include lag 0 for normalization
  // Compute autocorrelation for lags in range [0, maxLag]
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0
    let count = 0
    for (let t = 0; t < onsetStrength.length - lag; t++) {
      const v = onsetStrength[t] * onsetStrength[t + lag]
      sum += v
      count++
    }
    autocorr[lag] = count > 0 ? sum / count : 0
  }
  // Find the strongest peak in the valid BPM range
  let bestLag = 0
  let bestValue = 0
  let secondBest = 0
  const minLagIndex = Math.max(1, minLag)
  for (let lag = minLagIndex; lag <= maxLag; lag++) {
    const value = autocorr[lag]
    // Peak detection: value greater than neighbors
    if (value > bestValue && value > autocorr[lag-1] && value > autocorr[lag+1]) {
      secondBest = bestValue
      bestValue = value
      bestLag = lag
    } else if (value > secondBest && value !== bestValue) {
      // Track second best for confidence
      secondBest = value
    }
  }
  // Compute BPM from best lag
  let bpm = (60 * sampleRate) / (bestLag * hopLength)
  // Refine BPM to one decimal place
  bpm = Math.round(bpm * 10) / 10

  // Confidence: compare strength of best vs second-best autocorr peaks
  let confidence = 0
  if (bestValue > 1e-6) {
    confidence = Math.max(0, Math.min(1, (bestValue - secondBest) / bestValue))
  }
  return { bpm, confidence, autocorr }
}
