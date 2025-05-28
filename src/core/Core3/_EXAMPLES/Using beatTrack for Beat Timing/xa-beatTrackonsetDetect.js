import { beatTrack, onsetDetect } from './analysis/index.js';

// Suppose we already have an AudioBuffer from some source:
const audioBuffer = myLoadedAudio;  // e.g., obtained from file input or fetch+decode
const audioData = audioBuffer.getChannelData(0);  // take first channel (Float32Array)
const sr = audioBuffer.sampleRate;

// 1. Use beatTrack to get the beats and tempo
const beatInfo = beatTrack(audioData, sr, { startBpm: 0 });
console.log(`Estimated Tempo: ${beatInfo.tempo} BPM, Confidence: ${beatInfo.confidence}`);

// 2. The beats array in beatInfo is already in seconds (default units='time'):
beatInfo.beats.forEach(time => {
  console.log(`Beat at ${time.toFixed(2)} sec`);
});

// (Optional) 3. If you want to visualize or utilize the onset strength:
console.log('Onset strength at frame 0:', beatInfo.onsetStrength[0]);
