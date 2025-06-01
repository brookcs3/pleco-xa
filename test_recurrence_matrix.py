#!/usr/bin/env python3

import librosa
import numpy as np
import librosa.segment

def test_recurrence_matrix():
    """Test librosa's recurrence_matrix to understand how it works"""
    
    # Load audio file
    audio_file = "assets/audio/ui.m4a"  # Use the test file
    try:
        y, sr = librosa.load(audio_file, sr=None)
        print(f"Loaded audio: {len(y)} samples at {sr} Hz, duration: {len(y)/sr:.2f}s")
    except Exception as e:
        print(f"Error loading {audio_file}: {e}")
        return
    
    # Extract chroma features (key for loop detection)
    print("\n1. Extracting chroma features...")
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    print(f"Chroma shape: {chroma.shape}")
    
    # Stack memory to reduce noise (as recommended in librosa docs)
    print("\n2. Time-delay embedding...")
    chroma_stack = librosa.feature.stack_memory(chroma, n_steps=10, delay=3)
    print(f"Stacked chroma shape: {chroma_stack.shape}")
    
    # Compute recurrence matrix
    print("\n3. Computing recurrence matrix...")
    R = librosa.segment.recurrence_matrix(chroma_stack, width=3, mode='affinity')
    print(f"Recurrence matrix shape: {R.shape}")
    print(f"Matrix min: {R.min():.4f}, max: {R.max():.4f}")
    
    # Convert to lag representation (for finding repeating structures)
    print("\n4. Converting to lag representation...")
    lag_matrix = librosa.segment.recurrence_to_lag(R)
    print(f"Lag matrix shape: {lag_matrix.shape}")
    
    # Find peaks in lag matrix (these indicate loop points)
    print("\n5. Finding potential loop points...")
    
    # Sum along time axis to find consistent patterns
    lag_sum = np.sum(lag_matrix, axis=1)
    print(f"Lag sum shape: {lag_sum.shape}")
    print(f"Top 5 lag values: {np.sort(lag_sum)[-5:]}")
    
    # Find peak lags (potential loop lengths in frames)
    from scipy.signal import find_peaks
    peaks, properties = find_peaks(lag_sum, height=np.max(lag_sum) * 0.1)
    
    print(f"\nFound {len(peaks)} potential loop points:")
    
    # Convert frame indices to time
    hop_length = 512  # librosa default
    frame_time = hop_length / sr
    
    for i, peak in enumerate(peaks[:5]):  # Show top 5
        loop_length_frames = peak
        loop_length_seconds = loop_length_frames * frame_time
        confidence = lag_sum[peak]
        print(f"  Loop {i+1}: {loop_length_frames} frames = {loop_length_seconds:.3f}s (confidence: {confidence:.2f})")
    
    # Also try different modes
    print("\n6. Testing different recurrence matrix modes...")
    
    for mode in ['connectivity', 'distance']:
        R_mode = librosa.segment.recurrence_matrix(chroma_stack, width=3, mode=mode)
        print(f"Mode '{mode}': min={R_mode.min():.4f}, max={R_mode.max():.4f}")
    
    return {
        'chroma': chroma,
        'chroma_stack': chroma_stack,
        'recurrence_matrix': R,
        'lag_matrix': lag_matrix,
        'peaks': peaks,
        'frame_time': frame_time
    }

if __name__ == "__main__":
    results = test_recurrence_matrix()