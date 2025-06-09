#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const audioDir = join(__dirname, '../../src/assets/audio');

function readFloat80(buffer, offset) {
  const sign = (buffer[offset] & 0x80) ? -1 : 1;
  const exponent = ((buffer[offset] & 0x7f) << 8) | buffer[offset + 1];
  let hi = buffer.readUInt32BE(offset + 2);
  let lo = buffer.readUInt32BE(offset + 6);
  if (exponent === 0 && hi === 0 && lo === 0) return 0;
  if (exponent === 0x7fff) return Infinity;
  exponent -= 16383;
  const mantissa = hi * Math.pow(2, -31) + lo * Math.pow(2, -63);
  return sign * Math.pow(2, exponent) * (1 + mantissa);
}

function parseAiff(buffer) {
  let offset = 12; // Skip FORM header
  let channels, sampleRate, bits, frames, dataOffset;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32BE(offset + 4);
    const chunkStart = offset + 8;
    if (id === 'COMM') {
      channels = buffer.readUInt16BE(chunkStart);
      frames = buffer.readUInt32BE(chunkStart + 2);
      bits = buffer.readUInt16BE(chunkStart + 6);
      sampleRate = readFloat80(buffer, chunkStart + 8);
    } else if (id === 'SSND') {
      const off = buffer.readUInt32BE(chunkStart);
      dataOffset = chunkStart + 8 + off;
    }
    offset += 8 + size + (size % 2);
  }
  const samples = [];
  const bytesPerSample = bits / 8;
  for (let i = 0; i < frames * channels; i++) {
    const pos = dataOffset + i * bytesPerSample;
    samples.push(buffer.readInt16BE(pos));
  }
  return { channels, sampleRate, bitsPerSample: bits, samples };
}

function encodeWav({ channels, sampleRate, bitsPerSample, samples }) {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * (bitsPerSample / 8);
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  let offset = 44;
  for (const sample of samples) {
    buf.writeInt16LE(sample, offset);
    offset += 2;
  }
  return buf;
}

async function convert() {
  const files = await fs.readdir(audioDir);
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (ext === '.aif' || ext === '.aiff') {
      const input = join(audioDir, file);
      const data = await fs.readFile(input);
      const audio = parseAiff(data);
      const wavBuf = encodeWav(audio);
      const output = join(audioDir, basename(file, ext) + '.wav');
      await fs.writeFile(output, wavBuf);
      console.log(`Converted ${file} -> ${basename(output)}`);
    }
  }
}

convert().catch((err) => {
  console.error(err);
  process.exit(1);
});
