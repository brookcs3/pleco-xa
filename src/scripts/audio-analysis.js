// ===== CORE IMPORTS =====
// Main audio player and file handling
// import { AudioPlayer } from './assets/audio/AudioPlayer.js'
// import { loadFile, example, exampleBuffer } from './xa-file.js'
import { loadFile } from './xa-file.js'

// Advanced BPM Detection
import { detectBPM, fastBPMDetect } from './analysis/BPMDetector.js'

// Advanced beat tracking with phase detection
import { BeatTracker } from './xa-beat-tracker.js'

// Onset detection for transients
// import { onsetDetect, computeSpectralFlux } from './xa-onset.js' // Commented out as unused per task warning

// Spectral features with RMS energy
// import {
//   spectralCentroid,
//   spectralRolloff,
//   spectralBandwidth,
//   zeroCrossingRate,
//   rms,
// } from './xa-spectral.js' // Commented out as unused per task warning

// Chroma features for harmonic analysis
import { chroma_stft, enhance_chroma } from './xa-chroma.js'

// Loop detection algorithms
import { fastLoopAnalysis } from './xa-loop.js'
import { findPreciseLoop } from './xa-precise-loop.js'
import { findMusicalLoop, findDownbeatPhase } from './xa-downbeat.js'

// Audio utilities
import {
  computeRMS,
  computePeak,
  computeZeroCrossingRate,
} from '../utils/audio-utils.js'

// Dynamic zero crossing for clean loops
import { DynamicZeroCrossing } from './dynamic-zero-crossing.js'

// ===== GLOBAL STATE =====
let audioContext
let currentAudioBuffer = null
let currentSource = null
let isPlaying = false
let currentBPM = 120
let currentLoop = { start: 0, end: 1 }
let playheadStartTime = 0
let playheadAnimationId = null
let beatTracker = null

// ===== ERROR HANDLING =====
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error)
  showError(`Error: ${e.error.message}`)
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason)
  showError(`Promise error: ${e.reason}`)
})

function showError(message) {
  const errorDiv = document.getElementById('errorDisplay')
  errorDiv.textContent = message
  errorDiv.style.display = 'block'

  setTimeout(() => {
    errorDiv.style.display = 'none'
  }, 5000)
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎵 Pleco-XA Audio Analysis Engine loading...')
  try {
    setupEventListeners()
    console.log('✅ Event listeners initialized')
  } catch (error) {
    console.error('❌ Failed to initialize:', error)
    showError(`Initialization error: ${error.message}`)
  }
})

function setupEventListeners() {
  // Sample buttons
  document.querySelectorAll('.sample-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.sample) {
        loadSampleFile(`src/assets/assets/audio/${btn.dataset.sample}`, btn.textContent)
      }
    })
  })

  // Upload button
  document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('audioFileInput').click()
  })

  // File input
  document
    .getElementById('audioFileInput')
    .addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (file) {
        try {
          console.log(`📁 Loading uploaded file: ${file.name}`)
          updateTrackInfo(file.name, 'Loading...')

          if (!audioContext) {
            audioContext = new (window.AudioContext ||
              window.webkitAudioContext)()
            beatTracker = new BeatTracker()
          }

          currentAudioBuffer = await loadFile(file, audioContext)

          updateTrackInfo(
            file.name,
            `${currentAudioBuffer.duration.toFixed(1)}s`,
          )
          document.getElementById('audioFormat').textContent =
            `${currentAudioBuffer.sampleRate}Hz / ${currentAudioBuffer.numberOfChannels}ch`

          await analyzeAudio()
          drawWaveform()

          console.log('✅ Uploaded file loaded successfully')
        } catch (error) {
          console.error('❌ Error loading uploaded file:', error)
          showError(`Failed to load ${file.name}: ${error.message}`)
        }
      }
    })

  // Playback controls
  document.getElementById('playBtn').addEventListener('click', playAudio)
  document.getElementById('stopBtn').addEventListener('click', stopAudio)

  // Loop controls
  document.getElementById('detectLoopBtn').addEventListener('click', detectLoop)
  document.getElementById('halfLoopBtn').addEventListener('click', halfLoop)
  document.getElementById('doubleLoopBtn').addEventListener('click', doubleLoop)
  document
    .getElementById('moveForwardBtn')
    .addEventListener('click', moveForward)
  document
    .getElementById('reverseLoopBtn')
    .addEventListener('click', reverseLoopSection)
  document
    .getElementById('resetPlayheadBtn')
    .addEventListener('click', resetPlayhead)
  document.getElementById('resetLoopBtn').addEventListener('click', resetLoop)
}

