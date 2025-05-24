export function trackLibrary(libName) {
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lib: libName, ts: Date.now() }),
    keepalive: true
  }).catch(() => {});
}
