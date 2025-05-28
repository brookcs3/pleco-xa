/**
 * MusicalLoopDetector.js
 * 
 * Module for detecting seamless musical loops with beat and phrase awareness.
 * Exports functions to analyze an AudioBuffer and find loop points that align with the music's tempo and phrasing.
 */

/**
 * Analyzes the audio for the best loop segment with beat and phrase alignment.
 * @param {AudioBuffer} audioBuffer - Web Audio API AudioBuffer to analyze.
 * @param {Object} [options={}] - Configuration options.
 * @param {number} [options.minDuration=0.5] - Minimum loop length in seconds.
 * @param {number} [options.maxDuration=8.0] - Maximum loop length in seconds.
 * @param {number} [options.confidenceThreshold=0.5] - Minimum confidence (0-1) to accept a loop.
 * @returns {Promise<Object>} Promise resolving to an object with the best loop info.
 *    e.g. `{ start: <seconds>, end: <seconds>, duration: <seconds>, bars: <number>, confidence: <0-1>, bpm: <number> }`
 */
export async function analyzeLoop(audioBuffer, options = {}) {
  const opts = {
    minDuration: 0.5,
    maxDuration: 8.0,
    confidenceThreshold: 0.5,
    ...options
  }
  const audioData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration

  // Step 1: Onset detection to find significant audio event times
  const onsets = getOnsetTimes(audioData, sampleRate)

  // If not enough onsets detected, return a default loop (e.g., start at 0 of minDuration)
  if (onsets.length < 2) {
    const defaultEnd = Math.min(duration, opts.maxDuration)
    return {
      start: 0,
      end: defaultEnd,
      duration: defaultEnd,
      bars: 0,
      confidence: 0,
      bpm: 0
    }
  }

  // Step 2: Estimate tempo (BPM) from onset timings
  const bpm = estimateTempo(onsets)
  const beatDuration = 60 / bpm
  const barDuration = beatDuration * 4

  // Step 3: Try precise loop detection for an exact repeating segment
  const preciseLoop = findPreciseLoop(audioData, sampleRate, bpm, {
    minDuration: opts.minDuration,
    maxDuration: opts.maxDuration,
    searchStart: 1.0,      // skip very beginning (likely intro)
    searchEndFraction: 0.8 // search through first 80% of track
  })

  if (preciseLoop && preciseLoop.score >= opts.confidenceThreshold) {
    // If a high-confidence repeating loop is found, return it
    const loopBars = preciseLoop.duration / barDuration
    return {
      start: preciseLoop.start,
      end: preciseLoop.end,
      duration: preciseLoop.duration,
      bars: loopBars,
      confidence: preciseLoop.score,    // correlation-based score (0-1)
      bpm: bpm
    }
  }

  // Step 4: Beat-aligned loop candidate analysis (if precise loop not found or low confidence)
  const beatResult = {
    tempo: bpm,
    beats: [], 
  }
  // Generate a basic beat timeline based on estimated tempo (starting at 0s)
  for (let t = 0; t < duration; t += beatDuration) {
    beatResult.beats.push(t)
  }

  // Identify downbeat (bar start) times for phrase alignment
  const downbeats = findDownbeats(audioData, beatResult, sampleRate)

  // Define main section to avoid intros/outros with low energy
  const mainSection = findMainSection(audioData, sampleRate)

  // Generate loop candidates (musical loops of various bar lengths)
  const candidates = findLoopCandidates(audioData, beatResult, onsets, sampleRate, mainSection, downbeats)

  if (candidates.length === 0) {
    // Fallback: if no candidates found, return a default 4-beat loop from start
    const loopEnd = Math.min(duration, barDuration)
    return {
      start: 0,
      end: loopEnd,
      duration: loopEnd,
      bars: loopEnd / barDuration,
      confidence: 0,
      bpm: bpm
    }
  }

  // Sort candidates by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence)
  const best = candidates[0]

  return {
    start: best.start,
    end: best.end,
    duration: best.end - best.start,
    bars: best.musicalDivision,    // number of bars (e.g., 2 = 2 bars)
    confidence: best.confidence,
    bpm: bpm
  }
}

