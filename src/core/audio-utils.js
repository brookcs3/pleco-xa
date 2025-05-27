/**
 * Create a loopable AudioBuffer with custom waveform, multichannel support, and export options.
 *
 * @param {number} loopLengthSeconds - Length of each loop in seconds.
 * @param {number} repeats - Number of times to repeat the loop.
 * @param {number} sampleRate - Sample rate of the buffer (default: 44100).
 * @param {function} waveformFn - Function to generate waveform values (default: 440Hz sine wave).
 * @param {number} channels - Number of audio channels (default: 1).
 * @param {boolean} loopable - Whether to set loop points for seamless looping (default: false).
 * @returns {AudioBuffer} - The generated AudioBuffer.
 */
export function createLoopBuffer({
  loopLengthSeconds,
  repeats,
  sampleRate = 44100,
  waveformFn = (t) => Math.sin(2 * Math.PI * 440 * t),
  channels = 1,
  loopable = false,
}) {
  const ctx = new AudioContext({ sampleRate });
  const segmentLength = Math.floor(sampleRate * loopLengthSeconds);
  const totalLength = segmentLength * repeats;
  const buffer = ctx.createBuffer(channels, totalLength, sampleRate);

  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let r = 0; r < repeats; r++) {
      const start = r * segmentLength;
      for (let i = 0; i < segmentLength; i++) {
        const t = i / sampleRate;
        data[start + i] = waveformFn(t);
      }
    }
  }

  if (loopable) {
    buffer.loopStart = 0;
    buffer.loopEnd = loopLengthSeconds * repeats;
  }

  return buffer;
}

/**
 * Export an AudioBuffer as a .wav file.
 *
 * @param {AudioBuffer} buffer - The AudioBuffer to export.
 * @returns {Blob} - A Blob representing the .wav file.
 */
export function exportBufferAsWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const wavBuffer = new ArrayBuffer(44 + length * numChannels * 2);
  const view = new DataView(wavBuffer);

  // Write WAV header
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numChannels * 2, true);

  // Write PCM data
  let offset = 44;
  for (let ch = 0; ch < numChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}