// ===== AUDIO LOADING =====
async function loadSampleFile(url, name) {
  try {
    console.log(`📥 Loading: ${url}`)
    updateTrackInfo(name, 'Loading...')

    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      beatTracker = new BeatTracker()
      console.log(`✅ AudioContext created`)
    }

    // Load audio file directly
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load audio: HTTP ${response.status} ${response.statusText}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    try {
      currentAudioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    } catch (decodeError) {
      throw new Error(`Decoding failed: ${decodeError.message || 'Unknown decoding error'}`)
    }
    // ---- DEBUG: print first 10 samples to verify audio ----
    try {
      console.log(
        'First 10 samples:',
        currentAudioBuffer.getChannelData(0).slice(0, 10),
      )
    } catch (e) {
      console.warn('Could not log samples:', e)
    }
    // -------------------------------------------------------

    // Reset loop to full track for new audio
    currentLoop = { start: 0, end: 1 }
    updateLoopInfo()

    console.log(
      `✅ Audio loaded: ${currentAudioBuffer.duration.toFixed(2)}s @ ${currentAudioBuffer.sampleRate}Hz`,
    )

    updateTrackInfo(name, `${currentAudioBuffer.duration.toFixed(1)}s`)
    document.getElementById('audioFormat').textContent =
      `${currentAudioBuffer.sampleRate}Hz`

    // Run analysis
    await analyzeAudio()

    // Draw waveform
    drawWaveform()

    console.log('✅ Audio analysis complete')
  } catch (error) {
    console.error('❌ Error loading audio:', error)
    showError(`Load error: ${error.message}`)
    updateTrackInfo('Error', error.message)
  }
}

// ===== AUDIO ANALYSIS =====
async function analyzeAudio() {
  try {
    console.log('🔍 Starting advanced BPM detection...')

    // Use fast BPM detection for real-time performance
    console.log('🥁 Detecting BPM...')
    let bpm = fastBPMDetect(currentAudioBuffer, {
      minBPM: 60,
      maxBPM: 180,
    })

    // Simple sanity correction:
    // - very fast values (>160) are likely *double*; halve them
    // - very slow values (<55) are likely *half*; double them
    if (bpm > 160) {
      console.log(`⚖️ BPM ${bpm.toFixed(1)} looks like double‑time → halving`)
      bpm = bpm / 2
    } else if (bpm < 55) {
      console.log(`⚖️ BPM ${bpm.toFixed(1)} looks like half‑time → doubling`)
      bpm = bpm * 2
    }

    currentBPM = bpm
    document.getElementById('bpmValue').textContent = currentBPM.toFixed(1)
    console.log(`✅ BPM detected: ${currentBPM}`)

    // Store analysis results
    window.analysisResults = {
      tempo: { bpm: currentBPM, confidence: 0.8 },
      beats: { beat_times: [] },
      spectral: {
        centroid: { centroid: 0, centroids: [] },
        rolloff: { rolloff: 0, rolloffs: [] },
      },
    }
  } catch (error) {
    console.error('❌ BPM detection error:', error)
    // Fallback to default BPM
    currentBPM = 120
    document.getElementById('bpmValue').textContent = '120'
    console.log('⚠️ Using fallback BPM: 120')
  }
}

// --- Helper: find nearest zero‑crossing (sign change) ---
function findNearestZeroCrossing(
  channelData,
  startSample,
  direction = 1,
  maxSearch = 2048,
) {
  const len = channelData.length
  let i = startSample
  let steps = 0
  while (steps < maxSearch && i > 0 && i < len - 1) {
    if (channelData[i] >= 0 !== channelData[i + 1] >= 0) {
      return i
    }
    i += direction
    steps++
  }
  // Fallback: original position if none found
  return startSample
}

