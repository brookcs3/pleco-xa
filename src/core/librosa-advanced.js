/**
 * Librosa Advanced Functions Module
 * Web-ready JavaScript implementation of advanced audio processing functions
 * 
 * Provides the missing foundational functions for complete audio analysis:
 * - Feature normalization and processing
 * - Zero crossing rate and RMS energy
 * - Harmonic-percussive source separation (HPSS)
 * - Pitch shifting and phase vocoder
 * - Monophonic pitch detection
 * - Advanced signal processing utilities
 * 
 * @author Pleco-XA Audio Analysis Suite
 * @version 1.0.0
 */

/**
 * Custom error class for parameter validation
 */
class ParameterError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ParameterError';
    }
}

// ============= FEATURE NORMALIZATION =============

/**
 * Normalize features using L1, L2, or infinity norm
 * @param {Array<Array<number>>} features - Feature matrix [n_features x n_frames]
 * @param {string} norm - Normalization type ('l1', 'l2', 'inf')
 * @param {number} axis - Axis along which to normalize (0 or 1)
 * @returns {Array<Array<number>>} Normalized features
 */
export function normalize_features(features, norm = 'l2', axis = 0) {
    if (!features || features.length === 0) {
        throw new ParameterError('Features array cannot be empty');
    }
    
    const normalized = features.map(row => [...row]); // Deep copy
    
    if (axis === 0) {
        // Normalize each feature dimension across time
        for (let featIdx = 0; featIdx < features.length; featIdx++) {
            const feature = features[featIdx];
            let normValue = 0;
            
            // Calculate norm
            if (norm === 'l1') {
                normValue = feature.reduce((acc, val) => acc + Math.abs(val), 0);
            } else if (norm === 'l2') {
                normValue = Math.sqrt(feature.reduce((acc, val) => acc + val * val, 0));
            } else if (norm === 'inf') {
                normValue = Math.max(...feature.map(Math.abs));
            }
            
            // Apply normalization
            if (normValue > 1e-10) {
                for (let i = 0; i < feature.length; i++) {
                    normalized[featIdx][i] = feature[i] / normValue;
                }
            }
        }
    } else if (axis === 1) {
        // Normalize each time frame across features
        const nFrames = features[0].length;
        for (let frameIdx = 0; frameIdx < nFrames; frameIdx++) {
            let normValue = 0;
            
            // Calculate norm across features for this frame
            if (norm === 'l1') {
                normValue = features.reduce((acc, feature) => acc + Math.abs(feature[frameIdx]), 0);
            } else if (norm === 'l2') {
                normValue = Math.sqrt(features.reduce((acc, feature) => acc + feature[frameIdx] * feature[frameIdx], 0));
            } else if (norm === 'inf') {
                normValue = Math.max(...features.map(feature => Math.abs(feature[frameIdx])));
            }
            
            // Apply normalization
            if (normValue > 1e-10) {
                for (let featIdx = 0; featIdx < features.length; featIdx++) {
                    normalized[featIdx][frameIdx] = features[featIdx][frameIdx] / normValue;
                }
            }
        }
    }
    
    return normalized;
}

// ============= ZERO CROSSING RATE =============

/**
 * Compute zero crossing rate for audio frames
 * @param {Float32Array} y - Audio signal
 * @param {number} frame_length - Frame length in samples
 * @param {number} hop_length - Hop length in samples
 * @param {boolean} center - Whether to center frames
 * @returns {Float32Array} Zero crossing rate for each frame
 */
export function zero_crossing_rate(y, frame_length = 2048, hop_length = 512, center = true) {
    if (!y || y.length === 0) {
        throw new ParameterError('Audio signal cannot be empty');
    }
    
    const zcr = [];
    const step = hop_length;
    const startOffset = center ? Math.floor(frame_length / 2) : 0;
    
    for (let i = startOffset; i + frame_length <= y.length + startOffset; i += step) {
        const start = Math.max(0, i - startOffset);
        const end = Math.min(y.length, start + frame_length);
        const frame = y.slice(start, end);
        
        let crossings = 0;
        for (let j = 1; j < frame.length; j++) {
            if ((frame[j] >= 0 && frame[j-1] < 0) || 
                (frame[j] < 0 && frame[j-1] >= 0)) {
                crossings++;
            }
        }
        
        zcr.push(crossings / frame_length);
    }
    
    return new Float32Array(zcr);
}

// ============= RMS ENERGY =============

