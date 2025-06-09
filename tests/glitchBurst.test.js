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
    const randVals = [
      0.95, // first pick -> randomLocal
      0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1
    ]
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

    expect(updates).toEqual([
      { loop: { startSample: 0, endSample: 22050 }, op: 'randomLocal', subOps: ['reset', 'half', 'half'] },
      { loop: { startSample: 6615, endSample: 28665 }, op: 'move', subOps: ['move'] },
      { loop: { startSample: 6615, endSample: 28665 }, op: 'move', subOps: ['move'] },
      { loop: { startSample: 0, endSample: 22050 }, op: 'move', subOps: ['move'] }
    ])
  })
})
