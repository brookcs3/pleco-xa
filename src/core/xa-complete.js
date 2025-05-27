/**
 * Librosa Complete Module
 * Comprehensive JavaScript port of librosa for web-based audio analysis
 * 
 * This module provides a complete audio analysis toolkit by combining
 * all the individual librosa modules into one unified interface.
 * 
 * @author Pleco-XA Audio Analysis Suite
 * @version 1.0.0
 */

// ============= CORE FFT AND SPECTRAL ANALYSIS =============
export {
    fft,
    ifft,
    stft,
    istft,
    get_window,
    hann_window,
    hamming_window,
    blackman_window,
    magnitude,
    phase,
    power,
    polar_to_complex,
    fft_frequencies,
    spectrogram
} from './xa-fft.js';

// ============= MEL-SCALE AND MFCC FEATURES =============
export {
    mel_filterbank,
    melspectrogram,
    mfcc,
    hz_to_mel,
    mel_to_hz,
    mel_frequencies,
    power_to_db,
    db_to_power,
    amplitude_to_db,
    db_to_amplitude
} from './xa-mel.js';

// ============= SPECTRAL FEATURES =============
export {
    spectral_centroid,
    spectral_rolloff,
    spectral_bandwidth,
    spectral_contrast,
    spectral_flatness,
    extractSpectralFeatures,
    tonnetz,
    poly_features,
    zero_crossing_rate as zcr_spectral
} from './xa-spectral.js';

// ============= CHROMA AND HARMONIC ANALYSIS =============
export {
    chroma_stft,
    chroma_cqt,
    chroma_cens,
    piptrack,
    spectrum_to_chroma,
    estimate_tuning,
    pitch_tuning
} from './xa-chroma.js';

// ============= BEAT AND TEMPO DETECTION =============
export {
    beat_track,
    tempo,
    estimate_tempo,
    onset_strength,
    onset_detect,
    onset_backtrack,
    plp,
    fourier_tempogram,
    autocorr_tempogram
} from './xa-beat.js';

// ============= ADVANCED PROCESSING =============
export {
    normalize_features,
    zero_crossing_rate,
    rms,
    hpss,
    pitch_shift,
    phase_vocoder,
    monophonic_pitch_detect,
    autocorrelate,
    polyfit,
    linspace,
    find_peaks
} from './xa-advanced.js';

// ============= UTILITY FUNCTIONS =============
export {
    frames_to_time,
    time_to_frames,
    samples_to_frames,
    frames_to_samples,
    note_to_hz,
    hz_to_note,
    midi_to_hz,
    hz_to_midi,
    note_to_midi,
    midi_to_note,
    normalize,
    pad_center,
    fix_length,
    valid_audio,
    frame as util_frame,
    peak_pick as util_peak_pick
} from './xa-util.js';

// ============= ONSET DETECTION =============
export {
    onsetDetect,
    onsetStrength,
    onsetBacktrack,
    spectralFlux,
    complexFlux
} from './xa-onset.js';

// ============= TEMPORAL ANALYSIS =============
export {
    crossSimilarity,
    recurrenceMatrix,
    recurrenceToLag,
    lagToRecurrence,
    agglomerative,
    pathEnhance
} from './xa-temporal.js';

// ============= PATTERN MATCHING =============
export {
    dtw,
    dtwKMeans,
    matchIntervals,
    matchEvents
} from './xa-matching.js';

// ============= MUSICAL INTERVALS =============
export {
    IntervalConstructor,
    intervalFrequencies,
    pythagoreanIntervals,
    plimitIntervals
} from './xa-intervals.js';

// ============= FILE UTILITIES =============
export {
    example,
    exampleBuffer,
    exampleAudio,
    listExamples,
    exampleInfo,
    loadFile,
    saveAudio,
    cache,
    createVisualization,
    isWebAudioSupported,
    createAudioContext
} from './xa-file.js';

// ============= WEB AUDIO ANALYSIS CLASS =============

/**
 * Modern Web Audio Analysis class with JavaScript/Web API design patterns
 * Built for browsers, Web Audio API, and modern JavaScript workflows
 */
export class AudioAnalyzer {
    constructor(options = {}) {
        this.version = '1.0.0';
        this.sampleRate = options.sampleRate || 44100; // Web Audio standard
        
        // Feature extraction cache for performance
        this._cache = new Map();
        
        // Web Audio API context
        this._audioContext = options.audioContext || null;
        
        // Real-time analysis node (if connected)
        this._analyserNode = null;
        this._isRealTime = false;
        
        // Event system for real-time callbacks
        this._eventListeners = new Map();
    }
    
