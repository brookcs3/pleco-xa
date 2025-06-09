# Pleco Xa

> Browser-native audio analysis engine for musical timing, BPM detection, and intelligent loop finding

**Author:** Cameron Brooks  
**Version:** 1.0.6
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

- **PlecoAnalyzer** - Full analysis interface with loop playback
- **WaveformEditor** - Draggable loop point editor
- **BPMDetector** - Quick BPM detection tool
- **LoopPlayer** - Seamless loop playback with Web Audio API (Astro component available)
- **BPM Normalization Checkbox** - Option to clamp detected tempo between 80–180 BPM

## Installation

```bash
npm install pleco-xa
```

## Quick Start

```javascript
import { detectBPM, loopAnalysis, WaveformEditor, debugLog } from 'pleco-xa'

// Load audio file
const audioContext = new AudioContext()
const response = await fetch('audio.wav')
const arrayBuffer = await response.arrayBuffer()
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

// Detect BPM
const bpmResult = detectBPM(
  audioBuffer.getChannelData(0),
  audioBuffer.sampleRate,
)
debugLog(`Detected BPM: ${bpmResult.bpm}`)

// Find optimal loop points
const analysis = await loopAnalysis(audioBuffer)
debugLog(`Loop: ${analysis.loopStart}s - ${analysis.loopEnd}s`)
debugLog(`Musical division: ${analysis.musicalDivision} bars`)

// Create interactive waveform editor
const canvas = document.getElementById('waveform')
const editor = new WaveformEditor(canvas, audioBuffer, analysis)
```

## Build

Run `npm run build` to generate distributable bundles in the `dist/` directory.
This produces `dist/pleco-xa.js` as the main entry point and a minified `dist/pleco-xa.min.js` for browser usage. The minified file can also be loaded directly from a CDN such as unpkg.

## CDN Demo

You can load Pleco Xa directly from the unpkg CDN for quick experimentation:

```html
<script type="module">
  import { detectBPM } from 'https://unpkg.com/pleco-xa/dist/pleco-xa.min.js'
</script>
```
The snippet above can be used to build a simple page that detects BPM from an uploaded audio file.
You can lock to a specific version by using a path like `https://unpkg.com/pleco-xa@1.0.8/dist/pleco-xa.min.js`.

## Debugging

Enable verbose logging by setting the `PLECO_DEBUG` environment variable or by calling `setDebug(true)` from code. Both `setDebug` and `debugLog` are exported from `pleco-xa`. In Node.js you can run:

```bash
PLECO_DEBUG=true node your-script.js
```

In the browser, assign `window.PLECO_DEBUG = true` before loading Pleco Xa or call `setDebug(true)`. When enabled, additional information is printed to the console.

Most example scripts and the sample servers use a `debugLog()` helper that
checks this flag. Verbose messages are suppressed unless `PLECO_DEBUG` is set.


## Testing

Run `npm ci` to install all development dependencies before executing the Vitest
test suite:

```bash
npm ci
npm test
```

This command runs all tests configured in `vitest.config.js`.

## Astro Integration

Pleco Xa ships with prebuilt Astro components for easy integration into Astro projects.
You can import these from the `pleco-xa/astro` entry point.

```astro
---
import {
  PlecoAnalyzer,
  WaveformEditor,
  BPMDetector,
  LoopPlayer,
} from 'pleco-xa/astro'
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

#### `loopAnalysis(audioBuffer, useReference)`

Main analysis engine with musical timing awareness.

- **audioBuffer**: `AudioBuffer` - Web Audio API buffer
- **useReference**: `boolean` - Use reference template matching
- **Returns**: Complete analysis object with loop points, BPM, musical info

#### `musicalLoopAnalysis(audioBuffer, bpmData)`

Musical boundary-aware loop detection.

- **audioBuffer**: `AudioBuffer` - Audio to analyze
- **bpmData**: `Object` - BPM detection results
- **Returns**: Loop candidates with musical timing confidence. The result
  includes an `isFullTrack` flag indicating if the audio buffer represents a
  complete track.

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
- Also available as `<WaveformEditor>` in Astro projects.

#### `LoopPlayer(audioBuffer)`

Seamless loop playback engine.

- `play()` - Start looped playback
- `stop()` - Stop playback
- `setLoopPoints(start, end)` - Update loop boundaries
- `setVolume(volume)` - Adjust playback volume
- Also available as `<LoopPlayer>` in Astro projects.

Additional Astro components:

- `<BPMDetector>` for quick BPM analysis
- `<PlecoAnalyzer>` for a full-featured interface

## Advanced Usage

### Custom Loop Analysis Workflow

```javascript
import {
  detectBPM,
  musicalLoopAnalysis,
  createReferenceTemplate,
  analyzeWithReference,
} from 'pleco-xa'

// Step 1: Analyze a known-good loop
const referenceBuffer = await loadAudio('perfect-loop.wav')
const referenceAnalysis = await loopAnalysis(referenceBuffer)
const template = await createReferenceTemplate(
  referenceBuffer,
  referenceAnalysis.loopStart,
  referenceAnalysis.loopEnd,
)

// Step 2: Use template to find similar loops in longer audio
const longTrack = await loadAudio('long-track.wav')
const guidedResult = await analyzeWithReference(longTrack, template)
```

### Real-time Audio Analysis

```javascript
import { computeFFT, computeSpectralCentroid } from 'pleco-xa'

// Analyze live audio input
navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()

  source.connect(analyser)

  // Get real-time spectral data
  const dataArray = new Float32Array(analyser.frequencyBinCount)
  analyser.getFloatFrequencyData(dataArray)

  // Use Pleco Xa for custom analysis
  const fftResult = computeFFT(dataArray)
  // ... custom processing
})
```
## Example Demos

Sample loops are available in `public/audio/` for experimentation.

### Random Loop Playground

A quick demo of random loop transformations.

![Random Loop Demo](docs/random-loop-demo.gif)


## Client-Side Web App & Premium Features

Pleco Xa can power a fully client-side web app with optional premium upgrades.
Use the free tools to showcase BPM detection and waveform editing, then unlock
advanced analysis when a token is present in `localStorage`. The example Astro
site includes a simple `access-control.js` script that hides premium components until a valid token is set.

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

Run `npm install` to install dependencies, then `npm run build` to produce the compiled files in `dist/` before running `npm publish`.

```bash
npm install
npm run build
npm publish
```

Update the package version in `package.json` before publishing. The package can
be installed with `npm install pleco-xa` and is ready to publish with `npm publish`.


### Health Check Endpoint

When deployed on services like Railway, the application exposes a `/health` route
that returns `OK`. This file lives at `public/health`, so it works even when the
app is served statically from the `dist/` folder. Automated systems can use this
path to verify the server is up and running.

### File Upload Caveats
Railway's container filesystem is ephemeral, so files written during runtime won't persist after redeploys or restarts. Any endpoints that save uploaded audio to the local filesystem may break. To reliably store uploaded audio, use object storage such as Amazon S3 or Railway's storage plugin.

## Contributing

Contributions are welcome! Feel free to open issues or pull requests on GitHub.

Before running the test suite or the development server, install the project's
dependencies:

```bash
npm ci
```

This fetches dev tools such as `vitest` using the lockfile for reproducible
installs. You can also run `npm run setup` which wraps the above command.
See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License
_Built with ♪ by Cameron Brooks_

![Hits](https://visitor-badge.laobi.icu/badge?page_id=brookcs3.pleco-xa)