// ===== LOOP DETECTION =====
async function detectLoop() {
  try {
    console.log('🔍 Running fastLoopAnalysis ...')

    // Use the more sophisticated Librosa‑port algorithm.
    const result = await fastLoopAnalysis(currentAudioBuffer, {
      bpmHint: currentBPM,
    })

    const channel = currentAudioBuffer.getChannelData(0)
    const sr = currentAudioBuffer.sampleRate

    // Extract boundaries returned by the helper (robust to different key names)
    let startSec = result?.loopStart ?? result?.start ?? result?.startTime ?? 0
    let endSec =
      result?.loopEnd ??
      result?.end ??
      result?.endTime ??
      currentAudioBuffer.duration

    // Sanity‑check & fallback
    if (
      endSec <= startSec ||
      !Number.isFinite(startSec) ||
      !Number.isFinite(endSec)
    ) {
      console.warn(
        'fastLoopAnalysis gave unusable bounds; reverting to 4‑bar guess',
      )
      const barDur = (60 / currentBPM) * 4
      startSec = 0
      endSec = Math.min(barDur * 4, currentAudioBuffer.duration)
    }

    // Snap both edges to nearest zero‑crossings for click‑free looping
    let startSample = findNearestZeroCrossing(
      channel,
      Math.floor(startSec * sr),
      1,
    )
    const endSample = findNearestZeroCrossing(
      channel,
      Math.floor(endSec * sr),
      -1,
    )

    /* --- subtle adjustment: nudge start to first strong onset (≤½ beat ahead) --- */
    try {
      const beatDur = 60 / currentBPM // seconds per beat
      const lookAhead = Math.min(0.5 * beatDur, 0.5) // cap at 0.5 s
      const searchSamples = Math.floor(lookAhead * sr)
      const hop = 512,
        frame = 1024
      const seg = channel.subarray(startSample, startSample + searchSamples)

      let maxIdx = 0,
        maxDiff = 0,
        prevRms = 0
      for (let i = 0; i + frame < seg.length; i += hop) {
        const rms = Math.sqrt(
          seg.subarray(i, i + frame).reduce((s, v) => s + v * v, 0) / frame,
        )
        const diff = Math.max(0, rms - prevRms)
        if (diff > maxDiff) {
          maxDiff = diff
          maxIdx = i
        }
        prevRms = rms
      }
      if (maxIdx > hop) {
        // ignore first tiny blips
        const onsetSample = startSample + maxIdx
        startSample = findNearestZeroCrossing(channel, onsetSample, 1, 2048)
        console.log(
          `🎯 Start nudged to onset @ ${(startSample / sr).toFixed(3)}s`,
        )
      }
    } catch (e) {
      console.warn('onset‑alignment tweak skipped:', e)
    }

    currentLoop = {
      start: startSample / channel.length,
      end: endSample / channel.length,
    }

    updateLoopInfo()
    drawWaveform()

    console.log(
      `✅ Loop set to ${(startSample / sr).toFixed(3)}s – ${(endSample / sr).toFixed(3)}s`,
      result?.confidence !== undefined
        ? `(confidence ${result.confidence.toFixed(3)})`
        : '',
    )
  } catch (error) {
    console.error('❌ Loop detection error:', error)
    showError(`Loop detection failed: ${error.message}`)
  }
}

// ===== WAVEFORM VISUALIZATION =====
function drawWaveform() {
  const canvas = document.getElementById('waveformCanvas')
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height

  // Clear canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.fillRect(0, 0, width, height)

  if (!currentAudioBuffer) return

  const audioData = currentAudioBuffer.getChannelData(0)
  const samplesPerPixel = Math.ceil(audioData.length / width)

  // Draw waveform
  ctx.strokeStyle = '#00ff88'
  ctx.lineWidth = 1
  ctx.beginPath()

  for (let x = 0; x < width; x++) {
    let max = -1
    let min = 1

    // Sample audio data for this pixel
    const startSample = x * samplesPerPixel
    const endSample = Math.min(startSample + samplesPerPixel, audioData.length)

    for (let i = startSample; i < endSample; i++) {
      const sample = audioData[i]
      if (sample > max) max = sample
      if (sample < min) min = sample
    }

    // Convert to screen coordinates
    const yMax = ((1 - max) * height) / 2
    const yMin = ((1 - min) * height) / 2

    if (x === 0) {
      ctx.moveTo(x, height / 2)
    }

    // Draw vertical line from min to max
    ctx.moveTo(x, yMax)
    ctx.lineTo(x, yMin)
  }
  ctx.stroke()

  // Draw loop region
  const startX = currentLoop.start * width
  const endX = currentLoop.end * width

  ctx.fillStyle = 'rgba(255, 215, 0, 0.15)'
  ctx.fillRect(startX, 0, endX - startX, height)

  // Loop markers
  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(startX, 0)
  ctx.lineTo(startX, height)
  ctx.moveTo(endX, 0)
  ctx.lineTo(endX, height)
  ctx.stroke()

  // Draw playhead if playing
  if (isPlaying) {
    drawPlayhead(ctx, width, height)
  }
}

