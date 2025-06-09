import { describe, it, expect, beforeAll } from 'vitest'
import { signatureDemo } from '../src/core/index.js'
import { AudioContext } from '../web-audio-test-api/index.js'

// Mock the global AudioContext to prevent the web-audio-test-api from trying to create a real one
beforeAll(() => {
  if (typeof window !== 'undefined') {
    window.AudioContext = AudioContext
    window.webkitAudioContext = AudioContext
  }
})

describe('signatureDemo', () => {
  it('produces steps with expected operations', () => {
    const ctx = new AudioContext({ sampleRate: 44100 })
    const buffer = ctx.createBuffer(1, 44100, 44100)
    const steps = signatureDemo(buffer)
    const ops = steps.map(s => s.op)

    expect(ops.slice(0, 5)).toEqual(['half', 'half', 'half', 'half', 'reverse'])
    expect(ops).toContain('move×3')
    expect(ops.slice(-5)).toEqual(['move×2', 'double', 'reverse', 'move×1', 'reverse'])
    expect(steps).toHaveLength(60)
  })
})
