import { createAudioContext, loadFile, detectBPM, clicks, play, stop } from './analysis/index.js';

// Step 1: Load a local audio file from an <input type="file">
const fileInput = document.querySelector('#audioFile');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const audioCtx = createAudioContext();
  const buffer = await loadFile(file, audioCtx);
  console.log(`Loaded "${file.name}" (${buffer.duration.toFixed(1)} sec)`);

  // Step 2: Analyze BPM
  const result = await detectBPM(buffer);
  console.log(`Tempo: ${result.bpm} BPM (confidence ${Math.round(result.confidence*100)}%)`);

  // Step 3: Synthesize click track at the beat times
  const clickTrack = clicks({ times: result.beats, sr: buffer.sampleRate });
  
  // Step 4: Play the original audio
  play.call({/* ensure using the module's context */}, { loop: false });
  // (Internally, play() uses the last loaded audio in xa-audioio.currentAudioBuffer)
  
  // Optionally, play the click track alongside using Web Audio (not shown: would need mixing).
});
