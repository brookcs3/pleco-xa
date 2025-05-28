/**
 * LoopRefiner.js
 *
 * Module for refining detected loops and segmenting audio by musical phrases.
 * Exports functions to snap loop points to zero-crossings, lock loops to bar boundaries, and split audio into phrase segments.
 */

/**
 * Adjust loop start and end to the nearest zero-crossing points for click-free playback.
 * @param {AudioBuffer} audioBuffer - The source audio buffer.
 * @param {number} startTime - Initial loop start time in seconds.
 * @param {number} endTime - Initial loop end time in seconds.
 * @param {number} [maxShift=0.01] - Maximum adjustment (in seconds) for snapping (default 10ms).
 * @returns {{ start: number, end: number }} New loop start and end times in seconds, aligned to zero-crossings.
 */
export function snapToZeroCrossing(audioBuffer, startTime, endTime, maxShift = 0.01) {
  const audioData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const searchWindow = Math.floor(maxShift * sampleRate)  // window in samples
  // Find nearest zero-crossing around start and end sample positions
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = Math.floor(endTime * sampleRate)
  const bestStartSample = findNearestZeroCrossing(audioData, startSample, searchWindow)
  const bestEndSample = findNearestZeroCrossing(audioData, endSample, searchWindow)
  // Convert samples back to seconds
  return {
    start: bestStartSample / sampleRate,
    end: bestEndSample / sampleRate
  }
}

/**
 * Lock a loop's timing to exact bar boundaries based on tempo.
 * Ensures the loop covers whole bars (4-beat measures) and aligns with the beat grid.
 * @param {AudioBuffer} audioBuffer - The source audio (used to ensure bounds are valid).
 * @param {number} loopStart - Loop start time in seconds.
 * @param {number} loopEnd - Loop end time in seconds.
 * @param {number} bpm - The tempo in beats per minute.
 * @param {number} [downbeatOffset=0] - Optional offset (seconds) of the first downbeat in the track (default assumes track starts on downbeat).
 * @returns {{ start: number, end: number, bars: number }} Adjusted loop start/end and the number of bars spanned.
 */
export function lockLoopToBars(audioBuffer, loopStart, loopEnd, bpm, downbeatOffset = 0) {
  const duration = audioBuffer.duration
  const barDuration = (60 / bpm) * 4
  // Align start to the nearest earlier bar line (floor)
  const startOffset = loopStart - downbeatOffset
  const barIndexStart = Math.floor(startOffset / barDuration)
  const lockedStart = downbeatOffset + barIndexStart * barDuration
  // Align end to the nearest later bar line (ceil)
  const endOffset = loopEnd - downbeatOffset
  const barIndexEnd = Math.ceil(endOffset / barDuration)
  let lockedEnd = downbeatOffset + barIndexEnd * barDuration
  if (lockedEnd > duration) {
    lockedEnd = duration  // do not extend beyond track end
  }
  // Calculate number of full bars in the locked loop
  const barsCount = (lockedEnd - lockedStart) / barDuration
  return {
    start: Math.max(0, lockedStart),
    end: Math.min(duration, lockedEnd),
    bars: barsCount
  }
}

/**
 * Segment the audio into consecutive phrases of a given number of bars.
 * For example, with barsPerSegment=4, returns segments roughly corresponding to 4-bar phrases.
 * @param {AudioBuffer} audioBuffer - The audio to segment.
 * @param {number} bpm - Tempo in beats per minute.
 * @param {number} [downbeatOffset=0] - Offset of the first downbeat in seconds (default 0).
 * @param {number} [barsPerSegment=4] - Number of bars per segment (phrase length).
 * @returns {Array<{ start: number, end: number }>} Array of segment start/end times (in seconds).
 */
export function segmentByBars(audioBuffer, bpm, downbeatOffset = 0, barsPerSegment = 4) {
  const segments = []
  const trackDuration = audioBuffer.duration
  const barDuration = (60 / bpm) * 4
  const segmentDuration = barDuration * barsPerSegment
  // Starting from the first downbeat, create segments of the given length
  for (let t = downbeatOffset; t < trackDuration - 0.001; t += segmentDuration) {
    const segStart = t
    let segEnd = t + segmentDuration
    if (segEnd > trackDuration) {
      segEnd = trackDuration  // last segment ends at track end
    }
    segments.push({ start: segStart, end: segEnd })
  }
  return segments
}

/** 
 * Find the nearest zero-crossing index to a given sample position within a search window.
 * @param {Float32Array} audioData - The audio data array.
 * @param {number} centerSample - Target sample index around which to search.
 * @param {number} window - Half-width of search window in samples.
 * @returns {number} Index of the audio sample closest to a zero crossing.
 * @private
 */
function findNearestZeroCrossing(audioData, centerSample, window) {
  const len = audioData.length
  let bestIndex = centerSample
  let bestDistance = Math.abs(audioData[centerSample] || 0)
  const start = Math.max(1, centerSample - window)
  const end = Math.min(len - 2, centerSample + window)
  for (let i = start; i <= end; i++) {
    // Check if there's a sign change between audioData[i] and audioData[i+1]
    if ((audioData[i] >= 0 && audioData[i + 1] < 0) || (audioData[i] < 0 && audioData[i + 1] >= 0)) {
      // The crossing point will be near where the sign changes; take the sample closer to zero
      const dist = Math.min(Math.abs(audioData[i]), Math.abs(audioData[i + 1]))
      if (dist < bestDistance) {
        bestDistance = dist
        bestIndex = Math.abs(audioData[i]) < Math.abs(audioData[i + 1]) ? i : i + 1
      }
    }
  }
  return bestIndex
}
