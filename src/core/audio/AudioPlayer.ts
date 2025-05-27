/**
 * AudioPlayer - Framework-agnostic audio playback controller
 * Wraps Web Audio API with a clean, event-driven interface
 * 
 * Inspired by GSAP's approach: imperative API that works anywhere
 * 
 * @author Pleco-XA Audio Analysis Suite
 * @version 1.0.0
 */

export interface AudioPlayerOptions {
    audioContext?: AudioContext;
    volume?: number;
    autoplay?: boolean;
    loop?: boolean;
}

export interface LoopRegion {
    start: number; // seconds
    end: number;   // seconds
}

export interface PlaybackState {
    isPlaying: boolean;
    isPaused: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    loop: LoopRegion | null;
}

/**
 * Event-driven AudioPlayer class for framework-agnostic audio control
 * 
 * Usage:
 * ```js
 * const player = new AudioPlayer();
 * await player.load('song.mp3');
 * player.setLoop(10.0, 20.5);
 * player.play();
 * 
 * player.on('timeupdate', (time) => console.log('Current time:', time));
 * ```
 */
export class AudioPlayer {
    private _audioContext: AudioContext | null = null;
    private _audioBuffer: AudioBuffer | null = null;
    private _source: AudioBufferSourceNode | null = null;
    private _gainNode: GainNode | null = null;
    
    private _isPlaying = false;
    private _isPaused = false;
    private _startTime = 0;
    private _pauseTime = 0;
    private _currentTime = 0;
    private _duration = 0;
    private _volume = 1.0;
    private _loop: LoopRegion | null = null;
    
    private _animationFrame: number | null = null;
    private _eventListeners = new Map<string, Function[]>();
    
    constructor(options: AudioPlayerOptions = {}) {
        this._audioContext = options.audioContext || null;
        this._volume = options.volume ?? 1.0;
        
        // Lazy initialization - only create context when needed
        if (typeof window !== 'undefined') {
            this._setupAudioContext();
        }
    }
    
    /**
     * Get or create Web Audio API context
     */
    get audioContext(): AudioContext {
        if (!this._audioContext) {
            this._setupAudioContext();
        }
        return this._audioContext!;
    }
    
    /**
     * Get current audio buffer
     */
    get audioBuffer(): AudioBuffer | null {
        return this._audioBuffer;
    }
    
    /**
     * Get current playback state
     */
    get state(): PlaybackState {
        return {
            isPlaying: this._isPlaying,
            isPaused: this._isPaused,
            currentTime: this.getCurrentTime(),
            duration: this._duration,
            volume: this._volume,
            loop: this._loop
        };
    }
    