function drawPlayhead(ctx, width, height) {
  if (!currentAudioBuffer || !isPlaying) return

  const currentTime = audioContext.currentTime
  const elapsed = currentTime - playheadStartTime

  const loopStartSec = currentLoop.start * currentAudioBuffer.duration
  const loopEndSec = currentLoop.end * currentAudioBuffer.duration
  const loopDuration = loopEndSec - loopStartSec

  const positionInLoop = elapsed % loopDuration
  const currentPosition = loopStartSec + positionInLoop

  const normalizedPosition = currentPosition / currentAudioBuffer.duration
  const playheadX = normalizedPosition * width

  // Draw playhead
  ctx.strokeStyle = '#ff4444'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(playheadX, 0)
  ctx.lineTo(playheadX, height)
  ctx.stroke()

  // Playhead marker
  ctx.fillStyle = '#ff4444'
  ctx.beginPath()
  ctx.moveTo(playheadX, 0)
  ctx.lineTo(playheadX - 5, 10)
  ctx.lineTo(playheadX + 5, 10)
  ctx.closePath()
  ctx.fill()
}

// ===== PLAYBACK CONTROLS =====
async function playAudio() {
  console.log('🎮 Play button clicked')

  if (!currentAudioBuffer) {
    console.log('❌ No audio buffer loaded')
    alert('Please load an audio file first!')
    return
  }

  if (isPlaying) {
    console.log('🎮 Already playing, stopping first')
    stopAudio()
    return
  }

  try {
    console.log('🎮 Starting playback...')

    if (audioContext.state === 'suspended') {
      console.log('🎮 Resuming suspended audio context')
      await audioContext.resume()
    }
    // ===== DEBUG: confirm context state =====
    console.log('Context state after resume:', audioContext.state) // expect "running"
    // ========================================

    currentSource = audioContext.createBufferSource()
    currentSource.buffer = currentAudioBuffer

    // Add gain node for volume control and debugging
    const gainNode = audioContext.createGain()
    gainNode.gain.value = 0.5 // 50% volume

    currentSource.connect(gainNode)
    gainNode.connect(audioContext.destination)
    // ===== DEBUG: peak meter =====
    const analyser = audioContext.createAnalyser()
    gainNode.connect(analyser)
    const debugInterval = setInterval(() => {
      const data = new Uint8Array(analyser.fftSize)
      analyser.getByteTimeDomainData(data)
      const peak = Math.max(...data) // 128 = silence, >128 => signal
      console.log('peak', peak)
    }, 250)
    // ========================================
    currentSource.loop = true

    console.log(`🎮 Audio context state: ${audioContext.state}`)
    console.log(
      `🎮 Audio context destination: ${audioContext.destination.channelCount} channels`,
    )

    // If loop bounds are invalid, default to full track
    if (currentLoop.end <= currentLoop.start) {
      console.warn('⚠️ Invalid loop bounds detected, resetting to full track')
      currentLoop = { start: 0, end: 1 }
    }

    const startTime = currentLoop.start * currentAudioBuffer.duration
    const endTime = currentLoop.end * currentAudioBuffer.duration

    console.log(`🎮 Loop: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`)

    currentSource.loopStart = startTime
    currentSource.loopEnd = endTime
    currentSource.start(0, startTime)

    console.log('🎮 Audio source started')

    isPlaying = true
    playheadStartTime = audioContext.currentTime
    startPlayheadAnimation()
    startTimelineAnimation()
    startBeatVisualization()
    document.getElementById('playBtn').textContent = '⏸️ Pause'
  } catch (error) {
    console.error('Playback error:', error)
    showError(`Playback error: ${error.message}`)
  }
}

function stopAudio() {
  if (currentSource) {
    try {
      currentSource.stop()
    } catch (error) {
      // Source may already be stopped
    }
    currentSource = null
  }
  isPlaying = false
  // ===== DEBUG: clear peak meter =====
  if (typeof debugInterval !== 'undefined') {
    clearInterval(debugInterval)
  }
  // ===================================
  stopPlayheadAnimation()
  stopBeatVisualization()
  document.getElementById('playBtn').textContent = '▶️ Play'
}

