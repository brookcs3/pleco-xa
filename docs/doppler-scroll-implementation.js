// src/utils/DopplerScroll.js
import { Emitter } from './Emitter.js'

/**
 * DopplerScroll - Proprietary spatial audio scrolling system for BeaatsLoops
 * Creates realistic spatial audio transitions between loops with tempo sync
 */
export class DopplerScroll {
  constructor(options = {}) {
    this.options = {
      transitionZone: 0.33, // 33% of viewport height for transition
      crossoverPoint: 0.5, // 50% mark where master switches
      dopplerIntensity: 0.3, // Pitch shift intensity
      filterRange: { low: 20, high: 20000 }, // Hz
      ...options,
    }

    this.context = new AudioContext()
    this.emitter = new Emitter()

    // Audio nodes for each loop
    this.loops = {
      loop1: this.createLoopChain('loop1'),
      loop2: this.createLoopChain('loop2'),
    }

    // State management
    this.state = {
      currentMaster: 'loop1',
      scrollProgress: 0,
      isTransitioning: false,
      loop1Playing: false,
      loop2Playing: false,
    }

    // Tempo sync data
    this.tempoData = {
      loop1: { bpm: 0, beatGrid: [], loopPoints: {} },
      loop2: { bpm: 0, beatGrid: [], loopPoints: {} },
    }

    this.bindEvents()
  }

  /**
   * Creates audio processing chain for a loop
   */
  createLoopChain(loopId) {
    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    const filter = this.context.createBiquadFilter()
    const pitchShift = this.context.createScriptProcessor(4096, 1, 1)
    const spatialPanner = this.context.createStereoPanner()
    const convolver = this.context.createConvolver() // For spatial reverb

    // Initial settings
    gain.gain.value = loopId === 'loop1' ? 1 : 0
    filter.type = loopId === 'loop1' ? 'highpass' : 'lowpass'
    filter.frequency.value = loopId === 'loop1' ? 20 : 20000

    // Connect chain
    source.connect(filter)
    filter.connect(pitchShift)
    pitchShift.connect(spatialPanner)
    spatialPanner.connect(gain)
    gain.connect(convolver)
    convolver.connect(this.context.destination)

    // Pitch shift processing (simple implementation)
    let phase = 0
    pitchShift.onaudioprocess = (e) => {
      if (!this.state.isTransitioning) {
        e.outputBuffer.copyToChannel(e.inputBuffer.getChannelData(0), 0)
        return
      }

      const input = e.inputBuffer.getChannelData(0)
      const output = e.outputBuffer.getChannelData(0)
      const pitchFactor = this.calculatePitchFactor(loopId)

      for (let i = 0; i < input.length; i++) {
        const sampleIndex = Math.floor(phase)
        if (sampleIndex < input.length) {
          output[i] = input[sampleIndex]
        }
        phase += pitchFactor
        if (phase >= input.length) phase -= input.length
      }
    }

    return {
      source,
      gain,
      filter,
      pitchShift,
      spatialPanner,
      convolver,
      buffer: null,
    }
  }

  /**
   * Load audio buffers for both loops
   */
  async loadLoops(loop1Url, loop2Url) {
    try {
      const [buffer1, buffer2] = await Promise.all([
        this.loadAudioBuffer(loop1Url),
        this.loadAudioBuffer(loop2Url),
      ])

      this.loops.loop1.buffer = buffer1
      this.loops.loop2.buffer = buffer2

      // Analyze loops for tempo and beat grid
      await this.analyzeLoops()

      this.emitter.emit('loopsLoaded', { loop1: buffer1, loop2: buffer2 })
    } catch (error) {
      console.error('Error loading loops:', error)
      this.emitter.emit('loadError', error)
    }
  }

  /**
   * Load and decode audio buffer
   */
  async loadAudioBuffer(url) {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return await this.context.decodeAudioData(arrayBuffer)
  }