/**
 * Finds multiple loop candidates and their confidence scores. Useful for inspection or alternative loops.
 * @param {AudioBuffer} audioBuffer - The audio to analyze.
 * @param {Object} [options={}] - Optional parameters (minDuration, maxDuration, etc. as in analyzeLoop).
 * @returns {Array<Object>} Array of loop candidate objects `{ start, end, confidence, musicalDivision }`.
 */
export function findLoopCandidates(audioBuffer, options = {}) {
  const opts = {
    minDuration: 0.5,
    maxDuration: 8.0,
    ...options
  }
  const audioData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration

  const onsets = getOnsetTimes(audioData, sampleRate)
  const bpm = estimateTempo(onsets)
  const beatResult = { tempo: bpm, beats: [] }
  const beatDuration = 60 / bpm
  for (let t = 0; t < duration; t += beatDuration) {
    beatResult.beats.push(t)
  }
  const downbeats = findDownbeats(audioData, beatResult, sampleRate)
  const mainSection = findMainSection(audioData, sampleRate)
  return findLoopCandidatesInternal(audioData, beatResult, onsets, sampleRate, mainSection, downbeats)
}

// --- Internal Helper Functions ---

/**
 * Detect onset times (in seconds) using energy-based method.
 * Identifies points of significant increase in audio energy.
 * @param {Float32Array} audioData - Mono audio data.
 * @param {number} sampleRate - Sample rate of the audio.
 * @returns {number[]} Array of onset times in seconds.
 */
function getOnsetTimes(audioData, sampleRate) {
  const frameSize = 1024
  const hopLength = 512
  const onsets = []
  let prevEnergy = 0
  const numFrames = Math.floor((audioData.length - frameSize) / hopLength)
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopLength
    // Compute frame energy (root-mean-square)
    let energy = 0
    for (let j = start; j < start + frameSize && j < audioData.length; j++) {
      energy += audioData[j] * audioData[j]
    }
    energy = Math.sqrt(energy / frameSize)
    // Onset detection: if energy jumps significantly (and above a threshold)
    if (energy > prevEnergy * 1.5 && energy > 0.01) {
      const time = start / sampleRate
      onsets.push(time)
    }
    prevEnergy = energy
  }
  return onsets
}

/**
 * Estimate the tempo (BPM) from a list of onset times.
 * Uses median inter-onset interval to infer the predominant beat.
 * @param {number[]} onsets - Array of onset times (seconds).
 * @returns {number} Estimated tempo in beats per minute.
 */
function estimateTempo(onsets) {
  if (onsets.length < 2) return 120  // default BPM if not enough data
  const intervals = []
  for (let i = 1; i < onsets.length; i++) {
    const dt = onsets[i] - onsets[i - 1]
    // Filter out extreme gaps (ignore intervals longer than 2s or very tiny)
    if (dt > 0.05 && dt < 2.0) {
      intervals.push(dt)
    }
  }
  if (intervals.length === 0) return 120
  // Sort intervals and pick median as representative interval
  intervals.sort((a, b) => a - b)
  const medianInterval = intervals[Math.floor(intervals.length / 2)]
  let bpm = 60 / medianInterval
  // Adjust tempo into a reasonable range (60-180 BPM)
  while (bpm > 180) bpm /= 2
  while (bpm < 60) bpm *= 2
  return Math.round(bpm)
}

/**
 * Find downbeat times (start of bars) from detected beats.
 * This assumes a 4/4 time signature and identifies likely bar beginnings by energy.
 * @param {Float32Array} audioData - Audio samples.
 * @param {Object} beatResult - Object containing `beats` (array of beat times) and `tempo`.
 * @param {number} sampleRate - Sample rate of the audio.
 * @returns {number[]} Array of downbeat times (seconds).
 */