// ===== LOOP MANIPULATION =====
function halfLoop() {
  const duration = currentLoop.end - currentLoop.start
  const newDuration = duration / 2

  if (currentAudioBuffer && newDuration * currentAudioBuffer.duration < 0.05) {
    console.log('Cannot halve - loop too small')
    return
  }

  currentLoop.end = currentLoop.start + newDuration
  updateLoopInfo()
  drawWaveform()

  if (isPlaying) {
    stopAudio()
    setTimeout(playAudio, 50)
  }
}

function doubleLoop() {
  const duration = currentLoop.end - currentLoop.start
  const newEnd = currentLoop.start + duration * 2

  if (newEnd > 1) {
    console.log('Cannot double - exceeds track length')
    return
  }

  currentLoop.end = newEnd
  updateLoopInfo()
  drawWaveform()

  if (isPlaying) {
    stopAudio()
    setTimeout(playAudio, 50)
  }
}

function moveForward() {
  const duration = currentLoop.end - currentLoop.start

  if (currentLoop.end + duration > 1) {
    console.log('Cannot move forward - not enough space')
    return
  }

  currentLoop.start += duration
  currentLoop.end += duration

  updateLoopInfo()
  drawWaveform()

  if (isPlaying) {
    stopAudio()
    setTimeout(playAudio, 50)
  }
}

function resetLoop() {
  currentLoop = { start: 0, end: 1 }
  updateLoopInfo()
  drawWaveform()

  if (isPlaying) {
    stopAudio()
    setTimeout(playAudio, 50)
  }
}

function reverseLoopSection() {
  if (!currentAudioBuffer) {
    alert('No audio loaded!')
    return
  }

  const reversedBuffer = reverseAudioLoop(currentAudioBuffer, currentLoop)
  currentAudioBuffer = reversedBuffer

  drawWaveform()

  if (isPlaying) {
    stopAudio()
    setTimeout(playAudio, 50)
  }
}

function reverseAudioLoop(audioBuffer, loopBounds) {
  const newBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate,
  )

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const originalData = audioBuffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)

    // Copy original data
    newData.set(originalData)

    // Calculate loop boundaries in samples
    const loopStartSample = Math.floor(loopBounds.start * audioBuffer.length)
    const loopEndSample = Math.floor(loopBounds.end * audioBuffer.length)
    const loopLength = loopEndSample - loopStartSample

    // Reverse just the loop section
    for (let i = 0; i < loopLength; i++) {
      const originalIndex = loopStartSample + i
      const reversedIndex = loopStartSample + (loopLength - 1 - i)
      newData[originalIndex] = originalData[reversedIndex]
    }
  }

  return newBuffer
}

function resetPlayhead() {
  currentLoop = { start: 0, end: 1 }
  updateLoopInfo()
  drawWaveform()

  if (isPlaying) {
    stopAudio()
    setTimeout(playAudio, 50)
  }
}

// ===== UI UPDATES =====
function updateTrackInfo(name, status) {
  document.getElementById('trackName').textContent = name
  document.getElementById('trackStatus').textContent = status
}

function updateLoopInfo() {
  if (!currentAudioBuffer) return

  const startTime = currentLoop.start * currentAudioBuffer.duration
  const endTime = currentLoop.end * currentAudioBuffer.duration
  const duration = endTime - startTime

  let loopText
  if (currentLoop.start === 0 && currentLoop.end === 1) {
    loopText = 'Full Track'
  } else {
    // Calculate musical division if we have BPM
    if (currentBPM > 0) {
      const beatDuration = 60 / currentBPM
      const barDuration = beatDuration * 4
      const bars = duration / barDuration

      if (Math.abs(bars - Math.round(bars)) < 0.1) {
        loopText = `${Math.round(bars)} bar${Math.round(bars) !== 1 ? 's' : ''}`
      } else {
        loopText = `${duration.toFixed(2)}s`
      }
    } else {
      loopText = `${duration.toFixed(2)}s`
    }

    loopText += ` (${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s)`
  }

  document.getElementById('loopInfo').textContent = loopText
}

// ===== ANIMATION =====
function startPlayheadAnimation() {
  function animate() {
    if (isPlaying && currentAudioBuffer) {
      drawWaveform()
      playheadAnimationId = requestAnimationFrame(animate)
    }
  }
  playheadAnimationId = requestAnimationFrame(animate)
}

function stopPlayheadAnimation() {
  if (playheadAnimationId) {
    cancelAnimationFrame(playheadAnimationId)
    playheadAnimationId = null
  }
  if (currentAudioBuffer) {
    drawWaveform()
  }
}

