import { describe, it, expect, vi } from 'vitest'
import { AudioContext } from '../web-audio-test-api/index.js'
import { randomSequence } from '../src/core/loopPlayground.js'

describe('randomSequence', () => {
  it('uses weighted actions and respects durationMs', () => {
    const ctx = new AudioContext({ sampleRate: 44100 })
    const buffer = ctx.createBuffer(1, 44100, 44100)
    const randVals = [0.2, 0.5, 0.8, 0.9]
    vi.spyOn(Math, 'random').mockImplementation(() => randVals.shift() ?? 0)
    const seq = randomSequence(buffer, { durationMs: 500, steps: 4 })
    expect(seq.length).toBe(4)
    const ops = seq.map(fn => fn.op)
    expect(ops).toEqual(['move', 'half', 'double', 'reverse'])
    const res = seq[0]()
    const len = (res.loop.endSample - res.loop.startSample) / buffer.sampleRate
    expect(len).toBeLessThanOrEqual(0.5)
  })
})