function findDownbeats(audioData, beatResult, sampleRate) {
  const beats = beatResult.beats
  if (beats.length === 0) return []
  // Calculate energy around each beat to identify strong beats
  const frameSize = 2048
  const beatStrengths = beats.map((beatTime, i) => {
    const beatSample = Math.floor(beatTime * sampleRate)
    const startSample = Math.max(0, beatSample - frameSize / 2)
    const endSample = Math.min(audioData.length, beatSample + frameSize / 2)
    let energy = 0
    for (let s = startSample; s < endSample; s++) {
      energy += audioData[s] * audioData[s]
    }
    return { time: beatTime, strength: energy / (endSample - startSample), index: i }
  })
  const downbeats = []
  // Simple method: assume downbeat every 4 beats initially
  for (let i = 0; i < beatStrengths.length; i += 4) {
    downbeats.push(beatStrengths[i].time)
  }
  // Refined method: find local maxima in strength over 4-beat windows
  const strongDownbeats = []
  for (let i = 0; i < beatStrengths.length - 3; i++) {
    const currentStrength = beatStrengths[i].strength
    let isPeak = true
    // Compare this beat's strength with the next 3 beats
    for (let j = 1; j <= 3; j++) {
      if (i + j < beatStrengths.length && beatStrengths[i + j].strength > currentStrength) {
        isPeak = false
        break
      }
    }
    if (isPeak) {
      strongDownbeats.push(beatStrengths[i].time)
      i += 3  // skip ahead by a bar to avoid overlapping
    }
  }
  // If we found enough strong downbeats, use them; otherwise use the simple every-4th-beat
  if (strongDownbeats.length >= 2) {
    return strongDownbeats
  }
  return downbeats
}

/**
 * Identify the main high-energy section of the track (skip intro/outro if quiet).
 * Uses a moving average of energy to find a continuous region of high energy.
 * @param {Float32Array} audioData - Audio samples.
 * @param {number} sampleRate - Sample rate of the audio.
 * @returns {{ start: number, end: number }} Start and end time (seconds) of the main content section.
 */
function findMainSection(audioData, sampleRate) {
  const frameSize = 1024
  const hopSize = 512
  const numFrames = Math.floor((audioData.length - frameSize) / hopSize)
  if (numFrames < 1) {
    return { start: 0, end: audioData.length / sampleRate }
  }
  // Calculate energy per frame
  const energies = []
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize
    const frame = audioData.slice(start, start + frameSize)
    const energy = frame.reduce((sum, s) => sum + s * s, 0) / frameSize
    energies.push(energy)
  }
  // Smooth the energy curve to identify broad trends
  const smoothed = smoothArray(energies, 10)
  const avgEnergy = smoothed.reduce((sum, e) => sum + e, 0) / smoothed.length
  const threshold = avgEnergy * 0.7
  // Find longest contiguous segment above threshold
  let bestStartFrame = 0
  let bestEndFrame = 0
  let currentStart = null
  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] >= threshold) {
      if (currentStart === null) {
        currentStart = i
      }
      // extend current high-energy segment
      if (i > bestEndFrame) {
        bestEndFrame = i
      }
    } else {
      if (currentStart !== null) {
        // segment ended
        currentStart = null
      }
    }
  }
  // Convert frames to time, adding a small padding on each side
  const paddingSec = 0.5
  const startTime = (bestStartFrame * hopSize) / sampleRate - paddingSec
  const endTime = ((bestEndFrame + 1) * hopSize) / sampleRate + paddingSec
  return {
    start: Math.max(0, startTime),
    end: Math.min(audioData.length / sampleRate, endTime)
  }
}

/**
 * Smooth an array of numbers using a moving average window.
 * @param {number[]} arr - Input array.
 * @param {number} windowSize - Size of the moving window.
 * @returns {number[]} Smoothed array of the same length.
 */
