export async function load(source, { sr = 22050, mono = true, offset = 0, duration = null } = {}) {
  let arrayBuffer;
  if (source instanceof Blob) {
    // Load from local File/Blob
    arrayBuffer = await source.arrayBuffer();
  } else if (typeof source === 'string') {
    // Load from URL
    const response = await fetch(source)
    arrayBuffer = await response.arrayBuffer()
  } else {
    throw new Error('Unsupported audio source type')
  }
  const decoded = await decodeBuffer(arrayBuffer)

  // Trim to offset and duration if specified
  const nativeSr = decoded.sampleRate
  const startSample = Math.floor(offset * nativeSr)
  const endSample = duration ? Math.min(decoded.length, startSample + Math.floor(duration * nativeSr)) 
                              : decoded.length
  const length = endSample - startSample

  // Extract channel data and convert to mono if needed
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, c) =>
    decoded.getChannelData(c).slice(startSample, endSample)
  )
  let audioData = mono ? toMono(channels) : Float32Array.from(channels.flat())

  // Resample if target sample rate is specified and different
  if (sr && sr !== nativeSr) {
    audioData = resample(audioData, { origSr: nativeSr, targetSr: sr })
  }

  currentAudioBuffer = { y: audioData, sr: sr || nativeSr }
  return currentAudioBuffer
}
