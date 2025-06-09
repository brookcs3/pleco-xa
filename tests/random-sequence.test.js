import { describe, it, expect } from 'vitest'
import { AudioContext } from '../web-audio-test-api/index.js'
import { randomSequence } from '../src/core/loopPlayground.js'

describe('randomSequence', () => {
  it('returns correct length and function results', () => {
    const ctx = new AudioContext({ sampleRate: 44100 })
    const buffer = ctx.createBuffer(1, 44100, 44100)
    const seq = randomSequence(buffer, { minMs: 10, maxMs: buffer.duration * 1000, steps: 3 })
    expect(seq.length).toBe(3)
    seq.forEach(fn => {
      const res = fn()
      expect(res).toHaveProperty('buffer')
      expect(res).toHaveProperty('loop')
    })
  })
})