function smoothArray(arr, windowSize) {
  const smoothed = []
  const half = Math.floor(windowSize / 2)
  for (let i = 0; i < arr.length; i++) {
    let sum = 0
    let count = 0
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < arr.length) {
        sum += arr[j]
        count++
      }
    }
    smoothed[i] = sum / count
  }
  return smoothed
}

/**
 * Generate loop candidates of various lengths (in beats) and evaluate their quality.
 * @param {Float32Array} audioData - Audio samples.
 * @param {Object} beatResult - { tempo: number, beats: number[] }.
 * @param {number[]} onsets - Array of onset times (seconds).
 * @param {number} sampleRate - Sample rate of audio.
 * @param {{start: number, end: number}|null} mainSection - Main section time range to focus on (or null for entire track).
 * @param {number[]} downbeats - Array of downbeat times (seconds).
 * @returns {Array<Object>} Array of loop candidate objects.
 * @private
 */
function findLoopCandidatesInternal(audioData, beatResult, onsets, sampleRate, mainSection, downbeats) {
  const beats = beatResult.beats
  const tempo = beatResult.tempo
  const beatDuration = 60 / tempo
  const musicalDivisions = [8, 16, 4, 32, 2]  // number of beats for candidate loops (common lengths: 2, 4, 1, 8 bars, etc.)
  const duration = audioData.length / sampleRate
  const candidates = []

  for (const numBeats of musicalDivisions) {
    const loopDurSec = numBeats * beatDuration
    if (loopDurSec < 0.1 || loopDurSec > duration * 0.8 || loopDurSec > 16) {
      continue  // skip too short or too long loops
    }
    if (downbeats.length > 0) {
      // Use each downbeat as a potential loop start
      for (const startTime of downbeats) {
        const endTime = startTime + loopDurSec
        if (mainSection) {
          // ensure loop is within main section
          if (startTime < mainSection.start || endTime > mainSection.end) continue
        }
        if (endTime > duration) continue  // skip if beyond track
        // If endTime is near a downbeat, snap end to that exact downbeat for perfect bars
        let adjustedEnd = endTime
        for (const dbTime of downbeats) {
          if (Math.abs(dbTime - endTime) < beatDuration / 2) {
            adjustedEnd = dbTime
            break
          }
        }
        const cand = analyzeLoopCandidate(audioData, startTime, adjustedEnd, numBeats, sampleRate, onsets, 1.2)
        candidates.push(cand)
      }
    } else {
      // No explicit downbeat info: try sliding window of length numBeats across beat timeline
      const stepBeats = Math.max(1, Math.floor(numBeats / 4))
      for (let startIdx = 0; startIdx < beats.length - numBeats; startIdx += stepBeats) {
        const startTime = beats[startIdx]
        const endTime = startTime + loopDurSec
        if (mainSection) {
          if (startTime < mainSection.start || endTime > mainSection.end) continue
        }
        if (endTime > duration) continue
        // Align end to exact beat if possible
        const endIdx = startIdx + numBeats
        const actualEnd = endIdx < beats.length ? beats[endIdx] : endTime
        const cand = analyzeLoopCandidate(audioData, startTime, actualEnd, numBeats, sampleRate, onsets)
        candidates.push(cand)
      }
    }
  }

  // Also consider some onset-to-onset loops (not necessarily beat-aligned) for variety
  for (let i = 0; i < onsets.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 10, onsets.length); j++) {
      const startTime = onsets[i]
      const endTime = onsets[j]
      const loopDur = endTime - startTime
      if (loopDur < 0.5 || loopDur > 8.0) continue  // consider only reasonable lengths
      if (mainSection) {
        if (startTime < mainSection.start || endTime > mainSection.end) continue
      }
      const numBeats = Math.round(loopDur / beatDuration)
      const cand = analyzeLoopCandidate(audioData, startTime, endTime, numBeats, sampleRate, onsets, 0.8)
      candidates.push(cand)
    }
  }

  return candidates
}

