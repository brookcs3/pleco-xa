export const DEBUG_ENABLED = Boolean(
  (typeof process !== 'undefined' && process.env && process.env.PLECO_DEBUG) ||
  (typeof window !== 'undefined' && window.PLECO_DEBUG)
);

export function debugLog(...args) {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
}
