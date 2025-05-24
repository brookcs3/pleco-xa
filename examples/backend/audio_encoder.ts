#!/usr/bin/env bun
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

function encode(inputPath: string, outAudio: string, outMeta: string, targetSr = 44100) {
  const ff = spawnSync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-ac', '1',
    '-ar', String(targetSr),
    '-t', '12',
    '-filter:a', 'loudnorm=I=-16:LRA=11:TP=-1',
    outAudio,
  ], { stdio: 'inherit' });

  if (ff.status !== 0) {
    throw new Error('ffmpeg failed');
  }

  const samples = readWav(outAudio);
  const mel = computeMelSpectrogram(samples, targetSr);
  const meta = {
    duration: samples.length / targetSr,
    mel_spectrogram: mel,
  };
  writeFileSync(outMeta, JSON.stringify(meta));
}

function readWav(filePath: string): Float32Array {
  const buffer = readFileSync(filePath);
  const dataStart = 44; // assume standard PCM header
  const pcm = new Int16Array(buffer.buffer, buffer.byteOffset + dataStart, (buffer.length - dataStart) / 2);
  const float = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    float[i] = pcm[i] / 32768;
  }
  return float;
}

function dft(input: Float32Array): Float32Array {
  const N = input.length;
  const out = new Float32Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    let sumR = 0;
    let sumI = 0;
    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      sumR += input[n] * Math.cos(angle);
      sumI += input[n] * Math.sin(angle);
    }
    out[k] = Math.sqrt(sumR * sumR + sumI * sumI);
  }
  return out;
}

function computeMelSpectrogram(samples: Float32Array, sr: number, nMels = 40, frameSize = 2048, hopSize = 512): number[] {
  const mel = new Float32Array(nMels);
  let frames = 0;
  for (let i = 0; i + frameSize <= samples.length; i += hopSize) {
    const frame = samples.subarray(i, i + frameSize);
    const mag = dft(frame);
    const binSize = Math.floor(mag.length / nMels);
    for (let m = 0; m < nMels; m++) {
      let sum = 0;
      const start = m * binSize;
      const end = start + binSize;
      for (let b = start; b < end; b++) sum += mag[b];
      mel[m] += sum / binSize;
    }
    frames++;
  }
  for (let m = 0; m < nMels; m++) mel[m] /= frames || 1;
  return Array.from(mel);
}

if (import.meta.main) {
  const [input, outAudio, outMeta] = Bun.argv.slice(2);
  if (!input || !outAudio || !outMeta) {
    console.error('Usage: bun audio_encoder.ts input.wav output.wav metadata.json');
    process.exit(1);
  }
  encode(input, outAudio, outMeta);
}