/**
 * Analyze a specific loop segment to compute its quality.
 * Uses audio correlation and onset alignment to assign a confidence score.
 * @param {Float32Array} audioData - Audio samples.
 * @param {number} startTime - Loop start time in seconds.
 * @param {number} endTime - Loop end time in seconds.
 * @param {number} numBeats - Length of loop in beats.
 * @param {number} sampleRate - Sample rate of audio.
 * @param {number[]} onsets - List of onset times.
 * @param {number} [confidenceBoost=1.0] - Multiplier for confidence (e.g., higher for downbeat-aligned loops).
 * @returns {Object} Loop candidate with properties: start, end, confidence, musicalDivision, correlation.
 * @private
 */
function analyzeLoopCandidate(audioData, startTime, endTime, numBeats, sampleRate, onsets, confidenceBoost = 1.0) {
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = Math.floor(endTime * sampleRate)
  const loopLengthSamples = endSample - startSample
  if (loopLengthSamples < 1) {
    return { start: startTime, end: endTime, confidence: 0, musicalDivision: numBeats / 4, correlation: 0 }
  }
  // Extract loop segment and the subsequent segment of equal length (for checking repeat)
  const segment1 = audioData.slice(startSample, endSample)
  const nextStart = endSample
  const nextEnd = Math.min(endSample + loopLengthSamples, audioData.length)
  let corrValue = 0
  if (nextEnd - nextStart >= loopLengthSamples * 0.8) {
    // Enough audio after loop to test repetition
    const segment2 = audioData.slice(nextStart, nextStart + loopLengthSamples)
    corrValue = crossCorrelation(segment1, segment2)
  } else {
    // If near track end, assess internal consistency of the segment instead
    corrValue = assessSegmentConsistency(segment1, sampleRate)
  }
  // Give a small bonus if loop boundaries align with detected onsets (within 50 ms)
  let onsetBonus = 0
  const boundaryTol = 0.05
  for (const t of onsets) {
    if (Math.abs(t - startTime) < boundaryTol || Math.abs(t - endTime) < boundaryTol) {
      onsetBonus += 0.1
    }
  }
  // Normalize correlation to 0-1 (correlation values are usually small)
  const normalizedCorr = Math.min(1, Math.abs(corrValue) * 100)
  // Base confidence combines correlation and onset alignment
  let confidence = (normalizedCorr * 0.7 + onsetBonus * 0.3) * confidenceBoost
  // Boost or penalize confidence based on musical length (favor full bars)
  const musicalDivision = numBeats / 4  // number of bars
  if (musicalDivision === 4 || musicalDivision === 2) {
    confidence *= 1.3   // favor 2-bar and 4-bar loops
  } else if (musicalDivision === 1) {
    confidence *= 1.1   // favor 1-bar loops slightly
  } else if (musicalDivision === 0.5) {
    confidence *= 0.7   // discourage half-bar loops
  } else if (musicalDivision >= 8) {
    confidence *= 0.8   // very long loops slightly penalized
  }
  return {
    start: startTime,
    end: endTime,
    confidence,
    musicalDivision,
    correlation: corrValue
  }
}

/**
 * Cross-correlation between two equal-length audio segments (no normalization).
 * @param {Float32Array} segA - First audio segment.
 * @param {Float32Array} segB - Second audio segment.
 * @returns {number} Average correlation (dot product) between the two segments.
 */
function crossCorrelation(segA, segB) {
  const len = Math.min(segA.length, segB.length)
  if (len === 0) return 0
  let sum = 0
  for (let i = 0; i < len; i++) {
    sum += segA[i] * segB[i]
  }
  return sum / len
}

/**
 * Assess loop segment consistency by measuring energy variance (used when no repetition available).
 * A good loop has fairly consistent energy throughout.
 * @param {Float32Array} segment - Audio segment of the loop.
 * @param {number} sampleRate - Audio sample rate.
 * @returns {number} A pseudo-correlation score (0-1) representing consistency.
 */
