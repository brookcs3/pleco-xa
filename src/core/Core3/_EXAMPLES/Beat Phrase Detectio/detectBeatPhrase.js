export function detectBeatPhrases(beatTimes, onsetStrength, audioDuration, { beatsPerMeasure = 4, measuresPerPhrase = 8 } = {}) {
  const segments = []
  const phraseLengthBeats = beatsPerMeasure * measuresPerPhrase  // e.g., 32 beats per phrase

  // 1. Determine downbeat offset (find strongest of first few beats)
  let downbeatIndex = 0
  const inspectBeats = Math.min(4, beatTimes.length)
  if (inspectBeats > 1) {
    // find index of max onset strength among first 4 beats
    let maxStrength = 0
    for (let i = 0; i < inspectBeats; i++) {
      const frameIdx = Math.round(beatTimes[i] * (onsetStrength.length / audioDuration))  // approximate frame index
      const strength = onsetStrength[frameIdx] || 0
      if (strength > maxStrength) {
        maxStrength = strength
        downbeatIndex = i
      }
    }
  }

  // 2. Intro segment: from start until the downbeat (if downbeat isn’t the first beat or if there's silence before first beat)
  const firstBeatTime = beatTimes[downbeatIndex] || 0
  if (firstBeatTime > 0.5) {  // significant intro gap
    segments.push({ label: 'intro', start: 0, end: firstBeatTime })
  }

  // 3. Determine phrase boundaries starting from the downbeat
  for (let i = downbeatIndex; i < beatTimes.length; i += phraseLengthBeats) {
    const startTime = beatTimes[i]
    // Mark phrase start
    segments.push({ label: 'phrase', start: startTime, end: null }) 
  }
  // The end of the last phrase segment will be determined next:
  // (initially marked as null above, we'll fill actual end times below)

  // 4. Outro segment: from last beat to track end (if trailing silence)
  const lastBeatTime = beatTimes[beatTimes.length - 1] || 0
  if (audioDuration - lastBeatTime > 0.5) {
    segments.push({ label: 'outro', start: lastBeatTime, end: audioDuration })
  }

  // 5. Interludes: find gaps between beats that are unusually long or low energy
  const medianInterval = (()=>{
    const intervals = []
    for (let j = 1; j < beatTimes.length; j++) intervals.push(beatTimes[j] - beatTimes[j-1])
    intervals.sort((a,b)=>a-b)
    return intervals.length ? intervals[Math.floor(intervals.length/2)] : 0
  })()
  for (let j = 1; j < beatTimes.length; j++) {
    const interval = beatTimes[j] - beatTimes[j-1]
    if (interval > 2 * medianInterval && interval > 2) {
      // A gap significantly larger than typical – likely a break in the beat
      segments.push({ label: 'interlude', start: beatTimes[j-1], end: beatTimes[j] })
    }
  }

  // 6. Finalize phrase end times
  // (Any 'phrase' without a set end gets the start of the next phrase or the track end as its end)
  for (let k = 0; k < segments.length; k++) {
    if (segments[k].label === 'phrase') {
      const nextSeg = segments[k+1]
      segments[k].end = nextSeg ? nextSeg.start : audioDuration
      // Optionally, we could add more descriptive labels like "verse", "drop" based on order or length
    }
  }
  return segments
}