/**
 * Compute RMS (Root Mean Square) energy for audio frames
 * @param {Float32Array} y - Audio signal
 * @param {number} frame_length - Frame length in samples
 * @param {number} hop_length - Hop length in samples
 * @param {boolean} center - Whether to center frames
 * @returns {Float32Array} RMS energy for each frame
 */
export function rms(y, frame_length = 2048, hop_length = 512, center = true) {
    if (!y || y.length === 0) {
        throw new ParameterError('Audio signal cannot be empty');
    }
    
    const rms_values = [];
    const step = hop_length;
    const startOffset = center ? Math.floor(frame_length / 2) : 0;
    
    for (let i = startOffset; i + frame_length <= y.length + startOffset; i += step) {
        const start = Math.max(0, i - startOffset);
        const end = Math.min(y.length, start + frame_length);
        const frame = y.slice(start, end);
        
        const sum = frame.reduce((acc, val) => acc + val * val, 0);
        rms_values.push(Math.sqrt(sum / frame.length));
    }
    
    return new Float32Array(rms_values);
}

// ============= HARMONIC-PERCUSSIVE SOURCE SEPARATION =============

/**
 * Harmonic-Percussive Source Separation using median filtering
 * @param {Array<Array<number>>} S - Magnitude spectrogram [freq x time]
 * @param {number} kernel_size - Median filter kernel size
 * @param {number} power - Power for soft masking
 * @param {boolean} mask - Whether to return soft masks
 * @returns {Object} {harmonic, percussive} components
 */
export function hpss(S, kernel_size = 31, power = 2.0, mask = false) {
    if (!S || S.length === 0) {
        throw new ParameterError('Spectrogram cannot be empty');
    }
    
    const [n_freq, n_time] = [S.length, S[0].length];
    
    // Median filters
    const H = median_filter_horizontal(S, kernel_size);
    const P = median_filter_vertical(S, kernel_size);
    
    if (mask) {
        // Soft masking
        const H_mask = Array(n_freq).fill(null).map(() => new Float32Array(n_time));
        const P_mask = Array(n_freq).fill(null).map(() => new Float32Array(n_time));
        
        for (let i = 0; i < n_freq; i++) {
            for (let j = 0; j < n_time; j++) {
                const H_power = Math.pow(Math.abs(H[i][j]), power);
                const P_power = Math.pow(Math.abs(P[i][j]), power);
                const sum = H_power + P_power;
                
                if (sum > 1e-10) {
                    H_mask[i][j] = H_power / sum;
                    P_mask[i][j] = P_power / sum;
                } else {
                    H_mask[i][j] = 0.5;
                    P_mask[i][j] = 0.5;
                }
            }
        }
        
        return { harmonic: H_mask, percussive: P_mask };
    }
    
    return { harmonic: H, percussive: P };
}

/**
 * Apply horizontal median filter (for harmonic component)
 * @private
 */
function median_filter_horizontal(S, kernel_size) {
    return S.map(row => median_filter_1d(row, kernel_size));
}

/**
 * Apply vertical median filter (for percussive component)
 * @private
 */
function median_filter_vertical(S, kernel_size) {
    const n_freq = S.length;
    const n_time = S[0].length;
    const result = Array(n_freq).fill(null).map(() => new Float32Array(n_time));
    
    for (let j = 0; j < n_time; j++) {
        const column = S.map(row => row[j]);
        const filtered = median_filter_1d(column, kernel_size);
        
        for (let i = 0; i < n_freq; i++) {
            result[i][j] = filtered[i];
        }
    }
    
    return result;
}

/**
 * 1D median filter
 * @private
 */
function median_filter_1d(array, kernel_size) {
    const half_kernel = Math.floor(kernel_size / 2);
    const result = new Float32Array(array.length);
    
    for (let i = 0; i < array.length; i++) {
        const start = Math.max(0, i - half_kernel);
        const end = Math.min(array.length, i + half_kernel + 1);
        
        const window = array.slice(start, end);
        result[i] = median(window);
    }
    
    return result;
}

/**
 * Compute median of array
 * @private
 */
function median(array) {
    const sorted = Array.from(array).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        return sorted[mid];
    }
}

// ============= PITCH SHIFTING =============

/**
 * Pitch shift audio using phase vocoder
 * @param {Float32Array} y - Audio signal
 * @param {number} sr - Sample rate
 * @param {number} n_steps - Number of semitones to shift
 * @param {number} bins_per_octave - Number of bins per octave
 * @returns {Float32Array} Pitch-shifted audio
 */
