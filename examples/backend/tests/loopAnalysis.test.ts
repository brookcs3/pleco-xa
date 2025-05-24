import { describe, it, expect } from "bun:test";
import { analyzeLoop } from "../loopAnalysis";
import { writeFileSync } from "fs";

function createTestWav() {
  const sampleRate = 44100;
  const duration = 1; // 1 second
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }
  return Buffer.from(buffer);
}

function createRepeatWav() {
  const sampleRate = 44100;
  const duration = 2; // 2 seconds
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * (i % sampleRate)) / sampleRate);
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }
  return Buffer.from(buffer);
}


describe("loop analysis", () => {
  it("detects loop points", async () => {
    const tmp = "/tmp/test.wav";
    writeFileSync(tmp, createTestWav());
    const { loopStart, loopEnd } = await analyzeLoop(tmp);
    expect(loopStart).toBeLessThan(loopEnd);
    expect(loopStart).toBeGreaterThanOrEqual(0);
  });

  it("detects repeated sample loop length", async () => {
    const tmp = "/tmp/test_repeat.wav";
    writeFileSync(tmp, createRepeatWav());
    const { loopStart, loopEnd } = await analyzeLoop(tmp);
    expect(loopEnd - loopStart).toBeCloseTo(1.5, 1);
  });

});
