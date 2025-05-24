export async function analyzeLoop(filePath: string) {
  const buffer = await Bun.file(filePath).arrayBuffer();
  const { sampleRate, data: channelData } = decodeWav(buffer);
  const totalSamples = channelData.length;
  const window = Math.min(Math.floor(sampleRate * 0.5), Math.floor(totalSamples / 2));
  const startSlice = applyHannWindow(channelData.subarray(0, window));
  const endSlice = applyHannWindow(channelData.subarray(totalSamples - window));
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
  const startIndex = findZeroCrossing(channelData, 0);
  const endIndex = findZeroCrossing(channelData, totalSamples - window + bestOffset);
  return {
    loopStart: startIndex / sampleRate,
    loopEnd: endIndex / sampleRate,
  };
}

function decodeWav(buffer: ArrayBuffer): { sampleRate: number; data: Float32Array } {
  const view = new DataView(buffer);
  const sampleRate = view.getUint32(24, true);
  const dataSize = view.getUint32(40, true);
  const samples = dataSize / 2; // 16-bit
  const data = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const s = view.getInt16(44 + i * 2, true);
    data[i] = s / 0x8000;
  }
  return { sampleRate, data };
}

function findZeroCrossing(data: Float32Array, start: number) {
  for (let i = start; i < data.length - 1; i++) {
    if (data[i] <= 0 && data[i + 1] > 0) {
      return i;
    }
  }
  return start;
}

function applyHannWindow(data: Float32Array): Float32Array {
  const N = data.length;
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    out[i] = data[i] * w;
  }
  return out;
}