    /**
     * Get or create Web Audio API context
     */
    get audioContext() {
        if (!this._audioContext) {
            this._audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });
        }
        return this._audioContext;
    }
    
    /**
     * Load audio from various web sources (modern Promise-based API)
     * @param {string|File|AudioBuffer|HTMLAudioElement} source - Audio source
     * @param {Object} options - Loading options
     * @returns {Promise<AudioBuffer>} Web Audio API AudioBuffer
     */
    async loadAudio(source, options = {}) {
        const { sampleRate = null, mono = true } = options;
        
        let audioBuffer;
        
        // Handle different source types (web-friendly)
        if (source instanceof AudioBuffer) {
            audioBuffer = source;
        } else if (source instanceof File) {
            const arrayBuffer = await source.arrayBuffer();
            audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        } else if (typeof source === 'string') {
            // URL or data URL
            const response = await fetch(source);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        } else if (source instanceof HTMLAudioElement) {
            // Audio element to AudioBuffer conversion
            audioBuffer = await this._audioElementToBuffer(source);
        } else {
            throw new Error('Unsupported audio source type');
        }
        
        // Resample if needed (using Web Audio API)
        if (sampleRate && sampleRate !== audioBuffer.sampleRate) {
            audioBuffer = await this._resampleAudioBuffer(audioBuffer, sampleRate);
        }
        
        return audioBuffer;
    }
    
    /**
     * Extract audio features using modern async/await pattern
     * @param {AudioBuffer|Float32Array} audio - Audio data
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Feature extraction results
     */
    async extractFeatures(audio, options = {}) {
        const {
            includeSpectral = true,
            includeTemporal = true,
            includeHarmonic = true,
            includeRhythm = true,
            useCache = true
        } = options;
        
        // Get audio data as Float32Array
        const audioData = audio instanceof AudioBuffer ? 
            audio.getChannelData(0) : audio;
        const sr = audio.sampleRate || this.sampleRate;
        
        // Cache key for performance
        const cacheKey = `features_${audioData.length}_${sr}`;
        if (useCache && this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }
        
        const features = {
            metadata: {
                duration: audioData.length / sr,
                samples: audioData.length,
                sampleRate: sr,
                timestamp: Date.now()
            }
        };
        
        // Extract features in parallel for better performance
        const featurePromises = [];
        
        if (includeSpectral) {
            featurePromises.push(this._extractSpectralFeatures(audioData, sr));
        }
        if (includeTemporal) {
            featurePromises.push(this._extractTemporalFeatures(audioData, sr));
        }
        if (includeHarmonic) {
            featurePromises.push(this._extractHarmonicFeatures(audioData, sr));
        }
        if (includeRhythm) {
            featurePromises.push(this._extractRhythmFeatures(audioData, sr));
        }
        
        const results = await Promise.all(featurePromises);
        
        // Combine results
        let index = 0;
        if (includeSpectral) features.spectral = results[index++];
        if (includeTemporal) features.temporal = results[index++];
        if (includeHarmonic) features.harmonic = results[index++];
        if (includeRhythm) features.rhythm = results[index++];
        
        // Cache results
        if (useCache) {
            this._cache.set(cacheKey, features);
        }
        
        return features;
    }
    
    /**
     * Connect to real-time audio stream (modern Web Audio pattern)
     * @param {MediaStreamAudioSourceNode|AudioNode} source - Audio source node
     * @param {Object} options - Real-time analysis options
     */
    connectRealTime(source, options = {}) {
        const { 
            fftSize = 2048,
            smoothingTimeConstant = 0.8,
            onBeat = null,
            onPitch = null,
            onFeatures = null
        } = options;
        
        // Create analyser node
        this._analyserNode = this.audioContext.createAnalyser();
        this._analyserNode.fftSize = fftSize;
        this._analyserNode.smoothingTimeConstant = smoothingTimeConstant;
        
        // Connect audio graph
        source.connect(this._analyserNode);
        this._analyserNode.connect(this.audioContext.destination);
        
        this._isRealTime = true;
        
        // Set up event listeners
        if (onBeat) this.addEventListener('beat', onBeat);
        if (onPitch) this.addEventListener('pitch', onPitch);
        if (onFeatures) this.addEventListener('features', onFeatures);
        
        // Start real-time analysis loop
        this._startRealTimeAnalysis();
    }
    
    /**
     * Modern event listener system (like DOM events)
     */
    addEventListener(eventType, callback) {
        if (!this._eventListeners.has(eventType)) {
            this._eventListeners.set(eventType, []);
        }
        this._eventListeners.get(eventType).push(callback);
    }
    
    removeEventListener(eventType, callback) {
        const listeners = this._eventListeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Disconnect real-time analysis
     */
    disconnectRealTime() {
        if (this._analyserNode) {
            this._analyserNode.disconnect();
            this._analyserNode = null;
        }
        this._isRealTime = false;
    }
    
    /**
     * Process audio effects (Web Audio style)
     * @param {AudioBuffer} audioBuffer - Input audio
     * @param {Object} effects - Effects configuration
     * @returns {Promise<AudioBuffer>} Processed audio
     */
    async processEffects(audioBuffer, effects = {}) {
        const {
            pitchShift = 0,
            timeStretch = 1.0,
            harmonicSeparation = false,
            normalize = false
        } = effects;
        
        let processed = audioBuffer;
        
        if (pitchShift !== 0) {
            const audioData = processed.getChannelData(0);
            const shifted = pitch_shift(audioData, processed.sampleRate, pitchShift);
            processed = this._arrayToAudioBuffer(shifted, processed.sampleRate);
        }
        
        if (harmonicSeparation) {
            // Apply HPSS and return both components
            const audioData = processed.getChannelData(0);
            const spectrogram = melspectrogram(audioData, processed.sampleRate);
            const { harmonic, percussive } = hpss(spectrogram);
            
            return {
                original: processed,
                harmonic: this._spectrogramToAudioBuffer(harmonic, processed.sampleRate),
                percussive: this._spectrogramToAudioBuffer(percussive, processed.sampleRate)
            };
        }
        
        return processed;
    }
    
    /**
     * Export analysis results in various formats
     * @param {Object} features - Extracted features
     * @param {string} format - Export format ('json', 'csv', 'blob')
     * @returns {string|Blob} Exported data
     */
    exportFeatures(features, format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(features, null, 2);
            case 'csv':
                return this._featuresToCSV(features);
            case 'blob':
                const jsonString = JSON.stringify(features);
                return new Blob([jsonString], { type: 'application/json' });
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    
    /**
     * Clean up resources (important for web apps)
     */
    dispose() {
        this.disconnectRealTime();
        this._cache.clear();
        this._eventListeners.clear();
        
        if (this._audioContext && this._audioContext.state !== 'closed') {
            this._audioContext.close();
        }
    }
    
    // ============= PRIVATE METHODS =============
    
    async _extractSpectralFeatures(audioData, sr) {
        const S = melspectrogram(audioData, sr);
        
        return {
            mfcc: mfcc(S, sr),
            centroid: spectral_centroid(S, sr),
            rolloff: spectral_rolloff(S, sr),
            bandwidth: spectral_bandwidth(S, sr),
            zcr: zero_crossing_rate(audioData)
        };
    }
    
    async _extractTemporalFeatures(audioData, sr) {
        return {
            rms: rms(audioData),
            energy: rms(audioData), // Alias for compatibility
            envelope: Math.max(...audioData)
        };
    }
    
    async _extractHarmonicFeatures(audioData, sr) {
        const S = stft(audioData);
        
        return {
            chroma: chroma_stft(S, sr),
            key: this._estimateKey(chroma_stft(S, sr)),
            contrast: spectral_contrast(S, sr)
        };
    }
    
    async _extractRhythmFeatures(audioData, sr) {
        const onsetEnv = onset_strength(audioData, sr);
        
        return {
            tempo: tempo(onsetEnv, sr),
            bpm: tempo(onsetEnv, sr).tempo, // Direct BPM value
            beats: beat_track(onsetEnv, sr),
            onsets: onset_detect(onsetEnv, sr, { units: 'time' })
        };
    }
    
    _startRealTimeAnalysis() {
        if (!this._analyserNode || !this._isRealTime) return;
        
        const analyzeFrame = () => {
            if (!this._isRealTime) return;
            
            // Get frequency and time domain data
            const freqData = new Uint8Array(this._analyserNode.frequencyBinCount);
            const timeData = new Uint8Array(this._analyserNode.fftSize);
            
            this._analyserNode.getByteFrequencyData(freqData);
            this._analyserNode.getByteTimeDomainData(timeData);
            
            // Simple beat detection
            const energy = freqData.reduce((sum, val) => sum + val, 0) / freqData.length;
            if (energy > 128) { // Simple threshold
                this._dispatchEvent('beat', { energy, timestamp: Date.now() });
            }
            
            // Dispatch feature update
            this._dispatchEvent('features', { freqData, timeData, energy });
            
            requestAnimationFrame(analyzeFrame);
        };
        
        analyzeFrame();
    }
    
    _dispatchEvent(eventType, data) {
        const listeners = this._eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }
    
    _estimateKey(chroma) {
        // Simple key estimation from chroma
        const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const avgChroma = chroma.reduce((acc, frame) => {
            frame.forEach((val, i) => acc[i] = (acc[i] || 0) + val);
            return acc;
        }, new Array(12).fill(0));
        
        const maxIdx = avgChroma.indexOf(Math.max(...avgChroma));
        return keys[maxIdx];
    }
    
    _arrayToAudioBuffer(audioData, sampleRate) {
        const buffer = this.audioContext.createBuffer(1, audioData.length, sampleRate);
        buffer.copyToChannel(audioData, 0);
        return buffer;
    }
    
    _featuresToCSV(features) {
        // Simple CSV export - could be enhanced
        const rows = [];
        rows.push('feature,value');
        
        const flatten = (obj, prefix = '') => {
            Object.entries(obj).forEach(([key, value]) => {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    flatten(value, `${prefix}${key}.`);
                } else {
                    rows.push(`${prefix}${key},${Array.isArray(value) ? value.join(';') : value}`);
                }
            });
        };
        
        flatten(features);
        return rows.join('\n');
    }
}

