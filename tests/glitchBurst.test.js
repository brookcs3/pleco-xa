import { describe, it, expect, vi } from 'vitest'
import { AudioContext } from '../web-audio-test-api/index.js'
import { glitchBurst } from '../src/core/index.js'

function createBuffer() {
  const ctx = new AudioContext({ sampleRate: 44100 })
  return ctx.createBuffer(1, 44100 * 2, 44100)
}

describe('glitchBurst', () => {
  it('produces burst of operations', () => {
    vi.useFakeTimers()
    const buffer = createBuffer()
    const updates = []
    const randVals = [
      0.95, // randomLocal
      0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
    ]
    vi.spyOn(Math, 'random').mockImplementation(() => randVals.shift() ?? 0)
    global.performance = { now: vi.now }

    glitchBurst(buffer, {
      ctx: {},
      durationMs: 6000,
      onUpdate: (buf, loop, op, subOps) => {
        updates.push({ loop, op, subOps })
      }
    })

    vi.runAllTimers()

    expect(updates.length).toBeGreaterThanOrEqual(30)
    const tiny = updates.some(u => (u.loop.endSample - u.loop.startSample) / buffer.sampleRate <= 0.1)
    expect(tiny).toBe(true)
    const hasRandomLocal = updates.find(u => u.op === 'randomLocal')
    if (hasRandomLocal) expect(hasRandomLocal.subOps.length).toBeGreaterThanOrEqual(2)
    const totalTime = vi.now()
    expect(totalTime).toBeGreaterThanOrEqual(5000)
    expect(totalTime).toBeLessThanOrEqual(10000)
  })
})
