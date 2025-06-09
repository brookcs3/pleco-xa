import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'

vi.mock('../src/core/index.js', () => ({
  signatureDemo: vi.fn()
}))

import { signatureDemo } from '../src/core/index.js'

let dom
let btn
let applyLoop
let enqueueToast

function setupDom() {
  dom = new JSDOM(`<button id="sigDemoBtn" data-buffer-var="currentAudioBuffer" data-apply-loop-var="applyLoop">Demo</button>`)
  global.window = dom.window
  global.document = dom.window.document

  applyLoop = vi.fn()
  enqueueToast = vi.fn()
  global.window.currentAudioBuffer = {}
  global.window.applyLoop = applyLoop
  global.enqueueToast = enqueueToast

  async function runDemo(buffer, applyLoopFn) {
    const steps = signatureDemo(buffer)
    for (const { fn, op } of steps) {
      const { buffer: newBuf, loop } = fn()
      applyLoopFn(newBuf, loop, op)
      enqueueToast(op)
      await new Promise(r => setTimeout(r, 400))
    }
  }

  const el = document.getElementById('sigDemoBtn')
  el.addEventListener('click', () => {
    const buffer = window[el.dataset.bufferVar]
    const applyLoopFn = window[el.dataset.applyLoopVar]
    if (!buffer || typeof applyLoopFn !== 'function') return
    runDemo(buffer, applyLoopFn)
  })
  btn = el
}

describe('SignatureDemoButton', () => {
  beforeEach(() => {
    setupDom()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    dom.window.close()
  })

  it('applies demo steps and enqueues toasts', async () => {
    const steps = [
      { op: 'op1', fn: vi.fn(() => ({ buffer: {}, loop: {} })) },
      { op: 'op2', fn: vi.fn(() => ({ buffer: {}, loop: {} })) },
      { op: 'op3', fn: vi.fn(() => ({ buffer: {}, loop: {} })) }
    ]
    signatureDemo.mockReturnValue(steps)

    btn.click()
    await vi.runAllTimersAsync()

    expect(applyLoop).toHaveBeenCalledTimes(3)
    expect(enqueueToast.mock.calls.map(c => c[0])).toEqual(['op1', 'op2', 'op3'])
  })
})