  /**
   * Analyze loops for tempo synchronization
   */
  async analyzeLoops() {
    // This would integrate with your existing loop analysis
    // For now, using placeholder analysis
    const analyzeBuffer = (buffer, loopId) => {
      // Simplified beat detection
      const sampleRate = buffer.sampleRate
      const channelData = buffer.getChannelData(0)

      // Find peaks for beat detection
      const peaks = this.findPeaks(channelData, sampleRate)
      const tempo = this.detectTempo(peaks, sampleRate)

      this.tempoData[loopId] = {
        bpm: tempo,
        beatGrid: peaks,
        loopPoints: {
          start: 0,
          end: buffer.duration,
        },
      }
    }

    analyzeBuffer(this.loops.loop1.buffer, 'loop1')
    analyzeBuffer(this.loops.loop2.buffer, 'loop2')
  }

  /**
   * Simple peak detection for beat analysis
   */
  findPeaks(channelData, sampleRate, threshold = 0.3) {
    const peaks = []
    const minDistance = sampleRate * 0.1 // Min 100ms between peaks

    for (let i = 1; i < channelData.length - 1; i++) {
      const current = Math.abs(channelData[i])
      const previous = Math.abs(channelData[i - 1])
      const next = Math.abs(channelData[i + 1])

      if (current > threshold && current > previous && current > next) {
        if (peaks.length === 0 || i - peaks[peaks.length - 1] > minDistance) {
          peaks.push(i)
        }
      }
    }

    return peaks
  }

  /**
   * Detect tempo from peaks
   */
  detectTempo(peaks, sampleRate) {
    if (peaks.length < 2) return 120 // Default BPM

    const intervals = []
    for (let i = 1; i < peaks.length; i++) {
      intervals.push((peaks[i] - peaks[i - 1]) / sampleRate)
    }

    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length
    return Math.round(60 / avgInterval)
  }

  /**
   * Update audio parameters based on scroll position
   */
  updateScroll(scrollProgress) {
    this.state.scrollProgress = scrollProgress

    // Determine which zone we're in
    const zone = this.getScrollZone(scrollProgress)

    switch (zone) {
      case 'page1':
        this.setPage1State()
        break
      case 'transition':
        this.setTransitionState(scrollProgress)
        break
      case 'page3':
        this.setPage3State()
        break
    }

    this.emitter.emit('scrollUpdate', {
      progress: scrollProgress,
      zone,
      state: this.state,
    })
  }

  /**
   * Determine current scroll zone
   */
  getScrollZone(progress) {
    if (progress < 0.33) return 'page1'
    if (progress > 0.66) return 'page3'
    return 'transition'
  }

