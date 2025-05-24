// Modified script.js for local file upload and audio processing
import { trackLibrary } from './analytics.js';
import { enhancePlayers } from './audiojs-loader.js';

let AudioGraph;
let graph;
let Tone;
let uploadedTracks = [];

function trackEvent(action, label) {
  console.log('track', action, label);
}

async function loadAudioGraph() {
  if (!AudioGraph) {
    const mod = await import('./customAudioLib.js');
    AudioGraph = mod.AudioGraph;
    graph = new AudioGraph();
  }
  return graph;
}

async function loadTone() {
  if (!Tone) {
    // Load Tone.js from CDN if not available
    if (!window.Tone) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/tone@15.1.22/build/Tone.js';
      document.head.appendChild(script);
      await new Promise(resolve => script.onload = resolve);
    }
    Tone = window.Tone;
  }
  return Tone;
}

// Process uploaded audio file
async function processAudioFile(file) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Apply our 2023 loop analysis
    const loopPoints = await analyzeLoopPoints(audioBuffer);
    
    // Create object URL for playback
    const url = URL.createObjectURL(file);
    
    const track = {
      url: url,
      filename: file.name,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      loopStart: loopPoints.loopStart,
      loopEnd: loopPoints.loopEnd,
      buffer: audioBuffer
    };
    
    console.log('🎵 Processed audio:', track);
    return track;
    
  } catch (error) {
    console.error('❌ Audio processing error:', error);
    throw error;
  }
}

// Loop analysis algorithm from our 2023 research
async function analyzeLoopPoints(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = channelData.length;
  
  // Window size for analysis (0.5 seconds max)
  const window = Math.min(Math.floor(sampleRate * 0.5), Math.floor(totalSamples / 2));
  
  // Get start and end slices
  const startSlice = applyHannWindow(channelData.subarray(0, window));
  const endSlice = applyHannWindow(channelData.subarray(totalSamples - window));
  
  // Cross-correlation analysis
  let bestOffset = 0;
  let bestScore = -Infinity;
  
  for (let offset = 0; offset < window; offset++) {
    let score = 0;
    for (let i = 0; i < window - offset; i++) {
      score += startSlice[i] * endSlice[i + offset];
    }
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  
  // Find zero crossings for clean loop points
  const startIndex = findZeroCrossing(channelData, 0);
  const endIndex = findZeroCrossing(channelData, totalSamples - window + bestOffset);
  
  return {
    loopStart: startIndex / sampleRate,
    loopEnd: endIndex / sampleRate,
    confidence: bestScore / window
  };
}

function applyHannWindow(data) {
  const windowed = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (data.length - 1)));
    windowed[i] = data[i] * window;
  }
  return windowed;
}

function findZeroCrossing(data, startIndex) {
  for (let i = startIndex; i < data.length - 1; i++) {
    if (data[i] >= 0 && data[i + 1] < 0) {
      return i;
    }
  }
  return startIndex;
}

// Create enhanced audio element with loop points
function createAudioElement(track) {
  const container = document.createElement('div');
  container.className = 'track-item';
  
  const audio = document.createElement('audio');
  audio.src = track.url;
  audio.controls = true;
  audio.loop = true;
  audio.preload = 'metadata';
  
  // Add loop point information
  const info = document.createElement('div');
  info.className = 'track-info';
  info.innerHTML = `
    <h3>${track.filename}</h3>
    <p>Duration: ${track.duration.toFixed(2)}s</p>
    <p>Loop Start: ${track.loopStart.toFixed(3)}s</p>
    <p>Loop End: ${track.loopEnd.toFixed(3)}s</p>
    <p>Sample Rate: ${track.sampleRate} Hz</p>
  `;
  
  // Add visualization canvas
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 100;
  canvas.className = 'waveform';
  
  // Draw simple waveform
  drawWaveform(canvas, track.buffer);
  
  container.appendChild(info);
  container.appendChild(audio);
  container.appendChild(canvas);
  
  return container;
}

function drawWaveform(canvas, audioBuffer) {
  const ctx = canvas.getContext('2d');
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / canvas.width);
  
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = '#0f0';
  ctx.beginPath();
  
  for (let i = 0; i < canvas.width; i++) {
    const min = Math.min(...data.slice(i * step, (i + 1) * step));
    const max = Math.max(...data.slice(i * step, (i + 1) * step));
    
    const yMin = (min + 1) * canvas.height / 2;
    const yMax = (max + 1) * canvas.height / 2;
    
    ctx.moveTo(i, yMin);
    ctx.lineTo(i, yMax);
  }
  
  ctx.stroke();
}

async function displayTracks() {
  const container = document.getElementById('tracks');
  container.innerHTML = '';
  
  // Add demo track first
  const demoTrack = {
    url: 'audio/Bassline For Doppler Song - 11.aif',
    filename: 'Bassline For Doppler Song - 11.aif (Demo)',
    duration: 12.0,
    loopStart: 0.0,
    loopEnd: 12.0,
    sampleRate: 44100
  };
  
  const demoElement = document.createElement('div');
  demoElement.className = 'track-item';
  demoElement.innerHTML = `
    <div class="track-info">
      <h3>${demoTrack.filename}</h3>
      <p>Demo track - Duration: ${demoTrack.duration}s</p>
    </div>
    <audio controls loop>
      <source src="${demoTrack.url}" type="audio/aiff">
    </audio>
  `;
  container.appendChild(demoElement);
  
  // Add uploaded tracks
  uploadedTracks.forEach((track, idx) => {
    const element = createAudioElement(track);
    container.appendChild(element);
  });
  
  await enhancePlayers();
}

// Handle file upload
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  
  if (!file) return;
  
  try {
    console.log('🎵 Processing uploaded file:', file.name);
    trackEvent('upload', file.name);
    
    // Show loading
    const container = document.getElementById('tracks');
    const loading = document.createElement('div');
    loading.textContent = 'Processing audio...';
    loading.className = 'loading';
    container.appendChild(loading);
    
    // Process the audio file
    const track = await processAudioFile(file);
    uploadedTracks.push(track);
    
    // Remove loading and refresh display
    loading.remove();
    await displayTracks();
    
    // Clear input
    fileInput.value = '';
    
    // Try to load with AudioGraph for advanced playback
    try {
      const g = await loadAudioGraph();
      console.log('✅ AudioGraph loaded for advanced playback');
    } catch (e) {
      console.warn('⚠️ AudioGraph not available:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    alert('Failed to process audio file: ' + error.message);
  }
});

// Modal handlers
document.getElementById('openModal').addEventListener('click', () => {
  document.getElementById('modalBackdrop').style.display = 'flex';
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('modalBackdrop').style.display = 'none';
});

document.getElementById('openAmbition').addEventListener('click', () => {
  document.getElementById('ambitionBackdrop').style.display = 'flex';
});

document.getElementById('saveAmbition').addEventListener('click', () => {
  const ambition = document.getElementById('ambitionInput').value;
  if (ambition) {
    trackEvent('ambition', ambition);
    console.log('💭 Ambition saved:', ambition);
  }
  document.getElementById('ambitionBackdrop').style.display = 'none';
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎵 Beats 2023 - Local Upload Version');
  
  try {
    trackLibrary.init();
  } catch (e) {
    console.warn('Analytics not available');
  }
  
  await displayTracks();
  
  try {
    await loadTone();
    console.log('✅ Tone.js loaded');
  } catch (e) {
    console.warn('⚠️ Tone.js not available:', e.message);
  }
});