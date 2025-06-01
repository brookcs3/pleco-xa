// src/utils/SpatialAudio.js

/**
 * SpatialAudio - 3D positioning and doppler effects for scroll-based audio
 */
export class SpatialAudio {
  constructor(audioContext) {
    this.context = audioContext
    this.listener = this.context.listener

    // Virtual space dimensions
    this.space = {
      width: 10, // meters
      height: 20, // meters (scroll distance)
      depth: 5, // meters
    }

    // Doppler effect parameters
    this.doppler = {
      factor: 1,
      speedOfSound: 343.3, // m/s
      scrollVelocity: 0,
      lastScrollY: 0,
      lastTime: performance.now(),
    }

    // Reverb impulse responses for different distances
    this.reverbImpulses = {
      near: null,
      mid: null,
      far: null,
    }

    this.initializeSpace()
  }

  /**
   * Initialize 3D audio space
   */
  initializeSpace() {
    // Set up listener (user) position
    if (this.listener.positionX) {
      // Modern API
      this.listener.positionX.value = 0
      this.listener.positionY.value = 0
      this.listener.positionZ.value = 0

      this.listener.forwardX.value = 0
      this.listener.forwardY.value = 0
      this.listener.forwardZ.value = -1

      this.listener.upX.value = 0
      this.listener.upY.value = 1
      this.listener.upZ.value = 0
    } else {
      // Legacy API
      this.listener.setPosition(0, 0, 0)
      this.listener.setOrientation(0, 0, -1, 0, 1, 0)
    }

    // Load reverb impulses
    this.loadReverbImpulses()
  }

  /**
   * Create spatial audio node for a loop
   */
  createSpatialNode(position = { x: 0, y: 0, z: 0 }) {
    // Create panner node
    const panner = this.context.createPanner()

    // Configure panner
    panner.panningModel = 'HRTF' // Head-related transfer function
    panner.distanceModel = 'inverse'
    panner.refDistance = 1
    panner.maxDistance = 100
    panner.rolloffFactor = 1
    panner.coneInnerAngle = 360
    panner.coneOuterAngle = 360
    panner.coneOuterGain = 0

    // Set initial position
    this.setNodePosition(panner, position)

    // Create associated nodes
    const dopplerShifter = this.createDopplerNode()
    const distanceFilter = this.createDistanceFilter()
    const reverb = this.createReverbNode()

    return {
      panner,
      dopplerShifter,
      distanceFilter,
      reverb,
      position,
    }
  }

  /**
   * Set position of audio node
   */
  setNodePosition(panner, position) {
    if (panner.positionX) {
      // Modern API
      panner.positionX.value = position.x
      panner.positionY.value = position.y
      panner.positionZ.value = position.z
    } else {
      // Legacy API
      panner.setPosition(position.x, position.y, position.z)
    }
  }

  /**
   * Create doppler effect node
   */
  createDopplerNode() {
    // Use delay node for simple doppler
    const delay = this.context.createDelay(1)
    delay.delayTime.value = 0

    // Pitch shifter using script processor (will be replaced with AudioWorklet)
    const pitchShifter = this.context.createScriptProcessor(4096, 1, 1)

    let phase = 0
    let lastPitchFactor = 1

    pitchShifter.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const output = e.outputBuffer.getChannelData(0)
      const pitchFactor = pitchShifter.pitchFactor || 1

      // Smooth pitch changes
      const smoothFactor = 0.95
      const currentPitchFactor =
        lastPitchFactor * smoothFactor + pitchFactor * (1 - smoothFactor)
      lastPitchFactor = currentPitchFactor

      // Simple pitch shifting
      for (let i = 0; i < output.length; i++) {
        const sampleIndex = Math.floor(phase)
        if (sampleIndex < input.length) {
          output[i] = input[sampleIndex]
        } else {
          output[i] = 0
        }

        phase += currentPitchFactor
        if (phase >= input.length) {
          phase -= input.length
        }
      }
    }

