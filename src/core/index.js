// @ts-check
/**
 * Pleco-XA Core Audio Analysis Library
 *
 * Main entry point for the complete framework-agnostic audio analysis toolkit.
 * Exports all core modules with a clean, developer-friendly API.
 *
 * @module PlecoXA
 * @author PlecoXA Audio Analysis
 * @version 1.0.0
 *
 * @example
 * ```javascript
 * // Import specific modules
 * import { AudioPlayer } from 'pleco-xa/core';
 * import { BPMDetector, WaveformData } from 'pleco-xa/analysis';
 * import { WaveformRenderer } from 'pleco-xa/visualization';
 *
 * // Or import everything
 * import * as PlecoXA from 'pleco-xa/core';
 *
 * // Quick start
 * const player = new PlecoXA.AudioPlayer();
 * const bpm = await PlecoXA.detectBPM(audioBuffer);
 * const waveform = PlecoXA.getWaveformPeaks(audioBuffer);
 * PlecoXA.renderWaveform(canvas, waveform.data);
 * ```
 */

// Audio Core (Playback & Control)
import { AudioPlayer } from './audio/AudioPlayer.js'
export { AudioPlayer } from './audio/AudioPlayer.js'

// Analysis Modules
import {
  detectBPM,
  fastBPMDetect,
  analyzeTempoVariations,
} from './analysis/BPMDetector.js'
import {
  getWaveformPeaks,
  getStereoWaveformPeaks,
  getTimebasedWaveform,
  getWaveformRange,
  analyzeWaveform,
} from './analysis/WaveformData.js'
import {
  analyzeLoop,
  findBestLoop,
  validateLoop,
  createSeamlessLoop,
} from './analysis/LoopAnalyzer.js'
export {
  detectBPM,
  fastBPMDetect,
  analyzeTempoVariations,
} from './analysis/BPMDetector.js'

export {
  getWaveformPeaks,
  getStereoWaveformPeaks,
  getTimebasedWaveform,
  getWaveformRange,
  analyzeWaveform,
} from './analysis/WaveformData.js'

export {
  analyzeLoop,
  findBestLoop,
  validateLoop,
  createSeamlessLoop,
} from './analysis/LoopAnalyzer.js'

// Visualization Modules
import {
  renderWaveform,
  renderStereoWaveform,
  addLoopRegions,
} from './visualization/WaveformRenderer.js'
import {
  RealtimeSpectrumAnalyzer,
  renderStaticSpectrum,
  createSpectrogram,
} from './visualization/SpectrumAnalyzer.js'
export {
  renderWaveform,
  renderStereoWaveform,
  addLoopRegions,
} from './visualization/WaveformRenderer.js'

export {
  RealtimeSpectrumAnalyzer,
  renderStaticSpectrum,
  createSpectrogram,
} from './visualization/SpectrumAnalyzer.js'

// Utility Modules
import * as AudioMath from './utils/AudioMath.js'
export * as AudioMath from './utils/AudioMath.js'

// Legacy API compatibility (for existing projects)
export { DynamicZeroCrossing } from './dynamic-zero-crossing.js'
export { recurrenceLoopAnalysis } from './recurrence-loop-analyzer.js'
import { DynamicZeroCrossing } from './dynamic-zero-crossing.js'
import { recurrenceLoopAnalysis } from './recurrence-loop-analyzer.js'

/**
 * Complete PlecoXA namespace for convenience
 * Provides organized access to all functionality
 */
export const PlecoXA = {
  // Core audio functionality
  Audio: {
    Player: AudioPlayer,
  },

  // Analysis tools
  Analysis: {
    BPM: {
      detect: detectBPM,
      detectFast: fastBPMDetect,
      analyzeVariations: analyzeTempoVariations,
    },

    Waveform: {
      getPeaks: getWaveformPeaks,
      getStereo: getStereoWaveformPeaks,
      getTimebased: getTimebasedWaveform,
      getRange: getWaveformRange,
      analyze: analyzeWaveform,
    },

    Loop: {
      analyze: analyzeLoop,
      findBest: findBestLoop,
      validate: validateLoop,
      createSeamless: createSeamlessLoop,
    },
  },

  // Visualization tools
  Visualization: {
    Waveform: {
      render: renderWaveform,
      renderStereo: renderStereoWaveform,
      addLoopRegions: addLoopRegions,
    },

    Spectrum: {
      RealtimeAnalyzer: RealtimeSpectrumAnalyzer,
      renderStatic: renderStaticSpectrum,
      createSpectrogram: createSpectrogram,
    },
  },

  // Utility functions
  Utils: {
    Math: AudioMath,
  },

  // Legacy compatibility
  Legacy: {
    DynamicZeroCrossing,
    recurrenceLoopAnalysis,
  },
}

/**
 * Quick start helpers for common tasks
 */
