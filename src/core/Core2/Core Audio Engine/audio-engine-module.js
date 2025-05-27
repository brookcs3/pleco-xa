/**
 * AudioEngine.js - Core audio loading and playback
 * Handles Web Audio API context, file loading, and playback control
 */

import EventEmitter from 'events';

export default class AudioEngine extends EventEmitter {
  constructor(audioContext = null) {
    super();
    this.context = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    this.buffer = null;
    this.source = null;
    this.gainNode = null;
    
    // State
    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = 0;
    this.pauseTime = 0;
    this.duration = 0;
    
    // Settings
    this.volume = 1.0;
    this.loop = false;
    
    this._setupAudioGraph();
  }
  
  /**
   * Setup audio graph with gain control
   */
  _setupAudioGraph() {
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
  }
  
  /**
   * Load audio from various sources
   * @param {string|File|ArrayBuffer|AudioBuffer} source
   */
  async load(source) {
    try {
      this.emit('loading');
      
      let audioBuffer;
      
      if (source instanceof AudioBuffer) {
        audioBuffer = source;
      } else if (source instanceof ArrayBuffer) {
        audioBuffer = await this.context.decodeAudioData(source.slice(0));
      } else if (source instanceof File || source instanceof Blob) {
        const arrayBuffer = await source.arrayBuffer();
        audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      } else if (typeof source === 'string') {
        // URL
        const response = await fetch(source);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      } else {
        throw new Error('Invalid audio source type');
      }
      
      this.buffer = audioBuffer;
      this.duration = audioBuffer.duration;
      
      this.emit('loaded', {
        duration: this.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      });
      
      return audioBuffer;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Start or resume playback
   */
  play() {
    if (!this.buffer) {
      throw new Error('No audio loaded');
    }
    
    if (this.isPlaying) return;
    
    // Resume context if suspended
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    
    // Create new source
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = this.loop;
    
    // Connect to audio graph
    this.source.connect(this.gainNode);
    
    // Handle end event
    this.source.onended = () => {
      if (this.isPlaying && !this.loop) {
        this.stop();
        this.emit('ended');
      }
    };
    
    // Start playback
    const offset = this.isPaused ? this.pauseTime : 0;
    this.source.start(0, offset);
    
    this.startTime = this.context.currentTime - offset;
    this.isPlaying = true;
    this.isPaused = false;
    
    this.emit('play', { time: this.getCurrentTime() });
    this._startProgressTracking();
  }
  
  /**
   * Pause playback
   */
  pause() {
    if (!this.isPlaying || this.isPaused) return;
    
    this.pauseTime = this.getCurrentTime();
    this._stopSource();
    
    this.isPaused = true;
    this.emit('pause', { time: this.pauseTime });
  }
  
  /**
   * Stop playback and reset
   */
  stop() {
    this._stopSource();
    
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseTime = 0;
    
    this.emit('stop');
  }
  
  /**
   * Seek to specific time
   * @param {number} time - Time in seconds
   */
  seek(time) {
    const wasPlaying = this.isPlaying;
    
    if (wasPlaying) {
      this.stop();
    }
    
    this.pauseTime = Math.max(0, Math.min(time, this.duration));
    
    if (wasPlaying) {
      this.play();
    }
    
    this.emit('seek', { time: this.pauseTime });
  }
  
  /**
   * Get current playback time
   */
  getCurrentTime() {
    if (!this.isPlaying) {
      return this.pauseTime;
    }
    
    const elapsed = this.context.currentTime - this.startTime;
    return Math.min(elapsed, this.duration);
  }
  
  /**
   * Set volume (0-1)
   */
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    this.gainNode.gain.value = this.volume;
    this.emit('volumechange', { volume: this.volume });
  }
  
  /**
   * Toggle loop mode
   */
  setLoop(enabled) {
    this.loop = enabled;
    if (this.source) {
      this.source.loop = enabled;
    }
  }
  
  /**
   * Get audio data for analysis
   */
  getChannelData(channel = 0) {
    if (!this.buffer) return null;
    return this.buffer.getChannelData(channel);
  }
  
  /**
   * Get frequency data at current time
   */
  getFrequencyData() {
    if (!this.isPlaying || !this.source) return null;
    
    const analyser = this.context.createAnalyser();
    this.source.connect(analyser);
    analyser.fftSize = 2048;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    return dataArray;
  }
  
  /**
   * Internal: stop source node
   */
  _stopSource() {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (e) {
        // Source may already be stopped
      }
      this.source = null;
    }
    
    this._stopProgressTracking();
  }
  
  /**
   * Internal: track playback progress
   */
  _startProgressTracking() {
    const updateProgress = () => {
      if (!this.isPlaying) return;
      
      this.emit('timeupdate', {
        currentTime: this.getCurrentTime(),
        duration: this.duration,
        progress: this.getCurrentTime() / this.duration
      });
      
      this._progressFrame = requestAnimationFrame(updateProgress);
    };
    
    updateProgress();
  }
  
  /**
   * Internal: stop progress tracking
   */
  _stopProgressTracking() {
    if (this._progressFrame) {
      cancelAnimationFrame(this._progressFrame);
      this._progressFrame = null;
    }
  }
  
  /**
   * Cleanup resources
   */
  dispose() {
    this.stop();
    
    if (this.context.state !== 'closed') {
      this.context.close();
    }
    
    this.removeAllListeners();
  }
}

// Convenience factory
export function createAudioEngine(options = {}) {
  return new AudioEngine(options.audioContext);
}