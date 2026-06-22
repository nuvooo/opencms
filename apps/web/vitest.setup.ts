// jsdom does not implement ResizeObserver, which some Radix UI primitives
// (e.g. Checkbox) instantiate on mount. Provide a no-op polyfill so component
// tests can render those primitives.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