    /**
     * Load audio from various sources
     * @param source - URL, File, or AudioBuffer
     */
    async load(source: string | File | AudioBuffer): Promise<void> {
        try {
            if (source instanceof AudioBuffer) {
                this._audioBuffer = source;
            } else {
                let arrayBuffer: ArrayBuffer;
                
                if (typeof source === 'string') {
                    // Load from URL
                    const response = await fetch(source);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch audio: ${response.status}`);
                    }
                    arrayBuffer = await response.arrayBuffer();
                } else {
                    // Load from File
                    arrayBuffer = await source.arrayBuffer();
                }
                
                this._audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            }
            
            this._duration = this._audioBuffer.duration;
            this._emit('loaded', this._audioBuffer);
            
        } catch (error) {
            this._emit('error', error);
            throw error;
        }
    }
    
    /**
     * Start playback
     */
    play(): void {
        if (!this._audioBuffer) {
            throw new Error('No audio loaded. Call load() first.');
        }
        
        if (this._isPlaying) {
            return; // Already playing
        }
        
        try {
            this._createSource();
            
            const startTime = this._isPaused ? this._pauseTime : 0;
            const offset = this._loop ? this._loop.start : startTime;
            const duration = this._loop ? (this._loop.end - this._loop.start) : undefined;
            
            this._source!.start(0, offset, duration);
            this._startTime = this.audioContext.currentTime - startTime;
            this._isPlaying = true;
            this._isPaused = false;
            
            this._startTimeTracking();
            this._emit('play');
            
        } catch (error) {
            this._emit('error', error);
            throw error;
        }
    }
    
    /**
     * Pause playback
     */
    pause(): void {
        if (!this._isPlaying) {
            return;
        }
        
        this._pauseTime = this.getCurrentTime();
        this._stop();
        this._isPaused = true;
        this._emit('pause');
    }
    
    /**
     * Stop playback and reset position
     */
    stop(): void {
        this._stop();
        this._pauseTime = 0;
        this._currentTime = 0;
        this._isPaused = false;
        this._emit('stop');
    }
    
    /**
     * Set volume (0.0 to 1.0)
     */
    setVolume(volume: number): void {
        this._volume = Math.max(0, Math.min(1, volume));
        
        if (this._gainNode) {
            this._gainNode.gain.value = this._volume;
        }
        
        this._emit('volumechange', this._volume);
    }
    
    /**
     * Set loop region
     * @param start - Start time in seconds
     * @param end - End time in seconds
     */
    setLoop(start: number, end: number): void {
        if (!this._audioBuffer) {
            throw new Error('No audio loaded. Call load() first.');
        }
        
        const duration = this._audioBuffer.duration;
        start = Math.max(0, Math.min(start, duration));
        end = Math.max(start, Math.min(end, duration));
        
        this._loop = { start, end };
        this._emit('loopchange', this._loop);
        
        // If playing, restart with new loop
        if (this._isPlaying) {
            const wasPlaying = this._isPlaying;
            this.stop();
            if (wasPlaying) {
                this.play();
            }
        }
    }
    
    /**
     * Clear loop region
     */
    clearLoop(): void {
        this._loop = null;
        this._emit('loopchange', null);
    }
    
    /**
     * Seek to specific time
     * @param time - Time in seconds
     */
    seek(time: number): void {
        if (!this._audioBuffer) {
            throw new Error('No audio loaded. Call load() first.');
        }
        
        time = Math.max(0, Math.min(time, this._duration));
        
        const wasPlaying = this._isPlaying;
        this.stop();
        this._pauseTime = time;
        this._currentTime = time;
        
        if (wasPlaying) {
            this._isPaused = true;
            this.play();
        }
        
        this._emit('seek', time);
    }
    
    /**
     * Get current playback time
     */
    getCurrentTime(): number {
        if (this._isPlaying) {
            const elapsed = this.audioContext.currentTime - this._startTime;
            this._currentTime = this._isPaused ? this._pauseTime : elapsed;
            
            // Handle looping
            if (this._loop) {
                const loopDuration = this._loop.end - this._loop.start;
                const loopTime = (this._currentTime - this._loop.start) % loopDuration;
                this._currentTime = this._loop.start + loopTime;
            }
        }
        
        return this._currentTime;
    }
    
    /**
     * Add event listener
     * @param event - Event name (play, pause, stop, timeupdate, etc.)
     * @param callback - Event callback
     */
    on(event: string, callback: Function): void {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, []);
        }
        this._eventListeners.get(event)!.push(callback);
    }
    
    /**
     * Remove event listener
     */
    off(event: string, callback: Function): void {
        const listeners = this._eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Clean up resources (important for web apps)
     */
    dispose(): void {
        this.stop();
        this._eventListeners.clear();
        
        if (this._audioContext && this._audioContext.state !== 'closed') {
            this._audioContext.close();
        }
    }
    
    // ============= PRIVATE METHODS =============
    
    private _setupAudioContext(): void {
        if (typeof window === 'undefined') {
            return; // SSR safety
        }
        
        this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Handle autoplay policy
        if (this._audioContext.state === 'suspended') {
            const resume = () => {
                this._audioContext!.resume();
                document.removeEventListener('click', resume);
                document.removeEventListener('touchstart', resume);
            };
            document.addEventListener('click', resume);
            document.addEventListener('touchstart', resume);
        }
    }
    
    private _createSource(): void {
        if (this._source) {
            this._source.disconnect();
        }
        
        this._source = this.audioContext.createBufferSource();
        this._source.buffer = this._audioBuffer;
        
        // Create gain node for volume control
        if (!this._gainNode) {
            this._gainNode = this.audioContext.createGain();
        }
        this._gainNode.gain.value = this._volume;
        
        // Connect audio graph
        this._source.connect(this._gainNode);
        this._gainNode.connect(this.audioContext.destination);
        
        // Handle end event
        this._source.onended = () => {
            if (this._isPlaying) {
                this._handleTrackEnd();
            }
        };
    }
    
    private _stop(): void {
        if (this._source) {
            try {
                this._source.stop();
            } catch (e) {
                // Source may already be stopped
            }
            this._source = null;
        }
        
        this._isPlaying = false;
        this._stopTimeTracking();
    }
    
    private _startTimeTracking(): void {
        const updateTime = () => {
            if (this._isPlaying) {
                this._emit('timeupdate', this.getCurrentTime());
                this._animationFrame = requestAnimationFrame(updateTime);
            }
        };
        updateTime();
    }
    
    private _stopTimeTracking(): void {
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
    }
    
    private _handleTrackEnd(): void {
        if (this._loop) {
            // Restart loop
            this.seek(this._loop.start);
            this.play();
        } else {
            this.stop();
            this._emit('ended');
        }
    }
    
    private _emit(event: string, data?: any): void {
        const listeners = this._eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }
}

// Usage example:
/*
// Basic usage
const player = new AudioPlayer();
await player.load('song.mp3');
player.play();

// With loop
player.setLoop(10.0, 20.5);
player.play();

// Event handling
player.on('timeupdate', (time) => {
    console.log('Current time:', time);
    updateUI(time);
});

player.on('loopchange', (loop) => {
    console.log('Loop changed:', loop);
});

// Cleanup when done
player.dispose();
*/