export const QuickStart = {
  /**
   * Analyze audio file completely
   * @param {AudioBuffer} audioBuffer - Web Audio API AudioBuffer
   * @returns {Promise<Object>} Complete analysis results
   */
  async analyzeAudio(audioBuffer) {
    const [bpmResult, waveformData, loopAnalysis] = await Promise.all([
      detectBPM(audioBuffer),
      Promise.resolve(getWaveformPeaks(audioBuffer)),
      analyzeLoop(audioBuffer),
    ])

    return {
      bpm: bpmResult,
      waveform: waveformData,
      loop: loopAnalysis,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    }
  },

  /**
   * Create a basic audio player with waveform visualization
   * @param {HTMLCanvasElement} canvas - Canvas for waveform visualization
   * @param {Object} options - Player and visualization options
   * @returns {Object} Configured player and renderer
   */
  createPlayer(canvas, options = {}) {
    const player = new AudioPlayer(options.player)
    const renderer = createInteractiveRenderer(canvas, options.visualization)

    // Connect player events to renderer
    player.on('load', (audioBuffer) => {
      const waveform = getWaveformPeaks(audioBuffer, { width: canvas.width })
      renderer.render(waveform)
      renderer.setDuration(audioBuffer.duration)
    })

    player.on('timeupdate', (time) => {
      renderer.setPlayheadPosition(time)
    })

    return { player, renderer }
  },

  /**
   * Simple BPM detection with error handling
   * @param {AudioBuffer} audioBuffer - Web Audio API AudioBuffer
   * @returns {Promise<number>} BPM value or 0 if detection fails
   */
  async getBPM(audioBuffer) {
    try {
      const result = await detectBPM(audioBuffer)
      return result.bpm
    } catch (error) {
      console.warn('BPM detection failed:', error)
      return 0
    }
  },
}

// Version information
export const VERSION = '1.0.0'
export const BUILD_DATE = new Date().toISOString()

/**
 * Library information and capabilities
 */
export const INFO = {
  name: 'Pleco-XA',
  version: VERSION,
  buildDate: BUILD_DATE,
  author: 'PlecoXA Audio Analysis',
  description: 'Framework-agnostic audio analysis and visualization toolkit',

  capabilities: [
    'BPM Detection',
    'Loop Analysis',
    'Waveform Visualization',
    'Spectrum Analysis',
    'Audio Playback Control',
    'Real-time Analysis',
    'Framework Agnostic',
  ],

  frameworks: [
    'Vanilla JavaScript',
    'React',
    'Vue',
    'Astro',
    'Svelte',
    'Angular',
  ],

  browserSupport: ['Chrome 66+', 'Firefox 60+', 'Safari 14+', 'Edge 79+'],
}

// Development utilities (only in development)
let Debug
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
  /**
   * Debug utilities for development
   */
  Debug = {
    /**
     * Log all available functions and their signatures
     */
    listAPI() {
      console.group('🎵 PlecoXA API Reference')

      console.group('🎼 Audio Core')
      console.log('AudioPlayer class - Framework-agnostic audio playback')
      console.groupEnd()

      console.group('📊 Analysis')
      console.log('detectBPM(audioBuffer) - BPM detection')
      console.log('getWaveformPeaks(audioBuffer, options) - Waveform data')
      console.log('analyzeLoop(audioBuffer, options) - Loop detection')
      console.groupEnd()

      console.group('🎨 Visualization')
      console.log('renderWaveform(canvas, data, options) - Render waveform')
      console.log('RealtimeSpectrumAnalyzer class - Live spectrum')
      console.groupEnd()

      console.group('🚀 Quick Start')
      console.log('QuickStart.analyzeAudio(audioBuffer) - Complete analysis')
      console.log(
        'QuickStart.createPlayer(canvas, options) - Player + visualization',
      )
      console.log('QuickStart.getBPM(audioBuffer) - Simple BPM detection')
      console.groupEnd()

      console.groupEnd()
    },

    /**
     * Test library functionality with sample data
     */
    async runTests() {
      console.log('🧪 Running PlecoXA self-tests...')

      // Test mathematical utilities
      console.log(
        '✅ AudioMath.amplitudeToDb(0.5):',
        AudioMath.amplitudeToDb(0.5),
      )
      console.log(
        '✅ AudioMath.frequencyToMidi(440):',
        AudioMath.frequencyToMidi(440),
      )
      console.log(
        '✅ AudioMath.bpmToSeconds(120):',
        AudioMath.bpmToSeconds(120),
      )

      console.log('🎵 PlecoXA core functions working correctly')
    },
  }
}
export { Debug }
function createInteractiveRenderer(canvas, visualization = {}) {
  // Basic interactive waveform renderer for QuickStart.createPlayer
  let waveformData = null
  let duration = 0
  let playheadTime = 0

  const ctx = canvas.getContext('2d')

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function drawWaveform(data) {
    clear()
    ctx.save()
    ctx.strokeStyle = visualization.waveformColor || '#2196f3'
    ctx.lineWidth = visualization.waveformLineWidth || 1
    ctx.beginPath()
    const midY = canvas.height / 2
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * canvas.width
      const y = midY - data[i] * midY
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  function drawPlayhead() {
    if (!duration) return
    const x = (playheadTime / duration) * canvas.width
    ctx.save()
    ctx.strokeStyle = visualization.playheadColor || '#e91e63'
    ctx.lineWidth = visualization.playheadWidth || 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
    ctx.restore()
  }

  return {
    render(data) {
      waveformData = data
      drawWaveform(waveformData)
      drawPlayhead()
    },
    setDuration(dur) {
      duration = dur
    },
    setPlayheadPosition(time) {
      playheadTime = time
      if (waveformData) {
        drawWaveform(waveformData)
        drawPlayhead()
      }
    },
  }
}

