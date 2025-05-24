let audiojsLoaded = false;

export async function loadAudioJS() {
  if (audiojsLoaded) return;
  await import('https://cdn.jsdelivr.net/npm/audiojs@0.1.1/audio.min.js');
  audiojsLoaded = true;
}

export async function enhancePlayers() {
  await loadAudioJS();
  if (window.audiojs && window.audiojs.createAll) {
    window.audiojs.events.ready(function() {
      window.audiojs.createAll();
    });
  }
}