  /**
   * Page 1 state - Loop 1 is master
   */
  setPage1State() {
    this.state.currentMaster = 'loop1'
    this.state.isTransitioning = false

    // Loop 1: Full spectrum, 100% volume
    this.loops.loop1.gain.gain.linearRampToValueAtTime(
      1,
      this.context.currentTime + 0.1,
    )
    this.loops.loop1.filter.frequency.linearRampToValueAtTime(
      20,
      this.context.currentTime + 0.1,
    )

    // Loop 2: Silent
    this.loops.loop2.gain.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + 0.1,
    )
  }

  /**
   * Transition state - Crossfading and effects
   */
  setTransitionState(progress) {
    this.state.isTransitioning = true

    // Calculate transition progress (0-1 within transition zone)
    const transitionProgress = (progress - 0.33) / 0.33

    // Volume crossfade
    const loop1Volume = 1 - transitionProgress * 0.8 // 100% -> 20%
    const loop2Volume = transitionProgress * 0.8 // 0% -> 80%

    this.loops.loop1.gain.gain.linearRampToValueAtTime(
      loop1Volume,
      this.context.currentTime + 0.05,
    )
    this.loops.loop2.gain.gain.linearRampToValueAtTime(
      loop2Volume,
      this.context.currentTime + 0.05,
    )

    // Filter frequencies
    const loop1HighpassFreq = 20 + transitionProgress * 980 // 20Hz -> 1000Hz
    const loop2LowpassFreq = 20000 - transitionProgress * 15000 // 20kHz -> 5kHz

    this.loops.loop1.filter.frequency.linearRampToValueAtTime(
      loop1HighpassFreq,
      this.context.currentTime + 0.05,
    )
    this.loops.loop2.filter.frequency.linearRampToValueAtTime(
      loop2LowpassFreq,
      this.context.currentTime + 0.05,
    )

    // Spatial positioning
    const spatialPosition = (transitionProgress - 0.5) * 2 // -1 to 1
    this.loops.loop1.spatialPanner.pan.linearRampToValueAtTime(
      -spatialPosition * 0.5,
      this.context.currentTime + 0.05,
    )
    this.loops.loop2.spatialPanner.pan.linearRampToValueAtTime(
      spatialPosition * 0.5,
      this.context.currentTime + 0.05,
    )

    // Master switching at 50%
    if (transitionProgress >= 0.5 && this.state.currentMaster === 'loop1') {
      this.switchMaster('loop2')
    } else if (
      transitionProgress < 0.5 &&
      this.state.currentMaster === 'loop2'
    ) {
      this.switchMaster('loop1')
    }
  }

  /**
   * Page 3 state - Loop 2 is master
   */
  setPage3State() {
    this.state.currentMaster = 'loop2'
    this.state.isTransitioning = false

    // Loop 1: Silent
    this.loops.loop1.gain.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + 0.1,
    )

    // Loop 2: Full spectrum, 100% volume
    this.loops.loop2.gain.gain.linearRampToValueAtTime(
      1,
      this.context.currentTime + 0.1,
    )
    this.loops.loop2.filter.frequency.linearRampToValueAtTime(
      20000,
      this.context.currentTime + 0.1,
    )
  }

  /**
   * Switch master loop and sync tempo
   */
  switchMaster(newMaster) {
    const oldMaster = this.state.currentMaster
    this.state.currentMaster = newMaster

    // Sync slave loop to master tempo
    this.syncTempo(newMaster, oldMaster)

    this.emitter.emit('masterSwitch', { from: oldMaster, to: newMaster })
  }

  /**
   * Sync slave loop tempo to master
   */
  syncTempo(master, slave) {
    const masterTempo = this.tempoData[master].bpm
    const slaveTempo = this.tempoData[slave].bpm
    const tempoRatio = masterTempo / slaveTempo

    // Adjust playback rate of slave to match master
    if (this.loops[slave].source.playbackRate) {
      this.loops[slave].source.playbackRate.linearRampToValueAtTime(
        tempoRatio,
        this.context.currentTime + 0.5,
      )
    }
  }

  /**
   * Calculate pitch factor for doppler effect
   */
  calculatePitchFactor(loopId) {
    if (!this.state.isTransitioning) return 1

    const transitionProgress = (this.state.scrollProgress - 0.33) / 0.33
    const dopplerAmount = this.options.dopplerIntensity

    if (loopId === 'loop1') {
      // Moving away - pitch down
      return 1 - transitionProgress * dopplerAmount
    } else {
      // Moving towards - pitch up
      return 1 + (1 - transitionProgress) * dopplerAmount
    }
  }

  /**
   * Start playing both loops
   */
  play() {
    // Create new sources
    this.loops.loop1.source = this.context.createBufferSource()
    this.loops.loop2.source = this.context.createBufferSource()

    // Set buffers
    this.loops.loop1.source.buffer = this.loops.loop1.buffer
    this.loops.loop2.source.buffer = this.loops.loop2.buffer

    // Enable looping
    this.loops.loop1.source.loop = true
    this.loops.loop2.source.loop = true

    // Reconnect chains
    this.reconnectLoop('loop1')
    this.reconnectLoop('loop2')

    // Start playback
    this.loops.loop1.source.start(0)
    this.loops.loop2.source.start(0)

    this.state.loop1Playing = true
    this.state.loop2Playing = true

    this.emitter.emit('playbackStarted')
  }

  /**
   * Stop playback
   */
  stop() {
    if (this.state.loop1Playing) {
      this.loops.loop1.source.stop()
      this.state.loop1Playing = false
    }

    if (this.state.loop2Playing) {
      this.loops.loop2.source.stop()
      this.state.loop2Playing = false
    }

    this.emitter.emit('playbackStopped')
  }

  /**
   * Reconnect audio chain for a loop
   */
  reconnectLoop(loopId) {
    const loop = this.loops[loopId]
    loop.source.connect(loop.filter)
    // Chain is already connected from initialization
  }

  /**
   * Bind scroll events
   */
  bindEvents() {
    // This would integrate with Lenis smooth scroll
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY
      const maxScroll = document.body.scrollHeight - window.innerHeight
      const progress = Math.min(scrollY / maxScroll, 1)

      this.updateScroll(progress)
    })
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop()
    this.context.close()
    this.emitter.removeAllListeners()
  }
}
