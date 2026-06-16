import '@testing-library/jest-dom/vitest'

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    void callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock

HTMLCanvasElement.prototype.getContext = () => null
