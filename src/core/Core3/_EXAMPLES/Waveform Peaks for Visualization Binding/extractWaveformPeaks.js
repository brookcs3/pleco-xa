import { extractWaveformPeaks } from 'xa-audioio.js';

// Assuming audioData and sampleRate are already obtained from load()
const peaks = extractWaveformPeaks(audioData, { numPeaks: 500 });  // get 500 segments of min/max
// peaks is a Float32Array of length 1000 (pairs of [min, max] for each segment)

//  Draw waveform on a canvas
const canvas = document.getElementById('waveformCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
ctx.clearRect(0, 0, W, H);
const segWidth = W / (peaks.length / 2);
for (let i = 0; i < peaks.length; i += 2) {
  const min = peaks[i] * H/2;   // scale by half canvas height
  const max = peaks[i+1] * H/2;
  const x = (i/2) * segWidth;
  // draw a vertical line from min to max
  ctx.beginPath();
  ctx.moveTo(x, H/2 - min);
  ctx.lineTo(x, H/2 - max);
  ctx.strokeStyle = "#888";
  ctx.stroke();
}
