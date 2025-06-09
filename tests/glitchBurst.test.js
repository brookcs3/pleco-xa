import { describe, it, expect, vi } from 'vitest'
import { AudioContext } from '../web-audio-test-api/index.js'
import { glitchBurst } from '../src/core/index.js'

function createBuffer() {
  const ctx = new AudioContext({ sampleRate: 44100 })
  return ctx.createBuffer(1, 44100 * 2, 44100)
}

describe('glitchBurst', () => {
  it('follows deterministic sequence when RNG is mocked', () => {
    vi.useFakeTimers()
    const buffer = createBuffer()
    const updates = []
    const randVals = [0.05, 0.5, 0.8, 0.9, 0.2, 0.3, 0.4, 0.6, 0.7, 0.85]
    vi.spyOn(Math, 'random').mockImplementation(() => randVals.shift() ?? 0)
if (globalThis.performance) { vi.spyOn(globalThis.performance, "now").mockImplementation(vi.now) } else { globalThis.performance = { now: vi.now } }

    glitchBurst(buffer, {
      ctx: {},
      durationMs: 400,
      onUpdate: (buf, loop, op, subOps) => {
        updates.push({
          loop: { startSample: loop.startSample, endSample: loop.endSample },
          op,
          subOps
        })
      }
    })

    vi.runAllTimers()

    expect(updates.length).toBeGreaterThan(0)
    expect(updates.length).toBeLessThanOrEqual(5)
    const totalTime = vi.now()
    expect(totalTime).toBeLessThanOrEqual(500)

  })
})
