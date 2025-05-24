// Minimal audio graph helper inspired by AudioNodes
export class AudioGraph {
  constructor(context = new AudioContext()) {
    this.context = context;
    this.nodes = [];
  }

  createSampler(url, loopStart = 0, loopEnd = null) {

    const node = this.context.createBufferSource();
    return fetch(url)
      .then(res => res.arrayBuffer())
      .then(buf => this.context.decodeAudioData(buf))
      .then(audioBuffer => {
        if (opts.autoTrim) {
          audioBuffer = trimToLoop(audioBuffer, opts.autoTrim);
        }
        node.buffer = audioBuffer;
        node.loop = true;
        node.loopStart = loopStart;
        node.loopEnd = loopEnd !== null ? loopEnd : audioBuffer.duration;
        this.nodes.push(node);
        return node;
      });
  }

  createGain(value = 1) {
    const gainNode = this.context.createGain();
    gainNode.gain.value = value;
    this.nodes.push(gainNode);
    return gainNode;
  }

  connect(...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1]);
    }
  }

  start() {
    this.nodes.forEach(n => {
      if (n.start) {
        try { n.start(); } catch {}
      }
    });
  }
}

// Trim an AudioBuffer to a specified length in seconds.
// Finds the next zero crossing after the target length and applies
// a short crossfade to create smooth loops.
export function trimToLoop(buffer, lengthSec = 12, fadeSec = 0.01) {
  const sampleRate = buffer.sampleRate;
  const targetSamples = Math.min(buffer.length, Math.floor(lengthSec * sampleRate));
  let end = targetSamples;
  const ch = buffer.getChannelData(0);
  for (let i = targetSamples; i < ch.length - 1; i++) {
    if (ch[i] === 0 || (ch[i] > 0 && ch[i + 1] <= 0) || (ch[i] < 0 && ch[i + 1] >= 0)) {
      end = i;
      break;
    }
  }

  const newBuffer = new AudioBuffer({
    length: end,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate,
  });

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = newBuffer.getChannelData(c);
    dest.set(src.subarray(0, end));
    const fadeSamples = Math.min(Math.floor(fadeSec * sampleRate), end);
    for (let i = 0; i < fadeSamples; i++) {
      const fadeIn = i / fadeSamples;
      const fadeOut = (fadeSamples - i) / fadeSamples;
      dest[i] *= fadeIn;
      dest[end - i - 1] *= fadeOut;
    }
  }

  return newBuffer;
}

