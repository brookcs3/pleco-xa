// pleco-xa/index.js
import AudioEngine from './core/AudioEngine.js';
import BPMDetector from './core/BPMDetector.js';
import Visualizer from './core/Visualizer.js';

class PlecoXA {
  constructor(options = {}) {
    this.audio = new AudioEngine(options.audioContext);
    this.bpm = new BPMDetector(this.audio);
    this.viz = new Visualizer(options.container);
    
    // Wire up reactive connections
    this.audio.on('load', () => this.bpm.analyze());
    this.audio.on('play', () => this.viz.start());
    this.bpm.on('beat', (data) => this.viz.pulse(data));
  }
  
  // Simple API
  async load(source) {
    return this.audio.load(source);
  }
  
  play() {
    return this.audio.play();
  }
  
  getBPM() {
    return this.bpm.current;
  }
}

// Export both class and convenience functions
export default PlecoXA;
export { AudioEngine, BPMDetector, Visualizer };