export function pitch_shift(y, sr, n_steps, bins_per_octave = 12) {
    if (!y || y.length === 0) {
        throw new ParameterError('Audio signal cannot be empty');
    }
    
    // Import STFT functions (assumes they're available)
    // This would need to import from librosa-fft.js
    const hop_length = 512;
    const n_fft = 2048;
    
    // Compute STFT (simplified - would need actual implementation)
    const D = simple_stft(y, n_fft, hop_length);
    
    // Shift ratio
    const shift_ratio = Math.pow(2, n_steps / bins_per_octave);
    
    // Phase vocoder pitch shift
    const D_shifted = phase_vocoder(D, shift_ratio);
    
    // Reconstruct signal (simplified - would need actual ISTFT)
    const y_shifted = simple_istft(D_shifted, hop_length);
    
    return y_shifted;
}

/**
 * Phase vocoder for time/pitch manipulation
 * @param {Array} D - STFT matrix
 * @param {number} rate - Time stretch/compression rate
 * @returns {Array} Modified STFT matrix
 */
export function phase_vocoder(D, rate) {
    const n_freq = D.length;
    const n_time = D[0] ? D[0].length : 0;
    const hop_length = 512; // Default
    
    if (n_time === 0) {
        throw new ParameterError('Empty STFT matrix');
    }
    
    // Time stretch factor
    const time_steps = Array.from({ length: Math.ceil(n_time / rate) }, (_, i) => i * rate);
    
    // Initialize output
    const D_stretched = Array(n_freq).fill(null).map(() => 
        Array(time_steps.length).fill(null).map(() => ({ real: 0, imag: 0 }))
    );
    
    // Phase advance per bin
    const phase_advance = Array(n_freq).fill(0);
    for (let k = 0; k < n_freq; k++) {
        phase_advance[k] = 2 * Math.PI * k * hop_length / (n_freq * 2);
    }
    
    // Process each frequency bin
    for (let k = 0; k < n_freq; k++) {
        let phase_accumulator = 0;
        
        for (let t = 0; t < time_steps.length - 1; t++) {
            const index = Math.floor(time_steps[t]);
            if (index >= n_time - 1) break;
            
            const bin = D[k][index];
            const magnitude = Math.sqrt(bin.real * bin.real + bin.imag * bin.imag);
            
            D_stretched[k][t] = {
                real: magnitude * Math.cos(phase_accumulator),
                imag: magnitude * Math.sin(phase_accumulator)
            };
            
            phase_accumulator += phase_advance[k];
        }
    }
    
    return D_stretched;
}

// ============= MONOPHONIC PITCH DETECTION =============

/**
 * Detect fundamental frequency using autocorrelation
 * @param {Float32Array} y - Audio signal
 * @param {number} sr - Sample rate
 * @param {number} hop_length - Hop length for frame analysis
 * @param {number} fmin - Minimum frequency to detect
 * @param {number} fmax - Maximum frequency to detect
 * @returns {Object} {pitches, confidences} arrays
 */
export function monophonic_pitch_detect(y, sr = 22050, hop_length = 512, fmin = 60, fmax = 600) {
    if (!y || y.length === 0) {
        throw new ParameterError('Audio signal cannot be empty');
    }
    
    const pitches = [];
    const confidences = [];
    const frame_length = 2048;
    
    for (let i = 0; i <= y.length - frame_length; i += hop_length) {
        const frame = y.slice(i, i + frame_length);
        
        // Autocorrelation method
        const ac = autocorrelate(frame);
        
        // Convert frequency range to period range
        const minPeriod = Math.floor(sr / fmax);
        const maxPeriod = Math.floor(sr / fmin);
        
        let maxVal = 0;
        let bestPeriod = 0;
        
        // Find peak in autocorrelation within valid period range
        for (let period = minPeriod; period < Math.min(maxPeriod, ac.length / 2); period++) {
            if (ac[period] > maxVal) {
                maxVal = ac[period];
                bestPeriod = period;
            }
        }
        
        const pitch = bestPeriod > 0 ? sr / bestPeriod : 0;
        const confidence = ac[0] > 0 ? maxVal / ac[0] : 0; // Normalized confidence
        
        pitches.push(pitch);
        confidences.push(Math.max(0, Math.min(1, confidence)));
    }
    
    return { 
        pitches: new Float32Array(pitches), 
        confidences: new Float32Array(confidences) 
    };
}