function assessSegmentConsistency(segment, sampleRate) {
  const frameSize = 1024
  const numFrames = Math.floor(segment.length / frameSize)
  if (numFrames < 2) return 0
  const energies = []
  for (let i = 0; i < numFrames; i++) {
    const frame = segment.subarray(i * frameSize, i * frameSize + frameSize)
    let frameEnergy = 0
    for (let j = 0; j < frame.length; j++) {
      frameEnergy += frame[j] * frame[j]
    }
    energies.push(frameEnergy / frame.length)
  }
  // Lower variance in energy means more consistent segment (better loop)
  const meanEnergy = energies.reduce((sum, e) => sum + e, 0) / energies.length
  const variance = energies.reduce((sum, e) => sum + (e - meanEnergy) ** 2, 0) / energies.length
  // Normalize so that perfectly consistent (variance ~ 0) yields 1, higher variance yields lower score
  return Math.max(0, 1 - variance / (meanEnergy * meanEnergy + 1e-9))
}

/**
 * Find a precise loop by searching for a segment that repeats exactly later in the audio.
 * This method checks pairs of onsets for potential loop boundaries and uses cross-correlation to score them.
 * @param {Float32Array} audioData - Audio samples.
 * @param {number} sampleRate - Sample rate.
 * @param {number} bpm - Estimated tempo (for musical context).
 * @param {Object} params - Search parameters.
 * @param {number} params.minDuration - Minimum loop length in seconds.
 * @param {number} params.maxDuration - Maximum loop length in seconds.
 * @param {number} params.searchStart - Time in seconds to start searching for loops (skip intro).
 * @param {number} params.searchEndFraction - Fraction (0-1) of the track length to end searching (skip outro).
 * @returns {Object|null} Best loop found or null if none found.
 *    If found, object includes: `{ start, end, duration, score }` where score is a correlation (0-1).
 */
function findPreciseLoop(audioData, sampleRate, bpm, { minDuration, maxDuration, searchStart, searchEndFraction }) {
  const duration = audioData.length / sampleRate
  const beatDuration = 60 / bpm
  const onsets = getOnsetTimes(audioData, sampleRate)
  if (onsets.length < 2) return null

  const minLen = Math.max(minDuration, beatDuration * 0.5)  // at least half a beat
  const maxLen = maxDuration
  const searchEndTime = duration * (searchEndFraction || 1.0)

  let bestLoop = null
  let bestScore = 0
  for (let i = 0; i < onsets.length; i++) {
    const startTime = onsets[i]
    if (startTime < searchStart) continue
    if (startTime > searchEndTime) break
    for (let j = i + 1; j < onsets.length; j++) {
      const endTime = onsets[j]
      const loopDur = endTime - startTime
      if (loopDur < minLen) continue
      if (loopDur > maxLen) break
      if (endTime + loopDur > duration) continue  // ensure there's audio after for comparison
      // Calculate how well this loop repeats
      const score = scorePreciseLoop(audioData, sampleRate, startTime, endTime)
      // Add a bonus if loop length aligns closely with full bars or common beat lengths
      const musicalBonus = getMusicalBonus(loopDur, beatDuration)
      const totalScore = score * (1 + musicalBonus)
      if (totalScore > bestScore) {
        bestScore = totalScore
        bestLoop = {
          start: startTime,
          end: endTime,
          duration: loopDur,
          score: score  // correlation-based score (0-1)
        }
      }
    }
  }
  return bestLoop
}

/**
 * Compute a score for how well a segment loops by comparing it to the following audio.
 * Uses normalized cross-correlation and penalizes fades at boundaries.
 * @param {Float32Array} audioData - Audio samples.
 * @param {number} sampleRate - Sample rate.
 * @param {number} startTime - Segment start time (s).
 * @param {number} endTime - Segment end time (s).
 * @returns {number} Score from 0 to 1 (higher means the segment cleanly loops).
 */
