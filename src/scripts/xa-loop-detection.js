/**
 * Loop Detection Module
 * Handles finding and manipulating loop points in audio
 */

/**
 * Find optimal loop points in audio buffer
 * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
 * @param {Object} options - Detection options
 * @returns {Promise<Object>} Loop points
 */
export async function findLoop(audioBuffer, options = {}) {
  const defaultOptions = {
    bpmHint: 120,
    minLoopLength: 1.0, // seconds
    maxLoopLength: 16.0 // seconds
  };
  
  const opts = { ...defaultOptions, ...options };
  
  try {
    // For demo purposes, we'll use a simplified algorithm
    // In a real implementation, this would use proper similarity analysis
    
    const channel = audioBuffer.getChannelData(0);
    const sr = audioBuffer.sampleRate;
    
    // Calculate beat duration based on BPM
    const beatDuration = 60 / opts.bpmHint; // seconds per beat
    const barDuration = beatDuration * 4; // 4 beats per bar
    
    // Default to 4 bars or max loop length, whichever is shorter
    const targetDuration = Math.min(barDuration * 4, opts.maxLoopLength);
    
    // Find a good starting point (skip the first second which often has fade-ins)
    const startOffset = Math.min(sr, audioBuffer.length * 0.1);
    
    // Find zero crossings for clean loop points
    const startSample = findNearestZeroCrossing(channel, startOffset);
    const endSample = findNearestZeroCrossing(
      channel, 
      startSample + Math.floor(targetDuration * sr)
    );
    
    // Convert to normalized positions (0-1)
    const start = startSample / channel.length;
    const end = endSample / channel.length;
    
    return {
      start,
      end,
      confidence: 0.7
    };
  } catch (error) {
    console.error('Loop detection failed:', error);
    
    // Fallback to full track
    return {
      start: 0,
      end: 1,
      confidence: 0.5,
      error: error.message
    };
  }
}

/**
 * Find nearest zero crossing
 * @private
 */
function findNearestZeroCrossing(channelData, startSample, direction = 1, maxSearch = 2048) {
  const len = channelData.length;
  let i = startSample;
  let steps = 0;
  
  // Ensure we're within bounds
  i = Math.max(0, Math.min(i, len - 1));
  
  while (steps < maxSearch && i > 0 && i < len - 1) {
    if ((channelData[i] >= 0) !== (channelData[i + 1] >= 0)) {
      return i;
    }
    i += direction;
    steps++;
  }
  
  // Fallback to original position if none found
  return startSample;
}

/**
 * Manipulate loop points
 * @param {string} action - Action to perform (half, double, forward, reset)
 * @param {Object} audioProcessor - Audio processor instance
 * @param {AudioBuffer} audioBuffer - Audio buffer
 * @returns {Object} New loop points
 */
export function manipulateLoop(action, audioProcessor, audioBuffer) {
  if (!audioProcessor || !audioBuffer) return null;
  
  const currentLoop = audioProcessor.getLoopPoints();
  let newLoop = { ...currentLoop };
  
  switch (action) {
    case 'half':
      const halfDuration = (currentLoop.end - currentLoop.start) / 2;
      newLoop.end = currentLoop.start + halfDuration;
      break;
      
    case 'double':
      const doubleDuration = (currentLoop.end - currentLoop.start) * 2;
      newLoop.end = Math.min(1, currentLoop.start + doubleDuration);
      break;
      
    case 'forward':
      const duration = currentLoop.end - currentLoop.start;
      if (currentLoop.end + duration <= 1) {
        newLoop.start += duration;
        newLoop.end += duration;
      }
      break;
      
    case 'reset':
      newLoop = { start: 0, end: 1 };
      break;
  }
  
  // Apply the new loop points
  audioProcessor.setLoopPoints(newLoop.start, newLoop.end);
  
  return newLoop;
}