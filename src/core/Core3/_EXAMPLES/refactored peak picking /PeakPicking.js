export function pickPeaks(onsetStrength, { delta = 0.07, wait = 20, window = null } = {}) {
  const peaks = []
  let lastPeakIndex = -Infinity

  // Determine global or moving threshold
  let thresholdArr = null
  if (window && window > 1) {
    // Compute moving average threshold over a window of frames
    const halfWin = Math.floor(window / 2)
    thresholdArr = onsetStrength.map((_, i) => {
      const start = Math.max(0, i - halfWin)
      const end = Math.min(onsetStrength.length, i + halfWin)
      const localMean = onsetStrength.slice(start, end).reduce((a, b) => a + b, 0) / (end - start)
      return localMean + delta
    })
  }
  const globalThreshold = onsetStrength.reduce((a, b) => a + b, 0) / onsetStrength.length + delta

  for (let i = 1; i < onsetStrength.length - 1; i++) {
    const thresh = thresholdArr ? thresholdArr[i] : globalThreshold
    if (
      onsetStrength[i] > thresh &&
      onsetStrength[i] > onsetStrength[i - 1] &&
      onsetStrength[i] > onsetStrength[i + 1] &&
      i - lastPeakIndex > wait
    ) {
      // Look ahead within 'wait' frames to ensure no stronger peak soon
      let aheadMax = onsetStrength[i]
      for (let j = 1; j < wait && i + j < onsetStrength.length; j++) {
        if (onsetStrength[i + j] > aheadMax * 1.1) {  // found significantly stronger upcoming peak
          aheadMax = onsetStrength[i + j]
        }
      }
      if (aheadMax > onsetStrength[i]) {
        continue; // skip this peak, a bigger one is coming within wait window
      }
      peaks.push(i)
      lastPeakIndex = i
    }
  }
  return peaks
}
