import { exampleBuffer, detectBPM } from './analysis/index.js';  // using central loader

// 1. Load an example audio buffer (e.g., "vibeace" from the built-in examples)
const audioCtx = new AudioContext();
const audioBuffer = await exampleBuffer('vibeace', false, audioCtx);  // loads and decodes the audio

// 2. Run BPM detection on the AudioBuffer
const result = await detectBPM(audioBuffer, { minBPM: 80, maxBPM: 160 });
console.log(`Detected BPM: ${result.bpm}`);  
console.log(`Confidence: ${Math.round(result.confidence * 100)}%`);
// 3. Use the returned beats array (in seconds) for something, e.g., log first few beats:
console.log('First few beat timestamps:', result.beats.slice(0, 5));
