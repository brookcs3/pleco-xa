// src/utils/EnhancedDopplerScroll.js

import { DopplerScroll } from './DopplerScroll.js'
import { analyzeLoop } from '../../WIP/backend/loopAnalysis.js'
import {
  loadAudioBuffer,
  computeRMS,
  computePeak,
  computeSpectrum,
} from '../../WIP/frontend/librosaLite.js'

/**
 * Enhanced DopplerScroll that integrates with your existing audio analysis
 */
export class EnhancedDopplerScroll extends DopplerScroll {
  constructor(options = {}) {
    super(options)

    // Additional options for xa-inspired analysis
    this.analysisOptions = {
      fftSize: 2048,
      hopSize: 512,
      ...options.analysis,
    }
  }

  /**
   * Override loadLoops to use your existing analysis
   */
  async loadLoops(loop1Url, loop2Url) {
    try {
      // Load buffers using your librosaLite
      const [buffer1, buffer2] = await Promise.all([
        loadAudioBuffer(loop1Url, this.context),
        loadAudioBuffer(loop2Url, this.context),
      ])

      this.loops.loop1.buffer = buffer1
      this.loops.loop2.buffer = buffer2

      // Analyze using your existing loop analysis
      await this.analyzeLoopsWithLibrosa()

      this.emitter.emit('loopsLoaded', { loop1: buffer1, loop2: buffer2 })
    } catch (error) {
      console.error('Error loading loops:', error)
      this.emitter.emit('loadError', error)
    }
  }

  /**
   * Use your existing loop analysis functions
   */
  async analyzeLoopsWithLibrosa() {
    // Create temporary WAV files for analysis
    const wav1 = await this.bufferToWav(this.loops.loop1.buffer)
    const wav2 = await this.bufferToWav(this.loops.loop2.buffer)

    // Use your analyzeLoop function
    const [analysis1, analysis2] = await Promise.all([
      this.analyzeAudioBuffer(this.loops.loop1.buffer, 'loop1'),
      this.analyzeAudioBuffer(this.loops.loop2.buffer, 'loop2'),
    ])

    // Store analysis results
    this.tempoData.loop1 = {
      ...analysis1,
      rms: computeRMS(this.loops.loop1.buffer),
      peak: computePeak(this.loops.loop1.buffer),
      spectrum: await computeSpectrum(
        this.loops.loop1.buffer,
        this.analysisOptions.fftSize,
      ),
    }

    this.tempoData.loop2 = {
      ...analysis2,
      rms: computeRMS(this.loops.loop2.buffer),
      peak: computePeak(this.loops.loop2.buffer),
      spectrum: await computeSpectrum(
        this.loops.loop2.buffer,
        this.analysisOptions.fftSize,
      ),
    }
  }

  /**
   * Analyze audio buffer using your existing methods
   */
  async analyzeAudioBuffer(audioBuffer, loopId) {
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate

    // Extract onset envelope using your spectral flux approach
    const onsetEnvelope = await this.extractOnsetEnvelopeEnhanced(
      channelData,
      sampleRate,
    )

    // Detect tempo using your correlation method
    const tempo = this.detectTempoEnhanced(onsetEnvelope, sampleRate)

    // Extract beat positions
    const beats = this.extractBeatsEnhanced(channelData, tempo, sampleRate)

    // Find optimal loop points using your algorithm
    const loopPoints = await this.findLoopPointsEnhanced(
      channelData,
      sampleRate,
    )

    return {
      bpm: tempo,
      beatGrid: beats,
      loopPoints,
      onsetEnvelope,
      spectralCentroid: this.computeSpectralCentroid(channelData, sampleRate),
    }
  }

  /**
   * Enhanced onset detection using your spectral approach
   */
  async extractOnsetEnvelopeEnhanced(channelData, sampleRate) {
    const frameCount = Math.floor(
      (channelData.length - this.analysisOptions.fftSize) /
        this.analysisOptions.hopSize,
    )
    const envelope = new Float32Array(frameCount)

    // Use your mel spectrogram approach from audio_encoder.ts
    const melSpectrogram = this.computeMelSpectrogram(
      channelData,
      sampleRate,
      40, // nMels
      this.analysisOptions.fftSize,
      this.analysisOptions.hopSize,
    )

    // Compute onset strength from mel spectrogram
    for (let i = 1; i < frameCount; i++) {
      let flux = 0
      for (let j = 0; j < melSpectrogram.length; j++) {
        const diff = melSpectrogram[j][i] - melSpectrogram[j][i - 1]
        if (diff > 0) flux += diff
      }
      envelope[i] = flux
    }

    return this.smoothEnvelope(this.normalizeArray(envelope))
  }

  /**
   * Port of your computeMelSpectrogram from audio_encoder.ts
   */
  computeMelSpectrogram(
    samples,
    sr,
    nMels = 40,
    frameSize = 2048,
    hopSize = 512,
  ) {
    const mel = Array(nMels)
      .fill(0)
      .map(() => [])

    for (let i = 0; i + frameSize <= samples.length; i += hopSize) {
      const frame = samples.subarray(i, i + frameSize)
      const windowed = this.applyHannWindow(frame)
      const mag = this.dft(windowed)

      // Simple mel filterbank (simplified version)
      const binSize = Math.floor(mag.length / nMels)
      for (let m = 0; m < nMels; m++) {
        let sum = 0
        const start = m * binSize
        const end = start + binSize
        for (let b = start; b < end && b < mag.length; b++) {
          sum += mag[b]
        }
        mel[m].push(sum / binSize)
      }
    }

    return mel
  }

