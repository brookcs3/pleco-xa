export async function loadAudioBuffer(url, context = new AudioContext()) {
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  return await context.decodeAudioData(arr);
}

export function computeRMS(audioBuffer) {
  const channel = audioBuffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < channel.length; i++) {
    const v = channel[i];
    sum += v * v;
  }
  return Math.sqrt(sum / channel.length);
}

export function computePeak(audioBuffer) {
  const channel = audioBuffer.getChannelData(0);
  let max = 0;
  for (let i = 0; i < channel.length; i++) {
    const v = Math.abs(channel[i]);
    if (v > max) max = v;
  }
  return max;
}

export async function computeSpectrum(audioBuffer, fftSize = 2048) {
  const offline = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = audioBuffer;
  const analyser = offline.createAnalyser();
  analyser.fftSize = fftSize;
  source.connect(analyser);
  analyser.connect(offline.destination);
  source.start();
  await offline.startRendering();
  const data = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(data);
  return Array.from(data);
}