// ============= WEB AUDIO FACTORY =============

/**
 * Create a new AudioAnalyzer instance (modern web pattern)
 * @param {Object} options - Configuration options
 * @returns {AudioAnalyzer} AudioAnalyzer instance
 */
export function createAudioAnalyzer(options = {}) {
    return new AudioAnalyzer(options);
}

/**
 * Get microphone stream for real-time analysis (modern web API)
 * @param {Object} constraints - MediaStream constraints
 * @returns {Promise<MediaStreamAudioSourceNode>} Audio source node
 */
export async function getMicrophoneSource(constraints = { audio: true }) {
    const analyzer = new AudioAnalyzer();
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return analyzer.audioContext.createMediaStreamSource(stream);
}

/**
 * Quick analysis helper for common use cases
 * @param {AudioBuffer|File|string} source - Audio source
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results
 */
export async function quickAnalyze(source, options = {}) {
    const analyzer = new AudioAnalyzer();
    
    try {
        const audioBuffer = await analyzer.loadAudio(source);
        const features = await analyzer.extractFeatures(audioBuffer, options);
        return features;
    } finally {
        analyzer.dispose(); // Clean up resources
    }
}

// ============= DEFAULT EXPORT =============

// Create default instance for convenience
const defaultAnalyzer = new AudioAnalyzer();

