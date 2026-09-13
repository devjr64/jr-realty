import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// --- Base UI jsdom setup (mirrors mui/base-ui's own test/setupVitest.ts) ---
// WHY: jsdom's requestAnimationFrame is a 16ms setTimeout stub and its
// cancelAnimationFrame doesn't cancel, so Base UI's rAF-heavy popup-open path
// (FloatingFocusManager, transition status) misbehaves in component tests.
// Refs: mui/base-ui PR #5293, issue #5268.

// No CSS engine in jsdom → transitionend never fires; skip Base UI animation waits.
;(globalThis as typeof globalThis & { BASE_UI_ANIMATIONS_DISABLED?: boolean })
  .BASE_UI_ANIMATIONS_DISABLED = true

// Replace jsdom's slow rAF stub with setTimeout(0) — jsdom env only.
if (typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom')) {
  const rafStub = (cb: FrameRequestCallback): number => {
    setTimeout(() => cb(0), 0)
    return 0
  }
  globalThis.requestAnimationFrame = rafStub
  // Base UI may capture rAF from `window` rather than the global binding.
  ;(window as typeof window & { requestAnimationFrame: typeof rafStub }).requestAnimationFrame =
    rafStub
}

// jsdom lacks ResizeObserver (jsdom/jsdom#3368); Base UI/floating-ui consume it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