    return { delay, pitchShifter }
  }

  /**
   * Create distance-based filter
   */
  createDistanceFilter() {
    // High frequencies attenuate with distance
    const filter = this.context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 20000 // Start with full spectrum
    filter.Q.value = 1

    return filter
  }

  /**
   * Create reverb node
   */
  createReverbNode() {
    const convolver = this.context.createConvolver()
    const wetGain = this.context.createGain()
    const dryGain = this.context.createGain()

    wetGain.gain.value = 0
    dryGain.gain.value = 1

    return {
      convolver,
      wetGain,
      dryGain,
    }
  }

  /**
   * Update spatial parameters based on scroll
   */
  updateScrollPosition(scrollProgress, scrollVelocity) {
    const currentTime = performance.now()
    const deltaTime = (currentTime - this.doppler.lastTime) / 1000 // Convert to seconds

    // Update listener position (user moves through space)
    const listenerY = scrollProgress * this.space.height

    if (this.listener.positionY) {
      this.listener.positionY.value = listenerY
    } else {
      this.listener.setPosition(0, listenerY, 0)
    }

    // Calculate velocity for doppler
    this.doppler.scrollVelocity =
      scrollVelocity || (listenerY - this.doppler.lastScrollY) / deltaTime

    this.doppler.lastScrollY = listenerY
    this.doppler.lastTime = currentTime
  }

  /**
   * Update spatial node based on scroll position
   */
  updateSpatialNode(spatialNode, loopId, scrollProgress) {
    const { panner, dopplerShifter, distanceFilter, reverb, position } =
      spatialNode

    // Calculate distance from listener
    const listenerY = scrollProgress * this.space.height
    const distance = Math.abs(position.y - listenerY)

    // Update doppler effect
    const dopplerFactor = this.calculateDopplerFactor(position.y, listenerY)
    dopplerShifter.pitchShifter.pitchFactor = dopplerFactor

    // Update distance filter (high frequencies roll off with distance)
    const maxFreq = 20000
    const minFreq = 2000
    const filterFreq =
      maxFreq - (distance / this.space.height) * (maxFreq - minFreq)
    distanceFilter.frequency.linearRampToValueAtTime(
      filterFreq,
      this.context.currentTime + 0.1,
    )

    // Update reverb mix based on distance
    const reverbAmount = Math.min(distance / this.space.height, 1) * 0.3
    reverb.wetGain.gain.linearRampToValueAtTime(
      reverbAmount,
      this.context.currentTime + 0.1,
    )
    reverb.dryGain.gain.linearRampToValueAtTime(
      1 - reverbAmount,
      this.context.currentTime + 0.1,
    )

    // Select appropriate reverb impulse
    this.updateReverbImpulse(reverb.convolver, distance)
  }

  /**
   * Calculate doppler factor based on relative motion
   */
  calculateDopplerFactor(sourceY, listenerY) {
    const relativeVelocity = this.doppler.scrollVelocity
    const distance = Math.abs(sourceY - listenerY)

    // Simplified doppler calculation
    const approachingSource =
      (sourceY > listenerY && relativeVelocity > 0) ||
      (sourceY < listenerY && relativeVelocity < 0)

    const velocityRatio = Math.abs(relativeVelocity) / this.doppler.speedOfSound
    const dopplerShift = approachingSource
      ? 1 + velocityRatio
      : 1 - velocityRatio

    // Limit the effect
    return Math.max(0.8, Math.min(1.2, dopplerShift))
  }

  /**
   * Update reverb impulse based on distance
   */
  updateReverbImpulse(convolver, distance) {
    const normalizedDistance = distance / this.space.height

    let impulse
    if (normalizedDistance < 0.33) {
      impulse = this.reverbImpulses.near
    } else if (normalizedDistance < 0.66) {
      impulse = this.reverbImpulses.mid
    } else {
      impulse = this.reverbImpulses.far
    }

    if (impulse && convolver.buffer !== impulse) {
      convolver.buffer = impulse
    }
  }

  /**
   * Load reverb impulse responses
   */
  async loadReverbImpulses() {
    // Generate synthetic impulse responses
    this.reverbImpulses.near = this.generateImpulseResponse(0.5, 0.7)
    this.reverbImpulses.mid = this.generateImpulseResponse(1.5, 0.5)
    this.reverbImpulses.far = this.generateImpulseResponse(3, 0.3)
  }

  /**
   * Generate synthetic impulse response
   */
  generateImpulseResponse(duration, decay) {
    const length = this.context.sampleRate * duration
    const impulse = this.context.createBuffer(
      2,
      length,
      this.context.sampleRate,
    )

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)

      for (let i = 0; i < length; i++) {
        // Exponential decay
        const envelope = Math.pow(1 - i / length, decay)

        // Add some early reflections
        if (i < length * 0.1) {
          channelData[i] = (Math.random() * 2 - 1) * envelope * 0.5
        } else {
          // Diffuse reverb tail
          channelData[i] = (Math.random() * 2 - 1) * envelope * 0.2
        }
      }
    }

    return impulse
  }

  /**
   * Calculate smooth scroll velocity
   */
  calculateScrollVelocity(currentScroll, previousScroll, deltaTime) {
    const pixelsPerSecond = (currentScroll - previousScroll) / deltaTime
    const metersPerSecond =
      (pixelsPerSecond / window.innerHeight) * this.space.height

    // Smooth the velocity
    const smoothing = 0.8
    return (
      this.doppler.scrollVelocity * smoothing +
      metersPerSecond * (1 - smoothing)
    )
  }

  /**
   * Create binaural panning effect
   */
  createBinauralPanner(angle) {
    const splitter = this.context.createChannelSplitter(2)
    const merger = this.context.createChannelMerger(2)
    const leftDelay = this.context.createDelay(0.001)
    const rightDelay = this.context.createDelay(0.001)

    // Calculate interaural time difference (ITD)
    const headRadius = 0.0875 // meters
    const speedOfSound = 343.3 // m/s
    const maxITD = headRadius / speedOfSound

    const itd = Math.sin((angle * Math.PI) / 180) * maxITD

    if (itd > 0) {
      rightDelay.delayTime.value = itd
    } else {
      leftDelay.delayTime.value = -itd
    }

    // Connect nodes
    splitter.connect(leftDelay, 0)
    splitter.connect(rightDelay, 1)
    leftDelay.connect(merger, 0, 0)
    rightDelay.connect(merger, 0, 1)

    return { splitter, merger, input: splitter, output: merger }
  }
}
