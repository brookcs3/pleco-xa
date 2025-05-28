export function play({ loop = false, audioContext = null } = {}) {
  if (!currentAudioBuffer) throw new Error('No audio loaded. Call load() first.')
  stop()  // stop any existing playback

  // Use provided AudioContext or global one
  if (audioContext) {
    globalAudioContext = audioContext
  }
  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || window.webkitAudioContext)()
  }

  const { y, sr } = currentAudioBuffer
  const buffer = globalAudioContext.createBuffer(1, y.length, sr)
  buffer.copyToChannel(y, 0)
  
  const source = globalAudioContext.createBufferSource()
  source.buffer = buffer
  source.loop = loop
  source.connect(globalAudioContext.destination)
  source.start()
  currentSourceNode = source
}