  /**
   * DFT implementation from your audio_encoder.ts
   */
  dft(input) {
    const N = input.length
    const out = new Float32Array(N / 2)

    for (let k = 0; k < N / 2; k++) {
      let sumR = 0
      let sumI = 0
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N
        sumR += input[n] * Math.cos(angle)
        sumI += input[n] * Math.sin(angle)
      }
      out[k] = Math.sqrt(sumR * sumR + sumI * sumI)
    }

    return out
  }

  /**
   * Enhanced tempo detection using your approach
   */
  detectTempoEnhanced(envelope, sampleRate) {
    const frameRate = sampleRate / this.analysisOptions.hopSize

    // Your tempo range from loopAnalysis
    const minPeriod = Math.floor((frameRate * 60) / 200) // Max 200 BPM
    const maxPeriod = Math.floor((frameRate * 60) / 40) // Min 40 BPM

    // Compute autocorrelation as in your implementation
    const autocorr = new Float32Array(maxPeriod - minPeriod + 1)

    for (let lag = minPeriod; lag <= maxPeriod; lag++) {
      let sum = 0
      for (let i = 0; i < envelope.length - lag; i++) {
        sum += envelope[i] * envelope[i + lag]
      }
      autocorr[lag - minPeriod] = sum
    }

    // Find peaks in autocorrelation
    let maxCorr = -Infinity
    let bestPeriod = minPeriod

    for (let i = 1; i < autocorr.length - 1; i++) {
      if (
        autocorr[i] > autocorr[i - 1] &&
        autocorr[i] > autocorr[i + 1] &&
        autocorr[i] > maxCorr
      ) {
        maxCorr = autocorr[i]
        bestPeriod = minPeriod + i
      }
    }

    return (frameRate * 60) / bestPeriod
  }

  /**
   * Beat extraction using your dynamic programming approach
   */
  extractBeatsEnhanced(channelData, tempo, sampleRate) {
    // Implementation based on your beat tracking approach
    const frameRate = sampleRate / this.analysisOptions.hopSize
    const beatPeriod = (frameRate * 60) / tempo
    const beats = []

    // Start from a strong onset
    let currentBeat = 0
    const onsetThreshold = 0.3

    while (currentBeat < channelData.length) {
      // Find next beat position
      const expectedNext =
        currentBeat + beatPeriod * this.analysisOptions.hopSize
      const searchStart = Math.max(0, expectedNext - beatPeriod * 0.1)
      const searchEnd = Math.min(
        channelData.length,
        expectedNext + beatPeriod * 0.1,
      )

      let bestPosition = expectedNext
      let bestStrength = 0

      for (let pos = searchStart; pos < searchEnd; pos++) {
        const strength = Math.abs(channelData[Math.floor(pos)])
        if (strength > bestStrength && strength > onsetThreshold) {
          bestStrength = strength
          bestPosition = pos
        }
      }

      beats.push(bestPosition / sampleRate)
      currentBeat =
        bestPosition + beatPeriod * this.analysisOptions.hopSize * 0.5
    }

    return beats
  }

  /**
   * Find loop points using your cross-correlation approach from loopAnalysis.ts
   */
  async findLoopPointsEnhanced(channelData, sampleRate) {
    const totalSamples = channelData.length
    const window = Math.min(
      Math.floor(sampleRate * 0.5),
      Math.floor(totalSamples / 2),
    )

    // Apply Hann window as in your implementation
    const startSlice = this.applyHannWindow(channelData.subarray(0, window))
    const endSlice = this.applyHannWindow(
      channelData.subarray(totalSamples - window),
    )

    // Cross-correlation to find best alignment
    let bestOffset = 0
    let bestScore = -Infinity

    for (let offset = 0; offset < window; offset++) {
      let score = 0
      for (let i = 0; i < window - offset; i++) {
        score += startSlice[i] * endSlice[i + offset]
      }
      if (score > bestScore) {
        bestScore = score
        bestOffset = offset
      }
    }

    // Find zero crossings as in your implementation
    const startIndex = this.findZeroCrossing(channelData, 0)
    const endIndex = this.findZeroCrossing(
      channelData,
      totalSamples - window + bestOffset,
    )

    return {
      start: startIndex / sampleRate,
      end: endIndex / sampleRate,
    }
  }

  /**
   * Find zero crossing from your loopAnalysis.ts
   */
  findZeroCrossing(data, start) {
    for (let i = start; i < data.length - 1; i++) {
      if (data[i] <= 0 && data[i + 1] > 0) {
        return i
      }
    }
    return start
  }

  /**
   * Apply Hann window from your implementation
   */
  applyHannWindow(data) {
    const N = data.length
    const out = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)))
      out[i] = data[i] * w
    }
    return out
  }

  /**
   * Compute spectral centroid for timbral analysis
   */
  computeSpectralCentroid(channelData, sampleRate) {
    const spectrum = this.dft(
      this.applyHannWindow(
        channelData.subarray(0, this.analysisOptions.fftSize),
      ),
    )

    let weightedSum = 0
    let magnitudeSum = 0

    for (let i = 0; i < spectrum.length; i++) {
      const freq = (i * sampleRate) / (2 * spectrum.length)
      weightedSum += freq * spectrum[i]
      magnitudeSum += spectrum[i]
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0
  }

  /**
   * Convert AudioBuffer to WAV for analysis
   */
  async bufferToWav(audioBuffer) {
    const length = audioBuffer.length
    const sampleRate = audioBuffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)

    // Convert float samples to 16-bit PCM
    const channelData = audioBuffer.getChannelData(0)
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      )
      offset += 2
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }
}