function startTimelineAnimation() {
  if (!currentAudioBuffer) return

  const loopDuration =
    (currentLoop.end - currentLoop.start) * currentAudioBuffer.duration
  const timelineHand = document.getElementById('timelineHand')

  // Reset position
  timelineHand.style.transform = 'translate(-50%, -100%) rotate(0deg)'

  const startTime = Date.now()

  function animateTimeline() {
    if (!isPlaying) return

    const elapsed = (Date.now() - startTime) / 1000
    const progress = (elapsed % loopDuration) / loopDuration
    const rotation = progress * 360

    timelineHand.style.transform = `translate(-50%, -100%) rotate(${rotation}deg)`

    requestAnimationFrame(animateTimeline)
  }

  requestAnimationFrame(animateTimeline)
}

// ===== BEAT VISUALIZATION =====
function startBeatVisualization() {
  if (!currentAudioBuffer || currentBPM <= 0) return
  const beatDur = 60 / currentBPM // seconds
  const bpmEl = document.getElementById('bpmValue')
  let lastBeatCtxTime = audioContext.currentTime

  function animateBeat() {
    if (!isPlaying) return
    const ctxTime = audioContext.currentTime
    const beatsElapsed = Math.floor((ctxTime - lastBeatCtxTime) / beatDur)
    if (beatsElapsed >= 1) {
      lastBeatCtxTime += beatsElapsed * beatDur
      // Trigger pulse
      bpmEl.classList.add('beat-pulse')
      setTimeout(() => bpmEl.classList.remove('beat-pulse'), 100)
    }
    requestAnimationFrame(animateBeat)
  }
  requestAnimationFrame(animateBeat)
}

function stopBeatVisualization() {
  // Remove any active pulse
  const bpmValueElement = document.getElementById('bpmValue')
  bpmValueElement.classList.remove('beat-pulse')
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault()
    if (isPlaying) {
      stopAudio()
    } else {
      playAudio()
    }
  } else if (e.code === 'KeyL') {
    detectLoop()
  } else if (e.code === 'KeyH') {
    halfLoop()
  } else if (e.code === 'KeyD') {
    doubleLoop()
  } else if (e.code === 'KeyR') {
    resetLoop()
  } else if (e.code === 'ArrowRight') {
    moveForward()
  }
})

// ===== DRAG AND DROP =====
const dropZone = document.body

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  e.stopPropagation()
  dropZone.style.opacity = '0.8'
})

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault()
  e.stopPropagation()
  dropZone.style.opacity = '1'
})

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault()
  e.stopPropagation()
  dropZone.style.opacity = '1'

  const files = Array.from(e.dataTransfer.files)
  const audioFile = files.find((file) => file.type.startsWith('assets/audio/'))

  if (audioFile) {
    try {
      console.log(`📥 Loading dropped file: ${audioFile.name}`)
      updateTrackInfo(audioFile.name, 'Loading...')

      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
        beatTracker = new BeatTracker()
      }

      // Use the loadFile utility from xa-file.js
      currentAudioBuffer = await loadFile(audioFile, audioContext)

      updateTrackInfo(
        audioFile.name,
        `${currentAudioBuffer.duration.toFixed(1)}s`,
      )
      document.getElementById('audioFormat').textContent =
        `${currentAudioBuffer.sampleRate}Hz / ${currentAudioBuffer.numberOfChannels}ch`

      await analyzeAudio()
      drawWaveform()

      console.log('✅ Dropped file loaded successfully')
    } catch (error) {
      console.error('❌ Error loading dropped file:', error)
      showError(`Failed to load ${audioFile.name}: ${error.message}`)
    }
  } else {
    showError('Please drop an audio file')
  }
})

// ===== ADVANCED FEATURES =====

// Add spectral visualization (optional)
function drawSpectrum() {
  if (!currentAudioBuffer) return

  const audioData = currentAudioBuffer.getChannelData(0)
  const sampleRate = currentAudioBuffer.sampleRate

  // Get spectral features at current playhead position if playing
  if (isPlaying && window.analysisResults) {
    const currentTime = audioContext.currentTime - playheadStartTime
    const frame = Math.floor((currentTime * sampleRate) / 512)

    if (window.analysisResults.spectral.centroid.centroids[frame]) {
      const centroid = window.analysisResults.spectral.centroid.centroids[frame]
      // Update UI with current spectral info
    }
  }
}