export default defaultAnalyzer;

// Usage Examples - Modern Web Audio API Patterns:
/*
// === BASIC USAGE ===
import analyzer from './xa-complete.js';

// Load and analyze audio file
const audioBuffer = await analyzer.loadAudio('song.mp3');
const features = await analyzer.extractFeatures(audioBuffer);

console.log('BPM:', features.rhythm.bpm);
console.log('Key:', features.harmonic.key);

// === REAL-TIME ANALYSIS ===
import { getMicrophoneSource } from './librosa-complete.js';

const micSource = await getMicrophoneSource();
analyzer.connectRealTime(micSource, {
    onBeat: (data) => console.log('Beat detected!', data.energy),
    onFeatures: (data) => updateVisualization(data)
});

// === FILE DRAG & DROP ===
dropZone.addEventListener('drop', async (e) => {
    const file = e.dataTransfer.files[0];
    const features = await analyzer.extractFeatures(file);
    displayResults(features);
});

// === AUDIO EFFECTS PROCESSING ===
const processed = await analyzer.processEffects(audioBuffer, {
    pitchShift: 2,      // Up 2 semitones
    harmonicSeparation: true
});

// Play the harmonic component
const source = analyzer.audioContext.createBufferSource();
source.buffer = processed.harmonic;
source.connect(analyzer.audioContext.destination);
source.start();

// === INDIVIDUAL FUNCTIONS ===
import { mfcc, tempo, hpss } from './librosa-complete.js';

const mfccFeatures = mfcc(audioData, 44100);
const bpm = tempo(audioData, 44100);
const {harmonic, percussive} = hpss(spectrogram);

// === EXPORT RESULTS ===
const jsonExport = analyzer.exportFeatures(features, 'json');
const csvExport = analyzer.exportFeatures(features, 'csv');
const blob = analyzer.exportFeatures(features, 'blob');

// Download as file
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'audio-analysis.json';
a.click();

// === CLEANUP (IMPORTANT!) ===
analyzer.dispose(); // Always clean up when done
*/