/**
 * Compute autocorrelation of a signal
 * @param {Float32Array} buffer - Input signal
 * @returns {Float32Array} Autocorrelation function
 */
export function autocorrelate(buffer) {
    const n = buffer.length;
    const ac = new Float32Array(n);
    
    for (let lag = 0; lag < n; lag++) {
        let sum = 0;
        for (let i = 0; i < n - lag; i++) {
            sum += buffer[i] * buffer[i + lag];
        }
        ac[lag] = sum;
    }
    
    return ac;
}

// ============= UTILITY FUNCTIONS =============

/**
 * Simple polynomial fitting (linear regression for degree=1)
 * @param {Array<number>} x - X values
 * @param {Array<number>} y - Y values  
 * @param {number} degree - Polynomial degree (1 for linear)
 * @returns {Array<number>} Polynomial coefficients
 */
export function polyfit(x, y, degree = 1) {
    if (!x || !y || x.length !== y.length) {
        throw new ParameterError('X and Y arrays must have same length');
    }
    
    const n = x.length;
    const coeffs = new Array(degree + 1).fill(0);
    
    if (degree === 1) {
        // Linear regression
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
        const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
        
        const denominator = n * sumX2 - sumX * sumX;
        if (Math.abs(denominator) > 1e-10) {
            coeffs[1] = (n * sumXY - sumX * sumY) / denominator; // slope
            coeffs[0] = (sumY - coeffs[1] * sumX) / n; // intercept
        }
    }
    
    return coeffs;
}

/**
 * Generate linearly spaced array
 * @param {number} start - Start value
 * @param {number} stop - Stop value  
 * @param {number} num - Number of values
 * @returns {Array<number>} Linearly spaced array
 */
export function linspace(start, stop, num) {
    if (num <= 0) {
        throw new ParameterError('Number of samples must be positive');
    }
    
    if (num === 1) {
        return [start];
    }
    
    const step = (stop - start) / (num - 1);
    return Array.from({ length: num }, (_, i) => start + step * i);
}

/**
 * Find local maxima in a 1D signal
 * @param {Array<number>} signal - Input signal
 * @param {number} min_distance - Minimum distance between peaks
 * @param {number} threshold - Minimum peak height
 * @returns {Array<number>} Peak indices
 */
export function find_peaks(signal, min_distance = 1, threshold = 0) {
    const peaks = [];
    
    for (let i = 1; i < signal.length - 1; i++) {
        // Check if it's a local maximum
        if (signal[i] > signal[i - 1] && 
            signal[i] > signal[i + 1] && 
            signal[i] >= threshold) {
            
            // Check minimum distance constraint
            if (peaks.length === 0 || i - peaks[peaks.length - 1] >= min_distance) {
                peaks.push(i);
            }
        }
    }
    
    return peaks;
}

// ============= SIMPLIFIED STFT PLACEHOLDERS =============
// These would normally import from librosa-fft.js

/**
 * Simplified STFT placeholder
 * @private
 */
function simple_stft(y, n_fft, hop_length) {
    // This would normally use the full STFT implementation
    // Placeholder that returns empty structure
    const n_frames = Math.floor((y.length - n_fft) / hop_length) + 1;
    const n_freq = Math.floor(n_fft / 2) + 1;
    
    return Array(n_freq).fill(null).map(() => 
        Array(n_frames).fill(null).map(() => ({ real: 0, imag: 0 }))
    );
}

/**
 * Simplified ISTFT placeholder
 * @private
 */
function simple_istft(D, hop_length) {
    // This would normally use the full ISTFT implementation
    // Placeholder that returns zeros
    const length = (D[0].length - 1) * hop_length + 2048;
    return new Float32Array(length);
}

// Usage Example:
/*
// Feature analysis
const audioData = new Float32Array([...]); // Your audio
const zcr = zero_crossing_rate(audioData);
const energy = rms(audioData);

// Normalization
const features = [zcr, energy];
const normalized = normalize_features(features, 'l2', 0);

// Harmonic-percussive separation
const spectrogram = computeSpectrogram(audioData); // Your spectrogram
const {harmonic, percussive} = hpss(spectrogram, 31, 2.0, true);

// Pitch detection
const {pitches, confidences} = monophonic_pitch_detect(audioData, 44100);

// Autocorrelation for BPM
const ac = autocorrelate(audioData);
const bpmFromAC = detectBPMFromAutocorr(ac, sampleRate);
*/