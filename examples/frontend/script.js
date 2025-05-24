import { trackLibrary } from './analytics.js';
import { enhancePlayers } from './audiojs-loader.js';


let AudioGraph;
let graph;
let Tone;

function trackEvent(action, label) {
  console.log('track', action, label); // placeholder for analytics
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
    Tone = await import('tone');
  }
  return Tone;
}



async function fetchTracks() {
  const res = await fetch('/api/tracks');
  const tracks = await res.json();
  // inject JSON-LD metadata
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: tracks.map((t, idx) => ({
      '@type': 'AudioObject',
      position: idx + 1,
      contentUrl: t.url,
      name: t.filename,
    })),
  };
  document.getElementById('tracks-jsonld').textContent = JSON.stringify(jsonld);
  const container = document.getElementById('tracks');
  container.innerHTML = '';

  // Show audio elements with lazy loading

  tracks.forEach((track, idx) => {
    const audio = document.createElement('audio');
    audio.src = track.url;
    audio.controls = true;
    audio.loop = true;
    if (typeof track.loopStart === 'number') audio.loopStart = track.loopStart;
    if (typeof track.loopEnd === 'number') audio.loopEnd = track.loopEnd;
    audio.preload = 'none';
    audio.loading = 'lazy';
    container.appendChild(audio);
    setupAudioElement(audio, track.url);
    gsap.from(audio, { opacity: 0, y: 20, duration: 0.5, delay: idx * 0.1 });
  });

  // Upgrade native audio tags using audio.js for consistent playback UI
  await enhancePlayers();

  // Autoplay first track via AudioGraph for smoother loop
  if (tracks[0]) {
    const g = await loadAudioGraph();
    const sampler = await g.createSampler(tracks[0].url, tracks[0].loopStart, tracks[0].loopEnd);

    const gain = g.createGain();
    g.connect(sampler, gain, g.context.destination);
    g.start();
  }

}

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('fileInput');
  const formData = new FormData();
  formData.append('audio', fileInput.files[0]);
  await fetch('/api/upload', { method: 'POST', body: formData });
  fileInput.value = '';
  fetchTracks();
});

fetchTracks();

// Modal proof-of-concept handlers
const backdrop = document.getElementById('modalBackdrop');
document.getElementById('openModal').addEventListener('click', () => {
  backdrop.classList.add('open');
});
document.getElementById('closeModal').addEventListener('click', () => {
  backdrop.classList.remove('open');
});

// Ambition modal handlers
const ambitionBackdrop = document.getElementById('ambitionBackdrop');
const ambitionInput = document.getElementById('ambitionInput');

document.getElementById('openAmbition').addEventListener('click', () => {
  ambitionBackdrop.classList.add('open');
  ambitionInput.value = localStorage.getItem('ambition') || '';
});

document.getElementById('saveAmbition').addEventListener('click', () => {
  const text = ambitionInput.value.trim();
  if (text) {
    localStorage.setItem('ambition', text);
    trackEvent('save_ambition', text);
  }
  ambitionBackdrop.classList.remove('open');
});

