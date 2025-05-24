# BeaatsLoops Doppler Scroll Integration Guide

## Overview

The Doppler Scrolling system is a proprietary audio feature that creates realistic spatial audio transitions between loops as users scroll through the page. This guide explains how to integrate the new modules into your existing BeaatsLoops project.

## File Structure

Add these new files to your BeaatsLoops project:

```
src/
├── utils/
│   ├── DopplerScroll.js      # Main doppler scroll implementation
│   ├── TempoSync.js          # Beat detection and tempo synchronization
│   └── SpatialAudio.js       # 3D positioning and effects
├── components/
│   └── ScrollAudio.astro     # Astro component for scroll-based audio
└── styles/
    └── scroll-audio.scss     # Additional styles (optional)
```

## Integration Steps

### 1. Install Dependencies

No additional npm packages are required - the implementation uses native Web Audio API.

### 2. Update Your Page Layout

In your main page or layout where you want the doppler effect:

```astro
---
// src/pages/index.astro or your target page
import Layout from '../layouts/Layout.astro';
import ScrollAudio from '../components/ScrollAudio.astro';
import AWaves from '../components/AWaves.astro';
---

<Layout>
  <!-- Your existing content -->
  
  <!-- Add the ScrollAudio component -->
  <ScrollAudio 
    loop1Url="/audio/loop1.mp3"
    loop2Url="/audio/loop2.mp3"
    className="doppler-section"
  />
  
  <!-- Rest of your content -->
</Layout>
```

### 3. Integrate with AWaves Visualizer

Update your `AWaves.astro` component to accept audio analysis data:

```javascript
// In AWaves component script section
window.addEventListener('awaves-audio-data', (event) => {
  const { frequencyData, waveformData } = event.detail;
  // Update your wireframe visualization based on audio data
  updateWireframeWithAudio(frequencyData);
});
```

### 4. Connect to WaveformGrid.js

Modify your `WaveformGrid.js` to work with DopplerScroll:

```javascript
// src/utils/WaveformGrid.js
import { DopplerScroll } from './DopplerScroll.js';

export class WaveformGrid {
  constructor() {
    // Existing code...
    
    // Listen for doppler scroll events
    if (window.dopplerScroll) {
      window.dopplerScroll.emitter.on('audioAnalysis', (data) => {
        this.updateFromDopplerData(data);
      });
    }
  }
  
  updateFromDopplerData({ loop1Data, loop2Data, mixRatio }) {
    // Blend frequency data based on scroll position
    const blendedData = this.blendFrequencyData(loop1Data, loop2Data, mixRatio);
    this.updateVisualization(blendedData);
  }
}
```

### 5. Lenis Smooth Scroll Configuration

Update your Lenis initialization to work with doppler scrolling:

```javascript
// In your main script file
import Lenis from '@studio-freight/lenis';

const lenis = new Lenis({
  smooth: true,
  smoothWheel: 1,
  smoothTouch: false,
  duration: 1.2
});

// Store globally for doppler scroll access
window.lenis = lenis;

// Reduce smoothing during audio transitions
lenis.on('scroll', ({ scroll, progress }) => {
  // Doppler scroll will automatically adjust smoothing
  // in transition zones
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);
```

### 6. Update ColorMorph.js

Enhance your `ColorMorph.js` to respond to frequency changes:

```javascript
// src/utils/ColorMorph.js
export class ColorMorph {
  constructor() {
    // Existing code...
  }
  
  updateFromFrequencies(lowFreq, midFreq, highFreq) {
    // Map frequency ranges to color channels
    const hue = this.mapFrequencyToHue(lowFreq);
    const saturation = this.mapFrequencyToSaturation(midFreq);
    const lightness = this.mapFrequencyToLightness(highFreq);
    
    this.morphToHSL(hue, saturation, lightness);
  }
}
```

## Configuration Options

### DopplerScroll Options

```javascript
const dopplerScroll = new DopplerScroll({
  transitionZone: 0.33,      // Size of transition zone (0-1)
  crossoverPoint: 0.5,       // When master switches (0-1)
  dopplerIntensity: 0.3,     // Pitch shift amount (0-1)
  filterRange: {
    low: 20,                 // Minimum frequency (Hz)
    high: 20000              // Maximum frequency (Hz)
  }
});
```

### Audio File Requirements

- **Format**: MP3, WAV, or OGG
- **Duration**: Ideally 8-12 seconds for smooth looping
- **Sample Rate**: 44.1kHz or 48kHz
- **Channels**: Mono or stereo (will be processed accordingly)

## Performance Considerations

1. **Audio Context**: Only one AudioContext is created and reused
2. **Script Processors**: Will be replaced with AudioWorklet when widely supported
3. **Memory**: Audio buffers are loaded once and reused
4. **CPU**: Doppler effects are optimized for real-time performance

## Browser Compatibility

- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (may need user interaction to start audio)
- **Edge**: Full support
- **Mobile**: Works on modern mobile browsers (touch scrolling supported)

## Debugging

Enable debug mode to see audio state in console:

```javascript
const dopplerScroll = new DopplerScroll({ debug: true });

// Listen to all events
dopplerScroll.emitter.on('*', (eventName, data) => {
  console.log('DopplerScroll Event:', eventName, data);
});
```

## Advanced Usage

### Custom Loop Points

```javascript
// Override automatic loop detection
dopplerScroll.setLoopPoints('loop1', {
  start: 0.5,    // seconds
  end: 8.75      // seconds
});
```

### Dynamic Audio Loading

```javascript
// Change loops on the fly
async function switchLoops(newLoop1Url, newLoop2Url) {
  dopplerScroll.stop();
  await dopplerScroll.loadLoops(newLoop1Url, newLoop2Url);
  dopplerScroll.play();
}
```

### Integration with Existing Audio

```javascript
// Connect to existing Web Audio nodes
const existingGainNode = audioContext.createGain();
dopplerScroll.connectOutput(existingGainNode);
existingGainNode.connect(audioContext.destination);
```

## Troubleshooting

### Audio Not Playing
- Check browser console for errors
- Ensure user has interacted with page (click/tap)
- Verify audio file URLs are correct

### Choppy Scrolling
- Reduce `dopplerIntensity` value
- Check if other heavy animations are running
- Consider reducing visual effects during transitions

### Audio Out of Sync
- Ensure both loops have clear, consistent tempo
- Adjust `hopSize` in TempoSync for better beat detection
- Manually set BPM if automatic detection fails

## Future Enhancements

- WebAssembly-based audio processing for better performance
- Multiple loop support (more than 2)
- MIDI sync capabilities
- Audio recording of scroll performances
- Export scroll automation as audio file