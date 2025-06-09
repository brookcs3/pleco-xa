export class GibClock {
  constructor(intervalMs) {
    this.intervalMs = intervalMs;
    this.timer = null;
    this.callback = null;
    this.nextTime = 0;
  }

  start(callback) {
    if (this.timer) return;
    this.callback = callback;
    this.nextTime = Date.now() + this.intervalMs;
    this.timer = setTimeout(() => this._tick(), this.intervalMs);
  }

  _tick() {
    if (typeof this.callback === 'function') {
      this.callback();
    }
    const now = Date.now();
    this.nextTime += this.intervalMs;
    const delay = Math.max(0, this.nextTime - now);
    this.timer = setTimeout(() => this._tick(), delay);
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
