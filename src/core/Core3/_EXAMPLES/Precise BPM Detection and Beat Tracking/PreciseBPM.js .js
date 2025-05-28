import { load, toMono } from 'xa-audioio.js';
import { beatTrack } from 'xa-beat.js';

// 1. Load an audio file (could be URL or File object) and get mono audio data
const audioFile = document.getElementById('fileInput').files[0];  // example: file input
const { y: audioData, sr: sampleRate } = await load(audioFile, { sr: 44100, mono: true });

// 2. Run beat tracking to get BPM and beat times
const beatInfo = beatTrack(audioData, sampleRate, { hopLength: 512 });
console.log(`Detected BPM: ${beatInfo.tempo.toFixed(1)} (Confidence: ${Math.round(beatInfo.confidence*100)}%)`);
console.log("Beat times:", beatInfo.beats);