function scorePreciseLoop(audioData, sampleRate, startTime, endTime) {
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = Math.floor(endTime * sampleRate)
  const loopLen = endSample - startSample
  // If not enough audio after the segment to compare, return 0
  if (endSample + loopLen > audioData.length) {
    return 0
  }
  const seg1 = audioData.slice(startSample, endSample)
  const seg2 = audioData.slice(endSample, endSample + loopLen)
  const corr = normalizedCrossCorrelation(seg1, seg2)
  const fadeScore = checkFadeCharacteristics(seg1)
  return corr * fadeScore
}

/**
 * Calculate normalized cross-correlation between two signals (length must match).
 * @param {Float32Array} x - First signal segment.
 * @param {Float32Array} y - Second signal segment.
 * @returns {number} Correlation coefficient (-1 to 1).
 */
function normalizedCrossCorrelation(x, y) {
  const len = Math.min(x.length, y.length)
  if (len === 0) return 0
  // Compute means
  let meanX = 0, meanY = 0
  for (let i = 0; i < len; i++) {
    meanX += x[i]
    meanY += y[i]
  }
  meanX /= len
  meanY /= len
  // Compute covariance and variances
  let numerator = 0
  let varX = 0, varY = 0
  for (let i = 0; i < len; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    numerator += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  if (varX === 0 || varY === 0) return 0
  return numerator / Math.sqrt(varX * varY)
}

/**
 * Check if a loop segment starts or ends with a fade (low energy at edges).
 * Returns a score 0-1 (1 means no fade, high energy throughout).
 * @param {Float32Array} segment - Audio segment data.
 * @returns {number} Fade characteristic score (>= 0.5, up to 1).
 */
function checkFadeCharacteristics(segment) {
  const len = segment.length
  if (len < 2) return 1
  const fadeLen = Math.min(1024, Math.floor(len * 0.05))
  // Compute energy at start, middle, and end of segment
  let startEnergy = 0, endEnergy = 0, midEnergy = 0
  for (let i = 0; i < fadeLen; i++) {
    startEnergy += segment[i] * segment[i]
    endEnergy += segment[len - 1 - i] * segment[len - 1 - i]
  }
  startEnergy /= fadeLen
  endEnergy /= fadeLen
  const midStart = Math.floor(len / 2 - fadeLen / 2)
  for (let i = midStart; i < midStart + fadeLen; i++) {
    midEnergy += segment[i] * segment[i]
  }
  midEnergy /= fadeLen
  // Score penalizes segments that start or end much quieter than the middle
  const startRatio = startEnergy / (midEnergy + 1e-9)
  const endRatio = endEnergy / (midEnergy + 1e-9)
  const fadeScore = Math.min(1, startRatio, endRatio)
  return Math.max(0.5, fadeScore)  // ensure not too low (min 0.5)
}

/**
 * Compute a musical bonus for loop length aligning with common musical intervals.
 * Favors loop durations close to 1, 2, 4 bars (or 2, 8 beats).
 * @param {number} loopDuration - Loop length in seconds.
 * @param {number} beatDuration - Duration of one beat in seconds.
 * @returns {number} Bonus factor (0 to 0.2, higher if loopDuration is near a full bar count).
 */
function getMusicalBonus(loopDuration, beatDuration) {
  const barDuration = beatDuration * 4
  const targetLengths = [barDuration * 1, barDuration * 2, barDuration * 4, beatDuration * 2, beatDuration * 8] 
  let bestMatchDiff = Infinity
  for (const target of targetLengths) {
    const diff = Math.abs(loopDuration - target) / target
    if (diff < bestMatchDiff) {
      bestMatchDiff = diff
    }
  }
  if (bestMatchDiff < 0.02) return 0.2
  if (bestMatchDiff < 0.05) return 0.1
  if (bestMatchDiff < 0.10) return 0.05
  return 0
}
