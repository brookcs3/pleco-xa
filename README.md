# Pleco Xa

> Browser-native audio analysis engine for musical timing, BPM detection, and intelligent loop finding

**Author:** Cameron Brooks  
**Version:** 1.0.1
**License:** MIT

## Overview

Pleco Xa is a comprehensive JavaScript audio analysis library that brings advanced musical intelligence to the browser. Built entirely on Web Audio API standards, it provides sophisticated audio analysis capabilities without requiring server-side dependencies or external libraries.

## Features

### 🎵 **Musical Intelligence**
- **BPM Detection** - Autocorrelation-based tempo analysis
- **Musical Boundary Detection** - Find natural loop points based on musical structure
- **Beat Alignment** - Validate loop timing against musical divisions
- **Spectral Analysis** - Frequency content and brightness analysis

### 🔄 **Loop Analysis**
- **Intelligent Loop Detection** - Find optimal loop points using musical timing
- **Sequential Window Navigation** - Browse through audio segments systematically
- **Reference Template Matching** - Use known-good loops to find similar segments
- **Multi-candidate Analysis** - Get multiple loop options ranked by confidence

### 🎛️ **Audio Processing**
- **Time Compression** - Compress audio to fit time constraints
- **Waveform Visualization** - Interactive waveform editor
- **Zero-crossing Detection** - Clean audio boundaries
- **RMS/Peak Analysis** - Audio level and dynamics analysis

### 🎮 **Interactive Components**
- **WaveformEditor** - Draggable loop point editor
- **LoopPlayer** - Seamless loop playback with Web Audio API (Astro component available)

## Installation

```bash
npm install pleco-xa
```

## Quick Start

```javascript
import { detectBPM, librosaLoopAnalysis, WaveformEditor } from 'pleco-xa';

// Load audio file
const audioContext = new AudioContext();
const response = await fetch('audio.wav');
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

// Detect BPM
const bpmResult = detectBPM(audioBuffer.getChannelData(0), audioBuffer.sampleRate);
console.log(`Detected BPM: ${bpmResult.bpm}`);

// Find optimal loop points
const analysis = await librosaLoopAnalysis(audioBuffer);
console.log(`Loop: ${analysis.loopStart}s - ${analysis.loopEnd}s`);
console.log(`Musical division: ${analysis.musicalDivision} bars`);

// Create interactive waveform editor
const canvas = document.getElementById('waveform');
const editor = new WaveformEditor(canvas, audioBuffer, analysis);
```


## Build

Run `npm run build` to generate the distributable bundle in the `dist/`
directory. This produces `dist/index.js` ready for use in the browser or with
bundlers. The `prepublishOnly` script defined in `package.json` automatically
runs this build step before the package is published.

To create distributable bundles, run:

```bash
npm run build
```

This outputs `dist/pleco-xa.js` and `dist/pleco-xa.min.js`. The `prepublishOnly` script runs this build automatically before publishing.
## Astro Integration

Pleco Xa ships with prebuilt Astro components for easy integration into Astro projects.
You can import these from the `pleco-xa/astro` entry point.

```astro
---
import { PlecoAnalyzer } from 'pleco-xa/astro';
---

<PlecoAnalyzer src="/song.mp3" />
```

## API Reference

### Core Analysis Functions

#### `detectBPM(audioData, sampleRate)`
Detect tempo using autocorrelation on onset strength.
- **audioData**: `Float32Array` - Raw audio samples
- **sampleRate**: `number` - Sample rate in Hz
- **Returns**: `{bpm: number, confidence: number}`

#### `librosaLoopAnalysis(audioBuffer, useReference)`
Main analysis engine with musical timing awareness.
- **audioBuffer**: `AudioBuffer` - Web Audio API buffer
- **useReference**: `boolean` - Use reference template matching
- **Returns**: Complete analysis object with loop points, BPM, musical info

#### `musicalLoopAnalysis(audioBuffer, bpmData)`
Musical boundary-aware loop detection.
- **audioBuffer**: `AudioBuffer` - Audio to analyze
- **bpmData**: `Object` - BPM detection results
- **Returns**: Loop candidates with musical timing confidence

### Spectral Analysis

#### `computeSpectralCentroid(audioBuffer)`
Calculate frequency content brightness.
- **Returns**: `number` - Spectral centroid in Hz

