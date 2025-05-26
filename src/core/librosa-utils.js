/**
 * Librosa-style utility functions for JavaScript
 * Common audio processing utilities and converters
 */

/**
 * Compute RMS energy of audio signal
 * @param {Float32Array} y - Audio time series
 * @returns {number} RMS energy
 */
export function rms_energy(y) {
    const sum = y.reduce((acc, val) => acc + val * val, 0);
    return Math.sqrt(sum / y.length);
}

/**
 * Convert audio level to dB
 * @param {number} level - Linear amplitude level
 * @param {number} ref - Reference level (default 1.0)
 * @returns {number} Level in dB
 */
export function amplitude_to_db(level, ref = 1.0) {
    return 20 * Math.log10(Math.abs(level) / ref);
}

/**
 * Convert dB to linear amplitude
 * @param {number} db - Level in dB
 * @param {number} ref - Reference level (default 1.0)
 * @returns {number} Linear amplitude
 */
export function db_to_amplitude(db, ref = 1.0) {
    return ref * Math.pow(10, db / 20);
}

/**
 * Convert frames to samples
 * @param {Array|number} frames - Frame indices
 * @param {number} hop_length - Number of audio samples between successive frames
 * @returns {Array|number} Sample indices
 */
export function frames_to_samples(frames, hop_length = 512) {
    if (Array.isArray(frames)) {
        return frames.map(frame => Math.round(frame * hop_length));
    } else {
        return Math.round(frames * hop_length);
    }
}

/**
 * Convert frames to time
 * @param {Array|number} frames - Frame indices
 * @param {number} sr - Sample rate
 * @param {number} hop_length - Number of audio samples between successive frames
 * @returns {Array|number} Time values in seconds
 */
export function frames_to_time(frames, sr = 22050, hop_length = 512) {
    if (Array.isArray(frames)) {
        return frames.map(frame => (frame * hop_length) / sr);
    } else {
        return (frames * hop_length) / sr;
    }
}

/**
 * Convert samples to frames
 * @param {Array|number} samples - Sample indices
 * @param {number} hop_length - Number of audio samples between successive frames
 * @returns {Array|number} Frame indices
 */
export function samples_to_frames(samples, hop_length = 512) {
    if (Array.isArray(samples)) {
        return samples.map(sample => Math.round(sample / hop_length));
    } else {
        return Math.round(samples / hop_length);
    }
}

/**
 * Convert time to frames
 * @param {Array|number} times - Time values in seconds
 * @param {number} sr - Sample rate
 * @param {number} hop_length - Number of audio samples between successive frames
 * @returns {Array|number} Frame indices
 */
export function time_to_frames(times, sr = 22050, hop_length = 512) {
    if (Array.isArray(times)) {
        return times.map(time => Math.round((time * sr) / hop_length));
    } else {
        return Math.round((times * sr) / hop_length);
    }
}

/**
 * Normalize audio to peak amplitude
 * @param {Float32Array} y - Audio time series
 * @param {number} peak - Target peak amplitude (default 1.0)
 * @returns {Float32Array} Normalized audio
 */
export function normalize(y, peak = 1.0) {
    const current_peak = Math.max(...y.map(x => Math.abs(x)));
    if (current_peak === 0) return y;
    
    const scale = peak / current_peak;
    return y.map(sample => sample * scale);
}

/**
 * Apply fade in/out to audio
 * @param {Float32Array} y - Audio time series
 * @param {number} fade_in_samples - Number of samples for fade in
 * @param {number} fade_out_samples - Number of samples for fade out
 * @returns {Float32Array} Audio with fades applied
 */
export function apply_fade(y, fade_in_samples = 0, fade_out_samples = 0) {
    const result = new Float32Array(y);
    
    // Fade in
    for (let i = 0; i < Math.min(fade_in_samples, y.length); i++) {
        const alpha = i / fade_in_samples;
        result[i] *= alpha;
    }
    
    // Fade out
    for (let i = 0; i < Math.min(fade_out_samples, y.length); i++) {
        const alpha = i / fade_out_samples;
        const index = y.length - 1 - i;
        result[index] *= alpha;
    }
    
    return result;
}

/**
 * Compute zero crossing rate
 * @param {Float32Array} y - Audio time series
 * @param {number} frame_length - Frame size for analysis
 * @param {number} hop_length - Frame hop size
 * @returns {Array} Zero crossing rates per frame
 */
export function zero_crossing_rate(y, frame_length = 2048, hop_length = 512) {
    const zcr = [];
    
    for (let i = 0; i <= y.length - frame_length; i += hop_length) {
        const frame = y.slice(i, i + frame_length);
        let crossings = 0;
        
        for (let j = 1; j < frame.length; j++) {
            if ((frame[j] >= 0) !== (frame[j - 1] >= 0)) {
                crossings++;
            }
        }
        
        zcr.push(crossings / frame_length);
    }
    
    return zcr;
}

/**
 * Simple peak detector
 * @param {Array} signal - Input signal
 * @param {number} threshold - Minimum peak height
 * @param {number} min_distance - Minimum distance between peaks
 * @returns {Array} Peak indices
 */
export function find_peaks(signal, threshold = 0.1, min_distance = 10) {
    const peaks = [];
    
    for (let i = 1; i < signal.length - 1; i++) {
        // Check if it's a local maximum above threshold
        if (signal[i] > threshold &&
            signal[i] > signal[i - 1] &&
            signal[i] > signal[i + 1]) {
            
            // Check minimum distance constraint
            if (peaks.length === 0 || i - peaks[peaks.length - 1] >= min_distance) {
                peaks.push(i);
            }
        }
    }
    
    return peaks;
}

/**
 * Simple moving average filter
 * @param {Array} signal - Input signal
 * @param {number} window_size - Size of moving average window
 * @returns {Array} Smoothed signal
 */
export function moving_average(signal, window_size = 5) {
    const result = new Array(signal.length);
    const half_window = Math.floor(window_size / 2);
    
    for (let i = 0; i < signal.length; i++) {
        let sum = 0;
        let count = 0;
        
        for (let j = Math.max(0, i - half_window); 
             j <= Math.min(signal.length - 1, i + half_window); 
             j++) {
            sum += signal[j];
            count++;
        }
        
        result[i] = sum / count;
    }
    
    return result;
}