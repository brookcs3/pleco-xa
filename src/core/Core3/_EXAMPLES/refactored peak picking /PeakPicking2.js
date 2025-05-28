// After getting onsetFrames (peak indices), refine onset times to waveform peaks
const onsetFrames = pickPeaks(onsetStrength, { delta, wait, window: 16 })
const onsetTimes = onsetFrames.map(frameIndex => {
  // Search in the raw audio data around this frame for max amplitude
  const frameStart = frameIndex * hopLength
  const frameEnd = Math.min(audioData.length, frameStart + frameLength)
  let peakSample = frameStart
  let peakValue = 0
  for (let s = frameStart; s < frameEnd; s++) {
    const val = Math.abs(audioData[s])
    if (val > peakValue) {
      peakValue = val
      peakSample = s
    }
  }
  return peakSample / sampleRate
})