#### `computeSpectrum(audioBuffer, fftSize)`
FFT-based spectrum analysis.
- **fftSize**: `number` - FFT size (default 2048)
- **Returns**: `Array<number>` - Frequency domain data

#### `computeFFT(frame)`
Direct FFT computation for custom analysis.
- **frame**: `Float32Array` - Audio frame
- **Returns**: `Float32Array` - Interleaved real/imaginary FFT result

### Audio Processing

#### `computeRMS(audioBuffer)`
Root mean square energy calculation.

#### `computePeak(audioBuffer)`
Peak amplitude detection.

#### `computeZeroCrossingRate(audioBuffer)`
Audio texture analysis via zero crossings.

### Audio Compression

#### `pitchBasedCompress(audioBuffer, ratio)`
Time compression that changes pitch and tempo.
- **ratio**: `number` - Compression ratio (0.8 = 20% faster)
- **Returns**: `Promise<AudioBuffer>` - Compressed audio

#### `tempoBasedCompress(audioBuffer, ratio)`
Pitch-preserving time compression (placeholder).

### Utility Functions

#### `findZeroCrossing(data, startIndex)`
Find clean audio boundaries.

#### `findAudioStart(channelData, sampleRate, threshold)`
Skip silence at beginning of audio.

#### `applyHannWindow(data)`
Apply windowing for spectral analysis.

#### `calculateBeatAlignment(loopLength, bpm)`
Validate musical timing alignment.

### Interactive Classes

#### `WaveformEditor(canvas, audioBuffer, analysis)`
Interactive waveform with draggable loop points.
- Emits `loopChange` events when points are modified
- Visual feedback with loop region highlighting

#### `LoopPlayer(audioBuffer)`
Seamless loop playback engine.
- `play()` - Start looped playback
- `stop()` - Stop playback
- `setLoopPoints(start, end)` - Update loop boundaries
- `setVolume(volume)` - Adjust playback volume
- Also available as `<LoopPlayer>` in Astro projects.

## Advanced Usage

### Custom Loop Analysis Workflow

```javascript
import { 
  detectBPM, 
  musicalLoopAnalysis,
  createReferenceTemplate,
  analyzeWithReference 
} from 'pleco-xa';

// Step 1: Analyze a known-good loop
const referenceBuffer = await loadAudio('perfect-loop.wav');
const referenceAnalysis = await librosaLoopAnalysis(referenceBuffer);
const template = await createReferenceTemplate(
  referenceBuffer, 
  referenceAnalysis.loopStart, 
  referenceAnalysis.loopEnd
);

// Step 2: Use template to find similar loops in longer audio
const longTrack = await loadAudio('long-track.wav');
const guidedResult = await analyzeWithReference(longTrack, template);
```

### Real-time Audio Analysis

```javascript
import { computeFFT, computeSpectralCentroid } from 'pleco-xa';

// Analyze live audio input
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    source.connect(analyser);
    
    // Get real-time spectral data
    const dataArray = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(dataArray);
    
    // Use Pleco Xa for custom analysis
    const fftResult = computeFFT(dataArray);
    // ... custom processing
  });
```

## Examples

See the `/examples` directory for complete working examples:
- **Basic Usage** - Simple BPM detection and loop finding
- **Interactive Editor** - Full waveform editor with loop controls
- **Batch Analysis** - Process multiple audio files
- **Custom Visualizations** - Build spectrograms and frequency displays

## Browser Compatibility

Pleco Xa works in all modern browsers that support:
- Web Audio API
- ES6 Modules
- Canvas API
- File API

**Supported:** Chrome 66+, Firefox 60+, Safari 14+, Edge 79+

## Performance Notes

- **Zero Dependencies** - Pure browser implementation
- **Efficient Analysis** - Optimized algorithms for real-time use
- **Memory Conscious** - Designed for large audio files
- **Client-side Only** - No server required

## Building and Publishing

Run `npm install` to install dependencies, then `npm run build` to produce the
compiled files in `dist/`. During publishing the `prepublishOnly` script will
automatically run the build step.

```bash
npm install
npm run build
npm publish
```

Update the package version in `package.json` before publishing. The project is
marked as `private`; remove that flag if releasing publicly.

## Contributing

This is a private repository. For access or questions, contact Cameron Brooks.

## License

MIT License - See LICENSE file for details.

Some parts of the code were inspired by Libra.
---

**Pleco Xa** - Bringing musical intelligence to the browser.  
*Built with ♪ by Cameron Brooks*
